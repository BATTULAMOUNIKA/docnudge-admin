import { Component, useEffect, useState } from "react";
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes } from "react-router-dom";
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
        <div style={sharedStyles.card}>Loading admin dashboard...</div>
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
                  copy="This screen is reserved for the clinic admin account."
                />
              ) : (
                <AdminLayout user={user} clinicId={resolvedClinicId} />
              )
            }
          />
        </Routes>
      </AppErrorBoundary>
    </BrowserRouter>
  );
}

function AdminLayout({ user, clinicId }) {
  return (
    <div style={layoutStyles.shell}>
      <aside style={layoutStyles.sidebar}>
        <div style={layoutStyles.brand}>
          <img src="/logo.png" alt="DocNudge" style={layoutStyles.logoImg} />
          <span style={layoutStyles.brandSub}>Clinic control</span>
        </div>

        <nav style={layoutStyles.nav}>
          <NavItem to="/" label="Dashboard" />
          <NavItem to="/settings" label="Admin settings" />
        </nav>

        <Link to="/settings?tab=profile" style={layoutStyles.footerLink}>
          <div style={layoutStyles.footer}>
            <div style={layoutStyles.avatar}>{user?.email?.[0]?.toUpperCase() || "A"}</div>
            <div style={{ minWidth: 0 }}>
              <div style={layoutStyles.userName}>{user?.email || "Admin"}</div>
              <div style={layoutStyles.userRole}>Clinic administrator</div>
            </div>
          </div>
        </Link>
      </aside>

      <main style={layoutStyles.main}>
        <Routes>
          <Route path="/" element={<AdminPanel clinicId={clinicId} user={user} />} />
          <Route path="/settings" element={<Settings user={user} clinicId={clinicId} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      style={({ isActive }) => ({
        ...layoutStyles.navItem,
        ...(isActive ? layoutStyles.navItemActive : {}),
      })}
    >
      {label}
    </NavLink>
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
          <div style={sharedStyles.title}>Admin dashboard could not load</div>
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

const layoutStyles = {
  shell: { display: "flex", minHeight: "100vh", background: "#f7f8fc", fontFamily: "'DM Sans', sans-serif" },
  sidebar: { width: 250, minHeight: "100vh", background: "#0f172a", color: "#fff", padding: 18, display: "flex", flexDirection: "column", gap: 18, flexShrink: 0 },
  brand: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, paddingBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.1)" },
  logoImg: { width: 150, background: "#fff", borderRadius: 8, padding: 6 },
  brandSub: { display: "block", color: "#7dd3fc", fontSize: 12, marginTop: 2 },
  nav: { display: "flex", flexDirection: "column", gap: 8 },
  navItem: { color: "rgba(255,255,255,0.78)", textDecoration: "none", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "11px 13px", fontSize: 13, fontWeight: 700 },
  navItemActive: { background: "linear-gradient(135deg,#0c447c,#0d9488)", color: "#fff", boxShadow: "0 12px 24px rgba(12,68,124,0.22)" },
  footer: { marginTop: "auto", display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 14 },
  footerLink: { marginTop: "auto", textDecoration: "none", color: "inherit" },
  avatar: { width: 34, height: 34, borderRadius: "50%", background: "#7dd3fc", color: "#0f172a", display: "grid", placeItems: "center", fontWeight: 800, flexShrink: 0 },
  userName: { fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  userRole: { fontSize: 11, color: "#7dd3fc", marginTop: 2 },
  main: { flex: 1, minWidth: 0, overflow: "auto" },
};
