import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
const ROLE_PATHS = {
  service_qualite: "/dashboard/qualite",
  service_finance: "/dashboard/finance",
  service_achat: "/dashboard/achat",
};
export function ProtectedRoute({ children, allowedRoles }) {
  const { user, logout } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const dest = ROLE_PATHS[user.role];
    if (dest) {
      return <Navigate to={dest} replace />;
    } else {
      // Invalid role, clear session and force login
      logout();
      return <Navigate to="/login" replace />;
    }
  }
  return children;
}
