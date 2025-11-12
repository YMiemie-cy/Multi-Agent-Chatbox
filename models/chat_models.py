"""
聊天模型定义
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Optional, Any
from pydantic import BaseModel

@dataclass
class FileAttachment:
    """文件附件"""
    id: str
    filename: str
    original_name: str
    file_type: str  # pdf, docx, txt, png, jpg, md
    file_size: int
    file_path: str
    content_text: Optional[str] = None  # 解析出的文本内容
    image_base64: Optional[str] = None  # 图片的base64编码（用于传给大模型）
    uploaded_at: datetime = field(default_factory=datetime.now)

@dataclass
class Message:
    """消息"""
    id: str
    role: str  # user, assistant, agent
    content: str
    agent_name: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)
    is_discussion: Optional[bool] = None  # 标记是否为讨论消息
    discussion_id: Optional[str] = None   # 讨论会话ID
    attachments: Optional[List[FileAttachment]] = None  # 文件附件

@dataclass
class ChatSession:
    """聊天会话"""
    id: str
    title: str
    messages: List[Message] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def add_message(self, message: Message):
        """添加消息"""
        self.messages.append(message)
        self.updated_at = datetime.now()
    
    def get_recent_messages(self, limit: int = 20) -> List[Message]:
        """获取最近的消息"""
        return self.messages[-limit:] if self.messages else []

# Pydantic模型（用于API）
class ChatRequest(BaseModel):
    message: str
    agent_name: Optional[str] = None
    session_id: Optional[str] = None
    file_ids: Optional[List[str]] = None  # 附加的文件ID列表

class DiscussionRequest(BaseModel):
    question: str
    rounds: int = 3
    include_summary: bool = True
    selected_agents: List[str] = []
    session_id: Optional[str] = None
    file_ids: Optional[List[str]] = None  # 讨论附件文件ID列表

class AgentConfig(BaseModel):
    """Agent配置"""
    name: str
    model: str
    system_prompt: str
    color: str
    type: Optional[str] = None  # search, normal

class Memory(BaseModel):
    """长期记忆"""
    id: str
    title: str
    content: str
    category: Optional[str] = "general"  # 分类：general, work, personal, knowledge等
    tags: Optional[List[str]] = []
    created_at: str
    updated_at: str
    importance: Optional[int] = 3  # 1-5, 重要程度

class MemoryCreateRequest(BaseModel):
    """创建记忆请求"""
    title: str
    content: str
    category: Optional[str] = "general"
    tags: Optional[List[str]] = []
    importance: Optional[int] = 3

class MemoryUpdateRequest(BaseModel):
    """更新记忆请求"""
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    importance: Optional[int] = None

