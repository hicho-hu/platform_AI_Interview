import { useEffect, useRef, useState } from "react";
import { App, Button, Form, Input, Modal, Select, Table } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { ColumnsType } from "antd/es/table";
import type { Page, Row } from "../api";
import { api } from "../api";
import { empty, ErrorView, Refresh } from "../components";
const searchHints: Record<string, string> = {
  "/users": "输入 UID 或昵称搜索",
  "/interviews": "输入 UID、面试号或岗位搜索",
  "/orders": "输入 UID 或订单号搜索",
  "/audit-logs": "输入操作类型或用户 UID",
};
export function useAction() {
  const { message } = App.useApp();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const keys = useRef(new Map<string, string>());
  async function run(
    path: string,
    method: string,
    values: unknown,
    success = "操作成功",
  ) {
    setBusy(true);
    try {
      const signature = JSON.stringify([path, method, values]);
      const key = keys.current.get(signature) || crypto.randomUUID();
      keys.current.set(signature, key);
      const result = await api(path, method, values, key);
      keys.current.delete(signature);
      message.success(success);
      await client.invalidateQueries();
      return result;
    } catch (e) {
      message.error((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  return { run, busy };
}
export function DataTable({
  path,
  columns,
  filters,
  extra,
  refreshKey = "",
  onRowClick,
}: {
  path: string;
  columns: ColumnsType<Row>;
  filters?: {
    key: string;
    placeholder: string;
    options: { label: string; value: string }[];
  }[];
  extra?: React.ReactNode;
  refreshKey?: string;
  onRowClick?: (row: Row) => void;
}) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const searchEnabled = [
    "/users",
    "/interviews",
    "/orders",
    "/audit-logs",
  ].includes(path.split("?")[0]);
  const initialQuery =
    new URLSearchParams(path.split("?")[1] || "").get("q") || "";
  useEffect(() => {
    setQ(initialQuery);
    setInput(initialQuery);
    setPage(1);
  }, [initialQuery]);
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(size),
    q,
    ...values,
  });
  const query = useQuery({
    queryKey: [path, params.toString(), refreshKey],
    queryFn: () => api<Page>(`${path.split("?")[0]}?${params}`),
  });
  return (
    <section className="panel table-panel">
      <div className="table-toolbar">
        {searchEnabled && (
          <Input
            style={{ width: 270 }}
            prefix={<Search size={15} />}
            placeholder={searchHints[path.split("?")[0]] || "输入关键词搜索"}
            value={input}
            allowClear
            onChange={(e) => {
              setInput(e.target.value);
              if (!e.target.value) {
                setQ("");
                setPage(1);
              }
            }}
            onPressEnter={() => {
              setQ(input);
              setPage(1);
            }}
          />
        )}
        {filters?.map((f) => (
          <Select
            key={f.key}
            style={{ minWidth: 130 }}
            placeholder={f.placeholder}
            value={values[f.key] || undefined}
            allowClear
            options={f.options}
            onChange={(v) => {
              setValues({ ...values, [f.key]: v || "" });
              setPage(1);
            }}
          />
        ))}
        {searchEnabled && (
          <Button
            onClick={() => {
              setQ(input);
              setPage(1);
            }}
          >
            查询
          </Button>
        )}
        <div className="toolbar-spacer" />
        {extra}
        <Refresh onClick={() => query.refetch()} />
      </div>
      <ErrorView error={query.error} retry={() => query.refetch()} />
      <Table<Row>
        rowKey="id"
        size="middle"
        loading={query.isLoading}
        columns={columns}
        dataSource={query.data?.items || []}
        scroll={{ x: 850 }}
        locale={{ emptyText: empty }}
        pagination={{
          current: page,
          pageSize: size,
          total: query.data?.total || 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          showTotal: (t) => `共 ${t} 条记录`,
          onChange: (p, s) => {
            setPage(p);
            setSize(s);
          },
        }}
        onRow={(row) => ({
          onClick: () => onRowClick?.(row),
          style: onRowClick ? { cursor: "pointer" } : undefined,
        })}
      />
    </section>
  );
}
export type FormField = {
  name: string;
  label: string;
  required?: boolean;
  node?: React.ReactNode;
  rules?: Row[];
};
export function EditModal({
  title,
  open,
  onClose,
  fields,
  initial,
  onSubmit,
  busy,
  description,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  fields: FormField[];
  initial?: Row;
  onSubmit: (values: Row) => Promise<unknown>;
  busy?: boolean;
  description?: React.ReactNode;
}) {
  const [form] = Form.useForm();
  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue(initial || {});
    }
  }, [open, form]);
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      destroyOnHidden
      onOk={() => form.submit()}
      confirmLoading={busy}
      okText="确认提交"
      cancelText="取消"
    >
      <div className="modal-description">{description}</div>
      <Form
        form={form}
        layout="vertical"
        onFinish={async (values) => {
          if (await onSubmit(values)) onClose();
        }}
        initialValues={initial}
        preserve={false}
      >
        {fields.map((f) => (
          <Form.Item
            key={f.name}
            name={f.name}
            label={f.label}
            rules={[
              ...(f.required === false
                ? []
                : [{ required: true, message: `请填写${f.label}` }]),
              ...(f.rules || []),
            ]}
          >
            {f.node || <Input />}
          </Form.Item>
        ))}
      </Form>
    </Modal>
  );
}
export const reasonField: FormField = {
  name: "reason",
  label: "操作原因",
  node: (
    <Input.TextArea
      rows={3}
      placeholder="请填写业务原因，至少 5 个字"
      maxLength={500}
      showCount
    />
  ),
  rules: [{ min: 5, message: "请至少填写 5 个字" }],
};
export const statusOptions = (values: string[]) =>
  values.map((value) => ({
    value,
    label:
      (
        {
          ACTIVE: "正常",
          FROZEN: "已冻结",
          COMPLETED: "已完成",
          IN_PROGRESS: "面试中",
          REPORT_FAILED: "报告异常",
          FAILED: "失败",
          CANCELLED: "已取消",
          PENDING: "待支付",
          PAID: "已支付",
          REFUNDED: "已退款",
          READY: "已就绪",
          PREPARING: "准备中",
          FINISHING: "报告生成中",
          PAUSED: "暂停",
        } as Record<string, string>
      )[value] || value,
  }));
