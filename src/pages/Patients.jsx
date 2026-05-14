import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API, { updatePatientRecord, deletePatientRecord } from "../api";

function appPath(path) {
  return window.location.pathname.startsWith("/doctor") ? `/doctor${path}` : path;
}

export default function Patients({ clinicId }) {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [activeTab, setActiveTab] = useState("records");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [editingPatient, setEditingPatient] = useState(null);
  const [deletingPatient, setDeletingPatient] = useState(null);

  useEffect(() => {
    load();
  }, [clinicId]);

  async function load() {
    if (!clinicId) {
      setPatients([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await API.get(`/patients/clinic/${clinicId}`);
      setPatients(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const filtered = patients
    .filter((patient) => {
      const query = search.toLowerCase();
      if (
        query &&
        !patient.name?.toLowerCase().includes(query) &&
        !patient.phone?.includes(query) &&
        !patient.condition?.toLowerCase().includes(query) &&
        !patient.followup_type?.toLowerCase().includes(query)
      ) {
        return false;
      }

      const created = patient.created_at?.slice(0, 10) || "";
      if (filterDate && created !== filterDate) return false;
      if (filterMonth && !created.startsWith(filterMonth)) return false;
      if (filterYear && !created.startsWith(filterYear)) return false;
      const status = String(patient.status || "active").toLowerCase();
      if (activeTab === "archived") return status === "inactive" || status === "archived";
      if (status === "inactive" || status === "archived") return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "oldest") return new Date(a.created_at) - new Date(b.created_at);
      return new Date(b.created_at) - new Date(a.created_at);
    });

  function clearFilters() {
    setSearch("");
    setFilterDate("");
    setFilterMonth("");
    setFilterYear("");
    setPage(1);
  }

  async function handleEditPatient(payload) {
    const response = await updatePatientRecord(payload.id, {
      name: payload.name,
      phone: payload.phone,
      age: payload.age ? Number(payload.age) : null,
      gender: payload.gender || null,
      condition: payload.condition || null,
      followup_type: payload.followup_type || null,
      preferred_language: payload.preferred_language || "en",
    });
    setPatients((current) => current.map((patient) => (patient.id === payload.id ? response.data : patient)));
    setEditingPatient(null);
  }

  async function handleDeletePatient(patient) {
    await deletePatientRecord(patient.id);
    setPatients((current) => current.filter((item) => item.id !== patient.id));
    setDeletingPatient(null);
  }

  const hasFilter = search || filterDate || filterMonth || filterYear;
  const activeCount = patients.filter((patient) => !["inactive", "archived"].includes(String(patient.status || "active").toLowerCase())).length;
  const archivedCount = patients.length - activeCount;
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pagedPatients = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const years = [...new Set(patients.map((patient) => patient.created_at?.slice(0, 4)).filter(Boolean))].sort().reverse();
  const months = [
    { v: "01", l: "January" },
    { v: "02", l: "February" },
    { v: "03", l: "March" },
    { v: "04", l: "April" },
    { v: "05", l: "May" },
    { v: "06", l: "June" },
    { v: "07", l: "July" },
    { v: "08", l: "August" },
    { v: "09", l: "September" },
    { v: "10", l: "October" },
    { v: "11", l: "November" },
    { v: "12", l: "December" },
  ];

  return (
    <div style={styles.page}>
      {editingPatient && (
        <EditPatientModal
          patient={editingPatient}
          onClose={() => setEditingPatient(null)}
          onSave={handleEditPatient}
        />
      )}
      {deletingPatient && (
        <DeletePatientModal
          patient={deletingPatient}
          onClose={() => setDeletingPatient(null)}
          onConfirm={() => handleDeletePatient(deletingPatient)}
        />
      )}
      <div style={styles.header}>
        <div style={styles.titleWrap}>
          <div style={styles.titleIcon}><i className="ti ti-user-heart" /></div>
          <div>
            <h1 style={styles.title}>Patient Management</h1>
            <p style={styles.sub}>Search, edit and open patient records from one focused clinic table.</p>
            <div style={styles.titleUnderline} />
          </div>
        </div>
      </div>

      <div style={styles.statsRow}>
        <PatientStat label="Total patients" value={patients.length} icon="ti-users" tone="blue" />
        <PatientStat label="Active records" value={activeCount} icon="ti-user-check" tone="green" />
        <PatientStat label="Archived" value={archivedCount} icon="ti-archive" tone="red" />
        <PatientStat label="Showing" value={filtered.length} icon="ti-filter" tone="purple" />
      </div>

      <div style={styles.filterBar}>
        <div style={styles.searchWrap}>
          <i className="ti ti-search" style={{ fontSize: 15, color: "#aaa", flexShrink: 0 }} />
          <input
            style={styles.searchInput}
            placeholder="Search by Name or Phone Number"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          />
          {search && (
            <button style={styles.clearX} onClick={() => setSearch("")}>
              <i className="ti ti-x" style={{ fontSize: 12 }} />
            </button>
          )}
        </div>

        <button style={styles.bulkBtn}><i className="ti ti-upload" /> Bulk Upload</button>
        <button style={styles.btnPrimary} onClick={() => navigate(appPath("/patients/add"))}>
          <i className="ti ti-circle-plus" style={{ fontSize: 18 }} /> Add New Patient
        </button>

        {hasFilter && (
          <button style={styles.clearBtn} onClick={clearFilters}>
            <i className="ti ti-x" style={{ fontSize: 12 }} /> Clear filters
          </button>
        )}
      </div>

      <div style={styles.tabLine}>
        <button style={{ ...styles.tabLineItem, ...(activeTab === "records" ? styles.tabLineActive : {}) }} onClick={() => { setActiveTab("records"); setPage(1); }}>
          Patient Records <span>{activeCount}</span>
        </button>
        <button style={{ ...styles.tabLineItem, ...(activeTab === "archived" ? styles.tabLineActive : {}) }} onClick={() => { setActiveTab("archived"); setPage(1); }}>
          Archived <span>{archivedCount}</span>
        </button>
      </div>

      {hasFilter && (
        <div style={styles.chipRow}>
          {filterYear && <Chip label={`Year: ${filterYear}`} onRemove={() => { setFilterYear(""); setFilterMonth(""); }} />}
          {filterMonth && <Chip label={`Month: ${months.find((month) => filterMonth.endsWith(month.v))?.l || filterMonth}`} onRemove={() => setFilterMonth("")} />}
          {filterDate && <Chip label={`Date: ${filterDate}`} onRemove={() => setFilterDate("")} />}
          {search && <Chip label={`"${search}"`} onRemove={() => setSearch("")} />}
          <span style={styles.chipCount}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {loading ? (
        <div style={styles.empty}>Loading patients...</div>
      ) : filtered.length === 0 ? (
        <div style={styles.emptyState}>
          <i className="ti ti-user-off" style={{ fontSize: 32, color: "#ddd", marginBottom: 10 }} />
          <div style={{ fontSize: 14, color: "#aaa" }}>
            {hasFilter ? "No patients match this filter." : "No patients yet. Add your first patient."}
          </div>
          {hasFilter && (
            <button style={{ ...styles.clearBtn, marginTop: 12 }} onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <div style={styles.tableCaption}>Patient Records</div>
          <table style={styles.table}>
            <thead>
              <tr>
                <TableHeader>MRN</TableHeader>
                <TableHeader>Patient's Name</TableHeader>
                <TableHeader>Consulting Doctor</TableHeader>
                <TableHeader>Phone Number</TableHeader>
                <TableHeader>Age</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Last Visit</TableHeader>
                <TableHeader>Actions</TableHeader>
              </tr>
            </thead>
            <tbody>
              {pagedPatients.map((patient, index) => (
                <tr
                  key={patient.id}
                  style={{ background: index % 2 === 0 ? "#fff" : "#fbfdff", cursor: "pointer" }}
                  onClick={() => navigate(appPath(`/patients/${patient.id}`))}
                >
                  <td style={styles.td}>
                    <span style={styles.mrn}>MRN{String(6030000000 + Number(patient.id || 0)).padStart(10, "0")}</span>
                  </td>
                  <td style={{ ...styles.td, color: "#2f3542", fontWeight: 600 }}>{patient.name}</td>
                  <td style={styles.td}>Dr {patient.doctor_name || "DocNudge"}</td>
                  <td style={styles.td}>{patient.phone}</td>
                  <td style={styles.td}>{patient.age || "-"}</td>
                  <td style={styles.td}>
                    <span style={String(patient.status || "active").toLowerCase() === "active" ? styles.statusPill : styles.statusInactive}>
                      {String(patient.status || "active").toLowerCase() === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={styles.td}>{patient.last_visit_at?.slice(0, 10) || "N/A"}</td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    <div style={styles.actionGroup}>
                      <button
                        style={styles.viewBtn}
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(appPath(`/patients/${patient.id}`));
                        }}
                      >
                        View <i className="ti ti-arrow-right" style={{ fontSize: 12 }} />
                      </button>
                      <button
                        style={styles.editBtn}
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingPatient(patient);
                        }}
                      >
                        <i className="ti ti-pencil" style={{ fontSize: 12 }} /> Edit
                      </button>
                      <button
                        style={styles.deleteBtn}
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeletingPatient(patient);
                        }}
                      >
                        <i className="ti ti-trash" style={{ fontSize: 15 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={styles.pagination}>
            <span style={styles.pageInfo}>
              Showing {filtered.length === 0 ? 0 : (page - 1) * rowsPerPage + 1}-{Math.min(page * rowsPerPage, filtered.length)} of {filtered.length}
            </span>
            <div style={styles.pageControls}>
              <select style={styles.rowsSelect} value={rowsPerPage} onChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(1); }}>
                <option value={10}>10 rows</option>
                <option value={20}>20 rows</option>
                <option value={50}>50 rows</option>
              </select>
              <button style={styles.pageBtn} disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
              <span style={styles.pageInfo}>Page {page} of {totalPages}</span>
              <button style={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TableHeader({ children }) {
  return (
    <th
      style={{
        padding: "18px 22px",
        textAlign: "left",
        fontSize: 13,
        color: "#5d6470",
        fontWeight: 800,
        borderBottom: "1px solid #e8eaee",
        background: "#fbfbfc",
        whiteSpace: "nowrap",
        textTransform: "uppercase",
      }}
    >
      {children}
    </th>
  );
}

function PatientStat({ label, value, icon, tone }) {
  const palette = {
    blue: ["#eff6ff", "#2563eb"],
    green: ["#f0fdf4", "#16a34a"],
    red: ["#fef2f2", "#ef4444"],
    purple: ["#f5f3ff", "#7c3aed"],
  }[tone];

  return (
    <article style={styles.statCard}>
      <div style={{ ...styles.statIcon, background: palette[0], color: palette[1] }}><i className={`ti ${icon}`} /></div>
      <div>
        <strong style={styles.statValue}>{value}</strong>
        <span style={styles.statLabel}>{label}</span>
      </div>
    </article>
  );
}

function Chip({ label, onRemove }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "#E1F5EE", color: "#085041", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
      {label}
      <button
        onClick={onRemove}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#085041", display: "flex", alignItems: "center", padding: 0 }}
      >
        <i className="ti ti-x" style={{ fontSize: 11 }} />
      </button>
    </span>
  );
}

function EditPatientModal({ patient, onClose, onSave }) {
  const [form, setForm] = useState({
    ...patient,
    age: patient.age || "",
    gender: patient.gender || "",
    condition: patient.condition || "",
    followup_type: patient.followup_type || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit() {
    if (!form.name?.trim() || !form.phone?.trim()) {
      setError("Name and phone are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not save patient.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.modalTitle}>Edit patient</div>
            <div style={styles.modalSub}>{patient.name}</div>
          </div>
          <button style={styles.modalClose} onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div style={styles.formGrid}>
          <Field label="Full name"><input style={styles.input} value={form.name || ""} onChange={(event) => setField("name", event.target.value)} /></Field>
          <Field label="Phone"><input style={styles.input} value={form.phone || ""} onChange={(event) => setField("phone", event.target.value)} /></Field>
          <Field label="Age"><input style={styles.input} type="number" value={form.age || ""} onChange={(event) => setField("age", event.target.value)} /></Field>
          <Field label="Gender">
            <select style={styles.input} value={form.gender || ""} onChange={(event) => setField("gender", event.target.value)}>
              <option value="">Not set</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </Field>
          <Field label="Condition"><input style={styles.input} value={form.condition || ""} onChange={(event) => setField("condition", event.target.value)} /></Field>
          <Field label="Follow-up type"><input style={styles.input} value={form.followup_type || ""} onChange={(event) => setField("followup_type", event.target.value)} /></Field>
        </div>
        {error && <div style={styles.modalError}>{error}</div>}
        <div style={styles.modalFooter}>
          <button style={styles.clearBtn} onClick={onClose}>Cancel</button>
          <button style={styles.btnPrimary} onClick={submit} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}

function DeletePatientModal({ patient, onClose, onConfirm }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSaving(true);
    setError("");
    try {
      await onConfirm();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not delete patient.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.modalBackdrop}>
      <div style={{ ...styles.modal, maxWidth: 420 }}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.modalTitle}>Delete patient</div>
            <div style={styles.modalSub}>This removes visits, prescriptions, labs, and reminder logs for this patient.</div>
          </div>
          <button style={styles.modalClose} onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>
          Delete <strong>{patient.name}</strong>? This action cannot be undone.
        </div>
        {error && <div style={styles.modalError}>{error}</div>}
        <div style={styles.modalFooter}>
          <button style={styles.clearBtn} onClick={onClose}>Cancel</button>
          <button style={styles.deleteConfirmBtn} onClick={submit} disabled={saving}>{saving ? "Deleting..." : "Delete patient"}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <label style={styles.fieldLabel}>{label}{children}</label>;
}

const styles = {
  page: { padding: "24px 28px 34px", fontFamily: "'DM Sans', sans-serif", background: "#f4f6fb", minHeight: "100vh" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  titleWrap: { display: "flex", alignItems: "center", gap: 14 },
  titleIcon: { width: 42, height: 42, borderRadius: 12, background: "#f0fdf4", color: "#16a34a", display: "grid", placeItems: "center", fontSize: 22 },
  titleUnderline: { width: 42, height: 3, background: "#16a34a", marginTop: 8, borderRadius: 999 },
  title: { fontSize: 24, fontWeight: 800, color: "#1a2035", margin: 0 },
  sub: { fontSize: 13, color: "#64748b", marginTop: 5 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, marginBottom: 18 },
  statCard: { minHeight: 92, background: "#fff", border: "1.5px solid #e8eaf0", borderRadius: 16, padding: 16, display: "flex", alignItems: "center", gap: 13 },
  statIcon: { width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0 },
  statValue: { display: "block", color: "#1a2035", fontSize: 24, lineHeight: 1, fontWeight: 800 },
  statLabel: { display: "block", marginTop: 5, color: "#64748b", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0 },
  filterBar: { display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" },
  searchWrap: { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #e8eaf0", borderRadius: 10, padding: "10px 14px", flex: "1 1 260px", minWidth: 220 },
  searchInput: { border: "none", outline: "none", fontSize: 14, background: "transparent", flex: 1, fontFamily: "inherit", color: "#1a2035" },
  clearX: { background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", padding: 0 },
  select: { padding: "8px 10px", border: "1.5px solid #e8eaf0", borderRadius: 8, fontSize: 13, background: "#fff", color: "#475569", outline: "none", cursor: "pointer", fontFamily: "inherit" },
  dateWrap: { display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid #e8eaf0", borderRadius: 8, padding: "6px 10px" },
  dateInput: { border: "none", outline: "none", fontSize: 13, background: "transparent", fontFamily: "inherit", color: "#475569", cursor: "pointer" },
  clearBtn: { display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", border: "1.5px solid #e8eaf0", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 12, color: "#64748b" },
  tabLine: { display: "flex", borderBottom: "2px solid #e8eaf0", marginBottom: 16 },
  tabLineItem: { display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", border: "none", borderBottom: "2.5px solid transparent", marginBottom: -2, background: "transparent", color: "#94a3b8", fontSize: 14, fontWeight: 800, cursor: "pointer" },
  tabLineActive: { color: "#16a34a", borderBottomColor: "#16a34a" },
  chipRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  chipCount: { fontSize: 12, color: "#94a3b8", marginLeft: 4 },
  tableWrap: { border: "1.5px solid #e8eaf0", borderRadius: 16, overflow: "auto", background: "#fff" },
  tableCaption: { padding: "16px 20px", color: "#16a34a", fontSize: 15, fontWeight: 800, borderBottom: "1px solid #f1f5f9" },
  table: { width: "100%", minWidth: 980, borderCollapse: "collapse" },
  td: { padding: "15px 18px", borderBottom: "1px solid #f1f5f9", fontSize: 14, color: "#475569", verticalAlign: "middle" },
  avatar: { width: 30, height: 30, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#0F6E56", flexShrink: 0 },
  conditionTag: { display: "inline-block", padding: "3px 9px", background: "#f1f0ed", borderRadius: 20, fontSize: 12, color: "#555" },
  viewBtn: { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", border: "1.5px solid #e8eaf0", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 12, color: "#64748b", fontWeight: 700 },
  editBtn: { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", border: "1px solid #bbf7d0", borderRadius: 8, background: "#f0fdf4", cursor: "pointer", fontSize: 12, color: "#16a34a", fontWeight: 700 },
  deleteBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, border: "1px solid #fecaca", borderRadius: 8, background: "#fef2f2", cursor: "pointer", color: "#ef4444", fontSize: 15 },
  actionGroup: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 },
  bulkBtn: { display: "inline-flex", alignItems: "center", gap: 9, padding: "10px 18px", border: "1.5px solid #e8eaf0", borderRadius: 10, background: "#fff", cursor: "pointer", fontSize: 13, color: "#475569", fontWeight: 800 },
  btnPrimary: { display: "flex", alignItems: "center", gap: 9, padding: "10px 18px", border: "none", borderRadius: 10, background: "linear-gradient(135deg,#16a34a,#22c55e)", cursor: "pointer", fontSize: 13, color: "#fff", fontWeight: 800, boxShadow: "0 4px 14px rgba(22,163,74,0.25)" },
  mrn: { display: "inline-block", padding: "5px 9px", borderRadius: 7, background: "#eff6ff", color: "#2563eb", fontSize: 12, fontWeight: 800, border: "1px solid #bfdbfe", whiteSpace: "nowrap" },
  statusPill: { display: "inline-block", padding: "5px 12px", borderRadius: 999, background: "#f0fdf4", color: "#16a34a", fontSize: 12, fontWeight: 800, border: "1px solid #bbf7d0" },
  statusInactive: { display: "inline-block", padding: "5px 12px", borderRadius: 999, background: "#fef2f2", color: "#ef4444", fontSize: 12, fontWeight: 800, border: "1px solid #fecaca" },
  pagination: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px", borderTop: "1px solid #f1f5f9", background: "#fff" },
  pageInfo: { color: "#64748b", fontSize: 13, fontWeight: 600 },
  pageControls: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  pageBtn: { padding: "7px 13px", border: "1.5px solid #e8eaf0", borderRadius: 8, background: "#fff", color: "#475569", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  rowsSelect: { padding: "7px 10px", border: "1.5px solid #e8eaf0", borderRadius: 8, background: "#fff", color: "#475569", fontSize: 13, outline: "none" },
  empty: { textAlign: "center", padding: "60px 0", color: "#94a3b8", fontSize: 14 },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", padding: "70px 0" },
  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.38)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 18 },
  modal: { width: "100%", maxWidth: 620, background: "#fff", borderRadius: 16, border: "1.5px solid #e8eaf0", boxShadow: "0 24px 70px rgba(15,23,42,0.24)", padding: 22 },
  modalHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: 800, color: "#1a2035" },
  modalSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  modalClose: { background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 17 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  fieldLabel: { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "#64748b", fontWeight: 800, textTransform: "uppercase" },
  input: { width: "100%", padding: "10px 12px", border: "1.5px solid #e8eaf0", borderRadius: 10, fontSize: 13, background: "#f8fafc", color: "#1a2035", outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 },
  modalError: { marginTop: 12, padding: "9px 11px", borderRadius: 8, background: "#FAECE7", border: "0.5px solid #F5C4B3", color: "#712B13", fontSize: 12 },
  deleteConfirmBtn: { display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", border: "none", borderRadius: 8, background: "#C0392B", cursor: "pointer", fontSize: 13, color: "#fff", fontWeight: 700 },
};
