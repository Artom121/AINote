import { expect, test } from "@playwright/test";
import { devLogin } from "./helpers";

test("dev-вход → пустой чат → выход на всех устройствах", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Войти с Яндекс ID" })).toBeVisible();

  await devLogin(page, "auth");
  await expect(page.getByRole("region", { name: "Сообщения" })).toBeVisible();
  await expect(page.getByLabel("Сообщение")).toBeVisible();

  await page.getByRole("link", { name: "Настройки" }).click();
  await page.getByRole("button", { name: "Выйти на всех устройствах" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});
