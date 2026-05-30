import { useState, useEffect, useCallback } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Navbar from "../components/Navbar";
import axiosInstance from "../api/axiosInstance";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function AchatDashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({});
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [savingAll, setSavingAll] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // "all" | "calculated" | "pending"
  const [filterFournisseur, setFilterFournisseur] = useState("all");
  const [filterMonth, setFilterMonth] = useState("");
  const [chartMonthTotal, setChartMonthTotal] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/products");
      setProducts(data);
      const init = {};
      data.forEach((p) => {
        init[p._id] = {
          prix_vente: p.prix_vente ?? "",
          cout_presentation: p.cout_presentation ?? "",
        };
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

  const handleChange = (id, field, val) =>
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: val } }));

  const handleSave = async (id) => {
    const p = products.find((x) => x._id === id);
    if (!p || p.cout_achat == null) return;

    const row = editing[id] || {};
    setSaving((s) => ({ ...s, [id]: true }));
    try {
      await axiosInstance.patch(`/products/${id}/achat`, {
        prix_vente: row.prix_vente !== "" ? Number(row.prix_vente) : undefined,
        cout_presentation:
          row.cout_presentation !== ""
            ? Number(row.cout_presentation)
            : undefined,
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
        if (p.cout_achat == null) {
          return Promise.resolve();
        }
        const row = editing[p._id] || {};
        const pvInput = row.prix_vente;
        const cpInput = row.cout_presentation;

        let changed = false;
        let payload = {};

        if (
          pvInput !== "" &&
          pvInput != null &&
          Number(pvInput) !== p.prix_vente
        ) {
          changed = true;
          payload.prix_vente = Number(pvInput);
        }
        if (
          cpInput !== "" &&
          cpInput != null &&
          Number(cpInput) !== p.cout_presentation
        ) {
          changed = true;
          payload.cout_presentation = Number(cpInput);
        }

        if (changed) {
          setSaving((s) => ({ ...s, [p._id]: true }));
          return axiosInstance
            .patch(`/products/${p._id}/achat`, payload)
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

  // Live preview of Cout_Total using local editing values
  const previewTotal = (p) => {
    const row = editing[p._id] || {};
    const qty = p.quantite;
    const ca = p.cout_achat;
    const pv = row.prix_vente !== "" ? Number(row.prix_vente) : p.prix_vente;
    const cp =
      row.cout_presentation !== ""
        ? Number(row.cout_presentation)
        : p.cout_presentation;
    if (qty != null && ca != null && pv != null && cp != null) {
      return (qty * (ca - pv) + cp).toFixed(2);
    }
    return null;
  };

  const fournisseurs = [
    ...new Set(products.map((p) => p.nom_fournisseur).filter(Boolean)),
  ];

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (p.order_ref || "").toLowerCase().includes(q) ||
      (p.article || "").toLowerCase().includes(q) ||
      (p.nom_fournisseur || "").toLowerCase().includes(q);

    const total = previewTotal(p);
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "calculated" && total !== null) ||
      (filterStatus === "pending" && total === null);

    const matchFournisseur =
      filterFournisseur === "all" || p.nom_fournisseur === filterFournisseur;

    const matchMonth =
      !filterMonth ||
      (p.date_creation && p.date_creation.startsWith(filterMonth));

    return matchSearch && matchStatus && matchFournisseur && matchMonth;
  });
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("FIGEAC AERO — Rapport CEP", 14, 15);
    doc.setFontSize(9);

    const getFrenchMonthYear = (monthStr) => {
      if (!monthStr) return "";
      const [year, month] = monthStr.split("-");
      const months = [
        "janvier",
        "février",
        "mars",
        "avril",
        "mai",
        "juin",
        "juillet",
        "août",
        "septembre",
        "octobre",
        "novembre",
        "décembre",
      ];
      const monthIdx = parseInt(month, 10) - 1;
      return monthIdx >= 0 && monthIdx < 12
        ? `${months[monthIdx]} ${year}`
        : monthStr;
    };

    const monthText = filterMonth
      ? `Pour le mois de: ${getFrenchMonthYear(filterMonth)}`
      : `Exporté le ${new Date().toLocaleDateString("fr-FR")}`;
    doc.text(`${monthText}`, 14, 21);

    const head = [
      [
        "Date",
        "Order Ref",
        "CEP",
        "Article",
        "Qté",
        "Décision",
        "Fournisseur",
        "Fournisseur Flux",
        "Coût Achat",
        "Coût de chutes & Copeaux",
        "Coût Présentation",
        "Coût Total",
        "Val. Qualité",
        "Val. Finance",
        "Val. Achat",
      ],
    ];
    const body = filteredProducts.map((p) => {
      const total = previewTotal(p);
      return [
        p.date_creation
          ? new Date(p.date_creation).toLocaleDateString("fr-FR")
          : "—",
        p.order_ref || "—",
        p.cep || "—",
        p.article || "—",
        p.quantite ?? "—",
        p.decision || "—",
        p.nom_fournisseur || "—",
        p.fournisseur_flux || "—",
        p.cout_achat != null ? `${p.cout_achat} ` : "—",
        p.prix_vente != null ? `${p.prix_vente} ` : "—",
        p.cout_presentation != null ? `${p.cout_presentation} ` : "—",
        total != null ? `${total} ` : "—",
        p.valider_par_qualite || "—",
        p.valider_par_finance || "—",
        p.valider_par_achat || "—",
      ];
    });

    autoTable(doc, {
      head,
      body,
      startY: 26,
      styles: { fontSize: 7.5, cellPadding: 3 },
      headStyles: {
        fillColor: [0, 212, 170],
        textColor: [10, 14, 24],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      margin: { left: 10, right: 10 },
    });

    doc.save(`figeac-aero-produits-${Date.now()}.pdf`);
  };

  const fmt = (v) => (v != null ? v : "—");

  return (
    <div className="dashboard">
      <Navbar />
      <div className="dash-content">
        <div className="dash-header">
          <div>
            <h2>🛒 Tableau de Bord Achat</h2>
            <p>
              Renseignez Prix Vente & Coût Préstation — Coût Total calculé
              automatiquement
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              id="btn-export-pdf"
              className="btn btn-success"
              onClick={exportPDF}
              style={{ whiteSpace: "nowrap" }}
            >
              📄 Exporter PDF
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Total Produits</div>
            <div className="stat-val" style={{ color: "var(--green)" }}>
              {filteredProducts.length}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Coûts Totaux calculés</div>
            <div className="stat-val" style={{ color: "var(--accent)" }}>
              {filteredProducts.filter((p) => previewTotal(p) !== null).length}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Somme Coûts Totaux</div>
            <div
              className="stat-val"
              style={{ color: "var(--amber)", fontSize: "1.2rem" }}
            >
              {filteredProducts
                .map((p) => previewTotal(p))
                .filter(Boolean)
                .reduce((s, v) => s + parseFloat(v), 0)
                .toFixed(2)}{" "}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="search-filter-bar">
          <div className="form-group grow">
            <input
              type="text"
              placeholder="🔍 Rechercher (ref, article, fournisseur…)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
              <option value="calculated">✅ Coût Total calculé</option>
              <option value="pending">⏳ En attente</option>
            </select>
          </div>

          <div className="form-group shrink">
            <select
              value={filterFournisseur}
              onChange={(e) => setFilterFournisseur(e.target.value)}
            >
              <option value="all">Tous les fournisseurs</option>
              {fournisseurs.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {(search ||
            filterMonth ||
            filterStatus !== "all" ||
            filterFournisseur !== "all") && (
            <button
              className="btn"
              onClick={() => {
                setSearch("");
                setFilterMonth("");
                setFilterStatus("all");
                setFilterFournisseur("all");
              }}
            >
              ✕
            </button>
          )}

          <span className="results-count">
            {filteredProducts.length} / {products.length} produits
          </span>
        </div>
        {loading ? (
          <div className="spinner" />
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>Aucun produit correspondant.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order Ref</th>
                  <th>Article</th>
                  <th>Qté</th>
                  <th>Fournisseur</th>
                  <th>Fournisseur Flux</th>
                  <th>Val. IFS</th>
                  <th style={{ color: "var(--amber)" }}>Coût Achat</th>
                  <th style={{ color: "var(--green)" }}>
                    Coût de chutes & Copeaux
                  </th>
                  <th style={{ color: "var(--green)" }}>
                    Coût Présentation ()
                  </th>
                  <th>Validé par</th>
                  <th style={{ color: "var(--accent)" }}>Coût Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const total = previewTotal(p);
                  const row = editing[p._id] || {};
                  return (
                    <tr key={p._id}>
                      <td>
                        {p.date_creation
                          ? new Date(p.date_creation).toLocaleDateString(
                              "fr-FR",
                            )
                          : "—"}
                      </td>
                      <td>
                        <strong>{fmt(p.order_ref)}</strong>
                      </td>
                      <td>{fmt(p.article)}</td>
                      <td>{fmt(p.quantite)}</td>
                      <td className="muted">{fmt(p.nom_fournisseur)}</td>
                      <td>{fmt(p.fournisseur_flux)}</td>
                      <td>{fmt(p.valeur_ifs)}</td>
                      <td>
                        {p.cout_achat != null ? (
                          <span className="chip chip-green">
                            {p.cout_achat}
                          </span>
                        ) : (
                          <span className="chip chip-null">Non défini</span>
                        )}
                      </td>
                      <td>
                        <input
                          className="inline-input"
                          type="number"
                          step="0.01"
                          placeholder={p.cout_achat != null ? "0.00" : "N/A"}
                          value={row.prix_vente ?? ""}
                          onChange={(e) =>
                            handleChange(p._id, "prix_vente", e.target.value)
                          }
                          disabled={p.cout_achat == null}
                          style={
                            p.prix_vente != null
                              ? { borderColor: "var(--green)" }
                              : {}
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="inline-input"
                          type="number"
                          step="0.01"
                          placeholder={p.cout_achat != null ? "0.00" : "N/A"}
                          value={row.cout_presentation ?? ""}
                          onChange={(e) =>
                            handleChange(
                              p._id,
                              "cout_presentation",
                              e.target.value,
                            )
                          }
                          disabled={p.cout_achat == null}
                          style={
                            p.cout_presentation != null
                              ? { borderColor: "var(--green)" }
                              : {}
                          }
                        />
                      </td>
                      <td>{fmt(p.valider_par_achat)}</td>
                      <td>
                        {total != null ? (
                          <span className="cout-total-val">{total} </span>
                        ) : (
                          <span className="chip chip-null">En attente</span>
                        )}
                      </td>
                      <td>
                        {saved[p._id] ? (
                          <span className="chip chip-green">✓ Sauvegardé</span>
                        ) : (
                          <button
                            className="btn btn-success"
                            onClick={() => handleSave(p._id)}
                            disabled={saving[p._id] || p.cout_achat == null}
                          >
                            {saving[p._id] ? "…" : "💾 Sauvegarder"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
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

        {/* ── Fournisseur Top Cost Chart ─────────────────────────────────────────── */}
        {products.length > 0 && (
          <div
            style={{
              marginTop: "2.5rem",
              background: "var(--card)",
              borderRadius: "16px",
              border: "1px solid var(--border)",
              padding: "1.5rem",
            }}
          >
            {/* Chart header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
                  📊 Top fournisseurs par Coût Total
                </h3>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "0.8rem",
                    opacity: 0.6,
                  }}
                >
                  {chartMonthTotal
                    ? `Données pour ${new Date(chartMonthTotal + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`
                    : "Toutes les périodes"}
                </p>
              </div>

              <div
                className="form-group shrink"
                style={{ display: "flex", gap: "6px", alignItems: "center" }}
              >
                <input
                  type="month"
                  value={chartMonthTotal}
                  onChange={(e) => setChartMonthTotal(e.target.value)}
                  className="form-control"
                  style={{ width: "auto" }}
                  title="Filtrer le graphique par mois"
                />
                {chartMonthTotal && (
                  <button
                    className="btn"
                    onClick={() => setChartMonthTotal("")}
                    title="Afficher tous les mois"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Chart */}
            {(() => {
              const source = chartMonthTotal
                ? products.filter(
                    (p) =>
                      p.date_creation &&
                      p.date_creation.startsWith(chartMonthTotal),
                  )
                : products;

              const chartData = Object.entries(
                source.reduce((acc, p) => {
                  const key = p.nom_fournisseur || "—";
                  const totalVal = previewTotal(p);
                  if (totalVal !== null) {
                    acc[key] = (acc[key] || 0) + parseFloat(totalVal);
                  }
                  return acc;
                }, {}),
              )
                .map(([name, totalCost]) => ({
                  name,
                  totalCost: parseFloat(totalCost.toFixed(2)),
                }))
                .sort((a, b) => b.totalCost - a.totalCost)
                .slice(0, 10);

              const COLORS = [
                "#10b981",
                "#3b82f6",
                "#f59e0b",
                "#8b5cf6",
                "#ef4444",
                "#00d4aa",
                "#f97316",
                "#06b6d4",
                "#ec4899",
                "#6366f1",
              ];

              if (chartData.length === 0) {
                return (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "2rem",
                      opacity: 0.5,
                    }}
                  >
                    Aucune donnée pour cette période.
                  </div>
                );
              }

              return (
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 100 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.07)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip
                      contentStyle={{
                        background: "#ffffffff",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        color: "#f1f5f9",
                        fontSize: 12,
                      }}
                      formatter={(value) => [
                        `${value.toFixed(2)}`,
                        "Coût Total",
                      ]}
                      labelStyle={{ color: "#10b981", fontWeight: 700 }}
                    />
                    <Bar
                      dataKey="totalCost"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={60}
                    >
                      {chartData.map((_, i) => (
                        <Cell
                          key={`cell-${i}`}
                          fill={COLORS[i % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
