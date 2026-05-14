import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";

export default function AdminPanel() {
  const [clinics, setClinics] = useState([]);
  const [users, setUsers] = useState([]);
  const [demoRequests, setDemoRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [clinicResponse, userResponse, demoResponse] = await Promise.all([
        API.get("/clinics"),
        API.get("/admin/users"),
        API.get("/admin/demo-requests").catch(() => ({ data: [] })),
      ]);
      setClinics(clinicResponse.data || []);
      setUsers(userResponse.data || []);
      setDemoRequests(demoResponse.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const metrics = useMemo(() => {
    const payingClinics = clinics.filter((clinic) => (clinic.plan || clinic.subscription_plan) && (clinic.plan || clinic.subscription_plan) !== "trial").length;
    const monthlyRevenue = clinics.reduce((total, clinic) => total + planAmount(clinic.plan || clinic.subscription_plan), 0);
    const today = new Date().toISOString().slice(0, 10);
    const newTodayClinics = clinics.filter((clinic) => clinic.created_at?.slice(0, 10) === today).length;
    return {
      totalClinics: clinics.length,
      payingClinics,
      monthlyRevenue,
      newTodayClinics,
      demoRequests: demoRequests.length,
    };
  }, [clinics, demoRequests]);

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div>
          <div style={styles.eyebrow}>Admin dashboard</div>
          <h1 style={styles.heroTitle}>Clinic overview</h1>
          <p style={styles.heroCopy}>This dashboard now focuses only on clinic health, revenue, and demo demand. New clinic creation and doctor credentials live in Admin settings.</p>
        </div>
        <div style={styles.heroActions}>
          <button style={styles.secondaryBtn} onClick={loadAll}><i className="ti ti-refresh" /> Refresh</button>
          <Link to="/settings" style={styles.primaryBtn}><i className="ti ti-settings" /> Open admin settings</Link>
        </div>
      </section>

      <section style={styles.statGrid}>
        <StatCard label="All clinics" value={metrics.totalClinics} icon="ti-building-hospital" tone="blue" />
        <StatCard label="Monthly revenue" value={`Rs ${metrics.monthlyRevenue.toLocaleString("en-IN")}`} icon="ti-currency-rupee" tone="green" />
        <StatCard label="Paying clinics" value={metrics.payingClinics} icon="ti-circle-check" tone="teal" />
        <StatCard label="New today clinics" value={metrics.newTodayClinics} icon="ti-sparkles" tone="amber" />
        <StatCard label="Demo requests" value={metrics.demoRequests} icon="ti-mail-opened" tone="slate" />
      </section>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>Clinic list</h2>
            <p style={styles.cardCopy}>Every clinic stays visible here with plan status, patient volume, and doctor account count.</p>
          </div>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <Th>Clinic</Th>
                <Th>Plan</Th>
                <Th>Patients</Th>
                <Th>Doctors</Th>
                <Th>Status</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td style={styles.emptyCell} colSpan="6">Loading clinics...</td></tr>
              ) : clinics.length === 0 ? (
                <tr><td style={styles.emptyCell} colSpan="6">No clinics yet.</td></tr>
              ) : (
                clinics.map((clinic) => {
                  const doctorCount = users.filter((user) => user.clinic_id === clinic.id && user.role === "doctor").length;
                  return (
                    <tr key={clinic.id}>
                      <td style={styles.td}>
                        <div style={styles.clinicCell}>
                          <div style={styles.avatar}>{clinic.name?.slice(0, 2).toUpperCase() || "CL"}</div>
                          <div>
                            <strong>{clinic.name}</strong>
                            <div style={styles.cellMeta}>{clinic.city || "City not set"}</div>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}><PlanBadge plan={clinic.plan || clinic.subscription_plan} /></td>
                      <td style={styles.td}>{clinic.patient_count || 0}</td>
                      <td style={styles.td}>{doctorCount}</td>
                      <td style={styles.td}><StatusBadge status={clinic.status} /></td>
                      <td style={styles.td}>{clinic.created_at?.slice(0, 10) || "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>Demo requests</h2>
            <p style={styles.cardCopy}>Incoming interest from the landing page stays visible here without mixing staff management into the dashboard.</p>
          </div>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <Th>Contact</Th>
                <Th>Clinic</Th>
                <Th>Role</Th>
                <Th>City</Th>
                <Th>Submitted</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td style={styles.emptyCell} colSpan="5">Loading demo requests...</td></tr>
              ) : demoRequests.length === 0 ? (
                <tr><td style={styles.emptyCell} colSpan="5">No demo requests yet.</td></tr>
              ) : (
                demoRequests.map((request) => (
                  <tr key={request.id}>
                    <td style={styles.td}>
                      <strong>{request.name}</strong>
                      <div style={styles.cellMeta}>{request.email} · {request.phone}</div>
                    </td>
                    <td style={styles.td}>{request.clinic}</td>
                    <td style={styles.td}>{request.role}</td>
                    <td style={styles.td}>{request.city || "-"}</td>
                    <td style={styles.td}>{formatDateTime(request.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function planAmount(plan) {
  if (plan === "pro") return 1999;
  if (plan === "basic") return 999;
  return 0;
}

function StatCard({ label, value, icon, tone }) {
  const palette = {
    blue: ["#eef5ff", "#0c447c"],
    green: ["#eefbf3", "#15803d"],
    teal: ["#e5fbf7", "#0d9488"],
    amber: ["#fff4e8", "#b45309"],
    slate: ["#f2f5fb", "#475569"],
  }[tone];
  return (
    <article style={styles.statCard}>
      <div style={{ ...styles.statIcon, background: palette[0], color: palette[1] }}>
        <i className={`ti ${icon}`} />
      </div>
      <strong style={styles.statValue}>{value}</strong>
      <span style={styles.statLabel}>{label}</span>
    </article>
  );
}

function PlanBadge({ plan }) {
  const map = {
    pro: ["#eefbf3", "#15803d", "Pro"],
    basic: ["#fff4e8", "#b45309", "Basic"],
    trial: ["#eef5ff", "#0c447c", "Trial"],
  };
  const [bg, color, label] = map[plan] || ["#f2f5fb", "#475569", "No plan"];
  return <span style={{ ...styles.pill, background: bg, color }}>{label}</span>;
}

function StatusBadge({ status }) {
  if (!status || status === "active") return <span style={{ ...styles.pill, background: "#eefbf3", color: "#15803d" }}>Active</span>;
  if (status === "trial") return <span style={{ ...styles.pill, background: "#eef5ff", color: "#0c447c" }}>Trial</span>;
  return <span style={{ ...styles.pill, background: "#fff0ef", color: "#b83b2e" }}>Inactive</span>;
}

function Th({ children }) {
  return <th style={styles.th}>{children}</th>;
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const styles = {
  page: { padding: "28px 30px 38px", minHeight: "100vh", background: "radial-gradient(circle at top left,#eef5ff 0%,#f7faff 35%,#fbf9f3 100%)", fontFamily: "'DM Sans', sans-serif", color: "#11243a" },
  hero: { display: "flex", justifyContent: "space-between", gap: 18, alignItems: "center", padding: "24px 26px", borderRadius: 28, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(12,68,124,0.08)", boxShadow: "0 18px 40px rgba(15,23,42,0.06)", marginBottom: 18 },
  eyebrow: { fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#0d9488", fontWeight: 700, marginBottom: 8 },
  heroTitle: { margin: 0, fontSize: 30, lineHeight: 1.08, fontWeight: 800 },
  heroCopy: { margin: "8px 0 0", fontSize: 14, color: "#708092", maxWidth: 740, lineHeight: 1.6 },
  heroActions: { display: "flex", gap: 10, flexWrap: "wrap" },
  primaryBtn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 16px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#0c447c,#0d9488)", color: "#fff", fontWeight: 800, cursor: "pointer", textDecoration: "none" },
  secondaryBtn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 16px", borderRadius: 14, border: "1px solid rgba(12,68,124,0.12)", background: "#fff", color: "#0c447c", fontWeight: 700, cursor: "pointer" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 14, marginBottom: 18 },
  statCard: { borderRadius: 22, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(12,68,124,0.08)", boxShadow: "0 18px 40px rgba(15,23,42,0.06)", padding: 18, display: "grid", gap: 8 },
  statIcon: { width: 44, height: 44, borderRadius: 16, display: "grid", placeItems: "center", fontSize: 19 },
  statValue: { fontSize: 24, lineHeight: 1, color: "#11243a" },
  statLabel: { fontSize: 13, color: "#516577", fontWeight: 700 },
  card: { background: "rgba(255,255,255,0.92)", border: "1px solid rgba(12,68,124,0.08)", borderRadius: 24, padding: 20, boxShadow: "0 18px 40px rgba(15,23,42,0.06)", marginBottom: 18 },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 },
  cardTitle: { margin: 0, fontSize: 18, fontWeight: 800 },
  cardCopy: { margin: "5px 0 0", color: "#708092", fontSize: 13, lineHeight: 1.6 },
  tableWrap: { overflow: "auto", borderRadius: 18, border: "1px solid rgba(12,68,124,0.08)" },
  table: { width: "100%", minWidth: 860, borderCollapse: "collapse", background: "#fff" },
  th: { padding: "14px 16px", background: "#f7fbff", color: "#708092", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid rgba(12,68,124,0.08)", textAlign: "left" },
  td: { padding: "14px 16px", borderBottom: "1px solid rgba(12,68,124,0.06)", fontSize: 13, color: "#31475a", verticalAlign: "middle" },
  emptyCell: { padding: 46, color: "#708092", textAlign: "center" },
  clinicCell: { display: "flex", alignItems: "center", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 12, background: "linear-gradient(135deg,#0c447c,#0d9488)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 12 },
  cellMeta: { marginTop: 3, fontSize: 12, color: "#708092" },
  pill: { display: "inline-block", padding: "5px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800 },
};
