"""
Prometheus metrics for monitoring
"""
import time
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
from datetime import datetime

logger = logging.getLogger(__name__)


class MetricsCollector:
    """Collect metrics for Prometheus"""

    def __init__(self):
        self.request_count = defaultdict(int)
        self.request_duration = defaultdict(list)
        self.error_count = defaultdict(int)
        self.active_requests = 0
        self.celery_task_count = defaultdict(int)
        self.celery_task_duration = defaultdict(list)
        self.db_query_count = 0
        self.cache_hits = 0
        self.cache_misses = 0

    def record_request(self, method: str, path: str, status_code: int, duration: float):
        """Record HTTP request metrics"""
        key = f"{method}_{path}_{status_code}"
        self.request_count[key] += 1
        self.request_duration[key].append(duration)

        if status_code >= 400:
            error_key = f"{method}_{path}"
            self.error_count[error_key] += 1

    def record_celery_task(self, task_name: str, duration: float, status: str):
        """Record Celery task metrics"""
        key = f"{task_name}_{status}"
        self.celery_task_count[key] += 1
        self.celery_task_duration[key].append(duration)

    def get_prometheus_metrics(self) -> str:
        """
        Generate Prometheus metrics in text format

        Returns:
            Prometheus-formatted metrics string
        """
        lines = []

        # API Request metrics
        lines.append("# HELP http_requests_total Total number of HTTP requests")
        lines.append("# TYPE http_requests_total counter")
        for key, count in self.request_count.items():
            method, path, status = key.rsplit('_', 2)
            lines.append(f'http_requests_total{{method="{method}",path="{path}",status="{status}"}} {count}')

        # Request duration metrics
        lines.append("\n# HELP http_request_duration_seconds HTTP request duration in seconds")
        lines.append("# TYPE http_request_duration_seconds histogram")
        for key, durations in self.request_duration.items():
            if durations:
                method, path, status = key.rsplit('_', 2)
                avg_duration = sum(durations) / len(durations)
                max_duration = max(durations)
                min_duration = min(durations)
                lines.append(f'http_request_duration_seconds_sum{{method="{method}",path="{path}"}} {sum(durations)}')
                lines.append(f'http_request_duration_seconds_count{{method="{method}",path="{path}"}} {len(durations)}')
                lines.append(f'http_request_duration_seconds_avg{{method="{method}",path="{path}"}} {avg_duration}')

        # Error rate metrics
        lines.append("\n# HELP http_errors_total Total number of HTTP errors")
        lines.append("# TYPE http_errors_total counter")
        for key, count in self.error_count.items():
            method, path = key.split('_', 1)
            lines.append(f'http_errors_total{{method="{method}",path="{path}"}} {count}')

        # Active requests
        lines.append("\n# HELP http_requests_active Currently active HTTP requests")
        lines.append("# TYPE http_requests_active gauge")
        lines.append(f"http_requests_active {self.active_requests}")

        # Celery task metrics
        lines.append("\n# HELP celery_tasks_total Total number of Celery tasks")
        lines.append("# TYPE celery_tasks_total counter")
        for key, count in self.celery_task_count.items():
            task_name, status = key.rsplit('_', 1)
            lines.append(f'celery_tasks_total{{task="{task_name}",status="{status}"}} {count}')

        # Celery task duration
        lines.append("\n# HELP celery_task_duration_seconds Celery task duration in seconds")
        lines.append("# TYPE celery_task_duration_seconds histogram")
        for key, durations in self.celery_task_duration.items():
            if durations:
                task_name, status = key.rsplit('_', 1)
                lines.append(f'celery_task_duration_seconds_sum{{task="{task_name}"}} {sum(durations)}')
                lines.append(f'celery_task_duration_seconds_count{{task="{task_name}"}} {len(durations)}')

        # Database query count
        lines.append("\n# HELP database_queries_total Total number of database queries")
        lines.append("# TYPE database_queries_total counter")
        lines.append(f"database_queries_total {self.db_query_count}")

        # Cache metrics
        lines.append("\n# HELP cache_hits_total Total number of cache hits")
        lines.append("# TYPE cache_hits_total counter")
        lines.append(f"cache_hits_total {self.cache_hits}")

        lines.append("\n# HELP cache_misses_total Total number of cache misses")
        lines.append("# TYPE cache_misses_total counter")
        lines.append(f"cache_misses_total {self.cache_misses}")

        # System info
        lines.append("\n# HELP system_info System information")
        lines.append("# TYPE system_info gauge")
        lines.append(f'system_info{{version="1.0.0",environment="production"}} 1')

        return "\n".join(lines)


# Global metrics collector
metrics_collector = MetricsCollector()


class MetricsMiddleware(BaseHTTPMiddleware):
    """Middleware to collect request metrics"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip metrics endpoint itself
        if request.url.path == "/metrics":
            return await call_next(request)

        metrics_collector.active_requests += 1
        start_time = time.time()

        try:
            response = await call_next(request)
            duration = time.time() - start_time

            # Record metrics
            path = request.url.path
            # Simplify path (remove IDs)
            if any(char.isdigit() for char in path):
                path = "/".join([
                    segment if not any(char.isdigit() for char in segment) else "{id}"
                    for segment in path.split("/")
                ])

            metrics_collector.record_request(
                request.method,
                path,
                response.status_code,
                duration
            )

            return response

        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"Request failed: {str(e)}")

            metrics_collector.record_request(
                request.method,
                request.url.path,
                500,
                duration
            )
            raise

        finally:
            metrics_collector.active_requests -= 1
