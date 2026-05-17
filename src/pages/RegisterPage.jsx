import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
const ROLES = [
  { value: "service_qualite", label: "Service Qualité" },
  { value: "service_finance", label: "Service Finance" },
  { value: "service_achat", label: "Service Achat" },
];
export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirm: "",
    role: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (form.password !== form.confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (form.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (!form.role) {
      setError("Veuillez sélectionner un rôle");
      return;
    }
    setLoading(true);
    try {
      await register(form.username, form.password, form.role);
      setSuccess("Compte créé ! Vous pouvez maintenant vous connecter.");
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError(
        err.response?.data?.message || "Erreur lors de la création du compte",
      );
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
        <h2 className="auth-title">Créer un compte</h2>
        <p className="auth-sub">Rejoignez votre équipe sur la plateforme</p>
        {error && <div className="alert alert-error">⚠ {error}</div>}
        {success && <div className="alert alert-success">✓ {success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="reg-username">Nom d'utilisateur</label>
            <input
              id="reg-username"
              name="username"
              type="text"
              placeholder="Choisissez un nom d'utilisateur"
              value={form.username}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-role">Service / Rôle</label>
            <select
              id="reg-role"
              name="role"
              value={form.role}
              onChange={handleChange}
              required
            >
              <option value="">— Sélectionnez votre service —</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="reg-password">Mot de passe</label>
            <input
              id="reg-password"
              name="password"
              type="password"
              placeholder="Minimum 6 caractères"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-confirm">Confirmer le mot de passe</label>
            <input
              id="reg-confirm"
              name="confirm"
              type="password"
              placeholder="Répétez le mot de passe"
              value={form.confirm}
              onChange={handleChange}
              required
            />
          </div>
          <button
            id="register-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? "Création…" : "→ Créer le compte"}
          </button>
        </form>
        <div className="auth-link">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
