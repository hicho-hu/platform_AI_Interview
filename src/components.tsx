import { useEffect, useRef } from "react";
import { Alert, Button, Empty, Spin, Tag, Tooltip } from "antd";
import { RefreshCw } from "lucide-react";
import * as echarts from "echarts/core";
import type { EChartsOption } from "echarts";
import { LineChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
echarts.use([
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  SVGRenderer,
]);
import { ApiError, shortId } from "./api";
import type { Row } from "./api";
const labels: Record<string, [string, string]> = {
  ACTIVE: ["正常", "success"],
  FROZEN: ["已冻结", "error"],
  DISABLED: ["已停用", "default"],
  COMPLETED: ["已完成", "success"],
  IN_PROGRESS: ["面试中", "processing"],
  PAUSED: ["已暂停", "warning"],
  PREPARING: ["准备中", "processing"],
  READY: ["已就绪", "blue"],
  FINISHING: ["报告生成中", "processing"],
  REPORT_FAILED: ["报告异常", "error"],
  FAILED: ["失败", "error"],
  CANCELLED: ["已取消", "default"],
  PENDING: ["待处理", "warning"],
  PAID: ["已支付", "success"],
  REFUNDED: ["已退款", "default"],
  DRAFT: ["草稿", "default"],
  IN_REVIEW: ["审核中", "processing"],
  PUBLISHED: ["已发布", "success"],
  RETIRED: ["已停用", "default"],
  APPROVED: ["已通过", "success"],
  REJECTED: ["已驳回", "error"],
  SUCCEEDED: ["已成功", "success"],
  NEEDS_FIX: ["需整改", "error"],
  MATCHED: ["一致", "success"],
  DIFFERENCES: ["存在差异", "warning"],
  SUCCESS: ["成功", "success"],
  DENIED: ["拒绝", "error"],
  OPEN: ["待处理", "warning"],
  RESOLVED: ["已处理", "success"],
};
export function Status({ value }: { value: string }) {
  const [label, color] = labels[value] || [value || "—", "default"];
  return (
    <Tag bordered={false} color={color}>
      <span className="status-dot" />
      {label}
    </Tag>
  );
}
export function Id({ value }: { value?: string }) {
  return (
    <Tooltip title={value}>
      <span className="mono">{shortId(value)}</span>
    </Tooltip>
  );
}
export function ErrorView({
  error,
  retry,
}: {
  error: Error | null;
  retry?: () => void;
}) {
  return error ? (
    <Alert
      className="error-box"
      type="error"
      showIcon
      message={error.message}
      description={
        error instanceof ApiError && error.requestId
          ? `请求编号：${error.requestId}`
          : undefined
      }
      action={retry && <Button onClick={retry}>重试</Button>}
    />
  ) : null;
}
export function Section({
  title,
  subtitle,
  extra,
  children,
}: {
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {extra}
      </div>
      {children}
    </section>
  );
}
export function Chart({
  option,
  height = 260,
}: {
  option: EChartsOption;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, null, { renderer: "svg" });
    chart.setOption(option);
    const obs = new ResizeObserver(() => chart.resize());
    obs.observe(ref.current);
    return () => {
      obs.disconnect();
      chart.dispose();
    };
  }, [option]);
  return (
    <div
      role="img"
      aria-label="数据统计图表"
      ref={ref}
      style={{ height, width: "100%" }}
    />
  );
}
export function Loading({
  children,
  loading,
}: {
  children: React.ReactNode;
  loading: boolean;
}) {
  return <Spin spinning={loading}>{children}</Spin>;
}
export function Metric({
  label,
  value,
  hint,
  icon,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`metric ${accent ? "metric-accent" : ""}`}>
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <div className="metric-hint">{hint}</div>
    </div>
  );
}
export function Refresh({ onClick }: { onClick: () => void }) {
  return (
    <Button icon={<RefreshCw size={15} />} onClick={onClick}>
      刷新数据
    </Button>
  );
}
export const empty = (
  <Empty
    image={Empty.PRESENTED_IMAGE_SIMPLE}
    description="暂无符合条件的数据"
  />
);
export const modeLabel: Row = {
  TEXT: "文字面试",
  VOICE: "语音面试",
  VIDEO: "视频面试",
};
