import { useState } from "react";
import { Alert, Button, Form, Input, Modal, Select, Space, Table, Tabs, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import { api, can, dateTime, type Page, type Row } from "../api";
import { ErrorView, Section, Status } from "../components";
import { useAction } from "./shared";

export default function QuestionBank() {
  const [tab, setTab] = useState("questions");
  const [company, setCompany] = useState<string>();
  const [position, setPosition] = useState<string>();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Row>();
  const [binding, setBinding] = useState<Row>();
  const [companyForm] = Form.useForm();
  const [bindingForm] = Form.useForm();
  const action = useAction();
  const companies = useQuery({ queryKey: ["question-companies"], queryFn: () => api<Row[]>("/question-bank/companies") });
  const positions = useQuery({ queryKey: ["question-positions"], queryFn: () => api<Row[]>("/question-bank/positions") });
  const params = new URLSearchParams({ page: String(page), page_size: "30", company_id: company || "", position_code: position || "" });
  const questions = useQuery({ queryKey: ["question-items", params.toString()], queryFn: () => api<Row[]>(`/question-bank/items?${params}`), enabled: tab === "questions" });
  const entries = useQuery({ queryKey: ["question-source-entries", params.toString()], queryFn: () => api<Page>(`/question-bank/source-entries?${params}`), enabled: tab === "entries" });
  const sources = useQuery({ queryKey: ["question-sources"], queryFn: () => api<Row[]>("/question-bank/sources"), enabled: tab === "sources", refetchInterval: tab === "sources" ? 10000 : false });
  const positionNames = Object.fromEntries((positions.data || []).map((p) => [p.code, p.name]));
  const companyOptions = (companies.data || []).map((c) => ({ label: c.name, value: c.id }));
  const positionOptions = (positions.data || []).map((p) => ({ label: p.name, value: p.code }));
  function editCompany(row: Row) { setEditing(row); companyForm.resetFields(); companyForm.setFieldsValue(row); }
  function bindQuestion(row: Row) {
    setBinding(row); bindingForm.resetFields();
    bindingForm.setFieldsValue({ company_ids: (companies.data || []).filter((c) => (row.company_labels_json || []).includes(c.name)).map((c) => c.id), position_codes: row.position_codes_json || [], evidence_url: row.source_url, association_type: "PUBLIC_REPORT" });
  }
  const tags = (values: string[] = []) => <Space size={[0, 4]} wrap>{values.map((v) => <Tag key={v}>{v}</Tag>)}{!values.length && "未关联"}</Space>;
  const filters = <Space wrap style={{ marginBottom: 16 }}>
    <Select style={{ width: 170 }} allowClear placeholder="按公司筛选" options={companyOptions} value={company} onChange={(v) => { setCompany(v); setPage(1); }} />
    {tab === "questions" && <Select style={{ width: 210 }} allowClear placeholder="按适用岗位筛选" options={positionOptions} value={position} onChange={(v) => { setPosition(v); setPage(1); }} />}
    <Button onClick={() => { companies.refetch(); positions.refetch(); if (tab === "questions") questions.refetch(); if (tab === "entries") entries.refetch(); if (tab === "sources") sources.refetch(); }}>刷新</Button>
  </Space>;
  return <Section title="公司与岗位题库" subtitle="维护公司资料、题目适用岗位和公开来源，支持后续用户端题库展示。">
    <ErrorView error={companies.error || positions.error || questions.error || entries.error || sources.error} />
    <Tabs activeKey={tab} onChange={(value) => { setTab(value); setPage(1); }} items={[
      { key: "questions", label: "题目管理" }, { key: "companies", label: "公司信息" },
      { key: "positions", label: "岗位分类" }, { key: "entries", label: "公司来源索引" }, { key: "sources", label: "采集来源" },
    ]} />
    {(tab === "questions" || tab === "entries") && filters}
    {tab === "questions" && <>
      <Table<Row> rowKey="id" dataSource={questions.data || []} loading={questions.isLoading} pagination={false} scroll={{ x: 1000 }} columns={[
        { title: "面试题", dataIndex: "question_text", width: 390 },
        { title: "公司关联", render: (_, row) => row.company_associations?.length ? <Space size={[0, 4]} wrap>{row.company_associations.map((a: Row) => <Tag key={a.id} color={a.association_type === "UNVERIFIED" ? "orange" : "blue"}><a href={a.evidence_url} target="_blank" rel="noreferrer">{a.company_name}{a.association_type === "UNVERIFIED" ? " · 待核验" : ""}</a></Tag>)}</Space> : <Tag>通用题 · 暂无明确公司出处</Tag> },
        { title: "适用岗位", dataIndex: "position_codes_json", render: (codes: string[]) => tags((codes || []).map((code) => positionNames[code] || code)) },
        { title: "题型", dataIndex: "question_type" },
        { title: "审核", dataIndex: "review_status", render: (value) => <Status value={value} /> },
        { title: "来源", render: (_, row) => <a href={row.source_url} target="_blank" rel="noreferrer">{row.attribution || "查看来源"}</a> },
        ...(can("question:write") ? [{ title: "操作", render: (_: unknown, row: Row) => <Space wrap><Button size="small" onClick={() => bindQuestion(row)}>公司与岗位</Button>{row.review_status === "PENDING" && <Button size="small" loading={action.busy} onClick={() => action.run(`/question-bank/items/${row.id}/review?approved=true`, "PATCH", undefined, "审核通过")}>审核通过</Button>}</Space> }] : []),
      ]} />
      <Space style={{ marginTop: 16 }}><Button disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</Button><span>第 {page} 页</span><Button disabled={(questions.data || []).length < 30} onClick={() => setPage(page + 1)}>下一页</Button></Space>
    </>}
    {tab === "companies" && <>
      {can("question:write") && <Button style={{ marginBottom: 16 }} onClick={() => editCompany({ status: "ACTIVE", sort_order: 0, aliases_json: [], industry: "", description: "" })}>新增公司</Button>}
      <Table<Row> rowKey="id" loading={companies.isLoading} dataSource={companies.data || []} pagination={false} scroll={{ x: 1000 }} columns={[
        { title: "公司", dataIndex: "name" }, { title: "全称", dataIndex: "full_name" }, { title: "业务领域", dataIndex: "industry" },
        { title: "官网", render: (_, row) => <a href={row.website_url} target="_blank" rel="noreferrer">访问官网</a> },
        { title: "已关联题目", dataIndex: "linked_question_count" }, { title: "可展示题目", dataIndex: "question_count" },
        { title: "来源索引", dataIndex: "source_entry_count" }, { title: "状态", dataIndex: "status", render: (value) => <Status value={value} /> },
        ...(can("question:write") ? [{ title: "操作", render: (_: unknown, row: Row) => <Button size="small" onClick={() => editCompany(row)}>编辑资料</Button> }] : []),
      ]} />
    </>}
    {tab === "positions" && <Table<Row> rowKey="id" dataSource={positions.data || []} pagination={false} columns={[{ title: "岗位", dataIndex: "name" }, { title: "编码", dataIndex: "code" }, { title: "适用范围", dataIndex: "description" }]} />}
    {tab === "entries" && <>
      <Alert style={{ marginBottom: 16 }} type="info" showIcon message="公司关联记录的是公开资料出处。仅标题链接的来源索引不会作为面试问题，需获得正文许可并审核后才能使用。" />
      <Table<Row> rowKey="id" loading={entries.isLoading} dataSource={entries.data?.items || []} scroll={{ x: 900 }} pagination={{ current: page, pageSize: 30, total: entries.data?.total || 0, showSizeChanger: false, onChange: setPage }} columns={[
        { title: "公司", dataIndex: "company_name" }, { title: "资料标题", dataIndex: "title" },
        { title: "保存范围", dataIndex: "content_scope", render: (v) => <Tag color={v === "QUESTION_TEXT" ? "green" : "default"}>{v === "QUESTION_TEXT" ? "获准题目" : "标题链接索引"}</Tag> },
        { title: "许可", dataIndex: "license_type" }, { title: "原始资料", render: (_, row) => <a href={row.source_url} target="_blank" rel="noreferrer">查看来源</a> },
      ]} />
    </>}
    {tab === "sources" && <Table<Row> rowKey="id" loading={sources.isLoading} dataSource={sources.data || []} pagination={false} scroll={{ x: 1000 }} columns={[
      { title: "采集来源", dataIndex: "name" }, { title: "许可", dataIndex: "license_type" },
      { title: "采集范围", render: (_, row) => row.permission_status === "METADATA_ONLY" ? "标题与链接" : "已授权题目" },
      { title: "最近采集", dataIndex: "last_crawl_at", render: dateTime },
      { title: "结果", dataIndex: "last_crawl_status", render: (v) => <Status value={v} /> },
      { title: "说明", render: (_, row) => row.last_error || row.cursor_json?.metadata_note || "—" },
      ...(can("question:write") ? [{ title: "操作", render: (_: unknown, row: Row) => <Space><Button size="small" loading={action.busy} onClick={() => action.run(`/question-bank/sources/${row.id}/crawl`, "POST", undefined, "采集任务已提交")}>立即采集</Button><Button size="small" onClick={() => action.run(`/question-bank/sources/${row.id}`, "PATCH", { enabled: !row.enabled })}>{row.enabled ? "暂停定时" : "启用定时"}</Button></Space> }] : []),
    ]} />}
    <Modal open={!!editing} title={editing?.id ? "编辑公司资料" : "新增公司"} onCancel={() => setEditing(undefined)} onOk={() => companyForm.submit()} confirmLoading={action.busy} destroyOnHidden>
      <Form form={companyForm} layout="vertical" onFinish={async (values) => { if (await action.run(editing?.id ? `/question-bank/companies/${editing.id}` : "/question-bank/companies", editing?.id ? "PUT" : "POST", values)) setEditing(undefined); }}>
        <Form.Item name="code" label="公司编码" rules={[{ required: true, pattern: /^[A-Z][A-Z0-9_]+$/, message: "使用大写字母、数字或下划线" }]}><Input maxLength={40} /></Form.Item>
        <Form.Item name="name" label="公司名称" rules={[{ required: true }]}><Input maxLength={100} /></Form.Item>
        <Form.Item name="full_name" label="公司 / 集团全称" rules={[{ required: true }]}><Input maxLength={200} /></Form.Item>
        <Form.Item name="aliases_json" label="检索别名"><Select mode="tags" /></Form.Item>
        <Form.Item name="website_url" label="官网" rules={[{ required: true, pattern: /^https:\/\//, message: "请填写 HTTPS 官网地址" }]}><Input maxLength={1000} /></Form.Item>
        <Form.Item name="industry" label="业务领域"><Input maxLength={100} /></Form.Item>
        <Form.Item name="description" label="公司简介"><Input.TextArea maxLength={3000} rows={3} /></Form.Item>
        <Form.Item name="status" label="展示状态"><Select options={[{ label: "展示", value: "ACTIVE" }, { label: "隐藏", value: "HIDDEN" }]} /></Form.Item>
        <Form.Item name="sort_order" hidden><Input type="number" /></Form.Item>
      </Form>
    </Modal>
    <Modal open={!!binding} title="关联公司与招聘岗位" onCancel={() => setBinding(undefined)} onOk={() => bindingForm.submit()} confirmLoading={action.busy} destroyOnHidden>
      <Form form={bindingForm} layout="vertical" onFinish={async (values) => { if (await action.run(`/question-bank/items/${binding?.id}/catalog`, "PUT", values)) setBinding(undefined); }}>
        <Form.Item name="position_codes" label="适用招聘岗位" rules={[{ required: true, message: "至少选择一个适用岗位" }]}><Select mode="multiple" options={positionOptions} /></Form.Item>
        <Form.Item name="company_ids" label="关联公司"><Select mode="multiple" options={companyOptions} /></Form.Item>
        <Form.Item name="association_type" label="公司关联依据"><Select options={[{ label: "公开面经自述", value: "PUBLIC_REPORT" }, { label: "待核验", value: "UNVERIFIED" }, { label: "企业官方公开资料", value: "OFFICIAL" }]} /></Form.Item>
        <Form.Item name="evidence_url" label="公司关联依据链接" rules={[{ required: true, pattern: /^https:\/\//, message: "请填写 HTTPS 证据链接" }]}><Input maxLength={1500} /></Form.Item>
      </Form>
    </Modal>
  </Section>;
}
