import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import GoogleCalendarEmbed from "../../components/GoogleCalendarEmbed";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../api/client";

export default function EnrollmentOfficers() {
  const { isAuthenticated, user, token } = useAuth();
  const [email, setEmail] = useState("");
  const [batches, setBatches] = useState([]);
  const [year, setYear] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [ttl, setTtl] = useState(1440);
  const [inviteLink, setInviteLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [officers, setOfficers] = useState([]);
  const [selectedOfficers, setSelectedOfficers] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

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

    const confirmMessage = `Are you sure you want to archive ${selectedOfficers.length} selected officer(s)?`;
    if (!window.confirm(confirmMessage)) return;

    try {
      setIsDeleting(true);
      await Promise.all(
        selectedOfficers.map((id) => api.officerDelete(token, id))
      );
      setOfficers((list) =>
        list.filter((o) => !selectedOfficers.includes(o._id))
      );
      setSelectedOfficers([]);
    } catch (err) {
      console.error("Error removing officers:", err);
      setError("Failed to remove officers. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const removeOfficer = async (officer) => {
    if (
      !window.confirm(
        `Are you sure you want to archive ${officer.name || "this officer"}?`
      )
    )
      return;

    try {
      await api.officerDelete(token, officer._id);
      setOfficers((list) => list.filter((o) => o._id !== officer._id));
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
      const res = await api.officerInvite(token, {
        email: em,
        year: year || undefined,
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
      } catch (_) {}
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
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
      <main className="flex-1 bg-gray-50 px-8 pt-8 pb-4 overflow-y-auto h-[100dvh]">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-5xl font-bold text-red-900 mb-2 mt-[35px]">
              ENROLLMENT OFFICERS
            </h1>
            <p className="text-lg text-gray-1000 font-bold mt-[20px]">
              Invite and manage officer access
            </p>
          </div>
          <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-2xl px-4 py-3 flex items-center gap-3 mt-[-50px] border-2 border-[#6b2b2b]">
            <button
              onClick={invite}
              disabled={loading || !email.trim()}
              className="bg-[#6b0000] disabled:opacity-60 text-white px-6 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm"
            >
              {loading ? "Creating invite…" : "Generate Invite Link"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invite Form */}
          <div className="bg-white rounded-xl border border-pink-200 p-5 space-y-3">
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="space-y-1">
              <label className="text-sm text-gray-700">Officer Gmail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@gmail.com"
                className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm text-gray-700">
                  School Year (optional)
                </label>
                <select
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value);
                    setBatchCode("");
                  }}
                  className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full"
                >
                  <option value="">Select year…</option>
                  {(() => {
                    const setYears = [
                      ...new Set(batches.map((b) => b.year)),
                    ].filter(Boolean);
                    const years = setYears.length
                      ? setYears
                      : [
                          String(new Date().getFullYear()),
                          String(new Date().getFullYear() - 1),
                        ];
                    return years.sort().map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ));
                  })()}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-700">
                  Assign Batch (optional)
                </label>
                <select
                  value={batchCode}
                  onChange={(e) => setBatchCode(e.target.value)}
                  disabled={!year}
                  className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full"
                >
                  <option value="">
                    {year ? "Select batch…" : "Select year first"}
                  </option>
                  {batches
                    .filter((b) => String(b.year) === String(year))
                    .map((b) => (
                      <option key={b._id} value={b.code}>
                        {b.code}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={invite}
                  disabled={loading || !email.trim()}
                  className="bg-[#6b0000] disabled:opacity-60 text-white px-6 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm"
                >
                  {loading ? "Creating invite…" : "Generate Invite Link"}
                </button>
              </div>
              {inviteLink && (
                <div className="mt-3 space-y-2">
                  <div className="text-sm break-all">{inviteLink}</div>
                </div>
              )}
            </div>
          </div>

          {/* Calendar Section */}
          <div className="bg-white rounded-xl border border-pink-200 p-5 shadow-[0_10px_18px_rgba(139,23,47,0.08)]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-[#7d102a]">Interview Schedule</h2>
              <div className="flex items-center gap-2">
                <a 
                  href="https://calendar.google.com/calendar/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-[#7d102a] hover:underline flex items-center gap-1"
                >
                  <span>Open in Calendar</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200">
              <GoogleCalendarEmbed />
            </div>
            <div className="mt-3 text-xs text-gray-500">
              <p>View and manage the interview schedule. Click on events for details.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-pink-200 p-5 mt-6">
          <h2 className="font-semibold mb-3 text-gray-900">Current Officers</h2>
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
                  <th className="py-2 px-3">Assigned Year</th>
                  <th className="py-2 px-3">Assigned Batch</th>
                  <th className="py-2 px-3">Interviewer</th>
                  <th className="py-2 px-3">Created</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {officers.map((officer) => (
                  <tr
                    key={officer._id}
                    className={`hover:bg-gray-50 ${
                      selectedOfficers.includes(officer._id) ? "bg-blue-50" : ""
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
                    <td className="py-2 px-3">
                      <select
                        value={officer.assignedYear || ""}
                        onChange={async (e) => {
                          const val = e.target.value || "";
                          try {
                            const updated = await api
                              .officerUpdate(token, officer._id, {
                                assignedYear: val,
                              })
                              .catch((err) => {
                                console.error("Error updating officer:", err);
                                throw err;
                              });
                            setOfficers((list) =>
                              list.map((x) =>
                                x._id === officer._id
                                  ? { ...x, ...updated.doc }
                                  : x
                              )
                            );
                          } catch (err) {
                            console.error("Failed to assign year:", err);
                            alert(err.message || "Failed to assign year");
                          }
                        }}
                        className="bg-white border border-gray-200 rounded-full px-3 py-1 text-sm text-gray-800"
                      >
                        <option value="">None</option>
                        {[...new Set(batches.map((b) => b.year))]
                          .sort()
                          .map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={officer.assignedBatch || ""}
                        onChange={async (e) => {
                          const val = e.target.value || null;
                          try {
                            const updated = await api
                              .officerUpdate(token, officer._id, {
                                assignedBatch: val,
                              })
                              .catch((err) => {
                                console.error(
                                  "Error updating officer batch:",
                                  err
                                );
                                throw err;
                              });
                            setOfficers((list) =>
                              list.map((x) =>
                                x._id === officer._id
                                  ? { ...x, ...updated.doc }
                                  : x
                              )
                            );
                          } catch (err) {
                            console.error("Failed to assign batch:", err);
                            alert(err.message || "Failed to assign batch");
                          }
                        }}
                        className="bg-white border border-gray-200 rounded-full px-3 py-1 text-sm text-gray-800"
                      >
                        <option value="">None</option>
                        {batches
                          .filter((b) => b.year === officer.assignedYear)
                          .map((b) => (
                            <option key={b._id} value={b._id}>
                              {b.name}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!officer.canInterview}
                          onChange={() => toggleInterviewer(officer)}
                        />
                        <span className="text-xs text-gray-700">
                          {officer.canInterview ? "Allowed" : "Not allowed"}
                        </span>
                      </label>
                    </td>
                    <td className="py-2 px-3 text-gray-800">
                      {officer.createdAt
                        ? new Date(officer.createdAt).toLocaleString()
                        : "-"}
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => removeOfficer(officer)}
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
                  onClick={removeSelectedOfficers}
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
      </main>
    </div>
  );
}
