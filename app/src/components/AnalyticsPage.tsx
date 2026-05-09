import { useEffect, useState } from "react";
import { Info, RefreshCw, TrendingUp } from "lucide-react";
import { cn } from "../lib/cn";
import { fetchAnalyticsSummary, type AnalyticsDay, type AnalyticsSummary } from "../lib/cloud";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function percentRemaining(used: number, limit: number) {
  if (limit <= 0) return 0;
  return Math.max(0, Math.min(100, ((limit - used) / limit) * 100));
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

function StatBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const remaining = Math.max(limit - used, 0);
  const percent = percentRemaining(used, limit);
  const barOpacity = percent > 50 ? "bg-ink/70" : percent > 25 ? "bg-ink/50" : "bg-ink/30";

  return (
    <div className="space-y-3 py-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[13px] text-ink-muted">{label}</span>
        <span className="text-[22px] font-light tracking-tight text-ink">
          {formatNumber(remaining)} left
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-paper-sunken">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barOpacity)}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="text-[11.5px] text-ink-faint">
        {formatNumber(used)} used of {formatNumber(limit)}
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d">("7d");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

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
  const totalRoots = summary?.root_requests_total || 0;
  const totalContinuations = summary?.continuation_requests_total || 0;

  const handleChartMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const chartWidth = rect.width - 40;
    const x = e.clientX - rect.left - 40;
    const barCount = currentData.length;
    const index = Math.floor((x / chartWidth) * barCount);

    if (index >= 0 && index < barCount) {
      setHoveredIndex(index);
      setTooltipPosition({ x: e.clientX, y: e.clientY });
    } else {
      setHoveredIndex(null);
      setTooltipPosition(null);
    }
  };

  const handleChartMouseLeave = () => {
    setHoveredIndex(null);
    setTooltipPosition(null);
  };

  return (
    <div className="flex h-full min-w-0 flex-1 overflow-y-auto bg-paper">
      <div className="mx-auto w-full max-w-[760px] px-6 py-8">
        <header className="mb-8 border-b border-line/50 pb-6">
          <h1 className="text-[36px] font-light tracking-tight text-ink">Analytics</h1>
          <p className="mt-2 text-[14px] text-ink-muted">
            Real usage from zWork Router and your account quota.
          </p>
        </header>

        {error && (
          <section className="mb-6 rounded-2xl border border-line bg-paper-raised p-5">
            <div className="text-[13px] font-semibold text-ink">Analytics unavailable</div>
            <p className="mt-2 text-[13px] leading-5 text-ink-muted">
              {error.includes("401") ? "Sign in to view cloud usage." : error}
            </p>
          </section>
        )}

        <section className="mb-6 rounded-2xl border border-line bg-paper p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-ink-muted" />
              <h2 className="text-[16px] font-semibold text-ink">Usage Limits</h2>
            </div>
            <span className="rounded-full border border-line/60 bg-paper-raised px-3 py-1 text-[12px] text-ink-muted">
              {loading ? "Loading" : summary?.user.tier === "pro" ? "Pro" : "Free"}
            </span>
          </div>
          {summary ? (
            <div className="space-y-5">
              <StatBar
                label="5-hour root request limit"
                used={summary.five_hour_used}
                limit={summary.five_hour_limit}
              />
              <StatBar
                label="Weekly root request limit"
                used={summary.weekly_used}
                limit={summary.weekly_limit}
              />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {["5-hour usage", "Weekly usage"].map((label) => (
                <div key={label} className="rounded-xl bg-paper-sunken p-4">
                  <div className="h-3 w-28 rounded-full bg-ink/10" />
                  <div className="mt-4 h-7 w-20 rounded-full bg-ink/10" />
                  <div className="mt-4 h-2 rounded-full bg-ink/10" />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-6 grid gap-3 sm:grid-cols-4">
          {[
            ["Today", summary ? summary.root_requests_today : 0],
            ["Active runs", summary ? summary.active_runs : 0],
            ["Root total", totalRoots],
            ["Continuation total", totalContinuations],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-line bg-paper-raised p-4">
              <div className="text-[11.5px] uppercase tracking-[0.16em] text-ink-faint">{label}</div>
              <div className="mt-2 text-[24px] font-light tracking-tight text-ink">
                {loading ? "..." : formatNumber(Number(value))}
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-line bg-paper p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[16px] font-semibold text-ink">Activity</h2>
              <p className="mt-0.5 text-[13px] text-ink-muted">
                Daily root and continuation requests.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-full border border-line/60 bg-paper-raised p-0.5">
                <button
                  type="button"
                  onClick={() => setTimeRange("7d")}
                  className={cn(
                    "ring-focus rounded-full px-3 py-1 text-[12px] font-medium transition-all",
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
                    "ring-focus rounded-full px-3 py-1 text-[12px] font-medium transition-all",
                    timeRange === "30d"
                      ? "bg-ink/90 text-paper shadow-sm"
                      : "text-ink-muted hover:bg-paper-sunken/50 hover:text-ink",
                  )}
                >
                  30 days
                </button>
              </div>
              <button
                type="button"
                className="press ring-focus flex h-8 w-8 items-center justify-center rounded-lg border border-line/50 bg-paper text-ink-faint hover:bg-paper-sunken hover:text-ink"
                aria-label="Activity chart info"
                title="Daily request count over the selected period"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
          </div>

          {loading && !summary ? (
            <div className="flex h-[190px] items-center justify-center text-[13px] text-ink-muted">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Loading usage
            </div>
          ) : (
            <div
              className="relative"
              onMouseMove={handleChartMouseMove}
              onMouseLeave={handleChartMouseLeave}
            >
              <div className="absolute inset-y-0 left-0 flex w-10 flex-col justify-between text-[11px] text-ink-faint">
                <span>{formatNumber(maxValue)}</span>
                <span>{formatNumber(Math.round(maxValue * 0.75))}</span>
                <span>{formatNumber(Math.round(maxValue * 0.5))}</span>
                <span>{formatNumber(Math.round(maxValue * 0.25))}</span>
                <span>0</span>
              </div>

              <div className="relative ml-10" style={{ height: "160px" }}>
                <div className="pointer-events-none absolute inset-0">
                  {[0, 0.25, 0.5, 0.75].map((pos) => (
                    <div
                      key={pos}
                      className="absolute left-0 right-0 border-t border-line/40"
                      style={{ top: `${pos * 100}%` }}
                    />
                  ))}
                </div>

                <div className="relative flex h-full items-end gap-1">
                  {currentData.map((day, index) => {
                    const isHovered = hoveredIndex === index;
                    const barHeight = day.value > 0 ? Math.max(4, (day.value / maxValue) * 160) : 0;

                    return (
                      <div
                        key={`${day.date}-${index}`}
                        className={cn(
                          "flex-1 rounded-t transition-all duration-200",
                          isHovered ? "scale-y-[1.02] bg-ink/80" : "bg-ink/60",
                          day.value === 0 && "bg-transparent",
                        )}
                        style={{ height: `${barHeight}px`, minWidth: 2 }}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="ml-10 mt-2 flex text-[11px] text-ink-faint">
                <span>{currentData[0]?.date}</span>
                <span className="flex-1 text-center">
                  {currentData[Math.floor(currentData.length / 2)]?.date}
                </span>
                <span>{currentData[currentData.length - 1]?.date}</span>
              </div>

              {hoveredIndex !== null && tooltipPosition && currentData[hoveredIndex] && (
                <div
                  className="fixed z-50 rounded-xl border border-line/80 bg-paper-raised px-3 py-2 shadow-pop"
                  style={{
                    left: `${tooltipPosition.x + 12}px`,
                    top: `${tooltipPosition.y - 8}px`,
                  }}
                >
                  <div className="text-[12px] text-ink-muted">{currentData[hoveredIndex].date}</div>
                  <div className="text-[14px] font-semibold text-ink">
                    {formatNumber(currentData[hoveredIndex].value)} requests
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-ink-faint">
                    {formatNumber(currentData[hoveredIndex].roots)} root /{" "}
                    {formatNumber(currentData[hoveredIndex].continuations)} continuation
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {summary?.owner_provider_overview?.length ? (
          <section className="mt-6 rounded-2xl border border-line bg-paper p-6">
            <h2 className="text-[16px] font-semibold text-ink">Provider Health</h2>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              Owner-only router activity from the last 7 days.
            </p>
            <div className="mt-4 divide-y divide-line/60">
              {summary.owner_provider_overview.map((provider) => (
                <div key={provider.provider_name} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <div className="text-[13px] font-semibold text-ink">{provider.provider_name}</div>
                    <div className="mt-0.5 text-[12px] text-ink-muted">
                      {provider.last_model_id || "No model observed"} / status {provider.last_status || "unknown"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-semibold text-ink">
                      {formatNumber(provider.requests_7d)}
                    </div>
                    <div className="text-[11.5px] text-ink-faint">requests</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
