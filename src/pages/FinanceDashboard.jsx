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

  // Filters state
  const [filterMonth, setFilterMonth] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("all");

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

  const filteredProducts = products.filter((p) => {
    // Month filter
    if (filterMonth) {
      if (!p.date_creation) return false;
      if (!p.date_creation.startsWith(filterMonth)) return false;
    }
    // Search filter (ref, article, fournisseur, cep, description)
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      const matches =
        (p.order_ref || "").toLowerCase().includes(q) ||
        (p.article || "").toLowerCase().includes(q) ||
        (p.nom_fournisseur || "").toLowerCase().includes(q) ||
        (p.fournisseur_flux || "").toLowerCase().includes(q) ||
        (p.cep || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q);
      if (!matches) return false;
    }
    // Status filter (based on cout_achat)
    if (filterStatus === "renseigne") {
      if (p.cout_achat == null) return false;
    } else if (filterStatus === "pending") {
      if (p.cout_achat != null) return false;
    }
    // Supplier filter
    if (filterSupplier !== "all") {
      if (p.nom_fournisseur !== filterSupplier) return false;
    }
    return true;
  });

  // Unique supplier list for the dropdown
  const supplierList = [
    ...new Set(products.map((p) => p.nom_fournisseur).filter(Boolean)),
  ].sort();

  const clearAllFilters = () => {
    setFilterMonth("");
    setFilterSearch("");
    setFilterStatus("all");
    setFilterSupplier("all");
  };

  const hasActiveFilters =
    filterMonth ||
    filterSearch ||
    filterStatus !== "all" ||
    filterSupplier !== "all";

  const handleSave = async (id) => {
    const p = products.find((x) => x._id === id);
    if (!p || !p.decision?.toLowerCase().includes("rebut")) return;

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
      const promises = filteredProducts.map((p) => {
        if (!p.decision?.toLowerCase().includes("rebut")) {
          return Promise.resolve();
        }
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
              {filteredProducts.length}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Coûts renseignés</div>
            <div className="stat-val" style={{ color: "var(--green)" }}>
              {filteredProducts.filter((p) => p.cout_achat != null).length}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">En attente</div>
            <div className="stat-val" style={{ color: "var(--red)" }}>
              {filteredProducts.filter((p) => p.cout_achat == null).length}
            </div>
          </div>
        </div>

        {/* Filters */}
        {products.length > 0 && (
          <div className="search-filter-bar">
            <div className="form-group grow">
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="🔍 Rechercher (ref, article, fournisseur…)"
              />
            </div>

            <div className="form-group shrink">
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                title="Filtrer par mois"
                className="form-control"
              />
            </div>

            <div className="form-group shrink">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Tous les statuts</option>
                <option value="renseigne">✅ Coût Achat renseigné</option>
                <option value="pending">⏳ En attente</option>
              </select>
            </div>

            <div className="form-group shrink">
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
              >
                <option value="all">Tous les fournisseurs</option>
                {supplierList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                className="btn"
                onClick={clearAllFilters}
                title="Effacer tous les filtres"
              >
                ✕ Effacer
              </button>
            )}

            <span className="results-count">
              {filteredProducts.length} / {products.length} Produits
            </span>
          </div>
        )}

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
                  <th>Fournisseur Flux</th>
                  <th>Valeur IFS</th>
                  <th style={{ color: "var(--amber)" }}>
                    Coût Achat (Matiére Premiere)
                  </th>
                  <th>Validé par</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
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
                    <td>{fmt(p.fournisseur_flux)}</td>
                    <td>{fmt(p.valeur_ifs)}</td>
                    <td>
                      <input
                        className="inline-input"
                        type="number"
                        step="0.01"
                        placeholder={
                          p.decision?.toLowerCase().includes("rebut")
                            ? "0.00"
                            : "N/A"
                        }
                        value={editing[p._id] ?? ""}
                        onChange={(e) =>
                          setEditing((prev) => ({
                            ...prev,
                            [p._id]: e.target.value,
                          }))
                        }
                        disabled={!p.decision?.toLowerCase().includes("rebut")}
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
                          disabled={
                            saving[p._id] ||
                            !p.decision?.toLowerCase().includes("rebut")
                          }
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
            disabled={savingAll || filteredProducts.length === 0}
            style={{ width: "auto", whiteSpace: "nowrap" }}
          >
            {savingAll ? "⏳ Sauvegarde..." : "💾 Sauvegarder tout"}
          </button>
        </div>
      </div>
    </div>
  );
}
