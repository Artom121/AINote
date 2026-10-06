import "dotenv/config";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/db/migrations/**", "src/**/*.d.ts"],
      // ТЗ, раздел 10: покрытие бэкенда не ниже 70%.
      thresholds: { statements: 70, branches: 70, functions: 70, lines: 70 },
    },
    projects: [
      {
        resolve: { alias },
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/integration/global-setup.ts"],
          // Тесты делят одну БД — запускаем файлы последовательно.
          fileParallelism: false,
        },
      },
    ],
  },
});
