import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../api/client";
import CalendarGrid from "../../components/CalendarGrid";
import QuickChart from "../../components/QuickChart";
import ScheduleCreateModal from "../../components/ScheduleCreateModal";
import RecentAddedIcon from "../../assets/recent-activity-added-student.png";
import RecentEditedIcon from "../../assets/recent-activty-edited.png";
import RecentArchiveIcon from "../../assets/recent-activity-icon-archive.png";
import ApplicantsIcon from "../../assets/applicants.png";
import InterviewedIcon from "../../assets/interviewed.png";
import PassedIcon from "../../assets/passed-interviewe.png";
import EnrolledIcon from "../../assets/enrolled.png";
import ScheduleIcon from "../../assets/Union.png";

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
  const calendarId = import.meta.env.VITE_GOOGLE_CALENDAR_ID || 'primary';
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
  const [emcTop, setEmcTop] = useState([]);
  const [itTop, setItTop] = useState([]);
  const [emcConfirmedData, setEmcConfirmedData] = useState([]);
  const [itConfirmedData, setItConfirmedData] = useState([]);
  const [emcConfirmedCounts, setEmcConfirmedCounts] = useState([]);
  const [itConfirmedCounts, setItConfirmedCounts] = useState([]);
  const [includeAllInterviewees, setIncludeAllInterviewees] = useState(true);
  const [courseFilter, setCourseFilter] = useState('IT');
  const [activeTab, setActiveTab] = useState('overview');
  const [showNotifications, setShowNotifications] = useState(false);
  const [emcRowsAll, setEmcRowsAll] = useState([]);
  const [itRowsAll, setItRowsAll] = useState([]);
  const [bsitEnrolledCount, setBsitEnrolledCount] = useState(0);
  const [bsemcEnrolledCount, setBsemcEnrolledCount] = useState(0);
  const [emcPassersStrandData, setEmcPassersStrandData] = useState([]);
  const [itPassersStrandData, setItPassersStrandData] = useState([]);
  const [emcPassersStrandCounts, setEmcPassersStrandCounts] = useState([]);
  const [itPassersStrandCounts, setItPassersStrandCounts] = useState([]);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState(new Set());
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [archiveConfirmIds, setArchiveConfirmIds] = useState([]);
  const [archiveConfirmLoading, setArchiveConfirmLoading] = useState(false);

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
      } catch {
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
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const timeMin = startOfToday.toISOString();
      const timeMax = new Date(
        now.getTime() + 365 * 24 * 60 * 60 * 1000
      ).toISOString();
      try {
        const data = await api.calendarEvents(token, { timeMin, timeMax, calendarId });
        if (!alive) return;
        const items = Array.isArray(data?.events) ? data.events : [];
        items.sort(
          (a, b) =>
            new Date(a.start?.dateTime || a.start?.date || 0) -
            new Date(b.start?.dateTime || b.start?.date || 0)
        );
        setGcal(items);
      } catch {
        if (!alive) return;
        setGcal([]);
      }
    }
    loadCalendar();
    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => {
    let alive = true;
    async function loadLeaderboards() {
      if (!token) return;
      try {
        const studentsRes = await api.request('GET', '/students', { token });
        const reportsRes = await api.request('GET', '/reports', { token });
        const students = Array.isArray(studentsRes?.rows) ? studentsRes.rows : [];
        const reports = Array.isArray(reportsRes?.rows) ? reportsRes.rows : [];
        const examMap = new Map();
        for (const r of reports) {
          const key = String(r.studentName || '').trim().toLowerCase();
          if (!key) continue;
          const val = typeof r.examScore === 'number' ? r.examScore : (r.examScore ?? undefined);
          examMap.set(key, val);
        }
        const emcRows = [];
        const itRows = [];
        for (const s of students) {
          const name1 = `${s.firstName || ''} ${s.lastName || ''}`.trim().toLowerCase();
          const name2 = `${s.lastName || ''} ${s.firstName || ''}`.trim().toLowerCase();
          const key = name1 || name2;
          if (!key) continue;
          const course = String(s.course || s.preferredCourse || '').toUpperCase();
          const examScore = examMap.get(key);
          const entry = {
            firstName: s.firstName || '',
            lastName: s.lastName || '',
            email: s.email || '',
            percentileScore: s.percentileScore || '',
            qScore: s.qScore || '',
            sScore: s.sScore || '',
            finalScore: s.finalScore || '',
            examScore,
            interviewDate: s.interviewDate || '',
            shsStrand: s.shsStrand || '',
            interviewerDecision: s.interviewerDecision || '',
            recordCategory: s.recordCategory || '',
            enrollmentStatus: s.enrollmentStatus || '',
          };
          if (course.includes('EMC')) emcRows.push(entry);
          else if (course.includes('IT')) itRows.push(entry);
        }
        const bsitEnrolled = students.filter((s) => {
          const rc = String(s.recordCategory || '').toUpperCase();
          const course = String(s.course || s.preferredCourse || '').toUpperCase();
          return rc === 'STUDENT' && course.includes('IT');
        }).length;
        const bsemcEnrolled = students.filter((s) => {
          const rc = String(s.recordCategory || '').toUpperCase();
          const course = String(s.course || s.preferredCourse || '').toUpperCase();
          return rc === 'STUDENT' && course.includes('EMC');
        }).length;
        const rankVal = (row) => {
          const f = Number(row.finalScore);
          if (Number.isFinite(f)) return f;
          const e = Number(row.examScore);
          return Number.isFinite(e) ? e : -Infinity;
        };
        emcRows.sort((a, b) => rankVal(b) - rankVal(a));
        itRows.sort((a, b) => rankVal(b) - rankVal(a));
        if (!alive) return;
        setBsitEnrolledCount(bsitEnrolled);
        setBsemcEnrolledCount(bsemcEnrolled);
        setEmcTop(emcRows.slice(0, 60));
        setItTop(itRows.slice(0, 120));

        const buildConfirmedChart = (rows) => {
          const confirmed = includeAllInterviewees ? rows : rows.filter(r => !!r.interviewDate);
          const counts = new Map();
          const formatPct = (val) => {
            if (val === undefined || val === null) return '';
            if (typeof val === 'number' && Number.isFinite(val)) return `${val.toFixed(2)}%`;
            const txt = String(val).trim();
            const m = txt.match(/^(\d+(?:\.\d+)?)\s*%?$/);
            if (m) return `${parseFloat(m[1]).toFixed(2)}%`;
            return txt; // fallback: keep as-is
          };
          for (const r of confirmed) {
            const pct = r.percentileScore ?? '';
            const fscore = r.finalScore ?? '';
            const fallback = Number(r.examScore);
            const label = formatPct(pct || fscore || (Number.isFinite(fallback) ? fallback : ''));
            if (!label) continue;
            counts.set(label, (counts.get(label) || 0) + 1);
          }
          const labels = Array.from(counts.keys());
          labels.sort((a, b) => {
            const pa = parseFloat(String(a).replace('%', ''));
            const pb = parseFloat(String(b).replace('%', ''));
            if (Number.isFinite(pa) && Number.isFinite(pb)) return pa - pb;
            return String(a).localeCompare(String(b));
          });
          const rowsData = labels.map(l => [l, counts.get(l)]);
          const countsList = labels.map(l => ({ label: l, count: counts.get(l) }));
          const total = confirmed.length;
          rowsData.push(['Grand Total', total]);
          countsList.push({ label: 'Grand Total', count: total });
          return { data: [['Percentile Score', 'No of Confirmed Interviewees'], ...rowsData], counts: countsList };
        };
        const emcChart = buildConfirmedChart(emcRows);
        const itChart = buildConfirmedChart(itRows);
        setEmcConfirmedData(emcChart.data);
        setItConfirmedData(itChart.data);
        setEmcConfirmedCounts(emcChart.counts);
        setItConfirmedCounts(itChart.counts);
        setEmcRowsAll(emcRows);
        setItRowsAll(itRows);

        const buildPassersByStrand = (rows) => {
          const norm = (t) => {
            const v = String(t || '').trim().toUpperCase();
            if (!v) return '';
            if (v.includes('STEM')) return 'STEM';
            if (v.includes('ABM')) return 'ABM';
            if (v.includes('HUMSS')) return 'HUMSS';
            if (v.includes('TVL')) return 'TVL-ICT';
            return v;
          };
          const passed = rows.filter(r => String(r.interviewerDecision || '').trim().toUpperCase() === 'PASSED');
          const counts = new Map();
          for (const r of passed) {
            const key = norm(r.shsStrand);
            if (!key) continue;
            counts.set(key, (counts.get(key) || 0) + 1);
          }
          const labels = Array.from(counts.keys());
          labels.sort((a, b) => {
            const order = { 'STEM': 0, 'ABM': 1, 'HUMSS': 2, 'TVL-ICT': 3 };
            const ai = order[a] ?? 99;
            const bi = order[b] ?? 99;
            return ai - bi;
          });
          const rowsData = labels.map(l => [l, counts.get(l)]);
          const list = labels.map(l => ({ label: l, count: counts.get(l) }));
          const total = passed.length;
          rowsData.push(['Grand Total', total]);
          list.push({ label: 'Grand Total', count: total });
          return { data: [['SHS Strand', 'No. of Students who passed interview'], ...rowsData], counts: list };
        };
        const emcStrand = buildPassersByStrand(emcRows);
        const itStrand = buildPassersByStrand(itRows);
        setEmcPassersStrandData(emcStrand.data);
        setItPassersStrandData(itStrand.data);
        setEmcPassersStrandCounts(emcStrand.counts);
        setItPassersStrandCounts(itStrand.counts);
      } catch {
        if (!alive) return;
        setEmcTop([]);
        setItTop([]);
        setEmcConfirmedData([]);
        setItConfirmedData([]);
      }
    }
    loadLeaderboards();
    return () => { alive = false; };
  }, [token]);

  useEffect(() => {
    const build = (rows) => {
      const list = includeAllInterviewees ? rows : rows.filter(r => !!r.interviewDate);
      const counts = new Map();
      const fmt = (val) => {
        if (val === undefined || val === null) return '';
        if (typeof val === 'number' && Number.isFinite(val)) return `${val.toFixed(2)}%`;
        const txt = String(val).trim();
        const m = txt.match(/^(\d+(?:\.\d+)?)\s*%?$/);
        return m ? `${parseFloat(m[1]).toFixed(2)}%` : txt;
      };
      for (const r of list) {
        const pct = r.percentileScore ?? '';
        const fscore = r.finalScore ?? '';
        const fallback = Number(r.examScore);
        const label = fmt(pct || fscore || (Number.isFinite(fallback) ? fallback : ''));
        if (!label) continue;
        counts.set(label, (counts.get(label) || 0) + 1);
      }
      const labels = Array.from(counts.keys()).sort((a, b) => {
        const pa = parseFloat(String(a).replace('%', ''));
        const pb = parseFloat(String(b).replace('%', ''));
        if (Number.isFinite(pa) && Number.isFinite(pb)) return pa - pb;
        return String(a).localeCompare(String(b));
      });
      const rowsData = labels.map(l => [l, counts.get(l)]);
      const countsList = labels.map(l => ({ label: l, count: counts.get(l) }));
      const total = list.length;
      rowsData.push(['Grand Total', total]);
      countsList.push({ label: 'Grand Total', count: total });
      return { data: [['Percentile Score', 'No of Confirmed Interviewees'], ...rowsData], counts: countsList };
    };
    const emcChart = build(emcRowsAll);
    const itChart = build(itRowsAll);
    setEmcConfirmedData(emcChart.data);
    setItConfirmedData(itChart.data);
    setEmcConfirmedCounts(emcChart.counts);
    setItConfirmedCounts(itChart.counts);
  }, [includeAllInterviewees, emcRowsAll, itRowsAll]);

  async function refreshCalendar() {
    if (!token) return;
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const timeMin = startOfToday.toISOString();
    const timeMax = new Date(
      now.getTime() + 365 * 24 * 60 * 60 * 1000
    ).toISOString();
    try {
      const data = await api.calendarEvents(token, { timeMin, timeMax, calendarId });
      const items = Array.isArray(data?.events) ? data.events : [];
      items.sort(
        (a, b) =>
          new Date(a.start?.dateTime || a.start?.date || 0) -
          new Date(b.start?.dateTime || b.start?.date || 0)
      );
      setGcal(items);
    } catch {
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

  function openArchiveConfirm(ids) {
    const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (!list.length) return;
    setArchiveConfirmIds(list);
    setArchiveConfirmOpen(true);
  }

  function closeArchiveConfirm() {
    setArchiveConfirmOpen(false);
    setArchiveConfirmIds([]);
    setArchiveConfirmLoading(false);
  }

  async function confirmArchive() {
    if (!token || !archiveConfirmIds.length) { closeArchiveConfirm(); return; }
    try {
      setArchiveConfirmLoading(true);
      for (const id of archiveConfirmIds) {
        try { await api.calendarDelete(token, id); } catch (_) {}
      }
      await refreshCalendar();
      setSelectedScheduleIds(new Set());
    } finally {
      closeArchiveConfirm();
    }
  }

  async function pushAnalyticsToGA() {
    if (!token) return;
    try {
      setGaPushing(true);
      setError('');
      await api.dashboardPushGa(token, startYear);
      try { if (window.gtag) window.gtag('event', 'dashboard_push_ga', { start_year: startYear }) } catch { void 0 }
    } catch (e) {
      setError(e.message || 'Failed to push analytics');
    } finally {
      setGaPushing(false);
    }
  }

  const redirectTo = (!isAuthenticated ? "/login" : (!user || user.role !== "DEPT_HEAD" ? "/" : null));

  const totals = stats.totals || {
    totalApplicants: 0,
    interviewed: 0,
    passedInterview: 0,
    enrolled: 0,
    awol: 0,
  };
  const summaryCards = [
    { key: 'applicants', label: "Total Applicant", value: totals.totalApplicants },
    { key: 'interviewed', label: "Interviewed", value: totals.interviewed },
    { key: 'passed', label: "Passed Interview", value: totals.passedInterview },
    { key: 'enrolled_bsit', label: "Enrolled BSIT", value: bsitEnrolledCount },
    { key: 'enrolled_bsemc', label: "Enrolled BSEMC", value: bsemcEnrolledCount },
    { key: 'enrolled_all', label: "Enrolled All Students", value: (bsitEnrolledCount + bsemcEnrolledCount) },
  ];

  const batches = stats.batchAnalytics || [];

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
  const failedInterviewCount = Math.max(0, (totals.interviewed || 0) - (totals.passedInterview || 0));

  return redirectTo ? (
    <Navigate to={redirectTo} replace />
  ) : (
    <div className="min-h-screen flex bg-white">
      {/* Left Sidebar (already styled to match) */}
      <aside className="w-80 shrink-0">
        <Sidebar />
      </aside>

      {/* Main + Right column */}
      <div className="flex-1 grid grid-cols-[1fr_360px]">
        {/* Main content */}
        <main className="bg-[#f7f1f2] px-10 py-8">
          <h1 className="text-4xl font-extrabold tracking-[0.28em] text-[#7d102a]">DASHBOARD</h1>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setActiveTab('overview')} className={`h-8 rounded-md px-3 text-[12px] font-semibold ${activeTab==='overview' ? 'bg-[#8a1d35] text-white' : 'border border-[#efccd2] text-[#7d102a]'}`}>Overview</button>
            <button onClick={() => setActiveTab('leaderboards')} className={`h-8 rounded-md px-3 text-[12px] font-semibold ${activeTab==='leaderboards' ? 'bg-[#8a1d35] text-white' : 'border border-[#efccd2] text-[#7d102a]'}`}>Leaderboards</button>
          </div>
          {archiveConfirmOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center">
              <div className="absolute inset-0 bg-black/30" onClick={closeArchiveConfirm} />
              <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#f4c3c6] to-[#f3b1b7] p-6 border-2 border-[#6b2b2b] shadow-[0_35px_90px_rgba(239,150,150,0.35)]">
                <div className="text-center text-[#6b2b2b] font-bold text-lg mb-2">
                  {archiveConfirmIds.length > 1 ? 'Archive these schedules?' : 'Archive this schedule?'}
                </div>
                <p className="text-center text-[#6b2b2b] text-sm">This action will remove it from active lists.</p>
                <div className="mt-4 flex justify-center gap-3">
                  <button onClick={confirmArchive} disabled={archiveConfirmLoading} className="rounded-full bg-[#6b0000] text-white px-6 py-2 disabled:opacity-50">{archiveConfirmLoading ? 'Archiving…' : 'Continue'}</button>
                  <button onClick={closeArchiveConfirm} className="rounded-full bg-white text-[#6b2b2b] border border-[#6b2b2b] px-6 py-2">Cancel</button>
                </div>
              </div>
            </div>
          )}
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
            
            <label className="ml-4 inline-flex items-center gap-2">
              <span>Show:</span>
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="font-semibold bg-transparent text-[#6e2a39] border border-[#efccd2] rounded-md px-2 py-1"
              >
                <option value="IT">BSIT</option>
                <option value="EMC">BSEMC</option>
                <option value="ALL">All</option>
              </select>
            </label>
          </p>

          {/* Summary cards (non-enrolled) */}
          <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {summaryCards.filter((card) => !String(card.key || '').startsWith('enrolled_')).map((card) => (
              <div
                key={card.key}
                className="rounded-xl bg-white px-5 py-5 shadow-[0_10px_18px_rgba(139,23,47,0.08)] border border-[#efccd2] flex flex-col items-center justify-between overflow-hidden h-40"
              >
                <div className="flex items-center justify-center rounded-full w-11 h-11 bg-[#f2c6cf]">
                  {(() => {
                    const iconMap = {
                      applicants: ApplicantsIcon,
                      interviewed: InterviewedIcon,
                      passed: PassedIcon,
                    };
                    const src = iconMap[card.key] || ApplicantsIcon;
                    return <img src={src} alt="" className="w-6 h-6" />;
                  })()}
                </div>
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

          {/* Enrolled cards in one line */}
          <div className="mt-4 grid grid-flow-col auto-cols-max gap-4 overflow-x-auto">
            {summaryCards.filter((card) => String(card.key || '').startsWith('enrolled_')).map((card) => (
              <div
                key={card.key}
                className="rounded-xl bg-white px-5 py-5 shadow-[0_10px_18px_rgba(139,23,47,0.08)] border border-[#efccd2] flex flex-col items-center justify-between overflow-hidden h-40 min-w-[220px]"
              >
                <div className="flex items-center justify-center rounded-full w-11 h-11 bg-[#f2c6cf]">
                  {(() => {
                    const iconMap = {
                      enrolled_bsit: EnrolledIcon,
                      enrolled_bsemc: EnrolledIcon,
                      enrolled_all: EnrolledIcon,
                    };
                    const src = iconMap[card.key] || EnrolledIcon;
                    return <img src={src} alt="" className="w-6 h-6" />;
                  })()}
                </div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-[#a86a74] leading-4 text-center break-words whitespace-normal max-w-[12rem]">
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
          </div>

          {activeTab === 'overview' && (
          <>
            <section className="mt-6">
              <CalendarGrid key={calendarRefreshKey} />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="h-9 rounded-md bg-[#8a1d35] text-white text-[13px] font-semibold px-4"
                >
                  Add schedule
                </button>
              </div>
            </section>

            <section className="mt-6 grid grid-cols-1 grid-rows-4 gap-3">
            {(courseFilter === 'IT') && (
              <div className="grid grid-cols-2 h-[20%] gap-8">
                <div className="flex flex-col justify-center items-center rounded-xl bg-white shadow-[0_12px_24px_rgba(139,23,47,0.08)] border border-[#efccd2]">
                  <h2 className="text-[30px] font-bold text-[#7d102a]">Percentage: Pass Rates</h2>
                  <div>
                    <QuickChart
                      type="PieChart"
                      className=""
                      style={{ width: 360, height: 360 }}
                      dataSource={{ url: '/dashboard/stats', params: { year: startYear }, path: 'charts.passRatePie' }}
                      token={token}
                      options={{
                        backgroundColor: 'transparent',
                        legend: { position: 'bottom', textStyle: { color: '#7d102a' } },
                        slices: { 0: { color: '#f4c3ce' }, 1: { color: '#7d102a' } },
                      }}
                      engine="quickchart"
                    />
                  </div>
                </div>
                <div className="flex flex-col items-center rounded-xl bg-white p-6 shadow-[0_12px_24px_rgba(139,23,47,0.08)] border border-[#efccd2] w-[100%] mx-auto">
                  <h2 className="text-[30px] font-bold text-[#7d102a]">Passers by SHS Strand - BSIT</h2>
                  {itPassersStrandData && itPassersStrandData.length ? (
                    <QuickChart
                      type="BarChart"
                      className="mt-4"
                      style={{ width: '100%', height: 360 }}
                      dataSource={{ url: '/dashboard/stats', params: { year: startYear }, path: 'charts.itPassersByStrand' }}
                      token={token}
                      options={{
                        backgroundColor: 'transparent',
                        legend: { position: 'bottom', textStyle: { color: '#7d102a' } },
                        slices: { 0: { color: '#7d102a' } },
                      }}
                      engine="quickchart"
                    />
                  ) : (
                    <div className="text-sm text-[#a86a74] mt-4">No data.</div>
                  )}
                </div>
                <div className="flex flex-col items-center w-full rounded-xl bg-white p-6 shadow-[0_12px_24px_rgba(139,23,47,0.08)] border border-[#efccd2] lg:col-span-2">
                  <h2 className="text-[30px] font-bold text-[#7d102a]">BSIT Population of Confirmed Interviewees</h2>
                  {itConfirmedData && itConfirmedData.length ? (
                    <QuickChart
                      type="BarChart"
                      className="mt-4"
                      style={{ width: '70%', height: 360 }}
                      dataSource={{ url: '/dashboard/stats', params: { year: startYear }, path: 'charts.itConfirmedByPercentile' }}
                      token={token}
                      options={{
                        backgroundColor: 'transparent',
                        legend: { position: 'bottom', textStyle: { color: '#7d102a' } },
                        slices: { 0: { color: '#7d102a' } },
                      }}
                      engine="quickchart"
                    />
                  ) : (
                    <div className="text-sm text-[#a86a74] mt-4">No data.</div>
                  )}
                </div>
              </div>
            )}
            {(courseFilter === 'EMC') && (
              <div className="grid grid-cols-2 h-[20%] gap-8">
                <div className="flex flex-col justify-center items-center rounded-xl bg-white shadow-[0_12px_24px_rgba(139,23,47,0.08)] border border-[#efccd2]">
                  <h2 className="text-[30px] font-bold text-[#7d102a]">Percentage: Pass Rates</h2>
                  <div>
                    <QuickChart
                      type="PieChart"
                      className=""
                      style={{ width: 360, height: 360 }}
                      dataSource={{ url: '/dashboard/stats', params: { year: startYear }, path: 'charts.passRatePie' }}
                      token={token}
                      options={{
                        backgroundColor: 'transparent',
                        legend: { position: 'bottom', textStyle: { color: '#7d102a' } },
                        slices: { 0: { color: '#f4c3ce' }, 1: { color: '#7d102a' } },
                      }}
                      engine="quickchart"
                    />
                  </div>
                </div>
                <div className="flex flex-col items-center rounded-xl bg-white p-6 shadow-[0_12px_24px_rgba(139,23,47,0.08)] border border-[#efccd2] w-[100%] mx-auto">
                  <h2 className="text-[30px] font-bold text-[#7d102a]">Passers by SHS Strand - BSEMC</h2>
                  {emcPassersStrandData && emcPassersStrandData.length ? (
                    <QuickChart
                      type="BarChart"
                      className="mt-4"
                      style={{ width: '100%', height: 360 }}
                      dataSource={{ url: '/dashboard/stats', params: { year: startYear }, path: 'charts.emcPassersByStrand' }}
                      token={token}
                      options={{
                        backgroundColor: 'transparent',
                        legend: { position: 'bottom', textStyle: { color: '#7d102a' } },
                        slices: { 0: { color: '#7d102a' } },
                      }}
                      engine="quickchart"
                    />
                  ) : (
                    <div className="text-sm text-[#a86a74] mt-4">No data.</div>
                  )}
                </div>
                <div className="flex flex-col items-center w-full rounded-xl bg-white p-6 shadow-[0_12px_24px_rgba(139,23,47,0.08)] border border-[#efccd2] lg:col-span-2">
                  <h2 className="text-[30px] font-bold text-[#7d102a]">BSEMC Population of Confirmed Interviewees</h2>
                  {emcConfirmedData && emcConfirmedData.length ? (
                    <QuickChart
                      type="BarChart"
                      className="mt-4"
                      style={{ width: '70%', height: 360 }}
                      dataSource={{ url: '/dashboard/stats', params: { year: startYear }, path: 'charts.emcConfirmedByPercentile' }}
                      token={token}
                      options={{
                        backgroundColor: 'transparent',
                        legend: { position: 'bottom', textStyle: { color: '#7d102a' } },
                        slices: { 0: { color: '#7d102a' } },
                      }}
                      engine="quickchart"
                    />
                  ) : (
                    <div className="text-sm text-[#a86a74] mt-4">No data.</div>
                  )}
                </div>
              </div>
            )}
            {(courseFilter === 'ALL') && (
              <div className="grid grid-cols-2 h-[20%] gap-8">
                <div className="flex flex-col justify-center items-center rounded-xl bg-white shadow-[0_12px_24px_rgba(139,23,47,0.08)] border border-[#efccd2]">
                  <h2 className="text-[30px] font-bold text-[#7d102a]">Percentage: Pass Rates</h2>
                  <div>
                    <QuickChart
                      type="PieChart"
                      className=""
                      style={{ width: 360, height: 360 }}
                      dataSource={{ url: '/dashboard/stats', params: { year: startYear }, path: 'charts.passRatePie' }}
                      token={token}
                      options={{
                        backgroundColor: 'transparent',
                        legend: { position: 'bottom', textStyle: { color: '#7d102a' } },
                        slices: { 0: { color: '#f4c3ce' }, 1: { color: '#7d102a' } },
                      }}
                      engine="quickchart"
                    />
                  </div>
                </div>
                <div className="flex flex-col items-center rounded-xl bg-white p-6 shadow-[0_12px_24px_rgba(139,23,47,0.08)] border border-[#efccd2] w-[100%] mx-auto">
                  <h2 className="text-[30px] font-bold text-[#7d102a]">Passers by SHS Strand - BSIT</h2>
                  {itPassersStrandData && itPassersStrandData.length ? (
                    <QuickChart
                      type="BarChart"
                      className="mt-4"
                      style={{ width: '100%', height: 360 }}
                      dataSource={{ url: '/dashboard/stats', params: { year: startYear }, path: 'charts.itPassersByStrand' }}
                      token={token}
                      options={{
                        backgroundColor: 'transparent',
                        legend: { position: 'bottom', textStyle: { color: '#7d102a' } },
                        slices: { 0: { color: '#7d102a' } },
                      }}
                      engine="quickchart"
                    />
                  ) : (
                    <div className="text-sm text-[#a86a74] mt-4">No data.</div>
                  )}
                </div>
                <div className="flex flex-col items-center rounded-xl bg-white p-6 shadow-[0_12px_24px_rgba(139,23,47,0.08)] border border-[#efccd2] w-[100%] mx-auto">
                  <h2 className="text-[30px] font-bold text-[#7d102a]">Passers by SHS Strand - BSEMC</h2>
                  {emcPassersStrandData && emcPassersStrandData.length ? (
                    <QuickChart
                      type="BarChart"
                      className="mt-4"
                      style={{ width: '100%', height: 360 }}
                      dataSource={{ url: '/dashboard/stats', params: { year: startYear }, path: 'charts.emcPassersByStrand' }}
                      token={token}
                      options={{
                        backgroundColor: 'transparent',
                        legend: { position: 'bottom', textStyle: { color: '#7d102a' } },
                        slices: { 0: { color: '#7d102a' } },
                      }}
                      engine="quickchart"
                    />
                  ) : (
                    <div className="text-sm text-[#a86a74] mt-4">No data.</div>
                  )}
                </div>
                <div className="flex flex-col items-center w-full rounded-xl bg-white p-6 shadow-[0_12px_24px_rgba(139,23,47,0.08)] border border-[#efccd2] lg:col-span-2">
                  <h2 className="text-[30px] font-bold text-[#7d102a]">BSIT Population of Confirmed Interviewees</h2>
                  {itConfirmedData && itConfirmedData.length ? (
                    <QuickChart
                      type="BarChart"
                      className="mt-4"
                      style={{ width: '70%', height: 360 }}
                      dataSource={{ url: '/dashboard/stats', params: { year: startYear }, path: 'charts.itConfirmedByPercentile' }}
                      token={token}
                      options={{
                        backgroundColor: 'transparent',
                        legend: { position: 'bottom', textStyle: { color: '#7d102a' } },
                        slices: { 0: { color: '#7d102a' } },
                      }}
                      engine="quickchart"
                    />
                  ) : (
                    <div className="text-sm text-[#a86a74] mt-4">No data.</div>
                  )}
                </div>
                <div className="flex flex-col items-center w-full rounded-xl bg-white p-6 shadow-[0_12px_24px_rgba(139,23,47,0.08)] border border-[#efccd2] lg:col-span-2">
                  <h2 className="text-[30px] font-bold text-[#7d102a]">BSEMC Population of Confirmed Interviewees</h2>
                  {emcConfirmedData && emcConfirmedData.length ? (
                    <QuickChart
                      type="BarChart"
                      className="mt-4"
                      style={{ width: '70%', height: 360 }}
                      dataSource={{ url: '/dashboard/stats', params: { year: startYear }, path: 'charts.emcConfirmedByPercentile' }}
                      token={token}
                      options={{
                        backgroundColor: 'transparent',
                        legend: { position: 'bottom', textStyle: { color: '#7d102a' } },
                        slices: { 0: { color: '#7d102a' } },
                      }}
                      engine="quickchart"
                    />
                  ) : (
                    <div className="text-sm text-[#a86a74] mt-4">No data.</div>
                  )}
                </div>
              </div>
            )}
            </section>
          </>
          )}

          {activeTab === 'leaderboards' && (
          <section className="mt-6 grid grid-cols-1 gap-6">
            {(courseFilter === 'EMC') && (
              <div className="rounded-xl bg-white p-6 shadow-[0_12px_24px_rgba(139,23,47,0.08)] border border-[#efccd2]">
                <h2 className="text-sm font-bold text-[#7d102a]">Leaderboard: BSEMC (Top 60)</h2>
                <div className="mt-4">
                  {emcTop.length === 0 ? (
                    <div className="text-sm text-[#a86a74]">No data.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-[#7d102a]">
                        <thead>
                          <tr className="text-xs text-[#a86a74]">
                            <th className="text-left px-2 py-2">#</th>
                            <th className="text-left px-2 py-2">Last Name</th>
                            <th className="text-left px-2 py-2">First Name</th>
                            <th className="text-left px-2 py-2">Email Address</th>
                            <th className="text-left px-2 py-2">Final Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emcTop.map((row, idx) => (
                            <tr key={`${row.lastName}-${row.firstName}-${idx}`} className="border-t border-[#efccd2]">
                              <td className="px-2 py-2 font-semibold">{String(idx + 1).padStart(2, '0')}</td>
                              <td className="px-2 py-2">{row.lastName || '—'}</td>
                              <td className="px-2 py-2">{row.firstName || '—'}</td>
                              <td className="px-2 py-2">{row.email || '—'}</td>
                              <td className="px-2 py-2">
                                <div className="font-semibold">{row.finalScore || '—'}</div>
                                <div className="text-xs text-[#a86a74]">
                                  Percentile: {row.percentileScore || '—'} • Score: {row.examScore ?? '—'} • Q: {row.qScore || '—'} • S: {row.sScore || '—'}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
            {(courseFilter === 'IT') && (
              <div className="rounded-xl bg-white p-6 shadow-[0_12px_24px_rgba(139,23,47,0.08)] border border-[#efccd2]">
                <h2 className="text-sm font-bold text-[#7d102a]">Leaderboard: BSIT (Top 120)</h2>
                <div className="mt-4">
                  {itTop.length === 0 ? (
                    <div className="text-sm text-[#a86a74]">No data.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-[#7d102a]">
                        <thead>
                          <tr className="text-xs text-[#a86a74]">
                            <th className="text-left px-2 py-2">#</th>
                            <th className="text-left px-2 py-2">Last Name</th>
                            <th className="text-left px-2 py-2">First Name</th>
                            <th className="text-left px-2 py-2">Email Address</th>
                            <th className="text-left px-2 py-2">Final Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itTop.map((row, idx) => (
                            <tr key={`${row.lastName}-${row.firstName}-${idx}`} className="border-t border-[#efccd2]">
                              <td className="px-2 py-2 font-semibold">{String(idx + 1).padStart(2, '0')}</td>
                              <td className="px-2 py-2">{row.lastName || '—'}</td>
                              <td className="px-2 py-2">{row.firstName || '—'}</td>
                              <td className="px-2 py-2">{row.email || '—'}</td>
                              <td className="px-2 py-2">
                                <div className="font-semibold">{row.finalScore || '—'}</div>
                                <div className="text-xs text-[#a86a74]">
                                  Percentile: {row.percentileScore || '—'} • Score: {row.examScore ?? '—'} • Q: {row.qScore || '—'} • S: {row.sScore || '—'}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
            {(courseFilter === 'ALL') && (
              <>
                <div className="rounded-xl bg-white p-6 shadow-[0_12px_24px_rgba(139,23,47,0.08)] border border-[#efccd2]">
                  <h2 className="text-sm font-bold text-[#7d102a]">Leaderboard: BSEMC (Top 60)</h2>
                  <div className="mt-4">
                    {emcTop.length === 0 ? (
                      <div className="text-sm text-[#a86a74]">No data.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-[#7d102a]">
                          <thead>
                            <tr className="text-xs text-[#a86a74]">
                              <th className="text-left px-2 py-2">#</th>
                              <th className="text-left px-2 py-2">Last Name</th>
                              <th className="text-left px-2 py-2">First Name</th>
                              <th className="text-left px-2 py-2">Email Address</th>
                              <th className="text-left px-2 py-2">Final Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {emcTop.map((row, idx) => (
                              <tr key={`${row.lastName}-${row.firstName}-${idx}`} className="border-t border-[#efccd2]">
                                <td className="px-2 py-2 font-semibold">{String(idx + 1).padStart(2, '0')}</td>
                                <td className="px-2 py-2">{row.lastName || '—'}</td>
                                <td className="px-2 py-2">{row.firstName || '—'}</td>
                                <td className="px-2 py-2">{row.email || '—'}</td>
                                <td className="px-2 py-2">
                                  <div className="font-semibold">{row.finalScore || '—'}</div>
                                  <div className="text-xs text-[#a86a74]">Percentile: {row.percentileScore || '—'} • Score: {row.examScore ?? '—'} • Q: {row.qScore || '—'} • S: {row.sScore || '—'}</div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-xl bg-white p-6 shadow-[0_12px_24px_rgba(139,23,47,0.08)] border border-[#efccd2]">
                  <h2 className="text-sm font-bold text-[#7d102a]">Leaderboard: BSIT (Top 120)</h2>
                  <div className="mt-4">
                    {itTop.length === 0 ? (
                      <div className="text-sm text-[#a86a74]">No data.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-[#7d102a]">
                          <thead>
                            <tr className="text-xs text-[#a86a74]">
                              <th className="text-left px-2 py-2">#</th>
                              <th className="text-left px-2 py-2">Last Name</th>
                              <th className="text-left px-2 py-2">First Name</th>
                              <th className="text-left px-2 py-2">Email Address</th>
                              <th className="text-left px-2 py-2">Final Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itTop.map((row, idx) => (
                              <tr key={`${row.lastName}-${row.firstName}-${idx}`} className="border-t border-[#efccd2]">
                                <td className="px-2 py-2 font-semibold">{String(idx + 1).padStart(2, '0')}</td>
                                <td className="px-2 py-2">{row.lastName || '—'}</td>
                                <td className="px-2 py-2">{row.firstName || '—'}</td>
                                <td className="px-2 py-2">{row.email || '—'}</td>
                                <td className="px-2 py-2">
                                  <div className="font-semibold">{row.finalScore || '—'}</div>
                                  <div className="text-xs text-[#a86a74]">Percentile: {row.percentileScore || '—'} • Score: {row.examScore ?? '—'} • Q: {row.qScore || '—'} • S: {row.sScore || '—'}</div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
          )}

          

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
          <div className="rounded-3xl bg-gradient-to-b from-[#efc4cd] to-[#f5d8de] p-5 shadow-[0_14px_28px_rgba(139,23,47,0.08)] relative">
            {/* Top bar: left search, right bell + name + caret */}
            <div className="flex items-center justify-start">
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

              {/* Right: name with bell + caret */}
              <div className="flex items-center gap-3 text-[#2f2b33]">
                <button
                  type="button"
                  aria-label="Notifications"
                  onClick={() => setShowNotifications(v => !v)}
                  className="relative flex items-center justify-center w-7 h-7 rounded-full bg-white text-[#2f2b33] border border-[#efccd2] hover:bg-[#f8e7eb]"
                >
                  <svg viewBox="0 0 20 20" className="w-5 h-5 fill-current">
                    <path d="M10 18a2 2 0 002-2H8a2 2 0 002  2zm6-6V9a6 6 0 10-12 0v3l-2 2v1h16v-1l-2-2z" />
                  </svg>
                  {activities.some(ev => String(ev.action || '').toLowerCase().includes('accepted')) && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#8a1d35] text-white text-[10px] leading-4 text-center">
                      {Math.min(99, activities.filter(ev => String(ev.action || '').toLowerCase().includes('accepted')).length)}
                    </span>
                  )}
                </button>
                <span className="text-base font-semibold inline-flex items-center gap-2">
                  Department Head
                </span>
                <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current">
                  <path d="M5.5 7.5l4.5 5 4.5-5H5.5z" />
                </svg>
              </div>
              {showNotifications && (
                <div className="absolute left-5 top-14 z-10 w-[300px] rounded-xl bg-white border border-[#efccd2] shadow-[0_12px_24px_rgba(139,23,47,0.12)]">
                  <div className="px-4 py-3 border-b border-[#efccd2] text-sm font-semibold text-[#7d102a]">Notifications</div>
                  <div className="max-h-[280px] overflow-y-auto">
                    {activities.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-[#a86a74]">No notifications.</div>
                    ) : (
                      activities.slice(0, 10).map((ev, idx) => {
                        const when = ev.when || ev.createdAt;
                        const label = `${ev.actor || ''}`.trim() || 'Officer';
                        const accepted = String(ev.action || '').toLowerCase().includes('accepted');
                        return (
                          <div key={idx} className="px-4 py-3 border-t border-[#f2d8dd] text-sm text-[#7d102a] flex items-center gap-3">
                            {(() => {
                              const a = String(ev.action || '').toLowerCase();
                              const src = a.includes('added') ? RecentAddedIcon : (a.includes('edited') ? RecentEditedIcon : (a.includes('archive') ? RecentArchiveIcon : ApplicantsIcon));
                              return <img src={src} alt="" className="w-8 h-8 rounded-full" />;
                            })()}
                            <div className="flex-1">
                              <div className="font-semibold">{label}</div>
                              <div className="text-xs text-[#a86a74]">
                                {accepted ? `Accepted invite ${timeAgo(when)}` : `${ev.action || 'Activity'} ${timeAgo(when)}`}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  <div className="px-4 py-2 text-right">
                    <button onClick={() => setShowNotifications(false)} className="h-7 rounded-md border border-[#efccd2] px-3 text-[12px] text-[#7d102a] hover:bg-[#f8e7eb]">Close</button>
                  </div>
                </div>
              )}
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
            <div className="mt-2 flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-xs text-[#7d102a]">
                <input
                  type="checkbox"
                  className="rounded"
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSelectedScheduleIds(prev => {
                      if (!checked) return new Set();
                      const next = new Set();
                      gcal.forEach(ev => { if (ev.id) next.add(ev.id) });
                      return next;
                    });
                  }}
                  checked={gcal.length > 0 && selectedScheduleIds.size === gcal.length}
                />
                <span>Select all</span>
              </label>
              <button onClick={() => openArchiveConfirm(Array.from(selectedScheduleIds))} disabled={selectedScheduleIds.size === 0} className="rounded-full border border-[#efccd2] text-[#7d102a] hover:bg-[#f8e7eb] px-3 py-1 text-xs disabled:opacity-50">Archive selected</button>
            </div>
            <div className="mt-3 flex flex-col gap-3 pr-2 max-h-[320px] overflow-y-auto">
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
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedScheduleIds.has(ev.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedScheduleIds(prev => {
                            const next = new Set(prev);
                            if (checked) next.add(ev.id); else next.delete(ev.id);
                            return next;
                          });
                        }}
                      />
                      <img src={ScheduleIcon} alt="" className="w-12 h-12 rounded-full" />
                    </div>
                    <div className="flex-1 text-sm leading-relaxed text-[#7d102a]">
                      <p className="font-semibold">
                        {ev.summary || "Untitled Event"}
                      </p>
                      <p className="text-xs text-[#a86a74]">
                        {dt ? dt.toLocaleString() : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => openArchiveConfirm([ev.id])}
                      className="ml-2 rounded-full border border-[#efccd2] text-[#7d102a] hover:bg-[#f8e7eb] px-3 py-1 text-xs"
                      title="Archive schedule"
                    >
                      Archive
                    </button>
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
                    {(() => {
                      const a = String(activity.action || '').toLowerCase();
                      const src = a.includes('added') ? RecentAddedIcon : (a.includes('edited') ? RecentEditedIcon : (a.includes('archive') ? RecentArchiveIcon : ApplicantsIcon));
                      return <img src={src} alt="" className="w-12 h-12 rounded-full" />;
                    })()}
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
        
