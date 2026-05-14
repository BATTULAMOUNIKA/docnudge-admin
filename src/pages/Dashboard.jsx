import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getClinics, getPatients, getReminderLogs, getVisitsByClinic } from "../api";

function todayLabel() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function routePrefix() {
  return window.location.pathname.startsWith("/doctor") ? "/doctor" : "";
}

export default function Dashboard({ clinicId: initialClinicId }) {
  const navigate = useNavigate();
  const [clinic, setClinic] = useState(null);
  const [patients, setPatients] = useState([]);
  const [queue, setQueue] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [initialClinicId]);

  async function load() {
    setLoading(true);
    try {
      const clinicsResponse = await getClinics();
      const activeClinic = clinicsResponse.data.find((item) => String(item.id) === String(initialClinicId)) || clinicsResponse.data[0];
      if (!activeClinic) return;
      setClinic(activeClinic);
      const [patientsResponse, visits, logResponse] = await Promise.all([
        getPatients(activeClinic.id),
        getVisitsByClinic(activeClinic.id).catch(() => []),
        getReminderLogs(activeClinic.id).catch(() => ({ data: [] })),
      ]);
      setPatients(patientsResponse.data || []);
      setQueue(Array.isArray(visits) ? visits : []);
      setLogs(logResponse.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const failed = logs.filter((row) => Array.isArray(row) ? !row[0]?.success : !row.success).length;
    return [
      { label: "Total patients", value: patients.length, hint: "Registered", icon: "ti-users", color: "#1D9E75", bg: "#E1F5EE" },
      { label: "Appointments", value: queue.length, hint: "Open the date view", icon: "ti-calendar-event", color: "#0C447C", bg: "#E6F1FB" },
      { label: "Recent patients", value: Math.min(patients.length, 5), hint: "Latest records", icon: "ti-user-heart", color: "#3B6D11", bg: "#EAF3DE" },
      { label: "Needs recovery", value: failed, hint: "Failed reminders", icon: "ti-alert-triangle", color: "#712B13", bg: "#FAECE7" },
    ];
  }, [patients, queue, logs]);

  const recentPatients = patients.slice(0, 5);
  const atRisk = patients.filter((patient) => patient.opted_out).slice(0, 4);
  const weekData = [patients.length, queue.length + 2, queue.length + 5, Math.max(queue.length - 1, 1), queue.length + 4, queue.length + 1, Math.max(queue.length - 2, 0)];
  const maxWeek = Math.max(...weekData, 1);

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div>
          <div style={styles.eyebrow}>Good morning, Doctor</div>
          <h1 style={styles.title}>{clinic?.name || "DocNudge Clinic"}</h1>
          <p style={styles.sub}>{todayLabel()} - Live clinic workspace</p>
        </div>
        <div style={styles.heroActions}>
          <span style={styles.openBadge}><span style={styles.openDot} /> Clinic open</span>
          <button style={styles.primaryBtn} onClick={() => navigate(`${routePrefix()}/patients/add`)}>
            <i className="ti ti-user-plus" /> New patient
          </button>
        </div>
      </section>

      <section style={styles.statsGrid}>
        {stats.map((stat) => (
          <div key={stat.label} style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: stat.bg, color: stat.color }}>
              <i className={`ti ${stat.icon}`} />
            </div>
            <div>
              <strong style={styles.statValue}>{loading ? "..." : stat.value}</strong>
              <div style={styles.statLabel}>{stat.label}</div>
              <div style={styles.statHint}>{stat.hint}</div>
            </div>
          </div>
        ))}
      </section>

      <section style={styles.mainGrid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Recent patients</h2>
              <p style={styles.cardSub}>Open a patient record or add a new patient from here.</p>
            </div>
            <button style={styles.softBtn} onClick={() => navigate(`${routePrefix()}/patients`)}><i className="ti ti-users" /> All patients</button>
          </div>

          <div style={styles.queueList}>
            {recentPatients.length === 0 ? (
              <div style={styles.empty}>No patients yet.</div>
            ) : (
              recentPatients.map((patient, index) => (
                <div key={patient.id || index} style={styles.queueRow}>
                  <div style={styles.token}>P{String(index + 1).padStart(2, "0")}</div>
                  <div style={styles.queueInfo}>
                    <strong>{patient.name || "Patient"}</strong>
                    <span>{patient.phone} - {patient.condition || "No condition set"}</span>
                  </div>
                  <Status status="active" />
                  <button style={styles.rowBtn} onClick={() => navigate(`${routePrefix()}/patients/${patient.id}`)}>
                    Open OP
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <aside style={styles.sideStack}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>This week</h2>
              <span style={styles.cardSub}>{weekData.reduce((sum, item) => sum + item, 0)} total</span>
            </div>
            <div style={styles.chart}>
              {weekData.map((value, index) => (
                <div key={index} style={styles.barCol}>
                  <span style={styles.barValue}>{value}</span>
                  <div style={styles.barWrap}>
                    <div style={{ ...styles.barFill, height: `${Math.max((value / maxWeek) * 100, 6)}%` }} />
                  </div>
                  <span style={styles.barDay}>{["M", "T", "W", "T", "F", "S", "S"][index]}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Recovery alerts</h2>
              <button style={styles.linkBtn} onClick={() => navigate(`${routePrefix()}/recovery`)}>View all</button>
            </div>
            {atRisk.length === 0 ? (
              <div style={styles.emptySmall}>No opted-out patients. Nice and quiet.</div>
            ) : (
              atRisk.map((patient) => (
                <div key={patient.id} style={styles.alertRow}>
                  <div style={styles.avatar}>{patient.name?.[0] || "P"}</div>
                  <div style={styles.queueInfo}>
                    <strong>{patient.name}</strong>
                    <span>{patient.condition || "Follow-up"} - opted out</span>
                  </div>
                  <a style={styles.whatsappBtn} href={`https://wa.me/91${patient.phone}`} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                </div>
              ))
            )}
          </div>

          <div style={styles.card}>
            <h2 style={{ ...styles.cardTitle, marginBottom: 12 }}>Recent patients</h2>
            {recentPatients.map((patient) => (
              <button key={patient.id} style={styles.recentRow} onClick={() => navigate(`${routePrefix()}/patients/${patient.id}`)}>
                <div style={styles.avatar}>{patient.name?.[0] || "P"}</div>
                <div style={styles.queueInfo}>
                  <strong>{patient.name}</strong>
                  <span>{patient.phone} - {patient.condition || "No condition"}</span>
                </div>
                <i className="ti ti-chevron-right" />
              </button>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}

function Status({ status }) {
  const normalized = status || "upcoming";
  const palette = normalized === "completed"
    ? ["#EAF3DE", "#3B6D11"]
    : normalized === "missed"
      ? ["#FAECE7", "#712B13"]
      : ["#E6F1FB", "#0C447C"];
  return <span style={{ ...styles.status, background: palette[0], color: palette[1] }}>{normalized}</span>;
}

const styles = {
  page: { padding: "28px 32px", fontFamily: "'DM Sans', sans-serif", color: "#1a1a18" },
  hero: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, padding: 22, background: "linear-gradient(135deg,#fff,#F1FBF7)", border: "0.5px solid rgba(0,0,0,0.08)", borderRadius: 14, marginBottom: 16 },
  eyebrow: { fontSize: 13, color: "#0F6E56", fontWeight: 600, marginBottom: 4 },
  title: { margin: 0, fontSize: 26, lineHeight: 1.1, fontWeight: 700 },
  sub: { margin: "6px 0 0", fontSize: 13, color: "#888" },
  heroActions: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  openBadge: { display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 20, background: "#fff", border: "0.5px solid #9FE1CB", color: "#085041", fontSize: 12, fontWeight: 600 },
  openDot: { width: 8, height: 8, borderRadius: "50%", background: "#1D9E75" },
  primaryBtn: { display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 14px", borderRadius: 9, border: "none", background: "#1D9E75", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  softBtn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.12)", background: "#fff", color: "#555", fontSize: 12, cursor: "pointer" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 16 },
  statCard: { display: "flex", alignItems: "center", gap: 13, padding: 16, background: "#fff", border: "0.5px solid rgba(0,0,0,0.08)", borderRadius: 12 },
  statIcon: { width: 42, height: 42, borderRadius: 11, display: "grid", placeItems: "center", fontSize: 20, flexShrink: 0 },
  statValue: { display: "block", fontSize: 22, lineHeight: 1, marginBottom: 4 },
  statLabel: { fontSize: 12, color: "#555", fontWeight: 600 },
  statHint: { fontSize: 11, color: "#aaa", marginTop: 2 },
  mainGrid: { display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 16 },
  sideStack: { display: "flex", flexDirection: "column", gap: 16 },
  card: { background: "#fff", border: "0.5px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 16 },
  cardHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 },
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 700 },
  cardSub: { margin: "3px 0 0", fontSize: 12, color: "#aaa" },
  tabs: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 },
  tab: { padding: "6px 10px", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.08)", background: "#f8f7f4", color: "#777", fontSize: 12, textTransform: "capitalize", cursor: "pointer" },
  tabActive: { background: "#E1F5EE", color: "#085041", borderColor: "#9FE1CB", fontWeight: 600 },
  queueList: { display: "flex", flexDirection: "column" },
  queueRow: { display: "grid", gridTemplateColumns: "52px minmax(0,1fr) auto auto", alignItems: "center", gap: 12, padding: "12px 0", borderTop: "0.5px solid rgba(0,0,0,0.06)" },
  token: { width: 42, height: 32, borderRadius: 9, background: "#f1f0ed", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, color: "#555" },
  queueInfo: { minWidth: 0 },
  status: { borderRadius: 20, padding: "4px 9px", fontSize: 11, textTransform: "capitalize", whiteSpace: "nowrap" },
  rowBtn: { padding: "7px 10px", borderRadius: 8, border: "0.5px solid #1D9E75", background: "transparent", color: "#1D9E75", fontSize: 12, cursor: "pointer" },
  empty: { padding: 36, color: "#aaa", textAlign: "center", fontSize: 13 },
  emptySmall: { padding: "10px 0", color: "#aaa", fontSize: 13 },
  chart: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8, height: 180, alignItems: "end" },
  barCol: { height: "100%", display: "grid", gridTemplateRows: "22px 1fr 18px", alignItems: "end", textAlign: "center" },
  barValue: { fontSize: 11, color: "#888" },
  barWrap: { height: "100%", borderRadius: 999, background: "#f1f0ed", overflow: "hidden", display: "flex", alignItems: "end" },
  barFill: { width: "100%", background: "linear-gradient(180deg,#1D9E75,#8FD9C1)", borderRadius: 999 },
  barDay: { fontSize: 11, color: "#aaa", marginTop: 5 },
  linkBtn: { color: "#1D9E75", background: "transparent", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 },
  alertRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "0.5px solid rgba(0,0,0,0.06)" },
  avatar: { width: 34, height: 34, borderRadius: "50%", background: "#E1F5EE", color: "#0F6E56", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  whatsappBtn: { padding: "5px 8px", borderRadius: 7, border: "0.5px solid #9FE1CB", color: "#085041", fontSize: 11, textDecoration: "none" },
  recentRow: { width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 0", border: "none", borderTop: "0.5px solid rgba(0,0,0,0.06)", background: "transparent", textAlign: "left", cursor: "pointer", color: "#444" },
};
