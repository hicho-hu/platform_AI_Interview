import { useState } from "react";
import {
  Alert,
  Button,
  Descriptions,
  Input,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from "antd";
import { useQuery } from "@tanstack/react-query";
import { Activity, Bot, Coins, Plus, ShieldCheck, Timer } from "lucide-react";
import { api, can, dateTime, roleLabels, useSession } from "../api";
import type { Row } from "../api";
import { ErrorView, Id, Metric, Section, Status } from "../components";
import { Heading, usePeriod } from "./Dashboard";
import { DataTable, EditModal, reasonField, useAction } from "./shared";
import { StorageSettings } from "./Storage";
export function AIPage() {
  const period = usePeriod();
  const query = useQuery({
    queryKey: ["ai", period.query],
    queryFn: () => api(`/ai/costs?${period.query}`),
  });
  const d = query.data;
  const cost =
    d?.items.reduce((n: number, r: Row) => n + r.cost_microunits, 0) || 0;
  const tokens =
    d?.items.reduce(
      (n: number, r: Row) => n + r.input_tokens + r.output_tokens,
      0,
    ) || 0;
  const calls = d?.calls || 0;
  const latency = calls
    ? d?.items.reduce((n: number, r: Row) => n + r.latency_ms * r.calls, 0) /
      calls
    : 0;
  return (
    <>
      <Heading
        title="AI 运营"
        description="观察模型用量、响应表现与成本，让智能服务持续可靠。"
        extra={
          <Select
            value={period.days}
            onChange={period.setDays}
            options={[7, 30, 90].map((value) => ({
              value,
              label: `近 ${value} 天`,
            }))}
          />
        }
      />
      <ErrorView error={query.error} retry={() => query.refetch()} />
      <div className="metric-grid">
        <Metric
          label="模型调用"
          value={d?.calls ?? "—"}
          hint="统计周期内全部 AI 调用"
          icon={<Bot size={18} />}
        />
        <Metric
          label="调用成本"
          value={`¥${(cost / 1000000).toFixed(4)}`}
          hint="按已配置单价记录的费用"
          icon={<Coins size={18} />}
          accent
        />
        <Metric
          label="平均延迟"
          value={`${Math.round(latency)} ms`}
          hint="按调用次数加权平均"
          icon={<Timer size={18} />}
        />
        <Metric
          label="失败率"
          value={`${d?.failure_rate ?? "—"}%`}
          hint={`${d?.failed ?? 0} 次失败调用`}
          icon={<Activity size={18} />}
        />
      </div>
      <Section
        title="模型用量与成本"
        subtitle={`输入与输出 Token 合计 ${tokens.toLocaleString()}；费用缺少单价时记为 0，不能据此推断实际账单。`}
      >
        <Table<Row>
          rowKey={(r) => `${r.model}-${r.call_type}`}
          dataSource={d?.items || []}
          loading={query.isLoading}
          pagination={false}
          scroll={{ x: 800 }}
          columns={[
            {
              title: "供应商 / 模型",
              render: (_, r) => (
                <div className="stack">
                  <strong>{r.model}</strong>
                  <small className="muted">{r.provider}</small>
                </div>
              ),
            },
            { title: "调用类型", dataIndex: "call_type" },
            { title: "调用次数", dataIndex: "calls" },
            { title: "输入 Token", dataIndex: "input_tokens" },
            { title: "输出 Token", dataIndex: "output_tokens" },
            {
              title: "平均延迟",
              dataIndex: "latency_ms",
              render: (v) => `${Math.round(v)} ms`,
            },
            {
              title: "成本",
              dataIndex: "cost_microunits",
              render: (v) => `¥${(v / 1000000).toFixed(4)}`,
            },
          ]}
        />
      </Section>
      <Section
        title="当前模型配置"
        subtitle="从服务端配置读取；模型路由在线发布尚未开放。"
      >
        <Descriptions
          column={3}
          items={
            d?.routing
              ? Object.entries(d.routing).map(([key, value]) => ({
                  key,
                  label: (
                    {
                      provider_mode: "Provider 模式",
                      llm: "语言模型",
                      asr: "语音识别",
                      tts: "语音合成",
                      timeout_seconds: "超时（秒）",
                      retry_count: "重试次数",
                    } as Row
                  )[key],
                  children: String(value),
                }))
              : []
          }
        />
      </Section>
    </>
  );
}
export function SystemPage() {
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [mfa, setMfa] = useState<Row | null>(null);
  const action = useAction();
  const session = useSession();
  const roles = useQuery({ queryKey: ["roles"], queryFn: () => api("/roles") });
  return (
    <>
      <Heading
        title="系统管理"
        description="让权限有边界、操作可追溯，守护平台与用户数据。"
      />
      <Tabs
        items={[
          {
            key: "storage",
            label: "文件存储",
            children: <StorageSettings />,
          },
          {
            key: "admins",
            label: "管理员账号",
            children: (
              <DataTable
                path="/admin-users"
                extra={
                  can("admin:write") && (
                    <Button
                      type="primary"
                      icon={<Plus size={15} />}
                      onClick={() => setCreating(true)}
                    >
                      新增管理员
                    </Button>
                  )
                }
                columns={[
                  { title: "管理员", dataIndex: "display_name" },
                  { title: "登录账号", dataIndex: "login_name" },
                  {
                    title: "角色",
                    dataIndex: "role",
                    render: (v) => (
                      <Tag bordered={false} color="purple">
                        {roleLabels[v]}
                      </Tag>
                    ),
                  },
                  {
                    title: "状态",
                    dataIndex: "status",
                    render: (v) => <Status value={v} />,
                  },
                  {
                    title: "多因素认证",
                    dataIndex: "mfa_enabled",
                    render: (v) => (
                      <Tag bordered={false} color={v ? "success" : "warning"}>
                        {v ? "已启用" : "未启用"}
                      </Tag>
                    ),
                  },
                  {
                    title: "最近登录",
                    dataIndex: "last_login_at",
                    render: dateTime,
                  },
                  {
                    title: "操作",
                    render: (_, r) =>
                      can("admin:write") &&
                      r.id !== session.admin?.id && (
                        <Button type="link" onClick={() => setSelected(r)}>
                          管理权限
                        </Button>
                      ),
                  },
                ]}
              />
            ),
          },
          {
            key: "roles",
            label: "角色权限",
            children: (
              <section className="panel">
                <Table<Row>
                  rowKey="role"
                  pagination={false}
                  loading={roles.isLoading}
                  dataSource={roles.data?.items || []}
                  columns={[
                    { title: "角色", dataIndex: "label", width: 160 },
                    {
                      title: "权限范围",
                      dataIndex: "permissions",
                      render: (v) => (
                        <div className="permission-tags">
                          {v.map((p: string) => (
                            <Tag key={p} bordered={false}>
                              {p === "*" ? "全部管理权限" : p}
                            </Tag>
                          ))}
                        </div>
                      ),
                    },
                  ]}
                />
              </section>
            ),
          },
          {
            key: "audit",
            label: "操作审计",
            children: can("audit:read") ? (
              <DataTable
                path="/audit-logs"
                columns={[
                  { title: "操作类型", dataIndex: "action" },
                  {
                    title: "操作人",
                    dataIndex: "admin_id",
                    render: (v) => <Id value={v} />,
                  },
                  {
                    title: "资源",
                    dataIndex: "resource_id",
                    render: (v) => <Id value={v} />,
                  },
                  { title: "操作原因", dataIndex: "reason", ellipsis: true },
                  {
                    title: "结果",
                    dataIndex: "result",
                    render: (v) => <Status value={v} />,
                  },
                  { title: "IP", dataIndex: "ip" },
                  { title: "时间", dataIndex: "created_at", render: dateTime },
                  {
                    title: "请求追踪",
                    dataIndex: "request_id",
                    render: (v) => <Id value={v} />,
                  },
                ]}
              />
            ) : (
              <Alert message="当前角色无审计日志访问权限" />
            ),
          },
          {
            key: "security",
            label: "账户安全",
            children: (
              <Section
                title="多因素认证（MFA）"
                subtitle="使用兼容 TOTP 的身份验证器。生产环境要求所有管理员启用 MFA。"
              >
                <div className="security-panel">
                  <ShieldCheck size={42} />
                  <div>
                    <h3>
                      {session.admin?.mfa_enabled
                        ? "您的账户已启用 MFA"
                        : "为您的账户添加第二重保护"}
                    </h3>
                    <p>
                      登录时输入密码与每 30
                      秒更新的动态验证码。密钥仅在首次设置时展示。
                    </p>
                  </div>
                  {!session.admin?.mfa_enabled && (
                    <Button
                      type="primary"
                      loading={action.busy}
                      onClick={async () => {
                        const result = await action.run(
                          "/auth/mfa/setup",
                          "POST",
                          {},
                          "请使用验证器保存密钥",
                        );
                        if (result) setMfa(result);
                      }}
                    >
                      开始设置
                    </Button>
                  )}
                </div>
              </Section>
            ),
          },
        ]}
      />
      <EditModal
        title="新增管理员"
        open={creating}
        onClose={() => setCreating(false)}
        fields={[
          {
            name: "login_name",
            label: "登录账号",
            rules: [
              {
                pattern: /^[a-zA-Z0-9_.-]{3,80}$/,
                message: "3–80 位字母、数字、点、下划线或短横线",
              },
            ],
          },
          { name: "display_name", label: "显示姓名" },
          {
            name: "password",
            label: "初始密码",
            node: <Input.Password autoComplete="new-password" />,
            rules: [{ min: 12, message: "密码至少 12 位" }],
          },
          {
            name: "role",
            label: "角色",
            node: (
              <Select
                options={Object.entries(roleLabels).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            ),
          },
        ]}
        busy={action.busy}
        onSubmit={(values) => action.run("/admin-users", "POST", values)}
      />
      <EditModal
        title="管理账号权限"
        open={!!selected}
        onClose={() => setSelected(null)}
        initial={selected || {}}
        description="变更角色或停用账号会立即撤销该账号已有会话。"
        fields={[
          {
            name: "role",
            label: "管理员角色",
            node: (
              <Select
                options={Object.entries(roleLabels).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            ),
          },
          {
            name: "status",
            label: "账号状态",
            node: (
              <Select
                options={[
                  { label: "启用", value: "ACTIVE" },
                  { label: "停用", value: "DISABLED" },
                ]}
              />
            ),
          },
          reasonField,
        ]}
        busy={action.busy}
        onSubmit={(values) =>
          action.run(`/admin-users/${selected?.id}`, "PATCH", values)
        }
      />
      <EditModal
        title="确认启用 MFA"
        open={!!mfa}
        onClose={() => setMfa(null)}
        description={
          <>
            <p>将下列密钥添加至您的 TOTP 验证器，然后输入验证码完成设置。</p>
            <code className="mfa-secret">{mfa?.secret}</code>
          </>
        }
        fields={[
          {
            name: "code",
            label: "6 位动态验证码",
            rules: [{ pattern: /^\d{6}$/, message: "请输入 6 位验证码" }],
          },
        ]}
        busy={action.busy}
        onSubmit={async (values) => {
          const result = await action.run(
            "/auth/mfa/confirm",
            "POST",
            { ...values, secret: mfa?.secret },
            "MFA 已启用",
          );
          if (result && session.admin)
            session.set(session.token, { ...session.admin, mfa_enabled: true });
          return result;
        }}
      />
    </>
  );
}
