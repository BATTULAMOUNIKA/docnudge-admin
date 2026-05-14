import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API, { updateVisitStatus } from "../api";

function appPath(path) {
  return window.location.pathname.startsWith("/doctor") ? `/doctor${path}` : path;
}

const STATUS_ORDER = ["waiting", "in_consultation", "done"];
const STATUS_LABEL = {
  waiting: "Waiting",
  in_consultation: "In consultation",
  done: "Done",
};
const STATUS_COLOR = {
  waiting: { bg: "#FAEEDA", color: "#633806", dot: "#EF9F27" },
  in_consultation: { bg: "#E1F5EE", color: "#085041", dot: "#1D9E75" },
  done: { bg: "#F1EFE8", color: "#444441", dot: "#B4B2A9" },
};
const STATUS_MAP = {
  waiting: "waiting",
  upcoming: "waiting",
  in_consultation: "in_consultation",
  done: "done",
  completed: "done",
  missed: "done",
};

function localDateString() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function normalizeStatus(status) {
  return STATUS_MAP[status] || "waiting";
}

export default function QueuePage({ clinicId }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExistingSearch, setShowExistingSearch] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadQueue();
  }, [clinicId]);

  async function loadQueue() {
    if (!clinicId) {
      setQueue([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await API.get(`/visits/clinic/${clinicId}`);
      const data = res.data || [];
      const today = localDateString();
      const todayVisits = data.filter((visit) => visit.visit_date?.slice(0, 10) === today);
      setQueue(todayVisits.map((visit, index) => ({ ...visit, status: normalizeStatus(visit.status), token: index + 1 })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function moveStatus(visit, direction) {
    const currentStatus = normalizeStatus(visit.status);
    const idx = STATUS_ORDER.indexOf(currentStatus);
    const nextStatus = STATUS_ORDER[Math.min(Math.max(idx + direction, 0), STATUS_ORDER.length - 1)];
    if (nextStatus === currentStatus) return;

    await updateVisitStatus(visit.id, nextStatus);
    setQueue((current) => current.map((item) => (item.id === visit.id ? { ...item, status: nextStatus } : item)));
  }

  const counts = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = queue.filter((visit) => normalizeStatus(visit.status) === status).length;
    return acc;
  }, {});

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Today's queue</h1>
          <p style={styles.sub}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} - {queue.length} patient{queue.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.btnOutline} onClick={() => setShowExistingSearch((value) => !value)}>
            <i className="ti ti-user-search" style={{ fontSize: 14 }} />
            Add existing patient
          </button>
          <button style={styles.btnPrimary} onClick={() => navigate(appPath("/patients/add"))}>
            <i className="ti ti-user-plus" style={{ fontSize: 14 }} />
            Add walk-in
          </button>
          <button style={styles.btnOutline} onClick={loadQueue} title="Refresh">
            <i className="ti ti-refresh" style={{ fontSize: 14 }} />
          </button>
        </div>
      </div>

      {showExistingSearch && (
        <AddExistingPatient
          clinicId={clinicId}
          onAdded={() => {
            setShowExistingSearch(false);
            loadQueue();
          }}
          onClose={() => setShowExistingSearch(false)}
        />
      )}

      <div style={styles.summaryRow}>
        {STATUS_ORDER.map((status) => (
          <div key={status} style={{ ...styles.pill, background: STATUS_COLOR[status].bg, color: STATUS_COLOR[status].color }}>
            <span style={{ ...styles.dot, background: STATUS_COLOR[status].dot }} />
            <strong>{counts[status]}</strong> {STATUS_LABEL[status]}
          </div>
        ))}
        {queue.length > 0 && (
          <div style={{ ...styles.pill, background: "#F1EFE8", color: "#555", marginLeft: "auto" }}>
            <i className="ti ti-clock" style={{ fontSize: 13 }} />
            Est. wait: ~{counts.waiting * 10} min
          </div>
        )}
      </div>

      {loading ? (
        <div style={styles.empty}>Loading queue...</div>
      ) : queue.length === 0 ? (
        <div style={styles.emptyState}>
          <i className="ti ti-users" style={{ fontSize: 36, color: "#ddd", marginBottom: 12 }} />
          <div style={{ fontSize: 15, color: "#aaa", marginBottom: 6 }}>No patients in queue today</div>
          <div style={{ fontSize: 13, color: "#ccc" }}>Use "Add walk-in" to register a new patient</div>
        </div>
      ) : (
        <div style={styles.list}>
          <div style={styles.colHeader}>
            <span style={{ width: 36 }}>#</span>
            <span style={{ flex: 1 }}>Patient</span>
            <span style={{ width: 170 }}>Status</span>
            <span style={{ width: 140 }}>Actions</span>
          </div>
          {queue.map((visit) => {
            const status = normalizeStatus(visit.status);
            const color = STATUS_COLOR[status];
            return (
              <div
                key={visit.id}
                style={{
                  ...styles.row,
                  borderLeft: status === "in_consultation" ? "3px solid #1D9E75" : "3px solid transparent",
                  opacity: status === "done" ? 0.55 : 1,
                }}
              >
                <div
                  style={{
                    ...styles.token,
                    background: status === "in_consultation" ? "#E6F1FB" : "#F8F7F4",
                    color: status === "in_consultation" ? "#185FA5" : "#999",
                  }}
                >
                  {visit.token}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.patientName} onClick={() => navigate(appPath(`/patients/${visit.patient_id}`))}>
                    {visit.patient_name || "Patient"}
                  </div>
                  <div style={styles.patientSub}>{visit.condition || visit.notes || "-"}</div>
                </div>
                <div style={{ width: 170 }}>
                  <span style={{ ...styles.badge, background: color.bg, color: color.color }}>
                    <span style={{ ...styles.dot, background: color.dot }} />
                    {STATUS_LABEL[status]}
                  </span>
                </div>
                <div style={{ ...styles.btnGroup, width: 140 }}>
                  {status === "waiting" && (
                    <button style={{ ...styles.actionBtn, color: "#1D9E75", borderColor: "#A8DFC9" }} onClick={() => moveStatus(visit, 1)}>
                      <i className="ti ti-stethoscope" style={{ fontSize: 13 }} /> Start
                    </button>
                  )}
                  {status === "in_consultation" && (
                    <button style={{ ...styles.actionBtn, color: "#185FA5", borderColor: "#B5D4F4" }} onClick={() => moveStatus(visit, 1)}>
                      <i className="ti ti-check" style={{ fontSize: 13 }} /> Done
                    </button>
                  )}
                  {status !== "waiting" && (
                    <button style={{ ...styles.actionBtn, color: "#bbb" }} onClick={() => moveStatus(visit, -1)} title="Move back">
                      <i className="ti ti-arrow-back" style={{ fontSize: 13 }} />
                    </button>
                  )}
                  <button style={{ ...styles.actionBtn, color: "#888" }} onClick={() => navigate(appPath(`/patients/${visit.patient_id}`))} title="Open OP sheet">
                    <i className="ti ti-external-link" style={{ fontSize: 13 }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddExistingPatient({ clinicId, onAdded, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [adding, setAdding] = useState(null);

  async function search(value) {
    setQuery(value);
    if (value.length < 2 || !clinicId) {
      setResults([]);
      return;
    }
    try {
      const res = await API.get(`/patients/clinic/${clinicId}?search=${encodeURIComponent(value)}`);
      setResults(res.data || []);
    } catch {
      setResults([]);
    }
  }

  async function addToQueue(patient) {
    setAdding(patient.id);
    try {
      await API.post("/visits", {
        patient_id: patient.id,
        visit_date: localDateString(),
        status: "waiting",
        notes: "",
      });
      onAdded();
    } catch {
      alert("Could not add patient to queue");
    } finally {
      setAdding(null);
    }
  }

  return (
    <div style={styles.searchBox}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          style={{ ...styles.searchInput, flex: 1 }}
          placeholder="Search by name, phone, or condition..."
          value={query}
          onChange={(event) => search(event.target.value)}
          autoFocus
        />
        <button style={styles.closeBtn} onClick={onClose}>
          <i className="ti ti-x" style={{ fontSize: 15 }} />
        </button>
      </div>

      {results.map((patient) => (
        <div key={patient.id} style={styles.searchRow}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a18" }}>{patient.name}</div>
            <div style={{ fontSize: 11, color: "#aaa" }}>{patient.phone} | {patient.condition || "-"}</div>
          </div>
          <button style={styles.btnPrimary} onClick={() => addToQueue(patient)} disabled={adding === patient.id}>
            {adding === patient.id ? "Adding..." : "Add to queue"}
          </button>
        </div>
      ))}

      {query.length >= 2 && results.length === 0 && (
        <div style={{ fontSize: 13, color: "#aaa", padding: "6px 0" }}>
          No patients found - use "Add walk-in" to create a new record.
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: "28px 32px", maxWidth: 920, margin: "0 auto", fontFamily: "'DM Sans', sans-serif" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 600, color: "#1a1a18", margin: 0 },
  sub: { fontSize: 13, color: "#aaa", marginTop: 3 },
  summaryRow: { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" },
  pill: { display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 20, fontSize: 13 },
  dot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0, display: "inline-block" },
  list: { border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 10, overflow: "hidden" },
  colHeader: { display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", background: "#f8f7f4", borderBottom: "0.5px solid rgba(0,0,0,0.08)", fontSize: 11, color: "#aaa", fontWeight: 500 },
  row: { display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: "#fff", borderBottom: "0.5px solid rgba(0,0,0,0.06)" },
  token: { width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, flexShrink: 0, border: "0.5px solid rgba(0,0,0,0.08)" },
  patientName: { fontSize: 14, fontWeight: 500, color: "#1a1a18", cursor: "pointer" },
  patientSub: { fontSize: 12, color: "#999", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 360 },
  badge: { display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" },
  btnGroup: { display: "flex", gap: 4, alignItems: "center" },
  actionBtn: { display: "flex", alignItems: "center", gap: 4, padding: "5px 9px", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: 12 },
  empty: { textAlign: "center", padding: "60px 0", color: "#bbb", fontSize: 14 },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0" },
  btnPrimary: { display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "none", borderRadius: 8, background: "#1D9E75", cursor: "pointer", fontSize: 13, color: "#fff", fontWeight: 500, flexShrink: 0 },
  btnOutline: { display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: 13, color: "#444" },
  searchBox: { background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 10, padding: "14px 16px", marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  searchInput: { padding: "9px 12px", border: "0.5px solid rgba(0,0,0,0.15)", borderRadius: 7, fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
  searchRow: { display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", borderRadius: 7, background: "#f8f7f4", marginBottom: 4 },
  closeBtn: { width: 32, height: 32, border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 7, background: "transparent", cursor: "pointer", color: "#aaa", display: "flex", alignItems: "center", justifyContent: "center" },
};
