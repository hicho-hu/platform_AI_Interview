import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
const credentials = JSON.parse(
  await readFile(
    "/Users/huichao/PycharmProjects/AI_Interview/var/admin-bootstrap.json",
    "utf8",
  ),
);
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto("http://127.0.0.1:5174");
  await page.getByLabel("管理员账号").fill(credentials.login_name);
  await page.getByLabel("登录密码").fill(credentials.password);
  const overview = page.waitForResponse(
    (response) =>
      response.url().includes("/dashboard/overview") &&
      response.status() === 200,
  );
  await page.getByRole("button", { name: "登录工作台" }).click();
  await page.getByRole("heading", { name: "运营总览", exact: true }).waitFor();
  await overview;
  await page.screenshot({ path: ".work/live-dashboard.png", fullPage: true });
  if (failures.length)
    throw Error("Browser runtime errors: " + failures.length);
  console.log(
    "PASS live Vite -> original FastAPI -> MySQL admin login and dashboard",
  );
  await page.locator(".account").hover();
  await page.getByText("退出登录", { exact: true }).click();
  await page.getByRole("heading", { name: "登录运营管理后台" }).waitFor();
  console.log("PASS live browser logout");
} finally {
  await browser.close();
}
