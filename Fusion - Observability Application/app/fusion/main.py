import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from .api.v1 import admin, auth, health, items
from .core import cache, db
from .core.config import settings
from .core.logging import configure_logging
from .core.metrics import APP_INFO
from .core.security import hash_password
from .middleware.context import RequestContextMiddleware
from .middleware.instrumented_route import InstrumentedRoute
from .middleware.rate_limit import RateLimitMiddleware
from .models import Base, User

configure_logging(settings.log_level)
log = logging.getLogger("fusion.app")


async def _bootstrap_db():
    from sqlalchemy import select
    async with db.engine().begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with db.session_factory()() as s:
        existing = (await s.execute(
            select(User).where(User.username == settings.bootstrap_admin_user)
        )).scalar_one_or_none()
        if existing is None:
            s.add(User(username=settings.bootstrap_admin_user,
                       hashed_password=hash_password(settings.bootstrap_admin_password),
                       scopes="read,write,admin"))
            await s.commit()
            log.info("bootstrap_admin_created",
                     extra={"user": settings.bootstrap_admin_user})


@asynccontextmanager
async def lifespan(_):
    APP_INFO.info({"name": settings.app_name, "version": settings.version,
                   "environment": settings.environment})
    try:
        await _bootstrap_db()
    except Exception:
        log.exception("bootstrap_db_failed")
    log.info("application_startup", extra={"version": settings.version})
    try:
        yield
    finally:
        await cache.close()
        await db.dispose()
        log.info("application_shutdown")


app = FastAPI(title="Fusion Metrics", version=settings.version, lifespan=lifespan)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(RateLimitMiddleware)

for mod in (health, auth, items, admin):
    mod.router.route_class = InstrumentedRoute

app.include_router(health.router)
app.include_router(auth.router,  prefix="/api/v1")
app.include_router(items.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")


@app.get("/", include_in_schema=False)
async def root():
    return {"service": settings.app_name, "version": settings.version}


@app.get("/metrics", include_in_schema=False)
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
