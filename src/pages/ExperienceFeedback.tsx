import { useState } from "react";
import { Rate, Table, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import { api, dateTime, type Page, type Row } from "../api";
import { ErrorView } from "../components";

const dimensions = { question_quality: "题目质量", followup_experience: "追问体验", pacing: "节奏安排", interaction: "交互流畅度", overall: "整体满意度" };
export default function ExperienceFeedback() {
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ["experience-feedback", page], queryFn: () => api<Page>(`/experience-feedback?page=${page}&page_size=20`) });
  return <><p className="muted">模拟面试与真题实操的用户体验评价，1星最低、5星最高。每份反馈均绑定对应流程ID，文字建议为选填。</p><ErrorView error={query.error} retry={() => query.refetch()} /><Table<Row> rowKey="id" dataSource={query.data?.items || []} loading={query.isLoading} scroll={{ x: 1500 }} pagination={{ current: page, pageSize: 20, total: query.data?.total || 0, showSizeChanger: false, onChange: setPage }} columns={[
    { title: "用户UID", dataIndex: "user_id", width: 110 },
    { title: "面试类型", render: (_,row) => <Tag color={row.interview_id ? "blue" : "purple"}>{row.interview_id ? "模拟面试" : "真题实操"}</Tag>, width: 100 },
    { title: "关联面试流程ID", render: (_,row) => <span className="mono" style={{ fontSize: 11 }}>{row.interview_id || row.practice_session_id}</span>, width: 260 },
    ...Object.entries(dimensions).map(([code,label]) => ({ title: label, width: 145, render: (_: unknown,row: Row) => <Rate disabled value={row.ratings[code]} style={{ fontSize: 16 }} /> })),
    { title: "文字反馈", dataIndex: "comment", width: 260, render: value => value || "未填写" },
    { title: "提交 / 更新时间", dataIndex: "updated_at", render: dateTime, width: 180 },
  ]} /></>;
}
