import { useEffect, useMemo, useState } from "react";
import {
  clearPatientToken,
  createMyAppointment,
  downloadPrescriptionPdf,
  getEmergencyProfile,
  getMyAppointments,
  getMyLabReports,
  getMyPrescriptions,
  getMyVisits,
  getPatientProfile,
  loginWithPhone,
  getPatientToken,
  updatePatientProfile,
  uploadLabReport,
} from "./patientApi";
import "./PatientPortal.css";

const NAV = [
  { id: "dashboard", label: "Home", icon: "ti-home" },
  { id: "appointments", label: "Appointments", icon: "ti-calendar" },
  { id: "prescriptions", label: "Prescriptions", icon: "ti-prescription" },
  { id: "labs", label: "Lab Reports", icon: "ti-test-pipe" },
  { id: "emergency", label: "Emergency Card", icon: "ti-first-aid-kit", badge: "SOS" },
  { id: "profile", label: "My Profile", icon: "ti-user-circle" },
];

function firstName(name = "Patient") {
  return String(name).trim().split(/\s+/)[0] || "Patient";
}

function formatDate(value) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function asList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function linkedClinics(patient) {
  const raw = patient?.clinics || patient?.linked_clinics || patient?.clinic_memberships || [];
  if (Array.isArray(raw) && raw.length) {
    return raw.map((clinic) => (typeof clinic === "string" ? { name: clinic } : clinic)).filter((clinic) => clinic?.name);
  }
  return patient?.clinic ? [{ name: patient.clinic, doctor_name: patient.doctor_name, speciality: patient.speciality }] : [];
}

export default function PatientPortalApp() {
  const [patient, setPatient] = useState(null);
  const [data, setData] = useState({ visits: [], prescriptions: [], labs: [], appointments: [] });
  const [page, setPage] = useState("dashboard");
  const [loading, setLoading] = useState(Boolean(getPatientToken()));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getPatientToken()) return;
    loadPortal();
  }, []);

  async function loadPortal() {
    setLoading(true);
    setError("");
    try {
      const [profile, visits, prescriptions, labs, appointments] = await Promise.all([
        getPatientProfile(),
        getMyVisits(),
        getMyPrescriptions(),
        getMyLabReports(),
        getMyAppointments(),
      ]);
      setPatient(profile);
      setData({ visits, prescriptions, labs, appointments });
    } catch (err) {
      clearPatientToken();
      setPatient(null);
      setError(err.message || "Could not open patient portal");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearPatientToken();
    setPatient(null);
    setData({ visits: [], prescriptions: [], labs: [], appointments: [] });
    setPage("dashboard");
  }

  if (loading) return <div className="portal-loading">Loading patient portal...</div>;
  if (!patient) return <PortalLogin onLogin={loadPortal} error={error} />;

  const pages = {
    dashboard: <Dashboard patient={patient} data={data} setPage={setPage} />,
    appointments: <Appointments data={data} refresh={loadPortal} />,
    prescriptions: <Prescriptions prescriptions={data.prescriptions} />,
    labs: <LabReports labs={data.labs} refresh={loadPortal} />,
    emergency: <EmergencyCard patient={patient} prescriptions={data.prescriptions} />,
    profile: <Profile patient={patient} setPatient={setPatient} onLogout={handleLogout} />,
  };

  return (
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <div className="portal-brand">
          <img className="portal-logo" src="/logo.png" alt="DocNudge" />
          <div>
            <strong>DocNudge</strong>
            <span>Health Wallet</span>
          </div>
        </div>
        <div className="portal-patient-chip">
          <div className="portal-avatar">{patient.name?.[0] || "P"}</div>
          <div>
            <strong>{patient.name}</strong>
            <span>{patient.blood_group || patient.bloodGroup || "Blood group not set"}</span>
          </div>
        </div>
        <nav className="portal-nav">
          {NAV.map((item) => (
            <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => setPage(item.id)}>
              <i className={`ti ${item.icon}`} />
              <span>{item.label}</span>
              {item.badge && <em>{item.badge}</em>}
            </button>
          ))}
        </nav>
        <div className="portal-clinic">{patient.clinic || "DocNudge Clinic"}</div>
      </aside>
      <main className="portal-main">
        <header className="portal-topbar">
          <div>
            <span>{NAV.find((item) => item.id === page)?.label}</span>
            <strong>{patient.clinic || "DocNudge"}</strong>
          </div>
          <button className="portal-sos" onClick={() => setPage("emergency")}>
            <i className="ti ti-alert-triangle" /> SOS
          </button>
        </header>
        <section className="portal-content">{pages[page]}</section>
      </main>
    </div>
  );
}

function PortalLogin({ onLogin, error: initialError }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError || "");

  async function handleLogin() {
    if (phone.length < 10) return;
    setLoading(true);
    setError("");
    try {
      await loginWithPhone(`+91${phone}`);
      await onLogin();
    } catch (err) {
      setError(err.message || "Could not log in with this phone number");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="portal-login">
      <div className="portal-login-card">
        <div className="portal-login-brand">
          <img className="portal-login-logo" src="/logo.png" alt="DocNudge" />
          <h1>DocNudge</h1>
          <p>Your personal health wallet</p>
        </div>
        {error && <div className="portal-error">{error}</div>}
        <label className="portal-field">
          Mobile number
          <div className="portal-phone">
            <span>+91</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
              onKeyDown={(event) => event.key === "Enter" && handleLogin()}
              placeholder="98765 43210"
            />
          </div>
        </label>
        <button className="portal-primary" disabled={phone.length < 10 || loading} onClick={handleLogin}>
          {loading ? "Opening..." : "Login with Mobile Number"}
        </button>
        <p className="portal-security">Use the mobile number registered with your clinic.</p>
      </div>
    </div>
  );
}

function Dashboard({ patient, data, setPage }) {
  const upcoming = data.appointments.filter((item) => item.portal_status === "upcoming").slice(0, 3);
  const latestVisit = data.visits[0];
  const clinics = linkedClinics(patient);

  return (
    <div className="portal-stack">
      <div className="portal-hero">
        <div>
          <h2>{greeting()}, {firstName(patient.name)}</h2>
          <p>{latestVisit ? `Last visit: ${formatDate(latestVisit.visit_date)}` : "Your health summary is ready."}</p>
        </div>
        <button onClick={() => setPage("emergency")}><i className="ti ti-first-aid-kit" /> Emergency Card</button>
      </div>
      <Panel title="Linked Clinics">
        <div className="portal-clinic-list">
          {clinics.length ? clinics.map((clinic, index) => <ClinicRow key={`${clinic.name}-${index}`} clinic={clinic} />) : <Empty text="No linked clinics yet" />}
        </div>
      </Panel>
      <div className="portal-stats">
        <Stat label="Visits" value={data.visits.length} tone="blue" />
        <Stat label="Prescriptions" value={data.prescriptions.length} tone="green" />
        <Stat label="Lab results" value={data.labs.length} tone="amber" />
      </div>
      <div className="portal-grid two">
        <Panel title="Upcoming Appointments" action="View all" onAction={() => setPage("appointments")}>
          {upcoming.length ? upcoming.map((item) => <AppointmentRow key={item.id} item={item} />) : <Empty text="No upcoming appointments" />}
        </Panel>
        <Panel title="Recent Prescriptions" action="View all" onAction={() => setPage("prescriptions")}>
          {data.prescriptions.slice(0, 2).length ? data.prescriptions.slice(0, 2).map((rx) => <AppointmentRow key={rx.id} item={{ service_type: "Prescription", appointment_date: rx.created_at, appointment_time: `${(rx.medicines || []).length} medicines` }} />) : <Empty text="No prescriptions yet" />}
        </Panel>
      </div>
      <div className="portal-actions">
        {[
          ["ti-prescription", "View Prescriptions", "prescriptions"],
          ["ti-test-pipe", "Lab Reports", "labs"],
          ["ti-calendar-plus", "Book Appointment", "appointments"],
          ["ti-first-aid-kit", "Emergency Card", "emergency"],
        ].map(([icon, label, target]) => (
          <button key={target} onClick={() => setPage(target)}>
            <i className={`ti ${icon}`} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ClinicRow({ clinic }) {
  return (
    <div className="portal-clinic-row">
      <div className="portal-brand-mark small">DN</div>
      <div>
        <strong>{clinic.name}</strong>
        <span>{clinic.doctor_name || clinic.doctor || "Doctor"}{clinic.speciality || clinic.designation ? ` - ${clinic.speciality || clinic.designation}` : ""}</span>
      </div>
    </div>
  );
}

function Appointments({ data, refresh }) {
  const [tab, setTab] = useState("upcoming");
  const [booking, setBooking] = useState(false);
  const [form, setForm] = useState({ appointment_date: "", appointment_time: "10:00 AM", service_type: "Consultation", notes: "" });
  const [saving, setSaving] = useState(false);
  const rows = data.appointments.filter((item) => (item.portal_status || "upcoming") === tab);

  async function submitBooking() {
    setSaving(true);
    try {
      await createMyAppointment(form);
      setBooking(false);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="portal-stack">
      <PageHeader title="Appointments" action="+ Book Appointment" onAction={() => setBooking(!booking)} />
      {booking && (
        <div className="portal-panel">
          <div className="portal-form-grid">
            <label>Date<input type="date" value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} /></label>
            <label>Time<select value={form.appointment_time} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })}>{["9:00 AM", "10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM", "4:00 PM"].map((time) => <option key={time}>{time}</option>)}</select></label>
            <label>Type<input value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} /></label>
            <label>Reason<input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Diabetes review, fever..." /></label>
          </div>
          <button className="portal-primary small" disabled={!form.appointment_date || saving} onClick={submitBooking}>{saving ? "Booking..." : "Confirm Booking"}</button>
        </div>
      )}
      <Tabs tabs={["upcoming", "completed", "missed"]} active={tab} setActive={setTab} counts={data.appointments.reduce((acc, item) => ({ ...acc, [item.portal_status]: (acc[item.portal_status] || 0) + 1 }), {})} />
      <div className="portal-list">{rows.length ? rows.map((item) => <AppointmentCard key={item.id} item={item} />) : <Empty text={`No ${tab} appointments`} />}</div>
    </div>
  );
}

function Prescriptions({ prescriptions }) {
  const [expanded, setExpanded] = useState(prescriptions[0]?.id || null);
  const [search, setSearch] = useState("");
  const filtered = prescriptions.filter((rx) => {
    const haystack = `${rx.diagnosis || ""} ${rx.doctor || ""} ${(rx.medicines || []).map((med) => med.name).join(" ")}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  async function download(id) {
    const blob = await downloadPrescriptionPdf(id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `prescription-${id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="portal-stack">
      <PageHeader title="Prescription History">
        <input className="portal-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search medicine or doctor" />
      </PageHeader>
      <div className="portal-list">
        {filtered.length ? filtered.map((rx) => (
          <div key={rx.id} className="portal-panel">
            <button className="portal-row-button" onClick={() => setExpanded(expanded === rx.id ? null : rx.id)}>
              <div><strong>{rx.diagnosis || "Prescription"}</strong><span>{rx.doctor || "Doctor"} - {formatDate(rx.date || rx.created_at)}</span></div>
              <em>{(rx.medicines || []).length} medicines</em>
            </button>
            {expanded === rx.id && (
              <div className="portal-expanded">
                {(rx.medicines || []).map((med, index) => <MedicineRow key={`${med.name}-${index}`} med={med} large />)}
                {rx.advice && <div className="portal-note"><strong>Doctor's advice</strong><p>{rx.advice}</p></div>}
                <button className="portal-secondary" onClick={() => download(rx.id)}><i className="ti ti-download" /> Download</button>
              </div>
            )}
          </div>
        )) : <Empty text="No prescriptions found" />}
      </div>
    </div>
  );
}

function LabReports({ labs, refresh }) {
  const [expanded, setExpanded] = useState(null);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setSaving(true);
    try {
      await uploadLabReport(file, file.name);
      setFile(null);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="portal-stack">
      <PageHeader title="Lab Reports" />
      <div className="portal-upload">
        <i className="ti ti-cloud-upload" />
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button className="portal-primary small" disabled={!file || saving} onClick={handleUpload}>{saving ? "Uploading..." : "Upload Report"}</button>
      </div>
      <div className="portal-list">
        {labs.length ? labs.map((report) => (
          <div key={report.id} className="portal-panel">
            <button className="portal-row-button" onClick={() => setExpanded(expanded === report.id ? null : report.id)}>
              <div><strong>{report.name || report.test_name}</strong><span>{formatDate(report.date || report.test_date)}</span></div>
              <em className={report.status === "high" ? "warn" : "ok"}>{report.status || "normal"}</em>
            </button>
            {expanded === report.id && <LabTable rows={report.results || [report]} />}
          </div>
        )) : <Empty text="No lab reports uploaded yet" />}
      </div>
    </div>
  );
}

function EmergencyCard({ patient, prescriptions }) {
  const [copied, setCopied] = useState(false);
  const token = patient.emergency_token;
  const url = token ? `${window.location.origin}/emergency/${token}` : "";
  const meds = (prescriptions[0]?.medicines || []).map((med) => med.name).filter(Boolean);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="portal-stack">
      <div className="portal-emergency-card">
        <div className="portal-emergency-head">
          <div><span>Emergency Card</span><h2>{patient.name}</h2><p>{patient.age || "-"} yrs - {patient.gender || "Not set"}</p></div>
          <strong>{patient.blood_group || patient.bloodGroup || "NA"}</strong>
        </div>
        <div className="portal-emergency-grid">
          <EmergencySection title="Allergies" items={patient.allergies || []} tone="red" />
          <EmergencySection title="Conditions" items={patient.conditions?.length ? patient.conditions : asList(patient.condition)} tone="amber" />
          <EmergencySection title="Current Medicines" items={meds} tone="blue" />
          <div className="portal-emergency-contact">
            <span>Emergency Contact</span>
            <strong>{patient.emergencyContact?.name || patient.emergency_name || "Not set"}</strong>
            <p>{patient.emergencyContact?.relation || patient.emergency_relation || ""} {patient.emergencyContact?.phone || patient.emergency_phone || ""}</p>
          </div>
        </div>
        <div className="portal-qr-row">
          <QRVisual />
          <div>
            <span>Public emergency link</span>
            <p>{url || "Emergency token will be generated after refresh"}</p>
            <button className="portal-primary small" disabled={!url} onClick={copy}>{copied ? "Copied" : "Copy Link"}</button>
          </div>
        </div>
      </div>
      <div className="portal-tip">This link shows only emergency-safe fields. Full records stay private.</div>
    </div>
  );
}

function Profile({ patient, setPatient, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: patient.name || "",
    age: patient.age || "",
    gender: patient.gender || "",
    blood_group: patient.blood_group || patient.bloodGroup || "",
    allergies: (patient.allergies || []).join(", "),
    conditions: (patient.conditions || []).join(", "),
    emergency_name: patient.emergency_name || patient.emergencyContact?.name || "",
    emergency_phone: patient.emergency_phone || patient.emergencyContact?.phone || "",
    emergency_relation: patient.emergency_relation || patient.emergencyContact?.relation || "",
  });

  async function save() {
    const updated = await updatePatientProfile({
      ...form,
      age: form.age ? Number(form.age) : null,
      allergies: asList(form.allergies),
      conditions: asList(form.conditions),
    });
    setPatient(updated);
    setEditing(false);
  }

  return (
    <div className="portal-stack">
      <div className="portal-profile-head">
        <div className="portal-avatar large">{patient.name?.[0] || "P"}</div>
        <div><h2>{patient.name}</h2><p>{patient.phone} - {patient.clinic}</p></div>
        <button className="portal-secondary" onClick={editing ? save : () => setEditing(true)}>{editing ? "Save" : "Edit"}</button>
      </div>
      <div className="portal-grid two">
        <ProfilePanel title="Basic Information" editing={editing} form={form} setForm={setForm} fields={[["name", "Name"], ["age", "Age"], ["gender", "Gender"], ["blood_group", "Blood Group"]]} />
        <ProfilePanel title="Medical Information" editing={editing} form={form} setForm={setForm} fields={[["allergies", "Allergies"], ["conditions", "Conditions"]]} />
        <ProfilePanel title="Emergency Contact" editing={editing} form={form} setForm={setForm} fields={[["emergency_name", "Name"], ["emergency_relation", "Relation"], ["emergency_phone", "Phone"]]} />
        <div className="portal-panel">
          <h3>Account</h3>
          <button className="portal-danger" onClick={onLogout}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}

export function EmergencyPublicPage() {
  const token = window.location.pathname.split("/").pop();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getEmergencyProfile(token).then(setProfile).catch((err) => setError(err.message));
  }, [token]);

  if (error) return <div className="portal-public"><div className="portal-panel">{error}</div></div>;
  if (!profile) return <div className="portal-loading">Loading emergency profile...</div>;

  return (
    <div className="portal-public">
      <div className="portal-emergency-card">
        <div className="portal-emergency-head">
          <div><span>DocNudge Emergency Profile</span><h2>{profile.name}</h2><p>{profile.age || "-"} yrs - {profile.gender || "Not set"}</p></div>
          <strong>{profile.blood_group || "NA"}</strong>
        </div>
        <div className="portal-emergency-grid">
          <EmergencySection title="Allergies" items={profile.allergies || []} tone="red" />
          <EmergencySection title="Conditions" items={profile.conditions || []} tone="amber" />
          <EmergencySection title="Current Medicines" items={profile.current_medicines || []} tone="blue" />
          <div className="portal-emergency-contact">
            <span>Emergency Contact</span>
            <strong>{profile.emergency_contact?.name || "Not set"}</strong>
            <p>{profile.emergency_contact?.relation || ""} {profile.emergency_contact?.phone || ""}</p>
          </div>
        </div>
        <div className="portal-tip">Treating doctor: {profile.last_doctor || "Not set"} - {profile.clinic || "DocNudge"}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return <div className={`portal-stat ${tone}`}><strong>{value}</strong><span>{label}</span></div>;
}

function Panel({ title, action, onAction, children }) {
  return <div className="portal-panel"><div className="portal-panel-head"><h3>{title}</h3>{action && <button onClick={onAction}>{action}</button>}</div>{children}</div>;
}

function PageHeader({ title, action, onAction, children }) {
  return <div className="portal-page-head"><h2>{title}</h2>{children || (action && <button className="portal-primary small" onClick={onAction}>{action}</button>)}</div>;
}

function Empty({ text }) {
  return <div className="portal-empty"><i className="ti ti-folder-open" /> {text}</div>;
}

function MedicineRow({ med, large = false }) {
  return <div className={`portal-med ${large ? "large" : ""}`}><span /><div><strong>{med.name}</strong><p>{med.dosage || ""} {med.frequency || ""} {med.duration ? `- ${med.duration}` : ""}</p></div></div>;
}

function AppointmentRow({ item }) {
  return <div className="portal-mini-row"><strong>{item.service_type || "Consultation"}</strong><span>{formatDate(item.appointment_date)} - {item.appointment_time}</span></div>;
}

function AppointmentCard({ item }) {
  return <div className="portal-appointment"><div><strong>{formatDate(item.appointment_date)}</strong><span>{item.appointment_time}</span></div><div><strong>{item.service_type || "Consultation"}</strong><span>{item.notes || item.status}</span></div><em>{item.portal_status}</em></div>;
}

function Tabs({ tabs, active, setActive, counts }) {
  return <div className="portal-tabs">{tabs.map((tab) => <button key={tab} className={active === tab ? "active" : ""} onClick={() => setActive(tab)}>{tab}<span>{counts[tab] || 0}</span></button>)}</div>;
}

function LabTable({ rows }) {
  return <table className="portal-table"><thead><tr><th>Test</th><th>Result</th><th>Reference</th><th>Status</th></tr></thead><tbody>{rows.map((row, index) => <tr key={index}><td>{row.test || row.test_name}</td><td>{row.value || row.result}</td><td>{row.range || row.reference_range || "-"}</td><td>{row.status || "normal"}</td></tr>)}</tbody></table>;
}

function EmergencySection({ title, items, tone }) {
  return <div className="portal-emergency-section"><span>{title}</span><div>{items.length ? items.map((item) => <em key={item} className={tone}>{item}</em>) : <em>Not set</em>}</div></div>;
}

function QRVisual() {
  const cells = useMemo(() => Array.from({ length: 144 }, (_, index) => (index * 17 + Math.floor(index / 12) * 7) % 5 !== 0), []);
  return <div className="portal-qr">{cells.map((filled, index) => <span key={index} className={filled ? "on" : ""} />)}</div>;
}

function ProfilePanel({ title, editing, form, setForm, fields }) {
  return (
    <div className="portal-panel">
      <h3>{title}</h3>
      <div className="portal-profile-fields">
        {fields.map(([key, label]) => (
          <label key={key}>
            {label}
            {editing ? <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /> : <span>{form[key] || "Not set"}</span>}
          </label>
        ))}
      </div>
    </div>
  );
}
