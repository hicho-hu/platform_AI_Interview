import { test, expect } from "@playwright/test";

test("数字UID可搜索和查看详情，旧业务关联保持可用", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("管理员账号").fill("uid-admin");
  await page.getByLabel("登录密码").fill("Admin-e2e-password-2026");
  const signed = page.waitForResponse(
    (r) => r.url().endsWith("/admin/auth/login") && r.ok(),
  );
  await page.getByRole("button", { name: "登录工作台" }).click();
  const token = (await (await signed).json()).data.access_token;
  const headers = { Authorization: `Bearer ${token}` };
  const users = (
    await (await page.request.get("/api/v1/admin/users", { headers })).json()
  ).data.items;
  const user = users[0];
  expect(user.uid).toMatch(/^[1-9][0-9]{7,}$/);
  await page.getByRole("link", { name: "用户中心", exact: true }).click();
  await page.getByPlaceholder("输入 UID 或昵称搜索").fill(user.uid);
  await page.getByPlaceholder("输入 UID 或昵称搜索").press("Enter");
  await expect(page.locator(".user-cell")).toHaveCount(1);
  await expect(page.locator(".user-cell")).toContainText(user.uid);
  const detail = page.waitForResponse(
    (r) => r.url().endsWith(`/admin/users/${user.uid}`) && r.ok(),
  );
  await page.getByRole("button", { name: "查看详情", exact: true }).click();
  const result = (await (await detail).json()).data;
  expect(result.id).toBe(user.id);
  await expect(page.locator(".detail-summary")).toContainText(
    `UID ${user.uid}`,
  );
});

test("超过八位的UID完整展示", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("管理员账号").fill("uid-admin");
  await page.getByLabel("登录密码").fill("Admin-e2e-password-2026");
  await page.getByRole("button", { name: "登录工作台" }).click();
  await expect(page.locator(".sidebar")).toBeVisible();
  await page.route("**/api/v1/admin/users?*", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.data.items[0].uid = "100000000";
    await route.fulfill({ response, json: body });
  });
  await page.getByRole("link", { name: "用户中心", exact: true }).click();
  await expect(page.locator(".user-cell .mono").first()).toHaveText(
    "100000000",
  );
});
