"""
数据库管理模块
"""
import json
import asyncio
import aiofiles
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any
from dataclasses import asdict
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)

class DatabaseManager:
    """数据库管理器"""
    
    def __init__(self, db_file: str = "chat_sessions.json"):
        self.db_file = Path(db_file)
        self._lock = asyncio.Lock()
        self._cache: Optional[List[ChatSession]] = None
        self._cache_time: Optional[datetime] = None
        self._cache_ttl = 300  # 5分钟缓存
    
    async def _ensure_file_exists(self):
        """确保数据库文件存在"""
        if not self.db_file.exists():
            await self._write_data([])
    
    async def _read_data(self) -> List[Dict[str, Any]]:
        """读取原始数据"""
        await self._ensure_file_exists()
        
        try:
            async with aiofiles.open(self.db_file, 'r', encoding='utf-8') as f:
                content = await f.read()
                return json.loads(content) if content.strip() else []
        except json.JSONDecodeError as e:
            logger.error(f"JSON解析错误: {e}")
            # 备份损坏的文件
            backup_file = self.db_file.with_suffix(f'.backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json')
            self.db_file.rename(backup_file)
            logger.info(f"已备份损坏文件到: {backup_file}")
            return []
        except Exception as e:
            logger.error(f"读取数据失败: {e}")
            return []
    
    async def _write_data(self, data: List[Dict[str, Any]]):
        """写入数据"""
        try:
            # 先写入临时文件
            temp_file = self.db_file.with_suffix('.tmp')
            async with aiofiles.open(temp_file, 'w', encoding='utf-8') as f:
                await f.write(json.dumps(data, ensure_ascii=False, indent=2, default=str))
            
            # 原子性替换
            temp_file.replace(self.db_file)
            logger.debug(f"数据写入成功: {len(data)} 条记录")
            
        except Exception as e:
            logger.error(f"写入数据失败: {e}")
            raise
    
    def _is_cache_valid(self) -> bool:
        """检查缓存是否有效"""
        if self._cache is None or self._cache_time is None:
            return False
        
        return (datetime.now() - self._cache_time).total_seconds() < self._cache_ttl
    
    async def load_sessions(self) -> List[Dict[str, Any]]:
        """加载会话列表"""
        async with self._lock:
            if self._is_cache_valid():
                logger.debug("使用缓存数据")
                return self._cache.copy()
            
            try:
                data = await self._read_data()
                
                # 更新缓存
                self._cache = data
                self._cache_time = datetime.now()
                
                logger.info(f"加载了 {len(data)} 个会话")
                return data
                
            except Exception as e:
                logger.error(f"加载会话失败: {e}")
                return []
    
    async def save_sessions(self, sessions: List[Dict[str, Any]]):
        """保存会话列表"""
        async with self._lock:
            try:
                await self._write_data(sessions)
                
                # 更新缓存
                self._cache = sessions.copy()
                self._cache_time = datetime.now()
                
                logger.info(f"保存了 {len(sessions)} 个会话")
                
            except Exception as e:
                logger.error(f"保存会话失败: {e}")
                raise
    
    async def get_session_by_id(self, session_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取会话"""
        sessions = await self.load_sessions()
        for session in sessions:
            if session.get('id') == session_id:
                return session
        return None
    
    async def update_session(self, session: Dict[str, Any]):
        """更新单个会话"""
        sessions = await self.load_sessions()
        for i, s in enumerate(sessions):
            if s.get('id') == session.get('id'):
                sessions[i] = session
                await self.save_sessions(sessions)
                return
        
        # 如果不存在，添加新会话
        sessions.append(session)
        await self.save_sessions(sessions)
    
    async def delete_session(self, session_id: str) -> bool:
        """删除会话"""
        sessions = await self.load_sessions()
        original_count = len(sessions)
        sessions = [s for s in sessions if s.get('id') != session_id]
        
        if len(sessions) < original_count:
            await self.save_sessions(sessions)
            logger.info(f"删除会话: {session_id}")
            return True
        return False
    
    async def cleanup_old_sessions(self, days: int = 30):
        """清理旧会话"""
        sessions = await self.load_sessions()
        cutoff_date = datetime.now() - timedelta(days=days)
        
        active_sessions = []
        for s in sessions:
            updated_at = s.get('updated_at')
            if updated_at:
                if isinstance(updated_at, str):
                    try:
                        updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
                    except:
                        continue
                if updated_at > cutoff_date:
                    active_sessions.append(s)
        
        if len(active_sessions) < len(sessions):
            await self.save_sessions(active_sessions)
            removed_count = len(sessions) - len(active_sessions)
            logger.info(f"清理了 {removed_count} 个旧会话")
    
    def invalidate_cache(self):
        """使缓存失效"""
        self._cache = None
        self._cache_time = None

# 全局数据库管理器
db_manager = DatabaseManager()
