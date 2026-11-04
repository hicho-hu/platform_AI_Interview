import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Radio, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowRight,
  AudioLines,
  CalendarDays,
  CheckCheck,
  CircleDollarSign,
  FileCheck2,
  Users,
} from "lucide-react";
import { api, can, dateTime, money, useSession } from "../api";
import {
  Chart,
  ErrorView,
  Loading,
  Metric,
  Refresh,
  Section,
} from "../components";
export function usePeriod() {
  const [days, setDays] = useState(7);
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days + 1);
  const local = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  return {
    days,
    setDays,
    query: `start=${local(start)}&end=${local(end)}`,
    label: `${local(start)} — ${local(end)}`,
  };
}
export function Heading({
  title,
  description,
  extra,
}: {
  title: string;
  description: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{extra}</div>
    </div>
  );
}
export function Dashboard() {
  const period = usePeriod();
  const navigate = useNavigate();
  const admin = useSession((s) => s.admin);
  const summary = useQuery({
    queryKey: ["overview", period.query],
    queryFn: () => api(`/dashboard/overview?${period.query}`),
  });
  const trend = useQuery({
    queryKey: ["trends", period.query],
    queryFn: () => api(`/dashboard/trends?${period.query}`),
  });
  const d = summary.data;
  const [metric, setMetric] = useState("interviews");
  const line = useMemo(
    () => ({
      tooltip: { trigger: "axis" as const },
      color: ["#7868e6", "#4eb8aa"],
      grid: { left: 37, right: 20, top: 25, bottom: 30 },
      legend: { show: false },
      xAxis: {
        type: "category" as const,
        boundaryGap: false,
        data: trend.data?.items.map((r: { date: string }) => r.date.slice(5)),
        axisLine: { lineStyle: { color: "#e9eaf1" } },
        axisTick: { show: false },
        axisLabel: { color: "#9398aa" },
      },
      yAxis: {
        type: "value" as const,
        minInterval: 1,
        axisLabel: { color: "#9398aa" },
        splitLine: { lineStyle: { color: "#f0f1f5", type: "dashed" as const } },
      },
      series: [
        {
          name: metric === "users" ? "新增用户" : "创建面试",
          type: "line" as const,
          smooth: true,
          symbolSize: 6,
          data: trend.data?.items.map((r: Record<string, number>) => r[metric]),
          lineStyle: { width: 3 },
          areaStyle: {
            color: new (class {
              type = "linear" as const;
              x = 0;
              y = 0;
              x2 = 0;
              y2 = 1;
              colorStops = [
                { offset: 0, color: "#7868e626" },
                { offset: 1, color: "#7868e600" },
              ];
            })(),
          },
        },
        ...(metric === "interviews"
          ? [
              {
                name: "完成面试",
                type: "line" as const,
                smooth: true,
                symbolSize: 5,
                data: trend.data?.items.map(
                  (r: { completed: number }) => r.completed,
                ),
                lineStyle: { width: 2 },
              },
            ]
          : []),
      ],
    }),
    [trend.data, metric],
  );
  const modes = d?.modes || [];
  const total = modes.reduce(
    (n: number, r: { value: number }) => n + r.value,
    0,
  );
  return (
    <>
      <Heading
        title="运营总览"
        description="每一份数据，都连接着一次成长。掌握平台运营的关键动态。"
        extra={
          <>
            <span className="date-pill">
              <CalendarDays size={15} />
              {period.label}
            </span>
            <Refresh
              onClick={() => {
                summary.refetch();
                trend.refetch();
              }}
            />
          </>
        }
      />
      <div className="welcome-banner">
        <div>
          <span className="eyebrow">YOUR PLATFORM AT A GLANCE</span>
          <h2>
            你好，{admin?.display_name} <span className="wave">✳</span>
          </h2>
          <p>从一次练习，到更好的自己。今天也让每一场面试更有价值。</p>
          <div className="welcome-meta">
            <span className="live-dot" /> 业务数据实时汇总 <span>·</span>{" "}
            Asia/Shanghai <span>·</span> CNY 人民币
          </div>
        </div>
        <div className="banner-art">
          <div className="art-circle c1" />
          <div className="art-circle c2" />
          <div className="art-card">
            <AudioLines size={35} />
            <div>
              <i />
              <i />
              <i />
            </div>
            <span>AI INTERVIEW</span>
          </div>
          <div className="art-badge">
            <CheckCheck size={16} /> 持续进步的每一天
          </div>
        </div>
      </div>
      <div className="section-toolbar">
        <div className="section-label">
          <span />
          核心数据<span className="muted small">运营指标概览</span>
        </div>
        <Radio.Group
          optionType="button"
          buttonStyle="solid"
          value={period.days}
          onChange={(e) => period.setDays(e.target.value)}
          options={[
            { label: "近 7 天", value: 7 },
            { label: "近 30 天", value: 30 },
            { label: "近 90 天", value: 90 },
          ]}
        />
      </div>
      <ErrorView error={summary.error} retry={() => summary.refetch()} />
      <Loading loading={summary.isLoading}>
        <div className="metric-grid">
          <Metric
            label="新增用户"
            value={d?.new_users ?? "—"}
            hint="统计周期内首次注册用户"
            icon={<Users size={18} />}
          />
          <Metric
            label="创建面试"
            value={d?.created_interviews ?? "—"}
            hint={`活跃面试用户 ${d?.active_users ?? "—"} 人`}
            icon={<AudioLines size={18} />}
          />
          <Metric
            label="面试完成率"
            value={`${d?.completion_rate ?? "—"}%`}
            hint={`已完成 ${d?.completed_interviews ?? "—"} / 已开始 ${d?.started_interviews ?? "—"}`}
            icon={<CheckCheck size={18} />}
          />
          <Metric
            label="净实收金额"
            value={d ? money(d.net_minor) : "—"}
            hint="支付成功金额 − 成功退款金额"
            icon={<CircleDollarSign size={18} />}
            accent
          />
        </div>
      </Loading>
      <div className="dashboard-charts">
        <Section
          title="平台增长趋势"
          subtitle="观察用户增长与面试训练情况"
          extra={
            <Radio.Group
              size="small"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              options={[
                { label: "面试", value: "interviews" },
                { label: "用户", value: "users" },
              ]}
              optionType="button"
            />
          }
        >
          <div className="chart-legend">
            <span>
              <i style={{ background: "#7868e6" }} />
              {metric === "users" ? "新增用户" : "创建面试"}
            </span>
            {metric === "interviews" && (
              <span>
                <i style={{ background: "#4eb8aa" }} />
                完成面试
              </span>
            )}
          </div>
          <ErrorView error={trend.error} retry={() => trend.refetch()} />
          <Chart option={line} />
        </Section>
        <Section title="面试模式分布" subtitle="了解用户选择的训练方式">
          <div className="donut-wrap">
            <Chart
              height={210}
              option={{
                color: ["#7965df", "#b7a8f4", "#e4dff9"],
                tooltip: { trigger: "item" },
                series: [
                  {
                    type: "pie",
                    radius: ["63%", "82%"],
                    center: ["50%", "50%"],
                    label: { show: false },
                    data: modes.map((r: { name: string; value: number }) => ({
                      name: (
                        {
                          TEXT: "文字面试",
                          VOICE: "语音面试",
                          VIDEO: "视频面试",
                        } as Record<string, string>
                      )[r.name],
                      value: r.value,
                      itemStyle: {
                        color: (
                          {
                            VOICE: "#7965df",
                            TEXT: "#b7a8f4",
                            VIDEO: "#e4dff9",
                          } as Record<string, string>
                        )[r.name],
                      },
                    })),
                    emptyCircleStyle: { color: "#f0edf9" },
                  },
                ],
              }}
            />
            <div className="donut-center">
              <strong>{total}</strong>
              <span>面试总数</span>
            </div>
          </div>
          <div className="mode-legend">
            {["VOICE", "TEXT", "VIDEO"].map((m, i) => (
              <div key={m}>
                <span>
                  <i
                    style={{ background: ["#7965df", "#b7a8f4", "#e4dff9"][i] }}
                  />
                  {
                    { TEXT: "文字面试", VOICE: "语音面试", VIDEO: "视频面试" }[
                      m as "TEXT"
                    ]
                  }
                </span>
                <strong>
                  {modes.find((r: { name: string }) => r.name === m)?.value ||
                    0}
                  <small> 场</small>
                </strong>
              </div>
            ))}
          </div>
        </Section>
      </div>
      <div className="dashboard-lower">
        <Section
          title="面试转化漏斗"
          subtitle="同一创建周期的面试进展，不包含未采集的访问行为"
        >
          <div className="funnel">
            {(
              d?.funnel ||
              ["创建面试", "开始面试", "完成面试", "生成报告"].map((name) => ({
                name,
                value: 0,
              }))
            ).map((f: { name: string; value: number }, i: number) => (
              <div className="funnel-row" key={f.name}>
                <span className="funnel-no">0{i + 1}</span>
                <span className="funnel-name">{f.name}</span>
                <div className="funnel-track">
                  <div
                    style={{
                      width: `${Math.max(2, (f.value / (d?.created_interviews || 1)) * 100)}%`,
                      opacity: 1 - i * 0.15,
                    }}
                  />
                </div>
                <strong>{f.value}</strong>
              </div>
            ))}
          </div>
        </Section>
        <Section
          title="运行与待办"
          subtitle="及时关注异常与处理进度"
          extra={
            can("interview:read") && (
              <Button type="link" onClick={() => navigate("/interviews")}>
                查看面试 <ArrowRight size={13} />
              </Button>
            )
          }
        >
          <div className="alerts-list">
            {(d?.alerts || []).map(
              (a: { name: string; value: number }, i: number) => (
                <div key={a.name}>
                  <span className={`alert-icon tone-${i}`}>
                    <FileCheck2 size={17} />
                  </span>
                  <span>{a.name}</span>
                  <strong>{a.value}</strong>
                  <Tag bordered={false} color={a.value ? "warning" : "success"}>
                    {a.value ? "待关注" : "正常"}
                  </Tag>
                </div>
              ),
            )}
          </div>
        </Section>
      </div>
      <div className="data-note">
        <ArrowDownLeft size={14} />
        <span>
          最后更新 {dateTime(d?.updated_at)} ·{" "}
          {d?.definition || "数据来自业务库聚合；暂无数据时显示为 0。"}
        </span>
      </div>
    </>
  );
}
