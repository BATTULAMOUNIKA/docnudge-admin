import { useEffect, useMemo, useState } from "react";
import {
  completeAppointment,
  deleteAppointment,
  getAppointments,
  updateAppointment,
} from "../api";

const FILTERS = [
  ["active", "Live Queue"],
  ["today", "Today"],
  ["past", "Past Due"],
  ["completed", "Completed"],
];

function localDateString(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

function dateLabel(value) {
  const today = localDateString();
  if (value === today) return "Today";
  if (value === addDays(-1)) return "Yesterday";
  if (value === addDays(1)) return "Tomorrow";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value || "No date";
  return parsed.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function waitLabel(index, appointment) {
  if (appointment.status === "completed") return "Completed";
  if (appointment.appointment_time) return appointment.appointment_time;
  return `${Math.max(index + 1, 1) * 30} mins`;
}

export default function Appointments({ clinicId }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [rescheduling, setRescheduling] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, [clinicId]);

  async function load() {
    if (!clinicId) {
      setAppointments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await getAppointments(clinicId);
      setAppointments(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function flash(text) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2600);
  }

  async function markDone(appointment) {
    const response = await completeAppointment(appointment.id, {
      condition: appointment.service_type || "Consultation",
      notes: appointment.notes || "",
    });
    setAppointments((current) => current.filter((item) => item.id !== appointment.id));
    flash(`${response.data?.patient?.name || appointment.patient_name} moved to Patients.`);
  }

  async function removeAppointment(appointment) {
    if (!window.confirm(`Delete appointment for ${appointment.patient_name}?`)) return;
    await deleteAppointment(appointment.id);
    setAppointments((current) => current.filter((item) => item.id !== appointment.id));
    flash("Appointment deleted.");
  }

  async function saveReschedule(payload) {
    await updateAppointment(payload.id, {
      appointment_date: payload.appointment_date,
      appointment_time: payload.appointment_time,
      status: "booked",
    });
    setRescheduling(null);
    await load();
    flash("Appointment rescheduled.");
  }

  const today = localDateString();
  const counts = useMemo(() => ({
    active: appointments.filter((item) => !["completed", "cancelled"].includes(item.status)).length,
    today: appointments.filter((item) => item.appointment_date?.slice(0, 10) === today && item.status !== "completed").length,
    past: appointments.filter((item) => item.appointment_date?.slice(0, 10) < today && item.status !== "completed").length,
    completed: appointments.filter((item) => item.status === "completed").length,
  }), [appointments, today]);

  const visible = useMemo(() => {
    return appointments
      .filter((appointment) => {
        const status = appointment.status || "booked";
        const date = appointment.appointment_date?.slice(0, 10);
        if (filter === "today") return date === today && status !== "completed";
        if (filter === "past") return date < today && status !== "completed";
        if (filter === "completed") return status === "completed";
        return status !== "completed" && status !== "cancelled";
      })
      .sort((a, b) => `${a.appointment_date || ""} ${a.appointment_time || ""}`.localeCompare(`${b.appointment_date || ""} ${b.appointment_time || ""}`));
  }, [appointments, filter, today]);

  const nextAppointment = visible[0];

  return (
    <div style={styles.page}>
      {rescheduling && <RescheduleModal appointment={rescheduling} onClose={() => setRescheduling(null)} onSave={saveReschedule} />}

      <header style={styles.topbar}>
        <div style={styles.pageTitle}>
          <div style={styles.iconBox}><i className="ti ti-calendar-event" /></div>
          <div>
            <h1 style={styles.title}>Appointments</h1>
            <p style={styles.sub}>Live queue, scheduled visits and completed appointments for the doctor workspace.</p>
          </div>
        </div>
        <div style={styles.topbarRight}>
          {message && <div style={styles.toast}>{message}</div>}
          <button style={styles.refreshBtn} onClick={load}><i className="ti ti-refresh" /> Refresh</button>
        </div>
      </header>

      <section style={styles.statsRow}>
        <StatCard label="Live queue" value={counts.active} icon="ti-users" tone="green" />
        <StatCard label="Today" value={counts.today} icon="ti-sun" tone="blue" />
        <StatCard label="Past due" value={counts.past} icon="ti-alert-circle" tone="orange" alert={counts.past > 0} />
        <StatCard label="Completed" value={counts.completed} icon="ti-circle-check" tone="purple" />
      </section>

      <section style={styles.queuePanel}>
        <div style={styles.queueHeader}>
          <div>
            <h2 style={styles.queueTitle}><span style={styles.liveDot} /> {FILTERS.find(([key]) => key === filter)?.[1]}</h2>
            <p style={styles.queueSub}>
              {nextAppointment ? `Next: ${nextAppointment.patient_name || "Patient"} at ${nextAppointment.appointment_time || "queue time"}` : "No active appointment in this view."}
            </p>
          </div>
          <div style={styles.tabs}>
            {FILTERS.map(([key, label]) => (
              <button key={key} style={{ ...styles.tab, ...(filter === key ? styles.tabActive : {}) }} onClick={() => setFilter(key)}>
                {label}
                <span>{counts[key] || 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <Th>Token</Th>
                <Th>Patient</Th>
                <Th>Phone</Th>
                <Th>Date</Th>
                <Th>Wait / Time</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td style={styles.emptyCell} colSpan="8">Loading appointments...</td></tr>
              ) : visible.length === 0 ? (
                <tr><td style={styles.emptyCell} colSpan="8">No appointments in this view.</td></tr>
              ) : (
                visible.map((appointment, index) => (
                  <AppointmentRow
                    key={appointment.id}
                    appointment={appointment}
                    index={index}
                    onDone={() => markDone(appointment)}
                    onReschedule={() => setRescheduling(appointment)}
                    onDelete={() => removeAppointment(appointment)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AppointmentRow({ appointment, index, onDone, onReschedule, onDelete }) {
  const status = appointment.status || "booked";
  const isCompleted = status === "completed";
  const token = `Q-${String(index + 1).padStart(2, "0")}`;
  const date = appointment.appointment_date?.slice(0, 10);

  return (
    <tr style={styles.tr}>
      <td style={styles.td}><span style={{ ...styles.token, ...(index === 0 && !isCompleted ? styles.tokenActive : {}) }}>{token}</span></td>
      <td style={styles.td}>
        <div style={styles.patientCell}>
          <strong>{appointment.patient_name || "Patient"}</strong>
          {appointment.notes && <span>{appointment.notes}</span>}
        </div>
      </td>
      <td style={styles.td}><span style={styles.mutedText}>{appointment.patient_phone || "-"}</span></td>
      <td style={styles.td}>
        <div style={styles.dateCell}>
          <strong>{dateLabel(date)}</strong>
          <span>{date || "-"}</span>
        </div>
      </td>
      <td style={styles.td}><span style={styles.waitText}>{waitLabel(index, appointment)}</span></td>
      <td style={styles.td}>{appointment.service_type || "Consultation"}</td>
      <td style={styles.td}><StatusBadge status={status} /></td>
      <td style={{ ...styles.td, textAlign: "right" }}>
        <div style={styles.actions}>
          {!isCompleted && <button style={styles.startBtn} onClick={onDone}><i className="ti ti-check" /> Done</button>}
          <button style={styles.iconBtn} onClick={onReschedule} title="Reschedule"><i className="ti ti-calendar-plus" /></button>
          <button style={{ ...styles.iconBtn, ...styles.dangerIcon }} onClick={onDelete} title="Delete"><i className="ti ti-trash" /></button>
        </div>
      </td>
    </tr>
  );
}

function RescheduleModal({ appointment, onClose, onSave }) {
  const [form, setForm] = useState({
    id: appointment.id,
    appointment_date: appointment.appointment_date?.slice(0, 10) || addDays(1),
    appointment_time: appointment.appointment_time || "10:00",
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button style={styles.closeBtn} onClick={onClose}><i className="ti ti-x" /></button>
        <h3 style={styles.modalTitle}>Reschedule appointment</h3>
        <p style={styles.modalSub}>{appointment.patient_name}</p>
        <div style={styles.formRow}>
          <label style={styles.field}>Date<input type="date" value={form.appointment_date} onChange={(event) => setForm({ ...form, appointment_date: event.target.value })} /></label>
          <label style={styles.field}>Time<input value={form.appointment_time} onChange={(event) => setForm({ ...form, appointment_time: event.target.value })} placeholder="10:00 AM" /></label>
        </div>
        <div style={styles.modalFooter}>
          <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={styles.saveBtn} disabled={saving} onClick={submit}>{saving ? "Saving..." : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const done = status === "completed";
  const serving = status === "serving";
  return (
    <span style={{ ...styles.statusBadge, ...(done ? styles.statusDone : serving ? styles.statusServing : styles.statusQueue) }}>
      <i className={`ti ${done ? "ti-circle-check" : serving ? "ti-stethoscope" : "ti-clock"}`} />
      {done ? "Done" : serving ? "Serving" : status || "Booked"}
    </span>
  );
}

function StatCard({ label, value, icon, tone, alert }) {
  const palette = {
    green: ["#f0fdf4", "#16a34a"],
    blue: ["#eff6ff", "#2563eb"],
    orange: ["#fff7ed", "#ea580c"],
    purple: ["#f5f3ff", "#7c3aed"],
  }[tone];

  return (
    <article style={{ ...styles.statCard, ...(alert ? styles.statAlert : {}) }}>
      <div style={{ ...styles.statIcon, background: palette[0], color: palette[1] }}><i className={`ti ${icon}`} /></div>
      <span style={styles.statLabel}>{label}</span>
      <strong style={{ ...styles.statValue, color: palette[1] }}>{value}</strong>
    </article>
  );
}

function Th({ children, align = "left" }) {
  return <th style={{ ...styles.th, textAlign: align }}>{children}</th>;
}

const styles = {
  page: { padding: "24px 28px 34px", minHeight: "100vh", background: "#f4f6fb", fontFamily: "'DM Sans', sans-serif", color: "#1a2035" },
  topbar: { minHeight: 72, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, marginBottom: 22 },
  pageTitle: { display: "flex", alignItems: "center", gap: 12 },
  iconBox: { width: 42, height: 42, borderRadius: 12, background: "#f0fdf4", color: "#16a34a", display: "grid", placeItems: "center", fontSize: 20 },
  title: { margin: 0, fontSize: 24, lineHeight: 1, fontWeight: 800, letterSpacing: 0 },
  sub: { margin: "6px 0 0", fontSize: 13, color: "#64748b" },
  topbarRight: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" },
  refreshBtn: { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, border: "1.5px solid #e8eaf0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  toast: { background: "#1a2035", color: "#fff", borderRadius: 12, padding: "9px 13px", fontSize: 12, fontWeight: 700 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 16, marginBottom: 22 },
  statCard: { background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1.5px solid #e8eaf0", minHeight: 132 },
  statAlert: { borderColor: "#ef4444" },
  statIcon: { width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", fontSize: 18, marginBottom: 12 },
  statLabel: { display: "block", fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0 },
  statValue: { display: "block", marginTop: 8, fontSize: 32, lineHeight: 1, fontWeight: 800 },
  queuePanel: { background: "transparent" },
  queueHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, marginBottom: 14 },
  queueTitle: { display: "flex", alignItems: "center", gap: 8, margin: 0, fontSize: 18, fontWeight: 800 },
  queueSub: { margin: "5px 0 0", color: "#64748b", fontSize: 13 },
  liveDot: { width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 5px rgba(34,197,94,0.12)" },
  tabs: { display: "flex", gap: 4, padding: 4, background: "#e8eef5", borderRadius: 12, flexWrap: "wrap" },
  tab: { display: "inline-flex", alignItems: "center", gap: 7, border: "none", borderRadius: 9, background: "transparent", padding: "8px 13px", color: "#64748b", fontSize: 13, fontWeight: 800, cursor: "pointer" },
  tabActive: { background: "#fff", color: "#16a34a", boxShadow: "0 2px 8px rgba(15,23,42,0.08)" },
  tableWrap: { background: "#fff", borderRadius: 16, border: "1.5px solid #e8eaf0", overflow: "auto" },
  table: { width: "100%", minWidth: 960, borderCollapse: "collapse" },
  th: { padding: "13px 18px", fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0, background: "#f8fafc", borderBottom: "1px solid #e8eaf0", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "14px 18px", fontSize: 13, color: "#334155", verticalAlign: "middle" },
  token: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 50, padding: "5px 10px", borderRadius: 8, border: "1.5px solid #cbd5e1", background: "#f8fafc", color: "#64748b", fontWeight: 800, fontSize: 12 },
  tokenActive: { borderColor: "#16a34a", background: "#f0fdf4", color: "#16a34a" },
  patientCell: { display: "flex", flexDirection: "column", gap: 3 },
  mutedText: { color: "#64748b" },
  dateCell: { display: "flex", flexDirection: "column", gap: 2 },
  waitText: { color: "#475569", fontWeight: 700 },
  statusBadge: { display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, border: "1.5px solid", fontSize: 12, fontWeight: 800, textTransform: "capitalize", whiteSpace: "nowrap" },
  statusQueue: { borderColor: "#fbbf24", color: "#d97706", background: "#fffbeb" },
  statusServing: { borderColor: "#22c55e", color: "#16a34a", background: "#f0fdf4" },
  statusDone: { borderColor: "#cbd5e1", color: "#64748b", background: "#f8fafc" },
  actions: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 },
  startBtn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" },
  iconBtn: { width: 32, height: 32, borderRadius: 8, border: "1.5px solid #e8eaf0", background: "#fff", color: "#64748b", display: "inline-grid", placeItems: "center", cursor: "pointer" },
  dangerIcon: { borderColor: "#fecaca", background: "#fef2f2", color: "#ef4444" },
  emptyCell: { padding: 46, color: "#94a3b8", textAlign: "center", fontSize: 14 },
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.42)", display: "grid", placeItems: "center", zIndex: 1000, padding: 18 },
  modal: { width: "min(480px,100%)", background: "#fff", borderRadius: 20, padding: 26, boxShadow: "0 24px 70px rgba(15,23,42,0.22)", position: "relative" },
  closeBtn: { position: "absolute", top: 18, right: 18, border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 18 },
  modalTitle: { margin: "0 0 5px", fontSize: 20, fontWeight: 800 },
  modalSub: { margin: "0 0 22px", color: "#64748b", fontSize: 13 },
  formRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  field: { display: "flex", flexDirection: "column", gap: 7, color: "#64748b", fontSize: 12, fontWeight: 800, textTransform: "uppercase" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 },
  cancelBtn: { padding: "10px 18px", border: "1.5px solid #e8eaf0", borderRadius: 10, background: "#fff", color: "#64748b", fontWeight: 700, cursor: "pointer" },
  saveBtn: { padding: "10px 20px", border: "none", borderRadius: 10, background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "#fff", fontWeight: 800, cursor: "pointer" },
};
