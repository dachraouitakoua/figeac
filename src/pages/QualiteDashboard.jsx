import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "../components/Navbar";
import axiosInstance from "../api/axiosInstance";
import Select from "react-select";
import * as XLSX from "xlsx";
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

const EMPTY = {
  description: "",
  date_creation: "",
  order_ref: "",
  cep: "",
  article: "",
  quantite: "",
  decision: "",
  nom_fournisseur: "",
  valeur_ifs: "",
};

const decisionOptions = [
  { value: "", label: "-- Choisir une décision --" },
  { value: "A retoucher", label: "A retoucher" },
  { value: "Non réparable", label: "Non réparable" },
  { value: "A retourner", label: "A retourner" },
  { value: "Dérogation", label: "Dérogation" },
  { value: "A réparer", label: "A réparer" },
  { value: "Composant a remplacer", label: "Composant a remplacer" },
];

const FournisseurOptions = [
  { value: "", label: "-- Choisir un fournisseur --" },
  {
    value: "AERO TUNISIA AEROSPACE COMPANY",
    label: "AERO TUNISIA AEROSPACE COMPANY",
  },
  { value: "CASABLANCA AÉRONAUTIQUE", label: "CASABLANCA AÉRONAUTIQUE" },
  { value: "DELMON GROUP TUNISIA", label: "DELMON GROUP TUNISIA" },
  {
    value: "EMP ENGINEERING&MACHINING PRECISION",
    label: "EMP ENGINEERING&MACHINING PRECISION",
  },
  { value: "ESM", label: "ESM" },
  { value: "IAT", label: "IAT" },
  {
    value: "MASA MECANIZACIONES AERONAUTICAS",
    label: "MASA MECANIZACIONES AERONAUTICAS",
  },
  { value: "MECACHROME", label: "MECACHROME" },
  { value: "MECACHROME TUNISIA", label: "MECACHROME TUNISIA" },
  { value: "MECAPROTEC AERO MPA TUN", label: "MECAPROTEC AERO MPA TUN" },
  { value: "MECAPROTEC INDUSTRIES", label: "MECAPROTEC INDUSTRIES" },
  { value: "NANI TECH", label: "NANI TECH" },
  { value: "SMP TUNISIE", label: "SMP TUNISIE" },
  { value: "SOLUTIONS COMPOSITES", label: "SOLUTIONS COMPOSITES" },
  {
    value: "ST CHRISTOPHE THILLOIS GARAGE",
    label: "ST CHRISTOPHE THILLOIS GARAGE",
  },
  { value: "TECHNIPROTEC METAL TPM", label: "TECHNIPROTEC METAL TPM" },
  { value: "TPM", label: "TPM" },
  { value: "UGI", label: "UGI" },
  { value: "VB INDUSTRIEA VBI", label: "VB INDUSTRIEA VBI" },
  { value: "FIGEAC AERO TUNISIE", label: "FIGEAC AERO TUNISIE" },
  { value: "FLUID FORMING TECHNOLOGIES", label: "FLUID FORMING TECHNOLOGIES" },
  { value: "UAP ALUMINUM TUNISIE", label: "UAP ALUMINUM TUNISIE" },
  { value: "UAP METAUX DURS TUNISIE", label: "UAP METAUX DURS TUNISIE" },
  { value: "UAP PROFILES TUNISIE", label: "UAP PROFILES TUNISIE" },
  {
    value: "UAP -TOLERIE&MONTAGE TUNISIE",
    label: "UAP -TOLERIE&MONTAGE TUNISIE",
  },
  { value: "SUD AERO", label: "SUD AERO" },
  { value: "MPA MEC-NE PAS UTILISER", label: "MPA MEC-NE PAS UTILISER" },
  { value: "MECABRIVE INDUSTRIES", label: "MECABRIVE INDUSTRIES" },
  { value: "MECAHERS AEROSPACE", label: "MECAHERS AEROSPACE" },
];

export default function QualiteDashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Multi-select & bulk decision state
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDecision, setBulkDecision] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Excel import state
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null); // { total, success, failed }

  // Filters state
  const [filterMonth, setFilterMonth] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("all");

  // Chart month filter (independent from table filter)
  const [chartMonth, setChartMonth] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/products");
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setError("");
    setShowModal(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      description: p.description || "",
      date_creation: p.date_creation ? p.date_creation.split("T")[0] : "",
      order_ref: p.order_ref,
      cep: p.cep,
      article: p.article,
      quantite: p.quantite,
      decision: p.decision,
      nom_fournisseur: p.nom_fournisseur,
      valeur_ifs: p.valeur_ifs,
    });
    setError("");
    setShowModal(true);
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        quantite: Number(form.quantite),
        valeur_ifs: Number(form.valeur_ifs),
      };
      if (editing) {
        await axiosInstance.patch(`/products/${editing._id}/qualite`, payload);
      } else {
        await axiosInstance.post("/products", payload);
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/products/${id}`);
      setDeleteId(null);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la sauvegarde");
    }
  };

  // ── Multi-select helpers ───────────────────────────────────────────────────
  const filteredProducts = products.filter((p) => {
    // Month filter
    if (filterMonth) {
      if (!p.date_creation) return false;
      if (!p.date_creation.startsWith(filterMonth)) return false;
    }
    // Search filter (ref, article, fournisseur)
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      const matches =
        (p.order_ref || "").toLowerCase().includes(q) ||
        (p.article || "").toLowerCase().includes(q) ||
        (p.nom_fournisseur || "").toLowerCase().includes(q) ||
        (p.cep || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q);
      if (!matches) return false;
    }
    // Status filter (based on cout_total)
    if (filterStatus === "calculated") {
      if (p.cout_total == null) return false;
    } else if (filterStatus === "pending") {
      if (p.cout_total != null) return false;
    }
    // Supplier filter
    if (filterSupplier !== "all") {
      if (p.nom_fournisseur !== filterSupplier) return false;
    }
    return true;
  });

  // Unique supplier list for the dropdown
  const supplierList = [...new Set(products.map((p) => p.nom_fournisseur).filter(Boolean))].sort();

  const clearAllFilters = () => {
    setFilterMonth("");
    setFilterSearch("");
    setFilterStatus("all");
    setFilterSupplier("all");
  };

  const hasActiveFilters = filterMonth || filterSearch || filterStatus !== "all" || filterSupplier !== "all";

  const allSelected =
    filteredProducts.length > 0 &&
    selectedIds.length === filteredProducts.length;
  const someSelected =
    selectedIds.length > 0 && selectedIds.length < filteredProducts.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p._id));
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleBulkDecision = async () => {
    if (!bulkDecision || selectedIds.length === 0) return;
    console.log("###### bulkDecision");
    console.log(bulkDecision);
    setBulkSaving(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          axiosInstance.patch(`/products/${id}/qualite`, {
            decision: bulkDecision,
          }),
        ),
      );
      setSelectedIds([]);
      setBulkDecision("");
      fetchProducts();
    } catch (err) {
      console.error("Bulk error:", err.response?.status, err.response?.data);
    } finally {
      setBulkSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    try {
      await Promise.all(
        selectedIds.map((id) => axiosInstance.delete(`/products/${id}`)),
      );
      setSelectedIds([]);
      setBulkDeleteConfirm(false);
      fetchProducts();
    } catch (err) {
      console.error("Bulk delete error:", err.response?.status, err.response?.data);
    } finally {
      setBulkDeleting(false);
    }
  };

  const fmt = (v) => (v != null ? v : "—");

  // ── Excel column → field mapping (flexible header names) ──────────────────
  const HEADER_MAP = {
    description: ["description", "Description", "desc"],
    date_creation: [
      "date_creation",
      "date de creation",
      "date création",
      "date creation",
      "date",
    ],
    order_ref: [
      "order_ref",
      "order ref",
      "référence commande",
      "ref commande",
      "orderref",
      "order ref1",
      "order ref 1",
      "commande",
      "n° commande",
      "no commande",
    ],
    cep: ["cep", "code cep", "n° cep", "no cep", "num cep", "numero cep"],
    article: [
      "article",
      "nom article",
      "nom de l'article",
      "code article",
      "ref article",
      "référence article",
    ],
    quantite: [
      "quantite",
      "quantité",
      "qty",
      "qté",
      "qte cep",
      "qté cep",
      "quantite cep",
      "quantité cep",
      "nb pieces",
      "nb pièces",
    ],
    decision: [
      "decision",
      "décision",
      "famille défaut",
      "famille defaut",
      "type défaut",
      "type defaut",
    ],
    nom_fournisseur: [
      "nom_fournisseur",
      "fournisseur",
      "nom fournisseur",
      "supplier",
      "description imputation",
      "imputation",
      "site",
    ],
    valeur_ifs: [
      "valeur_ifs",
      "valeur ifs",
      "ifs",
      "valeurs pces",
      "valeur pieces",
      "valeur pièces",
      "montant",
    ],
  };

  const resolveHeaders = (rawHeaders) => {
    // Returns { excelKey: fieldName } map
    const result = {};
    rawHeaders.forEach((h) => {
      const normalized = String(h).toLowerCase().trim();
      for (const [field, aliases] of Object.entries(HEADER_MAP)) {
        if (aliases.includes(normalized)) {
          result[h] = field;
          break;
        }
      }
    });
    return result;
  };

  // Convert Excel serial date → "YYYY-MM-DD"
  const excelDateToISO = (val) => {
    if (!val) return "";
    if (typeof val === "number") {
      const d = XLSX.SSF.parse_date_code(val);
      if (d) {
        const mm = String(d.m).padStart(2, "0");
        const dd = String(d.d).padStart(2, "0");
        return `${d.y}-${mm}-${dd}`;
      }
    }
    // Already a string
    const s = String(val).trim();
    // Try DD/MM/YYYY
    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmy)
      return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
    return s; // fallback
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = ""; // reset so same file can be re-selected
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      if (rows.length < 2) {
        setImportResult({
          total: 0,
          success: 0,
          failed: 0,
          error: "Fichier vide ou sans données.",
        });
        setImporting(false);
        return;
      }

      const rawHeaders = rows[0];
      const headerMap = resolveHeaders(rawHeaders);
      const dataRows = rows.slice(1).filter((r) => r.some((c) => c !== ""));

      let success = 0;
      let failed = 0;
      let errorMessages = new Set();

      for (const row of dataRows) {
        const product = {};
        for (const key of Object.keys(EMPTY)) {
          product[key] = null;
        }

        rawHeaders.forEach((h, i) => {
          const field = headerMap[h];
          if (!field) return;
          const cell = row[i];
          if (cell == null || cell === "") return;

          if (field === "date_creation") {
            product[field] = excelDateToISO(cell);
          } else if (field === "quantite" || field === "valeur_ifs") {
            product[field] = Number(cell);
          } else {
            product[field] = String(cell).trim();
          }
        });

        try {
          // Only send fields that have actual values — avoids validation errors for missing columns
          const cleanProduct = Object.fromEntries(
            Object.entries(product).filter(
              ([, v]) => v !== null && v !== "" && v !== undefined,
            ),
          );
          await axiosInstance.post("/products", cleanProduct);
          success++;
        } catch (err) {
          failed++;
          const rawMsg =
            err.response?.data?.message || err.message || "Erreur inconnue";

          let cleanMsg = rawMsg;
          if (
            rawMsg.includes("validation failed") ||
            rawMsg.includes("is required") ||
            rawMsg.includes("required")
          ) {
            const fields = [];
            if (rawMsg.includes("description")) fields.push("Description");
            if (rawMsg.includes("order_ref")) fields.push("Order Ref");
            if (rawMsg.includes("cep")) fields.push("CEP");
            if (rawMsg.includes("article")) fields.push("Article");
            if (rawMsg.includes("quantite")) fields.push("Quantité");
            if (rawMsg.includes("nom_fournisseur")) fields.push("Fournisseur");

            if (fields.length > 0) {
              cleanMsg = `Colonne(s) obligatoire(s) manquante(s) ou vide(s) : ${fields.join(", ")}`;
            } else {
              cleanMsg =
                "Certaines colonnes obligatoires sont manquantes ou vides.";
            }
          } else if (
            rawMsg.includes("Cast to Number") ||
            rawMsg.includes("Cast to date") ||
            rawMsg.includes("CastError")
          ) {
            let field = "une colonne";
            if (rawMsg.includes("quantite")) field = "Quantité";
            if (rawMsg.includes("valeur_ifs")) field = "Valeur IFS";
            if (rawMsg.includes("date_creation")) field = "Date Création";
            cleanMsg = `Format invalide pour la colonne "${field}" (texte au lieu d'un nombre ou d'une date).`;
          } else if (
            rawMsg.includes("E11000") ||
            rawMsg.includes("duplicate key")
          ) {
            cleanMsg =
              "Un produit avec une référence identique existe déjà (Doublon).";
          }

          errorMessages.add(cleanMsg);
        }
      }

      setImportResult({
        total: dataRows.length,
        success,
        failed,
        details: Array.from(errorMessages),
      });
      fetchProducts();
    } catch (err) {
      setImportResult({
        total: 0,
        success: 0,
        failed: 0,
        error: "Erreur de lecture du fichier.",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="dashboard">
      <Navbar />
      <div className="dash-content">
        {/* Header */}
        <div className="dash-header">
          <div>
            <h2>📋 Gestion des CEP</h2>
            <p>Ajoutez, modifiez et supprimez vos CEP</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {/* Hidden file input for Excel */}
            <input
              ref={fileInputRef}
              id="excel-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={handleImportExcel}
            />
            <button
              id="btn-import-excel"
              className="btn btn-secondary"
              style={{ width: "auto" }}
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? "⏳ Import…" : "📥 Importer Excel"}
            </button>
            <button
              id="btn-add-product"
              className="btn btn-primary"
              style={{ width: "auto" }}
              onClick={openCreate}
            >
              + Nouveau CEP
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Total CEP</div>
            <div className="stat-val" style={{ color: "var(--blue)" }}>
              {filteredProducts.length}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Quantité Totale</div>
            <div className="stat-val" style={{ color: "var(--accent)" }}>
              {filteredProducts.reduce((s, p) => s + (p.quantite || 0), 0)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Décisions Acceptées</div>
            <div className="stat-val" style={{ color: "var(--green)" }}>
              {
                filteredProducts.filter((p) =>
                  p.decision?.toLowerCase().includes("accept"),
                ).length
              }
            </div>
          </div>
        </div>

        {/* Filters */}
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
              <option value="calculated">✅ Coût Total calculé</option>
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
                <option key={s} value={s}>{s}</option>
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
            {filteredProducts.length} / {products.length} CEP
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="spinner" />
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <p>Aucun CEP pour l'instant. Commencez par en ajouter un.</p>
          </div>
        ) : (
          <>
            {/* Bulk action bar */}
            {selectedIds.length > 0 && (
              <div className="bulk-action-bar">
                <span className="bulk-count">
                  {selectedIds.length} ligne{selectedIds.length > 1 ? "s" : ""}{" "}
                  sélectionnée{selectedIds.length > 1 ? "s" : ""}
                </span>
                <select
                  className="bulk-select"
                  value={bulkDecision}
                  onChange={(e) => setBulkDecision(e.target.value)}
                >
                  <option value="">-- Choisir une décision --</option>
                  <option value="A retoucher">A retoucher</option>
                  <option value="Non réparable">Non réparable</option>
                  <option value="A retourner">A retourner</option>
                  <option value="Dérogation">Dérogation</option>
                  <option value="A réparer">A réparer</option>
                  <option value="Composant a remplacer">
                    Composant a remplacer
                  </option>
                  <option value="Accepté">Accepté</option>
                  <option value="Refusé">Refusé</option>
                </select>
                <button
                  className="btn btn-primary"
                  style={{ width: "auto", padding: "6px 16px" }}
                  onClick={handleBulkDecision}
                  disabled={!bulkDecision || bulkSaving}
                >
                  {bulkSaving ? "⏳ Application…" : "✔ Appliquer"}
                </button>
                <button
                  className="btn btn-danger"
                  style={{ width: "auto", padding: "6px 14px" }}
                  onClick={() => setBulkDeleteConfirm(true)}
                  title={`Supprimer les ${selectedIds.length} ligne(s) sélectionnée(s)`}
                >
                  🗑 Supprimer tout
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ width: "auto", padding: "6px 14px" }}
                  onClick={() => setSelectedIds([])}
                >
                  Annuler
                </button>
              </div>
            )}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        className="row-checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected;
                        }}
                        onChange={toggleSelectAll}
                        title="Tout sélectionner"
                      />
                    </th>
                    <th>Description</th>
                    <th>Date Création</th>
                    <th>Order Ref</th>
                    <th>CEP</th>
                    <th>Article</th>
                    <th>Quantité</th>
                    <th>Décision</th>
                    <th>Fournisseur</th>
                    <th>Valeur IFS</th>
                    <th>Validé par</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const isSelected = selectedIds.includes(p._id);
                    return (
                      <tr
                        key={p._id}
                        className={isSelected ? "row-selected" : ""}
                        onClick={() => toggleSelectRow(p._id)}
                        style={{ cursor: "pointer" }}
                      >
                        <td
                          style={{ textAlign: "center" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="row-checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(p._id)}
                          />
                        </td>
                        <td>{fmt(p.description)}</td>
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
                        <td>{fmt(p.valider_par_qualite)}</td>
                        <td
                          style={{ display: "flex", gap: "8px" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="btn btn-blue btn-icon"
                            title="Modifier"
                            onClick={() => openEdit(p)}
                          >
                            ✏
                          </button>
                          <button
                            className="btn btn-danger btn-icon"
                            title="Supprimer"
                            onClick={() => setDeleteId(p._id)}
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Fournisseur Quantity Chart ─────────────────────────────────────────── */}
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
                  📊 Top fournisseurs par quantité de pièces
                </h3>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "0.8rem",
                    opacity: 0.6,
                  }}
                >
                  {chartMonth
                    ? `Données pour ${new Date(chartMonth + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`
                    : "Toutes les périodes"}
                </p>
              </div>

              <div className="form-group shrink">
                <input
                  type="month"
                  value={chartMonth}
                  onChange={(e) => setChartMonth(e.target.value)}
                  className="form-control"
                  style={{ width: "auto" }}
                  title="Filtrer le graphique par mois"
                />
                {chartMonth && (
                  <button
                    className="btn"
                    onClick={() => setChartMonth("")}
                    title="Afficher tous les mois"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Chart */}
            {(() => {
              const source = chartMonth
                ? products.filter(
                    (p) =>
                      p.date_creation && p.date_creation.startsWith(chartMonth),
                  )
                : products;

              const chartData = Object.entries(
                source.reduce((acc, p) => {
                  const key = p.nom_fournisseur || "—";
                  acc[key] = (acc[key] || 0) + (p.quantite || 0);
                  return acc;
                }, {}),
              )
                .map(([name, quantite]) => ({ name, quantite }))
                .sort((a, b) => b.quantite - a.quantite)
                .slice(0, 10);

              const COLORS = [
                "#00d4aa",
                "#3b82f6",
                "#f59e0b",
                "#8b5cf6",
                "#ef4444",
                "#10b981",
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
                    margin={{ top: 10, right: 20, left: 0, bottom: 100 }}
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
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#f1f1f1ff",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        color: "#f1f5f9",
                        fontSize: 12,
                      }}
                      formatter={(value) => [`${value} pièces`, "Quantité"]}
                      labelStyle={{ color: "#00d4aa", fontWeight: 700 }}
                    />
                    <Bar
                      dataKey="quantite"
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? "✏ Modifier le CEP" : "+ Nouveau CEP"}</h3>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            {error && <div className="alert alert-error">⚠ {error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group full-width">
                  <label>Description</label>
                  <input
                    name="description"
                    value={form.description}
                    type="text"
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Date de création</label>
                  <input
                    name="date_creation"
                    type="date"
                    value={form.date_creation}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Order Ref</label>
                  <input
                    name="order_ref"
                    type="text"
                    placeholder="ex: ORD-2024-001"
                    value={form.order_ref}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>CEP</label>
                  <input
                    name="cep"
                    type="text"
                    placeholder="Code CEP"
                    value={form.cep}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Article</label>
                  <input
                    name="article"
                    type="text"
                    placeholder="Nom de l'article"
                    value={form.article}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantité</label>
                  <input
                    name="quantite"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.quantite}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Decision</label>

                  <select
                    name="decision"
                    value={form.decision}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Choisir une décision --</option>
                    <option value="A retoucher">A retoucher</option>
                    <option value="Rebut">Rebut</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Fournisseur</label>
                  <input
                    list="fournisseurs-list"
                    name="nom_fournisseur"
                    value={form.nom_fournisseur}
                    onChange={handleChange}
                    placeholder="Sélectionner ou taper un nouveau..."
                    required
                  />
                  <datalist id="fournisseurs-list">
                    {FournisseurOptions.filter((f) => f.value).map((f, i) => (
                      <option key={i} value={f.value} />
                    ))}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>Valeur IFS</label>
                  <input
                    name="valeur_ifs"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.valeur_ifs}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Annuler
                </button>
                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving
                    ? "Sauvegarde…"
                    : editing
                      ? "Mettre à jour"
                      : "Créer le CEP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Result Modal */}
      {importResult && (
        <div className="modal-overlay" onClick={() => setImportResult(null)}>
          <div
            className="modal"
            style={{ maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>📥 Résultat de l'import</h3>
              <button
                className="modal-close"
                onClick={() => setImportResult(null)}
              >
                ×
              </button>
            </div>
            {importResult.error ? (
              <div className="alert alert-error" style={{ margin: "16px 0" }}>
                ⚠ {importResult.error}
              </div>
            ) : (
              <div style={{ padding: "8px 0 16px" }}>
                <div style={{ display: "flex", gap: "12px", marginBottom: 16 }}>
                  <div
                    className="stat-card"
                    style={{ flex: 1, textAlign: "center" }}
                  >
                    <div className="stat-label">Total lignes</div>
                    <div className="stat-val" style={{ color: "var(--blue)" }}>
                      {importResult.total}
                    </div>
                  </div>
                  <div
                    className="stat-card"
                    style={{ flex: 1, textAlign: "center" }}
                  >
                    <div className="stat-label">✅ Succès</div>
                    <div className="stat-val" style={{ color: "var(--green)" }}>
                      {importResult.success}
                    </div>
                  </div>
                  <div
                    className="stat-card"
                    style={{ flex: 1, textAlign: "center" }}
                  >
                    <div className="stat-label">❌ Échecs</div>
                    <div
                      className="stat-val"
                      style={{ color: "var(--red, #e55)" }}
                    >
                      {importResult.failed}
                    </div>
                  </div>
                </div>
                {importResult.failed > 0 && (
                  <div
                    style={{
                      color: "var(--red, #e55)",
                      fontSize: "0.85rem",
                      marginTop: "1rem",
                      padding: "10px",
                      background: "rgba(238, 85, 85, 0.1)",
                      borderRadius: "8px",
                    }}
                  >
                    <strong style={{ display: "block", marginBottom: "8px" }}>
                      Détails des échecs :
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: "20px" }}>
                      {importResult.details?.map((msg, idx) => (
                        <li key={idx}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="form-actions">
              <button
                className="btn-submit"
                onClick={() => setImportResult(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div
            className="modal"
            style={{ maxWidth: 380 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>🗑 Supprimer le CEP</h3>
              <button className="modal-close" onClick={() => setDeleteId(null)}>
                ×
              </button>
            </div>
            <p style={{ color: "var(--text-2)", marginBottom: 24 }}>
              Cette action est irréversible. Êtes-vous sûr de vouloir supprimer
              ce CEP ?
            </p>
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setDeleteId(null)}>
                Annuler
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(deleteId)}
              >
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm Modal */}
      {bulkDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setBulkDeleteConfirm(false)}>
          <div
            className="modal"
            style={{ maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>🗑 Supprimer la sélection</h3>
              <button
                className="modal-close"
                onClick={() => setBulkDeleteConfirm(false)}
              >
                ×
              </button>
            </div>
            <p style={{ color: "var(--text-2)", marginBottom: 24 }}>
              Vous êtes sur le point de supprimer{" "}
              <strong>{selectedIds.length}</strong> CEP
              {selectedIds.length > 1 ? "s" : ""}. Cette action est
              irréversible.
            </p>
            <div className="form-actions">
              <button
                className="btn-cancel"
                onClick={() => setBulkDeleteConfirm(false)}
                disabled={bulkDeleting}
              >
                Annuler
              </button>
              <button
                className="btn btn-danger"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
              >
                {bulkDeleting
                  ? "⏳ Suppression…"
                  : `Oui, supprimer ${selectedIds.length} CEP${selectedIds.length > 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
