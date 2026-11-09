interface MetaBadgeProps {
  meta: { context?: string; tone?: string; goal?: string; industry?: string };
}

export function MetaBadge({ meta }: MetaBadgeProps) {
  const parts = [meta.context, meta.industry, meta.tone, meta.goal].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 border border-slate-200">
      <span>📋</span>
      <span className="font-bold text-[#0E9F9A]">{parts[0]}</span>
      {parts.slice(1).map((p, i) => (
        <span key={i}>
          <span className="text-slate-300 mx-1">·</span>
          <span className="text-slate-700">{p}</span>
        </span>
      ))}
    </div>
  );
}

export default MetaBadge;
