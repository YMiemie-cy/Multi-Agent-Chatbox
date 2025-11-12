"""
配置管理模块
"""
import os
from typing import Optional

class Config:
    """应用配置类"""
    
    # API配置
    POE_API_KEY: str = os.getenv("POE_API_KEY", "")
    POE_BASE_URL: str = os.getenv("POE_BASE_URL", "https://api.poe.com/v1")
    
    # 服务器配置
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # 文件配置
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", str(10 * 1024 * 1024)))  # 10MB
    SESSIONS_FILE: str = os.getenv("SESSIONS_FILE", "chat_sessions.json")
    
    # 模型配置
    DEFAULT_MAX_TOKENS: int = int(os.getenv("DEFAULT_MAX_TOKENS", "4000"))
    DEFAULT_TEMPERATURE: float = float(os.getenv("DEFAULT_TEMPERATURE", "0.3"))
    
    # 重试配置
    MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", "3"))
    RETRY_DELAY: float = float(os.getenv("RETRY_DELAY", "2.0"))
    
    # 限流配置
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
    RATE_LIMIT_WINDOW: int = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # 秒
    
    @classmethod
    def validate(cls) -> bool:
        """验证配置是否有效"""
        if not cls.POE_API_KEY:
            raise ValueError("POE_API_KEY is required")
        return True

# 全局配置实例
config = Config()

