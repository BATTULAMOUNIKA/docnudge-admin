import { useState, useEffect } from "react";
import API from "../api";

export default function AdminPanel() {
  const [tab, setTab] = useState("clinics");
  const [clinics, setClinics] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddClinic, setShowAddClinic] = useState(false);
  const [editingClinic, setEditingClinic] = useState(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [credentialClinic, setCredentialClinic] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [clinicResponse, userResponse] = await Promise.all([API.get("/clinics"), API.get("/admin/users")]);
      setClinics(clinicResponse.data || []);
      setStaff(userResponse.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const paying = clinics.filter((clinic) => clinic.plan && clinic.plan !== "trial").length;
  const revenue = clinics.reduce((total, clinic) => total + (clinic.plan === "pro" ? 1999 : clinic.plan === "basic" ? 999 : 0), 0);
  const trial = clinics.filter((clinic) => clinic.plan === "trial" || !clinic.plan).length;
  const inactive = clinics.filter((clinic) => clinic.status === "inactive").length;

  async function handleDeleteClinic(clinic) {
    if (!window.confirm(`Delete ${clinic.name}? Clinics with patients, staff, or appointments cannot be deleted.`)) return;
    try {
      await API.delete(`/clinics/${clinic.id}`);
      loadAll();
    } catch (error) {
      alert(error.response?.data?.detail || "Could not delete clinic");
    }
  }

  return (
    <div style={adminStyles.page}>
      <div style={adminStyles.header}>
        <div>
          <h1 style={adminStyles.title}>Clinics</h1>
          <p style={adminStyles.sub}>Manage clinic locations, staff accounts and billing across DocNudge</p>
        </div>
        <button style={adminStyles.btnPrimary} onClick={() => setShowAddClinic(true)}>
          <i className="ti ti-plus" style={{ fontSize: 14 }} /> Add clinic
        </button>
      </div>

      <div style={adminStyles.statsGrid}>
        <StatCard label="Total clinics" value={clinics.length} icon="ti-building" color="#0C447C" bg="#E6F1FB" />
        <StatCard label="Paying clinics" value={paying} icon="ti-check-circle" color="#085041" bg="#E1F5EE" />
        <StatCard label="Staff accounts" value={staff.length} icon="ti-users" color="#444441" bg="#F1EFE8" />
        <StatCard label="Monthly revenue" value={`Rs ${revenue.toLocaleString("en-IN")}`} icon="ti-currency-rupee" color="#085041" bg="#E1F5EE" />
      </div>

      <div style={adminStyles.tabs}>
        {[["clinics", "All clinics"], ["staff", "Staff accounts"], ["billing", "Billing"]].map(([key, label]) => (
          <button key={key} style={{ ...adminStyles.tab, ...(tab === key ? adminStyles.tabActive : {}) }} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "clinics" && (
        <div style={adminStyles.tableCard}>
          <table style={adminStyles.table}>
            <thead>
              <tr>
                <Header>Clinic</Header>
                <Header>Plan</Header>
                <Header>Patients</Header>
                <Header>Staff</Header>
                <Header>Status</Header>
                <Header>Joined</Header>
                <Header>Actions</Header>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={adminStyles.emptyCell}>Loading...</td></tr>
              ) : clinics.length === 0 ? (
                <tr><td colSpan={7} style={adminStyles.emptyCell}>No clinics yet.</td></tr>
              ) : (
                clinics.map((clinic) => (
                  <tr key={clinic.id}>
                    <Cell>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={adminStyles.avatar}>{clinic.name?.slice(0, 2).toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight: 500, color: "#1a1a18", fontSize: 13 }}>{clinic.name}</div>
                          <div style={{ fontSize: 11, color: "#aaa" }}>{clinic.city || "-"}</div>
                        </div>
                      </div>
                    </Cell>
                    <Cell><PlanBadge plan={clinic.plan} /></Cell>
                    <Cell>{clinic.patient_count || 0}</Cell>
                    <Cell>{staff.filter((user) => user.clinic_id === clinic.id).length}</Cell>
                    <Cell><StatusBadge status={clinic.status} /></Cell>
                    <Cell>{clinic.created_at?.slice(0, 10) || "-"}</Cell>
                    <Cell>
                      <div style={adminStyles.actions}>
                        <button style={adminStyles.btn} onClick={() => setEditingClinic(clinic)}><i className="ti ti-pencil" /> Edit</button>
                        <button style={adminStyles.btn} onClick={() => { setCredentialClinic(clinic); setTab("staff"); }}><i className="ti ti-key" /> Login</button>
                        <button style={adminStyles.dangerBtn} onClick={() => handleDeleteClinic(clinic)}><i className="ti ti-trash" /></button>
                      </div>
                    </Cell>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "staff" && (
        <div style={adminStyles.tableCard}>
          <div style={adminStyles.credentialGuide}>
            <div>
              <strong>Create clinic credentials</strong>
              <span>Choose a clinic, enter the doctor's email and temporary password, then share the doctor login URL: www.docnudge.in/doctor/login</span>
            </div>
            <button style={adminStyles.btnPrimary} onClick={() => setShowAddStaff(true)}>
              <i className="ti ti-user-plus" style={{ fontSize: 14 }} /> Add staff account
            </button>
          </div>
          <table style={adminStyles.table}>
            <thead>
              <tr>
                <Header>Name / email</Header>
                <Header>Role</Header>
                <Header>Clinic</Header>
                <Header>Created</Header>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={adminStyles.emptyCell}>Loading...</td></tr>
              ) : staff.length === 0 ? (
                <tr><td colSpan={4} style={adminStyles.emptyCell}>No staff accounts yet.</td></tr>
              ) : (
                staff.map((user) => (
                  <tr key={user.id}>
                    <Cell>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={adminStyles.avatar}>{user.email?.slice(0, 2).toUpperCase()}</div>
                        <span style={{ fontWeight: 500, color: "#1a1a18" }}>{user.email}</span>
                      </div>
                    </Cell>
                    <Cell><span style={adminStyles.roleBadge}>{user.role || "receptionist"}</span></Cell>
                    <Cell>{clinics.find((clinic) => clinic.id === user.clinic_id)?.name || "-"}</Cell>
                    <Cell>{user.created_at?.slice(0, 10) || "-"}</Cell>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "billing" && (
        <>
          <div style={adminStyles.statsGrid}>
            <StatCard label="Total MRR" value={`Rs ${revenue.toLocaleString("en-IN")}`} icon="ti-trending-up" color="#085041" bg="#E1F5EE" />
            <StatCard label="Trial clinics" value={trial} icon="ti-clock" color="#633806" bg="#FAEEDA" />
            <StatCard label="Inactive" value={inactive} icon="ti-x-circle" color="#712B13" bg="#FAECE7" />
            <StatCard label="Infra cost" value="Rs 670" icon="ti-server" color="#444441" bg="#F1EFE8" />
          </div>
          <div style={adminStyles.tableCard}>
            <table style={adminStyles.table}>
              <thead>
                <tr>
                  <Header>Clinic</Header>
                  <Header>Plan</Header>
                  <Header>Amount</Header>
                  <Header>Status</Header>
                </tr>
              </thead>
              <tbody>
                {clinics.map((clinic) => (
                  <tr key={clinic.id}>
                    <Cell><strong>{clinic.name}</strong></Cell>
                    <Cell><PlanBadge plan={clinic.plan} /></Cell>
                    <Cell>{clinic.plan === "pro" ? "Rs 1,999" : clinic.plan === "basic" ? "Rs 999" : "-"}</Cell>
                    <Cell><StatusBadge status={clinic.status} /></Cell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showAddClinic && <AddClinicModal onClose={() => setShowAddClinic(false)} onSave={() => { setShowAddClinic(false); loadAll(); }} />}
      {editingClinic && <AddClinicModal clinic={editingClinic} onClose={() => setEditingClinic(null)} onSave={() => { setEditingClinic(null); loadAll(); }} />}
      {showAddStaff && <AddStaffModal clinics={clinics} onClose={() => setShowAddStaff(false)} onSave={() => { setShowAddStaff(false); loadAll(); }} />}
      {credentialClinic && <AddStaffModal clinics={clinics} clinic={credentialClinic} onClose={() => setCredentialClinic(null)} onSave={() => { setCredentialClinic(null); loadAll(); }} />}
    </div>
  );
}

function AddClinicModal({ clinic, onClose, onSave }) {
  const [form, setForm] = useState({
    name: clinic?.name || "",
    city: clinic?.city || "Hyderabad",
    plan: clinic?.plan || clinic?.subscription_plan || "trial",
    doctor_name: clinic?.doctor_name || "",
    designation: clinic?.designation || "",
    phone: clinic?.phone || "",
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
      <Field label="Clinic name"><input style={adminStyles.input} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} autoFocus /></Field>
      <Field label="City"><input style={adminStyles.input} value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} /></Field>
      <Field label="Doctor name"><input style={adminStyles.input} value={form.doctor_name} onChange={(event) => setForm((current) => ({ ...current, doctor_name: event.target.value }))} /></Field>
      <Field label="Designation"><input style={adminStyles.input} value={form.designation} onChange={(event) => setForm((current) => ({ ...current, designation: event.target.value }))} /></Field>
      <Field label="Phone"><input style={adminStyles.input} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></Field>
      <Field label="Address"><input style={adminStyles.input} value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} /></Field>
      <Field label="Plan">
        <select style={adminStyles.input} value={form.plan} onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value }))}>
          <option value="trial">30-day trial</option>
          <option value="basic">Basic - Rs 999/month</option>
          <option value="pro">Pro - Rs 1,999/month</option>
        </select>
      </Field>
      <Footer onClose={onClose} onSave={submit} saving={saving} label={isEdit ? "Save clinic" : "Create clinic"} />
    </Modal>
  );
}

function AddStaffModal({ clinics, clinic, onClose, onSave }) {
  const [form, setForm] = useState({ email: "", password: "", role: "admin", clinic_id: clinic?.id ? String(clinic.id) : "" });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.email || !form.password || !form.clinic_id) {
      alert("All fields required");
      return;
    }
    setSaving(true);
    try {
      await API.post("/admin/users", { ...form, clinic_id: Number(form.clinic_id) });
      onSave();
    } catch {
      alert("Error creating staff account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={clinic ? `Create login for ${clinic.name}` : "Add staff account"} onClose={onClose}>
      <div style={adminStyles.loginHelp}>
        Doctor login URL: <strong>www.docnudge.in/doctor/login</strong>
      </div>
      <Field label="Email"><input type="email" style={adminStyles.input} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} autoFocus /></Field>
      <Field label="Password"><input type="password" style={adminStyles.input} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /></Field>
      <Field label="Role">
        <select style={adminStyles.input} value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
          <option value="admin">Admin / Doctor</option>
          <option value="receptionist">Receptionist</option>
        </select>
      </Field>
      <Field label="Assign to clinic">
        <select style={adminStyles.input} value={form.clinic_id} onChange={(event) => setForm((current) => ({ ...current, clinic_id: event.target.value }))}>
          <option value="">Select clinic...</option>
          {clinics.map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}
        </select>
      </Field>
      <Footer onClose={onClose} onSave={submit} saving={saving} label="Create account" />
    </Modal>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={adminStyles.overlay}>
      <div style={adminStyles.modal}>
        <div style={adminStyles.modalHeader}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a18" }}>{title}</span>
          <button style={adminStyles.closeBtn} onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div style={{ padding: "18px 20px 20px" }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div style={{ marginBottom: 13 }}><label style={adminStyles.label}>{label}</label>{children}</div>;
}

function Footer({ onClose, onSave, saving, label = "Save" }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
      <button style={adminStyles.btn} onClick={onClose}>Cancel</button>
      <button style={adminStyles.btnPrimary} onClick={onSave} disabled={saving}>{saving ? "Saving..." : label}</button>
    </div>
  );
}

function StatCard({ label, value, icon, color, bg }) {
  return (
    <div style={adminStyles.statCard}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 18, color }} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a18" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function PlanBadge({ plan }) {
  const map = {
    pro: ["#E6F1FB", "#0C447C", "Pro Rs 1,999"],
    basic: ["#F1EFE8", "#444441", "Basic Rs 999"],
    trial: ["#FAEEDA", "#633806", "Trial"],
  };
  const [bg, color, label] = map[plan] || ["#F1EFE8", "#aaa", "No plan"];
  return <span style={{ ...adminStyles.badge, background: bg, color }}>{label}</span>;
}

function StatusBadge({ status }) {
  if (!status || status === "active") return <span style={{ ...adminStyles.badge, background: "#E1F5EE", color: "#085041" }}>Active</span>;
  if (status === "trial") return <span style={{ ...adminStyles.badge, background: "#FAEEDA", color: "#633806" }}>Trial</span>;
  return <span style={{ ...adminStyles.badge, background: "#FAECE7", color: "#712B13" }}>Inactive</span>;
}

function Header({ children }) {
  return <th style={adminStyles.headerCell}>{children}</th>;
}

function Cell({ children }) {
  return <td style={adminStyles.cell}>{children}</td>;
}

const adminStyles = {
  page: { padding: "28px 32px", fontFamily: "'DM Sans',sans-serif", maxWidth: 1100 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, color: "#1a1a18", margin: 0 },
  sub: { fontSize: 13, color: "#aaa", marginTop: 3 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 },
  statCard: { border: "0.5px solid rgba(0,0,0,0.09)", borderRadius: 10, padding: "14px 16px", background: "#fff" },
  tabs: { display: "flex", gap: 0, borderBottom: "0.5px solid rgba(0,0,0,0.09)", marginBottom: 18 },
  tab: { padding: "9px 16px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#888", borderBottom: "2px solid transparent", marginBottom: -1 },
  tabActive: { color: "#1D9E75", fontWeight: 600, borderBottomColor: "#1D9E75" },
  tableCard: { border: "0.5px solid rgba(0,0,0,0.09)", borderRadius: 10, overflow: "hidden", background: "#fff" },
  table: { width: "100%", borderCollapse: "collapse" },
  headerCell: { textAlign: "left", padding: "9px 14px", fontSize: 11, color: "#aaa", fontWeight: 500, background: "#f8f7f4", borderBottom: "0.5px solid rgba(0,0,0,0.08)" },
  cell: { padding: "11px 14px", borderBottom: "0.5px solid rgba(0,0,0,0.06)", fontSize: 13, color: "#444", verticalAlign: "middle" },
  emptyCell: { textAlign: "center", padding: 32, color: "#bbb", fontSize: 13 },
  avatar: { width: 30, height: 30, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#0F6E56", flexShrink: 0 },
  badge: { display: "inline-block", fontSize: 11, padding: "3px 9px", borderRadius: 20 },
  roleBadge: { display: "inline-block", fontSize: 11, padding: "3px 9px", borderRadius: 20, background: "#F1EFE8", color: "#444441" },
  btn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 13px", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: 13, color: "#444" },
  dangerBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, border: "0.5px solid #F5C4B3", borderRadius: 8, background: "#FAECE7", cursor: "pointer", fontSize: 13, color: "#712B13" },
  actions: { display: "flex", alignItems: "center", gap: 6 },
  credentialGuide: { padding: "13px 16px", borderBottom: "0.5px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#F8FBFA" },
  loginHelp: { marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "#E1F5EE", color: "#085041", fontSize: 12, lineHeight: 1.5 },
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "none", borderRadius: 8, background: "#1D9E75", cursor: "pointer", fontSize: 13, color: "#fff", fontWeight: 500 },
  input: { width: "100%", padding: "9px 11px", border: "0.5px solid rgba(0,0,0,0.15)", borderRadius: 7, fontSize: 13, background: "#fff", color: "#1a1a18", outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
  label: { fontSize: 12, color: "#888", marginBottom: 5, display: "block" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#fff", borderRadius: 12, width: "90%", maxWidth: 460, maxHeight: "90vh", overflow: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 20px", borderBottom: "0.5px solid rgba(0,0,0,0.09)" },
  closeBtn: { background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 18, display: "flex" },
};
