"""Redis caching layer for performance optimization"""
import redis
import json
import hashlib
from typing import Optional, Any, Callable
from functools import wraps
import pickle

from app.core.config import settings


class CacheManager:
    """Redis-based caching manager"""

    def __init__(self):
        """Initialize Redis connection - MAXIMUM PERFORMANCE"""
        self.redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=False,  # Use binary for pickle
            max_connections=500,      # 10x increase for high concurrency
            socket_keepalive=True,
            socket_timeout=2,         # Faster timeout
            socket_connect_timeout=2,
            retry_on_timeout=True,
            health_check_interval=30,
        )

    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate cache key from function name and arguments"""
        key_data = f"{prefix}:{str(args)}:{str(sorted(kwargs.items()))}"
        key_hash = hashlib.md5(key_data.encode()).hexdigest()
        return f"cache:{prefix}:{key_hash}"

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            cached = self.redis_client.get(key)
            if cached:
                return pickle.loads(cached)
        except Exception as e:
            print(f"Cache get error: {e}")
        return None

    def set(self, key: str, value: Any, ttl: int = 300):
        """Set value in cache with TTL"""
        try:
            serialized = pickle.dumps(value)
            self.redis_client.setex(key, ttl, serialized)
        except Exception as e:
            print(f"Cache set error: {e}")

    def delete(self, key: str):
        """Delete key from cache"""
        try:
            self.redis_client.delete(key)
        except Exception as e:
            print(f"Cache delete error: {e}")

    def delete_pattern(self, pattern: str):
        """Delete all keys matching pattern"""
        try:
            keys = self.redis_client.keys(f"cache:{pattern}:*")
            if keys:
                self.redis_client.delete(*keys)
        except Exception as e:
            print(f"Cache delete pattern error: {e}")

    def clear_all(self):
        """Clear all cache (use with caution)"""
        try:
            keys = self.redis_client.keys("cache:*")
            if keys:
                self.redis_client.delete(*keys)
        except Exception as e:
            print(f"Cache clear error: {e}")


# Global cache manager instance
cache = CacheManager()


def cache_result(ttl: int = 300, prefix: Optional[str] = None):
    """
    Decorator to cache function results.

    Args:
        ttl: Time to live in seconds (default 5 minutes)
        prefix: Custom cache key prefix (defaults to function name)

    Usage:
        @cache_result(ttl=60)
        def get_dashboard_metrics(hospital_id: str):
            # expensive operation
            return metrics
    """
    def decorator(func: Callable) -> Callable:
        cache_prefix = prefix or func.__name__

        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = cache._generate_key(cache_prefix, *args, **kwargs)

            # Try to get from cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value

            # Execute function
            result = func(*args, **kwargs)

            # Store in cache
            cache.set(cache_key, result, ttl)

            return result

        return wrapper
    return decorator


def cache_result_async(ttl: int = 300, prefix: Optional[str] = None):
    """
    Async version of cache_result decorator.

    Usage:
        @cache_result_async(ttl=60)
        async def get_dashboard_metrics(hospital_id: str):
            # expensive async operation
            return metrics
    """
    def decorator(func: Callable) -> Callable:
        cache_prefix = prefix or func.__name__

        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = cache._generate_key(cache_prefix, *args, **kwargs)

            # Try to get from cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value

            # Execute async function
            result = await func(*args, **kwargs)

            # Store in cache
            cache.set(cache_key, result, ttl)

            return result

        return wrapper
    return decorator


def invalidate_cache(prefix: str):
    """
    Invalidate all cache entries for a given prefix.

    Usage:
        invalidate_cache('get_dashboard_metrics')
    """
    cache.delete_pattern(prefix)


# Common cache invalidation helpers
def invalidate_patient_cache(patient_id: str):
    """Invalidate all cache for a patient"""
    cache.delete_pattern(f"*patient*{patient_id}*")


def invalidate_hospital_cache(hospital_id: str):
    """Invalidate all cache for a hospital"""
    cache.delete_pattern(f"*hospital*{hospital_id}*")


def invalidate_user_cache(user_id: str):
    """Invalidate all cache for a user"""
    cache.delete_pattern(f"*user*{user_id}*")


# Pre-configured cache decorators for common use cases
def cache_dashboard_metrics(ttl: int = 60):
    """Cache dashboard metrics for 1 minute"""
    return cache_result(ttl=ttl, prefix="dashboard_metrics")


def cache_patient_data(ttl: int = 300):
    """Cache patient data for 5 minutes"""
    return cache_result(ttl=ttl, prefix="patient_data")


def cache_kpi_data(ttl: int = 120):
    """Cache KPI data for 2 minutes"""
    return cache_result(ttl=ttl, prefix="kpi_data")


# Example usage in API endpoints:
"""
from app.core.cache import cache_dashboard_metrics, invalidate_hospital_cache

@cache_dashboard_metrics(ttl=60)
def get_hospital_metrics(hospital_id: str, db: Session):
    # Expensive query
    metrics = db.query(...).filter(...).all()
    return metrics

# When data changes, invalidate cache
def update_patient(patient_id: str, db: Session):
    # Update patient
    db.commit()
    # Invalidate cache
    invalidate_hospital_cache(patient.hospital_id)
"""
