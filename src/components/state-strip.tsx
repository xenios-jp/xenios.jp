interface StateStripItem {
  label: string;
  value?: string;
  href?: string;
}

interface StateStripProps {
  items: StateStripItem[];
}

export function StateStrip({ items }: StateStripProps) {
  return (
    <div className="bg-bg-surface border-y border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-center gap-x-5 text-[15px]">
        {items.map((item, i) => (
          <span
            key={item.label}
            className={`flex items-center gap-x-2 ${i >= 2 ? "hidden sm:flex" : ""}`}
          >
            {i > 0 && (
              <span className="text-text-muted" aria-hidden="true">
                &middot;
              </span>
            )}
            <span className="text-text-secondary">{item.label}</span>
            {item.value != null &&
              (item.href ? (
                <a
                  href={item.href}
                  className="font-mono text-text-primary underline decoration-border underline-offset-2 transition-colors hover:decoration-border-hover"
                >
                  {item.value}
                </a>
              ) : (
                <span className="font-mono text-text-primary">
                  {item.value}
                </span>
              ))}
          </span>
        ))}
      </div>
    </div>
  );
}
