"""Isolated real FastAPI + SQLite fixture for browser tests. Never reads production .env."""
import os
import sys
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
backend=Path(os.environ.get('ADMIN_BACKEND_PATH', '/Users/huichao/PycharmProjects/AI_Interview'))
sys.path.insert(0,str(backend))
os.chdir(backend)
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import select
from app.core.config import Settings
from app.db.admin_models import AdminUser
from app.main import create_app
from app.modules.admin.auth import create_admin

runtime_path=Path(__file__).resolve().parents[1]/'.work/e2e'
runtime_path.mkdir(parents=True,exist_ok=True)
settings=Settings(_env_file=None,environment='test',database_url=f'sqlite:///{runtime_path}/admin-{os.getpid()}.db',redis_url=None,
                  task_mode='eager',storage_path=runtime_path/'objects',provider_mode='mock',rate_limit_per_minute=10000,
                  public_base_url='http://127.0.0.1:8011')
config=Config(str(backend/'alembic.ini'));config.attributes['database_url']=settings.database_url
command.upgrade(config,'head')
app=create_app(settings)
with app.state.runtime.db.session() as db:
    for name,role in [('admin','SUPER_ADMIN'),('finance','FINANCE')]:
        if not db.scalar(select(AdminUser).where(AdminUser.login_name==name)):
            create_admin(db,name,{'admin':'运营管理员','finance':'财务管理员'}[name],'Admin-e2e-password-2026',role)
with TestClient(app) as client:
    from tests.conftest import login,interview,data
    user,_=login(client,'admin-e2e-user')
    if not data(client.get('/api/v1/interviews',headers=user))['items']:
        interview(client,user)
    from app.db.models import Order
    from sqlalchemy import select
    with app.state.runtime.db.session() as db:
        existing_order = db.scalar(select(Order.id))
    if not existing_order:
        order = data(client.post('/api/v1/billing/orders',headers={**user,'Idempotency-Key':'e2e-order'},json={'product_code':'SINGLE'}))
        data(client.post('/api/v1/billing/orders/'+order['id']+'/dev-pay',headers={**user,'Idempotency-Key':'e2e-pay'}))
import uvicorn
uvicorn.run(app,host='127.0.0.1',port=8011)
