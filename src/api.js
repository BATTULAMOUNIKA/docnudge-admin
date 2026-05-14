import axios from "axios";
import { getToken } from "./auth";

const BASE = import.meta.env.VITE_API_URL || "https://api.docnudge.in";
const API = axios.create({ baseURL: BASE });

API.interceptors.request.use((c) => {
  const t = getToken();
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

API.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401) {
      sessionStorage.clear();
      window.location.reload();
    }
    return Promise.reject(e);
  }
);

export const login = (identifier, password) =>
  API.post("/auth/login", new URLSearchParams({ username: identifier, password }), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
export const getClinics = () => API.get("/clinics");
export const createClinic = (name) => API.post(`/clinics?name=${encodeURIComponent(name)}`);
export const getAdminUsers = () => API.get("/admin/users");
export const getPatients = (cid, search = "") => API.get(`/patients/clinic/${cid}${search ? `?search=${encodeURIComponent(search)}` : ""}`);
export const updatePatientRecord = (id, data) => API.put(`/patients/${id}`, data);
export const deletePatientRecord = (id) => API.delete(`/patients/${id}`);
export const getVisits = (pid) => API.get(`/visits/${pid}`);
export const getReminderLogs = (cid) => API.get(`/reminder-logs/${cid}`);
export const addPatient = (data) => API.post("/patients", data);
export const addVisit = (data) => API.post("/visits", data);
export const createUser = (data) => API.post("/admin/users", data);
export const updateVisitStatus = (id, status) => API.put(`/visits/${id}/status?status=${status}`);
export const getRetentionDashboard = (cid) => API.get(`/retention/dashboard?clinic_id=${cid}`);
export const searchRetentionPatients = (cid, q = "") => API.get(`/retention/search?clinic_id=${cid}&q=${encodeURIComponent(q)}`);
export const createRetentionPatient = (data) => API.post("/retention/patients", data);
export const getRetentionPatient = (id) => API.get(`/retention/patients/${id}`);
export const updateRetentionPatient = (id, data) => API.put(`/retention/patients/${id}`, data);
export const deleteRetentionPatient = (id) => API.delete(`/retention/patients/${id}`);
export const addRetentionVisit = (id, data) => API.post(`/retention/patients/${id}/visits`, data);
export const closeRetentionPatient = (id, reason = "") => API.post(`/retention/patients/${id}/close`, { reason });
export const completeRetentionVisit = (id) => API.post(`/retention/visits/${id}/complete`);
export const sendRetentionReminder = (id) => API.post(`/retention/visits/${id}/send-reminder`);
export const updateClinic = (id, data) => API.put(`/clinics/${id}`, data);
export const deleteClinic = (id) => API.delete(`/clinics/${id}`);
export const getServices = (cid, includeInactive = false) => API.get(`/services?clinic_id=${cid}&include_inactive=${includeInactive}`);
export const createService = (data) => API.post("/services", data);
export const updateService = (id, data) => API.put(`/services/${id}`, data);
export const getAppointments = (cid, from = "", to = "") => API.get(`/appointments?clinic_id=${cid}${from ? `&date_from=${from}` : ""}${to ? `&date_to=${to}` : ""}`);
export const createAppointment = (data) => API.post("/appointments", data);
export const updateAppointment = (id, data) => API.put(`/appointments/${id}`, data);
export const completeAppointment = (id, data = {}) => API.post(`/appointments/${id}/complete`, data);
export const deleteAppointment = (id) => API.delete(`/appointments/${id}`);
export const getWidgetConfig = (cid) => API.get(`/public/clinics/${cid}/widget`);
export const widgetChat = (data) => API.post("/public/widget-chat", data);
export const createPublicBooking = (data) => API.post("/public/bookings", data);
export const getWeeklyReports = (cid) => API.get(`/weekly-reports?clinic_id=${cid}`);
export const generateWeeklyReport = (cid, send = false) => API.post(`/weekly-reports/generate?clinic_id=${cid}&send_whatsapp=${send}`);
export const getBilling = (cid) => API.get(`/billing/${cid}`);
export const startCheckout = (cid, plan) => API.post(`/billing/${cid}/checkout?plan=${plan}`);
export const portalAccess = (data) => API.post("/portal/access", data);

export async function getVisitsByClinic(clinicId) {
  const r = await API.get(`/visits/clinic/${clinicId}`);
  return r.data;
}

export async function getPatient(patientId) {
  const r = await API.get(`/patients/${patientId}`);
  return r.data;
}

export async function getPrescriptions(patientId) {
  const r = await API.get(`/prescriptions/${patientId}`);
  return r.data;
}

export async function addPrescription(data) {
  const r = await API.post("/prescriptions", data);
  return r.data;
}

export async function updatePrescription(prescriptionId, data) {
  const r = await API.put(`/prescriptions/${prescriptionId}`, data);
  return r.data;
}

export async function getLabResults(patientId) {
  const r = await API.get(`/labs/${patientId}`);
  return r.data;
}

export async function addLabResult(data) {
  const r = await API.post("/labs", data);
  return r.data;
}

export async function sendWhatsAppPrescription(patientId) {
  const r = await API.post(`/whatsapp/prescription/${patientId}`);
  return r.data;
}

export async function sendRecoveryWhatsApp(patientId) {
  const r = await API.post(`/whatsapp/recovery/${patientId}`);
  return r.data;
}

export async function parsePrescriptionShorthand(shorthand, patientContext = "") {
  const r = await API.post("/ai/prescriptions/parse", { shorthand, patient_context: patientContext });
  return r.data;
}

export async function draftPrescriptionAI(shorthand, patientContext = "") {
  const r = await API.post("/ai/prescriptions/draft", { shorthand, patient_context: patientContext });
  return r.data;
}

export async function checkPrescriptionInteractions(medicines) {
  const r = await API.post("/ai/prescriptions/interactions", { medicines });
  return r.data;
}

export async function analyzeLabReportAI(labText, patientContext = "") {
  const r = await API.post("/ai/labs/analyze", { lab_text: labText, patient_context: patientContext });
  return r.data;
}

export async function analyzeLabImageAI(base64Image, mediaType, patientContext = "") {
  const r = await API.post("/ai/labs/analyze-image", {
    base64_image: base64Image,
    media_type: mediaType,
    patient_context: patientContext,
  });
  return r.data;
}

export default API;
