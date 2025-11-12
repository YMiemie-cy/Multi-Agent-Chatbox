"""
性能监控模块
"""
import time
import asyncio
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)

@dataclass
class RequestMetric:
    """请求指标"""
    timestamp: datetime
    endpoint: str
    method: str
    status_code: int
    response_time: float
    agent_name: Optional[str] = None
    model_name: Optional[str] = None
    tokens_used: Optional[int] = None

@dataclass
class SystemMetrics:
    """系统指标"""
    active_sessions: int = 0
    total_requests: int = 0
    avg_response_time: float = 0.0
    error_rate: float = 0.0
    api_calls_today: int = 0
    tokens_used_today: int = 0
    last_updated: datetime = field(default_factory=datetime.now)

class MetricsCollector:
    """指标收集器"""
    
    def __init__(self, max_metrics: int = 10000):
        self.max_metrics = max_metrics
        self.metrics: List[RequestMetric] = []
        self.system_metrics = SystemMetrics()
        self._lock = asyncio.Lock()
    
    async def record_request(
        self,
        endpoint: str,
        method: str,
        status_code: int,
        response_time: float,
        agent_name: Optional[str] = None,
        model_name: Optional[str] = None,
        tokens_used: Optional[int] = None
    ):
        """记录请求指标"""
        async with self._lock:
            metric = RequestMetric(
                timestamp=datetime.now(),
                endpoint=endpoint,
                method=method,
                status_code=status_code,
                response_time=response_time,
                agent_name=agent_name,
                model_name=model_name,
                tokens_used=tokens_used
            )
            
            self.metrics.append(metric)
            
            # 保持指标数量在限制内
            if len(self.metrics) > self.max_metrics:
                self.metrics = self.metrics[-self.max_metrics:]
            
            # 更新系统指标
            await self._update_system_metrics()
    
    async def _update_system_metrics(self):
        """更新系统指标"""
        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # 今天的指标
        today_metrics = [
            m for m in self.metrics 
            if m.timestamp >= today_start
        ]
        
        if today_metrics:
            # 平均响应时间
            self.system_metrics.avg_response_time = sum(
                m.response_time for m in today_metrics
            ) / len(today_metrics)
            
            # 错误率
            error_count = sum(1 for m in today_metrics if m.status_code >= 400)
            self.system_metrics.error_rate = error_count / len(today_metrics)
            
            # API调用次数
            self.system_metrics.api_calls_today = len([
                m for m in today_metrics 
                if m.endpoint.startswith('/api/')
            ])
            
            # Token使用量
            self.system_metrics.tokens_used_today = sum(
                m.tokens_used or 0 for m in today_metrics
            )
        
        self.system_metrics.total_requests = len(self.metrics)
        self.system_metrics.last_updated = now
    
    async def get_metrics_summary(self, hours: int = 24) -> Dict:
        """获取指标摘要"""
        async with self._lock:
            cutoff = datetime.now() - timedelta(hours=hours)
            recent_metrics = [m for m in self.metrics if m.timestamp >= cutoff]
            
            if not recent_metrics:
                return {"message": "没有最近的指标数据"}
            
            # 按端点统计
            endpoint_stats = {}
            for metric in recent_metrics:
                if metric.endpoint not in endpoint_stats:
                    endpoint_stats[metric.endpoint] = {
                        "count": 0,
                        "avg_response_time": 0.0,
                        "error_count": 0
                    }
                
                stats = endpoint_stats[metric.endpoint]
                stats["count"] += 1
                stats["avg_response_time"] += metric.response_time
                if metric.status_code >= 400:
                    stats["error_count"] += 1
            
            # 计算平均值
            for stats in endpoint_stats.values():
                if stats["count"] > 0:
                    stats["avg_response_time"] /= stats["count"]
                    stats["error_rate"] = stats["error_count"] / stats["count"]
            
            # Agent使用统计
            agent_stats = {}
            for metric in recent_metrics:
                if metric.agent_name:
                    if metric.agent_name not in agent_stats:
                        agent_stats[metric.agent_name] = {
                            "calls": 0,
                            "avg_response_time": 0.0,
                            "tokens_used": 0
                        }
                    
                    stats = agent_stats[metric.agent_name]
                    stats["calls"] += 1
                    stats["avg_response_time"] += metric.response_time
                    stats["tokens_used"] += metric.tokens_used or 0
            
            # 计算Agent平均值
            for stats in agent_stats.values():
                if stats["calls"] > 0:
                    stats["avg_response_time"] /= stats["calls"]
            
            return {
                "system_metrics": self.system_metrics.__dict__,
                "endpoint_stats": endpoint_stats,
                "agent_stats": agent_stats,
                "total_metrics": len(recent_metrics),
                "time_range_hours": hours
            }
    
    async def get_health_status(self) -> Dict:
        """获取健康状态"""
        now = datetime.now()
        recent_metrics = [
            m for m in self.metrics 
            if m.timestamp >= now - timedelta(minutes=5)
        ]
        
        if not recent_metrics:
            return {"status": "unknown", "message": "没有最近的请求数据"}
        
        error_count = sum(1 for m in recent_metrics if m.status_code >= 500)
        error_rate = error_count / len(recent_metrics)
        
        avg_response_time = sum(m.response_time for m in recent_metrics) / len(recent_metrics)
        
        # 健康状态判断
        if error_rate > 0.1:  # 错误率超过10%
            status = "unhealthy"
        elif avg_response_time > 10.0:  # 平均响应时间超过10秒
            status = "degraded"
        else:
            status = "healthy"
        
        return {
            "status": status,
            "error_rate": error_rate,
            "avg_response_time": avg_response_time,
            "recent_requests": len(recent_metrics),
            "last_check": now.isoformat()
        }

# 全局指标收集器
metrics_collector = MetricsCollector()

def timing_middleware(func):
    """计时装饰器"""
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            response_time = time.time() - start_time
            
            # 记录成功请求
            await metrics_collector.record_request(
                endpoint=getattr(func, '__name__', 'unknown'),
                method='POST',
                status_code=200,
                response_time=response_time
            )
            
            return result
            
        except Exception as e:
            response_time = time.time() - start_time
            
            # 记录失败请求
            await metrics_collector.record_request(
                endpoint=getattr(func, '__name__', 'unknown'),
                method='POST',
                status_code=500,
                response_time=response_time
            )
            
            raise e
    
    return wrapper

