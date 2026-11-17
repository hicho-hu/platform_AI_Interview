import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Timeline,
} from "antd";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api, can, dateTime, money, shortId } from "../api";
import type { Row } from "../api";
import { ErrorView, Id, Loading, modeLabel, Status } from "../components";
import { Heading } from "./Dashboard";
import {
  DataTable,
  EditModal,
  reasonField,
  statusOptions,
  useAction,
} from "./shared";
export function UsersPage() {
  const [selected, setSelected] = useState<Row | null>(null);
  const [action, setAction] = useState("");
  const mutation = useAction();
  const detail = useQuery({
    queryKey: ["user", selected?.uid],
    queryFn: () => api(`/users/${selected!.uid}`),
    enabled: !!selected,
  });
  const d = detail.data;
  return (
    <>
      <Heading
        title="用户中心"
        description="了解用户的训练旅程，及时响应每一个服务需求。"
      />
      <DataTable
        path="/users"
        filters={[
          {
            key: "status",
            placeholder: "账户状态",
            options: statusOptions(["ACTIVE", "FROZEN"]),
          },
        ]}
        columns={[
          {
            title: "用户",
            key: "user",
            render: (_, r) => (
              <div className="user-cell">
                <span className="user-avatar">{r.nickname?.slice(0, 1)}</span>
                <div>
                  <strong>{r.nickname}</strong>
                  <small>
                    <Id value={r.uid} />
                  </small>
                </div>
              </div>
            ),
          },
          {
            title: "账户状态",
            dataIndex: "status",
            render: (v) => <Status value={v} />,
          },
          { title: "面试次数", dataIndex: "interview_count" },
          {
            title: "剩余额度",
            render: (_, r) => `${r.remaining_interviews ?? r.credits} 次`,
          },
          { title: "累计支付", dataIndex: "paid_minor", render: money },
          { title: "注册时间", dataIndex: "created_at", render: dateTime },
          {
            title: "操作",
            render: (_, r) => (
              <Button type="link" onClick={() => setSelected(r)}>
                查看详情
              </Button>
            ),
          },
        ]}
      />
      <Drawer
        title="用户详情"
        open={!!selected}
        onClose={() => setSelected(null)}
        width={780}
        destroyOnHidden
      >
        <ErrorView error={detail.error} retry={() => detail.refetch()} />
        <Loading loading={detail.isLoading}>
          {d && (
            <>
              <div className="detail-summary">
                <div>
                  <h2>{d.nickname}</h2>
                  <span className="mono">UID {d.uid}</span>
                </div>
                <Status value={d.status} />
              </div>
              <Descriptions
                column={2}
                items={[
                  {
                    key: "credits",
                    label: "可用次数",
                    children: `${d.remaining_interviews ?? d.credits} 次`,
                  },
                  {
                    key: "mode-credits",
                    label: "分类次数",
                    span: 2,
                    children: d.interview_credits
                      ? `文字 ${d.interview_credits.TEXT} 次 · 语音 ${d.interview_credits.VOICE} 次 · 视频 ${d.interview_credits.VIDEO} 次 · 通用 ${d.universal_interviews} 次`
                      : `通用 ${d.credits} 次`,
                  },
                  {
                    key: "created",
                    label: "注册时间",
                    children: dateTime(d.created_at),
                  },
                ]}
              />
              <Space className="detail-actions">
                {can("user:update") && (
                  <Button
                    danger={d.status === "ACTIVE"}
                    onClick={() => setAction("status")}
                  >
                    {d.status === "ACTIVE" ? "冻结账户" : "解除冻结"}
                  </Button>
                )}
                {can("entitlement:grant") && (
                  <Button type="primary" onClick={() => setAction("grant")}>
                    补发权益
                  </Button>
                )}
              </Space>
              <Tabs
                items={[
                  {
                    key: "usage",
                    label: "权益流水",
                    children: (
                      <Table<Row>
                        rowKey="id"
                        dataSource={d.usage.items}
                        pagination={false}
                        columns={[
                          { title: "类型", dataIndex: "usage_type" },
                          { title: "次数变动", dataIndex: "quantity" },
                          {
                            title: "次数明细",
                            render: (_, r) =>
                              Object.entries(r.credit_allocations ?? {})
                                .map(
                                  ([mode, quantity]) =>
                                    `${({ TEXT: "文字", VOICE: "语音", VIDEO: "视频", UNIVERSAL: "通用" } as Record<string, string>)[mode]} ${quantity}`,
                                )
                                .join(" · "),
                          },
                          {
                            title: "状态",
                            dataIndex: "status",
                            render: (v) => <Status value={v} />,
                          },
                          {
                            title: "时间",
                            dataIndex: "created_at",
                            render: dateTime,
                          },
                        ]}
                      />
                    ),
                  },
                  {
                    key: "history",
                    label: "面试记录",
                    children: (
                      <Table<Row>
                        rowKey="id"
                        pagination={false}
                        dataSource={d.interviews.items}
                        columns={[
                          { title: "岗位", dataIndex: "job_title" },
                          {
                            title: "模式",
                            dataIndex: "mode",
                            render: (v) => modeLabel[v],
                          },
                          {
                            title: "状态",
                            dataIndex: "status",
                            render: (v) => <Status value={v} />,
                          },
                        ]}
                      />
                    ),
                  },
                  {
                    key: "consents",
                    label: "用户授权",
                    children: (
                      <Table<Row>
                        rowKey="id"
                        dataSource={d.consents}
                        pagination={false}
                        columns={[
                          { title: "授权类型", dataIndex: "consent_type" },
                          { title: "协议版本", dataIndex: "policy_version" },
                          {
                            title: "授权时间",
                            dataIndex: "created_at",
                            render: dateTime,
                          },
                          {
                            title: "状态",
                            render: (_, r) => (
                              <Tag color={r.revoked_at ? "default" : "success"}>
                                {r.revoked_at ? "已撤销" : "有效"}
                              </Tag>
                            ),
                          },
                        ]}
                      />
                    ),
                  },
                ]}
              />
            </>
          )}
        </Loading>
      </Drawer>
      <EditModal
        title={
          action === "grant"
            ? "补发面试额度"
            : d?.status === "ACTIVE"
              ? "冻结用户账户"
              : "解除账户冻结"
        }
        open={!!action}
        onClose={() => setAction("")}
        busy={mutation.busy}
        description={
          action === "grant"
            ? "提交后立即增加用户面试额度，并写入权益账本和操作审计。"
            : "账号状态变更将立即生效，并记录操作审计。"
        }
        fields={
          action === "grant"
            ? [
                {
                  name: "mode",
                  label: "面试类型",
                  node: (
                    <Select
                      options={[
                        { value: "TEXT", label: "文字面试" },
                        { value: "VOICE", label: "语音面试" },
                        { value: "VIDEO", label: "视频面试" },
                        { value: "UNIVERSAL", label: "通用次数（兼容旧权益）" },
                      ]}
                    />
                  ),
                },
                {
                  name: "quantity",
                  label: "补发次数",
                  node: <InputNumber min={1} max={1000} />,
                },
                {
                  name: "ticket",
                  label: "关联工单号（选填）",
                  required: false,
                },
                reasonField,
              ]
            : [reasonField]
        }
        initial={{ quantity: 1, mode: "TEXT" }}
        onSubmit={(values) =>
          mutation.run(
            `/users/${selected?.uid}/${action === "grant" ? "entitlements" : "status"}`,
            action === "grant" ? "POST" : "PATCH",
            action === "grant"
              ? values
              : {
                  ...values,
                  status: d?.status === "ACTIVE" ? "FROZEN" : "ACTIVE",
                },
            action === "grant" ? "权益已补发，立即生效" : "账户状态已更新",
          )
        }
      />
    </>
  );
}
export function InterviewsPage() {
  const [params] = useSearchParams();
  const [selected, setSelected] = useState<Row | null>(null);
  const [action, setAction] = useState("");
  const [asset, setAsset] = useState<Row | null>(null);
  const [play, setPlay] = useState<Row | null>(null);
  const [content, setContent] = useState<Row | null>(null);
  const mutation = useAction();
  const detail = useQuery({
    queryKey: ["interview", selected?.id],
    queryFn: () => api(`/interviews/${selected!.id}`),
    enabled: !!selected,
  });
  const d = detail.data;
  useEffect(() => {
    setContent(null);
    setPlay(null);
  }, [selected?.id]);
  useEffect(() => {
    if (!play) return;
    const timer = setTimeout(() => setPlay(null), play.expires_in * 1000);
    return () => clearTimeout(timer);
  }, [play]);
  return (
    <>
      <Heading
        title="面试中心"
        description="追踪每一场训练，连接面试过程、评估结果与质量反馈。"
      />
      <DataTable
        path={`/interviews?${params}`}
        filters={[
          {
            key: "mode",
            placeholder: "面试模式",
            options: ["TEXT", "VOICE", "VIDEO"].map((value) => ({
              value,
              label: modeLabel[value],
            })),
          },
          {
            key: "status",
            placeholder: "面试状态",
            options: statusOptions([
              "COMPLETED",
              "IN_PROGRESS",
              "READY",
              "PREPARING",
              "FINISHING",
              "REPORT_FAILED",
              "FAILED",
              "CANCELLED",
            ]),
          },
        ]}
        columns={[
          {
            title: "面试 / 岗位",
            render: (_, r) => (
              <div className="stack">
                <strong>{r.job_title}</strong>
                <Id value={r.id} />
              </div>
            ),
          },
          {
            title: "用户",
            render: (_, r) => (
              <div className="stack">
                <span>{r.nickname}</span>
                <Id value={r.user_uid} />
              </div>
            ),
          },
          {
            title: "面试模式",
            dataIndex: "mode",
            render: (v) => <Tag bordered={false}>{modeLabel[v]}</Tag>,
          },
          {
            title: "状态",
            dataIndex: "status",
            render: (v) => <Status value={v} />,
          },
          { title: "题目轮次", dataIndex: "current_turn_no" },
          { title: "创建时间", dataIndex: "created_at", render: dateTime },
          {
            title: "操作",
            render: (_, r) => (
              <Button type="link" onClick={() => setSelected(r)}>
                查看详情
              </Button>
            ),
          },
        ]}
      />
      <Drawer
        title="面试详情"
        width={900}
        open={!!selected}
        onClose={() => {
          setSelected(null);
          setContent(null);
          setPlay(null);
        }}
        destroyOnHidden
      >
        <ErrorView error={detail.error} retry={() => detail.refetch()} />
        <Loading loading={detail.isLoading}>
          {d && (
            <>
              <div className="detail-summary">
                <div>
                  <h2>{d.job_title}</h2>
                  <span className="mono">{d.id}</span>
                </div>
                <Status value={d.status} />
              </div>
              <Descriptions
                column={3}
                items={[
                  {
                    key: "user",
                    label: "用户 UID",
                    children: <Id value={d.user_uid} />,
                  },
                  { key: "mode", label: "模式", children: modeLabel[d.mode] },
                  {
                    key: "score",
                    label: "综合评分",
                    children: d.report?.overall_score ?? "—",
                  },
                  {
                    key: "start",
                    label: "开始时间",
                    children: dateTime(d.started_at),
                  },
                  {
                    key: "end",
                    label: "结束时间",
                    children: dateTime(d.ended_at),
                  },
                  { key: "turn", label: "轮次数", children: d.current_turn_no },
                ]}
              />
              {d.failure_code && (
                <Alert
                  type="warning"
                  message={`异常代码：${d.failure_code}`}
                  showIcon
                />
              )}
              <Space className="detail-actions">
                {can("interview:content") && (
                  <Button
                    type="primary"
                    loading={mutation.busy}
                    onClick={async () => {
                      const result = await mutation.run(
                        `/interviews/${selected?.id}/review`,
                        "POST",
                        { reason: "管理员查阅面试内容" },
                        "面试内容已加载",
                      );
                      if (result) setContent(result);
                    }}
                  >
                    查看面试内容
                  </Button>
                )}
                {can("report:retry") &&
                  ["COMPLETED", "REPORT_FAILED"].includes(d.status) && (
                    <Button onClick={() => setAction("retry-report")}>
                      重试生成报告
                    </Button>
                  )}
              </Space>
              <Tabs
                items={[
                  {
                    key: "timeline",
                    label: "文字时间轴",
                    children: content ? (
                      <Timeline
                        items={content.turns.map((t: Row) => ({
                          children: (
                            <div className="turn">
                              <div className="turn-heading">
                                <Tag>
                                  第 {t.turn_no} 轮 ·{" "}
                                  {t.turn_type === "MAIN" ? "主问题" : "追问"}
                                </Tag>
                                <span>{t.competency}</span>
                              </div>
                              <h4>{t.question}</h4>
                              <p>{t.answer || "本轮暂无回答"}</p>
                              {t.decision && (
                                <small className="muted">
                                  AI 决策：{t.decision.action} ·{" "}
                                  {t.decision.reason}
                                </small>
                              )}
                            </div>
                          ),
                        }))}
                      />
                    ) : (
                      <Alert
                        showIcon
                        type="info"
                        message="查看面试问答与评估报告"
                        description="点击上方“查看面试内容”即可加载。"
                      />
                    ),
                  },
                  {
                    key: "report",
                    label: "评估报告",
                    children: content?.report ? (
                      <div className="report">
                        <h2>
                          综合评分 {content.report.overall_score ?? "无法判断"}
                        </h2>
                        <p>{content.report.job_match_feedback}</p>
                        {content.report.dimensions?.map((dim: Row) => (
                          <div className="report-dimension" key={dim.name}>
                            <h4>
                              {dim.name}
                              <strong>{dim.score ?? "无法判断"}</strong>
                            </h4>
                            <p>{dim.feedback}</p>
                            {dim.evidence?.map((e: string) => (
                              <blockquote key={e}>{e}</blockquote>
                            ))}
                          </div>
                        ))}
                        <h3>改进建议</h3>
                        {content.report.recommendations?.map((s: string) => (
                          <p key={s}>· {s}</p>
                        ))}
                        <Alert
                          message={content.report.disclaimer}
                          type="info"
                        />
                      </div>
                    ) : (
                      <Alert
                        type="info"
                        message="评估报告将在加载面试内容后显示"
                      />
                    ),
                  },
                  {
                    key: "media",
                    label: `音视频记录 (${d.media.length})`,
                    children: (
                      <>
                        <Table<Row>
                          rowKey="id"
                          dataSource={d.media}
                          columns={[
                            {
                              title: "媒体",
                              render: (_, r) => (
                                <div className="stack">
                                  <strong>{r.media_type}</strong>
                                  <Id value={r.id} />
                                </div>
                              ),
                            },
                            {
                              title: "状态",
                              dataIndex: "status",
                              render: (v) => <Status value={v} />,
                            },
                            {
                              title: "时长",
                              dataIndex: "duration_ms",
                              render: (v) =>
                                v ? `${(v / 1000).toFixed(1)} 秒` : "—",
                            },
                            {
                              title: "保留至",
                              dataIndex: "expires_at",
                              render: dateTime,
                            },
                            {
                              title: "操作",
                              render: (_, r) =>
                                can("media:play") && (
                                  <Button
                                    type="link"
                                    loading={
                                      mutation.busy && asset?.id === r.id
                                    }
                                    onClick={async () => {
                                      setAsset(r);
                                      const result = await mutation.run(
                                        `/media/${r.id}/playback-grant`,
                                        "POST",
                                        { reason: "管理员播放面试录制" },
                                        "播放地址已生成",
                                      );
                                      if (result) setPlay(result);
                                    }}
                                  >
                                    直接播放
                                  </Button>
                                ),
                            },
                          ]}
                          pagination={false}
                        />
                        {play && (
                          <div className="media-player">
                            {play.media_type.includes("VIDEO") ? (
                              <video
                                key={play.url}
                                src={play.url}
                                controls
                                controlsList="nodownload"
                                autoPlay={false}
                              />
                            ) : (
                              <audio
                                key={play.url}
                                src={play.url}
                                controls
                                controlsList="nodownload"
                              />
                            )}
                            <p className="muted">
                              播放地址短期有效；到期后再次点击“直接播放”即可。
                            </p>
                          </div>
                        )}
                      </>
                    ),
                  },
                  {
                    key: "calls",
                    label: "AI 调用轨迹",
                    children: (
                      <Table<Row>
                        rowKey="id"
                        dataSource={d.calls}
                        pagination={false}
                        columns={[
                          { title: "模型", dataIndex: "model" },
                          { title: "调用", dataIndex: "call_type" },
                          {
                            title: "耗时",
                            dataIndex: "latency_ms",
                            render: (v) => `${v} ms`,
                          },
                          {
                            title: "Token",
                            render: (_, r) => r.input_tokens + r.output_tokens,
                          },
                          {
                            title: "费用",
                            dataIndex: "cost_microunits",
                            render: (v) => `¥${(v / 1000000).toFixed(4)}`,
                          },
                          {
                            title: "状态",
                            dataIndex: "status",
                            render: (v) => <Status value={v} />,
                          },
                        ]}
                      />
                    ),
                  },
                ]}
              />
            </>
          )}
        </Loading>
      </Drawer>
      <EditModal
        title={"重试生成面试报告"}
        open={action === "retry-report"}
        onClose={() => setAction("")}
        fields={[reasonField]}
        busy={mutation.busy}
        onSubmit={async (values) => {
          const result = await mutation.run(
            `/interviews/${selected?.id}/retry-report`,
            "POST",
            values,
          );
          return result;
        }}
      />
    </>
  );
}
export function QualityPage() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const action = useAction();
  const assignees = useQuery({
    queryKey: ["assignees"],
    queryFn: () => api("/quality-assignees"),
    enabled: can("quality:assign"),
  });
  return (
    <>
      <Heading
        title="质量抽检"
        description="从具体问题出发，持续改善 AI 面试体验与评估质量。"
        extra={
          can("quality:assign") && (
            <Button
              type="primary"
              icon={<Plus size={16} />}
              onClick={() => setOpen(true)}
            >
              创建抽检任务
            </Button>
          )
        }
      />
      <DataTable
        path="/quality-tasks"
        columns={[
          { title: "任务", dataIndex: "id", render: (v) => <Id value={v} /> },
          {
            title: "面试 ID",
            dataIndex: "interview_id",
            render: (v) => <Id value={v} />,
          },
          { title: "抽检原因", dataIndex: "reason" },
          {
            title: "受派人",
            dataIndex: "assignee_id",
            render: (v) => shortId(v),
          },
          {
            title: "状态",
            dataIndex: "status",
            render: (v) => <Status value={v} />,
          },
          { title: "创建时间", dataIndex: "created_at", render: dateTime },
          {
            title: "操作",
            render: (_, r) =>
              can("quality:update") && (
                <Button type="link" onClick={() => setSelected(r)}>
                  处理任务
                </Button>
              ),
          },
        ]}
      />
      <EditModal
        title="创建质量抽检任务"
        open={open}
        onClose={() => setOpen(false)}
        busy={action.busy}
        fields={[
          { name: "interview_id", label: "面试 ID" },
          {
            name: "assignee_id",
            label: "分派质检人员",
            node: (
              <Select
                options={assignees.data?.items.map((a: Row) => ({
                  label: a.display_name,
                  value: a.id,
                }))}
              />
            ),
          },
          reasonField,
        ]}
        onSubmit={(values) => action.run("/quality-tasks", "POST", values)}
      />
      <EditModal
        title="处理质量抽检任务"
        open={!!selected}
        initial={selected || {}}
        onClose={() => setSelected(null)}
        busy={action.busy}
        fields={[
          {
            name: "status",
            label: "处理状态",
            node: (
              <Select
                options={[
                  { value: "PENDING", label: "待审阅" },
                  { value: "IN_REVIEW", label: "审阅中" },
                  { value: "COMPLETED", label: "已完成" },
                  { value: "NEEDS_FIX", label: "需整改" },
                ]}
              />
            ),
          },
          {
            name: "tags",
            label: "问题标签",
            required: false,
            node: (
              <Select
                mode="multiple"
                options={[
                  ["ASR_ERROR", "ASR 转写错误"],
                  ["REPEATED_QUESTION", "重复提问"],
                  ["OFF_TOPIC", "跑题追问"],
                  ["NO_EVIDENCE", "评分缺少证据"],
                  ["REPORT_FAILED", "报告生成失败"],
                  ["OTHER", "其他问题"],
                ].map(([value, label]) => ({ value, label }))}
              />
            ),
          },
          {
            name: "conclusion",
            label: "处理结论",
            node: <Input.TextArea rows={4} />,
            rules: [{ min: 5, message: "处理结论至少 5 个字" }],
          },
        ]}
        onSubmit={(values) =>
          action.run(`/quality-tasks/${selected?.id}`, "PATCH", {
            ...values,
            tags: values.tags || [],
          })
        }
      />
    </>
  );
}
