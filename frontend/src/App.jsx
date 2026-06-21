import React, { useState, useEffect, useRef } from 'react';
import DashboardTab from './DashboardTab';
import ShipmentTracker from './ShipmentTracker';
import PreEstimator from './PreEstimator';
import { useAuth, AuthProvider } from './AuthContext';
import Login from './Login';
import Register from './Register';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { API_BASE_URL, TARIFF_VERSION, LAST_UPDATED } from './config';

// ─── THEME & DESIGN SYSTEM ───────────────────────────────────────────────
const C = {
  navy:   "#0A1628",
  navyL:  "#112240",
  blue:   "#1B4F9B",
  gold:   "#C8972B",
  goldL:  "#F0B429",
  white:  "#F5F7FA",
  muted:  "#8899AA",
  border: "#1E3A5F",
  green:  "#1A7F5A",
  red:    "#B03A2E",
  card:   "#0D1F3C",
};

const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0A0F1E;
    color: #E8F0FE;
    font-family: 'Inter', sans-serif;
    position: relative;
  }
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(200,151,43,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(200,151,43,0.04) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
    z-index: 0;
  }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #112240; }
  ::-webkit-scrollbar-thumb { background: #1E3A5F; border-radius: 3px; }
  input, select, textarea {
    background: #112240;
    border: 1px solid #1E3A5F;
    color: #E8F0FE;
    border-radius: 6px;
    padding: 10px 14px;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    outline: none;
    transition: all 0.2s;
    width: 100%;
  }
  input:focus, select:focus, textarea:focus {
    border-color: #C8972B;
    box-shadow: 0 0 8px rgba(200,151,43,0.2);
  }
  button { cursor: pointer; font-family: 'Inter', sans-serif; border: none; transition: all 0.2s; }
  button:hover { filter: brightness(1.1); }
  .mono { font-family: 'JetBrains Mono', monospace; }
  .card {
    background: #111827;
    border: 1px solid rgba(200,151,43,0.15);
    border-radius: 12px;
    padding: 20px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .card:hover {
    border-color: rgba(200,151,43,0.4);
    box-shadow: 0 0 30px rgba(200,151,43,0.06);
  }
  .badge-gold {
    background: #C8972B;
    color: #0A0F1E;
  }
  .pill {
    background: rgba(200,151,43,0.15);
    color: #C8972B;
    border: 1px solid rgba(200,151,43,0.3);
  }

  /* ─── Responsive Base ────────────────────────────────────────────── */
  html { font-size: 14px; }
  @media (max-width: 768px) { html { font-size: 13px; } }

  /* ─── Calculator Grid ───────────────────────────────────────────── */
  .calc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .calc-inputs { order: 0; }
  .calc-results { order: 0; }

  /* ─── Nav Tabs ──────────────────────────────────────────────────── */
  .nav-tabs {
    display: flex;
    overflow-x: auto;
    white-space: nowrap;
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .nav-tabs::-webkit-scrollbar { display: none; }
  .nav-tabs button {
    flex: 0 0 auto;
    padding: 14px 20px;
    font-size: 13px;
    font-weight: 400;
    background: transparent;
    border-bottom: 2px solid transparent;
    color: #8899AA;
    transition: all 0.2s;
  }
  .nav-tabs button.active {
    color: #F0B429;
    border-bottom-color: #C8972B;
    font-weight: 700;
  }

  /* ─── Table (HS Lookup) ────────────────────────────────────────── */
  .hs-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .hs-table th { text-align: left; padding: 12px 14px; background: #112240; color: #8899AA; border-bottom: 1px solid #1E3A5F; }
  .hs-table td { padding: 10px 14px; border-bottom: 1px solid #1E3A5F20; transition: background 0.2s; }
  .hs-table tr.expanded { background: #1B4F9B20; }
  .hs-table .hier-path { font-size: 11px; color: #8899AA; word-break: break-word; }
  .hs-table .species-badge { display: inline-flex; align-items: center; gap: 4px; background: #C8972B22; color: #F0B429; border: 1px solid #C8972B55; border-radius: 20px; padding: 2px 10px; font-size: 12px; font-weight: 600; }

  /* ─── Mobile Overrides ──────────────────────────────────────────── */
  @media (max-width: 768px) {
    .calc-grid { grid-template-columns: 1fr !important; }
    .calc-inputs { order: 1; }
    .calc-results { order: 2; }

    /* Nav tabs: horizontal scroll, no wrap */
    .nav-tabs button { font-size: 12px; padding: 12px 14px; }

    /* HS Lookup: hide Hdg No. & hierarchical path, show only Code + Description + Rate */
    .hs-table .hdg-col { display: none; }
    .hs-table .hier-path { display: none; }
    .hs-table .actions-col { display: none; } /* hide actions on mobile, use expand to show */
    /* Show expanded actions when row is expanded */
    .hs-table tr.expanded .actions-col { display: table-cell; }
    .hs-table tr.expanded .hier-path { display: inline; }

    /* History: hide timestamps */
    .history-timestamp { display: none; }

    /* AI Classifier: predictions full width (already stacked) */
    .ai-predictions { flex-direction: column; }
    .ai-predictions > div { width: 100%; }
  }

  /* ─── Tablet (768-1023px) ──────────────────────────────────────── */
  @media (min-width: 768px) and (max-width: 1023px) {
    /* Nav tabs: shrink font size */
    .nav-tabs button { font-size: 12px; padding: 12px 16px; }
    /* HS Lookup: hide breadcrumb path only */
    .hs-table .hier-path { display: none; }
    /* Calculator still 2-column but narrower padding */
    .calc-grid { gap: 12px; }
    .card { padding: 14px; }
  }

  /* ─── Sticky Compute Button ────────────────────────────────────── */
  .sticky-compute {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: 12px 20px;
    background: #0A1628;
    border-top: 1px solid #1E3A5F;
    z-index: 1000;
    display: none;
    justify-content: center;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.6);
  }
  .sticky-compute.visible { display: flex; }
  .sticky-compute button {
    width: 100%;
    max-width: 400px;
    padding: 14px;
    background: #C8972B;
    color: #0A0F1E;
    font-weight: 700;
    border-radius: 8px;
    font-size: 16px;
  }
  .sticky-compute button:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Touch targets */
  @media (max-width: 768px) {
    button, input, select, textarea { min-height: 44px; }
  }
`;

// ─── Helper Components ──────────────────────────────────────────────────
function Pill({ color, children }) {
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}55`,
      borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600,
      letterSpacing: "0.05em", textTransform: "uppercase",
    }}>{children}</span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: 20, ...style,
    }}>{children}</div>
  );
}

function SpeciesBadge({ species }) {
  if (!species) return null;
  return (
    <span className="species-badge">
      {species.emoji} {species.name}
    </span>
  );
}

const DEFAULT_SETTINGS = {
  vatRate: 12,
  bocProcessingFee: 250,
  docStampFee: 265,
  exchangeRate: 58.50,
  customOverrides: {},
};

// ─── Main App Content ──────────────────────────────────────────────────
function AppContent() {
  const { token, logout } = useAuth();
  const [tab, setTab] = useState("dashboard");
  const [sharedCodeData, setSharedCodeData] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('boc_theme') || 'dark');
  useEffect(() => {
    localStorage.setItem('boc_theme', theme);
    document.body.className = theme === 'light' ? 'theme-light' : '';
  }, [theme]);
  const handleTransferToCalc = (data) => {
    setSharedCodeData(prev => ({ ...(prev || {}), ...data }));
    setTab('calc');
  };
  const navigate = useNavigate();

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("boc_app_settings");
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem("boc_app_settings", JSON.stringify(settings));
  }, [settings]);

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("boc_calc_history");
    return saved ? JSON.parse(saved) : [];
  });

  const saveToHistory = (entry) => {
    const newHistory = [entry, ...history];
    setHistory(newHistory);
    localStorage.setItem("boc_calc_history", JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("boc_calc_history");
  };

  const loadHistoryEntry = (entry) => {
    setSharedCodeData({
      code: entry.ahtn_code || "0000.00.00",
      rate: entry.rate_of_duty || 0,
      desc: entry.description || "From history",
      path: "",
      species: null,
      fob: entry.fob_fca_value || 0,
      freight: entry.freight_cost || 0,
      insurance: entry.insurance_cost || 0
    });
    setTab("calc");
  };

  const handleCodeTransfer = (code, rate, desc, path, species, fob = 0, freight = 0, insurance = 0) => {
    setSharedCodeData({ code, rate, desc, path, species, fob, freight, insurance });
    setTab("calc");
  };

  // ─── HSLookup ──────────────────────────────────────────────────────────
  function HSLookup() {
    const [query, setQuery] = useState("");
    const [speciesFilter, setSpeciesFilter] = useState("");
    const [speciesList, setSpeciesList] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [injectedCodes, setInjectedCodes] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;
    const [selectedChapter, setSelectedChapter] = useState("");
    const [chapters, setChapters] = useState([]);
    const [chapterData, setChapterData] = useState([]);
    const [chapterLoading, setChapterLoading] = useState(false);
    // Expanded rows (mobile tap)
    const [expandedRows, setExpandedRows] = useState({});

    useEffect(() => {
      const fetchChapters = async () => {
        if (!token) return;
        try {
          const res = await fetch(`${API_BASE_URL}/chapters`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) setChapters(data.chapters || []);
        } catch (e) {}
      };
      fetchChapters();
    }, [token]);

    useEffect(() => {
      const fetchSpecies = async () => {
        if (!token) return;
        try {
          const res = await fetch(`${API_BASE_URL}/species`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) setSpeciesList(data.species || []);
        } catch (e) {}
      };
      fetchSpecies();
    }, [token]);

    useEffect(() => {
      if (!selectedChapter || !token) {
        setChapterData([]);
        return;
      }
      const fetchChapterData = async () => {
        setChapterLoading(true);
        try {
          const res = await fetch(`${API_BASE_URL}/chapter/${selectedChapter}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) {
            setChapterData(data.items || []);
            setResults([]);
            setQuery("");
            setCurrentPage(1);
          }
        } catch (e) {
          setError("Failed to load chapter data");
        }
        setChapterLoading(false);
      };
      fetchChapterData();
    }, [selectedChapter, token]);

    const search = async () => {
      if (!query.trim()) {
        if (selectedChapter) {
        } else {
          setResults([]);
        }
        return;
      }
      if (!token) { setError("Please log in to search"); return; }
      setLoading(true); setError(""); setResults([]); setCurrentPage(1);
      try {
        const params = new URLSearchParams({
          q: query,
          limit: 100,
        });
        if (speciesFilter) params.append('species', speciesFilter);
        const res = await fetch(`${API_BASE_URL}/search?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Search failed");
        setResults(data.results || []);
        setChapterData([]);
        setSelectedChapter("");
        if (!data.results?.length) setError("No matches found.");
      } catch (err) {
        setError(err.message || "API error.");
      }
      setLoading(false);
    };

    const handleInject = (code, finalRate, description, hierarchical_path, species) => {
      handleCodeTransfer(code, finalRate, description, hierarchical_path, species);
      setInjectedCodes(prev => ({ ...prev, [code]: true }));
      setTimeout(() => {
        setInjectedCodes(prev => ({ ...prev, [code]: false }));
      }, 2000);
    };

const handleAIClassify = (code, description) => {
    setTab("ai");
    window.__aiPrefill = description;
  };

    const copyToClipboard = (code) => {
      navigator.clipboard?.writeText(code).catch(() => {});
    };

    const toggleRow = (rowKey) => {
      setExpandedRows(prev => ({ ...prev, [rowKey]: !prev[rowKey] }));
    };

    const displayData = results.length > 0 ? results : chapterData;
    const totalPages = Math.ceil(displayData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = displayData.slice(startIndex, endIndex);

    const grouped = currentItems.reduce((acc, item) => {
      const heading = item.code?.slice(0, 4) || item.heading || "0000";
      if (!acc[heading]) acc[heading] = [];
      acc[heading].push(item);
      return acc;
    }, {});

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: C.navy, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
          <Card>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                placeholder="Enter HS code or keyword..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && search()}
                style={{ flex: 2, minWidth: 150 }}
              />
              <select
                value={speciesFilter}
                onChange={e => setSpeciesFilter(e.target.value)}
                style={{ flex: 0.3, minWidth: 100 }}
              >
                <option value="">All Species</option>
                {speciesList.map(sp => (
                  <option key={sp.name} value={sp.name}>{sp.emoji} {sp.name}</option>
                ))}
              </select>
              <button
                onClick={search}
                disabled={loading}
                style={{ background: C.gold, color: C.navy, padding: "0 16px", borderRadius: 7, fontWeight: 600, height: 44 }}
              >
                {loading ? "..." : "Search"}
              </button>
              <select
                value={selectedChapter}
                onChange={e => setSelectedChapter(e.target.value)}
                style={{ flex: 0.4, minWidth: 120 }}
              >
                <option value="">📖 Browse Chapter</option>
                {chapters.map(ch => (
                  <option key={ch.number} value={ch.number}>Ch. {ch.number}: {ch.title}</option>
                ))}
              </select>
            </div>
            {error && <p style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{error}</p>}
          </Card>
        </div>

        {displayData.length > 0 && (
          <>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflow: "auto", maxHeight: 500 }}>
                <table className="hs-table">
                  <thead>
                    <tr>
                      <th className="hdg-col" style={{ width: "15%" }}>Hdg No.</th>
                      <th style={{ width: "15%" }}>AHTN Code</th>
                      <th style={{ width: "40%" }}>Description</th>
                      <th style={{ width: "10%" }}>2026 MFN</th>
                      <th className="actions-col" style={{ width: "20%", textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(grouped).map(([heading, items]) => {
                      const firstItem = items[0];
                      const headingDesc = firstItem.hierarchical_path?.split('>')[1]?.trim() || firstItem.description || heading;
                      return (
                        <React.Fragment key={heading}>
                          <tr style={{ background: `${C.navyL}55`, borderTop: `2px solid ${C.border}` }}>
                            <td colSpan="5" style={{ padding: "8px 14px", fontWeight: 700, color: C.goldL }}>
                              {heading} – {headingDesc}
                            </td>
                          </tr>
                          {items.map((item, idx) => {
                            const rowKey = `${heading}-${idx}-${item.code}`;
                            const isExpanded = expandedRows[rowKey];
                            const hasOverride = settings.customOverrides[item.code] !== undefined;
                            const finalRate = hasOverride ? settings.customOverrides[item.code] : (item.rate_2024 || item.rate_2026 || item.mfn_rates?.["2026"] || 0);
                            const indent = item.code?.length > 4 ? 20 : 0;
                            const isInjected = injectedCodes[item.code];
                            const displayCode = item.code || item.ahtn_code || "N/A";
                            const displayDesc = item.description || "N/A";
                            const displayHeading = item.heading || heading;
                            let level = 0;
                            if (displayDesc.startsWith("-")) {
                              const dashCount = displayDesc.match(/^-+/)?.[0]?.length || 0;
                              level = Math.min(dashCount, 4);
                            }
                            const paddingLeft = 10 + level * 16;

                            return (
                              <tr
                                key={rowKey}
                                className={isExpanded ? 'expanded' : ''}
                                onClick={() => toggleRow(rowKey)}
                                style={{ cursor: 'pointer', borderBottom: `1px solid ${C.border}20` }}
                                onMouseEnter={(e) => e.currentTarget.style.background = `${C.blue}15`}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <td className="hdg-col mono" style={{ padding: "10px 14px", color: C.muted }}>
                                  {displayHeading}
                                </td>
                                <td className="mono" style={{ padding: "10px 14px", paddingLeft: paddingLeft, color: C.goldL, fontWeight: 600 }}>
                                  {displayCode}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); copyToClipboard(displayCode); }}
                                    style={{
                                      background: 'transparent',
                                      color: C.muted,
                                      border: 'none',
                                      cursor: 'pointer',
                                      marginLeft: 6,
                                      fontSize: 12
                                    }}
                                    title="Copy HS Code"
                                  >
                                    📋
                                  </button>
                                </td>
                                <td style={{ padding: "10px 14px", paddingLeft: paddingLeft, lineHeight: 1.5 }}>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <span style={{ fontSize: 13 }}>{displayDesc}</span>
                                    {item.hierarchical_path && (
                                      <span className="hier-path">
                                        {item.hierarchical_path.split(' > ').map((part, i, arr) => (
                                          <span key={i}>
                                            {part}
                                            {i < arr.length - 1 && <span style={{ color: C.gold, margin: '0 4px' }}> › </span>}
                                          </span>
                                        ))}
                                      </span>
                                    )}
                                    {item.species && (
                                      <div style={{ marginTop: 4 }}>
                                        <SpeciesBadge species={item.species} />
                                      </div>
                                    )}
                                    {/* Expanded details on mobile (actions appear) */}
                                    <div className="actions-col" style={{ display: 'none', marginTop: 8, gap: 6, flexWrap: 'wrap' }}>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleInject(displayCode, finalRate, displayDesc, item.hierarchical_path, item.species); }}
                                        style={{
                                          padding: "4px 10px",
                                          background: isInjected ? C.green : C.blue,
                                          color: isInjected ? C.navy : C.white,
                                          borderRadius: 4,
                                          fontSize: 11,
                                          fontWeight: 600,
                                          minWidth: 60,
                                        }}
                                      >
                                        {isInjected ? '✅' : '💉'}
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleAIClassify(displayCode, displayDesc); }}
                                        style={{
                                          padding: "4px 10px",
                                          background: C.gold,
                                          color: C.navy,
                                          borderRadius: 4,
                                          fontSize: 11,
                                          fontWeight: 600,
                                        }}
                                      >
                                        🤖
                                      </button>
                                    </div>
                                  </div>
                                </td>
                                <td className="mono" style={{ padding: "10px 14px", paddingLeft: paddingLeft, fontSize: 14 }}>
                                  {finalRate}% {hasOverride && <span style={{ color: C.gold, display: "block", fontSize: 10 }}>(EO)</span>}
                                </td>
                                <td className="actions-col" style={{ padding: "10px 14px", textAlign: "center" }}>
                                  <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleInject(displayCode, finalRate, displayDesc, item.hierarchical_path, item.species); }}
                                      style={{
                                        padding: "4px 10px",
                                        background: isInjected ? C.green : C.blue,
                                        color: isInjected ? C.navy : C.white,
                                        borderRadius: 4,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        minWidth: 60,
                                      }}
                                    >
                                      {isInjected ? '✅' : '💉'}
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleAIClassify(displayCode, displayDesc); }}
                                      style={{
                                        padding: "4px 10px",
                                        background: C.gold,
                                        color: C.navy,
                                        borderRadius: 4,
                                        fontSize: 11,
                                        fontWeight: 600,
                                      }}
                                    >
                                      🤖
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", flexWrap: "wrap", gap: 8 }}>
                <span style={{ color: C.muted, fontSize: 13 }}>
                  Showing {startIndex + 1}–{Math.min(endIndex, displayData.length)} of {displayData.length} results
                </span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: "6px 12px",
                      background: currentPage === 1 ? 'transparent' : C.blue,
                      color: currentPage === 1 ? C.muted : C.white,
                      borderRadius: 5,
                      fontSize: 12,
                      fontWeight: 600,
                      border: `1px solid ${currentPage === 1 ? C.border : C.blue}`,
                      opacity: currentPage === 1 ? 0.5 : 1
                    }}
                  >
                    ← Prev
                  </button>
                  <span style={{ color: C.muted, fontSize: 13 }}>Page {currentPage} of {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: "6px 12px",
                      background: currentPage === totalPages ? 'transparent' : C.blue,
                      color: currentPage === totalPages ? C.muted : C.white,
                      borderRadius: 5,
                      fontSize: 12,
                      fontWeight: 600,
                      border: `1px solid ${currentPage === totalPages ? C.border : C.blue}`,
                      opacity: currentPage === totalPages ? 0.5 : 1
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ─── Interactive Calculator ──────────────────────────────────────────
  function InteractiveCalc() {
    const [fob, setFob] = useState(sharedCodeData?.fob || 10000);
    const [freight, setFreight] = useState(sharedCodeData?.freight || 500);
    const [insurance, setInsurance] = useState(sharedCodeData?.insurance || 0);
    const [dutyRate, setDutyRate] = useState(sharedCodeData?.rate || 5);
    const [hsCode, setHsCode] = useState(sharedCodeData?.code || "0000.00.00");
    const [legalDesc, setLegalDesc] = useState(sharedCodeData?.desc || "General baseline description");
    const [hierPath, setHierPath] = useState(sharedCodeData?.path || "");
    const [species, setSpecies] = useState(sharedCodeData?.species || null);
    const [fetchingRate, setFetchingRate] = useState(false);
    const [calcResult, setCalcResult] = useState(null);
    const [calcLoading, setCalcLoading] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
      duty: false,
      boc: false,
      landed: false
    });
    const [entryType, setEntryType] = useState("");

    // Sticky compute button observer
    const computeRef = useRef(null);
    const [showSticky, setShowSticky] = useState(false);

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          setShowSticky(!entry.isIntersecting);
        },
        { threshold: 0, rootMargin: '0px 0px -100px 0px' } // trigger when button leaves viewport
      );
      if (computeRef.current) observer.observe(computeRef.current);
      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      if (sharedCodeData) {
        setHsCode(sharedCodeData.code || "0000.00.00");
        setDutyRate(sharedCodeData.rate !== null ? sharedCodeData.rate : 5);
        setLegalDesc(sharedCodeData.desc || "Loaded from system");
        setHierPath(sharedCodeData.path || "");
        setSpecies(sharedCodeData.species || null);
        if (sharedCodeData.fob !== undefined) setFob(sharedCodeData.fob);
        if (sharedCodeData.freight !== undefined) setFreight(sharedCodeData.freight);
        if (sharedCodeData.insurance !== undefined) setInsurance(sharedCodeData.insurance);
      }
    }, [sharedCodeData]);

    const fetchLiveRate = async () => {
      setFetchingRate(true);
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.rates && data.rates.PHP) {
          const rate = data.rates.PHP;
          setSettings(prev => ({ ...prev, exchangeRate: rate }));
          alert(`✅ Live rate: ₱${rate.toFixed(2)} per USD`);
        }
      } catch (err) {
        alert(`❌ Could not fetch live rate: ${err.message}`);
      }
      setFetchingRate(false);
    };

    const currentExRate = parseFloat(settings.exchangeRate) || 1;

    const handleCalculate = async () => {
      setCalcLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/calculator/compute-boc-taxes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            fob_fca_value: parseFloat(fob) || 0,
            exchange_rate: currentExRate,
            freight_cost: parseFloat(freight) || 0,
            insurance_cost: parseFloat(insurance) || 0,
            rate_of_duty: parseFloat(dutyRate) || 0,
            is_dangerous_goods: false,
            excise_tax: 0,
            brokerage_fee: 700.0,
            import_processing_fee: parseFloat(settings.bocProcessingFee) || 250.0,
            ahtn_code: hsCode
          })
        });
        const data = await res.json();
        if (res.ok) {
          setCalcResult(data);
          setEntryType(data.entry_type || "");
          if (data.assessment && data.assessment.total_tax_payable) {
            saveToHistory({
              timestamp: Date.now(),
              ahtn_code: hsCode,
              fob_fca_value: parseFloat(fob),
              freight_cost: parseFloat(freight),
              insurance_cost: parseFloat(insurance) || 0,
              rate_of_duty: parseFloat(dutyRate),
              total_tax_payable: data.assessment.total_tax_payable,
              total_landed_cost: data.assessment.total_landed_cost,
              description: legalDesc
            });
          }
        } else {
          alert(data.detail || "Calculation failed");
        }
      } catch (err) {
        alert("Network error during calculation");
      }
      setCalcLoading(false);
    };

    const toggleSection = (section) => {
      setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const fmt = n => n !== undefined ? "₱ " + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
    const assessment = calcResult?.assessment || {};
    const valuation = calcResult?.valuation || {};

    return (
      <div className="calc-grid">
        <div className="calc-inputs" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <p style={{ fontWeight: 700, color: C.goldL }}>🎛️ Live Simulation</p>
              <Pill color={C.green}>Real-Time</Pill>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ fontSize: 12, color: C.muted, flex: 1 }}>FOB / FCA Value (USD)</label>
                  <button onClick={() => setTab("settings")} style={{ background: 'transparent', color: C.muted, border: '1px solid ' + C.border, borderRadius: 4, padding: '2px 8px', fontSize: 12 }} title="Edit in Settings">⚙️</button>
                </div>
                <input type="number" value={fob} onChange={e => setFob(e.target.value)} />
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4, fontFamily: 'monospace', background: C.navyL, padding: '4px 8px', borderRadius: 4 }}>
                  💡 Base commercial invoice value
                </div>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ fontSize: 12, color: C.muted, flex: 1 }}>Freight Cost (USD)</label>
                  <button onClick={() => setTab("settings")} style={{ background: 'transparent', color: C.muted, border: '1px solid ' + C.border, borderRadius: 4, padding: '2px 8px', fontSize: 12 }} title="Edit in Settings">⚙️</button>
                </div>
                <input type="number" value={freight} onChange={e => setFreight(e.target.value)} />
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4, fontFamily: 'monospace', background: C.navyL, padding: '4px 8px', borderRadius: 4 }}>
                  💡 Shipping / freight charges
                </div>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ fontSize: 12, color: C.muted, flex: 1 }}>Insurance Cost (USD)</label>
                  <button onClick={() => setTab("settings")} style={{ background: 'transparent', color: C.muted, border: '1px solid ' + C.border, borderRadius: 4, padding: '2px 8px', fontSize: 12 }} title="Edit in Settings">⚙️</button>
                </div>
                <input type="number" value={insurance} onChange={e => setInsurance(e.target.value)} />
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4, fontFamily: 'monospace', background: C.navyL, padding: '4px 8px', borderRadius: 4 }}>
                  💡 Insurance premium (if any)
                </div>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ fontSize: 12, color: C.muted, flex: 1 }}>Duty Rate: <span className="mono" style={{ color: C.goldL }}>{dutyRate}%</span></label>
                  <button onClick={() => setTab("settings")} style={{ background: 'transparent', color: C.muted, border: '1px solid ' + C.border, borderRadius: 4, padding: '2px 8px', fontSize: 12 }} title="Edit in Settings">⚙️</button>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="0.5"
                  value={dutyRate}
                  onChange={e => setDutyRate(e.target.value)}
                  style={{ padding: 0, height: 6, cursor: "pointer" }}
                />
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <label style={{ fontSize: 12, color: C.muted, flex: 1 }}>Exchange Rate: <span className="mono" style={{ color: C.goldL }}>{currentExRate.toFixed(2)}</span></label>
                  <button onClick={() => setTab("settings")} style={{ background: 'transparent', color: C.muted, border: '1px solid ' + C.border, borderRadius: 4, padding: '2px 8px', fontSize: 12 }} title="Edit in Settings">⚙️</button>
                  <button onClick={fetchLiveRate} disabled={fetchingRate} style={{ background: C.blue, color: C.white, padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{fetchingRate ? 'Loading...' : 'Fetch Live'}</button>
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4, fontFamily: 'monospace', background: C.navyL, padding: '4px 8px', borderRadius: 4 }}>
                  💡 1 USD = {currentExRate.toFixed(2)} PHP (live rate)
                </div>
              </div>

              <div style={{ background: C.navyL, padding: 12, borderRadius: 6, border: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 11, color: C.muted }}>AHTN Code</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: C.gold }}>{hsCode}</span>
                  {species && <SpeciesBadge species={species} />}
                </div>
                <p style={{ fontSize: 12, color: C.white, marginTop: 4, lineHeight: 1.3 }}>{legalDesc}</p>
                {hierPath && (
                  <p style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4, wordBreak: 'break-word' }}>
                    {hierPath.split(' > ').map((part, i, arr) => (
                      <span key={i}>
                        {part}
                        {i < arr.length - 1 && <span style={{ color: C.gold, margin: '0 4px' }}> › </span>}
                      </span>
                    ))}
                  </p>
                )}
              </div>

              {/* The compute button that will be observed */}
              <div ref={computeRef}>
                <button onClick={handleCalculate} disabled={calcLoading} style={{ background: C.gold, color: C.navy, padding: 10, borderRadius: 6, fontWeight: 600, width: '100%' }}>
                  {calcLoading ? '⏳ Computing...' : '🚀 Compute Taxes'}
                </button>
              </div>
              <button onClick={() => setTab("settings")} style={{ background: C.blue, color: C.white, padding: 10, borderRadius: 6, fontWeight: 600 }}>⚙️ Edit Settings</button>
            </div>
          </Card>
        </div>

        <div className="calc-results">
          <Card style={{ position: "sticky", top: 20, borderLeft: `4px solid ${C.gold}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: C.goldL }}>📊 Duty & Tax Cascade</p>
              <span style={{ fontSize: 10, color: C.green, background: `${C.green}22`, padding: '2px 8px', borderRadius: 20 }}>
                ● Live Verification: BSP Framework Active
              </span>
            </div>

            {entryType && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: C.muted }}>Entry Type</span>
                <span style={{
                  background: entryType === "informal" ? C.green : C.gold,
                  color: entryType === "informal" ? C.navy : C.navy,
                  padding: "2px 12px",
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase"
                }}>
                  {entryType === "informal" ? "🟢 Informal (De Minimis)" : "🟡 Formal Entry"}
                </span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span>Dutiable Value (PHP)</span>
                <span className="mono">{fmt(valuation.dutiable_value_php)}</span>
              </div>

              <div>
                <div
                  style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", cursor: "pointer" }}
                  onClick={() => toggleSection('duty')}
                >
                  <span>Customs Duty ({dutyRate}%)</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="mono">{fmt(assessment.customs_duty)}</span>
                    <span style={{ color: C.muted }}>{expandedSections.duty ? '−' : '+'}</span>
                  </span>
                </div>
                {expandedSections.duty && (
                  <div style={{ padding: "8px 12px", background: C.navyL, borderRadius: 4, marginBottom: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}>
                      <span>Dutiable PHP × {dutyRate}%</span>
                      <span className="mono">{fmt(assessment.customs_duty)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div
                  style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", cursor: "pointer", borderBottom: `1px solid ${C.border}55` }}
                  onClick={() => toggleSection('boc')}
                >
                  <span>BOC Fees + Stamp</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="mono">{fmt((assessment.bir_doc_stamp || 0) + (assessment.customs_doc_stamp || 0))}</span>
                    <span style={{ color: C.muted }}>{expandedSections.boc ? '−' : '+'}</span>
                  </span>
                </div>
                {expandedSections.boc && (
                  <div style={{ padding: "8px 12px", background: C.navyL, borderRadius: 4, marginBottom: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}>
                      <span>BIR Doc Stamp</span>
                      <span className="mono">{fmt(assessment.bir_doc_stamp)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}>
                      <span>BOC Doc Stamp</span>
                      <span className="mono">{fmt(assessment.customs_doc_stamp)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.gold, borderTop: `1px solid ${C.border}55`, paddingTop: 4, marginTop: 4 }}>
                      <span>Total</span>
                      <span className="mono">{fmt((assessment.bir_doc_stamp || 0) + (assessment.customs_doc_stamp || 0))}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div
                  style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: `${C.blue}15`, borderRadius: 5, cursor: "pointer" }}
                  onClick={() => toggleSection('landed')}
                >
                  <span style={{ color: C.muted }}>Landed Cost (VAT base)</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="mono">{fmt(assessment.total_landed_cost)}</span>
                    <span style={{ color: C.muted }}>{expandedSections.landed ? '−' : '+'}</span>
                  </span>
                </div>
                {expandedSections.landed && (
                  <div style={{ padding: "8px 12px", background: C.navyL, borderRadius: 4, marginBottom: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}>
                      <span>Dutiable PHP</span>
                      <span className="mono">{fmt(valuation.dutiable_value_php)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}>
                      <span>Customs Duty</span>
                      <span className="mono">{fmt(assessment.customs_duty)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}>
                      <span>BOC Fees + Stamp</span>
                      <span className="mono">{fmt((assessment.bir_doc_stamp || 0) + (assessment.customs_doc_stamp || 0))}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.gold, borderTop: `1px solid ${C.border}55`, paddingTop: 4, marginTop: 4 }}>
                      <span>Total Landed Cost</span>
                      <span className="mono">{fmt(assessment.total_landed_cost)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span>VAT (12%)</span>
                <span className="mono">{fmt(assessment.vat_12)}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderTop: `2px solid ${C.gold}`, paddingTop: 14, marginTop: 6 }}>
                <span style={{ fontWeight: 700 }}>TOTAL TAX PAYABLE</span>
                <span className="mono" style={{ color: C.goldL, fontWeight: 800, fontSize: 20 }}>{fmt(assessment.total_tax_payable)}</span>
              </div>
            </div>
            <div style={{ marginTop: 16, padding: 10, background: `${C.gold}11`, borderRadius: 6, border: `1px solid ${C.gold}33`, fontSize: 11, color: C.muted }}>
              💡 <strong>Legal Audit Reference:</strong> All parameters are evaluated in absolute compliance with Section 400 of the Customs Modernization and Tariff Act (CMTA) governing Informal Entry Express Consignments.
            </div>
          </Card>
        </div>

        {/* Sticky Compute Button (mobile) */}
        <div className={`sticky-compute ${showSticky ? 'visible' : ''}`}>
          <button onClick={handleCalculate} disabled={calcLoading}>
            {calcLoading ? '⏳ Computing...' : '🚀 Compute Taxes'}
          </button>
        </div>
      </div>
    );
  }

  // ─── AI Classifier ─────────────────────────────────────────────────────
  function AIClassifier() {
    const [text, setText] = useState("");
    const [predicting, setPredicting] = useState(false);
    const [matches, setMatches] = useState([]);

    useEffect(() => {
      if (window.__aiPrefill) {
        setText(window.__aiPrefill);
        window.__aiPrefill = null;
      }
    }, []);

    const runClassification = async (e) => {
      if (e) e.preventDefault();
      if (!text.trim()) return;
      if (!token) { alert("Please log in to use AI Classifier"); return; }
      setPredicting(true);
      setMatches([]);
      try {
        const res = await fetch(`${API_BASE_URL}/classify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ description: text }),
          signal: AbortSignal.timeout(10000),
        });
        const data = await res.json();
        if (res.ok && data.predictions) {
          setMatches(data.predictions);
        } else {
          alert(data.detail || "No predictions returned.");
        }
      } catch (err) {
        alert("Network error or timeout. Please try again.");
      }
      setPredicting(false);
    };
                                                                                                                                                  return (
      <Card>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>Describe cargo for AI suggestion.</p>
        <form onSubmit={runClassification}>
          <textarea
            rows={4}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: C.navyL,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.white,
              fontSize: 14,
              outline: 'none',
              transition: 'border-color 0.2s',                                                                                                              resize: 'vertical',
              fontFamily: 'Inter, sans-serif',
              marginBottom: 12
            }}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="e.g., fresh apples, rice, live horses, frozen chicken..."
          />
          <button
            type="submit"
            disabled={predicting}
            style={{
              width: '100%',
              padding: '12px',
              background: predicting ? C.border : C.gold,
              color: predicting ? C.muted : C.navy,
              borderRadius: 8,
              fontWeight: 600,
              fontSize: '1rem',
              cursor: predicting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {predicting ? (
              <>
                <span style={{
                  display: 'inline-block',
                  width: 18,
                  height: 18,
                  border: '2px solid #8899AA',
                  borderTop: '2px solid #C8972B',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                Processing...
              </>
            ) : (
              '🤖 Classify'
            )}
          </button>
        </form>
        {matches.length > 0 && (
          <div className="ai-predictions" style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            {matches.map((match, idx) => (
              <div key={idx} style={{ background: C.navyL, padding: 14, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>                                      <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: C.goldL }}>{match.code}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>Confidence: {match.confidence || 'N/A'}</span>
                </div>
                <p style={{ fontSize: 13, color: C.white, marginTop: 4 }}>{match.description}</p>
                <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{match.reasoning}</p>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: C.muted }}>Rate: {match.duty_rate}%</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{match.chapter}</span>
                </div>
                <button
                  onClick={() => handleCodeTransfer(match.code, match.duty_rate, match.description, match.chapter, null)}
                  style={{ marginTop: 10, padding: "6px 14px", background: C.blue, color: C.white, borderRadius: 5, fontWeight: 600, fontSize: 12 }}
                >
                  💉 Inject
                </button>
              </div>
            ))}
          </div>
        )}
        {!predicting && matches.length === 0 && text.trim() && (
          <p style={{ fontSize: 12, color: C.muted, marginTop: 12 }}>No predictions found. Try a different description.</p>
        )}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </Card>
    );
  }

  // ─── Settings ──────────────────────────────────────────────────────────
  function CustomsSettings() {
    const [vat, setVat] = useState(settings.vatRate);
    const [proc, setProc] = useState(settings.bocProcessingFee);
    const [doc, setDoc] = useState(settings.docStampFee);
    const [ex, setEx] = useState(settings.exchangeRate);
    const [ovCode, setOvCode] = useState("");
    const [ovRate, setOvRate] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [editingHsCode, setEditingHsCode] = useState("");

    const saveGlobalSettings = () => {
      setSettings(p => ({
        ...p,
        vatRate: parseFloat(vat) || 0,
        bocProcessingFee: parseFloat(proc) || 0,
        docStampFee: parseFloat(doc) || 0,
        exchangeRate: parseFloat(ex) || 1,
      }));
      alert("Settings saved!");
    };

    const handleOverrideSubmit = () => {                                                                                                            if (!ovCode.trim()) return;
      const code = ovCode.trim();                                                                                                                   const rate = parseFloat(ovRate) || 0;
                                                                                                                                                    if (isEditing) {
        setSettings(p => {                                                                                                                              const newOverrides = { ...p.customOverrides };
          delete newOverrides[editingHsCode];
          newOverrides[code] = rate;
          return { ...p, customOverrides: newOverrides };
        });
        setIsEditing(false);                                                                                                                          setEditingHsCode("");
        setOvCode("");
        setOvRate("");
      } else {
        setSettings(p => ({
          ...p,
          customOverrides: { ...p.customOverrides, [code]: rate }
        }));
        setOvCode("");
        setOvRate("");
      }
    };

    const handleEditOverride = (hsCode, rate) => {                                                                                                  setOvCode(hsCode);
      setOvRate(String(rate));                                                                                                                      setIsEditing(true);
      setEditingHsCode(hsCode);
    };                                                                                                                                        
    const handleDeleteOverride = (hsCode) => {
      if (window.confirm(`Delete override for HS Code ${hsCode}?`)) {
        setSettings(p => {
          const newOverrides = { ...p.customOverrides };
          delete newOverrides[hsCode];
          return { ...p, customOverrides: newOverrides };
        });
        if (editingHsCode === hsCode) {
          setIsEditing(false);
          setEditingHsCode("");
          setOvCode("");                                                                                                                                setOvRate("");
        }                                                                                                                                           }
    };

    return (                                                                                                                                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <p style={{ fontWeight: 700, fontSize: 16, color: C.gold }}>⚙️ Configuration</p>
          <p style={{ color: C.muted, fontSize: 13 }}>Override values for EO adjustments.</p>
        </Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card>
            <p style={{ fontWeight: 600, marginBottom: 14 }}>🌐 Global Variables</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={{ fontSize: 11, color: C.muted }}>Exchange Rate</label><input type="number" value={ex} onChange={e => setEx(e.target.value)} /></div>
              <div><label style={{ fontSize: 11, color: C.muted }}>VAT %</label><input type="number" value={vat} onChange={e => setVat(e.target.value)} /></div>
              <div><label style={{ fontSize: 11, color: C.muted }}>Processing Fee</label><input type="number" value={proc} onChange={e => setProc(e.target.value)} /></div>
              <div><label style={{ fontSize: 11, color: C.muted }}>Doc Stamp</label><input type="number" value={doc} onChange={e => setDoc(e.target.value)} /></div>
              <button onClick={saveGlobalSettings} style={{ background: C.green, color: C.white, padding: 12, borderRadius: 6, fontWeight: 600 }}>Save</button>                                                                                                                                         </div>
          </Card>
          <Card>
            <p style={{ fontWeight: 600, marginBottom: 14 }}>🏷️ EO Overrides</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input placeholder="AHTN Line Code" value={ovCode} onChange={e => setOvCode(e.target.value)} />
              <input type="number" placeholder="Override Rate %" value={ovRate} onChange={e => setOvRate(e.target.value)} />
              <button onClick={handleOverrideSubmit} style={{ background: isEditing ? C.gold : C.blue, color: isEditing ? C.navy : C.white, padding: 10, borderRadius: 6, fontWeight: 600 }}>
                {isEditing ? "✏️ Update Override" : "➕ Add Override"}
              </button>
              {isEditing && (
                <button onClick={() => { setIsEditing(false); setEditingHsCode(""); setOvCode(""); setOvRate(""); }} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, padding: 6, borderRadius: 4, fontSize: 12 }}>
                  Cancel Edit
                </button>
              )}
              <div style={{ marginTop: 10, borderTop: `1px solid ${C.border}55`, paddingTop: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.goldL }}>Active Overrides ({Object.keys(settings.customOverrides).length})</span>
                {Object.entries(settings.customOverrides).map(([code, rate]) => (
                  <div key={code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: editingHsCode === code ? `${C.gold}22` : C.navyL, padding: "6px 10px", borderRadius: 4, fontSize: 12, marginTop: 4, border: editingHsCode === code ? `1px solid ${C.gold}` : `1px solid ${C.border}55` }}>
                    <div>
                      <span className="mono" style={{ fontWeight: 600, color: C.goldL }}>{code}</span>
                      <span style={{ color: C.muted, marginLeft: 8 }}>→</span>                                                                                      <span className="mono" style={{ color: C.white, marginLeft: 8 }}>{rate}%</span>
                    </div>                                                                                                                                        <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => handleEditOverride(code, rate)} style={{ background: 'transparent', color: C.gold, border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 3, fontSize: 14 }} title="Edit">✏️</button>
                      <button onClick={() => handleDeleteOverride(code)} style={{ background: 'transparent', color: C.red, border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 3, fontSize: 14 }} title="Delete">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }
                                                                                                                                                // ─── History Tab ──────────────────────────────────────────────────────
  function HistoryTab() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ color: C.gold, margin: 0 }}>📜 Computation History</h2>
            {history.length > 0 && (
              <button onClick={clearHistory} style={{ background: C.red, color: C.white, padding: "6px 14px", borderRadius: 4, fontSize: 12 }}>
                Clear All
              </button>
            )}
          </div>
          <p style={{ color: C.muted, fontSize: 13 }}>Last 50 calculations saved locally</p>
        </Card>
        {history.length === 0 && (
          <Card>
            <p style={{ color: C.muted, textAlign: "center" }}>No calculations saved yet. Compute taxes to start building history.</p>
          </Card>
        )}
        {history.slice(0, 50).map((entry, idx) => (
          <Card key={idx} style={{ padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <span className="history-timestamp" style={{ fontSize: 13, color: C.muted }}>{new Date(entry.timestamp).toLocaleString()}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.gold, marginLeft: 12 }}>{entry.ahtn_code || "N/A"}</span>
                <span style={{ fontSize: 13, color: C.white, marginLeft: 8 }}>₱{entry.total_tax_payable?.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => loadHistoryEntry(entry)} style={{ background: C.blue, color: C.white, padding: "4px 12px", borderRadius: 4, fontSize: 12 }}>↻ Load</button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const TABS = [
    { id: "dashboard", label: "🏠 Dashboard" },
    { id: "lookup",    label: "🔍 HS Lookup" },
    { id: "calc",      label: "🧮 Calculator" },
    { id: "estimator", label: "⚡ Estimator" },
    { id: "ai",        label: "🤖 AI Classifier" },
    { id: "tracker",   label: "🚢 Tracker" },
    { id: "settings",  label: "⚙️ Settings" },
    { id: "history",   label: "📜 History" },
  ];

  const VIEWS = {
    dashboard: <DashboardTab token={token} history={history} setTab={setTab} settings={settings} />,
    lookup: <HSLookup token={token} settings={settings} handleCodeTransfer={handleCodeTransfer} setTab={setTab} />,
    calc: <InteractiveCalc key="calc" token={token} sharedCodeData={sharedCodeData} settings={settings} setSettings={setSettings} saveToHistory={saveToHistory} setTab={setTab} />,
    estimator: <PreEstimator onTransferToCalc={handleTransferToCalc} />,
    ai: <AIClassifier token={token} handleCodeTransfer={handleCodeTransfer} />,
    tracker: <ShipmentTracker />,
    settings: <CustomsSettings settings={settings} setSettings={setSettings} />,
    history: <HistoryTab history={history} clearHistory={clearHistory} loadHistoryEntry={loadHistoryEntry} />,
  };

  return (
    <>
      <style>{globalStyle}</style>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ background: C.navyL, borderBottom: `1px solid ${C.border}`, padding: "0 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, background: C.gold, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: C.navy, fontSize: 15 }}>⚓</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, lineHeight: 1 }}>PH Customs Platform</p>
                <p style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>Secure Sandbox</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ color: C.muted, fontSize: 11 }}>{TARIFF_VERSION} | Updated: {LAST_UPDATED}</span>
              <Pill color={C.goldL}>CMTA V2</Pill>
              <a href="https://customs-docs.vercel.app" target="_blank" style={{ color: "#C8972B", textDecoration: "none", fontSize: 13, marginRight: 10 }}>📖 About</a>
              <button onClick={logout} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, padding: "6px 14px", borderRadius: 5, fontSize: 12 }}>Logout</button>
            </div>
          </div>
        </div>
        <div style={{ background: C.navyL, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
            <div className="nav-tabs">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} className={tab === t.id ? 'active' : ''}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, maxWidth: 1200, margin: "0 auto", width: "100%", padding: "24px" }}>
          {VIEWS[tab]}
        </div>
      </div>
    </>
  );
}

// ─── Root Router ──────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<PrivateRoute />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}                                                                                                                                             
function PrivateRoute() {                                                                                                                       const { token, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;                                                       if (!token) return <Navigate to="/login" replace />;
  return <AppContent />;                                                                                                                      }
