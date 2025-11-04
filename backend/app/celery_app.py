"""Celery application configuration"""
from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

# Optional Sentry initialization for Celery workers
try:
    if settings.SENTRY_DSN:
        import sentry_sdk
        from sentry_sdk.integrations.celery import CeleryIntegration

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            integrations=[CeleryIntegration()],
            traces_sample_rate=0.1 if settings.DEBUG else 0.02,
            profiles_sample_rate=0.0,
            environment="development" if settings.DEBUG else "production",
            release=settings.VERSION,
        )
except Exception as e:
    # Do not crash workers if Sentry isn't configured correctly
    pass

# Create Celery instance
celery_app = Celery(
    "hass",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.discharge",
        "app.tasks.notifications",
        "app.tasks.send_notifications",  # Notification sending tasks
        "app.tasks.lab",
        "app.tasks.vitals_monitoring",
        "app.tasks.inventory",
    ],
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    result_expires=3600,  # 1 hour
)

# Periodic tasks (Celery Beat schedule)
celery_app.conf.beat_schedule = {
    'monitor-vitals-every-5-minutes': {
        'task': 'app.tasks.vitals_monitoring.monitor_vitals',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
    },
    'send-pending-notifications-every-minute': {
        'task': 'send_pending_notifications',
        'schedule': crontab(minute='*/1'),  # Every 1 minute (backup for failed immediate sends)
    },
    'cleanup-old-notifications-daily': {
        'task': 'cleanup_old_notifications',
        'schedule': crontab(hour=2, minute=0),  # Every day at 2 AM
        'kwargs': {'days_old': 30},
    },
    'inventory-low-stock-hourly': {
        'task': 'inventory_check_low_stock',
        'schedule': crontab(minute='0'),  # Every hour at :00
        'kwargs': {'threshold': 10},
    },
    'inventory-expiring-daily': {
        'task': 'inventory_check_expiring',
        'schedule': crontab(hour=3, minute=0),  # Daily at 3 AM
        'kwargs': {'days': 30},
    },
}

if __name__ == "__main__":
    celery_app.start()
