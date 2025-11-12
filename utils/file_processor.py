"""
文件处理工具
"""
import os
import base64
from typing import Dict, Optional
from utils.logger import app_logger

async def process_uploaded_file(file_path: str, file_type: str, filename: str) -> Dict:
    """
    处理上传的文件，提取内容或转换为base64
    
    Args:
        file_path: 文件路径
        file_type: 文件类型（pdf, docx, txt, md, png, jpg, jpeg）
        filename: 原始文件名
    
    Returns:
        包含文件信息和处理后内容的字典
    """
    result = {
        "filename": filename,
        "file_type": file_type,
        "content_text": None,
        "image_base64": None
    }
    
    try:
        # 图片文件：转换为base64
        if file_type in ['png', 'jpg', 'jpeg']:
            with open(file_path, 'rb') as f:
                image_data = f.read()
                result["image_base64"] = base64.b64encode(image_data).decode('utf-8')
            app_logger.info(f"图片文件已转换为base64: {filename}")
        
        # 文本文件：直接读取
        elif file_type in ['txt', 'md', 'markdown']:
            with open(file_path, 'r', encoding='utf-8') as f:
                result["content_text"] = f.read()
            app_logger.info(f"文本文件已读取: {filename}")
        
        # PDF文件：提取文本（需要pdfplumber）
        elif file_type == 'pdf':
            try:
                import pdfplumber
                with pdfplumber.open(file_path) as pdf:
                    text_content = []
                    for page in pdf.pages:
                        text = page.extract_text()
                        if text:
                            text_content.append(text)
                    result["content_text"] = "\n\n".join(text_content)
                app_logger.info(f"PDF文件已提取文本: {filename}, 页数: {len(pdf.pages)}")
            except Exception as e:
                app_logger.error(f"PDF提取失败: {e}")
                result["content_text"] = f"[无法读取PDF内容: {filename}]"
        
        # Word文件：提取文本（需要python-docx）
        elif file_type == 'docx':
            try:
                from docx import Document
                doc = Document(file_path)
                paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
                result["content_text"] = "\n\n".join(paragraphs)
                app_logger.info(f"Word文件已提取文本: {filename}, 段落数: {len(paragraphs)}")
            except Exception as e:
                app_logger.error(f"Word提取失败: {e}")
                result["content_text"] = f"[无法读取Word内容: {filename}]"
        
        else:
            app_logger.warning(f"不支持的文件类型: {file_type}")
            result["content_text"] = f"[不支持的文件类型: {file_type}]"
    
    except Exception as e:
        app_logger.error(f"文件处理失败 ({filename}): {e}")
        result["content_text"] = f"[文件处理失败: {filename}]"
    
    return result

def format_file_content_for_prompt(processed_files: list) -> str:
    """
    将处理后的文件内容格式化为提示词
    
    Args:
        processed_files: 处理后的文件列表
    
    Returns:
        格式化后的文件内容字符串
    """
    if not processed_files:
        return ""
    
    content_parts = ["\n\n【附件内容】"]
    
    for file_info in processed_files:
        filename = file_info.get("filename", "未知文件")
        file_type = file_info.get("file_type", "")
        
        # 图片文件
        if file_info.get("image_base64"):
            content_parts.append(f"\n📷 图片: {filename}")
            content_parts.append("（请根据用户的问题分析图片内容）")
        
        # 文本内容
        elif file_info.get("content_text"):
            text = file_info["content_text"]
            # 限制文本长度，避免超出上下文限制
            max_length = 5000
            if len(text) > max_length:
                text = text[:max_length] + f"\n\n[文档过长，已截取前{max_length}字符]"
            
            content_parts.append(f"\n📄 文档: {filename}")
            content_parts.append(f"```\n{text}\n```")
    
    return "\n".join(content_parts)

