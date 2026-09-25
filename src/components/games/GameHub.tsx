"use client";

import { useTranslations } from "next-intl";
import { RequireAgeMode } from "@/components/ui/RequireAgeMode";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const GAMES = [
  { href: "/games/find-it", key: "findIt", icon: "🎯", minAge: "little", color: "bg-sky-100 border-sky-300" },
  { href: "/games/build-skeleton", key: "skeleton", icon: "🦴", minAge: "young", color: "bg-amber-100 border-amber-300" },
  { href: "/games/quiz", key: "quiz", icon: "🏆", minAge: "little", color: "bg-emerald-100 border-emerald-300" },
] as const;

/** Game hub with big, friendly cards. "Build a Skeleton" is for ages 5+. */
export function GameHub() {
  const t = useTranslations("Games");
  return (
    <RequireAgeMode>
      {(mode) => (
        <ul className="grid gap-4 sm:grid-cols-3">
          {GAMES.filter((g) => g.minAge === "little" || mode !== "little").map((game) => (
            <li key={game.key}>
              <Link
                href={game.href}
                className={cn(
                  "flex h-full min-h-48 flex-col items-center justify-center gap-2 rounded-3xl border-4 p-6 text-center text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50",
                  game.color,
                )}
              >
                <span className="text-6xl" aria-hidden="true">{game.icon}</span>
                <span className="text-2xl font-bold">{t(`${game.key}.name`)}</span>
                <span className="text-slate-700">{t(`${game.key}.blurb`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </RequireAgeMode>
  );
}
