import sys
from contextlib import asynccontextmanager

from alembic.command import upgrade
from alembic.config import Config
from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from starlette.responses import JSONResponse

from backend.complex.auth.auth_util import verify_and_get_user
from backend.complex.config.inventory import AppSettings
from backend.complex.config.request_context import RequestContext
from backend.complex.constants.auth_whitelist import AuthWhitelist
from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.response.result import Result
from backend.complex.runtime_tasks import start_runtime_tasks, stop_runtime_tasks

# 日志配置
logger.remove()
logger.add(
    sys.stderr,
    level=AppSettings.LOG_LEVEL,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | "
    "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
)


def run_migrations():
    try:
        cfg = Config("alembic.ini")
        upgrade(cfg, "head")
        logger.info("Migrations completed.")
    except Exception as e:
        logger.error(f"Migration failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    run_migrations()
    runtime_tasks = start_runtime_tasks()
    app.state.runtime_tasks = runtime_tasks
    logger.info("Application started.")
    yield
    await stop_runtime_tasks(runtime_tasks)
    logger.info("Application shutting down.")


def create_app() -> FastAPI:
    app = FastAPI(title=AppSettings.APP_NAME, lifespan=lifespan)

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    # 全局异常处理
    @app.exception_handler(CustomException)
    async def custom_exception_handler(request: Request, exc: CustomException):
        return JSONResponse(
            status_code=exc.result_code.code,
            content=Result(
                success=False, code=exc.result_code.code, message=exc.message
            ).model_dump(),
        )

    @app.exception_handler(Exception)
    async def all_exception_handler(request: Request, exc: Exception):
        logger.exception(exc)
        return JSONResponse(
            status_code=500,
            content=Result(
                success=False,
                code=ResultCode.SYSTEM_INNER_ERROR.code,
                message=str(exc),
            ).model_dump(),
        )

    # 注册路由
    _register_routers(app)

    return app


def _register_routers(app: FastAPI):
    """自动扫描 backend/api/ 下所有 APIRouter 并注册"""
    import importlib
    import pkgutil

    import backend.api as api_pkg

    for _, name, _ in pkgutil.walk_packages(api_pkg.__path__, api_pkg.__name__ + "."):
        try:
            module = importlib.import_module(name)
            for attr_name in dir(module):
                obj = getattr(module, attr_name)
                if isinstance(obj, APIRouter):
                    app.include_router(obj)
                    logger.info(f"Registered router: {name}")
        except Exception as e:
            logger.error(f"Failed to register router {name}: {e}")


app = create_app()


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if AuthWhitelist.is_whitelisted(request.url.path):
        try:
            return await call_next(request)
        finally:
            RequestContext.clear()

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return JSONResponse(
            status_code=401,
            content={"success": False, "code": 401, "message": "Missing token"},
        )

    token = auth_header.split(" ", 1)[1]
    user = verify_and_get_user(token)
    if not user:
        return JSONResponse(
            status_code=401,
            content={"success": False, "code": 401, "message": "Invalid token"},
        )

    RequestContext.set_current_user(user)
    try:
        return await call_next(request)
    finally:
        RequestContext.clear()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
