import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
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
  const [selectedOfficers, setSelectedOfficers] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [query, setQuery] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [officerToArchive, setOfficerToArchive] = useState(null);
  const [showBulkArchiveModal, setShowBulkArchiveModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
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
      return;
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
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 bg-[#f7f1f2] px-10 py-8 overflow-y-auto h-[100dvh]">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-[0.28em] text-[#7d102a]">ENROLLMENT OFFICERS</h1>
            <p className="text-lg text-[#2f2b33] mt-3">List of current enrollment officers</p>
          </div>
          <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-2xl px-4 py-3 flex items-center gap-3 mt-[-30px] border-2 border-[#6b2b2b]">
            <button onClick={() => setShowAddModal(true)} className="bg-[#6b0000] text-white px-4 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm">Add Officer</button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="relative" style={{ width: '260px' }}>
            <input
              type="search"
              placeholder="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-full bg-white pl-9 pr-3 text-sm text-[#2f2b33] placeholder:text-[#8c7f86] outline-none shadow-[inset_0_0_0_1px_#efccd2] focus:shadow-[inset_0_0_0_2px_#cfa3ad]"
            />
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white text-[#8a1d35] border border-[#efccd2]">
                <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-current"><path d="M12.9 14.32a8 8 0 111.41-1.41l4.3 4.3-1.41 1.41-4.3-4.3zM8 14a6 6 0 100-12 6 6 0 000 12z"/></svg>
              </div>
            </span>
          </div>
          <button onClick={() => { setShowPendingModal(true); loadInvites(); }} className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border border-[#e4b7bf] text-[#8a1d35] bg-white hover:bg-[#fff5f7]">Pending invites</button>
        </div>

        <div className="bg-white rounded-[13px] border border-[#efccd2] p-0 overflow-hidden">
          <div className="bg-[#e9a9b6] text-white font-semibold px-6 py-3">Current Officers</div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Email</th>
                  <th className="py-2 px-3">Batch</th>
                  <th className="py-2 px-3">Contact #</th>
                  <th className="py-2 px-3">Date Created</th>
                  <th className="py-2 px-3">Actions</th>
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
                  .map((officer) => (
                  <tr
                    key={officer._id}
                    className={`hover:bg-gray-50 ${selectedOfficers.includes(officer._id) ? "bg-blue-50" : ""
                      }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-[#6b0000] focus:ring-[#6b0000] border-gray-300 rounded"
                        checked={selectedOfficers.includes(officer._id)}
                        onChange={() => toggleOfficerSelection(officer._id)}
                      />
                    </td>
                    <td className="py-2 px-3 text-gray-800">
                      {officer.name || "-"}
                    </td>
                    <td className="py-2 px-3 text-gray-800">{officer.email}</td>
                    <td className="py-2 px-3 text-gray-800">
                      {(() => {
                        const b = batches.find((x) => x._id === officer.assignedBatch) || batches.find((x)=> x.code === officer.assignedBatch);
                        return b ? (b.code || b.name) : '-';
                      })()}
                    </td>
                    <td className="py-2 px-3 text-gray-800">{officer.contact || '-'}</td>
                    <td className="py-2 px-3 text-gray-800">
                      {officer.createdAt
                        ? new Date(officer.createdAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="py-2 px-3">
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
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200 text-sm"
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
                  <div className="w-24 h-24 bg-gradient-to-b from-white/70 to-pink-200 rounded-full flex items-center justify-center shadow-[inset_0_6px_12px_rgba(0,0,0,0.06)] relative">
                    <div className="absolute w-20 h-20 rounded-full bg-gradient-to-b from-white to-pink-100 flex items-center justify-center shadow-md border border-white/50"></div>
                  </div>
                </div>
              </div>
              {error && <div className="text-sm text-red-700 mb-2">{error}</div>}
              <div className="grid gap-4">
                <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                  <label className="text-white font-semibold text-sm text-left">Gmail</label>
                  <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="officer@gmail.com" className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" />
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
                  <button onClick={async ()=>{ await invite(); setShowAddModal(false); }} disabled={loading || !email.trim()} className="bg-[#6b0000] disabled:opacity-60 text-white px-6 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm w-full">{loading ? 'Sending…' : 'Send Invite'}</button>
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
      </main>
    </div>
  );
}
