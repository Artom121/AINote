import { expect, test } from "@playwright/test";
import { devLogin } from "./helpers";

test("заметки: создать → найти → изменить → откатить → удалить → восстановить", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept());
  await devLogin(page, "notes");

  await page.getByRole("link", { name: "Заметки" }).click();
  await expect(page.getByText("Заметок пока нет.")).toBeVisible();

  // Создание: заголовок берётся из первой строки
  await page.getByRole("link", { name: "Новая заметка" }).click();
  await page.getByLabel("Теги через запятую").fill("Работа, юрист");
  await page.getByLabel("Текст заметки").fill("Позвонить юристу\nНасчёт **договора** аренды");
  await page.getByRole("button", { name: "Создать" }).click();
  await expect(page).toHaveURL(/\/notes\/[0-9a-f-]{36}$/);
  await expect(page.getByLabel("Заголовок")).toHaveValue("Позвонить юристу");

  // Просмотр Markdown
  await page.getByRole("tab", { name: "Просмотр" }).click();
  await expect(page.locator(".markdown strong")).toHaveText("договора");
  await page.getByRole("tab", { name: "Текст" }).click();

  // Изменение
  await page.getByLabel("Текст заметки").fill("Позвонить юристу\nДоговор уже подписан");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByRole("status")).toHaveText("Сохранено");

  // Поиск по-русски и фильтр по тегу
  await page.getByRole("link", { name: "← Все заметки" }).click();
  await page.getByRole("searchbox").fill("договоры");
  await page.getByRole("button", { name: "Найти" }).click();
  await expect(page.getByRole("link", { name: /Позвонить юристу/ })).toBeVisible();
  await page.getByRole("searchbox").fill("молоко");
  await page.getByRole("button", { name: "Найти" }).click();
  await expect(page.getByText("Ничего не найдено.")).toBeVisible();
  await page.goto("/notes?tag=юрист");
  await expect(page.getByRole("link", { name: /Позвонить юристу/ })).toBeVisible();

  // Откат к первой версии
  await page.getByRole("link", { name: /Позвонить юристу/ }).click();
  await page.getByRole("link", { name: "История" }).click();
  await expect(page.getByText("текущая версия")).toBeVisible();
  await page.locator("details").nth(1).locator("summary").click();
  await page.getByRole("button", { name: "Восстановить эту версию" }).click();
  await expect(page).toHaveURL(/\/notes\/[0-9a-f-]{36}$/);
  await expect(page.getByLabel("Текст заметки")).toHaveValue(
    "Позвонить юристу\nНасчёт **договора** аренды",
  );

  // Удаление в корзину и восстановление
  await page.getByRole("button", { name: "Удалить" }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.getByText("Заметок пока нет.")).toBeVisible();
  await page.getByRole("link", { name: "Корзина" }).click();
  await expect(page.getByText("осталось дней: 30")).toBeVisible();
  await page.getByRole("button", { name: "Восстановить" }).click();
  await expect(page.getByText("Корзина пуста.")).toBeVisible();
  await page.getByRole("link", { name: "← Все заметки" }).click();
  await expect(page.getByRole("link", { name: /Позвонить юристу/ })).toBeVisible();
});

test("чужая заметка открывается как 404", async ({ page, browser }) => {
  await devLogin(page, "owner");
  await page.goto("/notes/new");
  await page.getByLabel("Текст заметки").fill("Секрет владельца");
  await page.getByRole("button", { name: "Создать" }).click();
  await expect(page).toHaveURL(/\/notes\/[0-9a-f-]{36}$/);
  const url = page.url();

  const other = await browser.newPage();
  await devLogin(other, "intruder");
  const res = await other.goto(url);
  expect(res?.status()).toBe(404);
  await expect(other.getByText("Секрет владельца")).toHaveCount(0);
  await other.close();
});
