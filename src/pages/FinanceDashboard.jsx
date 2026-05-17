import { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import axiosInstance from "../api/axiosInstance";

export default function FinanceDashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({}); // { [id]: value }
  const [saving, setSaving] = useState({}); // { [id]: bool }
  const [saved, setSaved] = useState({}); // { [id]: bool } flash
  const [savingAll, setSavingAll] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/products");
      setProducts(data);
      // Pre-fill editing state with existing cout_achat values
      const init = {};
      data.forEach((p) => {
        init[p._id] = p.cout_achat ?? "";
      });
      setEditing(init);
    } catch {
      /* handled */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSave = async (id) => {
    const val = editing[id];
    if (val === "" || val === null || isNaN(Number(val))) return;
    setSaving((s) => ({ ...s, [id]: true }));
    try {
      await axiosInstance.patch(`/products/${id}/finance`, {
        cout_achat: Number(val),
      });
      setSaved((s) => ({ ...s, [id]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [id]: false })), 1800);
      fetchProducts();
    } catch {
      /* handled */
    } finally {
      setSaving((s) => ({ ...s, [id]: false }));
    }
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    try {
      const promises = products.map((p) => {
        const val = editing[p._id];
        const numVal = Number(val);
        // Only save if it's a valid number and has changed from the original
        if (
          val !== "" &&
          val != null &&
          !isNaN(numVal) &&
          numVal !== p.cout_achat
        ) {
          setSaving((s) => ({ ...s, [p._id]: true }));
          return axiosInstance
            .patch(`/products/${p._id}/finance`, {
              cout_achat: numVal,
            })
            .then(() => {
              setSaved((s) => ({ ...s, [p._id]: true }));
              setTimeout(
                () => setSaved((s) => ({ ...s, [p._id]: false })),
                1800,
              );
            })
            .finally(() => {
              setSaving((s) => ({ ...s, [p._id]: false }));
            });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      fetchProducts();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingAll(false);
    }
  };

  const fmt = (v) => (v != null ? v : "—");

  return (
    <div className="dashboard">
      <Navbar />
      <div className="dash-content">
        <div className="dash-header">
          <div>
            <h2>💰 Tableau de Bord Finance</h2>
            <p>Consultez les produits et renseignez le Coût d'Achat</p>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Total Produits</div>
            <div className="stat-val" style={{ color: "var(--amber)" }}>
              {products.length}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Coûts renseignés</div>
            <div className="stat-val" style={{ color: "var(--green)" }}>
              {products.filter((p) => p.cout_achat != null).length}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">En attente</div>
            <div className="stat-val" style={{ color: "var(--red)" }}>
              {products.filter((p) => p.cout_achat == null).length}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>Aucun produit disponible pour le moment.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date Création</th>
                  <th>Order Ref</th>
                  <th>CEP</th>
                  <th>Article</th>
                  <th>Quantité</th>
                  <th>Décision</th>
                  <th>Fournisseur</th>
                  <th>Valeur IFS</th>
                  <th style={{ color: "var(--amber)" }}>
                    Coût Achat (Matiére Premiere)
                  </th>
                  <th>Validé par</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id}>
                    <td>
                      {p.date_creation
                        ? new Date(p.date_creation).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td>
                      <strong>{fmt(p.order_ref)}</strong>
                    </td>
                    <td className="muted">{fmt(p.cep)}</td>
                    <td>{fmt(p.article)}</td>
                    <td>{fmt(p.quantite)}</td>
                    <td>
                      <span
                        className={`chip ${p.decision ? "chip-green" : "chip-null"}`}
                      >
                        {fmt(p.decision)}
                      </span>
                    </td>
                    <td>{fmt(p.nom_fournisseur)}</td>
                    <td>{fmt(p.valeur_ifs)}</td>
                    <td>
                      <input
                        className="inline-input"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={editing[p._id] ?? ""}
                        onChange={(e) =>
                          setEditing((prev) => ({
                            ...prev,
                            [p._id]: e.target.value,
                          }))
                        }
                        style={
                          p.cout_achat != null
                            ? { borderColor: "var(--amber)" }
                            : {}
                        }
                      />
                    </td>
                    <td>{fmt(p.valider_par_finance)}</td>
                    <td>
                      {saved[p._id] ? (
                        <span className="chip chip-green">✓ Sauvegardé</span>
                      ) : (
                        <button
                          className="btn btn-amber"
                          onClick={() => handleSave(p._id)}
                          disabled={saving[p._id]}
                        >
                          {saving[p._id] ? "…" : "💾 Sauvegarder"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ textAlign: "right", marginTop: "1rem" }}>
          <button
            className="btn btn-amber"
            onClick={handleSaveAll}
            disabled={savingAll || products.length === 0}
            style={{ width: "auto", whiteSpace: "nowrap" }}
          >
            {savingAll ? "⏳ Sauvegarde..." : "💾 Sauvegarder tout"}
          </button>
        </div>
      </div>
    </div>
  );
}
