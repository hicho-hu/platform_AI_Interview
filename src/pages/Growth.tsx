import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Drawer,
  Input,
  InputNumber,
  Select,
  Tabs,
  Table,
  Tag,
  Typography,
} from "antd";
import { useQuery } from "@tanstack/react-query";
import { Download, Gift, Plus, Settings2 } from "lucide-react";
import { api, can, dateTime, money } from "../api";
import type { Row } from "../api";
import { Heading } from "./Dashboard";
import { ErrorView, Loading } from "../components";
import { DataTable, EditModal, reasonField, useAction } from "./shared";

const modes = [
  ["TEXT", "文字"],
  ["VOICE", "语音"],
  ["VIDEO", "视频"],
];
const credits = (values: Row) =>
  modes
    .map(([mode, label]) => `${label} ${values?.[mode] ?? 0} 次`)
    .join(" + ");
const quantityFields = (prefix: string, label: string) =>
  modes.map(([mode, name]) => ({
    name: `${prefix}_${mode}`,
    label: `${label} · ${name}面试次数`,
    node: <InputNumber min={0} max={10000} precision={0} />,
  }));

function Invitations() {
  const query = useQuery({
    queryKey: ["invitation-config"],
    queryFn: () => api("/invitations/config"),
  });
  const [open, setOpen] = useState(false);
  const action = useAction();
  const config = query.data;
  return (
    <>
      <Alert
        className="page-alert"
        type="info"
        showIcon
        message="好友验证邮箱并成功注册才计为有效邀请。每达到一次门槛发放一次奖励；配置按版本保存，新规则只影响之后注册的好友。"
      />
      <ErrorView error={query.error} retry={() => query.refetch()} />
      <Loading loading={query.isLoading}>
        {config && (
          <section className="panel growth-rule-card">
            <div className="panel-heading">
              <div>
                <h2>
                  <Gift size={20} />
                  邀请奖励规则
                </h2>
                <p>当前版本 V{config.version}</p>
              </div>
              <Tag color={config.enabled ? "success" : "default"}>
                {config.enabled ? "已开启" : "未开启"}
              </Tag>
            </div>
            <div className="growth-rule-summary">
              <p>
                邀请人每成功邀请 <b>{config.threshold} 人</b>，获得{" "}
                <b>{credits(config.inviter_rewards)}</b>。
              </p>
              <p>
                受邀人成功注册额外获得 <b>{credits(config.invitee_rewards)}</b>
                。
              </p>
            </div>
            {can("growth:write") && (
              <Button
                type="primary"
                icon={<Settings2 size={16} />}
                onClick={() => setOpen(true)}
              >
                修改邀请规则
              </Button>
            )}
          </section>
        )}
      </Loading>
      <EditModal
        title="配置邀请奖励"
        open={open}
        onClose={() => setOpen(false)}
        busy={action.busy}
        description="各类型次数可单独设置。开启奖励时，邀请人奖励合计至少 1 次；新人奖励可设为 0。"
        initial={
          config
            ? {
                status: config.enabled ? "ACTIVE" : "DISABLED",
                threshold: config.threshold,
                ...Object.fromEntries(
                  modes.flatMap(([mode]) => [
                    [`inviter_${mode}`, config.inviter_rewards[mode]],
                    [`invitee_${mode}`, config.invitee_rewards[mode]],
                  ]),
                ),
              }
            : undefined
        }
        fields={[
          {
            name: "status",
            label: "邀请奖励状态",
            node: (
              <Select
                options={[
                  { value: "ACTIVE", label: "开启" },
                  { value: "DISABLED", label: "关闭" },
                ]}
              />
            ),
          },
          {
            name: "threshold",
            label: "每邀请多少人奖励一次",
            node: <InputNumber min={1} max={10000} precision={0} />,
          },
          ...quantityFields("inviter", "邀请人奖励"),
          ...quantityFields("invitee", "受邀人额外奖励"),
          reasonField,
        ]}
        onSubmit={(values) =>
          action.run(
            "/invitations/config",
            "PUT",
            {
              enabled: values.status === "ACTIVE",
              threshold: values.threshold,
              inviter_rewards: Object.fromEntries(
                modes.map(([mode]) => [mode, values[`inviter_${mode}`]]),
              ),
              invitee_rewards: Object.fromEntries(
                modes.map(([mode]) => [mode, values[`invitee_${mode}`]]),
              ),
              reason: values.reason,
            },
            "邀请规则已更新",
          )
        }
      />
    </>
  );
}

function Promotions() {
  const [editing, setEditing] = useState<Row | null | undefined>(undefined);
  const action = useAction();
  return (
    <>
      <Alert
        className="page-alert"
        type="info"
        showIcon
        message="推广链接用于新注册归因。佣金比例在订单创建时固化，支付成功计提，退款成功自动冲销；停用链接仅停止新用户归因。此处记录佣金应计，不执行资金转账。"
      />
      <DataTable
        path="/promotions"
        extra={
          can("growth:write") && (
            <Button
              type="primary"
              icon={<Plus size={16} />}
              onClick={() => setEditing(null)}
            >
              创建推广链接
            </Button>
          )
        }
        columns={[
          {
            title: "推广活动",
            render: (_, row) => (
              <div className="stack">
                <strong>{row.name}</strong>
                <small>{row.promoter_name}</small>
              </div>
            ),
          },
          {
            title: "推广链接",
            render: (_, row) => (
              <div className="growth-url">
                <Typography.Paragraph copyable={{ text: row.url }}>
                  {row.url}
                </Typography.Paragraph>
              </div>
            ),
          },
          {
            title: "佣金比例",
            dataIndex: "rate_bps",
            render: (value) => `${(value / 100).toFixed(2)}%`,
          },
          { title: "注册人数", dataIndex: "registrations" },
          {
            title: "应计 / 已冲销",
            render: (_, row) => (
              <div className="stack">
                <strong>{money(row.accrued_minor)}</strong>
                <small>冲销 {money(row.reversed_minor)}</small>
              </div>
            ),
          },
          {
            title: "状态",
            dataIndex: "status",
            render: (value) => (
              <Tag color={value === "ACTIVE" ? "success" : "default"}>
                {value === "ACTIVE" ? "启用" : "停用"}
              </Tag>
            ),
          },
          {
            title: "操作",
            render: (_, row) =>
              can("growth:write") && (
                <Button type="link" onClick={() => setEditing(row)}>
                  修改推广配置
                </Button>
              ),
          },
        ]}
      />
      <EditModal
        title={editing ? "修改推广链接" : "创建分佣推广链接"}
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        busy={action.busy}
        initial={
          editing
            ? {
                ...editing,
                commission_rate: editing.rate_bps / 100,
                reason: undefined,
              }
            : { commission_rate: 10, status: "ACTIVE" }
        }
        description="佣金按实付金额乘比例，以分为单位向下取整。修改只影响之后创建的订单，历史订单保持原比例。"
        fields={[
          { name: "name", label: "推广活动名称" },
          { name: "promoter_name", label: "推广人或合作方" },
          {
            name: "alipay_account",
            label: "佣金人支付宝账号",
            node: <Input maxLength={128} autoComplete="off" />,
            rules: [{ required: true, whitespace: true, min: 1, max: 128, message: "请输入有效的支付宝账号" }],
          },
          {
            name: "commission_rate",
            label: "佣金比例（%）",
            node: <InputNumber min={0} max={100} precision={2} step={0.1} />,
          },
          {
            name: "status",
            label: "链接状态",
            node: (
              <Select
                options={[
                  { value: "ACTIVE", label: "启用" },
                  { value: "DISABLED", label: "停用" },
                ]}
              />
            ),
          },
          reasonField,
        ]}
        onSubmit={(values) =>
          action.run(
            editing ? `/promotions/${editing.id}` : "/promotions",
            editing ? "PUT" : "POST",
            {
              name: values.name,
              promoter_name: values.promoter_name,
              alipay_account: String(values.alipay_account ?? "").trim(),
              rate_bps: Math.round(values.commission_rate * 100),
              status: values.status,
              reason: values.reason,
            },
            editing ? "推广配置已保存" : "推广链接已创建",
          )
        }
      />
    </>
  );
}

function CommissionLedger() {
  const [selected, setSelected] = useState<string[]>([]);
  const [detailLink, setDetailLink] = useState<string | null>(null);
  const action = useAction();
  const query = useQuery({
    queryKey: ["commission-ledger-all"],
    queryFn: async () => {
      const first = await api<{ items: Row[]; total: number }>("/promotions/commissions/records?page=1&page_size=100");
      const pages = await Promise.all(Array.from({ length: Math.ceil(first.total / 100) - 1 }, (_, index) => api<{ items: Row[] }>(`/promotions/commissions/records?page=${index + 2}&page_size=100`)));
      return [ ...first.items, ...pages.flatMap((page) => page.items) ];
    },
  });
  const rows = query.data ?? [];
  const accounts = Object.values(rows.reduce<Record<string, Row>>((groups, row) => {
    const key = row.alipay_account || `未填写-${row.link_id}`;
    const group = groups[key] ??= { id: key, link_ids: [], promoter_name: row.promoter_name, alipay_account: row.alipay_account, count: 0, pending_minor: 0, settled_minor: 0, reversed_minor: 0 };
    if (!group.link_ids.includes(row.link_id)) group.link_ids.push(row.link_id);
    group.count += 1;
    if (row.status === "ACCRUED") group.pending_minor += row.amount_minor;
    if (row.status === "SETTLED") group.settled_minor += row.amount_minor;
    if (row.status === "REVERSED") group.reversed_minor += row.amount_minor;
    return groups;
  }, {}));
  const detailRows = rows.filter((row) => (row.alipay_account || `未填写-${row.link_id}`) === detailLink);
  function exportCsv(items: Row[], filename: string) {
    const fields = [["推广人", "支付宝账号", "订单号", "佣金金额(元)", "状态", "计提时间", "结算时间"], ...items.map((row) => [row.promoter_name, row.alipay_account, row.order_id, (row.amount_minor / 100).toFixed(2), row.status, row.created_at, row.settled_at ?? ""])];
    const csv = "\uFEFF" + fields.map((line) => line.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
  }
  return <>
    <Alert className="page-alert" type="info" showIcon message="按推广佣金账户归类。勾选一个或多个账户后，可登记已线下打款；此操作只更新结算台账，不会执行转账。" />
    <section className="panel table-panel">
      <div className="table-toolbar">
        {can("growth:write") && <Button type="primary" disabled={!selected.length || action.busy} onClick={() => { const linkIds = accounts.filter((account) => selected.includes(account.id)).flatMap((account) => account.link_ids); void action.run("/promotions/commissions/settle", "POST", { link_ids: linkIds, reason: "后台登记线下打款" }, "所选账户佣金已登记结算").then((result) => { if (result) setSelected([]); }); }}>标记已打款（{selected.length}）</Button>}
        <Button icon={<Download size={15} />} disabled={!rows.length} onClick={() => exportCsv(rows, "佣金明细.csv")}>导出全部佣金明细</Button>
        <Button onClick={() => void query.refetch()}>刷新</Button>
      </div>
      <Table<Row> rowKey="id" loading={query.isLoading} dataSource={accounts} pagination={{ pageSize: 10 }} scroll={{ x: 900 }} rowSelection={can("growth:write") ? { selectedRowKeys: selected, onChange: (keys) => setSelected(keys as string[]), getCheckboxProps: (row) => ({ disabled: !row.pending_minor }) } : undefined} columns={[
        { title: "佣金账户", render: (_, row) => <Button type="link" onClick={() => setDetailLink(row.id)}>{row.promoter_name}</Button> },
        { title: "支付宝账号", dataIndex: "alipay_account" }, { title: "佣金笔数", dataIndex: "count" },
        { title: "待打款", dataIndex: "pending_minor", render: money }, { title: "已结算", dataIndex: "settled_minor", render: money }, { title: "已冲销", dataIndex: "reversed_minor", render: money },
      ]} />
    </section>
    <Drawer title="佣金明细" open={!!detailLink} width={900} onClose={() => setDetailLink(null)} extra={<Button icon={<Download size={15} />} onClick={() => exportCsv(detailRows, "佣金账户明细.csv")}>导出明细</Button>}>
      <Table<Row> rowKey="id" dataSource={detailRows} pagination={{ pageSize: 20 }} scroll={{ x: 780 }} columns={[
        { title: "订单号", dataIndex: "order_id" }, { title: "金额", dataIndex: "amount_minor", render: money }, { title: "状态", dataIndex: "status", render: (value) => value === "ACCRUED" ? "待打款" : value === "SETTLED" ? "已结算" : "已冲销" }, { title: "计提时间", dataIndex: "created_at", render: dateTime }, { title: "结算时间", dataIndex: "settled_at", render: dateTime },
      ]} />
    </Drawer>
  </>;
}

export default function GrowthPage() {
  return (
    <>
      <Heading
        title="推广中心"
        description="管理好友邀请奖励、分佣推广链接与订单佣金。"
      />
      <Tabs
        items={[
          {
            key: "invitations",
            label: "邀请奖励配置",
            children: <Invitations />,
          },
          {
            key: "promotions",
            label: "分佣推广链接",
            children: <Promotions />,
          },
          {
            key: "commissions",
            label: "佣金台账",
            children: <CommissionLedger />,
          },
        ]}
      />
    </>
  );
}
