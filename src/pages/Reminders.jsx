import { useState, useEffect } from "react";
import API from "../api";

function localDateString(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 86400000);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function normalizeLogs(logRows) {
  return (logRows || []).map((row) => {
    if (Array.isArray(row)) {
      const [log, patient] = row;
      return { ...log, patient_name: patient?.name, phone: patient?.phone };
    }
    return row;
  });
}

export default function Reminders({ clinicId }) {
  const [tab, setTab] = useState("upcoming");
  const [logs, setLogs] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, [clinicId]);

  async function loadAll() {
    if (!clinicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [logResponse, appointmentResponse] = await Promise.all([
        API.get(`/reminder-logs/${clinicId}`),
        API.get(`/appointments/${clinicId}`),
      ]);
      setLogs(normalizeLogs(logResponse.data));
      setAppointments(appointmentResponse.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function triggerReminder(type) {
    try {
      await API.post(`/test/${type}`);
      alert(`${type} reminder triggered. Check WhatsApp.`);
      loadAll();
    } catch {
      alert("Error triggering reminder");
    }
  }

  const today = localDateString(0);
  const dayAfter = localDateString(2);
  const upcoming = appointments.filter((appointment) => appointment.next_visit && appointment.next_visit.slice(0, 10) >= today && appointment.next_visit.slice(0, 10) <= dayAfter);
  const sent = logs.filter((log) => log.success);
  const failed = logs.filter((log) => !log.success);
  const counts = { upcoming: upcoming.length, sent: sent.length, failed: failed.length };

  return (
    <div style={reminderStyles.page}>
      <div style={reminderStyles.header}>
        <div>
          <h1 style={reminderStyles.title}>Reminders</h1>
          <p style={reminderStyles.sub}>Scheduled WhatsApp reminders for upcoming visits</p>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <button style={reminderStyles.btn} onClick={() => triggerReminder("two-days-before")}>2-day</button>
          <button style={reminderStyles.btn} onClick={() => triggerReminder("day-before")}>Day before</button>
          <button style={reminderStyles.btn} onClick={() => triggerReminder("morning")}>Morning</button>
        </div>
      </div>

      <div style={reminderStyles.scheduleBar}>
        <SchedulePill time="10:00 AM" label="2 days before visit" color="#0C447C" bg="#E6F1FB" />
        <SchedulePill time="6:00 PM" label="Day before visit" color="#633806" bg="#FAEEDA" />
        <SchedulePill time="8:00 AM" label="Morning of visit" color="#085041" bg="#E1F5EE" />
        <div style={{ flex: 1 }} />
        <div style={reminderStyles.githubNote}>
          <i className="ti ti-brand-github" style={{ fontSize: 13 }} /> Triggered by scheduler
        </div>
      </div>

      <div style={reminderStyles.tabs}>
        {[["upcoming", "Upcoming"], ["sent", "Sent"], ["failed", "Failed"]].map(([key, label]) => (
          <button key={key} style={{ ...reminderStyles.tab, ...(tab === key ? reminderStyles.tabActive : {}) }} onClick={() => setTab(key)}>
            {label}
            {counts[key] > 0 && <span style={reminderStyles.tabBadge}>{counts[key]}</span>}
          </button>
        ))}
      </div>

      {tab === "upcoming" && renderList(loading, upcoming, "No reminders scheduled in the next 2 days.", (appointment) => (
        <ReminderRow
          key={`${appointment.patient_id}-${appointment.next_visit}`}
          title={appointment.patient_name || "Patient"}
          subtitle={`${appointment.condition || appointment.followup_type || "-"} | ${appointment.phone || ""}`}
          rightTop={appointment.next_visit?.slice(0, 10)}
          rightBottom={appointment.next_visit?.slice(0, 10) === today ? "Today" : "Upcoming"}
          icon="ti-brand-whatsapp"
          iconBg="#E6F1FB"
          iconColor="#185FA5"
        />
      ))}

      {tab === "sent" && renderList(loading, sent, "No reminders sent yet.", (log) => (
        <ReminderRow
          key={log.id}
          title={log.patient_name || `Patient #${log.patient_id}`}
          subtitle={log.reminder_type}
          rightTop={log.sent_at?.slice(0, 16).replace("T", " ")}
          icon="ti-check"
          iconBg="#E1F5EE"
          iconColor="#1D9E75"
        />
      ))}

      {tab === "failed" && renderList(loading, failed, "No failed reminders. All good.", (log) => (
        <ReminderRow
          key={log.id}
          title={log.patient_name || `Patient #${log.patient_id}`}
          subtitle={log.error || "Send failed"}
          rightTop={log.sent_at?.slice(0, 16).replace("T", " ")}
          icon="ti-alert-circle"
          iconBg="#FAECE7"
          iconColor="#993C1D"
        />
      ))}
    </div>
  );
}

function renderList(loading, items, emptyText, renderer) {
  if (loading) return <div style={reminderStyles.empty}>Loading...</div>;
  if (!items.length) return <div style={reminderStyles.empty}>{emptyText}</div>;
  return <div style={reminderStyles.list}>{items.map(renderer)}</div>;
}

function ReminderRow({ title, subtitle, rightTop, rightBottom, icon, iconBg, iconColor }) {
  return (
    <div style={reminderStyles.row}>
      <div style={{ ...reminderStyles.iconCircle, background: iconBg }}>
        <i className={`ti ${icon}`} style={{ fontSize: 15, color: iconColor }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={reminderStyles.rowName}>{title}</div>
        <div style={reminderStyles.rowSub}>{subtitle}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 12, color: "#555" }}>{rightTop || "-"}</div>
        {rightBottom && <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{rightBottom}</div>}
      </div>
    </div>
  );
}

function SchedulePill({ time, label, color, bg }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", background: bg, borderRadius: 8, fontSize: 12 }}>
      <i className="ti ti-clock" style={{ fontSize: 14, color }} />
      <strong style={{ color }}>{time}</strong>
      <span style={{ color }}>{label}</span>
    </div>
  );
}

const reminderStyles = {
  page: { padding: "28px 32px", fontFamily: "'DM Sans',sans-serif", maxWidth: 860 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  title: { fontSize: 22, fontWeight: 700, color: "#1a1a18", margin: 0 },
  sub: { fontSize: 13, color: "#aaa", marginTop: 3 },
  scheduleBar: { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "0.5px solid rgba(0,0,0,0.09)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, flexWrap: "wrap" },
  githubNote: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#aaa" },
  tabs: { display: "flex", gap: 0, borderBottom: "0.5px solid rgba(0,0,0,0.09)", marginBottom: 16 },
  tab: { display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#888", borderBottom: "2px solid transparent", marginBottom: -1 },
  tabActive: { color: "#1D9E75", fontWeight: 600, borderBottomColor: "#1D9E75" },
  tabBadge: { fontSize: 11, padding: "2px 7px", borderRadius: 20, fontWeight: 500, background: "#E1F5EE", color: "#085041" },
  list: { display: "flex", flexDirection: "column", gap: 0, border: "0.5px solid rgba(0,0,0,0.09)", borderRadius: 10, overflow: "hidden" },
  row: { display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: "#fff", borderBottom: "0.5px solid rgba(0,0,0,0.06)" },
  iconCircle: { width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rowName: { fontSize: 13, fontWeight: 500, color: "#1a1a18" },
  rowSub: { fontSize: 12, color: "#aaa", marginTop: 2 },
  empty: { textAlign: "center", padding: "60px 0", color: "#bbb", fontSize: 14 },
  btn: { display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: 12, color: "#555" },
};
