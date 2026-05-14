import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API, { sendRecoveryWhatsApp } from "../api";

function appPath(path) {
  return window.location.pathname.startsWith("/doctor") ? `/doctor${path}` : path;
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

function todayString() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

export default function Recovery({ clinicId }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overdue");
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

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
      const [patientResponse, appointmentResponse, logResponse] = await Promise.all([
        API.get(`/patients/clinic/${clinicId}`),
        API.get(`/appointments/${clinicId}`),
        API.get(`/reminder-logs/${clinicId}`),
      ]);
      setPatients(patientResponse.data || []);
      setAppointments(appointmentResponse.data || []);
      setLogs(normalizeLogs(logResponse.data));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const today = todayString();
  const overdue = appointments.filter((appointment) => appointment.next_visit?.slice(0, 10) < today && appointment.status !== "completed");
  const missed = appointments.filter((appointment) => appointment.status === "missed");
  const failedWA = logs.filter((log) => !log.success);
  const optedOut = patients.filter((patient) => patient.opted_out);

  const weeklyMissed = missed.length;
  const weeklyNew = patients.filter((patient) => patient.created_at?.slice(0, 10) >= today).length;
  const weeklyReturns = appointments.filter((appointment) => appointment.status === "completed").length;
  const counts = { overdue: overdue.length, missed: missed.length, failed: failedWA.length, optout: optedOut.length };

  function generateReport() {
    const summary = overdue.length
      ? `${overdue.length} patients are overdue and need recovery outreach. Failed WhatsApp sends: ${failedWA.length}.`
      : `Follow-up health looks stable this week with ${weeklyReturns} completed returns.`;
    const highlights = [
      `${weeklyNew} new patients added this week`,
      `${weeklyReturns} follow-ups completed`,
      `${weeklyMissed} missed visits need attention`,
    ];
    const action = overdue.length ? "Focus on overdue patients first and retry failed WhatsApp sends." : "Keep monitoring reminder delivery and book next visits before discharge.";
    setReport({ summary, highlights, action });
  }

  async function sendRecovery(patientId, patientName) {
    try {
      await sendRecoveryWhatsApp(patientId);
      alert(`Recovery message sent to ${patientName}`);
    } catch {
      alert("Failed to send recovery message");
    }
  }

  return (
    <div style={recoveryStyles.page}>
      <div style={recoveryStyles.header}>
        <div>
          <h1 style={recoveryStyles.title}>Recovery</h1>
          <p style={recoveryStyles.sub}>Overdue patients, missed visits and failed sends</p>
        </div>
        <button style={recoveryStyles.btnPrimary} onClick={loadAll}>
          <i className="ti ti-refresh" style={{ fontSize: 13 }} /> Refresh
        </button>
      </div>

      {overdue.length > 0 && (
        <div style={recoveryStyles.alertBar}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 16, color: "#712B13" }} />
          <span><strong>{overdue.length} patients</strong> are overdue for a visit. Send a recovery message to bring them back.</span>
        </div>
      )}

      <div style={recoveryStyles.reportCard}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={recoveryStyles.aiBadge}><i className="ti ti-sparkles" style={{ fontSize: 13 }} /> AI</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a18" }}>Weekly clinic report</div>
              <div style={{ fontSize: 12, color: "#aaa" }}>Summary generated from live clinic data</div>
            </div>
          </div>
          <button style={recoveryStyles.btnPrimary} onClick={generateReport}>
            <i className="ti ti-sparkles" style={{ fontSize: 13 }} /> Generate report
          </button>
        </div>

        <div style={recoveryStyles.weeklyGrid}>
          <WeeklyStat label="Visits in follow-up pipeline" value={appointments.length} />
          <WeeklyStat label="New patients" value={weeklyNew} />
          <WeeklyStat label="Returned patients" value={weeklyReturns} />
          <WeeklyStat label="Missed visits" value={weeklyMissed} warn={weeklyMissed > 0} />
        </div>

        {report && (
          <div style={recoveryStyles.reportOutput}>
            <div style={{ fontSize: 13, color: "#1a1a18", lineHeight: 1.6, marginBottom: 10 }}>{report.summary}</div>
            <ul style={{ paddingLeft: 18, margin: "0 0 10px" }}>
              {(report.highlights || []).map((item, index) => <li key={index} style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>{item}</li>)}
            </ul>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#E1F5EE", borderRadius: 7, padding: "9px 12px" }}>
              <i className="ti ti-bulb" style={{ fontSize: 14, color: "#1D9E75", marginTop: 1 }} />
              <span style={{ fontSize: 13, color: "#085041" }}><strong>Recommended:</strong> {report.action}</span>
            </div>
          </div>
        )}
      </div>

      <div style={recoveryStyles.tabs}>
        {[["overdue", "Overdue patients"], ["missed", "Missed visits"], ["failed", "Failed WhatsApp"], ["optout", "Opted out"]].map(([key, label]) => (
          <button key={key} style={{ ...recoveryStyles.tab, ...(tab === key ? recoveryStyles.tabActive : {}) }} onClick={() => setTab(key)}>
            {label}
            {counts[key] > 0 && <span style={recoveryStyles.tabBadge}>{counts[key]}</span>}
          </button>
        ))}
      </div>

      {tab === "overdue" && renderRecoveryList(loading, overdue, "No overdue patients. Great retention!", (appointment) => (
        <RecoveryRow
          key={`${appointment.patient_id}-${appointment.next_visit}`}
          title={appointment.patient_name}
          subtitle={`${appointment.condition || appointment.followup_type || "-"} | ${appointment.phone || ""}`}
          rightTop={`${Math.max(1, Math.floor((new Date(today) - new Date(appointment.next_visit?.slice(0, 10) || today)) / 86400000))} days overdue`}
          rightBottom={`Was due: ${appointment.next_visit?.slice(0, 10) || "-"}`}
          onClick={() => navigate(appPath(`/patients/${appointment.patient_id}`))}
          actionLabel="Send message"
          onAction={() => sendRecovery(appointment.patient_id, appointment.patient_name)}
        />
      ))}

      {tab === "missed" && renderRecoveryList(loading, missed, "No missed visits recorded.", (appointment) => (
        <RecoveryRow
          key={`${appointment.patient_id}-${appointment.next_visit}-missed`}
          title={appointment.patient_name}
          subtitle={appointment.condition || appointment.followup_type || "Missed visit"}
          rightTop={appointment.next_visit?.slice(0, 10) || "-"}
          onClick={() => navigate(appPath(`/patients/${appointment.patient_id}`))}
        />
      ))}

      {tab === "failed" && renderRecoveryList(loading, failedWA, "No failed WhatsApp sends. All messages delivered.", (log) => (
        <RecoveryRow
          key={log.id}
          title={log.patient_name || `Patient #${log.patient_id}`}
          subtitle={log.error || "Unknown error"}
          rightTop={log.sent_at?.slice(0, 10) || "-"}
        />
      ))}

      {tab === "optout" && renderRecoveryList(loading, optedOut, "No patients have opted out.", (patient) => (
        <RecoveryRow
          key={patient.id}
          title={patient.name}
          subtitle={`${patient.phone} | ${patient.condition || "-"}`}
          rightTop="Opted out"
        />
      ))}
    </div>
  );
}

function renderRecoveryList(loading, items, emptyText, renderer) {
  if (loading) return <div style={recoveryStyles.empty}>Loading...</div>;
  if (!items.length) return <div style={recoveryStyles.goodState}>{emptyText}</div>;
  return <div style={recoveryStyles.list}>{items.map(renderer)}</div>;
}

function RecoveryRow({ title, subtitle, rightTop, rightBottom, onClick, actionLabel, onAction }) {
  return (
    <div style={recoveryStyles.row}>
      <div style={recoveryStyles.avatar}>{title?.slice(0, 2).toUpperCase() || "PT"}</div>
      <div style={{ flex: 1 }}>
        <div style={recoveryStyles.rowName} onClick={onClick}>{title}</div>
        <div style={recoveryStyles.rowSub}>{subtitle}</div>
      </div>
      <div style={{ textAlign: "right", marginRight: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#993C1D" }}>{rightTop}</div>
        {rightBottom && <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{rightBottom}</div>}
      </div>
      {actionLabel && <button style={recoveryStyles.recoverBtn} onClick={onAction}>{actionLabel}</button>}
    </div>
  );
}

function WeeklyStat({ label, value, warn }) {
  return (
    <div style={{ textAlign: "center", padding: "10px 0" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: warn ? "#993C1D" : "#1a1a18" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{label}</div>
    </div>
  );
}

const recoveryStyles = {
  page: { padding: "28px 32px", fontFamily: "'DM Sans',sans-serif", maxWidth: 900 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 700, color: "#1a1a18", margin: 0 },
  sub: { fontSize: 13, color: "#aaa", marginTop: 3 },
  alertBar: { display: "flex", alignItems: "center", gap: 10, background: "#FAECE7", border: "0.5px solid #F5C4B3", borderRadius: 9, padding: "11px 16px", marginBottom: 14, fontSize: 13, color: "#712B13" },
  reportCard: { background: "#fff", border: "0.5px solid rgba(0,0,0,0.09)", borderRadius: 10, padding: "16px 18px", marginBottom: 18 },
  aiBadge: { display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 20, background: "#E1F5EE", color: "#085041", fontSize: 12, fontWeight: 600, border: "0.5px solid #9FE1CB" },
  weeklyGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, borderTop: "0.5px solid rgba(0,0,0,0.08)", borderLeft: "0.5px solid rgba(0,0,0,0.08)", marginTop: 14, borderRadius: 8, overflow: "hidden" },
  reportOutput: { marginTop: 14, padding: "12px 14px", background: "#f8f7f4", borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.08)" },
  tabs: { display: "flex", gap: 0, borderBottom: "0.5px solid rgba(0,0,0,0.09)", marginBottom: 16, flexWrap: "wrap" },
  tab: { display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#888", borderBottom: "2px solid transparent", marginBottom: -1 },
  tabActive: { color: "#1D9E75", fontWeight: 600, borderBottomColor: "#1D9E75" },
  tabBadge: { fontSize: 11, padding: "2px 7px", borderRadius: 20, fontWeight: 500, background: "#FAECE7", color: "#712B13" },
  list: { border: "0.5px solid rgba(0,0,0,0.09)", borderRadius: 10, overflow: "hidden" },
  row: { display: "flex", alignItems: "center", gap: 11, padding: "12px 16px", background: "#fff", borderBottom: "0.5px solid rgba(0,0,0,0.06)" },
  avatar: { width: 32, height: 32, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#0F6E56", flexShrink: 0 },
  rowName: { fontSize: 13, fontWeight: 500, color: "#1a1a18", cursor: "pointer" },
  rowSub: { fontSize: 12, color: "#aaa", marginTop: 2 },
  recoverBtn: { display: "flex", alignItems: "center", gap: 5, padding: "6px 11px", border: "0.5px solid #1D9E75", borderRadius: 7, background: "transparent", cursor: "pointer", fontSize: 12, color: "#1D9E75" },
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "none", borderRadius: 8, background: "#1D9E75", cursor: "pointer", fontSize: 13, color: "#fff", fontWeight: 500 },
  empty: { textAlign: "center", padding: "50px 0", color: "#bbb", fontSize: 14 },
  goodState: { textAlign: "center", padding: "60px 0", color: "#aaa", fontSize: 14 },
};
