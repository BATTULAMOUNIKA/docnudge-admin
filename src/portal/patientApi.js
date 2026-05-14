const API_BASE = import.meta.env.VITE_API_URL || "https://api.docnudge.in";
const TOKEN_KEY = "docnudge_patient_token";

export function savePatientToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getPatientToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearPatientToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getPatientToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(payload?.detail || payload?.message || "Request failed");
  }
  return payload;
}

export const sendOtp = (phone) => request("/patient/auth/send-otp", { method: "POST", body: JSON.stringify({ phone }) });

export async function loginWithPhone(phone) {
  const data = await request("/patient/auth/login", { method: "POST", body: JSON.stringify({ phone }) });
  if (data.token) savePatientToken(data.token);
  return data;
}

export async function verifyOtp(phone, otp) {
  const data = await request("/patient/auth/verify-otp", { method: "POST", body: JSON.stringify({ phone, otp }) });
  if (data.token) savePatientToken(data.token);
  return data;
}

export const getPatientProfile = () => request("/patient/me");
export const updatePatientProfile = (data) => request("/patient/me", { method: "PUT", body: JSON.stringify(data) });
export const getMyVisits = () => request("/patient/visits");
export const getMyPrescriptions = () => request("/patient/prescriptions");
export const getMyLabReports = () => request("/patient/lab-reports");
export const getMyAppointments = () => request("/patient/appointments");
export const createMyAppointment = (data) => request("/patient/appointments", { method: "POST", body: JSON.stringify(data) });

export async function downloadPrescriptionPdf(id) {
  const token = getPatientToken();
  const response = await fetch(`${API_BASE}/patient/prescriptions/${id}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error("Could not download prescription");
  return response.blob();
}

export function uploadLabReport(file, name) {
  const form = new FormData();
  form.append("file", file);
  form.append("name", name || file.name || "Uploaded lab report");
  return request("/patient/lab-reports", { method: "POST", body: form });
}

export const getEmergencyProfile = (token) => request(`/emergency/${token}`);
