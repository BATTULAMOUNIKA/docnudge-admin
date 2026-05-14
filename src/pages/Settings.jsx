import { useEffect, useMemo, useState } from "react";
import API from "../api";

const SPECIALITY_OPTIONS = [
  "General Physician",
  "Pediatrics",
  "Gynecology",
  "Dermatology",
  "Orthopedics",
  "ENT",
  "Cardiology",
  "Diabetology",
  "Pulmonology",
  "Neurology",
  "Gastroenterology",
];

const TABS = [
  ["clinics", "Clinics"],
  ["doctors", "Doctor logins"],
  ["security", "Security"],
];

export default function Settings({ user }) {
  const [tab, setTab] = useState("clinics");
  const [clinics, setClinics] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [editingClinic, setEditingClinic] = useState(null);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState(null);

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

  const doctors = useMemo(() => users.filter((item) => item.role === "doctor"), [users]);

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div>
          <div style={styles.eyebrow}>Admin settings</div>
          <h1 style={styles.heroTitle}>Clinic setup and doctor access</h1>
          <p style={styles.heroCopy}>New clinics, doctor credentials, and multi-doctor clinic setup all live here now. The dashboard stays focused on overview metrics only.</p>
        </div>
      </section>

      <div style={styles.layout}>
        <aside style={styles.navCard}>
          {TABS.map(([key, label]) => (
            <button key={key} style={{ ...styles.navItem, ...(tab === key ? styles.navItemActive : {}) }} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </aside>

        <section style={styles.content}>
          {error && <div style={styles.errorBox}>{error}</div>}
          {tab === "clinics" && (
            <ClinicsPanel
              clinics={clinics}
              doctors={doctors}
              loading={loading}
              onAdd={() => setShowClinicModal(true)}
              onEdit={(clinic) => setEditingClinic(clinic)}
            />
          )}
          {tab === "doctors" && (
            <DoctorsPanel
              clinics={clinics}
              doctors={doctors}
              loading={loading}
              onAdd={(clinic) => {
                setSelectedClinic(clinic || null);
                setShowDoctorModal(true);
              }}
            />
          )}
          {tab === "security" && <AccountSettings user={user} />}
        </section>
      </div>

      {showClinicModal && <ClinicModal onClose={() => setShowClinicModal(false)} onSave={() => { setShowClinicModal(false); load(); }} />}
      {editingClinic && <ClinicModal clinic={editingClinic} onClose={() => setEditingClinic(null)} onSave={() => { setEditingClinic(null); load(); }} />}
      {showDoctorModal && <DoctorModal clinics={clinics} clinic={selectedClinic} onClose={() => { setShowDoctorModal(false); setSelectedClinic(null); }} onSave={() => { setShowDoctorModal(false); setSelectedClinic(null); load(); }} />}
    </div>
  );
}

function ClinicsPanel({ clinics, doctors, loading, onAdd, onEdit }) {
  return (
    <article style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <h2 style={styles.panelTitle}>Clinic setup</h2>
          <p style={styles.panelCopy}>Create new clinics here and keep each clinic ready for one or more doctor logins.</p>
        </div>
        <button style={styles.primaryBtn} onClick={onAdd}><i className="ti ti-plus" /> Add clinic</button>
      </div>

      <div style={styles.gridCards}>
        {loading ? (
          <div style={styles.emptyState}>Loading clinics...</div>
        ) : clinics.length === 0 ? (
          <div style={styles.emptyState}>No clinics created yet.</div>
        ) : (
          clinics.map((clinic) => (
            <div key={clinic.id} style={styles.infoCard}>
              <div style={styles.infoTop}>
                <div>
                  <strong style={styles.infoTitle}>{clinic.name}</strong>
                  <div style={styles.infoMeta}>{clinic.city || "City not set"} · {doctors.filter((doctor) => doctor.clinic_id === clinic.id).length} doctor account(s)</div>
                </div>
                <button style={styles.smallBtn} onClick={() => onEdit(clinic)}>Edit</button>
              </div>
              <div style={styles.detailGrid}>
                <Detail label="Phone" value={clinic.phone || "Not set"} />
                <Detail label="Email" value={clinic.email || "Not set"} />
                <Detail label="Plan" value={(clinic.plan || clinic.subscription_plan || "trial").toUpperCase()} />
                <Detail label="Patients" value={String(clinic.patient_count || 0)} />
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function DoctorsPanel({ clinics, doctors, loading, onAdd }) {
  return (
    <article style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <h2 style={styles.panelTitle}>Doctor logins</h2>
          <p style={styles.panelCopy}>Add multiple doctors under one clinic with different specialties and separate credentials.</p>
        </div>
        <button style={styles.primaryBtn} onClick={() => onAdd(null)}><i className="ti ti-user-plus" /> Add doctor</button>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <Th>Doctor</Th>
              <Th>Specialty</Th>
              <Th>Clinic</Th>
              <Th>Email</Th>
              <Th align="right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td style={styles.emptyCell} colSpan="5">Loading doctor logins...</td></tr>
            ) : doctors.length === 0 ? (
              <tr><td style={styles.emptyCell} colSpan="5">No doctor accounts created yet.</td></tr>
            ) : (
              doctors.map((doctor) => (
                <tr key={doctor.id}>
                  <td style={styles.td}><strong>{doctor.name || "Doctor"}</strong></td>
                  <td style={styles.td}>{doctor.designation || "General Physician"}</td>
                  <td style={styles.td}>{clinics.find((clinic) => clinic.id === doctor.clinic_id)?.name || "-"}</td>
                  <td style={styles.td}>{doctor.email}</td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    <button style={styles.smallBtn} onClick={() => onAdd(clinics.find((clinic) => clinic.id === doctor.clinic_id) || null)}>Add another for clinic</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function AccountSettings({ user }) {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function changePassword() {
    if (!pw.current || !pw.next || !pw.confirm) {
      setError("Fill all password fields.");
      return;
    }
    if (pw.next !== pw.confirm) {
      setError("New password and confirm password do not match.");
      return;
    }
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await API.put("/auth/change-password", { current_password: pw.current, new_password: pw.next });
      setPw({ current: "", next: "", confirm: "" });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not change password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <h2 style={styles.panelTitle}>Admin password</h2>
          <p style={styles.panelCopy}>{user?.email || "Current account"}</p>
        </div>
        {saved && <span style={styles.savedPill}>Updated</span>}
      </div>

      <div style={styles.formGrid}>
        <Field label="Current password"><input style={styles.input} type="password" value={pw.current} onChange={(event) => setPw((current) => ({ ...current, current: event.target.value }))} /></Field>
        <Field label="New password"><input style={styles.input} type="password" value={pw.next} onChange={(event) => setPw((current) => ({ ...current, next: event.target.value }))} /></Field>
        <Field label="Confirm password"><input style={styles.input} type="password" value={pw.confirm} onChange={(event) => setPw((current) => ({ ...current, confirm: event.target.value }))} /></Field>
      </div>
      {error && <div style={styles.errorBox}>{error}</div>}
      <div style={styles.footer}>
        <button style={styles.primaryBtn} disabled={saving} onClick={changePassword}>
          {saving ? "Updating..." : "Update password"}
        </button>
      </div>
    </article>
  );
}

function ClinicModal({ clinic, onClose, onSave }) {
  const [form, setForm] = useState({
    name: clinic?.name || "",
    city: clinic?.city || "Hyderabad",
    plan: clinic?.plan || clinic?.subscription_plan || "trial",
    phone: clinic?.phone || "",
    email: clinic?.email || "",
    address: clinic?.address || "",
  });
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(clinic);

  async function submit() {
    if (!form.name.trim()) {
      alert("Clinic name required");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) await API.put(`/clinics/${clinic.id}`, form);
      else await API.post("/clinics", form);
      onSave();
    } catch (error) {
      alert(error.response?.data?.detail || "Error saving clinic");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit clinic" : "Add new clinic"} onClose={onClose}>
      <Field label="Clinic name"><input style={styles.input} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} autoFocus /></Field>
      <Field label="City"><input style={styles.input} value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} /></Field>
      <Field label="Phone"><input style={styles.input} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></Field>
      <Field label="Email"><input style={styles.input} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></Field>
      <Field label="Address"><input style={styles.input} value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} /></Field>
      <Field label="Plan">
        <select style={styles.input} value={form.plan} onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value }))}>
          <option value="trial">30-day trial</option>
          <option value="basic">Basic - Rs 999/month</option>
          <option value="pro">Pro - Rs 1,999/month</option>
        </select>
      </Field>
      <ModalFooter onClose={onClose} onSave={submit} saving={saving} label={isEdit ? "Save clinic" : "Create clinic"} />
    </Modal>
  );
}

function DoctorModal({ clinics, clinic, onClose, onSave }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    designation: clinic?.designation || SPECIALITY_OPTIONS[0],
    role: "doctor",
    clinic_id: clinic?.id ? String(clinic.id) : "",
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.name || !form.email || !form.password || !form.clinic_id) {
      alert("All fields are required");
      return;
    }
    setSaving(true);
    try {
      await API.post("/admin/users", {
        ...form,
        clinic_id: Number(form.clinic_id),
      });
      onSave();
    } catch (error) {
      alert(error.response?.data?.detail || "Error creating doctor account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={clinic ? `Add doctor for ${clinic.name}` : "Add doctor login"} onClose={onClose}>
      <div style={styles.infoStrip}>Each clinic can have multiple doctor accounts with different specialties.</div>
      <Field label="Doctor name"><input style={styles.input} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} autoFocus /></Field>
      <Field label="Doctor email"><input style={styles.input} type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></Field>
      <Field label="Temporary password"><input style={styles.input} type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /></Field>
      <Field label="Designation">
        <select style={styles.input} value={form.designation} onChange={(event) => setForm((current) => ({ ...current, designation: event.target.value }))}>
          {SPECIALITY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </Field>
      <Field label="Assign to clinic">
        <select style={styles.input} value={form.clinic_id} onChange={(event) => setForm((current) => ({ ...current, clinic_id: event.target.value }))}>
          <option value="">Select clinic...</option>
          {clinics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </Field>
      <ModalFooter onClose={onClose} onSave={submit} saving={saving} label="Create doctor login" />
    </Modal>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#11243a" }}>{title}</span>
          <button style={styles.closeBtn} onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div style={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ onClose, onSave, saving, label }) {
  return (
    <div style={styles.footer}>
      <button style={styles.ghostBtn} onClick={onClose}>Cancel</button>
      <button style={styles.primaryBtn} onClick={onSave} disabled={saving}>{saving ? "Saving..." : label}</button>
    </div>
  );
}

function Field({ label, children }) {
  return <label style={styles.field}><span>{label}</span>{children}</label>;
}

function Detail({ label, value }) {
  return <div style={styles.detailItem}><label>{label}</label><span>{value}</span></div>;
}

function Th({ children, align = "left" }) {
  return <th style={{ ...styles.th, textAlign: align }}>{children}</th>;
}

const styles = {
  page: { padding: "28px 30px 38px", minHeight: "100vh", background: "radial-gradient(circle at top left,#eef5ff 0%,#f7faff 35%,#fbf9f3 100%)", fontFamily: "'DM Sans', sans-serif", color: "#11243a" },
  hero: { padding: "24px 26px", borderRadius: 28, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(12,68,124,0.08)", boxShadow: "0 18px 40px rgba(15,23,42,0.06)", marginBottom: 18 },
  eyebrow: { fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#0d9488", fontWeight: 700, marginBottom: 8 },
  heroTitle: { margin: 0, fontSize: 30, lineHeight: 1.08, fontWeight: 800 },
  heroCopy: { margin: "8px 0 0", fontSize: 14, color: "#708092", maxWidth: 740, lineHeight: 1.6 },
  layout: { display: "grid", gridTemplateColumns: "240px minmax(0,1fr)", gap: 18 },
  navCard: { padding: 10, borderRadius: 24, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(12,68,124,0.08)", boxShadow: "0 18px 40px rgba(15,23,42,0.06)", height: "fit-content" },
  navItem: { width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 16, border: "none", background: "transparent", color: "#56697b", fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "left" },
  navItemActive: { background: "linear-gradient(135deg,#0c447c,#0d9488)", color: "#fff", boxShadow: "0 14px 28px rgba(12,68,124,0.18)" },
  content: { display: "grid", gap: 18 },
  panel: { borderRadius: 24, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(12,68,124,0.08)", boxShadow: "0 18px 40px rgba(15,23,42,0.06)", padding: 22 },
  panelHeader: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 18 },
  panelTitle: { margin: 0, fontSize: 20, fontWeight: 800 },
  panelCopy: { margin: "5px 0 0", fontSize: 13, color: "#708092", lineHeight: 1.6 },
  primaryBtn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 16px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#0c447c,#0d9488)", color: "#fff", fontWeight: 800, cursor: "pointer" },
  ghostBtn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 16px", borderRadius: 14, border: "1px solid rgba(12,68,124,0.12)", background: "#fff", color: "#0c447c", fontWeight: 700, cursor: "pointer" },
  smallBtn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 12, border: "1px solid rgba(12,68,124,0.12)", background: "#fff", color: "#0c447c", fontWeight: 700, cursor: "pointer" },
  gridCards: { display: "grid", gap: 14 },
  infoCard: { borderRadius: 18, border: "1px solid rgba(12,68,124,0.08)", background: "#fbfdff", padding: 16 },
  infoTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14 },
  infoTitle: { display: "block", fontSize: 16, color: "#11243a" },
  infoMeta: { marginTop: 4, fontSize: 12, color: "#708092" },
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 },
  detailItem: { display: "grid", gap: 4 },
  tableWrap: { overflow: "auto", borderRadius: 18, border: "1px solid rgba(12,68,124,0.08)" },
  table: { width: "100%", minWidth: 760, borderCollapse: "collapse", background: "#fff" },
  th: { padding: "14px 16px", background: "#f7fbff", color: "#708092", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid rgba(12,68,124,0.08)" },
  td: { padding: "14px 16px", borderBottom: "1px solid rgba(12,68,124,0.06)", fontSize: 13, color: "#31475a", verticalAlign: "middle" },
  emptyCell: { padding: 46, color: "#708092", textAlign: "center" },
  emptyState: { padding: "26px 0", color: "#708092" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14 },
  field: { display: "grid", gap: 7, color: "#526677", fontSize: 12, fontWeight: 800, textTransform: "uppercase" },
  input: { width: "100%", padding: "11px 12px", borderRadius: 14, border: "1px solid rgba(12,68,124,0.12)", background: "#fbfdff", color: "#11243a", outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
  savedPill: { padding: "7px 12px", borderRadius: 999, background: "#e5fbf7", color: "#0d9488", fontSize: 12, fontWeight: 800 },
  infoStrip: { marginBottom: 14, display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderRadius: 16, background: "#eef5fb", color: "#38536c", fontSize: 13 },
  errorBox: { marginTop: 0, padding: "11px 13px", borderRadius: 14, background: "#fff3f2", border: "1px solid rgba(184,59,46,0.12)", color: "#b83b2e", fontSize: 13 },
  footer: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 },
  overlay: { position: "fixed", inset: 0, background: "rgba(10,25,47,0.34)", display: "grid", placeItems: "center", padding: 20, zIndex: 1000 },
  modal: { width: "min(640px,100%)", borderRadius: 24, background: "#fff", border: "1px solid rgba(12,68,124,0.08)", boxShadow: "0 28px 60px rgba(15,23,42,0.16)" },
  modalHeader: { padding: "18px 22px", borderBottom: "1px solid rgba(12,68,124,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" },
  modalBody: { padding: 22, display: "grid", gap: 14 },
  closeBtn: { border: "none", background: "#f6f8fb", color: "#708092", width: 34, height: 34, borderRadius: 12, cursor: "pointer" },
};
