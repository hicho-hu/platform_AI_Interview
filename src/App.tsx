import { lazy, Suspense, useEffect, useState } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  App as AntApp,
  Avatar,
  Button,
  Dropdown,
  Form,
  Input,
  Modal,
  Result,
  Spin,
  Tag,
} from "antd";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  AudioLines,
  Bot,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { api, can, roleLabels, useSession } from "./api";
import type { Admin } from "./api";
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const UsersPage = lazy(() =>
  import("./pages/Operations").then((m) => ({ default: m.UsersPage })),
);
const InterviewsPage = lazy(() =>
  import("./pages/Operations").then((m) => ({ default: m.InterviewsPage })),
);
const QualityPage = lazy(() =>
  import("./pages/Operations").then((m) => ({ default: m.QualityPage })),
);
const FinancePage = lazy(() =>
  import("./pages/Commerce").then((m) => ({ default: m.FinancePage })),
);
const ProductsPage = lazy(() =>
  import("./pages/Commerce").then((m) => ({ default: m.ProductsPage })),
);
const PaymentsPage = lazy(() =>
  import("./pages/Commerce").then((m) => ({ default: m.PaymentsPage })),
);
const AIPage = lazy(() =>
  import("./pages/System").then((m) => ({ default: m.AIPage })),
);
const SystemPage = lazy(() =>
  import("./pages/System").then((m) => ({ default: m.SystemPage })),
);
const GrowthPage = lazy(() => import("./pages/Growth"));
const nav = [
  {
    group: "工作空间",
    items: [
      {
        to: "/dashboard",
        name: "运营总览",
        en: "Overview",
        icon: LayoutDashboard,
        permission: "dashboard:read",
      },
      {
        to: "/users",
        name: "用户中心",
        en: "Users",
        icon: Users,
        permission: "user:read",
      },
      {
        to: "/interviews",
        name: "面试中心",
        en: "Interviews",
        icon: AudioLines,
        permission: "interview:read",
      },
      {
        to: "/quality",
        name: "质量抽检",
        en: "Quality",
        icon: ClipboardCheck,
        permission: "quality:read",
      },
    ],
  },
  {
    group: "经营管理",
    items: [
      {
        to: "/finance",
        name: "财务中心",
        en: "Finance",
        icon: Wallet,
        permission: "finance:read",
      },
      {
        to: "/products",
        name: "商品与权益",
        en: "Products",
        icon: CreditCard,
        permission: "product:read",
      },
      {
        to: "/growth",
        name: "推广中心",
        en: "Growth",
        icon: Users,
        permission: "growth:read",
      },
      {
        to: "/payments",
        name: "支付渠道",
        en: "Payments",
        icon: Settings2,
        permission: "payment:read",
      },
    ],
  },
  {
    group: "平台管理",
    items: [
      {
        to: "/ai-ops",
        name: "AI 运营",
        en: "AI Operations",
        icon: Bot,
        permission: "ai:read",
      },
      {
        to: "/system",
        name: "系统管理",
        en: "System",
        icon: Settings2,
        permission: "system:read",
      },
    ],
  },
];
const entries = nav.flatMap((g) => g.items);
function Login() {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  async function submit(values: Record<string, string>) {
    setBusy(true);
    try {
      const result = await api<{ access_token: string; admin: Admin }>(
        "/auth/login",
        "POST",
        {
          ...values,
          mfa_code: values.mfa_code || undefined,
        },
      );
      client.clear();
      useSession.getState().set(result.access_token, result.admin);
      const me = await api<Admin>("/auth/me");
      useSession.getState().set(result.access_token, me);
      navigate(entries.find((i) => can(i.permission))?.to || "/system");
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login">
      <div className="login-story">
        <Link to="/" className="brand">
          <span className="brand-icon">
            <AudioLines size={24} />
          </span>
          <span>
            面试引擎 <small>INTERVIEW ENGINE</small>
          </span>
        </Link>
        <div className="login-copy">
          <Tag color="purple" bordered={false}>
            AI INTERVIEW · ADMIN CONSOLE
          </Tag>
          <h1>
            每一次练习，
            <br />
            都在向理想靠近<span>。</span>
          </h1>
          <p>
            连接用户成长与平台运营。
            <br />
            让每一场 AI 模拟面试，都创造真实价值。
          </p>
          <div className="orbit">
            <div className="orbit-center">
              <AudioLines size={44} />
            </div>
            <div className="orbit-node one">
              <Users size={22} />
            </div>
            <div className="orbit-node two">
              <Bot size={22} />
            </div>
            <div className="orbit-node three">
              <Activity size={22} />
            </div>
          </div>
        </div>
        <footer>为成长提供动力 · 为运营提供洞察</footer>
      </div>
      <div className="login-form">
        <div className="login-form-inner">
          <span className="eyebrow">欢迎回来 / WELCOME BACK</span>
          <h2>登录运营管理后台</h2>
          <p className="muted">使用您的独立管理员账号继续</p>
          <Form layout="vertical" onFinish={submit} requiredMark={false}>
            <Form.Item
              name="login_name"
              label="管理员账号"
              rules={[{ required: true, message: "请输入管理员账号" }]}
            >
              <Input
                size="large"
                placeholder="请输入管理员账号"
                autoComplete="username"
              />
            </Form.Item>
            <Form.Item
              name="password"
              label="登录密码"
              rules={[{ required: true, message: "请输入登录密码" }]}
            >
              <Input.Password
                size="large"
                placeholder="请输入登录密码"
                autoComplete="current-password"
              />
            </Form.Item>
            <Form.Item
              name="mfa_code"
              label="动态验证码（已启用 MFA 时填写）"
              rules={[{ pattern: /^\d{6}$/, message: "请输入 6 位动态验证码" }]}
            >
              <Input
                size="large"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="6 位动态验证码"
              />
            </Form.Item>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              block
              loading={busy}
            >
              登录工作台 <ArrowRight size={16} />
            </Button>
          </Form>
          <div className="login-note">
            <ShieldCheck size={17} /> 独立身份认证 · 最小权限访问 · 操作全程审计
          </div>
        </div>
        <div className="login-bottom">
          AI 模拟面试平台 <span>运营管理系统 v1.0</span>
        </div>
      </div>
    </div>
  );
}
function Protected({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  return can(permission) ? (
    children
  ) : (
    <Result
      status="403"
      title="暂无访问权限"
      subTitle="请使用具备此功能权限的管理员账号访问。"
    />
  );
}
function Shell() {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [mobile, setMobile] = useState(false);
  const [help, setHelp] = useState(false);
  const active = entries.find((n) => location.pathname.startsWith(n.to));
  async function logout() {
    try {
      await api("/auth/logout", "POST");
    } finally {
      session.clear();
      client.clear();
      navigate("/login");
    }
  }
  const pages: Record<string, React.ReactNode> = {
    "/dashboard": <Dashboard />,
    "/users": <UsersPage />,
    "/interviews": <InterviewsPage />,
    "/quality": <QualityPage />,
    "/finance": <FinancePage />,
    "/products": <ProductsPage />,
    "/payments": <PaymentsPage />,
    "/growth": <GrowthPage />,
    "/ai-ops": <AIPage />,
    "/system": <SystemPage />,
  };
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <Link to="/" className="brand">
          <span className="brand-icon">
            <AudioLines size={23} />
          </span>
          <span>
            面试引擎<small>运营管理后台</small>
          </span>
        </Link>
        <button
          className="mobile-close"
          aria-label="收起导航"
          onClick={() => setMobile(false)}
        >
          <X size={20} />
        </button>
        <div className="workspace">
          <span className="workspace-avatar">AI</span>
          <div>
            <strong>AI 模拟面试平台</strong>
            <small>运营工作空间</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <nav>
          {nav.map((g) => (
            <div className="nav-group" key={g.group}>
              <div className="nav-label">{g.group}</div>
              {g.items
                .filter((n) => can(n.permission))
                .map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    onClick={() => setMobile(false)}
                  >
                    <n.icon size={18} strokeWidth={1.7} />
                    <span>{n.name}</span>
                    <ChevronRight size={13} className="nav-chevron" />
                  </NavLink>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-info">
            <Sparkles size={17} />
            <strong>让成长，有迹可循</strong>
            <p>以数据洞察，驱动每一步进步</p>
          </div>
          <button className="help-button" onClick={() => setHelp(true)}>
            <CircleHelp size={17} />
            使用指南
            <ChevronRight size={14} />
          </button>
          <small className="sidebar-version">
            INTERVIEW ENGINE <span>v1.0</span>
          </small>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="menu-toggle"
              aria-label="打开导航"
              onClick={() => setMobile(true)}
            >
              <Menu size={19} />
            </button>
            <span>工作空间</span>
            <ChevronRight size={13} />
            <strong>{active?.name || "运营总览"}</strong>
          </div>
          <div className="topbar-right">
            {can("interview:read") && (
              <Input
                className="global-search"
                prefix={<Search size={15} />}
                placeholder="搜索面试 ID、岗位…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onPressEnter={() => {
                  navigate(`/interviews?q=${encodeURIComponent(search)}`);
                  setSearch("");
                }}
                suffix={<kbd>↵</kbd>}
              />
            )}
            <span className="environment">
              <span />
              {session.admin?.environment === "production"
                ? "生产环境"
                : "开发环境"}
            </span>
            <div className="header-divider" />
            <Dropdown
              menu={{
                items: [
                  {
                    key: "profile",
                    label: roleLabels[session.admin?.role || ""],
                    disabled: true,
                  },
                  {
                    key: "logout",
                    label: "退出登录",
                    icon: <LogOut size={14} />,
                    onClick: logout,
                  },
                ],
              }}
            >
              <button className="account">
                <Avatar
                  size={31}
                  style={{ background: "#eeeaff", color: "#6653ce" }}
                >
                  {session.admin?.display_name.slice(0, 1)}
                </Avatar>
                <span>{session.admin?.display_name}</span>
                <ChevronDown size={12} />
              </button>
            </Dropdown>
          </div>
        </header>
        <main className="main-content">
          <Suspense
            fallback={
              <div className="page-loading">
                <Spin size="large" />
              </div>
            }
          >
            <Routes>
              {entries.map((e) => (
                <Route
                  key={e.to}
                  path={e.to}
                  element={
                    <Protected permission={e.permission}>
                      {pages[e.to]}
                    </Protected>
                  }
                />
              ))}
              <Route
                path="/"
                element={
                  <Navigate
                    to={entries.find((e) => can(e.permission))?.to || "/system"}
                    replace
                  />
                }
              />
              <Route
                path="*"
                element={
                  <Result
                    status="404"
                    title="页面不存在"
                    extra={
                      <Button onClick={() => navigate("/")}>返回工作台</Button>
                    }
                  />
                }
              />
            </Routes>
          </Suspense>
          <footer className="page-footer">
            <span>© {new Date().getFullYear()} 面试引擎 · AI 模拟面试平台</span>
            <span>
              <ShieldCheck size={12} /> 安全访问，操作可追溯
            </span>
          </footer>
        </main>
      </div>
      <Modal
        title="运营后台使用指南"
        open={help}
        onCancel={() => setHelp(false)}
        footer={<Button onClick={() => setHelp(false)}>知道了</Button>}
      >
        <p>
          通过左侧导航访问授权模块。列表支持检索与分页，数据直接来自业务后端。
        </p>
        <p>
          商品发布、权益补发、退款和支付配置由有权限的管理员直接操作，结果立即生效并保留审计记录。
        </p>
        <p>
          查看面试内容和播放媒体无需发起用户授权申请；敏感访问会自动记录审计，媒体链接限时有效。
        </p>
        <p>
          初始管理员通过后端命令 scripts.admin_cli
          创建；动态验证码可在系统管理中启用。
        </p>
      </Modal>
    </div>
  );
}
export default function App() {
  const token = useSession((s) => s.token);
  const client = useQueryClient();
  useEffect(() => {
    if (!token) client.clear();
  }, [token, client]);
  return token ? <Shell /> : <Login />;
}
