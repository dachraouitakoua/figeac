import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
const ROLE_PATHS = {
  service_qualite: "/dashboard/qualite",
  service_finance: "/dashboard/finance",
  service_achat: "/dashboard/achat",
};
export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Redirect if already logged in
  if (user) {
    const dest = ROLE_PATHS[user.role];
    if (dest) return <Navigate to={dest} replace />;
    // If no destination is found for their role, show an error instead of looping
    return (
      <div className="auth-bg">
        <div className="auth-card glass" style={{textAlign: 'center'}}>
          <h2 style={{color: 'var(--red)'}}>Erreur de Rôle</h2>
          <p>Votre compte n'a pas de rôle valide reconnu par le système ({user.role}).</p>
          <button className="btn btn-primary" onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}>Déconnexion Forcée</button>
        </div>
      </div>
    );
  }
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const u = await login(form.username, form.password);
      navigate(ROLE_PATHS[u.role]);
    } catch (err) {
      setError(err.response?.data?.message || "Identifiants incorrects");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="auth-bg">
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />
      <div className="auth-card glass">
        <div className="auth-logo">
          <h1>✈ FIGEAC AERO</h1>
          <p>Plateforme de gestion des produits</p>
        </div>
        <h2 className="auth-title">Connexion</h2>
        <p className="auth-sub">Accédez à votre tableau de bord</p>
        {error && <div className="alert alert-error">⚠ {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-username">Nom d'utilisateur</label>
            <input
              id="login-username"
              name="username"
              type="text"
              placeholder="Entrez votre nom d'utilisateur"
              value={form.username}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Mot de passe</label>
            <input
              id="login-password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? "Connexion…" : "→ Se connecter"}
          </button>
        </form>
        <div className="auth-link">
          Pas encore de compte ? <Link to="/register">Créer un compte</Link>
        </div>
      </div>
    </div>
  );
}
