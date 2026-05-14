import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RoleSelector.css";

const TRUST_STATS = [
  ["30 sec", "to create a follow-up"],
  ["24/7", "patient record access"],
  ["AI", "prescription assistance"],
  ["QR", "emergency health card"],
];

const ADMIN_LOGIN_URL = "https://admin.docnudge.in/login";

const DOCTOR_FEATURES = [
  ["ti-calendar-event", "Date-wise appointments"],
  ["ti-sparkles", "AI prescription builder"],
  ["ti-brand-whatsapp", "Automated reminders"],
  ["ti-heart-rate-monitor", "Recovery center"],
];

const PATIENT_FEATURES = [
  ["ti-file-text", "Prescriptions in one place"],
  ["ti-test-pipe", "Lab reports and uploads"],
  ["ti-calendar-plus", "Appointment history"],
  ["ti-qrcode", "Emergency QR card"],
];

const FEATURE_SECTIONS = [
  {
    eyebrow: "For clinics",
    title: "One calm workflow for daily OPD",
    copy: "Appointments, prescriptions, follow-ups and patient recovery signals stay connected in a clean clinic dashboard.",
    items: ["Queue and appointment control", "AI-assisted prescriptions", "Missed follow-up recovery"],
  },
  {
    eyebrow: "For patients",
    title: "A health wallet that travels with them",
    copy: "Patients can view prescriptions, upload reports and share an emergency card without calling the clinic for every record.",
    items: ["Digital prescriptions", "Lab report access", "Emergency QR profile"],
  },
];

const STEPS = [
  ["01", "Set up clinic access", "Create clinic staff accounts and keep doctor, front desk and admin workflows separated."],
  ["02", "Run the OPD day", "Capture visits, write prescriptions, schedule follow-ups and keep patient records synced."],
  ["03", "Recover missed care", "Use reminders and recovery views to bring patients back before care gaps grow."],
];

const TESTIMONIALS = [
  {
    quote:
      "DocNudge gives our team a simple way to keep prescriptions, reminders and patient follow-ups in one flow.",
    name: "Dr. Meera Rao",
    role: "Clinic owner",
  },
  {
    quote:
      "Patients no longer call for old prescriptions. Their records are available when they need them.",
    name: "Amit Varma",
    role: "Operations lead",
  },
];

const DEMO_INITIAL = {
  name: "",
  clinic: "",
  phone: "",
  role: "",
  message: "",
};

export default function RoleSelector({ doctorSignedIn = false, patientSignedIn = false }) {
  const navigate = useNavigate();
  const [demo, setDemo] = useState(DEMO_INITIAL);
  const [submitted, setSubmitted] = useState(false);

  const doctorTarget = doctorSignedIn ? "/doctor/dashboard" : "/doctor/login";
  const patientTarget = patientSignedIn ? "/patient" : "/patient/login";

  function scrollToDemo() {
    document.getElementById("demo")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateDemo(event) {
    const { name, value } = event.target;
    setDemo((current) => ({ ...current, [name]: value }));
    if (submitted) setSubmitted(false);
  }

  function submitDemo(event) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="landing-page">
      <header className="landing-nav" aria-label="DocNudge navigation">
        <button className="brand-mark" onClick={() => navigate("/")} aria-label="DocNudge home">
          <img src="/logo.png" alt="" />
          <span>DocNudge</span>
        </button>

        <nav className="nav-links" aria-label="Landing page sections">
          <a href="#features">Features</a>
          <a href="#access">Access</a>
          <a href="#how">How it works</a>
          <a href="#demo">Demo</a>
        </nav>

        <div className="nav-actions">
          <a className="ghost-btn" href={ADMIN_LOGIN_URL}>
            Admin login
          </a>
          <button className="primary-btn" onClick={scrollToDemo}>
            Request demo
            <i className="ti ti-arrow-right" aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow">AI clinic workflow + patient health wallet</div>
          <h1>Run follow-ups, prescriptions and patient records without the usual clinic chaos.</h1>
          <p>
            DocNudge helps clinics manage OPD visits, automate reminders and give patients a secure place for
            prescriptions, lab reports and emergency health information.
          </p>

          <div className="hero-actions">
            <button className="primary-btn large" onClick={scrollToDemo}>
              Request a demo
              <i className="ti ti-arrow-right" aria-hidden="true" />
            </button>
            <button className="outline-btn large" onClick={() => navigate(doctorTarget)}>
              {doctorSignedIn ? "Go to dashboard" : "Doctor login"}
            </button>
          </div>

        </div>

        <div className="hero-visual" aria-label="DocNudge dashboard preview">
          <div className="mock-window">
            <div className="mock-topbar">
              <span />
              <span />
              <span />
              <strong>Today at CarePlus Clinic</strong>
            </div>
            <div className="mock-body">
              <aside className="mock-sidebar">
                <img src="/logo.png" alt="" />
                <span className="active-pill">OPD Queue</span>
                <span>Prescriptions</span>
                <span>Reminders</span>
                <span>Recovery</span>
              </aside>
              <section className="mock-content">
                <div className="brand-image-card">
                  <img src="/logo.png" alt="DocNudge clinic workflow" />
                  <div>
                    <strong>DocNudge live workspace</strong>
                    <span>Appointments, records and reminders in one branded clinic view.</span>
                  </div>
                </div>
                <div className="mock-header">
                  <div>
                    <small>Next patient</small>
                    <h2>Ramesh K.</h2>
                  </div>
                  <span>Follow-up due today</span>
                </div>
                <div className="mock-grid">
                  <Metric label="Appointments" value="28" tone="blue" />
                  <Metric label="Recovered" value="12" tone="teal" />
                  <Metric label="Pending" value="05" tone="amber" />
                </div>
                <div className="mock-rx">
                  <div>
                    <strong>AI prescription draft</strong>
                    <span>Amoxicillin 500 mg - after food - 5 days</span>
                  </div>
                  <button>Review</button>
                </div>
                <div className="mock-list">
                  {["WhatsApp reminder scheduled", "Lab report uploaded", "Emergency QR updated"].map((item) => (
                    <div key={item}>
                      <i className="ti ti-check" aria-hidden="true" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="DocNudge highlights">
        {TRUST_STATS.map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="section access-section" id="access">
        <SectionHead
          label="Choose your access"
          title="Separate portals for doctors and patients"
          copy="Each role has a focused entry point, so clinical tools and patient records stay in the right hands."
        />

        <div className="access-grid" aria-label="Choose your DocNudge role">
          <AccessCard
            tone="doctor"
            icon="ti-stethoscope"
            title="Doctor portal"
            copy="Manage appointments, patients, prescriptions and recovery from the clinic dashboard."
            features={DOCTOR_FEATURES}
            button={doctorSignedIn ? "Go to clinic dashboard" : "Log in as doctor"}
            onClick={() => navigate(doctorTarget)}
          />
          <AccessCard
            tone="patient"
            icon="ti-user-heart"
            title="Patient portal"
            copy="View prescriptions, lab reports, uploads and emergency details from a personal health wallet."
            features={PATIENT_FEATURES}
            button={patientSignedIn ? "Go to my health wallet" : "Log in as patient"}
            onClick={() => navigate(patientTarget)}
          />
        </div>
      </section>

      <section className="section" id="features">
        <SectionHead
          label="What DocNudge brings together"
          title="Designed around real clinic follow-up work"
          copy="The product is built for the daily reality of busy outpatient clinics: simple screens, clear actions and fewer manual follow-up gaps."
        />
        <div className="feature-grid">
          {FEATURE_SECTIONS.map((feature) => (
            <article className="feature-panel" key={feature.title}>
              <span>{feature.eyebrow}</span>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
              <ul>
                {feature.items.map((item) => (
                  <li key={item}>
                    <i className="ti ti-circle-check" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="section split-section" id="how">
        <div>
          <SectionHead
            label="How it works"
            title="A simple operating rhythm for every clinic day"
            copy="Start with clinic access, run visits through DocNudge and keep follow-up recovery visible after patients leave."
            align="left"
          />
          <div className="steps">
            {STEPS.map(([number, title, copy]) => (
              <article key={number} className="step-row">
                <span>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="care-card">
          <div className="care-card-header">
            <span>Recovery view</span>
            <strong>Patients needing action</strong>
          </div>
          {[
            ["Overdue follow-up", "7 patients", "Call today"],
            ["Reminder failed", "3 patients", "Verify number"],
            ["High value recovery", "5 patients", "Send nudge"],
          ].map(([title, count, action]) => (
            <div className="care-row" key={title}>
              <div>
                <strong>{title}</strong>
                <span>{count}</span>
              </div>
              <button>{action}</button>
            </div>
          ))}
        </aside>
      </section>

      <section className="section testimonial-section" aria-label="Customer feedback">
        <SectionHead
          label="Trusted by growing clinics"
          title="Built to feel calm on a busy OPD day"
          copy="DocNudge keeps the clinical workflow focused while giving patients better access to their records."
        />
        <div className="testimonial-grid">
          {TESTIMONIALS.map((item) => (
            <blockquote key={item.name}>
              <p>"{item.quote}"</p>
              <footer>
                <strong>{item.name}</strong>
                <span>{item.role}</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="section demo-section" id="demo">
        <div className="demo-copy">
          <SectionHead
            label="Request demo"
            title="See DocNudge with your clinic workflow"
            copy="Tell us a little about your clinic. We will prepare a guided walkthrough for doctors and front desk staff."
            align="left"
          />
          <div className="demo-note">
            <i className="ti ti-lock" aria-hidden="true" />
            <span>No backend submission is made in this version. Your request is confirmed on this page.</span>
          </div>
        </div>

        <form className="demo-form" onSubmit={submitDemo}>
          <label>
            Your name
            <input name="name" value={demo.name} onChange={updateDemo} placeholder="Dr. Priya Sharma" required />
          </label>
          <label>
            Clinic name
            <input name="clinic" value={demo.clinic} onChange={updateDemo} placeholder="CarePlus Clinic" required />
          </label>
          <label>
            Phone or WhatsApp
            <input
              name="phone"
              value={demo.phone}
              onChange={updateDemo}
              placeholder="+91 98765 43210"
              required
            />
          </label>
          <label>
            I am interested as
            <select name="role" value={demo.role} onChange={updateDemo} required>
              <option value="">Select role</option>
              <option value="doctor">Doctor or clinic owner</option>
              <option value="frontdesk">Front desk or operations</option>
              <option value="owner">Clinic owner</option>
            </select>
          </label>
          <label className="full">
            What should we show you?
            <textarea
              name="message"
              value={demo.message}
              onChange={updateDemo}
              placeholder="Appointments, prescriptions, patient wallet, reminders..."
              rows="4"
            />
          </label>
          <button className="primary-btn form-submit" type="submit">
            Confirm demo request
            <i className="ti ti-arrow-right" aria-hidden="true" />
          </button>
          {submitted && (
            <p className="form-success" role="status">
              Thanks, {demo.name}. Your demo request is ready for follow-up.
            </p>
          )}
        </form>
      </section>

      <section className="final-cta">
        <div>
          <span>Ready to reduce missed follow-ups?</span>
          <h2>Bring clinic operations and patient records into one DocNudge workflow.</h2>
        </div>
        <div>
          <button className="primary-btn" onClick={scrollToDemo}>
            Request demo
          </button>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-brand">
          <img src="/logo.png" alt="" />
          <div>
            <strong>DocNudge</strong>
            <span>AI-powered clinic workflow and patient health wallet</span>
          </div>
        </div>
        <div className="footer-links">
          <a href="mailto:support@docnudge.in">support@docnudge.in</a>
        </div>
      </footer>
    </main>
  );
}

function SectionHead({ label, title, copy, align = "center" }) {
  return (
    <div className={`section-head ${align === "left" ? "left" : ""}`}>
      <span>{label}</span>
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div className={`metric ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function AccessCard({ tone, icon, title, copy, features, button, onClick, href }) {
  const content = (
    <>
      <div className="access-icon">
        <i className={`ti ${icon}`} aria-hidden="true" />
      </div>
      <h3>{title}</h3>
      <p>{copy}</p>
      <ul>
        {features.map(([featureIcon, label]) => (
          <li key={label}>
            <i className={`ti ${featureIcon}`} aria-hidden="true" />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </>
  );

  if (href) {
    return (
      <article className={`access-card ${tone}`}>
        {content}
        <a className="access-button" href={href}>
          {button}
          <i className="ti ti-arrow-up-right" aria-hidden="true" />
        </a>
      </article>
    );
  }

  return (
    <article className={`access-card ${tone}`}>
      {content}
      <button className="access-button" onClick={onClick}>
        {button}
        <i className="ti ti-arrow-right" aria-hidden="true" />
      </button>
    </article>
  );
}
