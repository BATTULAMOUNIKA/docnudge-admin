import { useCallback, useEffect, useRef, useState } from "react";
import {
  runPrescriptionDraft,
  createVoiceAgent,
  analyzeLabReport,
  analyzeLabImage,
  extractLabTextFromFile,
  checkDrugInteractions,
} from "../agents/prescriptionAgents";
import { addPrescription, updatePrescription } from "../api";

export default function AIPrescriptionModal({ patient, visits, patientId, prescription, onClose, onSave }) {
  const [activeAgent, setActiveAgent] = useState("voice");
  const [medicines, setMedicines] = useState(() => prescription?.medicines?.length ? prescription.medicines : [{ name: "", dosage: "", frequency: "", duration: "", notes: "" }]);
  const [rxNotes, setRxNotes] = useState(prescription?.notes || "");
  const [saving, setSaving] = useState(false);
  const [interactions, setInteractions] = useState(null);
  const [checking, setChecking] = useState(false);
  const [labAnalysis, setLabAnalysis] = useState(null);
  const [draftWarnings, setDraftWarnings] = useState([]);
  const [draftDisclaimer, setDraftDisclaimer] = useState("");

  const patientContext = `${patient?.age || ""}yr ${patient?.gender || ""}, condition: ${patient?.condition || "general"}, follow-up: ${patient?.followup_type || "general"}. Recent visits: ${(visits || []).slice(0, 2).map((visit) => visit.notes || "visit").join("; ")}`;

  const applyDraft = useCallback((result) => {
    const { medicines: rows, interactions: nextInteractions, warnings, disclaimer } = result;
    const filled = (rows || []).some((m) => (m.name || "").trim());
    if (filled) setMedicines(rows);
    setInteractions(nextInteractions ?? null);
    setDraftWarnings(Array.isArray(warnings) ? warnings : []);
    setDraftDisclaimer(typeof disclaimer === "string" ? disclaimer : "");
  }, []);

  function updateMedicine(index, field, value) {
    setMedicines((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
    setInteractions(null);
    setDraftWarnings([]);
    setDraftDisclaimer("");
  }

  function addMedicineRow() {
    setMedicines((current) => [...current, { name: "", dosage: "", frequency: "", duration: "", notes: "" }]);
  }

  function removeMedicineRow(index) {
    if (medicines.length > 1) {
      setMedicines((current) => current.filter((_, rowIndex) => rowIndex !== index));
    }
  }

  async function handleCheckInteractions() {
    const filled = medicines.filter((medicine) => medicine.name.trim());
    if (filled.length < 2) return;
    setChecking(true);
    try {
      const result = await checkDrugInteractions(filled);
      setInteractions(result);
    } finally {
      setChecking(false);
    }
  }

  async function handleSave() {
    const filled = medicines.filter((medicine) => medicine.name.trim());
    if (filled.length === 0) {
      alert("Add at least one medicine");
      return;
    }
    setSaving(true);
    try {
      if (prescription?.id) {
        await updatePrescription(prescription.id, { medicines: filled, notes: rxNotes });
      } else {
        await addPrescription({ patient_id: Number(patientId), medicines: filled, notes: rxNotes });
      }
      onSave();
    } catch {
      alert("Error saving prescription");
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { id: "voice", icon: "ti-microphone", label: "Voice" },
    { id: "shorthand", icon: "ti-keyboard", label: "Shorthand" },
    { id: "lab", icon: "ti-test-pipe", label: "Lab report" },
  ];

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={styles.aiBadge}>
              <i className="ti ti-sparkles" />
              AI
            </div>
            <div>
              <div style={styles.modalTitle}>{prescription?.id ? "Edit prescription" : "AI prescription writer"}</div>
              <div style={styles.modalSub}>Voice, shorthand, lab context, and manual editing in one workflow</div>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div style={styles.bodyPad}>
          <div style={styles.contextChip}>
            <i className="ti ti-user" style={{ fontSize: 13 }} />
            {patient?.name} | {patient?.age || "-"} yr | {patient?.condition || "general"}
          </div>

          {draftWarnings.length > 0 && (
            <div
              style={{
                ...styles.tipsBox,
                background: "#FAEEDA",
                borderColor: "#FAC775",
                marginBottom: 12,
                fontSize: 12,
                color: "#633806",
              }}
            >
              <div style={styles.tipsTitle}>Server notice</div>
              {draftWarnings.map((w, i) => (
                <div key={i} style={{ marginTop: i ? 6 : 0 }}>
                  {w}
                </div>
              ))}
            </div>
          )}

          <div style={styles.agentTabs}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                style={{ ...styles.agentTab, ...(activeAgent === tab.id ? styles.agentTabActive : {}) }}
                onClick={() => setActiveAgent(tab.id)}
              >
                <i className={`ti ${tab.icon}`} style={{ fontSize: 16 }} />
                {tab.label}
              </button>
            ))}
          </div>

          {activeAgent === "voice" && (
            <VoiceAgent patientContext={patientContext} onDraft={applyDraft} />
          )}

          {activeAgent === "shorthand" && (
            <ShorthandAgent patientContext={patientContext} onDraft={applyDraft} />
          )}

          {activeAgent === "lab" && <LabAgent patientContext={patientContext} onAnalysis={setLabAnalysis} />}

          {labAnalysis && activeAgent === "lab" && <LabAnalysisOutput analysis={labAnalysis} />}

          {activeAgent !== "lab" && (
            <>
              <div style={styles.rxHeader}>
                <div style={styles.sectionTitle}>
                  Prescription <span style={styles.sectionHint}>review and edit before saving</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <SmallButton onClick={addMedicineRow}>
                    <i className="ti ti-plus" style={{ fontSize: 12 }} />
                    Add row
                  </SmallButton>
                  <SmallButton
                    onClick={handleCheckInteractions}
                    disabled={checking || medicines.filter((medicine) => medicine.name).length < 2}
                  >
                    {checking ? (
                      <>
                        <i className="ti ti-loader-2" style={{ fontSize: 12 }} />
                        Checking...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-shield-check" style={{ fontSize: 12 }} />
                        Check interactions
                      </>
                    )}
                  </SmallButton>
                </div>
              </div>

              {interactions && (
                <div
                  style={{
                    ...styles.interactionBox,
                    background: interactions.safe && !interactions.interactions?.length ? "#EAF3DE" : "#FAECE7",
                    borderColor: interactions.safe && !interactions.interactions?.length ? "#C0DD97" : "#F5C4B3",
                    color: interactions.safe && !interactions.interactions?.length ? "#3B6D11" : "#712B13",
                  }}
                >
                  {interactions.safe && interactions.interactions?.length === 0 ? (
                    <>
                      <i className="ti ti-shield-check" /> No significant interactions found.
                    </>
                  ) : (
                    (interactions.interactions || []).map((item, index) => (
                      <div key={index} style={{ marginBottom: 3 }}>
                        <strong>{item.drugs}</strong> - <em>{item.severity}</em> - {item.note}
                      </div>
                    ))
                  )}
                </div>
              )}

              {draftDisclaimer && (
                <div style={{ ...styles.tipsBox, marginBottom: 10, fontSize: 12, color: "#666", lineHeight: 1.5 }}>
                  {draftDisclaimer}
                </div>
              )}

              <div style={styles.medGrid}>
                <GridHeader>Medicine name</GridHeader>
                <GridHeader>Dosage</GridHeader>
                <GridHeader>Frequency</GridHeader>
                <GridHeader>Duration</GridHeader>
                <GridHeader />
                {medicines.map((medicine, index) => (
                  <MedicineRow
                    key={index}
                    medicine={medicine}
                    onChange={(field, value) => updateMedicine(index, field, value)}
                    onRemove={() => removeMedicineRow(index)}
                  />
                ))}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={styles.label}>Notes / instructions</label>
                <textarea
                  rows={2}
                  style={styles.input}
                  value={rxNotes}
                  onChange={(event) => setRxNotes(event.target.value)}
                  placeholder="Take after food, avoid dairy..."
                />
              </div>
            </>
          )}

          <div style={styles.footer}>
            <div style={styles.footerNote}>
              <i className="ti ti-info-circle" style={{ fontSize: 14 }} />
              AI assists. Final clinical judgment stays with the doctor.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={styles.btn} onClick={onClose}>
                Cancel
              </button>
              {activeAgent !== "lab" && (
                <button style={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : prescription?.id ? "Update prescription" : "Save prescription"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VoiceAgent({ patientContext, onDraft }) {
  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const agentRef = useRef(null);

  useEffect(() => {
    agentRef.current = createVoiceAgent({
      onTranscript: (text) => setTranscript(text),
      onFinal: async (text) => {
        setStatus("processing");
        try {
          const result = await runPrescriptionDraft(text, patientContext);
          onDraft(result);
          setStatus("done");
        } catch {
          setErrorMsg("Could not format the spoken prescription.");
          setStatus("error");
        }
      },
      onError: (message) => {
        setErrorMsg(message);
        setStatus("error");
      },
      onStatusChange: (nextStatus) => {
        if (nextStatus === "listening") setStatus("listening");
      },
    });
    return () => agentRef.current?.stop();
  }, [onDraft, patientContext]);

  function toggleVoice() {
    if (!agentRef.current?.isSupported) {
      setErrorMsg("Use Chrome or a supported Android browser for voice input.");
      setStatus("error");
      return;
    }

    if (status === "listening") {
      agentRef.current.stop();
    } else {
      setTranscript("");
      setErrorMsg("");
      setStatus("idle");
      agentRef.current.start();
    }
  }

  return (
    <div style={styles.agentPanel}>
      <div style={styles.agentDesc}>
        Speak naturally in English or Hinglish. The browser captures the speech and AI formats it into the medicine table.
      </div>

      <div style={styles.voicePanel}>
        <button
          style={{
            ...styles.micBtn,
            background: status === "listening" ? "#FAECE7" : "#E1F5EE",
            borderColor: status === "listening" ? "#993C1D" : "#1D9E75",
          }}
          onClick={toggleVoice}
        >
          <i
            className={`ti ${status === "listening" ? "ti-microphone-off" : "ti-microphone"}`}
            style={{ fontSize: 28, color: status === "listening" ? "#993C1D" : "#1D9E75" }}
          />
        </button>
        <div style={{ ...styles.voiceStatus, color: status === "listening" ? "#993C1D" : "#888" }}>
          {status === "idle" && "Tap to start speaking"}
          {status === "listening" && "Listening... tap again to stop"}
          {status === "processing" && "Formatting your prescription..."}
          {status === "done" && "Done. Review the prescription below."}
          {status === "error" && errorMsg}
        </div>
      </div>

      {transcript && (
        <div style={styles.transcriptBox}>
          <div style={styles.tipsTitle}>Live transcript</div>
          <div style={styles.transcriptText}>{transcript}</div>
        </div>
      )}

      <div style={styles.tipsBox}>
        <div style={styles.tipsTitle}>Tips</div>
        <div style={styles.tipsCopy}>
          Say one medicine at a time.
          <br />
          Mention tablet, capsule, or syrup.
          <br />
          Include frequency and duration naturally.
          <br />
          Works best in Chrome in a quiet room.
        </div>
      </div>
    </div>
  );
}

function ShorthandAgent({ patientContext, onDraft }) {
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);

  async function parseShorthand() {
    if (!text.trim()) return;
    setParsing(true);
    try {
      const result = await runPrescriptionDraft(text, patientContext);
      const filled = (result.medicines || []).some((m) => (m.name || "").trim());
      if (filled) {
        onDraft(result);
        setParsed(true);
      } else {
        alert("Could not parse that shorthand. Please try again.");
      }
    } finally {
      setParsing(false);
    }
  }

  const examples = [
    "Tab PCM 650 SOS 3d",
    "Tab MTF 500 BD 30d PC",
    "Cap Amox 500 TDS 5d",
    "Tab Pantop 40 OD AC 14d",
    "Syr Cough 5ml TDS 5d",
    "Tab Atorva 10 OD HS 30d",
  ];

  return (
    <div style={styles.agentPanel}>
      <div style={styles.agentDesc}>
        Type prescription shorthand. AI expands it into full medicine names, frequencies, and durations.
      </div>

      <div style={styles.shorthandBox}>
        <textarea
          style={{ ...styles.input, minHeight: 80, resize: "vertical", background: "#fff" }}
          placeholder='e.g. "Tab PCM 650 SOS 3d, Tab MTF 500 BD 30d PC"'
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setParsed(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.ctrlKey) parseShorthand();
          }}
          autoFocus
        />
        <div style={styles.shorthandFooter}>
          <span style={styles.shorthandHint}>Ctrl + Enter to format</span>
          <button style={styles.btnPrimary} onClick={parseShorthand} disabled={parsing || !text.trim()}>
            {parsing ? "Parsing..." : "Format with AI"}
          </button>
        </div>
      </div>

      {parsed && (
        <div style={{ ...styles.tipsBox, background: "#E1F5EE", borderColor: "#9FE1CB" }}>
          <i className="ti ti-check" style={{ color: "#1D9E75", fontSize: 14 }} /> Prescription formatted. Review the table below and edit if needed.
        </div>
      )}

      <div style={styles.tipsBox}>
        <div style={styles.tipsTitle}>Common shorthand</div>
        <div style={styles.exampleWrap}>
          {examples.map((example) => (
            <button key={example} style={styles.exampleChip} onClick={() => setText((current) => (current ? `${current}, ${example}` : example))}>
              {example}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.tipsBox}>
        <div style={styles.tipsTitle}>Reference</div>
        <div style={styles.referenceGrid}>
          <span>OD = once daily</span>
          <span>BD = twice daily</span>
          <span>TDS = three times daily</span>
          <span>QID = four times daily</span>
          <span>SOS = as needed</span>
          <span>HS = at bedtime</span>
          <span>AC = before food</span>
          <span>PC = after food</span>
        </div>
      </div>
    </div>
  );
}

function LabAgent({ patientContext, onAnalysis }) {
  const [mode, setMode] = useState("type");
  const [labText, setLabText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef(null);

  async function analyzeTypedValues() {
    if (!labText.trim()) {
      alert("Enter lab values first");
      return;
    }
    setAnalyzing(true);
    try {
      const result = await analyzeLabReport(labText, patientContext);
      onAnalysis(result);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setAnalyzing(true);
    try {
      const extracted = await extractLabTextFromFile(file);
      if (extracted?.type === "image") {
        const result = await analyzeLabImage(extracted.base64, extracted.mediaType, patientContext);
        onAnalysis(result);
      } else {
        const extractedText = String(extracted || "");
        setLabText(extractedText);
        setMode("type");
        const result = await analyzeLabReport(extractedText, patientContext);
        onAnalysis(result);
      }
    } catch (error) {
      alert(typeof error === "string" ? error : "Could not read this file");
    } finally {
      setAnalyzing(false);
      event.target.value = "";
    }
  }

  const sample = `HbA1c: 8.2%
Fasting glucose: 142 mg/dL
PP glucose: 198 mg/dL
Creatinine: 0.9 mg/dL
eGFR: 88 mL/min
Total cholesterol: 210 mg/dL
LDL: 138 mg/dL
HDL: 42 mg/dL
Triglycerides: 180 mg/dL
BP: 138/88 mmHg`;

  return (
    <div style={styles.agentPanel}>
      <div style={styles.agentDesc}>
        Upload a lab report photo or PDF, or type the values manually. AI returns clinical context and flags abnormal values without making the prescribing decision for you.
      </div>

      <div style={styles.modeRow}>
        <button style={{ ...styles.modeBtn, ...(mode === "type" ? styles.modeBtnActive : {}) }} onClick={() => setMode("type")}>
          <i className="ti ti-keyboard" style={{ fontSize: 14 }} />
          Type values
        </button>
        <button style={{ ...styles.modeBtn, ...(mode === "upload" ? styles.modeBtnActive : {}) }} onClick={() => setMode("upload")}>
          <i className="ti ti-upload" style={{ fontSize: 14 }} />
          Upload report
        </button>
      </div>

      {mode === "type" && (
        <>
          <textarea
            style={{ ...styles.input, minHeight: 140, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
            placeholder={"HbA1c: 8.2%\nFasting glucose: 142 mg/dL\nCreatinine: 0.9 mg/dL\nBP: 138/88 mmHg"}
            value={labText}
            onChange={(event) => setLabText(event.target.value)}
          />
          <div style={styles.shorthandFooter}>
            <button style={styles.exampleChip} onClick={() => setLabText(sample)}>
              Load sample
            </button>
            <button style={styles.btnPrimary} onClick={analyzeTypedValues} disabled={analyzing || !labText.trim()}>
              {analyzing ? "Analyzing..." : "Analyze with AI"}
            </button>
          </div>
        </>
      )}

      {mode === "upload" && (
        <div style={styles.uploadZone} onClick={() => fileRef.current?.click()}>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.txt"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
          {analyzing ? (
            <>
              <i className="ti ti-loader-2" style={{ fontSize: 28, color: "#1D9E75" }} />
              <div style={styles.uploadPrimary}>Analyzing report...</div>
            </>
          ) : fileName ? (
            <>
              <i className="ti ti-file-check" style={{ fontSize: 28, color: "#1D9E75" }} />
              <div style={styles.uploadPrimary}>{fileName}</div>
              <div style={styles.uploadSecondary}>Loaded for analysis</div>
            </>
          ) : (
            <>
              <i className="ti ti-cloud-upload" style={{ fontSize: 28, color: "#aaa" }} />
              <div style={styles.uploadPrimary}>Click to upload a lab report</div>
              <div style={styles.uploadSecondary}>PDF, JPG, PNG, and TXT supported</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function LabAnalysisOutput({ analysis }) {
  const {
    abnormals = [],
    normal = [],
    clinicalContext = "",
    watchList = [],
    medicationConsiderations = [],
    followupSuggested = false,
    urgentFlag = false,
  } = analysis || {};

  return (
    <div style={styles.labOutput}>
      {urgentFlag && (
        <div style={{ ...styles.alertBox, background: "#FAECE7", borderColor: "#F5C4B3", color: "#712B13", marginBottom: 12 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 16 }} />
          <strong>Urgent attention suggested.</strong> Review these values carefully before prescribing.
        </div>
      )}

      {abnormals.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={styles.labSectionTitle}>Abnormal values</div>
          <div style={styles.labTable}>
            {abnormals.map((item, index) => (
              <div key={index} style={styles.labRow}>
                <span style={{ fontWeight: 500, color: "#1a1a18", flex: 1 }}>{item.test}</span>
                <span style={{ fontWeight: 600, color: item.flag === "high" ? "#993C1D" : "#185FA5", margin: "0 12px" }}>
                  {item.value} {item.flag === "high" ? "up" : "down"}
                </span>
                <span style={{ fontSize: 12, color: "#aaa", minWidth: 80 }}>({item.range})</span>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 7px",
                    borderRadius: 20,
                    marginLeft: 8,
                    background: item.severity === "significant" ? "#FAECE7" : "#FAEEDA",
                    color: item.severity === "significant" ? "#712B13" : "#633806",
                  }}
                >
                  {item.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {normal.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={styles.labSectionTitle}>Normal values ({normal.length})</div>
          <div style={styles.normalWrap}>
            {normal.map((item, index) => (
              <span key={index} style={styles.normalChip}>
                {item.test}: {item.value}
              </span>
            ))}
          </div>
        </div>
      )}

      {clinicalContext && (
        <div style={{ marginBottom: 12 }}>
          <div style={styles.labSectionTitle}>Clinical context</div>
          <div style={styles.contextBox}>{clinicalContext}</div>
        </div>
      )}

      {watchList.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={styles.labSectionTitle}>What to ask or examine</div>
          <ul style={styles.list}>
            {watchList.map((item, index) => (
              <li key={index} style={styles.listItem}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {medicationConsiderations.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={styles.labSectionTitle}>Medication considerations</div>
          <ul style={styles.list}>
            {medicationConsiderations.map((item, index) => (
              <li key={index} style={styles.listItem}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {followupSuggested && (
        <div style={{ ...styles.alertBox, background: "#E6F1FB", borderColor: "#B5D4F4", color: "#0C447C" }}>
          <i className="ti ti-calendar-event" style={{ fontSize: 15 }} />
          Follow-up review looks reasonable based on these values.
        </div>
      )}

      <div style={styles.disclaimer}>This is AI-generated context to support, not replace, clinical judgment.</div>
    </div>
  );
}

function MedicineRow({ medicine, onChange, onRemove }) {
  return (
    <>
      <input style={styles.input} value={medicine.name} onChange={(event) => onChange("name", event.target.value)} placeholder="Paracetamol 500mg" />
      <input style={styles.input} value={medicine.dosage} onChange={(event) => onChange("dosage", event.target.value)} placeholder="500 mg" />
      <input style={styles.input} value={medicine.frequency} onChange={(event) => onChange("frequency", event.target.value)} placeholder="BD" />
      <input style={styles.input} value={medicine.duration} onChange={(event) => onChange("duration", event.target.value)} placeholder="5 days" />
      <button style={styles.removeBtn} onClick={onRemove}>
        <i className="ti ti-x" style={{ fontSize: 12 }} />
      </button>
    </>
  );
}

function SmallButton({ onClick, disabled, children }) {
  return (
    <button style={{ ...styles.smallBtn, opacity: disabled ? 0.5 : 1 }} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function GridHeader({ children }) {
  return <div style={{ fontSize: 11, color: "#aaa", padding: "0 2px", marginBottom: 2 }}>{children}</div>;
}

const styles = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: {
    background: "#fff",
    borderRadius: 14,
    width: "95%",
    maxWidth: 740,
    maxHeight: "92vh",
    overflow: "auto",
    boxShadow: "0 12px 50px rgba(0,0,0,0.22)",
    fontFamily: "'DM Sans',sans-serif",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "0.5px solid rgba(0,0,0,0.09)",
    position: "sticky",
    top: 0,
    background: "#fff",
    zIndex: 1,
  },
  modalTitle: { fontSize: 15, fontWeight: 600, color: "#1a1a18" },
  modalSub: { fontSize: 12, color: "#aaa", marginTop: 1 },
  bodyPad: { padding: "16px 20px 20px" },
  closeBtn: { background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 18, display: "flex", alignItems: "center" },
  aiBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 9px",
    borderRadius: 20,
    background: "#E1F5EE",
    color: "#085041",
    fontSize: 12,
    fontWeight: 600,
    border: "0.5px solid #9FE1CB",
  },
  contextChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 11px",
    background: "#f8f7f4",
    borderRadius: 20,
    fontSize: 12,
    color: "#555",
    marginBottom: 14,
    border: "0.5px solid rgba(0,0,0,0.09)",
  },
  agentTabs: { display: "flex", gap: 6, marginBottom: 16 },
  agentTab: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "9px 16px",
    border: "0.5px solid rgba(0,0,0,0.12)",
    borderRadius: 9,
    background: "transparent",
    cursor: "pointer",
    fontSize: 13,
    color: "#888",
    flex: 1,
    justifyContent: "center",
  },
  agentTabActive: { background: "#1a1a18", color: "#fff", borderColor: "#1a1a18", fontWeight: 500 },
  agentPanel: { marginBottom: 16 },
  agentDesc: { fontSize: 13, color: "#555", marginBottom: 12, lineHeight: 1.6 },
  voicePanel: { display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0" },
  micBtn: { width: 80, height: 80, borderRadius: "50%", border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" },
  voiceStatus: { fontSize: 13, marginTop: 10, fontWeight: 500 },
  transcriptBox: { background: "#f8f7f4", borderRadius: 8, padding: "10px 12px", marginTop: 12, border: "0.5px solid rgba(0,0,0,0.08)" },
  transcriptText: { fontSize: 13, color: "#1a1a18", lineHeight: 1.6 },
  tipsBox: { background: "#f8f7f4", borderRadius: 8, padding: "10px 12px", marginTop: 10, border: "0.5px solid rgba(0,0,0,0.08)" },
  tipsTitle: { fontSize: 11, color: "#aaa", fontWeight: 500, marginBottom: 5 },
  tipsCopy: { fontSize: 12, color: "#888", lineHeight: 1.8 },
  shorthandBox: { background: "#FAEEDA", border: "0.5px solid #FAC775", borderRadius: 8, padding: "11px 13px", marginBottom: 12 },
  shorthandFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  shorthandHint: { fontSize: 11, color: "#854F0B" },
  exampleWrap: { display: "flex", flexWrap: "wrap", gap: 5 },
  referenceGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 16px", fontSize: 12, color: "#888" },
  modeRow: { display: "flex", gap: 6, marginBottom: 12 },
  modeBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    border: "0.5px solid rgba(0,0,0,0.12)",
    borderRadius: 8,
    background: "transparent",
    cursor: "pointer",
    fontSize: 13,
    color: "#888",
  },
  modeBtnActive: { background: "#1a1a18", color: "#fff", borderColor: "#1a1a18" },
  uploadZone: {
    border: "1.5px dashed rgba(0,0,0,0.15)",
    borderRadius: 10,
    padding: "32px 0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    cursor: "pointer",
    background: "#fafaf8",
  },
  uploadPrimary: { marginTop: 8, fontSize: 13, color: "#666" },
  uploadSecondary: { fontSize: 12, color: "#bbb", marginTop: 3 },
  rxHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: "#1a1a18" },
  sectionHint: { fontSize: 12, color: "#aaa", fontWeight: 400 },
  interactionBox: { borderRadius: 8, padding: "9px 12px", marginBottom: 10, fontSize: 13, border: "0.5px solid", lineHeight: 1.6 },
  medGrid: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 28px", gap: 5, marginBottom: 10 },
  input: {
    width: "100%",
    padding: "8px 10px",
    border: "0.5px solid rgba(0,0,0,0.15)",
    borderRadius: 7,
    fontSize: 13,
    background: "#fff",
    color: "#1a1a18",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  label: { fontSize: 12, color: "#888", marginBottom: 5, display: "block" },
  smallBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 10px",
    border: "0.5px solid rgba(0,0,0,0.12)",
    borderRadius: 6,
    background: "transparent",
    cursor: "pointer",
    fontSize: 12,
    color: "#555",
  },
  removeBtn: {
    width: 28,
    height: 36,
    border: "0.5px solid rgba(0,0,0,0.1)",
    borderRadius: 6,
    background: "transparent",
    cursor: "pointer",
    color: "#bbb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  exampleChip: { padding: "4px 9px", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 20, background: "#fff", cursor: "pointer", fontSize: 12, color: "#555" },
  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: "0.5px solid rgba(0,0,0,0.09)", marginTop: 4 },
  footerNote: { fontSize: 12, color: "#aaa", display: "flex", alignItems: "center", gap: 5 },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    border: "0.5px solid rgba(0,0,0,0.12)",
    borderRadius: 8,
    background: "transparent",
    cursor: "pointer",
    fontSize: 13,
    color: "#444",
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    border: "none",
    borderRadius: 8,
    background: "#1D9E75",
    cursor: "pointer",
    fontSize: 13,
    color: "#fff",
    fontWeight: 500,
  },
  labOutput: { background: "#fff", border: "0.5px solid rgba(0,0,0,0.09)", borderRadius: 10, padding: "14px 16px", marginBottom: 14 },
  labSectionTitle: { fontSize: 12, fontWeight: 600, color: "#1a1a18", marginBottom: 8 },
  labTable: { display: "flex", flexDirection: "column", gap: 4 },
  labRow: { display: "flex", alignItems: "center", padding: "7px 10px", background: "#f8f7f4", borderRadius: 7, fontSize: 13 },
  normalWrap: { display: "flex", flexWrap: "wrap", gap: 6 },
  normalChip: { fontSize: 12, padding: "3px 9px", background: "#EAF3DE", color: "#3B6D11", borderRadius: 20 },
  contextBox: { fontSize: 13, color: "#1a1a18", lineHeight: 1.7, padding: "10px 12px", background: "#f8f7f4", borderRadius: 8 },
  list: { paddingLeft: 18, margin: 0 },
  listItem: { fontSize: 13, color: "#555", marginBottom: 4 },
  alertBox: { display: "flex", alignItems: "center", gap: 9, padding: "10px 13px", borderRadius: 8, border: "0.5px solid", fontSize: 13 },
  disclaimer: { fontSize: 12, color: "#aaa", marginTop: 10, borderTop: "0.5px solid rgba(0,0,0,0.07)", paddingTop: 10 },
};
