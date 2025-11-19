"""
API客户端工具模块
"""
import asyncio
import logging
from typing import Dict, List, Optional, Tuple
import openai
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from config import config

logger = logging.getLogger(__name__)

class APIError(Exception):
    """API错误基类"""
    pass

class APIRateLimitError(APIError):
    """API限流错误"""
    pass

class APIAuthError(APIError):
    """API认证错误"""
    pass

class EnhancedPoeClient:
    """增强的Poe API客户端"""
    
    def __init__(self):
        self.client = openai.OpenAI(
            api_key=config.POE_API_KEY,
            base_url=config.POE_BASE_URL,
        )
        self._request_count = 0
        self._last_reset = asyncio.get_event_loop().time()
    
    def _check_rate_limit(self):
        """检查请求限流"""
        current_time = asyncio.get_event_loop().time()
        
        # 重置计数器
        if current_time - self._last_reset > config.RATE_LIMIT_WINDOW:
            self._request_count = 0
            self._last_reset = current_time
        
        if self._request_count >= config.RATE_LIMIT_REQUESTS:
            raise APIRateLimitError("请求频率过高，请稍后再试")
        
        self._request_count += 1
    
    async def stream_chat_completion(
        self,
        model: str,
        messages: List[Dict],
        max_tokens: int = None,
        temperature: float = None,
        **kwargs
    ):
        """流式聊天完成API调用"""
        try:
            self._check_rate_limit()
            
            logger.info(f"🔍 准备流式调用API: {model}")
            
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens or config.DEFAULT_MAX_TOKENS,
                temperature=temperature or config.DEFAULT_TEMPERATURE,
                stream=True,
                **kwargs
            )
            
            for chunk in response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
            
            logger.info(f"✅ 流式API调用完成: {model}")
            
        except Exception as e:
            logger.error(f"流式调用失败: {e}")
            raise APIError(f"流式请求失败: {e}")

    @retry(
        stop=stop_after_attempt(config.MAX_RETRIES),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((APIRateLimitError, ConnectionError))
    )
    async def chat_completion(
        self,
        model: str,
        messages: List[Dict],
        max_tokens: int = None,
        temperature: float = None,
        **kwargs
    ) -> str:
        """聊天完成API调用"""
        try:
            self._check_rate_limit()
            
            # 调试：记录消息结构
            logger.info(f"🔍 准备调用API: {model}")
            logger.info(f"🔍 消息数量: {len(messages)}")
            for i, msg in enumerate(messages):
                logger.info(f"🔍 消息 {i}: role={msg.get('role')}, content类型={type(msg.get('content'))}")
                if isinstance(msg.get('content'), list):
                    logger.info(f"🔍   多模态消息，包含 {len(msg['content'])} 个部分")
                    for j, part in enumerate(msg['content']):
                        part_type = part.get('type')
                        logger.info(f"🔍     部分 {j}: type={part_type}")
                        if part_type == 'image_url':
                            url = part.get('image_url', {}).get('url', '')
                            logger.info(f"🔍       图片URL前50字符: {url[:50]}")
                        elif part_type == 'text':
                            text = part.get('text', '')
                            logger.info(f"🔍       文本长度: {len(text)}, 前100字符: {text[:100]}")
            
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens or config.DEFAULT_MAX_TOKENS,
                temperature=temperature or config.DEFAULT_TEMPERATURE,
                stream=False,
                **kwargs
            )
            
            content = response.choices[0].message.content or ""
            logger.info(f"✅ API调用成功: {model}, 返回内容长度: {len(content)}")
            logger.info(f"✅ 返回内容前200字符: {content[:200]}")
            return content
            
        except openai.AuthenticationError as e:
            logger.error(f"API认证失败: {e}")
            raise APIAuthError("API密钥无效或过期")
            
        except openai.RateLimitError as e:
            logger.warning(f"API限流: {e}")
            raise APIRateLimitError("API请求频率超限")
            
        except openai.APIError as e:
            logger.error(f"API错误: {e}")
            if "403" in str(e):
                raise APIAuthError("API访问被拒绝，请检查密钥权限")
            raise APIError(f"API调用失败: {e}")
            
        except Exception as e:
            logger.error(f"未知错误: {e}")
            raise APIError(f"请求失败: {e}")
    
    async def health_check(self) -> bool:
        """API健康检查"""
        try:
            await self.chat_completion(
                model="GPT-4o",
                messages=[{"role": "user", "content": "test"}],
                max_tokens=10
            )
            return True
        except Exception as e:
            logger.error(f"健康检查失败: {e}")
            return False

# 全局客户端实例
poe_client = EnhancedPoeClient()

