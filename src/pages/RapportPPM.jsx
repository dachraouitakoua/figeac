import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import axiosInstance from "../api/axiosInstance";
import CreatableSelect from "react-select/creatable";

export default function RapportPPM() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  const [filterSupplier, setFilterSupplier] = useState("all");
  
  const [supplierOptions, setSupplierOptions] = useState([]);

  const [form, setForm] = useState({
    fournisseur: null,
    total_nc_parts: "",
    total_delivered_qty: "",
  });

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get("/ppm-reports");
      setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      // Fetch products to extract unique suppliers like in QualiteDashboard
      const { data } = await axiosInstance.get("/products");
      const uniqueSuppliers = [
        ...new Set(data.map((p) => p.nom_fournisseur).filter(Boolean)),
      ].sort();
      
      const options = uniqueSuppliers.map((s) => ({ value: s, label: s }));
      setSupplierOptions(options);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchSuppliers();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSupplierChange = (selectedOption) => {
    setForm({ ...form, fournisseur: selectedOption });
  };

  // PPM Formula: (total_nc_parts / total_delivered_qty) * 1000
  const calculatedPPM =
    form.total_nc_parts && form.total_delivered_qty && Number(form.total_delivered_qty) > 0
      ? (Number(form.total_nc_parts) / Number(form.total_delivered_qty)) * 1000
      : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fournisseur) {
      setError("Veuillez choisir ou saisir un fournisseur.");
      return;
    }
    
    setError("");
    setSaving(true);
    
    try {
      const payload = {
        fournisseur: form.fournisseur.value,
        total_nc_parts: Number(form.total_nc_parts),
        total_delivered_qty: Number(form.total_delivered_qty),
        ppm: calculatedPPM,
      };

      await axiosInstance.post("/ppm-reports", payload);
      
      // Reset form
      setForm({
        fournisseur: null,
        total_nc_parts: "",
        total_delivered_qty: "",
      });
      
      fetchReports();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce rapport ?")) return;
    try {
      await axiosInstance.delete(`/ppm-reports/${id}`);
      fetchReports();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression");
    }
  };

  const reportSuppliers = [...new Set(reports.map((r) => r.fournisseur))].sort();

  const filteredReports = reports.filter((r) => {
    if (filterSupplier !== "all" && r.fournisseur !== filterSupplier) return false;
    return true;
  });

  // Custom styles for react-select to match the dark theme
  const customStyles = {
    control: (base, state) => ({
      ...base,
      background: "rgba(255, 255, 255, 0.05)",
      borderColor: state.isFocused ? "var(--accent)" : "var(--glass-border)",
      color: "var(--text-1)",
      boxShadow: state.isFocused ? "0 0 0 3px rgba(0, 212, 170, 0.12)" : "none",
      "&:hover": {
        borderColor: state.isFocused ? "var(--accent)" : "var(--glass-border)",
      },
    }),
    menu: (base) => ({
      ...base,
      background: "#0d1425",
      border: "1px solid var(--glass-border)",
    }),
    option: (base, state) => ({
      ...base,
      background: state.isFocused ? "rgba(0, 212, 170, 0.15)" : "transparent",
      color: "var(--text-1)",
      "&:active": {
        background: "rgba(0, 212, 170, 0.3)",
      },
    }),
    singleValue: (base) => ({
      ...base,
      color: "var(--text-1)",
    }),
    input: (base) => ({
      ...base,
      color: "var(--text-1)",
    }),
  };

  return (
    <div className="dashboard">
      <Navbar />
      <div className="dash-content">
        <div className="dash-header">
          <div>
            <h2>📊 Rapport PPM</h2>
            <p>Générez et consultez les rapports PPM par fournisseur</p>
          </div>
        </div>

        <div className="glass" style={{ padding: "24px", marginBottom: "28px" }}>
          <h3 style={{ marginBottom: "16px", fontSize: "1.1rem" }}>Créer un nouveau rapport</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit} className="form-row">
            <div className="form-group">
              <label>Fournisseur</label>
              <CreatableSelect
                isClearable
                options={supplierOptions}
                value={form.fournisseur}
                onChange={handleSupplierChange}
                placeholder="Sélectionner ou saisir un fournisseur..."
                styles={customStyles}
                formatCreateLabel={(inputValue) => `Créer "${inputValue}"`}
              />
            </div>
            <div className="form-group">
              <label>Nombre total ( pièces NC )</label>
              <input
                type="number"
                name="total_nc_parts"
                value={form.total_nc_parts}
                onChange={handleChange}
                required
                min="0"
                step="any"
              />
            </div>
            <div className="form-group">
              <label>Quantité totale livrée</label>
              <input
                type="number"
                name="total_delivered_qty"
                value={form.total_delivered_qty}
                onChange={handleChange}
                required
                min="0.0001"
                step="any"
              />
            </div>
            <div className="form-group">
              <label>PPM Calculé</label>
              <input
                type="text"
                value={calculatedPPM.toFixed(2)}
                disabled
                style={{ color: "var(--accent)", fontWeight: "bold" }}
              />
            </div>
            <div className="form-group full-width" style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: "auto" }}>
                {saving ? "⏳ Enregistrement..." : "✔ Enregistrer le rapport"}
              </button>
            </div>
          </form>
        </div>

        {reports.length > 0 && (
          <div className="search-filter-bar">
            <div className="form-group shrink" style={{ marginLeft: "auto", marginBottom: 0 }}>
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
              >
                <option value="all">Tous les fournisseurs</option>
                {reportSuppliers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {filterSupplier !== "all" && (
              <button
                className="btn"
                onClick={() => setFilterSupplier("all")}
                title="Effacer le filtre"
              >
                ✕ Effacer
              </button>
            )}
          </div>
        )}

        <div className="table-wrap">
          {loading ? (
            <div className="spinner" />
          ) : filteredReports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📈</div>
              <p>{reports.length === 0 ? "Aucun rapport PPM pour l'instant." : "Aucun rapport trouvé pour ce fournisseur."}</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Fournisseur</th>
                  <th>Total Pièces NC</th>
                  <th>Quantité Livrée</th>
                  <th>PPM</th>
                  <th>Créé par</th>
                  <th style={{ width: "80px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r) => (
                  <tr key={r._id}>
                    <td>{new Date(r.createdAt).toLocaleDateString("fr-FR")}</td>
                    <td style={{ fontWeight: "600" }}>{r.fournisseur}</td>
                    <td>{r.total_nc_parts}</td>
                    <td>{r.total_delivered_qty}</td>
                    <td style={{ color: "var(--accent)", fontWeight: "bold" }}>
                      {r.ppm.toFixed(2)}
                    </td>
                    <td className="muted">{r.created_by_username || "—"}</td>
                    <td>
                      <button
                        className="btn-icon"
                        onClick={() => handleDelete(r._id)}
                        title="Supprimer"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
