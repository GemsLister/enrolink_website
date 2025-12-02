import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Union from "../../assets/Union.png";
import UserChip from "../../components/UserChip";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../api/client";

export default function EnrollmentOfficers() {
  const { isAuthenticated, user, token } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [batches, setBatches] = useState([]);
  const [batchCode, setBatchCode] = useState("");
  const [ttl, setTtl] = useState(1440);
  const [inviteLink, setInviteLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [officers, setOfficers] = useState([]);
  const [archivedOfficers, setArchivedOfficers] = useState([]);
  const [selectedOfficers, setSelectedOfficers] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [query, setQuery] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [officerToArchive, setOfficerToArchive] = useState(null);
  const [showBulkArchiveModal, setShowBulkArchiveModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [invitesError, setInvitesError] = useState("");

  async function toggleInterviewer(officer) {
    try {
      const payload = { canInterview: !officer.canInterview };
      if (typeof officer.__v === "number") payload.__v = officer.__v;
      const updated = await api.officerUpdate(token, officer._id, payload);
      setOfficers((list) =>
        list.map((o) => (o._id === officer._id ? { ...o, ...updated.doc } : o))
      );
    } catch (e) {
      alert(e.message || "Failed to update");
    }
  }

  const toggleOfficerSelection = (officerId) => {
    setSelectedOfficers((prev) =>
      prev.includes(officerId)
        ? prev.filter((id) => id !== officerId)
        : [...prev, officerId]
    );
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedOfficers(officers.map((officer) => officer._id));
    } else {
      setSelectedOfficers([]);
    }
  };

  const removeSelectedOfficers = async () => {
    if (!selectedOfficers.length) return;
    try {
      setIsDeleting(true);
      await Promise.all(
        selectedOfficers.map((id) => api.officerArchive(token, id))
      );
      setOfficers((list) =>
        list.filter((o) => !selectedOfficers.includes(o._id))
      );
      setSelectedOfficers([]);
      setShowBulkArchiveModal(false);
      navigate('/head/archive');
    } catch (err) {
      console.error("Error removing officers:", err);
      setError("Failed to remove officers. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const removeOfficer = async (officer) => {
    try {
      await api.officerArchive(token, officer._id);
      setOfficers((list) => list.filter((o) => o._id !== officer._id));
      navigate('/head/archive');
    } catch (err) {
      console.error("Error removing officer:", err);
      setError("Failed to remove officer. Please try again.");
    }
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await api.officersList(token);
        if (mounted) setOfficers(res.rows || []);
      } catch (_) {
        if (mounted) setOfficers([]);
      }
    }
    async function loadArchived() {
      try {
        const res = await api.officersArchivedList(token);
        if (mounted) setArchivedOfficers(res.rows || []);
      } catch (_) {
        if (mounted) setArchivedOfficers([]);
      }
    }
    async function loadBatches() {
      try {
        const res = await api.batchesList(token);
        if (mounted) setBatches(res.rows || []);
      } catch (_) {
        if (mounted) setBatches([]);
      }
    }
    if (token) {
      load();
      loadBatches();
      loadArchived();
    }
    return () => {
      mounted = false;
    };
  }, [token]);

  async function invite() {
    setError("");
    setInviteLink("");
    const em = email.trim().toLowerCase();
    if (!em) {
      setError("Email is required");
      return false;
    }
    // Prevent inviting an email that's already an officer
    const exists = officers.some((o) => String(o.email || '').toLowerCase() === em);
    const archivedExists = archivedOfficers.some((o) => String(o.email || '').toLowerCase() === em);
    if (exists) {
      setError('Officer already exists');
      return false;
    }
    if (archivedExists) {
      setError('Officer exists in archive; restore instead');
      return false;
    }
    try {
      setLoading(true);
      // Derive year from selected batch code if available
      const foundBatch = batches.find((b) => b.code === batchCode);
      const year = foundBatch ? String(foundBatch.year) : undefined;
      const res = await api.officerInvite(token, {
        email: em,
        year,
        batch: batchCode || undefined,
        ttlMinutes: Number(ttl) || 1440,
      });
      setInviteLink(res.inviteLink || "");
      setEmail("");
      setBatchCode("");
      // refresh list after invite in case officer signs up quickly
      try {
        const r = await api.officersList(token);
        setOfficers(r.rows || []);
      } catch (_) { }
      // refresh pending invites list silently
      try { await loadInvites({ silent: true }); } catch (_) {}
      return true;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    return false;
  }

  async function loadInvites({ silent } = {}) {
    try {
      if (!silent) { setInvitesLoading(true); setInvitesError(""); }
      const res = await api.request('GET', '/api/auth/invites', { token });
      const rows = Array.isArray(res?.rows) ? res.rows : (Array.isArray(res) ? res : []);
      setInvites(rows);
    } catch (e) {
      setInvites([]);
      setInvitesError(e.message || 'Unable to load pending invites');
    } finally {
      setInvitesLoading(false);
    }
  }

  async function cancelInvite(inv) {
    try {
      const id = inv._id || inv.id || inv.inviteId;
      if (!id) throw new Error('Missing invite id');
      await api.request('DELETE', `/api/auth/invites/${id}`, { token });
      setInvites(prev => prev.filter(x => (x._id || x.id || x.inviteId) !== id));
    } catch (e) {
      window.alert(e.message || 'Failed to cancel invite');
    }
  }

  function timeAgo(date) {
    const d = new Date(date);
    const diff = Math.max(0, Date.now() - d.getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  function openGmailCompose() {
    if (!inviteLink) return;
    const subject = encodeURIComponent("EnroLink Officer Invitation");
    const body =
      encodeURIComponent(`You have been invited as an Enrollment Officer.

Sign-up link: ${inviteLink}

Use your Gmail to register. The link expires in ${ttl} minutes.`);
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        email
      )}&su=${subject}&body=${body}`,
      "_blank"
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || user.role !== "DEPT_HEAD") return <Navigate to="/" replace />;

  const duplicateOfficer = officers.some(o => String(o.email || '').toLowerCase() === String(email || '').trim().toLowerCase());
  const duplicateArchivedOfficer = archivedOfficers.some(o => String(o.email || '').toLowerCase() === String(email || '').trim().toLowerCase());

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 h-[100dvh] bg-[#fff6f7] overflow-hidden">
        <div className="h-full flex flex-col px-10 pt-10 pb-8 space-y-6">
          <style>{`.no-scrollbar{scrollbar-width:none;-ms-overflow-style:none}.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
          <div className="flex justify-between items-start">
            <div>
              <div className="uppercase tracking-[0.25em] text-sm text-[#5b1a30]">Records</div>
              <h1 className="text-5xl font-bold text-red-900 mb-2 mt-1">Enrollment Officers</h1>
              <p className="text-base text-[#5b1a30]">List of current enrollment officers</p>
            </div>
            <UserChip />
          </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-full max-w-sm">
            <input
              type="text"
              placeholder="Search name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-full border border-rose-200 bg-white px-5 py-3 text-sm text-[#5b1a30] placeholder:text-black-300 focus:border-black-400 focus:outline-none"
            />
          </div>
          <button onClick={() => { setShowPendingModal(true); loadInvites(); }} className="rounded-full border border-rose-200 bg-white px-6 py-3 text-sm font-medium text-[#c4375b] shadow-sm transition hover:border-rose-400">Pending invites</button>
        </div>

        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[#7d102a] font-semibold text-sm">Current Officers</span>
          <button onClick={() => setShowAddModal(true)} className="rounded-full bg-[#c4375b] px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-200/60 transition hover:bg-[#a62a49]">Add Officer</button>
        </div>
        <div className="rounded-[32px] bg-white shadow-[0_35px_90px_rgba(239,150,150,0.35)] p-0 overflow-hidden border border-[#f7d6d6]">
          <div className="overflow-x-auto no-scrollbar">
            <table className="min-w-[1800px] border-collapse">
              <thead>
                <tr className="bg-[#f9c4c4] text-[#5b1a30] text-xs font-semibold uppercase">
                  <th className="w-12 px-4 py-4 text-center sticky top-0 z-20 bg-[#f9c4c4]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-[#6b0000] focus:ring-[#6b0000] border-gray-300 rounded"
                      checked={
                        selectedOfficers.length > 0 &&
                        selectedOfficers.length === officers.length
                      }
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="w-56 text-left px-4 py-4 sticky top-0 z-20 bg-[#f9c4c4]">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-[12px] tracking-[0.2em] text-[#5b1a30]" style={{ fontFamily: 'var(--font-open-sans)' }}>Name</span>
                    </div>
                  </th>
                  <th className="w-64 text-left px-4 py-4 sticky top-0 z-20 bg-[#f9c4c4]">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-[12px] tracking-[0.2em] text-[#5b1a30]" style={{ fontFamily: 'var(--font-open-sans)' }}>Email</span>
                    </div>
                  </th>
                  <th className="w-32 text-left px-4 py-4 sticky top-0 z-20 bg-[#f9c4c4]">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-[12px] tracking-[0.2em] text-[#5b1a30]" style={{ fontFamily: 'var(--font-open-sans)' }}>Batch</span>
                    </div>
                  </th>
                  <th className="w-40 text-left px-4 py-4 sticky top-0 z-20 bg-[#f9c4c4]">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-[12px] tracking-[0.2em] text-[#5b1a30]" style={{ fontFamily: 'var(--font-open-sans)' }}>Contact #</span>
                    </div>
                  </th>
                  <th className="w-32 text-left px-4 py-4 sticky top-0 z-20 bg-[#f9c4c4]">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-[12px] tracking-[0.2em] text-[#5b1a30]" style={{ fontFamily: 'var(--font-open-sans)' }}>Date Created</span>
                    </div>
                  </th>
                  <th className="w-32 text-right px-4 py-4 sticky top-0 z-20 bg-[#f9c4c4]">
                    <div className="flex items-center justify-end gap-3 text-xs">
                      <span className="text-[12px] tracking-[0.2em] text-[#5b1a30]" style={{ fontFamily: 'var(--font-open-sans)' }}>Actions</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {officers
                  .filter((o) => {
                    const q = query.trim().toLowerCase();
                    if (!q) return true;
                    const batch = batches.find((b) => (b._id === o.assignedBatch)) || batches.find((b)=> b.code === o.assignedBatch) || null;
                    const batchCode = batch?.code || batch?.name || '';
                    return (
                      (o.name || '').toLowerCase().includes(q) ||
                      (o.email || '').toLowerCase().includes(q) ||
                      (batchCode || '').toLowerCase().includes(q)
                    );
                  })
                  .map((officer, idx) => (
                  <tr
                    key={officer._id}
                    className={`border-b border-[#f3d5d5] hover:bg-rose-50 ${selectedOfficers.includes(officer._id) ? 'bg-blue-50' : (idx % 2 === 0 ? 'bg-white' : 'bg-[#fff2f4]')}`}
                  >
                    <td className="w-12 px-4 py-3 text-center align-middle whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-[#6b0000] focus:ring-[#6b0000] border-gray-300 rounded"
                        checked={selectedOfficers.includes(officer._id)}
                        onChange={() => toggleOfficerSelection(officer._id)}
                      />
                    </td>
                    <td className="w-56 py-2 px-3 text-[#5b1a30] align-middle whitespace-nowrap text-left">
                      {officer.name || "-"}
                    </td>
                    <td className="w-64 py-2 px-3 text-[#7c3a4a] align-middle whitespace-nowrap text-left">{officer.email}</td>
                    <td className="w-32 py-2 px-3 text-gray-800 align-middle whitespace-nowrap text-left">
                      {(() => {
                        const b = batches.find((x) => x._id === officer.assignedBatch) || batches.find((x)=> x.code === officer.assignedBatch);
                        return b ? (b.code || b.name) : '-';
                      })()}
                    </td>
                    <td className="w-40 py-2 px-3 text-[#7c3a4a] align-middle whitespace-nowrap text-left">{officer.contact || '-'}</td>
                    <td className="w-32 py-2 px-3 text-[#7c3a4a] align-middle whitespace-nowrap text-left">
                      {officer.createdAt
                        ? new Date(officer.createdAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="w-32 py-2 px-3 text-right align-middle whitespace-nowrap">
                      <button
                        onClick={() => { setOfficerToArchive(officer); setShowArchiveModal(true); }}
                        className="bg-white text-[#6b0000] border border-[#6b2b2b] px-3 py-1 rounded-full hover:bg-pink-50 transition-colors duration-200 text-xs"
                      >
                        Archive
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {selectedOfficers.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowBulkArchiveModal(true)}
                  disabled={isDeleting}
                  className="rounded-full bg-[#c4375b] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200/60 transition hover:bg-[#a62a49] disabled:opacity-60"
                >
                  {isDeleting
                    ? "Archiving..."
                    : `Archive Selected (${selectedOfficers.length})`}
                </button>
              </div>
            )}
          </div>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-3xl shadow-lg w-full max-w-[520px] p-7 mx-auto border-2 border-[#6b2b2b]">
              <div className="relative text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Add Enrollment Officer</h2>
                <button onClick={() => setShowAddModal(false)} aria-label="Close" className="absolute top-2 right-3 text-gray-700 hover:text-gray-900 transition-colors rounded-full p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex justify-center mt-4">
                  <img src={Union} alt="Union" className="w-24 h-24" />
                </div>
              </div>
              {error && <div className="text-sm text-red-700 mb-2">{error}</div>}
              <div className="grid gap-4">
                <div className="grid grid-cols-[100px_1fr] items-center gap-1">
                  <label className="text-white font-semibold text-sm text-left">Gmail</label>
                  <div>
                    <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="officer@gmail.com" className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" />
                    {duplicateOfficer && (
                      <div className="text-xs text-red-700 mt-1">Officer already exists</div>
                    )}
                    {!duplicateOfficer && duplicateArchivedOfficer && (
                      <div className="text-xs text-red-700 mt-1">Officer exists in archive; restore instead</div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                  <label className="text-white font-semibold text-sm text-left">Assign Batch</label>
                  <select value={batchCode} onChange={(e)=>setBatchCode(e.target.value)} className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full">
                    <option value="">None</option>
                    {batches.map((b)=> (
                      <option key={b._id} value={b.code}>{b.code}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-2">
                  <button onClick={async ()=>{ const ok = await invite(); if (ok) setShowAddModal(false); }} disabled={loading || !email.trim() || duplicateOfficer || duplicateArchivedOfficer} className="bg-[#6b0000] disabled:opacity-60 text-white px-6 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm w-full">{loading ? 'Sending…' : 'Send Invite'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showArchiveModal && officerToArchive && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-3xl shadow-lg w-full max-w-[460px] p-7 mx-auto border-2 border-[#6b2b2b]">
              <div className="relative text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Archive this officer?</h2>
                <button onClick={() => setShowArchiveModal(false)} aria-label="Close" className="absolute top-2 right-3 text-gray-700 hover:text-gray-900 transition-colors rounded-full p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
              </div>
              <p className="text-sm text-[#2f2b33] text-center mb-5">This action will remove it from active lists but you can restore it from the archive at any time.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={async ()=>{ await removeOfficer(officerToArchive); setShowArchiveModal(false); }} className="bg-[#6b0000] text-white px-4 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm">Continue</button>
                <button onClick={()=> setShowArchiveModal(false)} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-4 py-2 rounded-full hover:bg-pink-50 transition-colors duration-200 font-medium text-sm">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showBulkArchiveModal && selectedOfficers.length > 0 && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-3xl shadow-lg w-full max-w-[500px] p-7 mx-auto border-2 border-[#6b2b2b]">
              <div className="relative text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Archive selected officers?</h2>
                <button onClick={() => setShowBulkArchiveModal(false)} aria-label="Close" className="absolute top-2 right-3 text-gray-700 hover:text-gray-900 transition-colors rounded-full p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
              </div>
              <p className="text-sm text-[#2f2b33] text-center mb-5">This will archive {selectedOfficers.length} officer(s). You can restore them from the archive at any time.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={removeSelectedOfficers} className="bg-[#6b0000] text-white px-4 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm">Continue</button>
                <button onClick={()=> setShowBulkArchiveModal(false)} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-4 py-2 rounded-full hover:bg-pink-50 transition-colors duration-200 font-medium text-sm">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showPendingModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-3xl shadow-lg w-full max-w-[800px] p-7 mx-auto border-2 border-[#6b2b2b]">
              <div className="relative mb-4">
                <div className="bg-[#e9a9b6] text-white font-semibold px-6 py-3 rounded-2xl">Pending Invites</div>
                <button onClick={() => setShowPendingModal(false)} aria-label="Close" className="absolute top-2 right-3 text-gray-700 hover:text-gray-900 transition-colors rounded-full p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
              </div>
              {invitesError && <div className="text-sm text-red-700 mb-2">{invitesError}</div>}
              <div className="bg-white rounded-2xl border border-[#efccd2] overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-10"></th>
                      <th className="text-left py-2 px-3">Name</th>
                      <th className="text-left py-2 px-3">Email</th>
                      <th className="text-left py-2 px-3">Created</th>
                      <th className="text-left py-2 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitesLoading ? (
                      <tr><td colSpan="5" className="py-4 px-3 text-center text-sm">Loading…</td></tr>
                    ) : invites.length === 0 ? (
                      <tr><td colSpan="5" className="py-4 px-3 text-center text-sm">No pending invites</td></tr>
                    ) : invites.map((inv) => (
                      <tr key={inv._id || inv.id} className="hover:bg-gray-50">
                        <td className="w-10 px-3 py-2"><input type="checkbox" disabled className="opacity-50" /></td>
                        <td className="py-2 px-3">{inv.name || '-'}</td>
                        <td className="py-2 px-3">{inv.email || '-'}</td>
                        <td className="py-2 px-3">{inv.createdAt ? timeAgo(inv.createdAt) : '—'}</td>
                        <td className="py-2 px-3">
                          <button onClick={() => cancelInvite(inv)} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-3 py-1 rounded-full hover:bg-pink-50 transition-colors duration-200 text-xs">Cancel</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
