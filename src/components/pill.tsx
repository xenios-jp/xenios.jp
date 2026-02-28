const variantStyles: Record<string, string> = {
  playable: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
  ingame: "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400",
  intro: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
  loads: "bg-orange-50 text-orange-700 dark:bg-orange-400/10 dark:text-orange-400",
  nothing: "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-400",
  great: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
  ok: "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400",
  poor: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
  "n/a": "bg-zinc-100 text-zinc-500 dark:bg-zinc-700/30 dark:text-zinc-500",
  ios: "bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-400",
  macos: "bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-400",
  msc: "bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-400",
  msl: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-400/10 dark:text-fuchsia-400",
  arm64: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700/30 dark:text-zinc-400",
  x86_64: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700/30 dark:text-zinc-400",
  tag: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

interface PillProps {
  variant: keyof typeof variantStyles;
  children: React.ReactNode;
}

export function Pill({ variant, children }: PillProps) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${variantStyles[variant] ?? variantStyles.tag}`}
    >
      {children}
    </span>
  );
}
