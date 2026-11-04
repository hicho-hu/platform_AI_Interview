import { useState } from "react";
import { Alert, Button, Descriptions, Space, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import { api, type Row } from "../api";
import { ErrorView, Section } from "../components";

export function StorageSettings() {
  const [probe, setProbe] = useState<Row>();
  const configuration = useQuery({
    queryKey: ["storage-configuration"],
    queryFn: () => api("/storage/status"),
  });
  const check = useQuery({
    queryKey: ["storage-connectivity"],
    queryFn: async () => {
      const result = await api("/storage/status?probe=true");
      setProbe(result);
      return result;
    },
    enabled: false,
    retry: false,
  });
  const value = probe || configuration.data;
  const label = (status?: string) =>
    status === "ok" ? "通过" : status === "error" ? "失败" : "尚未检查";
  return (
    <Section title="文件存储" subtitle="配置由后端环境读取，密钥仅由后端保存。">
      <ErrorView
        error={configuration.error || check.error}
        retry={() => configuration.refetch()}
      />
      <Descriptions
        bordered
        column={1}
        items={[
          {
            key: "active",
            label: "当前存储",
            children: value?.active_backend || "—",
          },
          {
            key: "bucket",
            label: "OSS Bucket",
            children: value?.bucket || "—",
          },
          { key: "region", label: "地域", children: value?.region || "—" },
          {
            key: "role",
            label: "RAM 角色",
            children: value?.role_arn || "未配置",
          },
          {
            key: "configured",
            label: "后端授权配置",
            children: value?.oss_configured ? "已配置" : "待配置",
          },
          {
            key: "checks",
            label: "连接检查",
            children: (
              <Space wrap>
                <Tag>STS：{label(value?.sts)}</Tag>
                <Tag>私有 Bucket：{label(value?.private_bucket)}</Tag>
              </Space>
            ),
          },
        ]}
      />
      {value?.message && (
        <Alert
          showIcon
          type={value.error_code ? "warning" : "success"}
          message={value.message}
          description={value.error_code}
          style={{ marginTop: 16 }}
        />
      )}
      <Button
        style={{ marginTop: 16 }}
        loading={check.isFetching}
        onClick={() => check.refetch()}
      >
        检查 OSS 连接
      </Button>
    </Section>
  );
}
