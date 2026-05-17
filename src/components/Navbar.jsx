import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
const ROLE_LABELS = {
  service_qualite: "Service Qualité",
  service_finance: "Service Finance",
  service_achat: "Service Achat",
};
const BADGE_CLASS = {
  service_qualite: "badge-qualite",
  service_finance: "badge-finance",
  service_achat: "badge-achat",
};
export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  return (
    <nav className="navbar">
      <div className="navbar-brand">FIGEAC AERO</div>
      <div className="navbar-right">
        <span className={`badge ${BADGE_CLASS[user?.role]}`}>
          {ROLE_LABELS[user?.role]}
        </span>
        <span className="navbar-user">
          Bonjour, <span>{user?.username}</span>
        </span>
        <button
          className="btn btn-icon"
          onClick={handleLogout}
          title="Déconnexion"
        >
          ⏻
        </button>
      </div>
    </nav>
  );
}
