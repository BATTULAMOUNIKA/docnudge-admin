import { Component, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { getToken } from "./auth";
import API from "./api";

import Login from "./pages/Login";
import AdminPanel from "./pages/AdminPanel";
import Settings from "./pages/Settings";

export default function App() {
  const [user, setUser] = useState(null);
  const [resolvedClinicId, setResolvedClinicId] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    API.get("/auth/me")
      .then(async (response) => {
        const nextUser = response.data;
        let clinicId = nextUser?.clinic_id ?? null;

        if (!clinicId && nextUser?.role === "admin") {
          try {
            const clinicsResponse = await API.get("/clinics");
            clinicId = clinicsResponse.data?.[0]?.id ?? null;
          } catch (error) {
            console.error("Could not resolve clinic for admin user", error);
          }
        }

        setResolvedClinicId(clinicId);
        setUser({ ...nextUser, clinic_id: clinicId });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={sharedStyles.page}>
        <div style={sharedStyles.card}>Loading admin workspace...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppErrorBoundary>
        <Routes>
          <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" replace />} />
          <Route
            path="/*"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : user.role !== "admin" ? (
                <DomainRedirect
                  target="https://dashboard.docnudge.in"
                  title="Redirecting to dashboard"
                  copy="This workspace is reserved for the DocNudge owner account."
                />
              ) : (
                <OwnerLayout user={user} clinicId={resolvedClinicId} />
              )
            }
          />
        </Routes>
      </AppErrorBoundary>
    </BrowserRouter>
  );
}

function OwnerLayout({ user }) {
  return (
    <div style={ownerStyles.shell}>
      <aside style={ownerStyles.sidebar}>
        <div style={ownerStyles.brand}>
          <img src="/logo.png" alt="DocNudge" style={ownerStyles.logoImg} />
          <span style={ownerStyles.brandSub}>Owner Console</span>
        </div>
        <nav style={ownerStyles.nav}>
          <a style={ownerStyles.navItem} href="/">Clinics, staff and billing</a>
          <a style={ownerStyles.navItem} href="/settings">Admin settings</a>
        </nav>
        <div style={ownerStyles.footer}>
          <div style={ownerStyles.avatar}>{user?.email?.[0]?.toUpperCase() || "A"}</div>
          <div style={{ minWidth: 0 }}>
            <div style={ownerStyles.userName}>{user?.email || "Admin"}</div>
            <div style={ownerStyles.userRole}>System owner</div>
          </div>
        </div>
      </aside>
      <main style={ownerStyles.main}>
        <Routes>
          <Route path="/" element={<AdminPanel />} />
          <Route path="/settings" element={<Settings user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function DomainRedirect({ target, title, copy }) {
  useEffect(() => {
    window.location.replace(target);
  }, [target]);

  return (
    <div style={sharedStyles.page}>
      <div style={sharedStyles.card}>
        <div style={sharedStyles.title}>{title}</div>
        <div style={sharedStyles.copy}>{copy}</div>
      </div>
    </div>
  );
}

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Admin workspace render failed", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={sharedStyles.page}>
        <div style={sharedStyles.card}>
          <div style={sharedStyles.title}>Admin workspace could not load</div>
          <div style={sharedStyles.copy}>Please refresh the page or sign in again.</div>
          <div style={sharedStyles.actions}>
            <button style={sharedStyles.primary} onClick={() => window.location.reload()}>
              Refresh
            </button>
            <button
              style={sharedStyles.secondary}
              onClick={() => {
                sessionStorage.clear();
                window.location.href = "/login";
              }}
            >
              Sign in again
            </button>
          </div>
        </div>
      </div>
    );
  }
}

function handleLogin() {
  window.location.reload();
}

const sharedStyles = {
  page: { minHeight: "100vh", display: "grid", placeItems: "center", background: "#f7f8fc", padding: 20, fontFamily: "'DM Sans', sans-serif" },
  card: { width: "100%", maxWidth: 420, background: "#fff", border: "1px solid #e2e6f0", borderRadius: 12, padding: 24, textAlign: "center", boxShadow: "0 20px 60px rgba(15,23,42,0.08)" },
  title: { margin: 0, fontSize: 22, color: "#0a0d14", fontWeight: 700 },
  copy: { color: "#64748b", fontSize: 13, lineHeight: 1.6, margin: "8px 0 18px" },
  actions: { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" },
  primary: { border: "none", borderRadius: 8, padding: "9px 14px", background: "#0a0d14", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  secondary: { border: "1px solid #d9deea", borderRadius: 8, padding: "9px 14px", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 700, cursor: "pointer" },
};

const ownerStyles = {
  shell: { display: "flex", minHeight: "100vh", background: "#f7f8fc", fontFamily: "'DM Sans', sans-serif" },
  sidebar: { width: 260, minHeight: "100vh", background: "#0a0d14", color: "#fff", padding: 18, display: "flex", flexDirection: "column", gap: 18, flexShrink: 0 },
  brand: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, paddingBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.1)" },
  logoImg: { width: 150, background: "#fff", borderRadius: 8, padding: 6 },
  brandSub: { display: "block", color: "#c9a227", fontSize: 12, marginTop: 2 },
  nav: { display: "flex", flexDirection: "column", gap: 8 },
  navItem: { color: "rgba(255,255,255,0.78)", textDecoration: "none", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "10px 12px", fontSize: 13 },
  footer: { marginTop: "auto", display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 14 },
  avatar: { width: 34, height: 34, borderRadius: "50%", background: "#c9a227", color: "#0a0d14", display: "grid", placeItems: "center", fontWeight: 800, flexShrink: 0 },
  userName: { fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  userRole: { fontSize: 11, color: "#c9a227", marginTop: 2 },
  main: { flex: 1, minWidth: 0, overflow: "auto" },
};
