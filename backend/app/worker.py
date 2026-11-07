from celery import Celery

from app.core.config import settings

celery_app = Celery("ethnosynergy", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.task_routes = {"app.worker.*": {"queue": "default"}}


@celery_app.task(name="ping")
def ping() -> str:
    return "pong"
