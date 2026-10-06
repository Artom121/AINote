import Link from "next/link";

const links = [
  { href: "/", label: "Чат" },
  { href: "/notes", label: "Заметки" },
  { href: "/settings", label: "Настройки" },
] as const;

export function AppHeader({ active }: { active: (typeof links)[number]["href"] }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
      <Link href="/" className="font-semibold">
        Ассистент
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={l.href === active ? "page" : undefined}
            className={
              l.href === active ? "font-medium underline underline-offset-4" : "hover:underline"
            }
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
