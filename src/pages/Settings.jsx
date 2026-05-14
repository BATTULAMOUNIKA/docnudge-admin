import { useEffect, useState } from "react";
import API from "../api";

const ADMIN_TABS = [
  ["clinics", "Clinics & staff", "ti-building-hospital"],
  ["reminders", "Reminders", "ti-bell"],
  ["whatsapp", "WhatsApp", "ti-brand-whatsapp"],
  ["account", "Security", "ti-lock"],
];

export default function Settings({ user }) {
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState(isAdmin ? "clinics" : "account");

  if (!isAdmin) {
    return (
      <div style={styles.page}>
        <PageTitle />
        <div style={styles.adminNotice}>
          <i className="ti ti-lock" /> Clinic credentials and automation settings are admin-only.
        </div>
        <AccountSettings user={user} />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.topbar}>
        <PageTitle />
        <div style={styles.adminBadge}><i className="ti ti-shield-check" /> Admin workspace</div>
      </header>

      <div style={styles.settingsLayout}>
        <aside style={styles.settingsNav}>
          {ADMIN_TABS.map(([key, label, icon]) => (
            <button key={key} style={{ ...styles.navItem, ...(tab === key ? styles.navActive : {}) }} onClick={() => setTab(key)}>
              <i className={`ti ${icon}`} />
              <span>{label}</span>
            </button>
          ))}
        </aside>

        <section style={styles.panelStack}>
          {tab === "clinics" && <ClinicAdminSettings />}
          {tab === "reminders" && <ReminderSettings />}
          {tab === "whatsapp" && <WhatsAppSettings />}
          {tab === "account" && <AccountSettings user={user} />}
        </section>
      </div>
    </div>
  );
}

function PageTitle() {
  return (
    <div style={styles.pageTitle}>
      <div style={styles.titleIcon}><i className="ti ti-settings" /></div>
      <div>
        <h1 style={styles.title}>Admin Settings</h1>
        <p style={styles.sub}>Manage clinic setup, reminders, WhatsApp configuration and login security.</p>
      </div>
    </div>
  );
}

function ClinicAdminSettings() {
  const [clinics, setClinics] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [clinicResponse, userResponse] = await Promise.all([
        API.get("/clinics"),
        API.get("/admin/users"),
      ]);
      setClinics(clinicResponse.data || []);
      setUsers(userResponse.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load admin settings.");
    } finally {
      setLoading(false);
    }
  }

  const doctors = users.filter((item) => item.role === "doctor");
  const staff = users.filter((item) => item.role !== "admin");

  return (
    <>
      <div style={styles.summaryGrid}>
        <SummaryTile label="Clinics" value={clinics.length} icon="ti-building-hospital" tone="purple" />
        <SummaryTile label="Doctors" value={doctors.length} icon="ti-stethoscope" tone="green" />
        <SummaryTile label="Staff users" value={staff.length} icon="ti-users" tone="blue" />
      </div>

      <Panel
        title="Clinics and staff credentials"
        copy="Review clinic setup and doctor access from the admin dashboard."
        action={<button style={styles.btnPurple} onClick={load}><i className="ti ti-refresh" /> Refresh</button>}
      >
        {error && <div style={styles.errorBox}>{error}</div>}
        {loading ? (
          <div style={styles.empty}>Loading clinics...</div>
        ) : clinics.length === 0 ? (
          <div style={styles.empty}>No clinics found.</div>
        ) : (
          <div style={styles.clinicCards}>
            {clinics.map((clinic) => {
              const clinicUsers = users.filter((item) => item.clinic_id === clinic.id);
              return <ClinicCard key={clinic.id} clinic={clinic} users={clinicUsers} />;
            })}
          </div>
        )}
      </Panel>
    </>
  );
}

function ClinicCard({ clinic, users }) {
  const doctors = users.filter((item) => item.role === "doctor");
  return (
    <article style={styles.clinicCard}>
      <div style={styles.clinicCardHeader}>
        <div style={styles.clinicInfo}>
          <div style={styles.clinicAvatar}>{initials(clinic.name || "DN")}</div>
          <div>
            <strong style={styles.clinicName}>{clinic.name || "DocNudge Clinic"}</strong>
            <span style={styles.clinicMeta}>{clinic.city || "City not set"} · {doctors.length} doctor{doctors.length === 1 ? "" : "s"}</span>
          </div>
        </div>
        <span style={styles.statusTag}>Active</span>
      </div>
      <div style={styles.clinicBody}>
        <div style={styles.detailGrid}>
          <Detail label="Clinic ID" value={clinic.id || "-"} />
          <Detail label="Phone" value={clinic.phone || "Not set"} />
          <Detail label="Plan" value={clinic.plan || "Trial"} />
        </div>
        <div style={styles.doctorsTitle}>Doctors and staff access</div>
        {users.length === 0 ? (
          <div style={styles.emptySmall}>No staff accounts linked.</div>
        ) : (
          <table style={styles.staffTable}>
            <thead>
              <tr>
                <th style={styles.staffTh}>Name</th>
                <th style={styles.staffTh}>Role</th>
                <th style={styles.staffTh}>Email</th>
                <th style={styles.staffTh}>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item.id || item.email}>
                  <td style={styles.staffTd}><span style={styles.docAvatar}>{initials(item.name || item.email || "DN")}</span>{item.name || "Staff user"}</td>
                  <td style={styles.staffTd}><span style={styles.specialistTag}>{item.role || "staff"}</span></td>
                  <td style={styles.staffTd}><span style={styles.credBox}>{item.email || "-"}</span></td>
                  <td style={styles.staffTd}><span style={styles.activeDot} />Active</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </article>
  );
}

function ReminderSettings() {
  const [form, setForm] = useState({ two_days_time: "10:00", day_before_time: "18:00", morning_time: "08:00", missed_days: 3 });
  const [saved, setSaved] = useState(false);

  async function save() {
    try {
      await API.put("/settings/reminders", form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("Error saving");
    }
  }

  return (
    <Panel title="Reminder schedule" copy="Control when DocNudge sends follow-up and visit reminders.">
      <div style={styles.formGrid}>
        <Field label="2 days before"><Input type="time" value={form.two_days_time} onChange={(v) => setForm((f) => ({ ...f, two_days_time: v }))} /></Field>
        <Field label="Day before"><Input type="time" value={form.day_before_time} onChange={(v) => setForm((f) => ({ ...f, day_before_time: v }))} /></Field>
        <Field label="Morning of visit"><Input type="time" value={form.morning_time} onChange={(v) => setForm((f) => ({ ...f, morning_time: v }))} /></Field>
        <Field label="Missed patient days"><Input type="number" min={1} max={14} value={form.missed_days} onChange={(v) => setForm((f) => ({ ...f, missed_days: Number(v) }))} /></Field>
      </div>
      <SaveBtn onClick={save} saved={saved} />
    </Panel>
  );
}

function WhatsAppSettings() {
  return (
    <Panel title="WhatsApp / Interakt" copy="Production WhatsApp credentials are handled through secure environment variables.">
      <div style={styles.integrationCard}>
        <div style={styles.integrationIcon}><i className="ti ti-brand-whatsapp" /></div>
        <div>
          <strong>Interakt API key</strong>
          <p>Configure `INTERAKT_API_KEY` in the backend environment. Keep the key out of the browser bundle.</p>
        </div>
      </div>
    </Panel>
  );
}

function AccountSettings({ user }) {
  const [pw, setPw] = useState({ current: "", new_: "", confirm: "" });
  const [saved, setSaved] = useState(false);

  async function changePassword() {
    if (pw.new_ !== pw.confirm) {
      alert("Passwords don't match");
      return;
    }
    try {
      await API.put("/auth/change-password", { current_password: pw.current, new_password: pw.new_ });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setPw({ current: "", new_: "", confirm: "" });
    } catch {
      alert("Error changing password");
    }
  }

  return (
    <Panel title="Login credentials" copy={user?.email || "Current user"}>
      <div style={styles.formGrid}>
        <Field label="Current password"><Input type="password" value={pw.current} onChange={(v) => setPw((p) => ({ ...p, current: v }))} /></Field>
        <Field label="New password"><Input type="password" value={pw.new_} onChange={(v) => setPw((p) => ({ ...p, new_: v }))} /></Field>
        <Field label="Confirm password"><Input type="password" value={pw.confirm} onChange={(v) => setPw((p) => ({ ...p, confirm: v }))} /></Field>
      </div>
      <SaveBtn onClick={changePassword} saved={saved} label="Update password" />
    </Panel>
  );
}

function Panel({ title, copy, action, children }) {
  return (
    <article style={styles.panelCard}>
      <div style={styles.panelHeader}>
        <div>
          <h2 style={styles.panelTitle}>{title}</h2>
          <p style={styles.panelCopy}>{copy}</p>
        </div>
        {action}
      </div>
      <div style={styles.panelBody}>{children}</div>
    </article>
  );
}

function SummaryTile({ label, value, icon, tone }) {
  const palette = {
    purple: ["#f5f3ff", "#7c3aed"],
    green: ["#f0fdf4", "#16a34a"],
    blue: ["#eff6ff", "#2563eb"],
  }[tone];
  return (
    <article style={styles.summaryTile}>
      <div style={{ ...styles.summaryIcon, background: palette[0], color: palette[1] }}><i className={`ti ${icon}`} /></div>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function Detail({ label, value }) {
  return <div style={styles.detailItem}><label>{label}</label><span>{value}</span></div>;
}

function Field({ label, children }) {
  return <label style={styles.field}><span>{label}</span>{children}</label>;
}

function Input({ value, onChange, ...props }) {
  return <input style={styles.input} value={value} onChange={(e) => onChange?.(e.target.value)} {...props} />;
}

function SaveBtn({ onClick, saved, label = "Save changes" }) {
  return <button style={styles.btnPurple} onClick={onClick}>{saved ? "Saved" : label}</button>;
}

function initials(value) {
  return String(value)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "DN";
}

const styles = {
  page: { padding: "24px 28px 34px", minHeight: "100vh", background: "#f4f6fb", fontFamily: "'DM Sans', sans-serif", color: "#1a2035" },
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 24 },
  pageTitle: { display: "flex", alignItems: "center", gap: 12 },
  titleIcon: { width: 42, height: 42, borderRadius: 12, background: "#f5f3ff", color: "#7c3aed", display: "grid", placeItems: "center", fontSize: 20 },
  title: { margin: 0, fontSize: 24, lineHeight: 1, fontWeight: 800 },
  sub: { margin: "6px 0 0", color: "#64748b", fontSize: 13 },
  adminBadge: { display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 13px", background: "#f5f3ff", border: "1px solid #ddd6fe", color: "#7c3aed", borderRadius: 999, fontSize: 12, fontWeight: 800 },
  settingsLayout: { display: "grid", gridTemplateColumns: "220px minmax(0,1fr)", gap: 24 },
  settingsNav: { background: "#fff", border: "1.5px solid #e8eaf0", borderRadius: 16, padding: 12, height: "fit-content", position: "sticky", top: 84 },
  navItem: { width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "none", borderRadius: 10, background: "transparent", color: "#64748b", fontSize: 14, fontWeight: 800, cursor: "pointer", textAlign: "left" },
  navActive: { background: "#f5f3ff", color: "#7c3aed" },
  panelStack: { display: "flex", flexDirection: "column", gap: 18, minWidth: 0 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14 },
  summaryTile: { background: "#fff", border: "1.5px solid #e8eaf0", borderRadius: 16, padding: 18 },
  summaryIcon: { width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", fontSize: 18, marginBottom: 12 },
  panelCard: { background: "#fff", border: "1.5px solid #e8eaf0", borderRadius: 16, overflow: "hidden" },
  panelHeader: { padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 },
  panelTitle: { margin: 0, fontSize: 18, fontWeight: 800 },
  panelCopy: { margin: "4px 0 0", color: "#64748b", fontSize: 13 },
  panelBody: { padding: 24 },
  btnPurple: { display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", border: "none", borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 14px rgba(124,58,237,0.24)" },
  clinicCards: { display: "flex", flexDirection: "column", gap: 16 },
  clinicCard: { border: "1.5px solid #e8eaf0", borderRadius: 14, overflow: "hidden" },
  clinicCardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 20px", background: "#fafafa", borderBottom: "1px solid #f1f5f9" },
  clinicInfo: { display: "flex", alignItems: "center", gap: 12 },
  clinicAvatar: { width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800 },
  clinicName: { display: "block", fontSize: 15, color: "#1a2035" },
  clinicMeta: { display: "block", marginTop: 3, color: "#64748b", fontSize: 12 },
  statusTag: { padding: "5px 11px", borderRadius: 999, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", fontSize: 12, fontWeight: 800 },
  clinicBody: { padding: "16px 20px" },
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, marginBottom: 18 },
  detailItem: { display: "grid", gap: 4 },
  doctorsTitle: { marginBottom: 12, color: "#94a3b8", textTransform: "uppercase", fontSize: 12, fontWeight: 800 },
  staffTable: { width: "100%", borderCollapse: "collapse" },
  staffTh: { padding: "9px 12px", background: "#f8fafc", color: "#94a3b8", textTransform: "uppercase", textAlign: "left", fontSize: 11, fontWeight: 800 },
  staffTd: { padding: "11px 12px", borderBottom: "1px solid #f8fafc", fontSize: 13, color: "#475569" },
  docAvatar: { width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#16a34a,#4ade80)", color: "#fff", display: "inline-grid", placeItems: "center", fontSize: 11, fontWeight: 800, marginRight: 8 },
  specialistTag: { display: "inline-block", padding: "4px 9px", borderRadius: 999, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", fontSize: 12, fontWeight: 800 },
  credBox: { display: "inline-flex", alignItems: "center", padding: "4px 8px", borderRadius: 6, background: "#f8fafc", border: "1px solid #e8eaf0", fontFamily: "monospace", fontSize: 12, color: "#475569" },
  activeDot: { width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block", marginRight: 6 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14, marginBottom: 16 },
  field: { display: "grid", gap: 7, color: "#64748b", fontSize: 12, fontWeight: 800, textTransform: "uppercase" },
  input: { width: "100%", padding: "10px 12px", border: "1.5px solid #e8eaf0", borderRadius: 10, background: "#f8fafc", color: "#1a2035", outline: "none", fontSize: 13, fontFamily: "inherit" },
  integrationCard: { display: "flex", alignItems: "flex-start", gap: 14, border: "1.5px solid #bbf7d0", background: "#f0fdf4", borderRadius: 14, padding: 16, color: "#14532d" },
  integrationIcon: { width: 42, height: 42, borderRadius: 12, background: "#16a34a", color: "#fff", display: "grid", placeItems: "center", fontSize: 20, flexShrink: 0 },
  adminNotice: { display: "inline-flex", alignItems: "center", gap: 7, background: "#FAEEDA", border: "0.5px solid #FAC775", color: "#633806", borderRadius: 8, padding: "9px 12px", fontSize: 12, margin: "18px 0" },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 13, fontWeight: 700 },
  empty: { textAlign: "center", color: "#94a3b8", padding: 34 },
  emptySmall: { color: "#94a3b8", fontSize: 13, padding: "8px 0" },
};
