import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../api/client";
import CalendarGrid from "../../components/CalendarGrid";
import QuickChart from "../../components/QuickChart";
import ScheduleCreateModal from "../../components/ScheduleCreateModal";

// Temporary circular icon placeholder used across the UI
function PlaceholderIcon({
  size = "w-11 h-11",
  variant = "primary",
  label = "icon",
}) {
  const styles = {
    primary: "bg-[#f2c6cf] text-[#8a1d35]",
    secondary: "bg-[#f0d9dd] text-[#b0475c]",
    ghost: "bg-white text-[#b0475c] border border-[#efccd2]",
  };
  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold uppercase tracking-[0.2em] text-[10px] ${size} ${styles[variant]}`}
    >
      {label}
    </div>
  );
}

function getStartYearOptions() {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current + 1; y >= current - 6; y--) years.push(String(y));
  return years;
}
function formatSY(startYear) {
  const a = Number(startYear);
  if (!a) return "S.Y. —";
  return `S.Y. ${a}-${a + 1}`;
}

const FALLBACK_BATCHES = [
  { code: "2025-A", count: 80 },
  { code: "2025-B", count: 120 },
  { code: "2025-C", count: 180 },
  { code: "2025-D", count: 50 },
  { code: "2025-E", count: 75 },
  { code: "2025-F", count: 30 },
];

function timeAgo(input) {
  const t = new Date(input).getTime();
  if (!t) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "a while ago";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

export default function Dashboard() {
  const { isAuthenticated, user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ totals: null, batchAnalytics: [] });
  const [startYear, setStartYear] = useState(String(new Date().getFullYear()));
  const [searchQuery, setSearchQuery] = useState("");
  const [activities, setActivities] = useState([]);
  const [gcal, setGcal] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [gaPushing, setGaPushing] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        const data = await api.dashboardStats(token, startYear);
        if (!alive) return;
        setStats({
          totals: data?.totals || null,
          batchAnalytics: Array.isArray(data?.batchAnalytics)
            ? data.batchAnalytics
            : [],
        });
      } catch (err) {
        if (!alive) return;
        setError(err.message || "Unable to load dashboard data");
        setStats({ totals: null, batchAnalytics: [] });
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [token, startYear]);

  // Load activity
  useEffect(() => {
    let alive = true;
    async function loadActivity() {
      if (!token) return;
      try {
        const data = await api.dashboardActivity(token, startYear);
        if (!alive) return;
        setActivities(Array.isArray(data?.events) ? data.events : []);
      } catch (_) {
        if (!alive) return;
        setActivities([]);
      }
    }
    loadActivity();
    return () => {
      alive = false;
    };
  }, [token, startYear]);

  useEffect(() => {
    let alive = true;
    async function loadCalendar() {
      if (!token) return;
      const now = new Date();
      const timeMin = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const timeMax = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000
      ).toISOString();
      try {
        const data = await api.calendarEvents(token, { timeMin, timeMax });
        if (!alive) return;
        const items = Array.isArray(data?.events) ? data.events : [];
        items.sort(
          (a, b) =>
            new Date(a.start?.dateTime || a.start?.date || 0) -
            new Date(b.start?.dateTime || b.start?.date || 0)
        );
        setGcal(items.slice(0, 10));
      } catch (_) {
        if (!alive) return;
        setGcal([]);
      }
    }
    loadCalendar();
    return () => {
      alive = false;
    };
  }, [token]);

  async function refreshCalendar() {
    if (!token) return;
    const now = new Date();
    const timeMin = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const timeMax = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    ).toISOString();
    try {
      const data = await api.calendarEvents(token, { timeMin, timeMax });
      const items = Array.isArray(data?.events) ? data.events : [];
      items.sort(
        (a, b) =>
          new Date(a.start?.dateTime || a.start?.date || 0) -
          new Date(b.start?.dateTime || b.start?.date || 0)
      );
      setGcal(items.slice(0, 10));
    } catch (_) {
      setGcal([]);
    }
    setCalendarRefreshKey((prev) => prev + 1);
  }

  async function deleteSchedule(id) {
    if (!token || !id) return;
    try {
      await api.calendarDelete(token, id);
      await refreshCalendar();
    } catch (e) {
      setError(e.message || "Failed to delete schedule");
    }
  }

  async function pushAnalyticsToGA() {
    if (!token) return;
    try {
      setGaPushing(true);
      setError('');
      await api.dashboardPushGa(token, startYear);
      try { if (window.gtag) window.gtag('event', 'dashboard_push_ga', { start_year: startYear }) } catch (_) {}
    } catch (e) {
      setError(e.message || 'Failed to push analytics');
    } finally {
      setGaPushing(false);
    }
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || user.role !== "DEPT_HEAD") return <Navigate to="/" replace />;

  const totals = stats.totals || {
    totalApplicants: 0,
    interviewed: 0,
    passedInterview: 0,
    enrolled: 0,
    awol: 0,
  };
  const summaryCards = [
    { label: "Total Applicant", value: totals.totalApplicants },
    { label: "Interviewed", value: totals.interviewed },
    { label: "Passed Interview", value: totals.passedInterview },
    { label: "Enrolled", value: totals.enrolled },
    { label: "AWOL", value: totals.awol },
  ];

  const batches = stats.batchAnalytics || [];
  const avgBatchCount = useMemo(() => {
    const arr = batches.map(b => Number(b.count ?? b.value ?? 0));
    if (!arr.length) return 0;
    return Math.round(arr.reduce((a, c) => a + c, 0) / arr.length);
  }, [batches]);

  const passRate = useMemo(() => {
    const base = totals.interviewed || totals.totalApplicants || 0;
    if (!base) return { passed: 0, failed: 100 };
    const passed = Math.min(
      100,
      Math.round((totals.passedInterview / base) * 100)
    );
    const failed = Math.max(0, 100 - passed);
    return { passed, failed };
  }, [totals]);

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Sidebar (already styled to match) */}
      <aside className="w-80 shrink-0">
        <Sidebar />
      </aside>

      {/* Main + Right column */}
      <div className="flex-1 grid grid-cols-[1fr_360px]">
        {/* Main content */}
        <main className="bg-[#f7f1f2] px-10 py-8">
          <h1 className="text-4xl font-extrabold tracking-[0.28em] text-[#7d102a]">
            DASHBOARD
          </h1>
          <p className="mt-3 flex items-center gap-2 text-sm text-[#6e2a39]">
            <span>Showing for:</span>
            <select
              value={startYear}
              onChange={(e) => setStartYear(e.target.value)}
              className="font-semibold bg-transparent text-[#6e2a39] border-none outline-none cursor-pointer underline decoration-[#6e2a39]/30 decoration-2"
            >
              {getStartYearOptions().map((yr) => (
                <option key={yr} value={yr} className="text-[#6e2a39]">
                  {formatSY(yr)}
                </option>
              ))}
            </select>
            <button onClick={pushAnalyticsToGA} disabled={gaPushing} className="ml-4 h-7 rounded-full border border-[#efccd2] px-3 text-[12px] text-[#7d102a] hover:bg-[#f8e7eb]">
              {gaPushing ? 'Pushing…' : 'Push to GA'}
            </button>
          </p>

          {/* Summary cards */}
          <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {summaryCards.map((card, idx) => (
              <div
                key={card.label}
                className="rounded-xl bg-white px-5 py-5 shadow-[0_10px_18px_rgba(139,23,47,0.08)] border border-[#efccd2] flex flex-col items-center justify-between overflow-hidden h-40"
              >
                <PlaceholderIcon
                  variant={idx % 2 === 0 ? "primary" : "secondary"}
                />
                <div className="text-[10px] uppercase tracking-[0.22em] text-[#a86a74] leading-4 text-center break-words whitespace-normal max-w-[8rem]">
                  {card.label}
                </div>
                {loading ? (
                  <div className="h-3 w-10 rounded bg-[#f3d9de] animate-pulse" />
                ) : (
                  <span className="text-2xl font-extrabold text-[#7d102a]">
                    {Number.isFinite(card.value) ? card.value : 0}
                  </span>
                )}
              </div>
            ))}
          </section>

          {/* Analytics panels or Looker Studio embed */}
          {import.meta.env.VITE_LOOKER_STUDIO_EMBED_URL ? (
            <section className="mt-6 grid grid-cols-1">
              <div className="rounded-xl bg-white p-6 shadow-[0_12px_24px_rgba(139,23,47,0.08)] border border-[#efccd2]">
                <h2 className="text-sm font-bold text-[#7d102a]">Analytics Report</h2>
                <div className="mt-4">
                  <iframe
                    src={import.meta.env.VITE_LOOKER_STUDIO_EMBED_URL}
                    style={{ width: '100%', height: 420, border: '0' }}
                    allowFullScreen
                  />
                </div>
              </div>
            </section>
          ) : (
            <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-xl bg-white p-6 shadow-[0_12px_24px_rgba(139,23,47,0.08)] border border-[#efccd2]">
                <h2 className="text-sm font-bold text-[#7d102a]">Counts: Pass vs Fail</h2>
                {(() => {
                  const base = totals.interviewed || totals.totalApplicants || 0
                  const rows = [
                    { label: 'Failed', value: Math.max(0, base - Number(totals.passedInterview || 0)), color: '#7d102a' },
                    { label: 'Passed', value: Number(totals.passedInterview || 0), color: '#f4c3ce' },
                  ]
                  if (!base) return (<div className="mt-5 text-sm text-[#a86a74]">No data for the selected school year.</div>)
                  return (
                    <div className="mt-4 flex flex-col gap-3">
                      {rows.map((r) => {
                        const pct = Math.max(0, Math.min(100, Math.round((r.value / base) * 100)))
                        return (
                          <div key={r.label} className="grid grid-cols-[1fr_80px] items-center gap-4">
                            <div className="flex items-center gap-3">
                              <span className="w-20 text-sm text-[#7d102a]">{r.label}</span>
                              <div className="flex-1 h-4 rounded-full bg-[#f2f4f7]">
                                <div className="h-4 rounded-full" style={{ width: `${pct}%`, background: r.color }} />
                              </div>
                            </div>
                            <div className="text-right text-sm text-[#7d102a] font-semibold">{r.value}</div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
              <div className="rounded-xl bg-white p-6 shadow-[0_12px_24px_rgba(139,23,47,0.08)] border border-[#efccd2]">
                <h2 className="text-sm font-bold text-[#7d102a]">Percentage: Pass Rates</h2>
                <QuickChart
                  type="PieChart"
                  className="mt-4"
                  style={{ width: '100%', height: 280 }}
                  data={[["Result", "Percent"], ["Failed", Number(passRate.failed || 0)], ["Passed", Number(passRate.passed || 0)]]}
                  options={{
                    backgroundColor: 'transparent',
                    legend: { position: 'bottom', textStyle: { color: '#7d102a' } },
                    slices: { 0: { color: '#7d102a' }, 1: { color: '#f4c3ce' } },
                  }}
                />
              </div>
            </section>
          )}

          {!import.meta.env.VITE_LOOKER_STUDIO_EMBED_URL && (
            <section className="mt-6 grid grid-cols-1">
              <div className="rounded-xl bg-white p-6 shadow-[0_12px_24px_rgba(139,23,47,0.08)] border border-[#efccd2]">
                <h2 className="text-sm font-bold text-[#7d102a]">Batch Analytics</h2>
                {(() => {
                  const rows = (batches && batches.length ? batches : FALLBACK_BATCHES).map((b) => [String(b.code || b.label || '—'), Number(b.count ?? b.value ?? 0)])
                  const data = [["Batch", "Count"], ...rows]
                  return (
                    <QuickChart
                      type="BarChart"
                      className="mt-4"
                      style={{ width: '100%', height: 280 }}
                      data={data}
                      options={{
                        backgroundColor: 'transparent',
                        legend: { position: 'bottom', textStyle: { color: '#7d102a' } },
                        slices: { 0: { color: '#7d102a' } },
                      }}
                    />
                  )
                })()}
              </div>
            </section>
          )}

          {/* Google Calendar UI */}
          <section className="mt-6">
            <CalendarGrid key={calendarRefreshKey} />
          </section>
          {/* Add schedule CTA */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setShowScheduleModal(true)}
              className="h-9 rounded-md bg-[#8a1d35] text-white text-[13px] font-semibold px-4"
            >
              Add schedule
            </button>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {showScheduleModal && (
            <ScheduleCreateModal
              open={showScheduleModal}
              onClose={() => setShowScheduleModal(false)}
              onCreated={refreshCalendar}
            />
          )}
        </main>

        {/* Right column */}
        <aside className="border-l border-[#efccd2] bg-[#fbf3f4] px-6 py-8">
          <div className="rounded-3xl bg-gradient-to-b from-[#efc4cd] to-[#f5d8de] p-5 shadow-[0_14px_28px_rgba(139,23,47,0.08)]">
            {/* Top bar: left search, right bell + name + caret */}
            <div className="flex items-center justify-between">
              {/* Left: compact search (kept) */}
              {/* <div className="relative" style={{ width: "220px" }}>
                <input
                  type="search"
                  placeholder="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-full rounded-full bg-white pl-8 pr-3 text-[13px] text-[#2f2b33] placeholder:text-[#8c7f86] outline-none focus:outline-none focus-visible:outline-none shadow-[inset_0_0_0_1px_#efccd2] focus:shadow-[inset_0_0_0_2px_#cfa3ad]"
                />
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white text-[#8a1d35] border border-[#efccd2]">
                    <svg
                      viewBox="0 0 20 20"
                      className="w-3.5 h-3.5 fill-current"
                    >
                      <path d="M12.9 14.32a8 8 0 111.414-1.414l3.387 3.387-1.414 1.414-3.387-3.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" />
                    </svg>
                  </div>
                </span>
              </div> */}

              {/* Right: bell | divider | name + caret */}
              <div className="flex items-center gap-3 text-[#2f2b33]">
                <svg viewBox="0 0 20 20" className="w-5 h-5 fill-current">
                  <path d="M10 18a2 2 0 002-2H8a2 2 0 002 2zm6-6V9a6 6 0 10-12 0v3l-2 2v1h16v-1l-2-2z" />
                </svg>
                <span className="h-5 w-px bg-[#b67a86]/60" />
                <span className="text-base font-semibold">
                  {/* {user?.firstName || "Santiago"} {user?.lastName || "Garcia"} */}
                  Department Head
                </span>
                <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current">
                  <path d="M5.5 7.5l4.5 5 4.5-5H5.5z" />
                </svg>
              </div>
            </div>
            {/* Search bar */}
            <div className="mt-3 relative w-full">
              <input
                type="search"
                placeholder="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-[10px] bg-white text-[13px] p-2 text-[#2f2b33] placeholder:text-[#8c7f86] outline-none focus:outline-none focus-visible:outline-none shadow-[inset_0_0_0_1px_#efccd2] focus:shadow-[inset_0_0_0_2px_#cfa3ad]"
              />
            </div>
          </div>

          {/* Removed Add Schedule box */}

          <div className="mt-8">
            <h2 className="text-sm font-bold text-[#7d102a]">Schedules</h2>
            <div className="mt-4 flex flex-col gap-3 pr-2 max-h-[320px] overflow-y-auto">
              {gcal.length === 0 && (
                <div className="text-sm text-[#a86a74]">No schedules.</div>
              )}
              {gcal.map((ev) => {
                const when = ev.start?.dateTime || ev.start?.date;
                const dt = when ? new Date(when) : null;
                return (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-[0_8px_18px_rgba(139,23,47,0.08)] border border-[#efccd2]"
                  >
                    <PlaceholderIcon size="w-12 h-12" variant="ghost" />
                    <div className="flex-1 text-sm leading-relaxed text-[#7d102a]">
                      <p className="font-semibold">
                        {ev.summary || "Untitled Event"}
                      </p>
                      <p className="text-xs text-[#a86a74]">
                        {dt ? dt.toLocaleString() : ""}
                      </p>
                    </div>
                    {!ev.htmlLink && (
                      <button
                        onClick={() => {
                          if (window.confirm("Delete this schedule?"))
                            deleteSchedule(ev.id);
                        }}
                        className="ml-2 rounded-full border border-[#efccd2] text-[#7d102a] hover:bg-[#f8e7eb] px-3 py-1 text-xs"
                        title="Delete schedule"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-bold text-[#7d102a]">
              Recent Activity
            </h2>
            <div className="mt-4 flex flex-col gap-4 pr-2 max-h-[560px] overflow-y-auto">
              {activities
                .filter((a) => {
                  const q = searchQuery.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    a.actor.toLowerCase().includes(q) ||
                    a.action.toLowerCase().includes(q) ||
                    timeAgo(a.when).toLowerCase().includes(q)
                  );
                })
                .map((activity) => (
                  <div
                    key={activity.id}
                    className="flex gap-3 rounded-xl bg-white px-4 py-3 shadow-[0_8px_18px_rgba(139,23,47,0.08)] border border-[#efccd2]"
                  >
                    <PlaceholderIcon size="w-12 h-12" variant="secondary" />
                    <div className="text-sm leading-relaxed text-[#7d102a]">
                      <p>
                        <span className="font-semibold">{activity.actor}</span>{" "}
                        {activity.action}
                      </p>
                      <p className="text-xs text-[#a86a74]">
                        {timeAgo(activity.when)}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
