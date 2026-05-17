import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import QualiteDashboard from "./pages/QualiteDashboard.jsx";
import FinanceDashboard from "./pages/FinanceDashboard.jsx";
import AchatDashboard from "./pages/AchatDashboard.jsx";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard/qualite"
            element={
              <ProtectedRoute allowedRoles={["service_qualite"]}>
                <QualiteDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/finance"
            element={
              <ProtectedRoute allowedRoles={["service_finance"]}>
                <FinanceDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/achat"
            element={
              <ProtectedRoute allowedRoles={["service_achat"]}>
                <AchatDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
export default App;
