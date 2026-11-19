import { useEffect } from "react";
import { Alert, Button, Form, Input, InputNumber, Switch } from "antd";
import { useQuery } from "@tanstack/react-query";
import { api, can, type Row } from "../api";
import { ErrorView } from "../components";
import { useAction } from "./shared";

export default function PracticeRules() {
  const query = useQuery({
    queryKey: ["practice-rules"],
    queryFn: () => api<Row>("/question-bank/practice-rules"),
  });
  const [form] = Form.useForm();
  const action = useAction();
  useEffect(() => {
    if (query.data) form.setFieldsValue(query.data);
  }, [query.data, form]);
  return (
    <div style={{ maxWidth: 760 }}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
        message="配置立即影响新解锁与奖励，已创建会话保留原轮数"
        description="非VIP按不同题目累计解锁，同题复练不扣次数。VIP有效期内全题可练；到期后继续使用基础或奖励额度。完成有回答的模拟面试并生成报告后发奖，每场仅一次。"
      />
      <ErrorView error={query.error} retry={() => query.refetch()} />
      <Form
        form={form}
        layout="vertical"
        disabled={!can("question:write") || action.busy}
        onFinish={async (values) => {
          const fields = [
            "enabled",
            "free_question_limit",
            "interview_reward",
            "max_rounds",
            "vip_all_questions",
            "voice_enabled",
            "reason",
          ];
          if (
            await action.run(
              "/question-bank/practice-rules",
              "PUT",
              Object.fromEntries(fields.map((key) => [key, values[key]])),
              "真题实操规则已更新",
            )
          ) {
            await query.refetch();
            form.setFieldValue("reason", undefined);
          }
        }}
      >
        <p>当前规则版本：v{query.data?.version ?? "—"}</p>
        <Form.Item name="enabled" label="开放真题实操" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item
          name="free_question_limit"
          label="非VIP基础解锁题数（全账号累计）"
          rules={[{ required: true }]}
        >
          <InputNumber min={0} max={10000} precision={0} />
        </Form.Item>
        <Form.Item
          name="interview_reward"
          label="每次完成模拟面试奖励解锁次数"
          rules={[{ required: true }]}
        >
          <InputNumber min={0} max={100} precision={0} />
        </Form.Item>
        <Form.Item
          name="max_rounds"
          label="单题最多总作答轮数（含首问）"
          rules={[{ required: true }]}
        >
          <InputNumber min={1} max={3} precision={0} />
        </Form.Item>
        <Form.Item
          name="vip_all_questions"
          label="有效VIP解锁全部真题"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          name="voice_enabled"
          label="开放语音作答及转写"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          name="reason"
          label="变更原因"
          rules={[
            {
              required: true,
              min: 5,
              max: 500,
              message: "请输入5至500字变更原因",
            },
          ]}
        >
          <Input.TextArea rows={3} maxLength={500} />
        </Form.Item>
        {can("question:write") && (
          <Button type="primary" htmlType="submit" loading={action.busy}>
            保存实操规则
          </Button>
        )}
      </Form>
    </div>
  );
}
