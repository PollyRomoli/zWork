import { useEffect, useState } from "react";
import { TrendingUp, RefreshCw, Calendar } from "lucide-react";
import { cn } from "../lib/cn";
import { fetchAnalyticsSummary, type AnalyticsDay, type AnalyticsSummary } from "../lib/cloud";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDayLabel(day: string) {
  const date = new Date(`${day}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildSeries(days: number, rows: AnalyticsDay[]) {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const today = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    const key = dateKey(date);
    const row = byDay.get(key);
    return {
      date: formatDayLabel(key),
      roots: row?.roots || 0,
      continuations: row?.continuations || 0,
      value: (row?.roots || 0) + (row?.continuations || 0),
    };
  });
}

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d">("7d");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    void fetchAnalyticsSummary()
      .then((data) => {
        if (!alive) return;
        setSummary(data);
      })
      .catch((err) => {
        if (!alive) return;
        setSummary(null);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const currentData = summary
    ? buildSeries(timeRange === "7d" ? 7 : 30, timeRange === "7d" ? summary.past_week : summary.past_month)
    : [];
  const maxValue = Math.max(1, ...currentData.map((d) => d.value));
  const monthlyUsed = summary?.root_requests_total || 0;
  const monthlyLimit = 10000; // Fixed monthly limit for display

  return (
    <div className="flex h-full min-w-0 flex-1 overflow-y-auto bg-paper">
      <div className="mx-auto w-full max-w-[760px] px-6 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-[36px] font-light tracking-tight text-ink">Analytics</h1>
          <p className="mt-2 text-[14px] text-ink-muted">
            Your usage and quota
          </p>
        </header>

        {/* Error state */}
        {error && (
          <section className="mb-6 rounded-2xl border border-line bg-paper-raised p-5">
            <div className="text-[13px] font-semibold text-ink">Analytics unavailable</div>
            <p className="mt-2 text-[13px] leading-5 text-ink-muted">
              {error.includes("401") ? "Sign in to view your usage." : error}
            </p>
          </section>
        )}

        {/* Monthly Usage Bar */}
        <section className="mb-6 rounded-2xl border border-line bg-paper-raised p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-ink-muted" />
              <h2 className="text-[17px] font-semibold text-ink">This Month</h2>
            </div>
            <span className="text-[13px] text-ink-muted">
              {loading ? "..." : `${Math.round((monthlyUsed / monthlyLimit) * 100)}% used`}
            </span>
          </div>
          <div
            className="h-3 rounded-full bg-paper-sunken overflow-hidden"
            role="progressbar"
            aria-valuenow={monthlyUsed}
            aria-valuemin={0}
            aria-valuemax={monthlyLimit}
            aria-label={`Monthly usage: ${formatNumber(monthlyUsed)} of ${formatNumber(monthlyLimit)} requests`}
          >
            <div
              className="h-full rounded-full bg-ink/70 transition-all duration-500"
              style={{ width: `${Math.min(100, (monthlyUsed / monthlyLimit) * 100)}%` }}
            />
          </div>
          <div className="mt-3 text-[13px] text-ink-muted">
            {formatNumber(monthlyUsed)} of {formatNumber(monthlyLimit)} requests
          </div>
        </section>

        {/* Activity Chart */}
        <section className="rounded-2xl border border-line bg-paper-raised p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-ink-muted" />
              <h2 className="text-[17px] font-semibold text-ink">Activity</h2>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-line/60 bg-paper p-0.5">
              <button
                type="button"
                onClick={() => setTimeRange("7d")}
                className={cn(
                  "ring-focus rounded-full px-4 py-2.5 text-[12px] font-medium transition-all min-h-[44px]",
                  timeRange === "7d"
                    ? "bg-ink/90 text-paper shadow-sm"
                    : "text-ink-muted hover:bg-paper-sunken/50 hover:text-ink",
                )}
              >
                7 days
              </button>
              <button
                type="button"
                onClick={() => setTimeRange("30d")}
                className={cn(
                  "ring-focus rounded-full px-4 py-2.5 text-[12px] font-medium transition-all min-h-[44px]",
                  timeRange === "30d"
                    ? "bg-ink/90 text-paper shadow-sm"
                    : "text-ink-muted hover:bg-paper-sunken/50 hover:text-ink",
                )}
              >
                30 days
              </button>
            </div>
          </div>

          {loading && !summary ? (
            <div className="flex h-[160px] items-center justify-center text-[13px] text-ink-muted">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Loading usage
            </div>
          ) : (
            <div
              className="relative"
              role="img"
              aria-label={`Activity chart showing daily requests over ${timeRange === "7d" ? "7" : "30"} days`}
            >
              {/* Y-axis labels */}
              <div className="absolute inset-y-0 left-0 flex w-10 flex-col justify-between text-[11px] text-ink-faint py-2">
                <span>{formatNumber(maxValue)}</span>
                <span>{formatNumber(Math.round(maxValue * 0.5))}</span>
                <span>0</span>
              </div>

              {/* Chart area */}
              <div className="relative ml-10" style={{ height: "160px" }}>
                {/* Grid lines */}
                <div className="pointer-events-none absolute inset-0 py-2">
                  {[0, 0.5].map((pos) => (
                    <div
                      key={pos}
                      className="absolute left-0 right-0 border-t border-line/40"
                      style={{ top: `${pos * 100}%` }}
                    />
                  ))}
                </div>

                {/* Bars */}
                <div className="relative flex h-full items-end gap-1 py-2">
                  {currentData.map((day, index) => {
                    const barHeight = day.value > 0 ? Math.max(4, (day.value / maxValue) * 156) : 0;
                    return (
                      <div
                        key={`${day.date}-${index}`}
                        className="flex-1 rounded-t bg-ink/60 transition-all duration-200"
                        style={{ height: `${barHeight}px`, minWidth: 2 }}
                        aria-label={`${day.date}: ${formatNumber(day.value)} requests`}
                        role="graphics-symbol"
                      />
                    );
                  })}
                </div>
              </div>

              {/* X-axis labels */}
              <div className="ml-10 mt-2 flex text-[11px] text-ink-faint">
                <span>{currentData[0]?.date}</span>
                <span className="flex-1 text-center">
                  {currentData[Math.floor(currentData.length / 2)]?.date}
                </span>
                <span>{currentData[currentData.length - 1]?.date}</span>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
