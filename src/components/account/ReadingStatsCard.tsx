"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { NormalizedReadingStats } from "@/lib/providers/types";
import { CountUp, StaggerGroup, StaggerItem } from "@/components/motion";
import { useTranslate } from "@/hooks/useTranslate";

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
  const { t } = useTranslate();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("account.readingStats.title")}</CardTitle>
        <CardDescription>{t("account.readingStats.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {stats ? <ReadingStatsContent stats={stats} /> : <StatsUnavailable />}
      </CardContent>
    </Card>
  );
}

function StatsUnavailable() {
  const { t } = useTranslate();
  return (
    <p className="text-sm text-muted-foreground">{t("account.readingStats.unavailable")}</p>
  );
}

function ReadingStatsContent({ stats }: { stats: NormalizedReadingStats }) {
  const { t } = useTranslate();
  const overallProgress = percentage(stats.booksRead, stats.totalBooks);
  const statusData = [
    { name: t("account.readingStats.read"), value: stats.booksRead, color: COLORS.read },
    { name: t("account.readingStats.inProgress"), value: stats.booksInProgress, color: COLORS.reading },
    { name: t("account.readingStats.unread"), value: stats.booksUnread, color: COLORS.unread },
  ];
  const libraryData = stats.libraries.map((library) => ({
    name: library.name,
    books: library.bookCount,
    progress: percentage(library.booksReadCount, library.bookCount),
  }));

  return (
    <div className="space-y-8">
      <StaggerGroup className="grid grid-cols-2 gap-4 sm:grid-cols-4" effect="settle" stagger={0.06}>
        <StatTile label={t("account.readingStats.series")} value={stats.totalSeries} />
        <StatTile label={t("account.readingStats.books")} value={stats.totalBooks} />
        <StatTile label={t("account.readingStats.read")} value={stats.booksRead} />
        <StatTile label={t("account.readingStats.progress")} value={overallProgress} suffix="%" />
      </StaggerGroup>

      <div>
        <h3 className="mb-2 text-sm font-medium">{t("account.readingStats.distribution")}</h3>
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
            title={t("account.readingStats.booksByLibrary")}
            seriesName={t("account.readingStats.books")}
            data={libraryData}
            dataKey="books"
            color={COLORS.read}
            domainMax={undefined}
          />
          <LibraryBarChart
            title={t("account.readingStats.progressByLibrary")}
            seriesName={t("account.readingStats.progress")}
            data={libraryData}
            dataKey="progress"
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

/** Tuile de chiffre : elle se pose dans la cascade et sa valeur se compte. */
function StatTile({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <StaggerItem className="rounded-lg border border-border bg-secondary/50 p-3">
      <p className="text-2xl font-semibold tabular-nums">
        <CountUp value={value} suffix={suffix} />
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </StaggerItem>
  );
}

function LibraryBarChart({
  title,
  seriesName,
  data,
  dataKey,
  color,
  domainMax,
  unit,
}: {
  title: string;
  /** Libellé de la série dans l'infobulle (sinon recharts affiche la clé). */
  seriesName: string;
  data: { name: string; books: number; progress: number }[];
  dataKey: "books" | "progress";
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
            <Bar dataKey={dataKey} name={seriesName} fill={color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
