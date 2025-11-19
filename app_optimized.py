#!/usr/bin/env python3
"""
优化后的Multi-Agent聊天助手主应用
"""
import os
import sys
import uuid
import asyncio
import json
import aiofiles
from datetime import datetime
from typing import List, Dict, Optional
from contextlib import asynccontextmanager

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Request, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 导入自定义模块
from config import config
from utils.logger import setup_logging, app_logger
from utils.api_client import poe_client, APIError, APIAuthError, APIRateLimitError
from utils.database import db_manager
from utils.metrics import metrics_collector, timing_middleware
from models.chat_models import (
    ChatRequest, DiscussionRequest, FileAttachment, Message,
    Memory, MemoryCreateRequest, MemoryUpdateRequest
)

# 设置日志
logger = setup_logging()

# 限流器
limiter = Limiter(key_func=get_remote_address)

# 应用生命周期管理
@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动和关闭时的处理"""
    # 启动时
    app_logger.info("🚀 Multi-Agent聊天助手启动中...")
    
    # 验证配置
    try:
        config.validate()
        app_logger.info("✅ 配置验证通过")
    except ValueError as e:
        app_logger.error(f"❌ 配置验证失败: {e}")
        sys.exit(1)
    
    # API健康检查
    try:
        if await poe_client.health_check():
            app_logger.info("✅ API连接正常")
        else:
            app_logger.warning("⚠️ API连接异常，但服务继续启动")
    except Exception as e:
        app_logger.error(f"❌ API健康检查失败: {e}")
    
    # 创建必要的目录
    os.makedirs(config.UPLOAD_DIR, exist_ok=True)
    os.makedirs("logs", exist_ok=True)
    
    app_logger.info("✅ Multi-Agent聊天助手启动完成")
    
    yield
    
    # 关闭时
    app_logger.info("🔄 Multi-Agent聊天助手关闭中...")
    app_logger.info("✅ Multi-Agent聊天助手已关闭")

# 创建FastAPI应用
app = FastAPI(
    title="Multi-Agent聊天助手",
    description="基于Poe API的多角色智能聊天系统",
    version="2.0.0",
    lifespan=lifespan
)

# 添加中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 限流中间件
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Agent角色配置
AGENTS = {
    "产品经理": {
        "name": "产品经理",
        "model": "Claude-Sonnet-4.5",
        "system_prompt": "你是一位资深的产品经理，具有10年以上的产品设计和管理经验。你擅长需求分析、用户体验设计、产品策略制定和市场分析。请从产品角度提供专业建议。",
        "color": "#4F46E5"
    },
    "技术总监": {
        "name": "技术总监",
        "model": "Claude-Sonnet-4.5",
        "system_prompt": "你是一位经验丰富的技术总监，精通软件架构设计、技术选型、团队管理和项目规划。请从技术可行性、架构设计、性能优化等角度提供专业意见。",
        "color": "#059669"
    },
    "市场专家": {
        "name": "市场专家",
        "model": "Gemini-3.0-Pro",
        "system_prompt": "你是一位资深的市场营销专家，拥有15年以上的市场策略和品牌推广经验。请从市场营销角度提供具体、可执行的专业建议和策略方案。",
        "color": "#DC2626"
    },
    "UX设计师": {
        "name": "UX设计师",
        "model": "Claude-Sonnet-4.5",
        "system_prompt": "你是一位资深的UX设计师，拥有10年以上的用户体验设计经验，精通用户研究、交互设计、信息架构、可用性测试和设计系统构建。请从用户体验的战略高度提供深度专业建议。",
        "color": "#7C3AED"
    },
    "商业分析师": {
        "name": "商业分析师", 
        "model": "Claude-Sonnet-4.5",
        "system_prompt": "你是一位资深的商业分析师，拥有12年以上的商业咨询和投资分析经验，精通商业模式构建、财务建模、风险量化评估和投资回报优化。请从商业价值创造的角度提供深度专业分析。",
        "color": "#EA580C"
    },
    "GPT5": {
        "name": "GPT5",
        "model": "GPT-5",
        "system_prompt": "你是GPT-5，OpenAI最新的旗舰AI模型，具备统一路由系统架构，能够智能切换快速响应和深度推理模式。请为用户提供准确、专业、有深度的回答。",
        "color": "#8B5CF6"
    },
    "GPT4o": {
        "name": "GPT4o",
        "model": "GPT-4o",
        "system_prompt": "你是GPT-4o，一个先进的AI助手，能够帮助用户解答各种问题，提供准确、有用和富有洞察力的回答。",
        "color": "#10B981"
    },
    "Gemini-3.0-Pro": {
        "name": "Gemini-3.0-Pro",
        "model": "Gemini-3.0-Pro",
        "system_prompt": "你是Gemini-3.0-Pro，Google最新的旗舰AI模型，拥有强大的多模态理解能力和超长上下文窗口。你擅长深度分析、创意思考和复杂问题解决。请提供准确、全面、有洞察力的回答。",
        "color": "#4285F4"
    },
    "Claude-Sonnet-4.5": {
        "name": "Claude-Sonnet-4.5",
        "model": "Claude-Sonnet-4.5",
        "system_prompt": "你是Claude Sonnet 4.5，Anthropic最新的旗舰AI模型，具备卓越的推理能力、深度分析能力和创造性思维。你擅长复杂问题解决、逻辑推理、代码编写和深度对话。请提供准确、深入、有洞察力的回答。",
        "color": "#A855F7"
    },
    "GPT-Image-1": {
        "name": "GPT-Image-1",
        "model": "GPT-Image-1",
        "system_prompt": "你是GPT-Image-1，一个强大的图像生成模型。根据用户的描述，生成高质量、富有创意的图像。请仔细理解用户的需求，并生成符合要求的图像。",
        "color": "#F59E0B"
    },
    "Perplexity-Sonar-Pro": {
        "name": "Perplexity-Sonar-Pro",
        "model": "Perplexity-Sonar-Pro",
        "system_prompt": "你是Perplexity Sonar Pro，一个强大的AI搜索模型。你能够实时搜索互联网，获取最新信息，并提供准确、全面的搜索结果。你擅长网络搜索、实时信息查询、事实验证、新闻追踪和数据收集。请基于实时搜索结果提供最新、最准确的信息和分析。",
        "color": "#06B6D4"
    },
    "Nano-Banana": {
        "name": "Nano-Banana",
        "model": "Nano-Banana",
        "system_prompt": "你是Nano-Banana，一个专业的图像生成模型。你擅长根据用户的描述生成富有创意、细节丰富且风格独特的图像。请仔细理解用户的视觉需求，并生成高质量的图像。",
        "color": "#FACC15"
    },
    "Sora-2-Pro": {
        "name": "Sora-2-Pro",
        "model": "Sora-2-Pro",
        "system_prompt": "你是Sora-2-Pro，OpenAI最先进的视频生成模型。你能够根据文字描述生成高质量、流畅自然的视频内容。你擅长理解复杂的场景描述、动作序列和视觉风格，创造出富有创意和电影感的视频作品。请仔细分析用户的视频需求，生成符合要求的高质量视频。",
        "color": "#EC4899"
    },
    "Hailuo-Speech-02": {
        "name": "Hailuo-Speech-02",
        "model": "Hailuo-Speech-02",
        "system_prompt": "你是Hailuo-Speech-02，海螺AI最新的语音生成模型。你能够将文字转换为自然流畅的语音，支持多种音色、情感和语速调节。你擅长理解文本的语义和情感，生成富有表现力的高质量语音。请根据用户的需求生成合适的语音内容。",
        "color": "#06B6D4"
    },
}

# 存储路径
background_tasks_status = {}

def clean_message_mentions(message: str) -> str:
    """清理消息中的@提及，避免影响实际内容处理"""
    import re
    # 移除所有 @模型名 的提及（包括开头和中间的）
    cleaned = re.sub(r'@[\w\-]+\s*', '', message)
    return cleaned.strip()

@app.middleware("http")
async def request_middleware(request: Request, call_next):
    """请求中间件 - 记录指标"""
    start_time = asyncio.get_event_loop().time()
    
    try:
        response = await call_next(request)
        
        # 记录成功请求
        response_time = asyncio.get_event_loop().time() - start_time
        await metrics_collector.record_request(
            endpoint=str(request.url.path),
            method=request.method,
            status_code=response.status_code,
            response_time=response_time
        )
        
        return response
        
    except Exception as e:
        # 记录失败请求
        response_time = asyncio.get_event_loop().time() - start_time
        await metrics_collector.record_request(
            endpoint=str(request.url.path),
            method=request.method,
            status_code=500,
            response_time=response_time
        )
        raise e

@app.get("/", response_class=HTMLResponse)
async def read_root():
    """返回主页"""
    try:
        with open("static/index.html", "r", encoding="utf-8") as f:
            return HTMLResponse(f.read())
    except FileNotFoundError:
        return HTMLResponse("<h1>页面未找到</h1><p>请确保static/index.html文件存在</p>", status_code=404)

@app.get("/api/agents")
@limiter.limit("100/minute")
async def get_agents(request: Request):
    """获取所有Agent角色"""
    return {"agents": AGENTS}

@app.get("/api/health")
async def health_check():
    """健康检查端点"""
    health_status = await metrics_collector.get_health_status()
    
    # API连接检查
    api_healthy = await poe_client.health_check()
    
    return {
        "status": "healthy" if api_healthy and health_status["status"] != "unhealthy" else "unhealthy",
        "timestamp": datetime.now().isoformat(),
        "api_status": "connected" if api_healthy else "disconnected",
        "system_metrics": health_status
    }

@app.get("/api/metrics")
@limiter.limit("10/minute")
async def get_metrics(request: Request, hours: int = 24):
    """获取系统指标"""
    try:
        return await metrics_collector.get_metrics_summary(hours)
    except Exception as e:
        app_logger.error(f"获取指标失败: {e}")
        raise HTTPException(status_code=500, detail="获取指标失败")

@app.get("/api/sessions")
@limiter.limit("60/minute")
async def get_sessions(request: Request):
    """获取所有聊天会话"""
    try:
        sessions_data = await db_manager.load_sessions()
        # 按更新时间降序排序
        sessions_data.sort(
            key=lambda s: s.get('updated_at', ''), 
            reverse=True
        )
        
        # 只返回会话基本信息
        sessions_info = []
        for session in sessions_data:
            sessions_info.append({
                "id": session.get("id"),
                "title": session.get("title"),
                "updated_at": session.get("updated_at"),
                "created_at": session.get("created_at"),
                "message_count": len(session.get("messages", []))
            })
        
        return {"sessions": sessions_info}
        
    except Exception as e:
        app_logger.error(f"获取会话列表失败: {e}")
        raise HTTPException(status_code=500, detail="获取会话列表失败")

@app.get("/api/sessions/{session_id}")
@limiter.limit("60/minute")
async def get_session(request: Request, session_id: str):
    """获取特定会话的详细信息"""
    try:
        session = await db_manager.get_session_by_id(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在")
        return {"session": session}
        
    except HTTPException:
        raise
    except Exception as e:
        app_logger.error(f"获取会话详情失败: {e}")
        raise HTTPException(status_code=500, detail="获取会话详情失败")

@app.post("/api/chat")
@limiter.limit("30/minute")
async def chat(request: Request, chat_request: ChatRequest):
    """处理聊天请求"""
    try:
        # 基本的输入验证
        if not chat_request.message.strip():
            raise HTTPException(status_code=400, detail="消息不能为空")
        
        if len(chat_request.message) > 10000:
            raise HTTPException(status_code=400, detail="消息过长，请控制在10000字符以内")
        
        # 获取或创建会话
        sessions_data = await db_manager.load_sessions()
        session_data = None
        
        if chat_request.session_id:
            session_data = await db_manager.get_session_by_id(chat_request.session_id)
            if not session_data:
                raise HTTPException(status_code=404, detail="会话不存在")
        else:
            # 创建新会话
            session_id = str(uuid.uuid4())
            session_data = {
                "id": session_id,
                "title": chat_request.message[:30] + "..." if len(chat_request.message) > 30 else chat_request.message,
                "messages": [],
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
        
        # 处理上传的文件
        processed_files = []
        attachments_info = []
        
        if chat_request.file_ids:
            from utils.file_processor import process_uploaded_file
            
            for file_id in chat_request.file_ids:
                # 查找文件
                for filename in os.listdir(config.UPLOAD_DIR):
                    if filename.startswith(file_id):
                        file_path = os.path.join(config.UPLOAD_DIR, filename)
                        file_ext = os.path.splitext(filename)[1][1:]  # 去掉点号
                        original_name = filename  # 这里简化处理，实际应该从数据库获取原始文件名
                        
                        # 处理文件
                        file_info = await process_uploaded_file(file_path, file_ext, filename)
                        processed_files.append(file_info)
                        
                        # 保存附件信息（用于显示）
                        file_stat = os.stat(file_path)
                        attachments_info.append({
                            "file_id": file_id,
                            "filename": filename,
                            "file_type": file_ext,
                            "file_size": file_stat.st_size
                        })
                        
                        app_logger.info(f"处理文件: {filename} ({file_ext})")
                        break
        
        # 添加用户消息（包含附件信息）
        user_message = {
            "id": str(uuid.uuid4()),
            "role": "user",
            "content": chat_request.message,
            "timestamp": datetime.now().isoformat(),
            "attachments": attachments_info if attachments_info else None
        }
        session_data["messages"].append(user_message)
        
        # 确定使用的Agent
        selected_agent = AGENTS.get(chat_request.agent_name, AGENTS["GPT5"])
        
        # 加载长期记忆并构建上下文
        memories = await load_memories()
        memory_context = ""
        
        if memories:
            # 按重要程度排序，只取重要的记忆（importance >= 3）
            important_memories = [m for m in memories if m.get('importance', 3) >= 3]
            important_memories.sort(key=lambda m: m.get('importance', 3), reverse=True)
            
            # 最多使用前10条重要记忆
            top_memories = important_memories[:10]
            
            if top_memories:
                memory_items = []
                for mem in top_memories:
                    category = getCategoryLabel(mem.get('category', 'general'))
                    importance = '⭐' * mem.get('importance', 3)
                    memory_items.append(f"[{category}] {mem['title']}: {mem['content']}")
                
                memory_context = "\n\n【长期记忆】\n以下是用户的长期记忆信息，请在回答时适当参考：\n" + "\n".join(f"{i+1}. {item}" for i, item in enumerate(memory_items))
        
        # 处理文件内容并添加到上下文
        file_context = ""
        if processed_files:
            from utils.file_processor import format_file_content_for_prompt
            file_context = format_file_content_for_prompt(processed_files)
        
        # 构建系统提示（包含记忆）
        system_prompt = selected_agent["system_prompt"]
        if memory_context:
            system_prompt += memory_context
        
        messages = [{"role": "system", "content": system_prompt}]
        
        # 添加最近的对话历史
        recent_messages = session_data["messages"][-20:]  # 最近20条消息
        for msg in recent_messages[:-1]:  # 除了刚添加的用户消息
            if msg["role"] == "user":
                messages.append({"role": "user", "content": msg["content"]})
            elif msg["role"] in ["assistant", "agent"]:
                messages.append({"role": "assistant", "content": msg["content"]})
        
        # 添加当前用户消息（包含文件内容）
        # 检查是否有图片文件
        has_images = any(f.get("image_base64") for f in processed_files)
        
        # 清理消息中的@提及（用于实际发送给AI）
        cleaned_message = clean_message_mentions(chat_request.message)
        
        if has_images:
            # 使用多模态消息格式（支持图片）
            content_parts = [{"type": "text", "text": cleaned_message}]
            
            # 添加图片
            for file_info in processed_files:
                if file_info.get("image_base64"):
                    image_data = file_info["image_base64"]
                    file_ext = file_info.get("file_type", "png")
                    mime_type = f"image/{file_ext}"
                    
                    # 调试信息：记录图片数据的前100个字符
                    app_logger.info(f"📷 图片文件: {file_info.get('filename')}")
                    app_logger.info(f"📷 文件类型: {file_ext}, MIME: {mime_type}")
                    app_logger.info(f"📷 Base64长度: {len(image_data)} 字符")
                    app_logger.info(f"📷 Base64前100字符: {image_data[:100]}")
                    
                    content_parts.append({
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{image_data}"
                        }
                    })
                    app_logger.info(f"✅ 已添加图片到消息: {file_info.get('filename')}")
                
                # 添加文本文件内容
                elif file_info.get("content_text"):
                    text = file_info["content_text"]
                    max_length = 5000
                    if len(text) > max_length:
                        text = text[:max_length] + f"\n\n[文档过长，已截取前{max_length}字符]"
                    
                    filename = file_info.get("filename", "未知文件")
                    content_parts[0]["text"] += f"\n\n📄 文档: {filename}\n```\n{text}\n```"
            
            messages.append({"role": "user", "content": content_parts})
            app_logger.info(f"使用多模态消息格式，包含 {len([f for f in processed_files if f.get('image_base64')])} 张图片")
        else:
            # 纯文本消息格式
            current_user_message = cleaned_message
            if file_context:
                current_user_message += file_context
                app_logger.info(f"已添加 {len(processed_files)} 个文件到上下文")
            
            messages.append({"role": "user", "content": current_user_message})
        
        # 调用API
        try:
            response_content = await poe_client.chat_completion(
                model=selected_agent["model"],
                messages=messages
            )
            
            # 添加Agent回复
            agent_message = {
                "id": str(uuid.uuid4()),
                "role": "agent",
                "content": response_content,
                "agent_name": selected_agent["name"],
                "timestamp": datetime.now().isoformat()
            }
            session_data["messages"].append(agent_message)
            
            # 更新会话时间
            session_data["updated_at"] = datetime.now().isoformat()
            
            # 保存会话
            await db_manager.update_session(session_data)
            
            return {
                "session_id": session_data["id"],
                "message": agent_message,
                "agent": selected_agent["name"]
            }
            
        except APIAuthError as e:
            app_logger.error(f"API认证失败: {e}")
            raise HTTPException(status_code=401, detail="API认证失败，请检查配置")
            
        except APIRateLimitError as e:
            app_logger.warning(f"API限流: {e}")
            raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试")
            
        except APIError as e:
            app_logger.error(f"API调用失败: {e}")
            raise HTTPException(status_code=503, detail="AI服务暂时不可用，请稍后再试")
        
    except HTTPException:
        raise
    except Exception as e:
        app_logger.error(f"聊天处理失败: {e}")
        raise HTTPException(status_code=500, detail="处理聊天时发生错误")

@app.post("/api/chat/stream")
@limiter.limit("30/minute")
async def chat_stream(request: Request, chat_request: ChatRequest):
    """处理流式聊天请求"""
    try:
        # 基本的输入验证
        if not chat_request.message.strip():
            raise HTTPException(status_code=400, detail="消息不能为空")
        
        if len(chat_request.message) > 10000:
            raise HTTPException(status_code=400, detail="消息过长，请控制在10000字符以内")
        
        # 获取或创建会话
        sessions_data = await db_manager.load_sessions()
        session_data = None
        
        if chat_request.session_id:
            session_data = await db_manager.get_session_by_id(chat_request.session_id)
            if not session_data:
                raise HTTPException(status_code=404, detail="会话不存在")
        else:
            # 创建新会话
            session_id = str(uuid.uuid4())
            session_data = {
                "id": session_id,
                "title": chat_request.message[:30] + "..." if len(chat_request.message) > 30 else chat_request.message,
                "messages": [],
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
        
        # 处理上传的文件
        processed_files = []
        attachments_info = []
        
        if chat_request.file_ids:
            from utils.file_processor import process_uploaded_file
            
            for file_id in chat_request.file_ids:
                # 查找文件
                for filename in os.listdir(config.UPLOAD_DIR):
                    if filename.startswith(file_id):
                        file_path = os.path.join(config.UPLOAD_DIR, filename)
                        file_ext = os.path.splitext(filename)[1][1:]
                        
                        # 处理文件
                        file_info = await process_uploaded_file(file_path, file_ext, filename)
                        processed_files.append(file_info)
                        
                        # 保存附件信息
                        file_stat = os.stat(file_path)
                        attachments_info.append({
                            "file_id": file_id,
                            "filename": filename,
                            "file_type": file_ext,
                            "file_size": file_stat.st_size
                        })
                        break
        
        # 添加用户消息
        user_message = {
            "id": str(uuid.uuid4()),
            "role": "user",
            "content": chat_request.message,
            "timestamp": datetime.now().isoformat(),
            "attachments": attachments_info if attachments_info else None
        }
        session_data["messages"].append(user_message)
        
        # 确定使用的Agent
        selected_agent = AGENTS.get(chat_request.agent_name, AGENTS["GPT5"])
        
        # 加载长期记忆并构建上下文
        memories = await load_memories()
        memory_context = ""
        
        if memories:
            important_memories = [m for m in memories if m.get('importance', 3) >= 3]
            important_memories.sort(key=lambda m: m.get('importance', 3), reverse=True)
            top_memories = important_memories[:10]
            
            if top_memories:
                memory_items = []
                for mem in top_memories:
                    category = getCategoryLabel(mem.get('category', 'general'))
                    memory_items.append(f"[{category}] {mem['title']}: {mem['content']}")
                
                memory_context = "\n\n【长期记忆】\n以下是用户的长期记忆信息，请在回答时适当参考：\n" + "\n".join(f"{i+1}. {item}" for i, item in enumerate(memory_items))
        
        # 处理文件内容并添加到上下文
        file_context = ""
        if processed_files:
            from utils.file_processor import format_file_content_for_prompt
            file_context = format_file_content_for_prompt(processed_files)
        
        # 构建系统提示
        system_prompt = selected_agent["system_prompt"]
        if memory_context:
            system_prompt += memory_context
        
        messages = [{"role": "system", "content": system_prompt}]
        
        # 添加最近的对话历史
        recent_messages = session_data["messages"][-20:]
        for msg in recent_messages[:-1]:
            if msg["role"] == "user":
                messages.append({"role": "user", "content": msg["content"]})
            elif msg["role"] in ["assistant", "agent"]:
                messages.append({"role": "assistant", "content": msg["content"]})
        
        # 添加当前用户消息
        has_images = any(f.get("image_base64") for f in processed_files)
        
        if has_images:
            content_parts = [{"type": "text", "text": cleaned_message}]
            for file_info in processed_files:
                if file_info.get("image_base64"):
                    image_data = file_info["image_base64"]
                    file_ext = file_info.get("file_type", "png")
                    mime_type = f"image/{file_ext}"
                    content_parts.append({
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{image_data}"}
                    })
                elif file_info.get("content_text"):
                    text = file_info["content_text"]
                    max_length = 5000
                    if len(text) > max_length:
                        text = text[:max_length] + f"\n\n[文档过长，已截取前{max_length}字符]"
                    filename = file_info.get("filename", "未知文件")
                    content_parts[0]["text"] += f"\n\n📄 文档: {filename}\n```\n{text}\n```"
            messages.append({"role": "user", "content": content_parts})
        else:
            current_user_message = cleaned_message
            if file_context:
                current_user_message += file_context
            messages.append({"role": "user", "content": current_user_message})

        # 生成器函数
        async def generate():
            full_response = ""
            agent_message_id = str(uuid.uuid4())
            
            # 发送会话ID和消息ID
            yield json.dumps({
                "type": "meta",
                "session_id": session_data["id"],
                "message_id": agent_message_id,
                "agent": selected_agent["name"]
            }) + "\n"
            
            try:
                async for chunk in poe_client.stream_chat_completion(
                    model=selected_agent["model"],
                    messages=messages
                ):
                    full_response += chunk
                    yield json.dumps({
                        "type": "content",
                        "content": chunk
                    }) + "\n"
                
                # 保存完整的Agent回复
                agent_message = {
                    "id": agent_message_id,
                    "role": "agent",
                    "content": full_response,
                    "agent_name": selected_agent["name"],
                    "timestamp": datetime.now().isoformat()
                }
                session_data["messages"].append(agent_message)
                session_data["updated_at"] = datetime.now().isoformat()
                await db_manager.update_session(session_data)
                
            except Exception as e:
                app_logger.error(f"流式生成失败: {e}")
                yield json.dumps({
                    "type": "error",
                    "error": str(e)
                }) + "\n"

        return StreamingResponse(generate(), media_type="application/x-ndjson")

    except HTTPException:
        raise
    except Exception as e:
        app_logger.error(f"聊天处理失败: {e}")
        raise HTTPException(status_code=500, detail="处理聊天时发生错误")

@app.post("/api/chat/stream")
@limiter.limit("30/minute")
async def chat_stream(request: Request, chat_request: ChatRequest):
    """处理聊天请求（流式输出）"""
    try:
        # 基本的输入验证
        if not chat_request.message.strip():
            raise HTTPException(status_code=400, detail="消息不能为空")
        
        if len(chat_request.message) > 10000:
            raise HTTPException(status_code=400, detail="消息过长，请控制在10000字符以内")
        
        # 获取或创建会话
        sessions_data = await db_manager.load_sessions()
        session_data = None
        
        if chat_request.session_id:
            session_data = await db_manager.get_session_by_id(chat_request.session_id)
            if not session_data:
                raise HTTPException(status_code=404, detail="会话不存在")
        else:
            # 创建新会话
            session_id = str(uuid.uuid4())
            session_data = {
                "id": session_id,
                "title": chat_request.message[:30] + "..." if len(chat_request.message) > 30 else chat_request.message,
                "messages": [],
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
        
        # 处理上传的文件
        processed_files = []
        attachments_info = []
        
        if chat_request.file_ids:
            from utils.file_processor import process_uploaded_file
            
            for file_id in chat_request.file_ids:
                for filename in os.listdir(config.UPLOAD_DIR):
                    if filename.startswith(file_id):
                        file_path = os.path.join(config.UPLOAD_DIR, filename)
                        file_ext = os.path.splitext(filename)[1][1:]
                        file_info = await process_uploaded_file(file_path, file_ext, filename)
                        processed_files.append(file_info)
                        
                        file_stat = os.stat(file_path)
                        attachments_info.append({
                            "file_id": file_id,
                            "filename": filename,
                            "file_type": file_ext,
                            "file_size": file_stat.st_size
                        })
                        break
        
        # 添加用户消息
        user_message = {
            "id": str(uuid.uuid4()),
            "role": "user",
            "content": chat_request.message,
            "timestamp": datetime.now().isoformat(),
            "attachments": attachments_info if attachments_info else None
        }
        session_data["messages"].append(user_message)
        
        # 确定使用的Agent
        selected_agent = AGENTS.get(chat_request.agent_name, AGENTS["GPT5"])
        
        # 构建消息上下文（与非流式版本相同）
        memories = await load_memories()
        memory_context = ""
        if memories:
            important_memories = [m for m in memories if m.get('importance', 3) >= 3]
            important_memories.sort(key=lambda m: m.get('importance', 3), reverse=True)
            top_memories = important_memories[:10]
            
            if top_memories:
                memory_items = []
                for mem in top_memories:
                    category = getCategoryLabel(mem.get('category', 'general'))
                    memory_items.append(f"[{category}] {mem['title']}: {mem['content']}")
                memory_context = "\n\n【长期记忆】\n以下是用户的长期记忆信息，请在回答时适当参考：\n" + "\n".join(f"{i+1}. {item}" for i, item in enumerate(memory_items))
        
        # 处理文件内容
        file_context = ""
        if processed_files:
            from utils.file_processor import format_file_content_for_prompt
            file_context = format_file_content_for_prompt(processed_files)
        
        # 构建系统提示
        system_prompt = selected_agent["system_prompt"]
        if memory_context:
            system_prompt += memory_context
        
        messages = [{"role": "system", "content": system_prompt}]
        
        # 添加最近的对话历史
        recent_messages = session_data["messages"][-20:]
        for msg in recent_messages[:-1]:
            if msg["role"] == "user":
                messages.append({"role": "user", "content": msg["content"]})
            elif msg["role"] in ["assistant", "agent"]:
                messages.append({"role": "assistant", "content": msg["content"]})
        
        # 添加当前用户消息
        has_images = any(f.get("image_base64") for f in processed_files)
        
        if has_images:
            content_parts = [{"type": "text", "text": cleaned_message}]
            for file_info in processed_files:
                if file_info.get("image_base64"):
                    image_data = file_info["image_base64"]
                    file_ext = file_info.get("file_type", "png")
                    mime_type = f"image/{file_ext}"
                    content_parts.append({
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{image_data}"}
                    })
                elif file_info.get("content_text"):
                    text = file_info["content_text"][:5000]
                    filename = file_info.get("filename", "未知文件")
                    content_parts[0]["text"] += f"\n\n📄 文档: {filename}\n```\n{text}\n```"
            messages.append({"role": "user", "content": content_parts})
        else:
            current_user_message = cleaned_message
            if file_context:
                current_user_message += file_context
            messages.append({"role": "user", "content": current_user_message})
        
        # 流式生成器函数
        async def generate_stream():
            accumulated_content = ""
            try:
                # 发送初始元数据
                import json
                metadata = {
                    "type": "metadata",
                    "session_id": session_data["id"],
                    "agent_name": selected_agent["name"]
                }
                yield f"data: {json.dumps(metadata, ensure_ascii=False)}\n\n"
                
                # 流式调用API
                async for chunk in poe_client.stream_chat_completion(
                    model=selected_agent["model"],
                    messages=messages
                ):
                    accumulated_content += chunk
                    chunk_data = {
                        "type": "content",
                        "content": chunk
                    }
                    yield f"data: {json.dumps(chunk_data, ensure_ascii=False)}\n\n"
                
                # 保存完整的Agent回复到会话
                agent_message = {
                    "id": str(uuid.uuid4()),
                    "role": "agent",
                    "content": accumulated_content,
                    "agent_name": selected_agent["name"],
                    "timestamp": datetime.now().isoformat()
                }
                session_data["messages"].append(agent_message)
                session_data["updated_at"] = datetime.now().isoformat()
                await db_manager.update_session(session_data)
                
                # 发送完成信号
                done_data = {
                    "type": "done",
                    "message_id": agent_message["id"]
                }
                yield f"data: {json.dumps(done_data, ensure_ascii=False)}\n\n"
                
            except Exception as e:
                app_logger.error(f"流式生成失败: {e}")
                error_data = {
                    "type": "error",
                    "error": str(e)
                }
                yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        app_logger.error(f"流式聊天处理失败: {e}")
        raise HTTPException(status_code=500, detail="处理聊天时发生错误")

@app.delete("/api/sessions/{session_id}")
@limiter.limit("30/minute")
async def delete_session(request: Request, session_id: str):
    """删除会话"""
    try:
        success = await db_manager.delete_session(session_id)
        if success:
            return {"message": "会话已删除"}
        else:
            raise HTTPException(status_code=404, detail="会话不存在")
            
    except HTTPException:
        raise
    except Exception as e:
        app_logger.error(f"删除会话失败: {e}")
        raise HTTPException(status_code=500, detail="删除会话失败")

# ==================== 长期记忆管理 API ====================
MEMORIES_FILE = "memories.json"

def getCategoryLabel(category: str) -> str:
    """获取分类的中文标签"""
    labels = {
        'general': '通用',
        'work': '工作',
        'personal': '个人',
        'knowledge': '知识'
    }
    return labels.get(category, category)

async def load_memories() -> List[dict]:
    """加载所有记忆"""
    try:
        if os.path.exists(MEMORIES_FILE):
            async with aiofiles.open(MEMORIES_FILE, 'r', encoding='utf-8') as f:
                content = await f.read()
                return json.loads(content)
        return []
    except Exception as e:
        app_logger.error(f"加载记忆失败: {e}")
        return []

async def save_memories(memories: List[dict]):
    """保存所有记忆"""
    try:
        async with aiofiles.open(MEMORIES_FILE, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(memories, ensure_ascii=False, indent=2))
    except Exception as e:
        app_logger.error(f"保存记忆失败: {e}")
        raise

@app.get("/api/memories")
@limiter.limit("60/minute")
async def get_memories(request: Request, category: Optional[str] = None):
    """获取所有记忆或按分类筛选"""
    try:
        memories = await load_memories()
        
        # 按分类筛选
        if category:
            memories = [m for m in memories if m.get("category") == category]
        
        # 按更新时间降序排序
        memories.sort(key=lambda m: m.get("updated_at", ""), reverse=True)
        
        return {"memories": memories}
        
    except Exception as e:
        app_logger.error(f"获取记忆列表失败: {e}")
        raise HTTPException(status_code=500, detail="获取记忆列表失败")

@app.get("/api/memories/{memory_id}")
@limiter.limit("60/minute")
async def get_memory(request: Request, memory_id: str):
    """获取特定记忆"""
    try:
        memories = await load_memories()
        memory = next((m for m in memories if m["id"] == memory_id), None)
        
        if not memory:
            raise HTTPException(status_code=404, detail="记忆不存在")
        
        return {"memory": memory}
        
    except HTTPException:
        raise
    except Exception as e:
        app_logger.error(f"获取记忆失败: {e}")
        raise HTTPException(status_code=500, detail="获取记忆失败")

@app.post("/api/memories")
@limiter.limit("30/minute")
async def create_memory(request: Request, memory_request: MemoryCreateRequest):
    """创建新记忆"""
    try:
        memories = await load_memories()
        
        # 创建新记忆
        new_memory = {
            "id": str(uuid.uuid4()),
            "title": memory_request.title,
            "content": memory_request.content,
            "category": memory_request.category,
            "tags": memory_request.tags or [],
            "importance": memory_request.importance,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        memories.append(new_memory)
        await save_memories(memories)
        
        app_logger.info(f"创建记忆: {new_memory['id']}")
        return {"memory": new_memory, "message": "记忆创建成功"}
        
    except Exception as e:
        app_logger.error(f"创建记忆失败: {e}")
        raise HTTPException(status_code=500, detail="创建记忆失败")

@app.put("/api/memories/{memory_id}")
@limiter.limit("30/minute")
async def update_memory(request: Request, memory_id: str, memory_request: MemoryUpdateRequest):
    """更新记忆"""
    try:
        memories = await load_memories()
        memory = next((m for m in memories if m["id"] == memory_id), None)
        
        if not memory:
            raise HTTPException(status_code=404, detail="记忆不存在")
        
        # 更新字段
        if memory_request.title is not None:
            memory["title"] = memory_request.title
        if memory_request.content is not None:
            memory["content"] = memory_request.content
        if memory_request.category is not None:
            memory["category"] = memory_request.category
        if memory_request.tags is not None:
            memory["tags"] = memory_request.tags
        if memory_request.importance is not None:
            memory["importance"] = memory_request.importance
        
        memory["updated_at"] = datetime.now().isoformat()
        
        await save_memories(memories)
        
        app_logger.info(f"更新记忆: {memory_id}")
        return {"memory": memory, "message": "记忆更新成功"}
        
    except HTTPException:
        raise
    except Exception as e:
        app_logger.error(f"更新记忆失败: {e}")
        raise HTTPException(status_code=500, detail="更新记忆失败")

@app.delete("/api/memories/{memory_id}")
@limiter.limit("30/minute")
async def delete_memory(request: Request, memory_id: str):
    """删除记忆"""
    try:
        memories = await load_memories()
        original_len = len(memories)
        memories = [m for m in memories if m["id"] != memory_id]
        
        if len(memories) == original_len:
            raise HTTPException(status_code=404, detail="记忆不存在")
        
        await save_memories(memories)
        
        app_logger.info(f"删除记忆: {memory_id}")
        return {"message": "记忆已删除"}
        
    except HTTPException:
        raise
    except Exception as e:
        app_logger.error(f"删除记忆失败: {e}")
        raise HTTPException(status_code=500, detail="删除记忆失败")

# ==================== 文件管理相关 ====================

@app.post("/api/upload")
@limiter.limit("20/minute")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None)
):
    """上传文件"""
    try:
        # 验证文件大小
        file_content = await file.read()
        file_size = len(file_content)
        
        if file_size > config.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"文件大小超过限制 ({config.MAX_FILE_SIZE / (1024 * 1024)}MB)"
            )
        
        # 验证文件类型
        allowed_types = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'text/markdown',
            'image/png',
            'image/jpeg'
        ]
        
        if file.content_type not in allowed_types:
            # 检查文件扩展名
            allowed_extensions = ['.pdf', '.docx', '.txt', '.md', '.markdown', '.png', '.jpg', '.jpeg']
            if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
                raise HTTPException(
                    status_code=400,
                    detail="不支持的文件类型"
                )
        
        # 生成唯一文件ID和文件名
        file_id = str(uuid.uuid4())
        file_ext = os.path.splitext(file.filename)[1]
        safe_filename = f"{file_id}{file_ext}"
        file_path = os.path.join(config.UPLOAD_DIR, safe_filename)
        
        # 保存文件
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        
        # 获取文件类型
        file_type = file_ext[1:] if file_ext else 'unknown'
        
        result = {
            "file_id": file_id,
            "filename": file.filename,
            "safe_filename": safe_filename,
            "file_type": file_type,
            "file_size": file_size,
            "session_id": session_id,
            "uploaded_at": datetime.now().isoformat()
        }
        
        app_logger.info(f"文件上传成功: {file.filename} ({file_size} bytes)")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        app_logger.error(f"文件上传失败: {e}")
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")

@app.delete("/api/files/{file_id}")
@limiter.limit("30/minute")
async def delete_file(request: Request, file_id: str):
    """删除上传的文件"""
    try:
        # 查找并删除文件
        deleted = False
        for filename in os.listdir(config.UPLOAD_DIR):
            if filename.startswith(file_id):
                file_path = os.path.join(config.UPLOAD_DIR, filename)
                os.remove(file_path)
                deleted = True
                app_logger.info(f"文件已删除: {filename}")
                break
        
        if not deleted:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        return {"message": "文件已删除"}
        
    except HTTPException:
        raise
    except Exception as e:
        app_logger.error(f"删除文件失败: {e}")
        raise HTTPException(status_code=500, detail="删除文件失败")

@app.post("/api/discussion")
@limiter.limit("10/minute")
async def start_discussion(request: Request, discussion_request: DiscussionRequest):
    """启动多智能体讨论"""
    try:
        app_logger.info(f"🎯 收到讨论请求: {discussion_request.question[:50]}...")
        app_logger.info(f"📋 参与专家: {discussion_request.selected_agents}")
        app_logger.info(f"🔄 讨论轮次: {discussion_request.rounds}")
        
        # 验证输入
        if not discussion_request.question.strip():
            raise HTTPException(status_code=400, detail="讨论问题不能为空")
        
        if len(discussion_request.selected_agents) < 2:
            raise HTTPException(status_code=400, detail="至少需要2位专家参与讨论")
        
        # 验证所有选中的专家都存在
        for agent_name in discussion_request.selected_agents:
            if agent_name not in AGENTS:
                raise HTTPException(status_code=400, detail=f"专家 '{agent_name}' 不存在")
        
        # 创建新会话
        session_id = str(uuid.uuid4())
        session_data = {
            "id": session_id,
            "title": f"讨论: {discussion_request.question[:30]}...",
            "messages": [],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "is_discussion": True
        }
        
        # 处理上传的文件（如果有）
        file_context = ""
        processed_files = []
        if discussion_request.file_ids:
            from utils.file_processor import process_uploaded_file, format_file_content_for_prompt
            
            for file_id in discussion_request.file_ids:
                for filename in os.listdir(config.UPLOAD_DIR):
                    if filename.startswith(file_id):
                        file_path = os.path.join(config.UPLOAD_DIR, filename)
                        file_ext = os.path.splitext(filename)[1][1:]
                        file_info = await process_uploaded_file(file_path, file_ext, filename)
                        processed_files.append(file_info)
                        app_logger.info(f"📎 处理讨论文件: {filename}")
                        break
            
            if processed_files:
                file_context = format_file_content_for_prompt(processed_files)
        
        # 添加用户问题
        user_message = {
            "id": str(uuid.uuid4()),
            "role": "user",
            "content": discussion_request.question,
            "timestamp": datetime.now().isoformat()
        }
        session_data["messages"].append(user_message)
        
        # 加载长期记忆
        memories = await load_memories()
        memory_context = ""
        if memories:
            important_memories = [m for m in memories if m.get('importance', 3) >= 3]
            important_memories.sort(key=lambda m: m.get('importance', 3), reverse=True)
            top_memories = important_memories[:10]
            
            if top_memories:
                memory_items = []
                for mem in top_memories:
                    category = getCategoryLabel(mem.get('category', 'general'))
                    memory_items.append(f"[{category}] {mem['title']}: {mem['content']}")
                memory_context = "\n\n【长期记忆】\n" + "\n".join(f"{i+1}. {item}" for i, item in enumerate(memory_items))
        
        # 构建讨论上下文（问题 + 文件 + 记忆）
        discussion_context = discussion_request.question
        if file_context:
            discussion_context += file_context
        if memory_context:
            discussion_context += memory_context
        
        # 进行多轮讨论
        app_logger.info(f"🚀 开始 {discussion_request.rounds} 轮讨论...")
        
        for round_num in range(1, discussion_request.rounds + 1):
            app_logger.info(f"📣 第 {round_num}/{discussion_request.rounds} 轮讨论")
            
            for agent_name in discussion_request.selected_agents:
                agent = AGENTS[agent_name]
                app_logger.info(f"💬 {agent_name} 正在发言...")
                
                # 构建该专家的系统提示
                system_prompt = agent["system_prompt"]
                system_prompt += f"\n\n当前是多智能体讨论的第 {round_num} 轮，共 {discussion_request.rounds} 轮。"
                system_prompt += f"\n参与讨论的专家有: {', '.join(discussion_request.selected_agents)}。"
                system_prompt += "\n请基于讨论问题和其他专家的观点，提供你的专业见解。"
                
                # 构建消息历史
                messages = [{"role": "system", "content": system_prompt}]
                
                # 添加问题作为初始user消息
                # 检查是否有图片文件
                has_images = any(f.get("image_base64") for f in processed_files)
                
                if has_images:
                    # 使用多模态消息格式
                    content_parts = [{"type": "text", "text": f"讨论问题: {discussion_request.question}"}]
                    
                    # 添加图片
                    for file_info in processed_files:
                        if file_info.get("image_base64"):
                            image_data = file_info["image_base64"]
                            file_ext = file_info.get("file_type", "png")
                            mime_type = f"image/{file_ext}"
                            
                            content_parts.append({
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{image_data}"
                                }
                            })
                        # 添加文本文件内容
                        elif file_info.get("content_text"):
                            text = file_info["content_text"]
                            max_length = 5000
                            if len(text) > max_length:
                                text = text[:max_length] + f"\n\n[文档过长，已截取前{max_length}字符]"
                            filename = file_info.get("filename", "未知文件")
                            content_parts[0]["text"] += f"\n\n📄 文档: {filename}\n```\n{text}\n```"
                    
                    # 添加记忆上下文到文本部分
                    if memory_context:
                        content_parts[0]["text"] += memory_context
                    
                    messages.append({"role": "user", "content": content_parts})
                else:
                    # 纯文本消息
                    messages.append({"role": "user", "content": f"讨论问题: {discussion_context}"})
                
                # 添加之前的讨论消息（转换为user/assistant交替格式）
                previous_messages = []
                for msg in session_data["messages"][1:]:  # 跳过用户的原始问题
                    if msg["role"] == "agent" and msg.get("content", "").strip():
                        content = msg["content"].strip()
                        previous_messages.append({
                            "agent_name": msg["agent_name"],
                            "content": content
                        })
                
                # 将之前的发言转换为对话格式（user问 -> assistant答）
                for i, prev_msg in enumerate(previous_messages):
                    # 添加user消息：请{专家}发言
                    messages.append({
                        "role": "user",
                        "content": f"请{prev_msg['agent_name']}提供你的专业观点。"
                    })
                    # 添加assistant消息：专家的回复
                    messages.append({
                        "role": "assistant",
                        "content": prev_msg['content']
                    })
                
                # 最后添加一个user消息，请求当前专家发言
                messages.append({
                    "role": "user",
                    "content": f"现在请{agent_name}基于以上讨论，提供你的专业见解。"
                })
                
                # 调用AI
                try:
                    # 记录发送的消息数量和最后一条消息
                    app_logger.debug(f"🔍 {agent_name} 发送消息数: {len(messages)}")
                    if len(messages) > 1:
                        last_msg = messages[-1]
                        app_logger.debug(f"🔍 最后一条消息角色: {last_msg['role']}, 内容长度: {len(last_msg['content'])}")
                        app_logger.debug(f"🔍 最后一条消息内容前100字: {last_msg['content'][:100]}")
                    
                    response_content = await poe_client.chat_completion(
                        model=agent["model"],
                        messages=messages
                    )
                    
                    # 清理响应内容：去除首尾空白
                    response_content = response_content.strip() if response_content else ""
                    
                    # 如果响应为空，跳过此专家
                    if not response_content:
                        app_logger.warning(f"⚠️ {agent_name} 返回空内容，跳过")
                        continue
                    
                    # 添加专家回复
                    agent_message = {
                        "id": str(uuid.uuid4()),
                        "role": "agent",
                        "content": response_content,
                        "agent_name": agent_name,
                        "timestamp": datetime.now().isoformat(),
                        "round": round_num
                    }
                    session_data["messages"].append(agent_message)
                    app_logger.info(f"✅ {agent_name} 发言完成 ({len(response_content)} 字符)")
                    
                except Exception as e:
                    app_logger.error(f"❌ {agent_name} 发言失败: {e}")
                    # 继续下一个专家
                    continue
        
        # 生成总结（如果需要）
        if discussion_request.include_summary:
            app_logger.info("📝 生成讨论总结...")
            
            # 使用GPT-5生成总结
            summary_agent = AGENTS["GPT5"]
            
            # 收集所有讨论内容
            discussion_history = []
            for msg in session_data["messages"][1:]:  # 跳过用户问题
                if msg["role"] == "agent":
                    discussion_history.append(f"【{msg['agent_name']}】(第{msg.get('round', 1)}轮):\n{msg['content']}")
            
            summary_prompt = f"""请对以下多智能体讨论进行全面总结：

讨论问题：{discussion_request.question}

参与专家：{', '.join(discussion_request.selected_agents)}

讨论内容：
{chr(10).join(discussion_history)}

请从以下几个方面进行总结：
1. 核心观点汇总
2. 各专家的主要建议
3. 共识与分歧点
4. 可行性建议
5. 后续行动建议

请使用清晰的结构和markdown格式呈现。"""
            
            try:
                summary_response = await poe_client.chat_completion(
                    model=summary_agent["model"],
                    messages=[
                        {"role": "system", "content": "你是一位专业的会议记录者，擅长总结和提炼讨论要点。"},
                        {"role": "user", "content": summary_prompt}
                    ]
                )
                
                # 添加总结消息
                summary_message = {
                    "id": str(uuid.uuid4()),
                    "role": "summary",
                    "content": summary_response,
                    "agent_name": "讨论总结",
                    "timestamp": datetime.now().isoformat()
                }
                session_data["messages"].append(summary_message)
                app_logger.info("✅ 讨论总结生成完成")
                
            except Exception as e:
                app_logger.error(f"❌ 生成总结失败: {e}")
        
        # 更新并保存会话
        session_data["updated_at"] = datetime.now().isoformat()
        await db_manager.update_session(session_data)
        
        app_logger.info(f"🎉 讨论完成！会话ID: {session_id}")
        
        return {
            "session_id": session_id,
            "message": "讨论已完成",
            "total_messages": len(session_data["messages"]),
            "background_task": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        app_logger.error(f"讨论处理失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"处理讨论时发生错误: {str(e)}")

# 静态文件服务
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory=config.UPLOAD_DIR), name="uploads")

if __name__ == "__main__":
    import uvicorn
    
    # 运行服务器
    # 注意：直接传入 app 实例而不是字符串，避免重复导入导致日志配置被执行多次
    uvicorn.run(
        app,  # 直接使用 app 实例
        host=config.HOST,
        port=config.PORT,
        reload=config.DEBUG,
        log_level="info" if not config.DEBUG else "debug"
    )
