# AI 模拟面试 · 运营管理后台

独立的 React + TypeScript + Vite 管理端，复用 `/Users/huichao/PycharmProjects/AI_Interview` 的 FastAPI 业务服务。依据两份 V1.0 PDF 实现运营、用户、面试审阅、质检、商品、财务、支付配置、AI 成本及系统管理。

## 启动

```sh
npm install
npm run dev
```

访问 http://127.0.0.1:5174 。Vite 默认代理至 http://127.0.0.1:8000；可在 `.env.local` 设置 `API_PROXY_TARGET`。管理员会话仅保存在内存，刷新页面需要重新登录。后端普通求职者 token 无法用于后台。

后端安装管台接口后，在后端目录执行：

```sh
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m scripts.admin_cli
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

初始管理员默认账号 `admin`，随机密码写入后端 `var/admin-bootstrap.json`，文件权限为 `0600`，不提交 Git。第一期只需一个有相应权限的管理员，商品发布、权益补发、退款和支付配置直接执行。生产环境使用 `--enable-mfa` 并配置现有后端要求的生产环境变量。

## 测试与接口

```sh
npm run build
npm run test:e2e
npm run api:generate
```

浏览器测试启动独立的 FastAPI/SQLite/mock AI fixture（8011）及 Vite（5174），通过真实 HTTP 测试，不连接生产业务库。设置 `BACKEND_PYTHON`、`ADMIN_BACKEND_PATH` 可覆盖 Python 和后端目录；`PLAYWRIGHT_CHROME_PATH` 指定 Chrome 路径。默认使用已安装后端，`ADMIN_BACKEND_PATH` 可指向独立开发副本。浏览器测试使用独立端口 5194，与日常开发端口 5174 分离。

[实施记录与范围](docs/implementation.md) · [OpenAPI 快照](docs/openapi.json)。生成的 TypeScript 声明位于 `src/generated/api.d.ts`。部署使用 `npm run build` 生成的 `dist/`；同源反向代理 `/api`，SPA 路由需回退至 `index.html`。示例见 `deploy/nginx.conf`。

## 当前边界

- 微信/支付宝支持配置、加密存储、直接保存及配置存在性校验；真实渠道支付、验签、退款与自动拉单未接入。现有开发模拟支付/退款保留，生产环境禁止模拟入账。
- 月/季/年商品当前为一次性额度包；有效期可配置，但周期重置、额度到期回收、自动续费未实现，页面明确提示。
- AI 运营展示已配置模型及调用成本，在线模型配置发布、预算告警通知、大范围异步导出与压测待后续完成。
- 媒体短时授权要求权限、用户当前 `SUPPORT_REVIEW` 同意、资源分派及保留期限；不会由后台替用户同意。

商品按文字、语音、视频分别配置次数，可发布 3 次文字 + 2 次语音 + 1 次视频等组合。用户详情显示分类及历史通用余额，补发时选择面试类型；订单管理显示购买时的组合快照。后端需迁移到 b72e4f6d9102，历史通用权益保留兼容。

新增“推广中心”，支持按文字/语音/视频配置邀请人和受邀人奖励、每 N 人奖励门槛、推广链接与佣金比例、订单佣金应计和退款冲销台账。后端需迁移至 c83f5a7e0203。佣金模块不执行真实资金转账。

## 文件存储

系统管理新增「文件存储」页，从后端读取当前存储类型、OSS Bucket/地域及角色 ARN；可手动检查 STS 与私有 Bucket。页面不读取或展示密钥，配置仍在后端环境中维护。权限策略和 CORS 见后端 `docs/oss-storage.md`。
