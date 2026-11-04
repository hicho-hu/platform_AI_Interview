import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function login(page: Page, name = "admin") {
  await page.goto("/");
  await page.getByLabel("管理员账号").fill(name);
  await page.getByLabel("登录密码").fill("Admin-e2e-password-2026");
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/admin/auth/login") && r.status() === 200,
  );
  await page.getByRole("button", { name: "登录工作台" }).click();
  const token = (await (await response).json()).data.access_token as string;
  await expect(page.locator(".sidebar")).toBeVisible();
  return { Authorization: `Bearer ${token}` };
}

test("真实 API 登录、全部模块导航、用户与面试详情", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await expect(
    page.getByRole("heading", { name: "运营总览", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "审批中心" })).toHaveCount(0);
  await page.getByRole("link", { name: "用户中心" }).click();
  await page.getByRole("button", { name: "查看详情" }).first().click();
  await expect(page.getByText("用户详情", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("link", { name: "面试中心" }).click();
  await page.getByRole("button", { name: "查看详情" }).first().click();
  await page.getByRole("button", { name: "查看面试内容" }).click();
  await expect(page.getByText("面试内容已加载", { exact: true })).toBeVisible();
  await expect(
    page.getByText("请填写业务原因。系统将核验用户授权", { exact: false }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  for (const name of [
    "质量抽检",
    "财务中心",
    "商品与权益",
    "推广中心",
    "支付渠道",
    "AI 运营",
    "系统管理",
  ]) {
    await page.getByRole("link", { name, exact: true }).click();
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("tab", { name: "文件存储", exact: true }).click();
  await expect(page.getByText("OSS Bucket", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "检查 OSS 连接", exact: true })
    .click();
  await expect(
    page.getByText("请在后端环境配置 RAM 密钥和角色 ARN"),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("同一管理员创建商品并直接发布", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "商品与权益", exact: true }).click();
  await page.getByRole("button", { name: "新建商品草稿" }).click();
  await page.getByLabel("商品 SKU").fill(`E2E_${Date.now()}`);
  await page.getByLabel("商品名称").fill("浏览器验收套餐");
  await page.getByLabel("操作原因").fill("浏览器端到端发布验收");
  await page.getByRole("button", { name: "确认提交" }).click();
  const row = page
    .getByRole("row")
    .filter({ hasText: "浏览器验收套餐" })
    .first();
  await row.getByRole("button", { name: "发布商品" }).click();
  await page.getByLabel("操作原因").fill("直接发布首期训练商品");
  await page.getByRole("button", { name: "确认提交" }).click();
  await expect(page.getByText("商品已发布，立即生效")).toBeVisible();
  await expect(row.getByText("已发布")).toBeVisible();
  await expect(row).toContainText("文字 3 次 + 语音 2 次 + 视频 1 次");
  await expect(page.getByRole("link", { name: "审批中心" })).toHaveCount(0);
});

test("同一管理员直接补发权益，工单可不填", async ({ page }) => {
  const headers = await login(page);
  const users = (
    await (await page.request.get("/api/v1/admin/users", { headers })).json()
  ).data.items;
  const user = users[0];
  await page.getByRole("link", { name: "用户中心", exact: true }).click();
  await page.getByRole("button", { name: "查看详情" }).first().click();
  await page.getByRole("button", { name: "补发权益", exact: true }).click();
  await page.getByLabel("面试类型", { exact: true }).press("ArrowDown");
  await page.getByText("语音面试", { exact: true }).click();
  await page.getByLabel("补发次数").fill("2");
  await page.getByLabel("操作原因").fill("直接补发系统异常额度");
  await page.getByRole("button", { name: "确认提交" }).click();
  await expect(page.getByText("权益已补发，立即生效")).toBeVisible();
  const updated = (
    await (
      await page.request.get(`/api/v1/admin/users/${user.id}`, { headers })
    ).json()
  ).data;
  expect(updated.interview_credits.VOICE).toBe(
    (user.interview_credits?.VOICE ?? 0) + 2,
  );
  expect(updated.universal_interviews).toBe(user.universal_interviews);
});

test("支付配置保存后立即可查询", async ({ page }) => {
  const headers = await login(page);
  await page.getByRole("link", { name: "支付渠道", exact: true }).click();
  await page
    .locator(".payment-card")
    .filter({ hasText: "微信支付" })
    .getByRole("button", { name: "配置渠道" })
    .click();
  await page.getByLabel("商户号").fill("e2e-merchant");
  await page.getByLabel("App ID").fill("e2e-app");
  await page.getByLabel("密钥托管引用").fill("kms://payments/e2e-key");
  await page.getByLabel("支付通知地址").fill("https://api.example.com/notify");
  await page.getByLabel("操作原因").fill("保存首期沙箱支付配置");
  await page.getByRole("button", { name: "确认提交" }).click();
  await expect(page.getByText("配置已保存，立即生效")).toBeVisible();
  const result = (
    await (
      await page.request.get("/api/v1/admin/payment-channels", { headers })
    ).json()
  ).data;
  expect(
    result.items.find((p: { channel: string }) => p.channel === "WECHAT")
      .version,
  ).toBe(1);
});

test("开发订单可由同一管理员直接退款", async ({ page }) => {
  const headers = await login(page);
  const order = (
    await (
      await page.request.get("/api/v1/admin/orders?status=PAID", { headers })
    ).json()
  ).data.items[0];
  expect(order).toBeTruthy();
  await page.getByRole("link", { name: "财务中心", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: order.id.slice(0, 8).toUpperCase() })
    .getByRole("button", { name: "退款", exact: true })
    .click();
  await page.getByLabel("操作原因").fill("直接退回未使用训练额度");
  await page.getByRole("button", { name: "确认提交" }).click();
  await expect(page.getByText("退款已完成")).toBeVisible();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: order.id.slice(0, 8).toUpperCase() })
      .getByText("已退款"),
  ).toBeVisible();
});

test("财务角色导航及直接路由隔离", async ({ page }) => {
  await login(page, "finance");
  await expect(page.getByRole("link", { name: "用户中心" })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "财务中心", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    history.pushState({}, "", "/users");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByText("暂无访问权限")).toBeVisible();
});

test("窄屏布局与登录", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole("button", { name: "打开导航" }).click();
  await expect(page.getByRole("link", { name: "用户中心" })).toBeVisible();
  await page.getByRole("link", { name: "用户中心" }).click();
  await expect(
    page.getByRole("heading", { name: "用户中心", exact: true }),
  ).toBeVisible();
});

test("后台配置分类邀请奖励、创建佣金链接并查看退款冲销台账", async ({
  page,
}) => {
  const headers = await login(page);
  await page.getByRole("link", { name: "推广中心", exact: true }).click();
  await page.getByRole("button", { name: "修改邀请规则", exact: true }).click();
  await page.getByLabel("每邀请多少人奖励一次", { exact: true }).fill("2");
  await page.getByLabel("邀请人奖励 · 文字面试次数", { exact: true }).fill("3");
  await page.getByLabel("邀请人奖励 · 语音面试次数", { exact: true }).fill("1");
  await page.getByLabel("操作原因").fill("配置每两人发放分类邀请奖励");
  await page.getByRole("button", { name: "确认提交", exact: true }).click();
  await expect(page.getByText("邀请规则已更新", { exact: true })).toBeVisible();
  await expect(page.locator(".growth-rule-summary")).toContainText("2 人");
  await expect(page.locator(".growth-rule-summary")).toContainText(
    "文字 3 次 + 语音 1 次 + 视频 0 次",
  );
  await page.screenshot({
    path: "test-results/growth-invitation-config.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "分佣推广链接", exact: true }).click();
  await page.getByRole("button", { name: "创建推广链接", exact: true }).click();
  await page.getByLabel("推广活动名称", { exact: true }).fill("浏览器推广活动");
  await page.getByLabel("推广人或合作方", { exact: true }).fill("浏览器推广员");
  await page.getByLabel("佣金比例（%）", { exact: true }).fill("12.50");
  await page.getByLabel("操作原因").fill("验证后台创建分佣推广链接");
  await page.getByRole("button", { name: "确认提交", exact: true }).click();
  await expect(page.getByText("推广链接已创建", { exact: true })).toBeVisible();
  const row = page.getByRole("row").filter({ hasText: "浏览器推广活动" });
  await expect(row).toContainText("12.50%");
  const records = (
    await (
      await page.request.get("/api/v1/admin/promotions", { headers })
    ).json()
  ).data.items;
  const link = records.find(
    (value: { name: string }) => value.name === "浏览器推广活动",
  );
  expect(link.rate_bps).toBe(1250);
  expect(link.url).toContain(`/register?promotion=${link.code}`);
  await page.screenshot({
    path: "test-results/growth-promotion-links.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "佣金台账", exact: true }).click();
  await expect(
    page.getByRole("columnheader", { name: "固化比例", exact: true }),
  ).toBeVisible();
});
