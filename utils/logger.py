"""
日志配置模块
"""
import logging
import sys
from datetime import datetime
from pathlib import Path
from config import config

def setup_logging():
    """设置日志配置"""
    
    # 创建logs目录
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # 日志格式
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # 根日志器配置
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG if config.DEBUG else logging.INFO)
    
    # 清除已有的处理器，避免重复添加
    if root_logger.handlers:
        root_logger.handlers.clear()
    
    # 控制台处理器
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)
    
    # 文件处理器
    today = datetime.now().strftime("%Y-%m-%d")
    file_handler = logging.FileHandler(
        log_dir / f"app_{today}.log",
        encoding='utf-8'
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.DEBUG)
    
    # 错误文件处理器
    error_handler = logging.FileHandler(
        log_dir / f"error_{today}.log",
        encoding='utf-8'
    )
    error_handler.setFormatter(formatter)
    error_handler.setLevel(logging.ERROR)
    
    # 添加处理器到根日志器
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(error_handler)
    
    # 第三方库日志级别
    logging.getLogger("openai").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    
    return root_logger

# 应用日志器
app_logger = logging.getLogger("multi_agent_chat")

