import { monthLabel } from "@/lib/format";

export function MonthSelect({ months, value, onChange }: { months: string[]; value: string; onChange: (m: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Reporting month"
      className="h-9 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-card outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
    >
      {[...months].reverse().map((m) => (
        <option key={m} value={m}>
          {monthLabel(m)}
        </option>
      ))}
    </select>
  );
}
