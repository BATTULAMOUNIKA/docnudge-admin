import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../auth";

const NAV = [
  { to: "/dashboard", icon: "ti-layout-dashboard", label: "Dashboard" },
  { to: "/patients", icon: "ti-users", label: "Patients" },
  { to: "/appointments", icon: "ti-calendar", label: "Appointments" },
  { to: "/reminders", icon: "ti-bell", label: "Reminders" },
  { to: "/recovery", icon: "ti-heart-rate-monitor", label: "Recovery" },
];

const BOTTOM_NAV = [
  { to: "/admin", icon: "ti-building-hospital", label: "Clinics", adminOnly: true },
  { to: "/settings", icon: "ti-settings", label: "Settings" },
];

export default function Sidebar({ user, basePath = "" }) {
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const doctorWorkspace = Boolean(basePath);

  function handleLogout() {
    logout();
    navigate(basePath ? `${basePath}/login` : "/login");
  }

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logo}>
        <img src="/logo.png" alt="DocNudge" style={styles.logoImg} />
      </div>

      <nav style={styles.nav}>
        {NAV.map((item) => (
          <NavItem key={item.to} {...item} basePath={basePath} />
        ))}

        <div style={styles.divider} />

        {!doctorWorkspace && BOTTOM_NAV.map((item) => (item.adminOnly && !isAdmin ? null : <NavItem key={item.to} {...item} basePath={basePath} />))}
      </nav>

      <div style={styles.footer}>
        <div style={styles.userPill}>
          <div style={styles.avatar}>{user?.email?.slice(0, 2).toUpperCase() || "DR"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.userName}>{user?.doctor_name || user?.email?.split("@")[0] || "Doctor"}</div>
            <div style={styles.userRole}>{user?.designation || user?.role || "admin"}</div>
          </div>
          <button onClick={handleLogout} title="Logout" style={styles.logoutBtn}>
            <i className="ti ti-logout" style={{ fontSize: 15 }} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ to, icon, label, basePath = "" }) {
  return (
    <NavLink
      to={`${basePath}${to}`}
      style={({ isActive }) => ({
        ...styles.navItem,
        ...(isActive ? styles.navActive : {}),
      })}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 16 }} aria-hidden="true" />
      {label}
    </NavLink>
  );
}

const styles = {
  sidebar: { width: 210, minHeight: "100vh", background: "#f8f7f4", borderRight: "0.5px solid rgba(0,0,0,0.09)", display: "flex", flexDirection: "column", flexShrink: 0, fontFamily: "'DM Sans', sans-serif" },
  logo: { padding: "16px 18px 14px", borderBottom: "0.5px solid rgba(0,0,0,0.07)" },
  logoImg: { width: 142, maxWidth: "100%", display: "block" },
  nav: { padding: "12px 8px", flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  divider: { height: "0.5px", background: "rgba(0,0,0,0.07)", margin: "10px 4px" },
  navItem: { display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#666", textDecoration: "none", transition: "background 0.12s, color 0.12s" },
  navActive: { background: "#fff", color: "#1a1a18", fontWeight: 500, border: "0.5px solid rgba(0,0,0,0.09)" },
  footer: { padding: "12px 12px 16px", borderTop: "0.5px solid rgba(0,0,0,0.07)" },
  userPill: { display: "flex", alignItems: "center", gap: 8 },
  avatar: { width: 30, height: 30, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#0F6E56", flexShrink: 0 },
  userName: { fontSize: 12, fontWeight: 500, color: "#1a1a18", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  userRole: { fontSize: 11, color: "#aaa", textTransform: "capitalize" },
  logoutBtn: { background: "none", border: "none", cursor: "pointer", color: "#bbb", padding: 4, display: "flex", alignItems: "center" },
};
