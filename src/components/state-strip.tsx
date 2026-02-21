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
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center gap-x-4">
            {i > 0 && (
              <span className="text-text-muted" aria-hidden="true">
                &middot;
              </span>
            )}
            <span className="text-[15px] text-text-secondary">{item.label}</span>
            {item.value != null &&
              (item.href ? (
                <a
                  href={item.href}
                  className="font-mono text-[15px] text-text-primary underline decoration-border underline-offset-2 transition-colors hover:decoration-border-hover"
                >
                  {item.value}
                </a>
              ) : (
                <span className="font-mono text-[15px] text-text-primary">
                  {item.value}
                </span>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
