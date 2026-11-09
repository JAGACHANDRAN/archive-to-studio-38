import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtInt, shortMonth } from "@/lib/format";

const axis = { fontSize: 11, fill: "var(--color-muted-foreground)" };
const tooltipStyle = { borderRadius: 10, border: "1px solid var(--color-border)", fontSize: 12, background: "var(--color-popover)" };
const kTick = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v));

export function DistributionBar({ data }: { data: { name: string; kg: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} interval={0} />
        <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={kTick} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${fmtInt(v)} kg`, "Distributed"]} cursor={{ fill: "var(--color-muted)" }} />
        <Bar dataKey="kg" fill="var(--color-primary)" radius={[6, 6, 0, 0]} maxBarSize={38} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StockDonut({ normal, low, critical, centerLabel, centerValue }: { normal: number; low: number; critical: number; centerLabel: string; centerValue: string }) {
  const data = [
    { name: "Normal", value: normal, color: "var(--color-success)" },
    { name: "Low Stock", value: low, color: "var(--color-warning)" },
    { name: "Critical", value: critical, color: "var(--color-danger)" },
  ];
  return (
    <div className="relative h-[150px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius="68%" outerRadius="95%" paddingAngle={2} stroke="none" startAngle={90} endAngle={-270}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-medium text-muted-foreground">{centerLabel}</span>
        <span className="text-sm font-extrabold text-foreground tabular">{centerValue}</span>
      </div>
    </div>
  );
}

export function TrendLine({ data, height = 220 }: { data: { month: string; kg: number }[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.map((d) => ({ ...d, label: shortMonth(d.month) }))} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
          <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={kTick} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${fmtInt(v)} kg`, "Distributed"]} />
          <Line type="monotone" dataKey="kg" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--color-primary)" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ExpectedVsMeasured({ data, height = 220 }: { data: { label: string; expected: number; measured: number }[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
          <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={kTick} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${fmtInt(v)} kg`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="expected" name="Expected (ledger)" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="measured" name="Measured (inspection)" fill="var(--color-warning)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyBars({ data, height = 220 }: { data: { month: string; kg: number }[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.map((d) => ({ ...d, label: shortMonth(d.month) }))} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
          <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={kTick} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${fmtInt(v)} kg`, "Distributed"]} cursor={{ fill: "var(--color-muted)" }} />
          <Bar dataKey="kg" fill="var(--color-teal)" radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
