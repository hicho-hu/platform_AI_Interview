import { useState } from "react";
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Input,
  InputNumber,
  Select,
  Space,
  Tabs,
  Tag,
} from "antd";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CircleDollarSign,
  CreditCard,
  Plus,
  Receipt,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { api, can, dateTime, money } from "../api";
import type { Row } from "../api";
import { ErrorView, Id, Metric, Status } from "../components";
import { Heading, usePeriod } from "./Dashboard";
import {
  DataTable,
  EditModal,
  reasonField,
  statusOptions,
  useAction,
} from "./shared";
const entitlementText = (r: Row) =>
  r.interview_credits
    ? `文字 ${r.interview_credits.TEXT} 次 + 语音 ${r.interview_credits.VOICE} 次 + 视频 ${r.interview_credits.VIDEO} 次`
    : `通用 ${r.credits} 次`;
export function FinancePage() {
  const period = usePeriod();
  const summary = useQuery({
    queryKey: ["finance", period.query],
    queryFn: () => api(`/finance/summary?${period.query}`),
  });
  const d = summary.data;
  const [refund, setRefund] = useState<Row | null>(null);
  const [importing, setImporting] = useState(false);
  const [batch, setBatch] = useState<Row | null>(null);
  const [resolve, setResolve] = useState<Row | null>(null);
  const action = useAction();
  return (
    <>
      <Heading
        title="财务中心"
        description="清晰呈现每一笔收入，让资金与权益有据可查。"
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
      <ErrorView error={summary.error} retry={() => summary.refetch()} />
      <div className="metric-grid">
        <Metric
          label="支付成功金额"
          value={d ? money(d.paid_minor) : "—"}
          hint="支付时间落在统计窗口的订单"
          icon={<CircleDollarSign size={18} />}
        />
        <Metric
          label="成功退款金额"
          value={d ? money(d.refund_minor) : "—"}
          hint="退款时间落在统计窗口的订单"
          icon={<RotateCcw size={18} />}
        />
        <Metric
          label="净实收金额"
          value={d ? money(d.net_minor) : "—"}
          hint="支付成功金额 − 成功退款"
          icon={<ArrowUpRight size={18} />}
          accent
        />
        <Metric
          label="支付订单数"
          value={d?.paid_orders ?? "—"}
          hint={`ARPPU ${d ? money(d.arppu_minor) : "—"}`}
          icon={<Receipt size={18} />}
        />
      </div>
      <div className="inline-note">
        人民币 CNY · Asia/Shanghai ·
        净实收不等于跨期确认收入。真实退款需已接入支付渠道。
      </div>
      <Tabs
        className="page-tabs"
        items={[
          {
            key: "orders",
            label: "订单管理",
            children: (
              <DataTable
                path="/orders"
                filters={[
                  {
                    key: "status",
                    placeholder: "订单状态",
                    options: statusOptions(["PENDING", "PAID", "REFUNDED"]),
                  },
                ]}
                columns={[
                  {
                    title: "订单号",
                    dataIndex: "id",
                    render: (v) => <Id value={v} />,
                  },
                  {
                    title: "用户 UID",
                    dataIndex: "user_uid",
                    render: (v) => <Id value={v} />,
                  },
                  { title: "商品 SKU", dataIndex: "product_code" },
                  { title: "权益明细", render: (_, r) => entitlementText(r) },
                  {
                    title: "实付金额",
                    dataIndex: "amount_minor",
                    render: money,
                  },
                  {
                    title: "状态",
                    dataIndex: "status",
                    render: (v) => <Status value={v} />,
                  },
                  { title: "支付时间", dataIndex: "paid_at", render: dateTime },
                  {
                    title: "操作",
                    render: (_, r) =>
                      can("order:refund") && r.status === "PAID" ? (
                        <Button type="link" danger onClick={() => setRefund(r)}>
                          退款
                        </Button>
                      ) : (
                        "—"
                      ),
                  },
                ]}
              />
            ),
          },
          {
            key: "refunds",
            label: "退款记录",
            children: (
              <DataTable
                path="/refunds"
                columns={[
                  {
                    title: "退款单",
                    dataIndex: "id",
                    render: (v) => <Id value={v} />,
                  },
                  {
                    title: "订单号",
                    dataIndex: "order_id",
                    render: (v) => <Id value={v} />,
                  },
                  { title: "金额", dataIndex: "amount_minor", render: money },
                  { title: "退款原因", dataIndex: "reason" },
                  {
                    title: "状态",
                    dataIndex: "status",
                    render: (v) => <Status value={v} />,
                  },
                  {
                    title: "操作时间",
                    dataIndex: "created_at",
                    render: dateTime,
                  },
                ]}
              />
            ),
          },
          {
            key: "reconcile",
            label: "渠道对账",
            children: (
              <DataTable
                path="/reconciliations"
                extra={
                  can("reconciliation:write") && (
                    <Button
                      type="primary"
                      icon={<Plus size={15} />}
                      onClick={() => setImporting(true)}
                    >
                      导入渠道账单
                    </Button>
                  )
                }
                columns={[
                  {
                    title: "批次",
                    dataIndex: "id",
                    render: (v) => <Id value={v} />,
                  },
                  { title: "渠道", dataIndex: "channel" },
                  { title: "账单日期", dataIndex: "bill_date" },
                  { title: "账单行数", dataIndex: "total_rows" },
                  { title: "差异数量", dataIndex: "difference_count" },
                  {
                    title: "状态",
                    dataIndex: "status",
                    render: (v) => <Status value={v} />,
                  },
                  {
                    title: "操作",
                    render: (_, r) => (
                      <Button type="link" onClick={() => setBatch(r)}>
                        查看差异
                      </Button>
                    ),
                  },
                ]}
              />
            ),
          },
        ]}
      />
      <EditModal
        title="全额退款"
        open={!!refund}
        onClose={() => setRefund(null)}
        fields={[reasonField]}
        busy={action.busy}
        description={`退款金额 ${money(refund?.amount_minor)}。提交后直接执行退款；已使用额度可能无法全额退回。`}
        onSubmit={(values) =>
          action.run(
            "/refunds",
            "POST",
            { ...values, order_id: refund?.id },
            "退款已完成",
          )
        }
      />
      <EditModal
        title="导入对账单"
        open={importing}
        onClose={() => setImporting(false)}
        fields={[
          {
            name: "channel",
            label: "支付渠道",
            node: (
              <Select
                options={["WECHAT", "ALIPAY", "DEV"].map((value) => ({
                  value,
                  label: value,
                }))}
              />
            ),
          },
          { name: "bill_date", label: "账单日期", node: <Input type="date" /> },
          {
            name: "rows_json",
            label: "账单明细（JSON 数组）",
            node: (
              <Input.TextArea
                rows={7}
                placeholder={
                  '[{"order_id":"订单ID","amount_minor":990,"status":"PAID"}]'
                }
              />
            ),
            rules: [
              {
                validator: (_: unknown, value: string) => {
                  try {
                    const rows = JSON.parse(value);
                    if (!Array.isArray(rows) || !rows.length) throw Error();
                    return Promise.resolve();
                  } catch {
                    return Promise.reject(new Error("请输入非空 JSON 数组"));
                  }
                },
              },
            ],
          },
          reasonField,
        ]}
        busy={action.busy}
        onSubmit={(values) => {
          const { rows_json, ...rest } = values;
          return action.run("/reconciliations/run", "POST", {
            ...rest,
            rows: JSON.parse(rows_json),
          });
        }}
      />
      <Drawer
        title={`对账差异 · ${batch?.bill_date || ""}`}
        open={!!batch}
        width={900}
        onClose={() => setBatch(null)}
        destroyOnHidden
      >
        {batch && (
          <DataTable
            path={`/reconciliations/${batch.id}/items`}
            columns={[
              {
                title: "订单",
                dataIndex: "order_id",
                render: (v) => <Id value={v} />,
              },
              { title: "差异类型", dataIndex: "difference_type" },
              { title: "渠道金额", dataIndex: "amount_minor", render: money },
              {
                title: "状态",
                dataIndex: "status",
                render: (v) => <Status value={v} />,
              },
              { title: "结论", dataIndex: "resolution" },
              {
                title: "操作",
                render: (_, r) =>
                  can("reconciliation:write") &&
                  r.status === "OPEN" && (
                    <Button type="link" onClick={() => setResolve(r)}>
                      处理
                    </Button>
                  ),
              },
            ]}
          />
        )}
      </Drawer>
      <EditModal
        title="记录对账处理结论"
        open={!!resolve}
        onClose={() => setResolve(null)}
        fields={[{ ...reasonField, label: "处理结论" }]}
        busy={action.busy}
        onSubmit={(values) =>
          action.run(`/reconciliation-items/${resolve?.id}`, "PATCH", values)
        }
      />
    </>
  );
}
const kinds: Row = {
  SINGLE: "按次训练",
  MONTH: "月度额度包",
  QUARTER: "季度额度包",
  YEAR: "年度额度包",
  PACK: "训练扩展包",
};
export function ProductsPage() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [editing, setEditing] = useState(false);
  const [publishing, setPublishing] = useState<Row | null>(null);
  const [offlining, setOfflining] = useState<Row | null>(null);
  const action = useAction();
  return (
    <>
      <Heading
        title="商品与权益"
        description="设计适合不同成长阶段的训练方案，管理每一版商品与价格。"
        extra={
          can("product:write") && (
            <Button
              type="primary"
              icon={<Plus size={16} />}
              onClick={() => {
                setSelected(null);
                setEditing(false);
                setOpen(true);
              }}
            >
              新建商品草稿
            </Button>
          )
        }
      />
      <Alert
        className="page-alert"
        type="info"
        showIcon
        message="发布后立即生效，新价格仅影响新订单。套餐按文字、语音和视频分别发放次数，组合以订单创建时的快照为准，有效期仅为配置，尚未执行到期回收与周期重置。"
      />
      <DataTable
        path="/products"
        columns={[
          {
            title: "商品",
            render: (_, r) => (
              <div className="stack">
                <strong>{r.name}</strong>
                <small className="mono">
                  {r.code} · v{r.version}
                </small>
              </div>
            ),
          },
          { title: "类型", dataIndex: "kind", render: (v) => kinds[v] },
          {
            title: "售价 / 原价",
            render: (_, r) => (
              <div className="stack">
                <strong>{money(r.amount_minor)}</strong>
                <del className="muted">{money(r.original_minor)}</del>
              </div>
            ),
          },
          {
            title: "训练额度",
            render: (_, r) => (
              <div className="stack">
                <strong>{r.credits} 次合计</strong>
                <small>{entitlementText(r)}</small>
                {!!r.vip_days && <Tag color="gold">VIP {r.vip_days} 天</Tag>}
              </div>
            ),
          },
          {
            title: "配置有效期",
            dataIndex: "validity_days",
            render: (v) => `${v} 天`,
          },
          {
            title: "状态",
            dataIndex: "status",
            render: (v) => <Status value={v === "IN_REVIEW" ? "DRAFT" : v} />,
          },
          {
            title: "操作",
            render: (_, r) =>
              can("product:write") && (
                <Space wrap>
                  {["DRAFT", "IN_REVIEW"].includes(r.status) && (
                    <Button
                      type="link"
                      onClick={() => {
                        setSelected(r);
                        setEditing(true);
                        setOpen(true);
                      }}
                    >
                      编辑
                    </Button>
                  )}
                  {["DRAFT", "IN_REVIEW"].includes(r.status) && (
                    <Button type="link" onClick={() => setPublishing(r)}>
                      上线
                    </Button>
                  )}
                  {r.status === "PUBLISHED" && (
                    <Button type="link" danger onClick={() => setOfflining(r)}>
                      下线
                    </Button>
                  )}
                  {!["DRAFT", "IN_REVIEW"].includes(r.status) && (
                    <Button
                      type="link"
                      onClick={() => {
                        setSelected(r);
                        setEditing(false);
                        setOpen(true);
                      }}
                    >
                      新建版本
                    </Button>
                  )}
                </Space>
              ),
          },
        ]}
      />
      <EditModal
        title={
          editing ? "编辑商品草稿" : selected ? "新建商品版本" : "新建商品草稿"
        }
        open={open}
        initial={
          selected
            ? {
                ...selected,
                text_credits:
                  selected.interview_credits?.TEXT ?? selected.credits,
                voice_credits: selected.interview_credits?.VOICE ?? 0,
                video_credits: selected.interview_credits?.VIDEO ?? 0,
                reason: undefined,
              }
            : {
                kind: "SINGLE",
                vip_days: 0,
                text_credits: 3,
                voice_credits: 2,
                video_credits: 1,
                amount_minor: 990,
                original_minor: 1290,
                validity_days: 30,
              }
        }
        onClose={() => setOpen(false)}
        fields={[
          {
            name: "code",
            label: "商品 SKU",
            node: <Input readOnly={editing} />,
            rules: [
              {
                pattern: /^[A-Z][A-Z0-9_]{1,39}$/,
                message: "使用大写字母、数字和下划线",
              },
            ],
          },
          { name: "name", label: "商品名称" },
          {
            name: "kind",
            label: "商品类型",
            node: (
              <Select
                options={Object.entries(kinds).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            ),
          },
          {
            name: "amount_minor",
            label: "售价（分）",
            node: (
              <InputNumber
                min={1}
                max={100000000}
                precision={0}
                style={{ width: "100%" }}
              />
            ),
          },
          {
            name: "original_minor",
            label: "原价（分）",
            node: (
              <InputNumber
                min={1}
                max={100000000}
                precision={0}
                style={{ width: "100%" }}
              />
            ),
          },
          ...[
            ["text_credits", "文字面试次数"],
            ["voice_credits", "语音面试次数"],
            ["video_credits", "视频面试次数"],
          ].map(([name, label]) => ({
            name,
            label,
            node: <InputNumber min={0} max={10000} precision={0} />,
          })),
          {
            name: "vip_days",
            label: "VIP有效天数（0为不含VIP）",
            node: <InputNumber min={0} max={3650} precision={0} />,
          },
          {
            name: "validity_days",
            label: "配置有效天数（暂不执行到期回收）",
            node: <InputNumber min={1} max={3650} precision={0} />,
          },
          {
            name: "description",
            label: "商品描述",
            required: false,
            node: <Input.TextArea maxLength={500} />,
          },
          reasonField,
        ]}
        busy={action.busy}
        description="须包含至少1次面试或VIP有效天数。纯VIP商品可将所有面试次数设为0；VIP天数写入订单快照，支付后生效。"
        onSubmit={(v) => {
          const allowed = [
            "code",
            "name",
            "kind",
            "amount_minor",
            "original_minor",
            "validity_days",
            "vip_days",
            "description",
            "reason",
          ];
          return action.run(
            editing ? `/products/${selected?.id}` : "/products",
            editing ? "PUT" : "POST",
            {
              ...Object.fromEntries(
                allowed.filter((k) => v[k] !== undefined).map((k) => [k, v[k]]),
              ),
              interview_credits: {
                TEXT: v.text_credits,
                VOICE: v.voice_credits,
                VIDEO: v.video_credits,
              },
            },
          );
        }}
      />
      <EditModal
        title="发布商品"
        open={!!publishing}
        onClose={() => setPublishing(null)}
        description={`${publishing?.name || ""} · ${money(publishing?.amount_minor)} · ${publishing ? entitlementText(publishing) : ""}，确认后立即发布。`}
        fields={[reasonField]}
        busy={action.busy}
        onSubmit={(values) =>
          action.run(
            `/products/${publishing?.id}/publish`,
            "POST",
            values,
            "商品已发布，立即生效",
          )
        }
      />
      <EditModal
        title="下线商品"
        open={!!offlining}
        onClose={() => setOfflining(null)}
        description={`${offlining?.name || ""} 下线后将不再用于新订单，历史订单与已发放权益不受影响。`}
        fields={[reasonField]}
        busy={action.busy}
        onSubmit={(values) =>
          action.run(
            `/products/${offlining?.id}/offline`,
            "POST",
            values,
            "商品已下线",
          )
        }
      />
    </>
  );
}
export function PaymentsPage() {
  const query = useQuery({
    queryKey: ["payments"],
    queryFn: () => api("/payment-channels"),
  });
  const [channel, setChannel] = useState("");
  const action = useAction();
  return (
    <>
      <Heading
        title="支付渠道"
        description="集中管理微信与支付宝配置，确保每次渠道变更清晰可追溯。"
      />
      <Alert
        className="page-alert"
        type="warning"
        showIcon
        message="真实支付适配器尚未配置"
        description="当前支持加密保存商户配置与密钥引用，保存后立即生效。配置校验仅检查已保存状态，不会发起真实交易；渠道启用暂不可用。"
      />
      <ErrorView error={query.error} retry={() => query.refetch()} />
      <div className="payment-grid">
        {["WECHAT", "ALIPAY"].map((ch) => {
          const configs =
            query.data?.items.filter((p: Row) => p.channel === ch) || [];
          return (
            <section key={ch} className="panel payment-card">
              <div className="payment-card-top">
                <span className={`payment-logo ${ch.toLowerCase()}`}>
                  {ch === "WECHAT" ? "微" : "支"}
                </span>
                <div>
                  <h2>{ch === "WECHAT" ? "微信支付" : "支付宝"}</h2>
                  <span className="muted">
                    {ch === "WECHAT" ? "WeChat Pay" : "Alipay"}
                  </span>
                </div>
                <Tag bordered={false}>
                  {configs.length ? "已配置 · 未接通" : "待配置"}
                </Tag>
              </div>
              <Descriptions
                column={1}
                items={[
                  {
                    key: "products",
                    label: "规划支付产品",
                    children:
                      ch === "WECHAT"
                        ? "Native 扫码 / H5 / JSAPI"
                        : "网页支付 / 当面付",
                  },
                  {
                    key: "secret",
                    label: "密钥管理",
                    children: "KMS / Secrets / Vault 引用",
                  },
                  { key: "status", label: "真实支付", children: "未接入" },
                ]}
              />
              {configs.map((config: Row) => (
                <div key={config.id} className="payment-config">
                  <Tag>{config.environment}</Tag>
                  <span>
                    v{config.version} · 商户 {config.merchant_id}
                  </span>
                  <p className="muted">回调：{config.notify_url}</p>
                </div>
              ))}
              <div className="payment-actions">
                {can("payment:write") && (
                  <>
                    <Button type="primary" onClick={() => setChannel(ch)}>
                      配置渠道
                    </Button>
                    <Button
                      loading={action.busy}
                      onClick={() =>
                        action.run(
                          `/payment-channels/${ch}/validate`,
                          "POST",
                          {},
                          "校验完成：真实渠道适配器尚未配置",
                        )
                      }
                    >
                      校验配置
                    </Button>
                  </>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <div className="secure-note">
        <ShieldCheck size={18} />
        <div>
          <strong>密钥只留引用，变更留有记录</strong>
          <p>
            无需在后台输入或展示支付私钥。生产配置与沙箱配置分离，所有修改保留审计记录。
          </p>
        </div>
      </div>
      <EditModal
        title={`配置${channel === "WECHAT" ? "微信支付" : "支付宝"}`}
        open={!!channel}
        onClose={() => setChannel("")}
        initial={{ environment: "sandbox" }}
        fields={[
          {
            name: "environment",
            label: "渠道环境",
            node: (
              <Select
                options={[
                  { value: "sandbox", label: "沙箱环境" },
                  { value: "production", label: "生产环境" },
                ]}
              />
            ),
          },
          { name: "merchant_id", label: "商户号" },
          { name: "app_id", label: "App ID" },
          {
            name: "secret_ref",
            label: "密钥托管引用",
            node: <Input placeholder="kms://payment/merchant-key" />,
            rules: [
              {
                pattern: /^(kms|secrets|vault):\/\/[a-zA-Z0-9/_.:-]{3,200}$/,
                message: "请输入有效的密钥托管引用",
              },
            ],
          },
          {
            name: "notify_url",
            label: "支付通知地址",
            node: (
              <Input placeholder="https://api.example.com/payments/notify" />
            ),
            rules: [
              {
                pattern: /^https:\/\/[^\s]{5,450}$/,
                message: "请输入 HTTPS 地址",
              },
            ],
          },
          reasonField,
        ]}
        busy={action.busy}
        onSubmit={(values) =>
          action.run(
            `/payment-channels/${channel}`,
            "PUT",
            { ...values, enabled: false },
            "配置已保存，立即生效",
          )
        }
      />
    </>
  );
}
