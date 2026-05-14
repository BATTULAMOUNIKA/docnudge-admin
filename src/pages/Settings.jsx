import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  "Ophthalmology",
  "Psychiatry",
  "Urology",
  "Nephrology",
  "Oncology",
  "Endocrinology",
  "Rheumatology",
  "Other",
];

const CITY_OPTIONS = [
  "Hyderabad",
  "Bangalore",
  "Chennai",
  "Mumbai",
  "Delhi",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
  "Surat",
  "Visakhapatnam",
  "Vijayawada",
  "Warangal",
  "Other",
];

const TABS = [
  ["clinics", "ti-building-hospital", "Clinics"],
  ["doctors", "ti-stethoscope", "Doctor logins"],
  ["profile", "ti-user-circle", "My profile"],
];

function resolveTab(value) {
  return TABS.some(([key]) => key === value) ? value : "clinics";
}

function clinicFormFrom(clinic) {
  const existingCity = clinic?.city || "Hyderabad";
  const knownCity = CITY_OPTIONS.includes(existingCity);
  return {
    name: clinic?.name || "",
    city: knownCity ? existingCity : "Other",
    customCity: knownCity ? "" : existingCity,
    phone: clinic?.phone || "",
    email: clinic?.email || "",
    address: clinic?.address || "",
    plan: clinic?.plan || clinic?.subscription_plan || "trial",
  };
}

function doctorFormFrom(clinics, clinic, doctor) {
  const rawSpeciality = doctor?.designation || clinic?.designation || SPECIALITY_OPTIONS[0];
  const knownSpeciality = SPECIALITY_OPTIONS.includes(rawSpeciality);
  const resolvedClinicId = clinic?.id ? String(clinic.id) : doctor?.clinic_id ? String(doctor.clinic_id) : "";
  return {
    name: doctor?.name || "",
    email: doctor?.email || "",
    password: "",
    phone: doctor?.phone || "",
    designation: knownSpeciality ? rawSpeciality : "Other",
    customDesignation: knownSpeciality ? "" : rawSpeciality,
    role: "doctor",
    clinic_id: resolvedClinicId || (clinics[0]?.id ? String(clinics[0].id) : ""),
  };
}

export default function Settings({ user }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(() => resolveTab(searchParams.get("tab")));
  const [clinics, setClinics] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [editingClinic, setEditingClinic] = useState(null);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [editingDoctor, setEditingDoctor] = useState(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setTab(resolveTab(searchParams.get("tab")));
  }, [searchParams]);

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

  function changeTab(nextTab) {
    setTab(nextTab);
    setSearchParams(nextTab === "clinics" ? {} : { tab: nextTab });
  }

  const doctors = useMemo(() => users.filter((item) => item.role === "doctor"), [users]);

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div>
          <div style={styles.eyebrow}>Admin settings</div>
          <h1 style={styles.heroTitle}>Clinic setup and doctor access</h1>
          <p style={styles.heroCopy}>
            Manage clinics, assign multiple doctors per clinic, and keep your admin profile secure without cluttering the dashboard.
          </p>
        </div>
      </section>

      <div style={styles.layout}>
        <aside style={styles.navCard}>
          {TABS.map(([key, icon, label]) => (
            <button
              key={key}
              style={{ ...styles.navItem, ...(tab === key ? styles.navItemActive : {}) }}
              onClick={() => changeTab(key)}
            >
              <i className={`ti ${icon}`} style={{ fontSize: 16 }} />
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
              onDelete={async (clinic) => {
                if (!window.confirm(`Delete clinic "${clinic.name}"? This cannot be undone.`)) return;
                try {
                  await API.delete(`/clinics/${clinic.id}`);
                  await load();
                } catch (err) {
                  alert(err.response?.data?.detail || "Error deleting clinic");
                }
              }}
              onAddDoctor={(clinic) => {
                setSelectedClinic(clinic);
                setShowDoctorModal(true);
              }}
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
              onEdit={(doctor) => setEditingDoctor(doctor)}
              onDelete={async (doctor) => {
                const name = doctor.name || doctor.email || "this doctor";
                if (!window.confirm(`Delete doctor account for "${name}"?`)) return;
                try {
                  await API.delete(`/admin/users/${doctor.id}`);
                  await load();
                } catch (err) {
                  alert(err.response?.data?.detail || "Error deleting doctor");
                }
              }}
            />
          )}

          {tab === "profile" && <ProfilePanel user={user} />}
        </section>
      </div>

      {showClinicModal && (
        <ClinicModal
          onClose={() => setShowClinicModal(false)}
          onSave={() => {
            setShowClinicModal(false);
            load();
          }}
        />
      )}
      {editingClinic && (
        <ClinicModal
          clinic={editingClinic}
          onClose={() => setEditingClinic(null)}
          onSave={() => {
            setEditingClinic(null);
            load();
          }}
        />
      )}
      {showDoctorModal && (
        <DoctorModal
          clinics={clinics}
          clinic={selectedClinic}
          onClose={() => {
            setShowDoctorModal(false);
            setSelectedClinic(null);
          }}
          onSave={() => {
            setShowDoctorModal(false);
            setSelectedClinic(null);
            load();
          }}
        />
      )}
      {editingDoctor && (
        <DoctorModal
          clinics={clinics}
          clinic={clinics.find((item) => item.id === editingDoctor.clinic_id) || null}
          doctor={editingDoctor}
          onClose={() => setEditingDoctor(null)}
          onSave={() => {
            setEditingDoctor(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ClinicsPanel({ clinics, doctors, loading, onAdd, onEdit, onDelete, onAddDoctor }) {
  return (
    <article style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <h2 style={styles.panelTitle}>Clinic setup</h2>
          <p style={styles.panelCopy}>Create and manage clinics, then add one or more doctor accounts under each clinic.</p>
        </div>
        <button style={styles.primaryBtn} onClick={onAdd}>
          <i className="ti ti-plus" /> Add clinic
        </button>
      </div>

      {loading ? (
        <div style={styles.emptyState}>Loading clinics...</div>
      ) : clinics.length === 0 ? (
        <div style={styles.emptyState}>No clinics created yet. Add your first clinic to get started.</div>
      ) : (
        <div style={styles.gridCards}>
          {clinics.map((clinic) => {
            const clinicDoctors = doctors.filter((doctor) => doctor.clinic_id === clinic.id);
            return (
              <div key={clinic.id} style={styles.clinicCard}>
                <div style={styles.clinicCardTop}>
                  <div style={styles.clinicAvatar}>{clinic.name?.slice(0, 2).toUpperCase() || "CL"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={styles.infoTitle}>{clinic.name}</strong>
                    <div style={styles.infoMeta}>
                      {clinic.city || "City not set"} • {clinicDoctors.length} doctor(s) •{" "}
                      <span style={styles.planInline}>{(clinic.plan || clinic.subscription_plan || "trial").toUpperCase()}</span>
                    </div>
                  </div>
                  <div style={styles.actionGroup}>
                    <button style={styles.smallBtn} onClick={() => onEdit(clinic)}>
                      <i className="ti ti-pencil" /> Edit
                    </button>
                    <button style={styles.dangerBtn} onClick={() => onDelete(clinic)}>
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </div>

                <div style={styles.detailGrid}>
                  <Detail label="Phone" value={clinic.phone || "Not set"} />
                  <Detail label="Email" value={clinic.email || "Not set"} />
                  <Detail label="Address" value={clinic.address || "Not set"} />
                  <Detail label="Patients" value={String(clinic.patient_count || 0)} />
                </div>

                {clinicDoctors.length > 0 && (
                  <div style={styles.doctorListWrap}>
                    <div style={styles.doctorListLabel}>Doctors in this clinic</div>
                    <div style={styles.doctorChips}>
                      {clinicDoctors.map((doctor) => (
                        <div key={doctor.id} style={styles.doctorChip}>
                          <i className="ti ti-stethoscope" style={{ fontSize: 12 }} />
                          <strong>{doctor.name || "Doctor"}</strong>
                          <span style={styles.chipSep}>•</span>
                          <span>{doctor.designation || "General Physician"}</span>
                          <span style={styles.chipSep}>•</span>
                          <span style={styles.doctorChipMeta}>{doctor.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 14 }}>
                  <button style={styles.addDoctorBtn} onClick={() => onAddDoctor(clinic)}>
                    <i className="ti ti-user-plus" /> Add doctor to this clinic
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

function DoctorsPanel({ clinics, doctors, loading, onAdd, onEdit, onDelete }) {
  const [filterClinic, setFilterClinic] = useState("");
  const filteredDoctors = filterClinic
    ? doctors.filter((doctor) => String(doctor.clinic_id) === filterClinic)
    : doctors;

  return (
    <article style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <h2 style={styles.panelTitle}>Doctor logins</h2>
          <p style={styles.panelCopy}>Manage each doctor account, clinic assignment, specialization, and login credentials.</p>
        </div>
        <button style={styles.primaryBtn} onClick={() => onAdd(null)}>
          <i className="ti ti-user-plus" /> Add doctor
        </button>
      </div>

      <div style={styles.filterRow}>
        <select style={{ ...styles.input, maxWidth: 280 }} value={filterClinic} onChange={(event) => setFilterClinic(event.target.value)}>
          <option value="">All clinics</option>
          {clinics.map((clinic) => (
            <option key={clinic.id} value={clinic.id}>
              {clinic.name}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <Th>Doctor</Th>
              <Th>Specialty</Th>
              <Th>Clinic</Th>
              <Th>Email / Login</Th>
              <Th>Phone</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td style={styles.emptyCell} colSpan="6">
                  Loading doctor accounts...
                </td>
              </tr>
            ) : filteredDoctors.length === 0 ? (
              <tr>
                <td style={styles.emptyCell} colSpan="6">
                  No doctor accounts found.
                </td>
              </tr>
            ) : (
              filteredDoctors.map((doctor) => (
                <tr key={doctor.id}>
                  <td style={styles.td}>
                    <div style={styles.doctorCell}>
                      <div style={styles.docAvatar}>{(doctor.name || "DR").slice(0, 2).toUpperCase()}</div>
                      <strong>{doctor.name || "-"}</strong>
                    </div>
                  </td>
                  <td style={styles.td}>{doctor.designation || "General Physician"}</td>
                  <td style={styles.td}>{clinics.find((clinic) => clinic.id === doctor.clinic_id)?.name || "-"}</td>
                  <td style={styles.td}>{doctor.email}</td>
                  <td style={styles.td}>{doctor.phone || "-"}</td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    <div style={{ ...styles.actionGroup, justifyContent: "flex-end" }}>
                      <button style={styles.smallBtn} onClick={() => onEdit(doctor)}>
                        <i className="ti ti-pencil" /> Edit
                      </button>
                      <button style={styles.dangerBtn} onClick={() => onDelete(doctor)}>
                        <i className="ti ti-trash" />
                      </button>
                    </div>
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

function ProfilePanel({ user }) {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function changePassword() {
    setError("");
    setSaved(false);
    if (!pw.current || !pw.next || !pw.confirm) {
      setError("Please fill all password fields.");
      return;
    }
    if (pw.next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (pw.next !== pw.confirm) {
      setError("New password and confirm password do not match.");
      return;
    }
    setSaving(true);
    try {
      await API.put("/auth/change-password", {
        current_password: pw.current,
        new_password: pw.next,
      });
      setPw({ current: "", next: "", confirm: "" });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not update password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <article style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>My account</h2>
            <p style={styles.panelCopy}>Your admin profile details and access level.</p>
          </div>
        </div>

        <div style={styles.profileInfoRow}>
          <div style={styles.profileAvatar}>{(user?.email || "AD").slice(0, 2).toUpperCase()}</div>
          <div>
            <div style={styles.profileName}>{user?.name || "Admin"}</div>
            <div style={styles.profileEmail}>{user?.email || "-"}</div>
            <div style={{ marginTop: 6 }}>
              <span style={styles.rolePill}>Clinic administrator</span>
            </div>
          </div>
        </div>
      </article>

      <article style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>Change password</h2>
            <p style={styles.panelCopy}>Use a strong password with at least 8 characters.</p>
          </div>
          {saved && (
            <span style={styles.savedPill}>
              <i className="ti ti-circle-check" /> Password updated
            </span>
          )}
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <div style={styles.formGrid}>
          <PasswordField
            label="Current password"
            value={pw.current}
            show={showPw.current}
            onToggle={() => setShowPw((current) => ({ ...current, current: !current.current }))}
            onChange={(value) => setPw((current) => ({ ...current, current: value }))}
          />
          <PasswordField
            label="New password"
            value={pw.next}
            show={showPw.next}
            onToggle={() => setShowPw((current) => ({ ...current, next: !current.next }))}
            onChange={(value) => setPw((current) => ({ ...current, next: value }))}
          />
          <PasswordField
            label="Confirm new password"
            value={pw.confirm}
            show={showPw.confirm}
            onToggle={() => setShowPw((current) => ({ ...current, confirm: !current.confirm }))}
            onChange={(value) => setPw((current) => ({ ...current, confirm: value }))}
          />
        </div>

        <div style={styles.footer}>
          <button style={styles.primaryBtn} disabled={saving} onClick={changePassword}>
            {saving ? "Updating..." : <><i className="ti ti-lock" /> Update password</>}
          </button>
        </div>
      </article>
    </div>
  );
}

function PasswordField({ label, value, show, onToggle, onChange }) {
  return (
    <label style={styles.field}>
      <span>{label}</span>
      <div style={{ position: "relative" }}>
        <input
          style={{ ...styles.input, paddingRight: 42 }}
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="button" style={styles.eyeBtn} onClick={onToggle}>
          <i className={`ti ${show ? "ti-eye-off" : "ti-eye"}`} />
        </button>
      </div>
    </label>
  );
}

function ClinicModal({ clinic, onClose, onSave }) {
  const isEdit = Boolean(clinic);
  const [form, setForm] = useState(() => clinicFormFrom(clinic));
  const [saving, setSaving] = useState(false);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    if (!form.name.trim()) {
      alert("Clinic name is required");
      return;
    }
    if (form.city === "Other" && !form.customCity.trim()) {
      alert("Please enter a city name");
      return;
    }

    const payload = {
      name: form.name.trim(),
      city: form.city === "Other" ? form.customCity.trim() : form.city,
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      plan: form.plan,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await API.put(`/clinics/${clinic.id}`, payload);
      } else {
        await API.post("/clinics", payload);
      }
      onSave();
    } catch (err) {
      alert(err.response?.data?.detail || "Error saving clinic");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit clinic" : "Add new clinic"} onClose={onClose}>
      <div style={styles.twoCol}>
        <Field label="Clinic name *">
          <input
            style={styles.input}
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            autoFocus
            placeholder="e.g. MR Clinics"
          />
        </Field>
        <Field label="City">
          <select style={styles.input} value={form.city} onChange={(event) => updateField("city", event.target.value)}>
            {CITY_OPTIONS.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {form.city === "Other" && (
        <Field label="Enter city name">
          <input
            style={styles.input}
            value={form.customCity}
            onChange={(event) => updateField("customCity", event.target.value)}
            placeholder="Your city"
          />
        </Field>
      )}

      <div style={styles.twoCol}>
        <Field label="Phone">
          <input
            style={styles.input}
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="+91 99999 00000"
          />
        </Field>
        <Field label="Email">
          <input
            style={styles.input}
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="clinic@example.com"
          />
        </Field>
      </div>

      <Field label="Address">
        <input
          style={styles.input}
          value={form.address}
          onChange={(event) => updateField("address", event.target.value)}
          placeholder="Street, area, pincode"
        />
      </Field>

      <Field label="Plan">
        <select style={styles.input} value={form.plan} onChange={(event) => updateField("plan", event.target.value)}>
          <option value="trial">30-day trial</option>
          <option value="basic">Basic - Rs 999/month</option>
          <option value="pro">Pro - Rs 1,999/month</option>
        </select>
      </Field>

      <ModalFooter onClose={onClose} onSave={submit} saving={saving} label={isEdit ? "Save changes" : "Create clinic"} />
    </Modal>
  );
}

function DoctorModal({ clinics, clinic, doctor, onClose, onSave }) {
  const isEdit = Boolean(doctor);
  const [form, setForm] = useState(() => doctorFormFrom(clinics, clinic, doctor));
  const [saving, setSaving] = useState(false);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    if (!form.name.trim() || !form.email.trim() || !form.clinic_id) {
      alert("Doctor name, email, and clinic are required");
      return;
    }
    if (!isEdit && !form.password) {
      alert("Temporary password is required");
      return;
    }
    if (form.designation === "Other" && !form.customDesignation.trim()) {
      alert("Please enter a specialization");
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      designation: form.designation === "Other" ? form.customDesignation.trim() : form.designation,
      role: "doctor",
      clinic_id: Number(form.clinic_id),
    };
    if (form.password) {
      payload.password = form.password;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await API.put(`/admin/users/${doctor.id}`, payload);
      } else {
        await API.post("/admin/users", payload);
      }
      onSave();
    } catch (err) {
      alert(err.response?.data?.detail || "Error saving doctor account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? `Edit doctor - ${doctor.name || doctor.email}` : clinic ? `Add doctor for ${clinic.name}` : "Add doctor login"} onClose={onClose}>
      <div style={styles.infoStrip}>
        <i className="ti ti-info-circle" style={{ fontSize: 15 }} />
        One clinic can have multiple doctors with separate credentials and specialties.
      </div>

      <div style={styles.twoCol}>
        <Field label="Doctor full name *">
          <input
            style={styles.input}
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            autoFocus
            placeholder="Dr. Rajesh Kumar"
          />
        </Field>
        <Field label="Phone number">
          <input
            style={styles.input}
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="+91 99999 00000"
          />
        </Field>
      </div>

      <Field label="Specialization *">
        <select style={styles.input} value={form.designation} onChange={(event) => updateField("designation", event.target.value)}>
          {SPECIALITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Field>

      {form.designation === "Other" && (
        <Field label="Enter specialization">
          <input
            style={styles.input}
            value={form.customDesignation}
            onChange={(event) => updateField("customDesignation", event.target.value)}
            placeholder="e.g. Sports Medicine"
          />
        </Field>
      )}

      <Field label="Assign to clinic *">
        <select style={styles.input} value={form.clinic_id} onChange={(event) => updateField("clinic_id", event.target.value)}>
          <option value="">Select clinic...</option>
          {clinics.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} - {item.city || "No city"}
            </option>
          ))}
        </select>
      </Field>

      <div style={styles.twoCol}>
        <Field label="Login email *">
          <input
            style={styles.input}
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="doctor@clinic.com"
          />
        </Field>
        <Field label={isEdit ? "New password (leave blank to keep)" : "Temporary password *"}>
          <input
            style={styles.input}
            type="password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            placeholder={isEdit ? "Leave blank to keep current" : "Minimum 8 characters"}
          />
        </Field>
      </div>

      <ModalFooter onClose={onClose} onSave={submit} saving={saving} label={isEdit ? "Save changes" : "Create doctor login"} />
    </Modal>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={styles.overlay} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>{title}</span>
          <button style={styles.closeBtn} onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div style={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ onClose, onSave, saving, label }) {
  return (
    <div style={styles.footer}>
      <button style={styles.ghostBtn} onClick={onClose}>
        Cancel
      </button>
      <button style={styles.primaryBtn} onClick={onSave} disabled={saving}>
        {saving ? "Saving..." : label}
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={styles.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Detail({ label, value }) {
  return (
    <div style={styles.detailItem}>
      <label style={styles.detailLabel}>{label}</label>
      <span style={styles.detailValue}>{value}</span>
    </div>
  );
}

function Th({ children, align = "left" }) {
  return <th style={{ ...styles.th, textAlign: align }}>{children}</th>;
}

const styles = {
  page: {
    padding: "28px 30px 48px",
    minHeight: "100vh",
    background: "radial-gradient(circle at top left,#eef5ff 0%,#f7faff 35%,#fbf9f3 100%)",
    fontFamily: "'DM Sans', sans-serif",
    color: "#11243a",
  },
  hero: {
    padding: "22px 26px",
    borderRadius: 28,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(12,68,124,0.08)",
    boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#0d9488",
    fontWeight: 700,
    marginBottom: 6,
  },
  heroTitle: { margin: 0, fontSize: 28, lineHeight: 1.1, fontWeight: 800 },
  heroCopy: { margin: "6px 0 0", fontSize: 13, color: "#708092", maxWidth: 760, lineHeight: 1.6 },
  layout: { display: "grid", gridTemplateColumns: "220px minmax(0,1fr)", gap: 18 },
  navCard: {
    padding: 10,
    borderRadius: 22,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(12,68,124,0.08)",
    boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
    height: "fit-content",
  },
  navItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    borderRadius: 16,
    border: "none",
    background: "transparent",
    color: "#56697b",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "left",
  },
  navItemActive: {
    background: "linear-gradient(135deg,#0c447c,#0d9488)",
    color: "#fff",
    boxShadow: "0 10px 24px rgba(12,68,124,0.18)",
  },
  content: { display: "grid", gap: 18, alignContent: "start" },
  panel: {
    borderRadius: 24,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(12,68,124,0.08)",
    boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
    padding: 22,
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 18,
  },
  panelTitle: { margin: 0, fontSize: 19, fontWeight: 800 },
  panelCopy: { margin: "5px 0 0", fontSize: 13, color: "#708092", lineHeight: 1.6 },
  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 18px",
    borderRadius: 14,
    border: "none",
    background: "linear-gradient(135deg,#0c447c,#0d9488)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 13,
  },
  ghostBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(12,68,124,0.15)",
    background: "#fff",
    color: "#0c447c",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 13,
  },
  smallBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "7px 12px",
    borderRadius: 11,
    border: "1px solid rgba(12,68,124,0.12)",
    background: "#fff",
    color: "#0c447c",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 12,
  },
  dangerBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "7px 10px",
    borderRadius: 11,
    border: "1px solid rgba(184,59,46,0.18)",
    background: "#fff8f7",
    color: "#b83b2e",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 13,
  },
  addDoctorBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "8px 14px",
    borderRadius: 12,
    border: "1px dashed rgba(12,68,124,0.22)",
    background: "transparent",
    color: "#0c447c",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 12,
  },
  actionGroup: { display: "flex", gap: 8, flexWrap: "wrap" },
  gridCards: { display: "grid", gap: 14 },
  clinicCard: {
    borderRadius: 18,
    border: "1px solid rgba(12,68,124,0.09)",
    background: "#fbfdff",
    padding: 18,
  },
  clinicCardTop: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 },
  clinicAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    background: "linear-gradient(135deg,#0c447c,#0d9488)",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 13,
    flexShrink: 0,
  },
  infoTitle: { display: "block", fontSize: 15, color: "#11243a" },
  infoMeta: { marginTop: 3, fontSize: 12, color: "#708092" },
  planInline: { fontWeight: 800, color: "#0d9488" },
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 14 },
  detailItem: { display: "grid", gap: 3 },
  detailLabel: {
    fontSize: 11,
    color: "#708092",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  },
  detailValue: { fontSize: 13, color: "#31475a" },
  doctorListWrap: { borderTop: "1px solid rgba(12,68,124,0.07)", paddingTop: 12, marginTop: 4 },
  doctorListLabel: {
    fontSize: 11,
    color: "#708092",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 8,
  },
  doctorChips: { display: "flex", flexDirection: "column", gap: 6 },
  doctorChip: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "8px 12px",
    borderRadius: 12,
    background: "#f0f7ff",
    fontSize: 12,
    color: "#31475a",
    flexWrap: "wrap",
  },
  doctorChipMeta: { color: "#708092" },
  chipSep: { color: "#b0bec8", margin: "0 2px" },
  filterRow: { marginBottom: 14 },
  doctorCell: { display: "flex", alignItems: "center", gap: 8 },
  docAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    background: "linear-gradient(135deg,#0c447c,#0d9488)",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 11,
    flexShrink: 0,
  },
  tableWrap: { overflow: "auto", borderRadius: 18, border: "1px solid rgba(12,68,124,0.08)" },
  table: { width: "100%", minWidth: 800, borderCollapse: "collapse", background: "#fff" },
  th: {
    padding: "13px 16px",
    background: "#f7fbff",
    color: "#708092",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    borderBottom: "1px solid rgba(12,68,124,0.08)",
  },
  td: {
    padding: "13px 16px",
    borderBottom: "1px solid rgba(12,68,124,0.06)",
    fontSize: 13,
    color: "#31475a",
    verticalAlign: "middle",
  },
  emptyCell: { padding: 46, color: "#708092", textAlign: "center" },
  emptyState: { padding: "26px 0", color: "#708092", fontSize: 14 },
  profileInfoRow: { display: "flex", alignItems: "center", gap: 16 },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    background: "linear-gradient(135deg,#0c447c,#0d9488)",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 20,
    flexShrink: 0,
  },
  profileName: { fontSize: 17, fontWeight: 800, color: "#11243a" },
  profileEmail: { fontSize: 13, color: "#708092", marginTop: 3 },
  rolePill: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    background: "#eef5ff",
    color: "#0c447c",
    fontSize: 12,
    fontWeight: 800,
  },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14 },
  twoCol: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 },
  field: {
    display: "grid",
    gap: 7,
    color: "#526677",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  input: {
    width: "100%",
    padding: "11px 13px",
    borderRadius: 13,
    border: "1px solid rgba(12,68,124,0.14)",
    background: "#fbfdff",
    color: "#11243a",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
    fontSize: 13,
  },
  eyeBtn: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    border: "none",
    background: "transparent",
    color: "#708092",
    cursor: "pointer",
    fontSize: 16,
    padding: 0,
  },
  savedPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "7px 12px",
    borderRadius: 999,
    background: "#e5fbf7",
    color: "#0d9488",
    fontSize: 12,
    fontWeight: 800,
  },
  infoStrip: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 14px",
    borderRadius: 14,
    background: "#eef5fb",
    color: "#38536c",
    fontSize: 13,
  },
  errorBox: {
    padding: "11px 13px",
    borderRadius: 14,
    background: "#fff3f2",
    border: "1px solid rgba(184,59,46,0.12)",
    color: "#b83b2e",
    fontSize: 13,
    marginBottom: 6,
  },
  footer: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(10,25,47,0.38)",
    display: "grid",
    placeItems: "center",
    padding: 24,
    zIndex: 1000,
  },
  modal: {
    width: "min(660px,100%)",
    borderRadius: 24,
    background: "#fff",
    border: "1px solid rgba(12,68,124,0.08)",
    boxShadow: "0 28px 60px rgba(15,23,42,0.18)",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
  },
  modalHeader: {
    padding: "18px 22px",
    borderBottom: "1px solid rgba(12,68,124,0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
  },
  modalTitle: { fontSize: 16, fontWeight: 800, color: "#11243a" },
  modalBody: { padding: 22, display: "grid", gap: 14, overflowY: "auto" },
  closeBtn: {
    border: "none",
    background: "#f6f8fb",
    color: "#708092",
    width: 34,
    height: 34,
    borderRadius: 12,
    cursor: "pointer",
    fontSize: 16,
  },
};
