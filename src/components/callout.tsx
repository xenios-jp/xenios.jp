interface CalloutProps {
  type: "note" | "warning" | "tip";
  children: React.ReactNode;
}

const config: Record<
  CalloutProps["type"],
  { title: string; borderClass: string; iconColor: string; icon: React.ReactNode }
> = {
  note: {
    title: "Note",
    borderClass: "border-l-blue-400",
    iconColor: "text-blue-400",
    icon: (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
  },
  warning: {
    title: "Warning",
    borderClass: "border-l-amber-400",
    iconColor: "text-amber-400",
    icon: (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
      </svg>
    ),
  },
  tip: {
    title: "Tip",
    borderClass: "border-l-emerald-400",
    iconColor: "text-emerald-400",
    icon: (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 18h6M10 22h4M12 2a7 7 0 015 11.9V17H7v-3.1A7 7 0 0112 2z" />
      </svg>
    ),
  },
};

export function Callout({ type, children }: CalloutProps) {
  const { title, borderClass, iconColor, icon } = config[type];

  return (
    <div
      className={`border-l-2 ${borderClass} bg-bg-surface rounded-lg p-5`}
    >
      <div className={`flex items-center gap-2 ${iconColor} mb-2`}>
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="text-[15px] leading-relaxed text-text-secondary">{children}</div>
    </div>
  );
}
