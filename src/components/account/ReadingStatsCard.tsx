"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { NormalizedReadingStats } from "@/lib/providers/types";

const COLORS = {
  read: "hsl(var(--chart-1))",
  reading: "hsl(var(--chart-2))",
  unread: "hsl(var(--chart-3))",
  progress: "hsl(var(--chart-4))",
};

const AXIS_TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 12 };

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--popover-foreground))",
};

function percentage(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function chartHeight(itemCount: number): number {
  return Math.max(180, itemCount * 44 + 24);
}

export function ReadingStatsCard({ stats }: { stats: NormalizedReadingStats | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Statistiques de lecture</CardTitle>
        <CardDescription>Données de la connexion active</CardDescription>
      </CardHeader>
      <CardContent>
        {stats ? <ReadingStatsContent stats={stats} /> : <StatsUnavailable />}
      </CardContent>
    </Card>
  );
}

function StatsUnavailable() {
  return (
    <p className="text-sm text-muted-foreground">
      Statistiques indisponibles. Vérifiez votre connexion active dans les réglages.
    </p>
  );
}

function ReadingStatsContent({ stats }: { stats: NormalizedReadingStats }) {
  const overallProgress = percentage(stats.booksRead, stats.totalBooks);
  const statusData = [
    { name: "Lus", value: stats.booksRead, color: COLORS.read },
    { name: "En cours", value: stats.booksInProgress, color: COLORS.reading },
    { name: "Non lus", value: stats.booksUnread, color: COLORS.unread },
  ];
  const libraryData = stats.libraries.map((library) => ({
    name: library.name,
    livres: library.bookCount,
    progression: percentage(library.booksReadCount, library.bookCount),
  }));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Séries" value={stats.totalSeries} />
        <StatTile label="Livres" value={stats.totalBooks} />
        <StatTile label="Lus" value={stats.booksRead} />
        <StatTile label="Progression" value={`${overallProgress}%`} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Répartition des livres</h3>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                stroke="hsl(var(--card))"
              >
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-4">
          {statusData.map((entry) => (
            <LegendItem key={entry.name} color={entry.color} label={entry.name} value={entry.value} />
          ))}
        </div>
      </div>

      {libraryData.length > 0 && (
        <div className="grid gap-8 md:grid-cols-2">
          <LibraryBarChart
            title="Livres par bibliothèque"
            data={libraryData}
            dataKey="livres"
            color={COLORS.read}
            domainMax={undefined}
          />
          <LibraryBarChart
            title="Progression par bibliothèque"
            data={libraryData}
            dataKey="progression"
            color={COLORS.progress}
            domainMax={100}
            unit="%"
          />
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
      {label} : <span className="font-medium text-foreground">{value}</span>
    </span>
  );
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/50 p-3">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function LibraryBarChart({
  title,
  data,
  dataKey,
  color,
  domainMax,
  unit,
}: {
  title: string;
  data: { name: string; livres: number; progression: number }[];
  dataKey: "livres" | "progression";
  color: string;
  domainMax: number | undefined;
  unit?: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      <div style={{ height: chartHeight(data.length) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
            <XAxis type="number" domain={[0, domainMax ?? "dataMax"]} tick={AXIS_TICK} unit={unit} />
            <YAxis type="category" dataKey="name" width={110} tick={AXIS_TICK} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
            <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
