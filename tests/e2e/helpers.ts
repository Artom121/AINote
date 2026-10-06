import { expect, type Page } from "@playwright/test";

/** Dev-вход новым пользователем: у каждого теста свои данные. */
export async function devLogin(page: Page, prefix = "e2e") {
  await page.goto("/login");
  await page
    .getByLabel(/Dev-вход/)
    .fill(`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.test`);
  await page.getByRole("button", { name: "Войти как dev-пользователь" }).click();
  await expect(page).toHaveURL(/\/$/);
}
