"use client";

import { useEffect } from "react";
import { initTimezone } from "./actions";

/** Один раз передаёт часовой пояс браузера, если у пользователя он не задан. */
export function TimezoneInit() {
  useEffect(() => {
    initTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);
  return null;
}
