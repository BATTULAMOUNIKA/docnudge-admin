import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

function appPath(path) {
  return window.location.pathname.startsWith("/doctor") ? `/doctor${path}` : path;
}

const FOLLOWUP_TYPES = [
  "General checkup",
  "Diabetes follow-up",
  "Hypertension follow-up",
  "Thyroid follow-up",
  "Cardiac follow-up",
  "Orthopedic follow-up",
  "Skin / Dermatology",
  "ENT",
  "Eye / Ophthalmology",
  "Gynecology",
  "Pediatrics",
  "Other",
];

const GENDERS = ["Male", "Female", "Other"];

function localDateString() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export default function AddPatient({ clinicId }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [patient, setPatient] = useState({
    name: "",
    phone: "",
    age: "",
    gender: "Male",
    condition: "",
    followup_type: "General checkup",
  });
  const [visit, setVisit] = useState({
    visit_date: localDateString(),
    next_visit: "",
    notes: "",
    add_to_queue: false,
  });

  function validateStep1() {
    const nextErrors = {};
    const digits = String(patient.phone || "").replace(/\D/g, "");
    if (!patient.name.trim()) nextErrors.name = "Patient name is required";
    if (!digits) nextErrors.phone = "Phone number is required";
    else if (!(digits.length === 10 || (digits.length === 12 && digits.startsWith("91")))) {
      nextErrors.phone = "Enter a valid mobile number";
    }
    if (!patient.age || Number.isNaN(Number(patient.age)) || Number(patient.age) < 1 || Number(patient.age) > 120) {
      nextErrors.age = "Enter a valid age";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function setPatientField(field, value) {
    setPatient((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: null }));
    }
  }

  function setVisitField(field, value) {
    setVisit((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    if (!clinicId) {
      return;
    }

    setSaving(true);
    try {
      const patientRes = await API.post("/patients", {
        ...patient,
        phone: normalizePhone(patient.phone),
        clinic_id: clinicId,
        age: Number(patient.age),
      });
      const newPatient = patientRes.data;

      await API.post("/visits", {
        patient_id: newPatient.id,
        visit_date: visit.visit_date,
        next_visit: visit.next_visit || null,
        notes: visit.notes,
        status: "completed",
      });

      navigate(appPath(`/patients/${newPatient.id}`));
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => (step === 1 ? navigate(-1) : setStep(1))}>
          <i className="ti ti-arrow-left" style={{ fontSize: 14 }} />
          {step === 1 ? "Back" : "Previous"}
        </button>
        <div>
          <h1 style={styles.title}>Add new patient</h1>
          <p style={styles.sub}>Step {step} of 2 - {step === 1 ? "Patient details" : "Visit details"}</p>
        </div>
      </div>

      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: step === 1 ? "50%" : "100%" }} />
      </div>

      <div style={styles.steps}>
        <StepBadge n={1} label="Patient details" active={step === 1} done={step > 1} />
        <div style={styles.stepLine} />
        <StepBadge n={2} label="Visit details" active={step === 2} done={false} />
      </div>

      <div style={styles.card}>
        {step === 1 ? (
          <>
            <div style={styles.sectionTitle}>Patient information</div>

            <div style={styles.row2}>
              <Field label="Full name *" error={errors.name}>
                <Input
                  value={patient.name}
                  onChange={(value) => setPatientField("name", value)}
                  placeholder="e.g. Ravi Kumar"
                  autoFocus
                />
              </Field>
              <Field label="Mobile number *" error={errors.phone}>
                <Input
                  value={patient.phone}
                  onChange={(value) => setPatientField("phone", value)}
                  placeholder="9876543210 or 919876543210"
                  type="tel"
                />
              </Field>
            </div>

            <div style={styles.row2}>
              <Field label="Age *" error={errors.age}>
                <Input
                  value={patient.age}
                  onChange={(value) => setPatientField("age", value)}
                  placeholder="42"
                  type="number"
                  min={1}
                  max={120}
                />
              </Field>
              <Field label="Gender">
                <select
                  style={styles.input}
                  value={patient.gender}
                  onChange={(event) => setPatientField("gender", event.target.value)}
                >
                  {GENDERS.map((gender) => (
                    <option key={gender}>{gender}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Condition / chief complaint">
              <Input
                value={patient.condition}
                onChange={(value) => setPatientField("condition", value)}
                placeholder="e.g. Diabetes, Hypertension, Fever"
              />
            </Field>

            <Field label="Follow-up type">
              <select
                style={styles.input}
                value={patient.followup_type}
                onChange={(event) => setPatientField("followup_type", event.target.value)}
              >
                {FOLLOWUP_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </Field>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
              <button style={styles.btnPrimary} onClick={() => validateStep1() && setStep(2)}>
                Next - Visit details <i className="ti ti-arrow-right" style={{ fontSize: 14 }} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={styles.sectionTitle}>Today's visit</div>

            <div style={styles.row2}>
              <Field label="Visit date">
                <Input type="date" value={visit.visit_date} onChange={(value) => setVisitField("visit_date", value)} />
              </Field>
              <Field label="Next visit date (optional)">
                <Input type="date" value={visit.next_visit} onChange={(value) => setVisitField("next_visit", value)} />
              </Field>
            </div>

            <Field label="Notes / reason for visit">
              <textarea
                style={{ ...styles.input, resize: "vertical", minHeight: 80 }}
                value={visit.notes}
                onChange={(event) => setVisitField("notes", event.target.value)}
                placeholder="e.g. BP review, sugar levels high, routine follow-up"
              />
            </Field>

            {!clinicId && (
              <div style={styles.errorBanner}>
                Clinic is still loading for this account. Please wait a moment and try again.
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
              <button style={styles.btnSecondary} onClick={() => setStep(1)}>
                <i className="ti ti-arrow-left" style={{ fontSize: 14 }} /> Back
              </button>
              <button style={styles.btnPrimary} onClick={save} disabled={saving || !clinicId}>
                {saving ? "Saving..." : "Save patient"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StepBadge({ n, label, active, done }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 600,
          background: done || active ? "#1D9E75" : "#eee",
          color: done || active ? "#fff" : "#aaa",
          flexShrink: 0,
        }}
      >
        {done ? <i className="ti ti-check" style={{ fontSize: 13 }} /> : n}
      </div>
      <span style={{ fontSize: 13, color: active ? "#1a1a18" : "#aaa", fontWeight: active ? 500 : 400 }}>
        {label}
      </span>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={styles.label}>{label}</label>
      {children}
      {error && <div style={styles.errorMsg}>{error}</div>}
    </div>
  );
}

function Input({ value, onChange, ...props }) {
  return <input style={styles.input} value={value} onChange={(event) => onChange?.(event.target.value)} {...props} />;
}

const styles = {
  page: {
    padding: "28px 32px",
    maxWidth: 680,
    margin: "0 auto",
    fontFamily: "'DM Sans', sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 20,
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "7px 12px",
    border: "0.5px solid rgba(0,0,0,0.12)",
    borderRadius: 7,
    background: "transparent",
    cursor: "pointer",
    fontSize: 12,
    color: "#555",
    marginTop: 2,
    flexShrink: 0,
  },
  title: { fontSize: 22, fontWeight: 600, color: "#1a1a18", margin: 0 },
  sub: { fontSize: 13, color: "#aaa", marginTop: 3 },
  progressTrack: { height: 3, background: "#eee", borderRadius: 3, marginBottom: 20 },
  progressFill: { height: 3, background: "#1D9E75", borderRadius: 3, transition: "width 0.35s ease" },
  steps: { display: "flex", alignItems: "center", gap: 0, marginBottom: 24 },
  stepLine: { flex: 1, height: "0.5px", background: "rgba(0,0,0,0.1)", margin: "0 12px" },
  card: {
    background: "#fff",
    border: "0.5px solid rgba(0,0,0,0.1)",
    borderRadius: 12,
    padding: "24px 28px",
  },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: "#1a1a18", marginBottom: 20 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  label: { fontSize: 12, color: "#888", marginBottom: 6, display: "block" },
  input: {
    width: "100%",
    padding: "9px 11px",
    border: "0.5px solid rgba(0,0,0,0.15)",
    borderRadius: 7,
    fontSize: 13,
    background: "#fff",
    color: "#1a1a18",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  errorMsg: { fontSize: 11, color: "#C0392B", marginTop: 4 },
  errorBanner: {
    background: "#fef2f2",
    border: "0.5px solid #fecaca",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 12,
    color: "#991b1b",
    marginTop: 10,
  },
  queueToggle: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 16px",
    border: "1.5px solid",
    borderRadius: 10,
    cursor: "pointer",
    marginTop: 8,
    transition: "all 0.2s",
  },
  toggle: {
    width: 42,
    height: 24,
    borderRadius: 12,
    position: "relative",
    transition: "background 0.2s",
    flexShrink: 0,
  },
  toggleKnob: {
    position: "absolute",
    top: 3,
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#fff",
    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
    transition: "transform 0.2s",
  },
  queueNote: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    background: "#F0FAF6",
    border: "0.5px solid #A8DFC9",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 12,
    color: "#1a5c42",
    lineHeight: 1.5,
    marginTop: 10,
  },
  btnPrimary: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 20px",
    border: "none",
    borderRadius: 8,
    background: "#1D9E75",
    cursor: "pointer",
    fontSize: 13,
    color: "#fff",
    fontWeight: 500,
  },
  btnSecondary: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 16px",
    border: "0.5px solid rgba(0,0,0,0.12)",
    borderRadius: 8,
    background: "transparent",
    cursor: "pointer",
    fontSize: 13,
    color: "#555",
  },
};
