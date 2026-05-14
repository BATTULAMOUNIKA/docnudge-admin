import {
  checkPrescriptionInteractions,
  analyzeLabReportAI,
  analyzeLabImageAI,
  draftPrescriptionAI,
} from "../api";

/** One round-trip: structured medicines + interaction check + server warnings/disclaimer. */
export async function runPrescriptionDraft(rawText, patientContext = "") {
  const response = await draftPrescriptionAI(rawText, patientContext);
  const medicines = Array.isArray(response?.medicines) ? response.medicines : [];
  const interactions = response?.interactions ?? null;
  const disclaimer = typeof response?.disclaimer === "string" ? response.disclaimer : "";
  const warnings = Array.isArray(response?.warnings) ? response.warnings : [];
  return { medicines, interactions, disclaimer, warnings };
}

/** Backward-compatible: medicines only (uses draft endpoint internally). */
export async function formatPrescription(rawText, patientContext = "") {
  const { medicines } = await runPrescriptionDraft(rawText, patientContext);
  return medicines;
}

export function createVoiceAgent({ onTranscript, onFinal, onError, onStatusChange }) {
  let recognition = null;
  let finalTranscript = "";
  let isListening = false;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return {
      isSupported: false,
      start: () => onError?.("Voice input works in Chrome and supported Android browsers."),
      stop: () => {},
      isListening: () => false,
    };
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-IN";
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    finalTranscript = "";
    onStatusChange?.("listening");
  };

  recognition.onresult = (event) => {
    let interim = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index][0].transcript;
      if (event.results[index].isFinal) {
        finalTranscript += `${transcript} `;
      } else {
        interim = transcript;
      }
    }
    onTranscript?.(`${finalTranscript}${interim}`.trim());
  };

  recognition.onend = () => {
    const finishedText = finalTranscript.trim();
    isListening = false;
    onStatusChange?.("stopped");
    if (finishedText) {
      onFinal?.(finishedText);
    }
  };

  recognition.onerror = (event) => {
    isListening = false;
    onStatusChange?.("error");
    const messages = {
      "not-allowed": "Microphone access was denied. Please allow microphone access and try again.",
      "no-speech": "No speech was detected. Please try again.",
      network: "Voice recognition hit a network error. Please try again.",
    };
    onError?.(messages[event.error] || `Voice input error: ${event.error}`);
  };

  return {
    isSupported: true,
    start() {
      if (!isListening) {
        finalTranscript = "";
        recognition.start();
      }
    },
    stop() {
      if (isListening) {
        recognition.stop();
      }
    },
    isListening: () => isListening,
  };
}

export async function analyzeLabReport(labText, patientContext = "") {
  return analyzeLabReportAI(labText, patientContext);
}

export function extractLabTextFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject("No file selected.");
      return;
    }

    if (file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result || "");
      reader.onerror = () => reject("Could not read the text file.");
      reader.readAsText(file);
      return;
    }

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = String(event.target?.result || "");
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve({ type: "image", base64, mediaType: file.type });
      };
      reader.onerror = () => reject("Could not read the image.");
      reader.readAsDataURL(file);
      return;
    }

    if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = String(event.target?.result || "");
        const matches = text.match(/\(([^)]{2,120})\)/g) || [];
        const extracted = matches
          .map((match) => match.slice(1, -1))
          .filter((chunk) => /[A-Za-z0-9]/.test(chunk) && !chunk.includes("\\"))
          .join(" ");
        resolve(extracted || "Could not extract readable text from this PDF. Please type the values manually.");
      };
      reader.onerror = () => reject("Could not read the PDF.");
      reader.readAsBinaryString(file);
      return;
    }

    reject("Unsupported file type. Please upload a PDF, image, or text file.");
  });
}

export async function analyzeLabImage(base64Image, mediaType, patientContext = "") {
  return analyzeLabImageAI(base64Image, mediaType, patientContext);
}

export async function checkDrugInteractions(medicines) {
  return checkPrescriptionInteractions(medicines);
}
