import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AIPrescriptionModal from "../components/AIPrescriptionModal";
import {
  addLabResult,
  addVisit,
  getLabResults,
  getPatient,
  getPrescriptions,
  getVisits,
  sendWhatsAppPrescription,
} from "../api";

const SHEET_STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; background: #eef2f7; font-family: Arial, sans-serif; color: #1a2035; }
  .opd-sheet { background: #fff; color: #1a2035; padding: 28px; font-size: 13px; line-height: 1.5; }
  .opd-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 2px solid #1e40af; }
  .opd-logo-area { display: flex; align-items: center; gap: 12px; }
  .opd-logo-box { width: 48px; height: 48px; background: #1e40af; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 22px; font-weight: 800; }
  .opd-clinic-name { font-size: 1.35rem; font-weight: 900; color: #1e40af; letter-spacing: -0.01em; }
  .opd-tagline { font-size: 0.75rem; color: #64748b; margin-top: 1px; }
  .opd-title { font-size: 1.5rem; font-weight: 900; color: #1e40af; text-align: right; }
  .opd-datetime { font-size: 0.78rem; color: #475569; margin-top: 4px; text-align: right; }
  .opd-section { margin-bottom: 14px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .opd-section-title { background: #eff6ff; padding: 7px 14px; font-size: 0.75rem; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: 0.07em; border-bottom: 1px solid #dbeafe; }
  .opd-section-body { padding: 10px 14px; }
  .opd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
  .opd-row { display: flex; gap: 6px; padding: 2px 0; font-size: 12px; }
  .opd-row label { font-weight: 700; min-width: 110px; color: #475569; flex-shrink: 0; }
  .opd-row span { color: #1a2035; }
  .opd-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .opd-rx-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
  .opd-rx-table th { background: #f8fafc; padding: 7px 10px; font-size: 0.7rem; font-weight: 800; color: #475569; text-align: left; border: 1px solid #e2e8f0; }
  .opd-rx-table td { padding: 7px 10px; border: 1px solid #e2e8f0; vertical-align: top; color: #1a2035; }
  .opd-rx-table tbody tr:nth-child(even) td { background: #f8fafc; }
  .opd-empty { color: #94a3b8; font-style: italic; }
  .opd-note { font-size: 11px; color: #475569; margin-top: 8px; font-style: italic; }
  .opd-inv-list { list-style: none; margin: 0; padding: 0; }
  .opd-inv-list li { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px solid #eef2f7; font-size: 12px; }
  .opd-inv-list li:last-child { border-bottom: none; }
  .opd-followup { font-size: 12px; }
  .opd-followup div { margin-bottom: 4px; }
  .opd-signature { border-top: 1px solid #e2e8f0; margin-top: 14px; padding-top: 14px; display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; }
  .opd-doc-sig { text-align: left; }
  .opd-sig-line { border-bottom: 1.5px solid #1a2035; width: 140px; margin-bottom: 6px; height: 28px; }
  .opd-sig-name { font-weight: 800; font-size: 12px; }
  .opd-sig-deg { font-size: 11px; color: #475569; }
  .opd-address-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; text-align: right; }
  .opd-address-box .clinic-n { font-weight: 800; color: #1e40af; font-size: 12px; margin-bottom: 3px; }
  .opd-address-box div { font-size: 11px; color: #475569; }
  .opd-footer-msg { text-align: center; margin-top: 12px; font-size: 11px; color: #94a3b8; font-style: italic; }
`;

export default function OPSheet({ user }) {
  const { patientId } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [activeMode, setActiveMode] = useState("doctor");
  const [showVisit, setShowVisit] = useState(false);
  const [showPrescription, setShowPrescription] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState(null);
  const [showLab, setShowLab] = useState(false);

  useEffect(() => {
    loadAll();
  }, [patientId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [patientData, visitData, prescriptionData, labData] = await Promise.all([
        getPatient(patientId),
        getVisits(patientId),
        getPrescriptions(patientId),
        getLabResults(patientId),
      ]);
      setPatient(patientData);
      setVisits(sortItems(normalizeList(visitData), ["visit_date", "next_visit", "created_at"]));
      setPrescriptions(sortItems(normalizeList(prescriptionData), ["created_at", "updated_at"]));
      setLabs(sortItems(normalizeList(labData), ["test_date", "created_at"]));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function flash(text) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3000);
  }

  async function handleSendWhatsApp() {
    setSending(true);
    try {
      await sendWhatsAppPrescription(patientId);
      flash("Prescription sent on WhatsApp");
    } catch {
      alert("Failed to send prescription");
    } finally {
      setSending(false);
    }
  }

  function handlePrintSheet() {
    const printable = buildSheetMarkup(buildSheetData({ patient, visits, prescriptions, labs, user }));
    const popup = window.open("", "_blank", "width=900,height=1100");

    if (!popup) {
      alert("Please allow pop-ups to print the OP sheet.");
      return;
    }

    popup.document.write(`
      <html>
        <head>
          <title>DocNudge OP Sheet</title>
          <style>${SHEET_STYLES}</style>
        </head>
        <body>
          ${printable}
          <script>
            window.onload = function () {
              window.print();
            };
          <\/script>
        </body>
      </html>
    `);
    popup.document.close();
  }

  if (loading) return <div style={styles.loading}>Loading patient...</div>;
  if (!patient) return <div style={styles.loading}>Patient not found.</div>;

  const latestPrescription = prescriptions[0] || null;
  const latestVisit = visits[0] || null;
  const latestLabs = labs.slice(0, 4);
  const initials = getInitials(patient.name);
  const clinicName = user?.clinic_name || "DocNudge Clinic";
  const doctorName = user?.doctor_name || user?.email?.split("@")[0] || "Doctor";
  const designation = user?.designation || "General Physician";
  const sheetMarkup = buildSheetMarkup(buildSheetData({ patient, visits, prescriptions, labs, user }));

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <div style={styles.topbarLeft}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            <i className="ti ti-arrow-left" style={{ fontSize: 14 }} /> Back
          </button>
          <div>
            <div style={styles.breadcrumb}>Patients / {patient.name} / OP sheet</div>
            <div style={styles.topTitle}>{clinicName}</div>
          </div>
        </div>
        <div style={styles.topActions}>
          {message && <span style={styles.message}>{message}</span>}
          <button style={styles.previewBtn} onClick={handlePrintSheet}>
            <i className="ti ti-printer" style={{ fontSize: 14 }} /> Print sheet
          </button>
          <button style={styles.whatsAppBtn} onClick={handleSendWhatsApp} disabled={sending}>
            <i className="ti ti-brand-whatsapp" style={{ fontSize: 15 }} />
            {sending ? "Sending..." : "Send WhatsApp"}
          </button>
        </div>
      </div>

      <div style={styles.hero}>
        <div style={styles.heroPrimary}>
          <div style={styles.heroBadge}>Live OPD workspace</div>
          <div style={styles.heroHeading}>A cleaner OP sheet view for consultation, prescription, and follow-up.</div>
          <div style={styles.heroCopy}>
            Patient details, clinical context, and the printable sheet stay in one place so front desk and doctor can work from the same screen.
          </div>
          <div style={styles.heroActions}>
            <button style={styles.primaryAction} onClick={() => setShowPrescription(true)}>
              <i className="ti ti-sparkles" style={{ fontSize: 14 }} /> Write prescription
            </button>
            <button style={styles.secondaryAction} onClick={() => setShowVisit(true)}>
              <i className="ti ti-calendar-plus" style={{ fontSize: 14 }} /> Add visit
            </button>
            <button style={styles.secondaryAction} onClick={() => setShowLab(true)}>
              <i className="ti ti-test-pipe" style={{ fontSize: 14 }} /> Add lab result
            </button>
          </div>
        </div>
        <div style={styles.heroStats}>
          <MetricCard icon="ti-users" label="Visits" value={String(visits.length)} tone="green" />
          <MetricCard icon="ti-pill" label="Rx saved" value={String(prescriptions.length)} tone="blue" />
          <MetricCard icon="ti-microscope" label="Labs" value={String(labs.length)} tone="amber" />
        </div>
      </div>

      <div style={styles.modeBar}>
        <div style={styles.modeTabs}>
          <button
            style={{ ...styles.modeTab, ...(activeMode === "reception" ? styles.modeTabActiveBlue : {}) }}
            onClick={() => setActiveMode("reception")}
          >
            <i className="ti ti-user-heart" style={{ fontSize: 14 }} /> Reception
          </button>
          <button
            style={{ ...styles.modeTab, ...(activeMode === "doctor" ? styles.modeTabActiveGreen : {}) }}
            onClick={() => setActiveMode("doctor")}
          >
            <i className="ti ti-stethoscope" style={{ fontSize: 14 }} /> Doctor
          </button>
        </div>
        <div style={styles.modeLabel}>
          {activeMode === "doctor"
            ? "Doctor mode highlights clinical sections and prescription tools."
            : "Reception mode keeps patient, communication, and follow-up details front and center."}
        </div>
      </div>

      <div style={styles.body}>
        <div style={styles.mainColumn}>
          <SectionCard
            icon="ti-user-circle"
            title="Patient Details"
            tag="Reception"
            tagTone="blue"
          >
            <div style={styles.patientCard}>
              <div style={styles.avatar}>{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.patientName}>{patient.name}</div>
                <div style={styles.patientMeta}>
                  {[patient.age ? `${patient.age} yrs` : "", patient.gender, patient.phone || patient.mobile].filter(Boolean).join(" | ") || "Basic profile pending"}
                </div>
                <div style={styles.tagRow}>
                  {patient.condition && <Tag>{patient.condition}</Tag>}
                  {patient.followup_type && <Tag tone="blue">{patient.followup_type}</Tag>}
                  <Tag tone={latestVisit?.status === "missed" ? "amber" : "green"}>{labelizeStatus(latestVisit?.status || "upcoming")}</Tag>
                </div>
              </div>
              <div style={styles.summaryPill}>
                <i className="ti ti-id-badge" style={{ fontSize: 13 }} />
                ID {patient.id || patientId}
              </div>
            </div>
            <div style={styles.detailGrid}>
              <DetailItem label="Mobile" value={patient.phone || patient.mobile || "-"} />
              <DetailItem label="Gender" value={patient.gender || "-"} />
              <DetailItem label="Age" value={patient.age ? `${patient.age} years` : "-"} />
              <DetailItem label="Next follow-up" value={formatDate(latestVisit?.next_visit) || "-"} />
              <DetailItem label="Address" value={patient.address || "Not recorded"} full />
            </div>
          </SectionCard>

          <SectionCard
            icon="ti-notes"
            title="Consultation Snapshot"
            tag={activeMode === "doctor" ? "Doctor focus" : "Shared"}
            tagTone={activeMode === "doctor" ? "green" : "blue"}
          >
            <div style={styles.snapshotGrid}>
              <SnapshotBlock
                title="Chief complaint"
                value={latestVisit?.notes || patient.condition || "No complaint or visit notes recorded yet."}
              />
              <SnapshotBlock
                title="Diagnosis"
                value={patient.condition || latestPrescription?.notes || "Diagnosis not recorded yet."}
              />
              <SnapshotBlock
                title="Consultant"
                value={`${doctorName} | ${designation}`}
              />
              <SnapshotBlock
                title="Visit status"
                value={labelizeStatus(latestVisit?.status || "upcoming")}
              />
            </div>
          </SectionCard>

          <SectionCard
            icon="ti-pill"
            title="Prescription Workspace"
            tag="Doctor"
            tagTone="green"
            action={
              <div style={styles.inlineActions}>
                {latestPrescription && (
                  <button style={styles.smallBtn} onClick={() => setEditingPrescription(latestPrescription)}>
                    <i className="ti ti-pencil" style={{ fontSize: 12 }} /> Edit
                  </button>
                )}
                <button style={styles.smallBtn} onClick={() => setShowPrescription(true)}>
                  <i className="ti ti-plus" style={{ fontSize: 12 }} /> Write
                </button>
              </div>
            }
          >
            {latestPrescription ? (
              <>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <TableHeader>Medicine</TableHeader>
                      <TableHeader>Dosage</TableHeader>
                      <TableHeader>Frequency</TableHeader>
                      <TableHeader>Duration</TableHeader>
                    </tr>
                  </thead>
                  <tbody>
                    {(latestPrescription.medicines || []).map((medicine, index) => (
                      <tr key={index}>
                        <td style={styles.td}>
                          <strong>{medicine.name || "-"}</strong>
                        </td>
                        <td style={styles.td}>{medicine.dosage || medicine.dose || "-"}</td>
                        <td style={styles.td}>{medicine.frequency || "-"}</td>
                        <td style={styles.td}>{medicine.duration || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {latestPrescription.notes && <div style={styles.noteBox}>{latestPrescription.notes}</div>}
              </>
            ) : (
              <EmptyState
                icon="ti-prescription"
                title="No prescription added yet"
                description="Open the AI prescription flow, review the output, and save it back into the patient record."
                buttonLabel="Write with AI"
                onClick={() => setShowPrescription(true)}
              />
            )}
          </SectionCard>

          <SectionCard
            icon="ti-flask"
            title="Investigations And Labs"
            tag="Doctor"
            tagTone="green"
            action={
              <button style={styles.smallBtn} onClick={() => setShowLab(true)}>
                <i className="ti ti-plus" style={{ fontSize: 12 }} /> Add
              </button>
            }
          >
            {latestLabs.length === 0 ? (
              <EmptyState
                icon="ti-test-pipe"
                title="No lab results yet"
                description="Add routine lab values or reports so the OP sheet can show recent investigations."
                buttonLabel="Add lab result"
                onClick={() => setShowLab(true)}
              />
            ) : (
              <div style={styles.labList}>
                {latestLabs.map((lab) => (
                  <div key={lab.id || `${lab.test_name}-${lab.test_date}`} style={styles.labRow}>
                    <div>
                      <div style={styles.labName}>{lab.test_name}</div>
                      <div style={styles.labMeta}>{formatDate(lab.test_date) || "Undated"}{lab.reference_range ? ` | Ref: ${lab.reference_range}` : ""}</div>
                    </div>
                    <div style={styles.labValueWrap}>
                      <div style={styles.labValue}>{lab.result}</div>
                      <StatusChip tone={lab.status === "high" || lab.status === "low" ? "amber" : "green"}>
                        {labelizeStatus(lab.status || "normal")}
                      </StatusChip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon="ti-calendar-event"
            title="Follow-Up And Visit History"
            tag="Shared"
            tagTone="blue"
            action={
              <button style={styles.smallBtn} onClick={() => setShowVisit(true)}>
                <i className="ti ti-plus" style={{ fontSize: 12 }} /> New visit
              </button>
            }
          >
            <div style={styles.followUpBanner}>
              <div>
                <div style={styles.followUpLabel}>Next visit</div>
                <div style={styles.followUpValue}>{formatDate(latestVisit?.next_visit) || "Not scheduled"}</div>
              </div>
              <StatusChip tone={latestVisit?.status === "missed" ? "amber" : "blue"}>
                {labelizeStatus(latestVisit?.status || "upcoming")}
              </StatusChip>
            </div>
            {visits.length === 0 ? (
              <p style={styles.muted}>No visits added yet.</p>
            ) : (
              <div style={styles.historyList}>
                {visits.map((visit) => (
                  <div key={visit.id || `${visit.visit_date}-${visit.notes}`} style={styles.historyRow}>
                    <div style={styles.historyDot} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.historyDate}>{formatDate(visit.visit_date) || "-"}</div>
                      <div style={styles.historyNote}>{visit.notes || "No notes added for this visit."}</div>
                    </div>
                    <StatusChip tone={visit.status === "missed" ? "amber" : visit.status === "completed" ? "green" : "blue"}>
                      {labelizeStatus(visit.status || "upcoming")}
                    </StatusChip>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div style={styles.previewColumn}>
          <div style={styles.previewCard}>
            <div style={styles.previewHeader}>
              <div>
                <div style={styles.previewTitle}>
                  <span style={styles.liveDot} />
                  Live OP Sheet
                </div>
                <div style={styles.previewSub}>Updates from patient, visit, prescription, and lab records.</div>
              </div>
              <button style={styles.smallPreviewBtn} onClick={handlePrintSheet}>
                <i className="ti ti-download" style={{ fontSize: 12 }} /> PDF / Print
              </button>
            </div>
            <div style={styles.previewScroll}>
              <div style={styles.previewSheet} dangerouslySetInnerHTML={{ __html: sheetMarkup }} />
            </div>
          </div>
        </div>
      </div>

      {showVisit && (
        <AddVisitModal
          patientId={patientId}
          onClose={() => setShowVisit(false)}
          onSave={() => {
            setShowVisit(false);
            loadAll();
            flash("Visit saved");
          }}
        />
      )}
      {showPrescription && (
        <AIPrescriptionModal
          patientId={patientId}
          patient={patient}
          visits={visits}
          onClose={() => setShowPrescription(false)}
          onSave={() => {
            setShowPrescription(false);
            loadAll();
            flash("Prescription saved");
          }}
        />
      )}
      {editingPrescription && (
        <AIPrescriptionModal
          patientId={patientId}
          patient={patient}
          visits={visits}
          prescription={editingPrescription}
          onClose={() => setEditingPrescription(null)}
          onSave={() => {
            setEditingPrescription(null);
            loadAll();
            flash("Prescription updated");
          }}
        />
      )}
      {showLab && (
        <AddLabModal
          patientId={patientId}
          onClose={() => setShowLab(false)}
          onSave={() => {
            setShowLab(false);
            loadAll();
            flash("Lab result saved");
          }}
        />
      )}
    </div>
  );
}

function SectionCard({ icon, title, tag, tagTone, action, children }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardHeaderLeft}>
          <div style={styles.iconBubble}>
            <i className={`ti ${icon}`} style={{ fontSize: 15 }} />
          </div>
          <div>
            <div style={styles.cardTitle}>{title}</div>
          </div>
          {tag && <StatusChip tone={tagTone}>{tag}</StatusChip>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function MetricCard({ icon, label, value, tone }) {
  const toneMap = {
    green: { background: "rgba(22, 163, 74, 0.12)", color: "#14532d" },
    blue: { background: "rgba(37, 99, 235, 0.12)", color: "#1d4ed8" },
    amber: { background: "rgba(245, 158, 11, 0.12)", color: "#92400e" },
  };
  const currentTone = toneMap[tone] || toneMap.green;

  return (
    <div style={styles.metricCard}>
      <div style={{ ...styles.metricIcon, background: currentTone.background, color: currentTone.color }}>
        <i className={`ti ${icon}`} style={{ fontSize: 16 }} />
      </div>
      <div style={styles.metricValue}>{value}</div>
      <div style={styles.metricLabel}>{label}</div>
    </div>
  );
}

function DetailItem({ label, value, full = false }) {
  return (
    <div style={{ ...styles.detailItem, ...(full ? { gridColumn: "1 / -1" } : {}) }}>
      <div style={styles.detailLabel}>{label}</div>
      <div style={styles.detailValue}>{value}</div>
    </div>
  );
}

function SnapshotBlock({ title, value }) {
  return (
    <div style={styles.snapshotBlock}>
      <div style={styles.snapshotTitle}>{title}</div>
      <div style={styles.snapshotValue}>{value}</div>
    </div>
  );
}

function TableHeader({ children }) {
  return <th style={styles.th}>{children}</th>;
}

function Tag({ children, tone = "green" }) {
  const toneStyles = {
    green: { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" },
    blue: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
    amber: { background: "#fff7ed", color: "#b45309", border: "1px solid #fed7aa" },
  };

  return <span style={{ ...styles.tag, ...(toneStyles[tone] || toneStyles.green) }}>{children}</span>;
}

function StatusChip({ tone = "green", children }) {
  const toneStyles = {
    green: { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" },
    blue: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
    amber: { background: "#fff7ed", color: "#b45309", border: "1px solid #fed7aa" },
  };

  return <span style={{ ...styles.statusChip, ...(toneStyles[tone] || toneStyles.green) }}>{children}</span>;
}

function EmptyState({ icon, title, description, buttonLabel, onClick }) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>
        <i className={`ti ${icon}`} style={{ fontSize: 18 }} />
      </div>
      <div style={styles.emptyTitle}>{title}</div>
      <div style={styles.emptyDescription}>{description}</div>
      <button style={styles.smallBtn} onClick={onClick}>
        <i className="ti ti-plus" style={{ fontSize: 12 }} /> {buttonLabel}
      </button>
    </div>
  );
}

function AddVisitModal({ patientId, onClose, onSave }) {
  const [form, setForm] = useState({ visit_date: localDateString(), next_visit: "", notes: "", status: "upcoming" });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await addVisit({ ...form, patient_id: Number(patientId) });
      onSave();
    } catch {
      alert("Error saving visit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add visit" onClose={onClose}>
      <Field label="Visit date">
        <input type="date" style={styles.input} value={form.visit_date} onChange={(event) => setForm((current) => ({ ...current, visit_date: event.target.value }))} />
      </Field>
      <Field label="Next visit date">
        <input type="date" style={styles.input} value={form.next_visit} onChange={(event) => setForm((current) => ({ ...current, next_visit: event.target.value }))} />
      </Field>
      <Field label="Status">
        <select style={styles.input} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
          <option value="missed">Missed</option>
        </select>
      </Field>
      <Field label="Notes">
        <textarea rows={3} style={styles.input} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
      </Field>
      <ModalFooter onClose={onClose} onSave={submit} saving={saving} />
    </Modal>
  );
}

function AddLabModal({ patientId, onClose, onSave }) {
  const [form, setForm] = useState({ test_name: "", result: "", reference_range: "", test_date: localDateString(), status: "normal" });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await addLabResult({ ...form, patient_id: Number(patientId) });
      onSave();
    } catch {
      alert("Error saving lab result");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add lab result" onClose={onClose}>
      <Field label="Test name">
        <input style={styles.input} value={form.test_name} onChange={(event) => setForm((current) => ({ ...current, test_name: event.target.value }))} />
      </Field>
      <Field label="Result">
        <input style={styles.input} value={form.result} onChange={(event) => setForm((current) => ({ ...current, result: event.target.value }))} />
      </Field>
      <Field label="Reference range">
        <input style={styles.input} value={form.reference_range} onChange={(event) => setForm((current) => ({ ...current, reference_range: event.target.value }))} />
      </Field>
      <Field label="Test date">
        <input type="date" style={styles.input} value={form.test_date} onChange={(event) => setForm((current) => ({ ...current, test_date: event.target.value }))} />
      </Field>
      <Field label="Status">
        <select style={styles.input} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="low">Low</option>
        </select>
      </Field>
      <ModalFooter onClose={onClose} onSave={submit} saving={saving} />
    </Modal>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>{title || ""}</span>
          <button style={styles.closeBtn} onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div style={{ padding: "16px 20px 20px" }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

function ModalFooter({ onClose, onSave, saving }) {
  return (
    <div style={styles.modalFooter}>
      <button style={styles.modalBtnSecondary} onClick={onClose}>
        Cancel
      </button>
      <button style={styles.modalBtnPrimary} onClick={onSave} disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function sortItems(items, keys) {
  return [...items].sort((left, right) => {
    const leftValue = getFirstDate(left, keys);
    const rightValue = getFirstDate(right, keys);
    return rightValue - leftValue;
  });
}

function getFirstDate(item, keys) {
  for (const key of keys) {
    const raw = item?.[key];
    if (!raw) continue;
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date.getTime();
  }
  return 0;
}

function localDateString() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

function getInitials(name) {
  return (name || "DN")
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(value, includeTime = false) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  if (includeTime) {
    return `${date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  }

  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function labelizeStatus(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function buildSheetData({ patient, visits, prescriptions, labs, user }) {
  const latestVisit = visits[0] || null;
  const latestPrescription = prescriptions[0] || null;
  const clinicName = user?.clinic_name || "DocNudge Clinic";
  const doctorName = user?.doctor_name || user?.email?.split("@")[0] || "Doctor";
  const designation = user?.designation || "General Physician";

  return {
    clinicName,
    doctorName,
    designation,
    visitDate: formatDate(latestVisit?.visit_date || latestPrescription?.created_at || new Date(), true),
    patientId: patient?.id || "-",
    patientName: patient?.name || "-",
    ageGender: [patient?.age ? `${patient.age} yrs` : "", patient?.gender].filter(Boolean).join(" / ") || "-",
    mobile: patient?.phone || patient?.mobile || "-",
    address: patient?.address || "Not recorded",
    visitType: patient?.followup_type || labelizeStatus(latestVisit?.status || "General consultation"),
    condition: patient?.condition || "Not recorded",
    complaint: latestVisit?.notes || patient?.condition || "No chief complaint documented yet.",
    diagnosis: patient?.condition || latestPrescription?.notes || "Diagnosis not recorded yet.",
    consultant: `${doctorName} (${designation})`,
    notes: latestPrescription?.notes || latestVisit?.notes || "",
    medicines: Array.isArray(latestPrescription?.medicines) ? latestPrescription.medicines : [],
    labs: labs.slice(0, 6),
    followUpDate: formatDate(latestVisit?.next_visit),
    followUpStatus: labelizeStatus(latestVisit?.status || "Upcoming"),
    followUpNotes: latestVisit?.notes || "",
  };
}

function buildSheetMarkup(data) {
  const medicineRows = data.medicines.length
    ? data.medicines
        .map(
          (medicine, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(medicine.name || "-")}</td>
              <td>${escapeHtml(medicine.dosage || medicine.dose || "-")}</td>
              <td>${escapeHtml(medicine.frequency || "-")}</td>
              <td>${escapeHtml(medicine.duration || "-")}</td>
            </tr>
          `,
        )
        .join("")
    : `
      <tr>
        <td>1</td>
        <td colspan="4" class="opd-empty">Prescription has not been added yet.</td>
      </tr>
    `;

  const labRows = data.labs.length
    ? data.labs
        .map(
          (lab) => `
            <li>
              <span>${escapeHtml(lab.test_name || "Lab entry")}</span>
              <span>${escapeHtml(lab.result || "-")} ${lab.status ? `(${escapeHtml(labelizeStatus(lab.status))})` : ""}</span>
            </li>
          `,
        )
        .join("")
    : `<li><span class="opd-empty">No investigations recorded yet.</span></li>`;

  return `
    <div class="opd-sheet">
      <div class="opd-head">
        <div class="opd-logo-area">
          <div class="opd-logo-box">DN</div>
          <div>
            <div class="opd-clinic-name">${escapeHtml(data.clinicName)}</div>
            <div class="opd-tagline">Care simplified for every visit</div>
          </div>
        </div>
        <div>
          <div class="opd-title">OP SHEET</div>
          <div class="opd-datetime">Date: ${escapeHtml(data.visitDate || formatDate(new Date(), true))}</div>
        </div>
      </div>

      <div class="opd-section">
        <div class="opd-section-title">Patient Details</div>
        <div class="opd-section-body opd-grid">
          <div class="opd-row"><label>Patient ID :</label><span>${escapeHtml(String(data.patientId))}</span></div>
          <div class="opd-row"><label>Address :</label><span>${escapeHtml(data.address)}</span></div>
          <div class="opd-row"><label>Name :</label><span>${escapeHtml(data.patientName)}</span></div>
          <div class="opd-row"><label>Visit Type :</label><span>${escapeHtml(data.visitType)}</span></div>
          <div class="opd-row"><label>Age / Gender :</label><span>${escapeHtml(data.ageGender)}</span></div>
          <div class="opd-row"><label>Condition :</label><span>${escapeHtml(data.condition)}</span></div>
          <div class="opd-row"><label>Mobile No. :</label><span>${escapeHtml(data.mobile)}</span></div>
          <div class="opd-row"><label>Consultant :</label><span><strong>${escapeHtml(data.consultant)}</strong></span></div>
        </div>
      </div>

      <div class="opd-section">
        <div class="opd-section-title">Chief Complaint</div>
        <div class="opd-section-body">${escapeHtml(data.complaint)}</div>
      </div>

      <div class="opd-section">
        <div class="opd-two-col">
          <div style="border-right:1px solid #e2e8f0;">
            <div class="opd-section-title">Diagnosis</div>
            <div class="opd-section-body">${escapeHtml(data.diagnosis)}</div>
          </div>
          <div>
            <div class="opd-section-title">Clinical Notes</div>
            <div class="opd-section-body">${data.notes ? nl2br(escapeHtml(data.notes)) : '<span class="opd-empty">No additional notes recorded.</span>'}</div>
          </div>
        </div>
      </div>

      <div class="opd-section">
        <div class="opd-section-title">Prescription</div>
        <div class="opd-section-body">
          <table class="opd-rx-table">
            <thead>
              <tr>
                <th style="width:36px;">S.No.</th>
                <th>Medicine</th>
                <th>Dosage</th>
                <th>Frequency</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>${medicineRows}</tbody>
          </table>
          ${data.notes ? `<div class="opd-note"><strong>Note:</strong> ${escapeHtml(data.notes)}</div>` : ""}
        </div>
      </div>

      <div class="opd-section">
        <div class="opd-two-col">
          <div style="border-right:1px solid #e2e8f0;">
            <div class="opd-section-title">Investigations</div>
            <div class="opd-section-body">
              <ul class="opd-inv-list">${labRows}</ul>
            </div>
          </div>
          <div>
            <div class="opd-section-title">Follow Up</div>
            <div class="opd-section-body opd-followup">
              <div>Next review: <strong>${escapeHtml(data.followUpDate || "Not scheduled")}</strong></div>
              <div>Status: <strong>${escapeHtml(data.followUpStatus)}</strong></div>
              ${data.followUpNotes ? `<div style="color:#64748b;margin-top:4px;">${escapeHtml(data.followUpNotes)}</div>` : ""}
            </div>
          </div>
        </div>
      </div>

      <div class="opd-signature">
        <div class="opd-doc-sig">
          <div class="opd-sig-line"></div>
          <div class="opd-sig-name">${escapeHtml(data.doctorName)}</div>
          <div class="opd-sig-deg">${escapeHtml(data.designation)}</div>
          <div class="opd-sig-deg">DocNudge digital consultation sheet</div>
        </div>
        <div class="opd-address-box">
          <div class="clinic-n">${escapeHtml(data.clinicName)}</div>
          <div>Generated from DocNudge dashboard</div>
          <div>Patient communication ready</div>
          <div>WhatsApp and print friendly</div>
        </div>
      </div>

      <div class="opd-footer-msg">Thank you for visiting. Please follow the prescribed advice and review schedule.</div>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function nl2br(value) {
  return String(value).replaceAll("\n", "<br />");
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #edf3fb 0%, #f8fafc 32%, #f5f7fb 100%)",
    fontFamily: "'DM Sans', sans-serif",
    color: "#0f172a",
    paddingBottom: 28,
  },
  loading: { padding: 48, textAlign: "center", color: "#64748b", fontSize: 14, fontFamily: "'DM Sans', sans-serif" },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: "18px 22px 10px",
    flexWrap: "wrap",
  },
  topbarLeft: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 },
  breadcrumb: { fontSize: 12, color: "#64748b" },
  topTitle: { fontSize: 18, fontWeight: 800, color: "#0f172a" },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 14px",
    borderRadius: 12,
    border: "1px solid #dbe6f3",
    background: "#fff",
    color: "#475569",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
  },
  topActions: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  message: { fontSize: 12, color: "#166534", fontWeight: 700 },
  previewBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #dbe6f3",
    background: "#fff",
    color: "#475569",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
  },
  whatsAppBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 16px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #1faa59, #22c55e)",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 800,
    boxShadow: "0 14px 30px rgba(34, 197, 94, 0.25)",
  },
  hero: {
    margin: "0 22px 16px",
    padding: 22,
    borderRadius: 26,
    background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #22c55e 130%)",
    color: "#fff",
    display: "flex",
    gap: 18,
    justifyContent: "space-between",
    flexWrap: "wrap",
    boxShadow: "0 24px 60px rgba(29, 78, 216, 0.18)",
  },
  heroPrimary: { maxWidth: 760, minWidth: 260, flex: 1 },
  heroBadge: {
    display: "inline-flex",
    padding: "5px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.14)",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  heroHeading: { marginTop: 14, fontSize: 28, lineHeight: 1.15, fontWeight: 800, maxWidth: 780 },
  heroCopy: { marginTop: 10, fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.86)", maxWidth: 720 },
  heroActions: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 },
  primaryAction: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "11px 15px",
    borderRadius: 12,
    border: "none",
    background: "#fff",
    color: "#0f172a",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 800,
  },
  secondaryAction: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "11px 15px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
  },
  heroStats: { display: "grid", gridTemplateColumns: "repeat(3, minmax(120px, 1fr))", gap: 10, minWidth: 280, alignSelf: "stretch" },
  metricCard: {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 18,
    padding: "16px 14px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 120,
  },
  metricIcon: { width: 36, height: 36, borderRadius: 12, display: "grid", placeItems: "center" },
  metricValue: { marginTop: 18, fontSize: 28, fontWeight: 800 },
  metricLabel: { fontSize: 12, color: "rgba(255,255,255,0.82)" },
  modeBar: {
    margin: "0 22px 16px",
    background: "rgba(255,255,255,0.92)",
    border: "1px solid #dce7f5",
    borderRadius: 18,
    padding: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    boxShadow: "0 14px 40px rgba(15, 23, 42, 0.05)",
  },
  modeTabs: { display: "flex", gap: 8, flexWrap: "wrap" },
  modeTab: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 14px",
    borderRadius: 12,
    border: "1px solid #dbe6f3",
    background: "#f8fafc",
    color: "#64748b",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
  },
  modeTabActiveGreen: { background: "#f0fdf4", color: "#166534", borderColor: "#bbf7d0" },
  modeTabActiveBlue: { background: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" },
  modeLabel: { fontSize: 13, color: "#64748b" },
  body: {
    display: "flex",
    gap: 18,
    padding: "0 22px",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  mainColumn: { flex: "1 1 760px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 },
  previewColumn: { flex: "0 1 420px", width: 420, minWidth: "min(100%, 320px)" },
  card: {
    background: "rgba(255,255,255,0.95)",
    border: "1px solid #dde7f3",
    borderRadius: 22,
    padding: 18,
    boxShadow: "0 18px 50px rgba(15, 23, 42, 0.06)",
    backdropFilter: "blur(12px)",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" },
  cardHeaderLeft: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 12,
    background: "linear-gradient(135deg, #eff6ff, #dcfce7)",
    color: "#1d4ed8",
    display: "grid",
    placeItems: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: 800, color: "#0f172a" },
  inlineActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  patientCard: { display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
    background: "linear-gradient(135deg, #dbeafe, #dcfce7)",
    color: "#1d4ed8",
    display: "grid",
    placeItems: "center",
    fontSize: 20,
    fontWeight: 800,
  },
  patientName: { fontSize: 20, fontWeight: 800, color: "#0f172a" },
  patientMeta: { fontSize: 13, color: "#64748b", marginTop: 3 },
  summaryPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 12,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#475569",
    fontSize: 12,
    fontWeight: 700,
  },
  tagRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 },
  tag: { display: "inline-flex", alignItems: "center", padding: "5px 9px", borderRadius: 999, fontSize: 12, fontWeight: 700 },
  statusChip: { display: "inline-flex", alignItems: "center", padding: "5px 9px", borderRadius: 999, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" },
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 16 },
  detailItem: { padding: 13, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" },
  detailLabel: { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 },
  detailValue: { marginTop: 6, fontSize: 14, color: "#0f172a", lineHeight: 1.55 },
  snapshotGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
  snapshotBlock: { padding: 14, borderRadius: 16, background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)", border: "1px solid #e2e8f0", minHeight: 110 },
  snapshotTitle: { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 },
  snapshotValue: { marginTop: 8, fontSize: 14, lineHeight: 1.65, color: "#0f172a", whiteSpace: "pre-wrap" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    padding: "0 0 10px",
    textAlign: "left",
    color: "#64748b",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid #e2e8f0",
  },
  td: { padding: "10px 0", borderBottom: "1px solid #eef2f7", color: "#0f172a", verticalAlign: "top" },
  noteBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    fontSize: 13,
    color: "#475569",
    lineHeight: 1.6,
  },
  emptyState: { padding: "22px 8px 10px", textAlign: "center" },
  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    background: "#eff6ff",
    color: "#1d4ed8",
    display: "grid",
    placeItems: "center",
    margin: "0 auto 10px",
  },
  emptyTitle: { fontSize: 15, fontWeight: 800, color: "#0f172a" },
  emptyDescription: { fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: "6px auto 12px", maxWidth: 430 },
  smallBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 12px",
    borderRadius: 12,
    border: "1px solid #dbe6f3",
    background: "#fff",
    color: "#475569",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  },
  labList: { display: "flex", flexDirection: "column", gap: 10 },
  labRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    flexWrap: "wrap",
  },
  labName: { fontSize: 14, fontWeight: 700, color: "#0f172a" },
  labMeta: { marginTop: 4, fontSize: 12, color: "#64748b" },
  labValueWrap: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  labValue: { fontSize: 15, fontWeight: 800, color: "#0f172a" },
  followUpBanner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    background: "linear-gradient(135deg, #eff6ff, #f8fafc)",
    border: "1px solid #dbeafe",
    marginBottom: 14,
    flexWrap: "wrap",
  },
  followUpLabel: { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 },
  followUpValue: { marginTop: 5, fontSize: 18, fontWeight: 800, color: "#0f172a" },
  muted: { fontSize: 13, color: "#94a3b8" },
  historyList: { display: "flex", flexDirection: "column", gap: 10 },
  historyRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    background: "#fff",
    border: "1px solid #e2e8f0",
  },
  historyDot: { width: 10, height: 10, borderRadius: "50%", background: "#22c55e", marginTop: 6, flexShrink: 0 },
  historyDate: { fontSize: 13, fontWeight: 800, color: "#0f172a" },
  historyNote: { marginTop: 4, fontSize: 13, color: "#475569", lineHeight: 1.55 },
  previewCard: {
    position: "sticky",
    top: 16,
    background: "rgba(255,255,255,0.95)",
    border: "1px solid #dde7f3",
    borderRadius: 22,
    boxShadow: "0 18px 50px rgba(15, 23, 42, 0.06)",
    overflow: "hidden",
  },
  previewHeader: {
    padding: 16,
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  previewTitle: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800, color: "#0f172a" },
  previewSub: { fontSize: 12, color: "#64748b", marginTop: 3, maxWidth: 260 },
  liveDot: { width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 6px rgba(34, 197, 94, 0.12)" },
  smallPreviewBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 11px",
    borderRadius: 10,
    border: "1px solid #dbe6f3",
    background: "#fff",
    color: "#475569",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  },
  previewScroll: { maxHeight: "calc(100vh - 180px)", overflowY: "auto", background: "#eef2f7" },
  previewSheet: { fontFamily: "Arial, sans-serif" },
  overlay: { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.38)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 },
  modal: { width: "min(92vw, 500px)", maxHeight: "90vh", overflow: "auto", background: "#fff", borderRadius: 18, boxShadow: "0 24px 70px rgba(15, 23, 42, 0.22)" },
  modalHeader: { padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 15, fontWeight: 800, color: "#0f172a" },
  closeBtn: { background: "transparent", border: "none", cursor: "pointer", color: "#64748b", fontSize: 18, display: "flex", alignItems: "center" },
  label: { display: "block", marginBottom: 5, fontSize: 12, color: "#64748b", fontWeight: 700 },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #dbe6f3",
    background: "#fff",
    fontSize: 13,
    color: "#0f172a",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 },
  modalBtnSecondary: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #dbe6f3",
    background: "#fff",
    color: "#475569",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
  },
  modalBtnPrimary: {
    padding: "10px 16px",
    borderRadius: 12,
    border: "none",
    background: "#166534",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 800,
  },
};
