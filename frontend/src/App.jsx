import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  body { background: ${C.navy}; color: ${C.white}; font-family: 'Inter', sans-serif; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: ${C.navyL}; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
  input, select, textarea {
    background: ${C.navyL}; border: 1px solid ${C.border};
    color: ${C.white}; border-radius: 6px; padding: 10px 14px;
    font-family: 'Inter', sans-serif; font-size: 14px; outline: none;
    transition: all 0.2s; width: 100%;
  }
  input:focus, select:focus, textarea:focus { border-color: ${C.gold}; box-shadow: 0 0 8px rgba(200,151,43,0.2); }
  button { cursor: pointer; font-family: 'Inter', sans-serif; border: none; transition: all 0.2s; }
  button:hover { filter: brightness(1.1); }
  .mono { font-family: 'JetBrains Mono', monospace; }
`;

const DEFAULT_SETTINGS = {
  vatRate: 12,
  bocProcessingFee: 250,
  docStampFee: 265,
  exchangeRate: 58.50,
  customOverrides: {},
};

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
    <span style={{
      background: `${C.gold}22`, color: C.goldL,
      border: `1px solid ${C.gold}55`,
      borderRadius: 20, padding: "2px 10px", fontSize: 12,
      fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      {species.emoji || "🐾"} {species.name}
    </span>
  );
}

// ─── MAIN APP CONTENT ENGINE ─────────────────────────────────────────────
function AppContent() {
  const { token, logout, user } = useAuth();
  const [tab, setTab] = useState("calc");
  const [sharedCodeData, setSharedCodeData] = useState(null);
  const navigate = useNavigate();

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("boc_app_settings");
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem("boc_app_settings", JSON.stringify(settings));
  }, [settings]);

  const handleCodeTransfer = (code, rate, desc, path, species) => {
    setSharedCodeData({ code, rate, desc, path, species });
    setTab("calc");
  };

  // ─── MODULE 1: HS LOOKUP MODULE ────────────────────────────────────────
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
        if (!selectedChapter) setResults([]);
        return;
      }
      if (!token) { setError("Please log in to search"); return; }
      setLoading(true); setError(""); setResults([]); setCurrentPage(1);
      try {
        const params = new URLSearchParams({ q: query, limit: 100 });
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
      window.__aiPrefill = `${code} – ${description}`;
      setTab("ai");
    };

    const copyToClipboard = (code) => {
      navigator.clipboard?.writeText(code).catch(() => {});
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
            {(error || chapterLoading) && (
              <p style={{ color: chapterLoading ? C.gold : C.red, fontSize: 13, marginTop: 10 }}>
                {chapterLoading ? "Streaming dynamic chapter nodes..." : error}
              </p>
            )}
          </Card>
        </div>

        {displayData.length > 0 && (
          <>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflow: "auto", maxHeight: 500 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.navyL, color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                      <th style={{ padding: "12px 14px", textAlign: "left", width: "15%" }}>Hdg No.</th>
                      <th style={{ padding: "12px 14px", textAlign: "left", width: "15%" }}>AHTN Code</th>
                      <th style={{ padding: "12px 14px", textAlign: "left", width: "40%" }}>Description</th>
                      <th style={{ padding: "12px 14px", textAlign: "left", width: "10%" }}>2026 MFN</th>
                      <th style={{ padding: "12px 14px", textAlign: "center", width: "20%" }}>Actions</th>
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
                            const hasOverride = settings.customOverrides[item.code] !== undefined;
                            const finalRate = hasOverride ? settings.customOverrides[item.code] : (item.rate_2024 || item.rate_2026 || item.mfn_rates?.["2026"] || 0);
                            const isInjected = injectedCodes[item.code];
                            const displayCode = item.code || item.ahtn_code || "N/A";
                            const displayDesc = item.description || "N/A";
                            const displayHeading = item.heading || heading;
                            
                            let level = 0;
                            if (displayDesc.startsWith("-")) {
                              level = Math.min((displayDesc.match(/^-+/)?.[0]?.length || 0), 4);
                            }
                            const paddingLeft = 10 + level * 16;

                            return (
                              <tr key={idx} style={{ borderBottom: `1px solid ${C.border}20`, transition: 'background 0.2s' }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = `${C.blue}15`}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                <td className="mono" style={{ padding: "10px 14px", color: C.muted }}>{displayHeading}</td>
                                <td className="mono" style={{ padding: "10px 14px", paddingLeft: paddingLeft, color: C.goldL, fontWeight: 600 }}>
                                  {displayCode}
                                  <button onClick={() => copyToClipboard(displayCode)} style={{ background: 'transparent', color: C.muted, marginLeft: 6, fontSize: 12 }} title="Copy HS Code">📋</button>
                                </td>
                                <td style={{ padding: "10px 14px", paddingLeft: paddingLeft, lineHeight: 1.5 }}>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <span>{displayDesc}</span>
                                    {item.hierarchical_path && (
                                      <span style={{ fontSize: 11, color: C.muted, wordBreak: 'break-word' }}>
                                        {item.hierarchical_path.split(' > ').map((part, i, arr) => (
                                          <span key={i}>{part}{i < arr.length - 1 && <span style={{ color: C.gold, margin: '0 4px' }}> › </span>}</span>
                                        ))}
                                      </span>
                                    )}
                                    {item.species && <div style={{ marginTop: 4 }}><SpeciesBadge species={item.species} /></div>}
                                  </div>
                                </td>
                                <td className="mono" style={{ padding: "10px 14px", fontSize: 14 }}>
                                  {finalRate}% {hasOverride && <span style={{ color: C.gold, display: "block", fontSize: 10 }}>(EO)</span>}
                                </td>
                                <td style={{ padding: "10px 14px", textAlign: "center" }}>
                                  <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                                    <button onClick={() => handleInject(displayCode, finalRate, displayDesc, item.hierarchical_path, item.species)}
                                            style={{ padding: "4px 10px", background: isInjected ? C.green : C.blue, color: isInjected ? C.navy : C.white, borderRadius: 4, fontSize: 11, fontWeight: 600, minWidth: 60 }}>
                                      {isInjected ? '✅' : '💉'}
                                    </button>
                                    <button onClick={() => handleAIClassify(displayCode, displayDesc)} style={{ padding: "4px 10px", background: C.gold, color: C.navy, borderRadius: 4, fontSize: 11, fontWeight: 600 }} title="AI Classify">🤖</button>
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
                <span style={{ color: C.muted, fontSize: 13 }}>Showing {startIndex + 1}–{Math.min(endIndex, displayData.length)} of {displayData.length} entries</span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} style={{ padding: "6px 12px", background: currentPage === 1 ? 'transparent' : C.blue, borderRadius: 5, fontSize: 12, border: `1px solid ${C.border}`, opacity: currentPage === 1 ? 0.5 : 1 }}>← Prev</button>
                  <span style={{ color: C.muted, fontSize: 13 }}>Page {currentPage} of {totalPages}</span>
                  <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} style={{ padding: "6px 12px", background: currentPage === totalPages ? 'transparent' : C.blue, borderRadius: 5, fontSize: 12, border: `1px solid ${C.border}`, opacity: currentPage === totalPages ? 0.5 : 1 }}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ─── MODULE 2: INTERACTIVE CALC MODULE ──────────────────────────────────
  function InteractiveCalc() {
    const [dutiableValue, setDutiableValue] = useState("10000");
    const [hsCode, setHsCode] = useState("");
    const [dutyRate, setDutyRate] = useState("3");
    const [desc, setDesc] = useState("");

    // Transfer tracking block
    useEffect(() => {
      if (sharedCodeData) {
        setHsCode(sharedCodeData.code || "");
        setDutyRate(sharedCodeData.rate?.toString() || "0");
        setDesc(sharedCodeData.desc || "");
      }
    }, [sharedCodeData]);

    const dv = parseFloat(dutiableValue) || 0;
    const rate = parseFloat(dutyRate) || 0;
    
    // Core Multipliers
    const customsDuty = dv * (rate / 100);
    const totalLandValue = dv + customsDuty + settings.bocProcessingFee + settings.docStampFee;
    const vatAmount = totalLandValue * (settings.vatRate / 100);
    const totalPayable = customsDuty + vatAmount + settings.bocProcessingFee + settings.docStampFee;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Card>
          <h3 style={{ color: C.goldL, marginBottom: 12 }}>Liquid Duty Computation Engine</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4, color: C.muted }}>Dutiable Value (PHP)</label>
              <input type="number" value={dutiableValue} onChange={e => setDutiableValue(e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4, color: C.muted }}>Target HS / AHTN Code</label>
              <input type="text" className="mono" value={hsCode} onChange={e => setHsCode(e.target.value)} placeholder="0101.21.00" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4, color: C.muted }}>MFN Base Rate (%)</label>
              <input type="number" value={dutyRate} onChange={e => setDutyRate(e.target.value)} />
            </div>
          </div>
          {desc && <p style={{ fontSize: 12, color: C.muted, marginTop: 10, background: `${C.navyL}77`, padding: 8, borderRadius: 4 }}><strong>Context payload:</strong> {desc}</p>}
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h4 style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 6, color: C.muted }}>BOC Breakdown Metrics</h4>
            <div style={{ display: "flex", justifyBetween: "space-between", justifyContent: "space-between" }}><span>Customs Duty Amount:</span><span className="mono text-white">₱{customsDuty.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
            <div style={{ display: "flex", justifyBetween: "space-between", justifyContent: "space-between" }}><span>BOC Processing Fee:</span><span className="mono text-white">₱{settings.bocProcessingFee.toFixed(2)}</span></div>
            <div style={{ display: "flex", justifyBetween: "space-between", justifyContent: "space-between" }}><span>Documentary Stamp Fee:</span><span className="mono text-white">₱{settings.docStampFee.toFixed(2)}</span></div>
            <div style={{ display: "flex", justifyBetween: "space-between", justifyContent: "space-between" }}><span>VAT Base Value (Land Value):</span><span className="mono text-white">₱{totalLandValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
            <div style={{ display: "flex", justifyBetween: "space-between", justifyContent: "space-between" }}><span>VAT Amount ({settings.vatRate}%):</span><span className="mono text-white">₱{vatAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
          </Card>

          <Card style={{ background: `${C.blue}33`, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, color: C.muted, uppercase: "true" }}>Aggregate Duty Payable</span>
            <h1 className="mono" style={{ color: C.goldL, fontSize: 36 }}>₱{totalPayable.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
            <Pill color={C.green}>Verified via timeline rate matrix</Pill>
          </Card>
        </div>
      </div>
    );
  }

  // ─── MODULE 3: AI SMART CLASSIFIER ──────────────────────────────────────
  function AIClassifier() {
    const [text, setText] = useState("");
    const [predicting, setPredicting] = useState(false);
    const [aiMatches, setAiMatches] = useState([]);
    const [error, setError] = useState("");

    useEffect(() => {
      if (window.__aiPrefill) {
        setText(window.__aiPrefill);
        window.__aiPrefill = null; 
      }
    }, []);

    const handlePredict = async (e) => {
      e.preventDefault();
      if (!text.trim()) return;
      setPredicting(true); setError(""); setAiMatches([]);
      try {
        const res = await fetch(`${API_BASE_URL}/classify`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ text })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Classification parsing anomaly.");
        setAiMatches(data.predictions || []);
      } catch (err) {
        setError(err.message || "Network exception.");
      }
      setPredicting(false);
    };

    return (
      <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h3 style={{ color: C.goldL, marginBottom: 4 }}>AI Smart Classifier System</h3>
          <p style={{ fontSize: 13, color: C.muted }}>Enter dynamic item bills of lading or physical descriptions to match target AHTN segments.</p>
        </div>
        <form onSubmit={handlePredict} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <textarea rows="3" value={text} onChange={e => setText(e.target.value)} placeholder="Describe cargo variables (e.g., pure bred live swine in-quota variant)..." />
          <button type="submit" disabled={predicting} style={{ background: C.gold, color: C.navy, padding: "10px", borderRadius: 6, fontWeight: 700 }}>
            {predicting ? "Processing Predictions..." : "Execute Prediction Matrix"}
          </button>
        </form>
        {error && <p style={{ color: C.red, fontSize: 13 }}>{error}</p>}

        {aiMatches.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            <h4 style={{ color: C.muted, fontSize: 12, uppercase: "true" }}>Top Predictive Matches</h4>
            {aiMatches.map((m, idx) => {
              const currentRate = m.mfn_rates?.["2026"] || m.rate || 0;
              return (
                <div key={idx} style={{ background: C.navyL, padding: 14, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: "75%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="mono" style={{ color: C.goldL, fontWeight: 700 }}>{m.code}</span>
                      <span style={{ fontSize: 11, background: `${C.blue}44`, padding: "1px 5px", borderRadius: 3, color: C.white }}>Confidence: {(m.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <span style={{ fontSize: 13, color: C.white }}>{m.description}</span>
                  </div>
                  <button onClick={() => handleCodeTransfer(m.code, currentRate, m.description, "", null)}
                          style={{ background: C.green, color: C.white, padding: "6px 12px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                    💉 Inject Code
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    );
  }

  // ─── MODULE 4: SYSTEM SETTINGS OVERRIDES ────────────────────────────────
  function CustomsSettings() {
    const [rateInput, setRateInput] = useState("");
    const [targetCode, setTargetCode] = useState("");

    const applyOverride = () => {
      if (!targetCode.trim() || !rateInput.trim()) return;
      setSettings(prev => ({
        ...prev,
        customOverrides: {
          ...prev.customOverrides,
          [targetCode.trim()]: parseFloat(rateInput) || 0
        }
      }));
      setTargetCode(""); setRateInput("");
    };

    const clearOverrides = () => {
      setSettings(prev => ({ ...prev, customOverrides: {} }));
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h3 style={{ color: C.goldL }}>Global Multipliers & Fee Tables</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div><label style={{ fontSize: 12, color: C.muted }}>VAT Standard Rate (%)</label><input type="number" value={settings.vatRate} onChange={e => setSettings({...settings, vatRate: parseFloat(e.target.value)||0})} /></div>
            <div><label style={{ fontSize: 12, color: C.muted }}>BOC Processing Fee (PHP)</label><input type="number" value={settings.bocProcessingFee} onChange={e => setSettings({...settings, bocProcessingFee: parseFloat(e.target.value)||0})} /></div>
            <div><label style={{ fontSize: 12, color: C.muted }}>Documentary Stamp Fee (PHP)</label><input type="number" value={settings.docStampFee} onChange={e => setSettings({...settings, docStampFee: parseFloat(e.target.value)||0})} /></div>
          </div>
        </Card>

        <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h3 style={{ color: C.goldL }}>Custom Tariff Overrides (Executive Orders)</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input placeholder="HS / AHTN Sub-code" value={targetCode} onChange={e => setTargetCode(e.target.value)} style={{ flex: 1 }} />
            <input placeholder="Override Rate (%)" type="number" value={rateInput} onChange={e => setRateInput(e.target.value)} style={{ flex: 1 }} />
            <button onClick={applyOverride} style={{ background: C.gold, color: C.navy, fontWeight: 700, padding: "0 16px", borderRadius: 6 }}>Apply EO Override</button>
          </div>

          {Object.keys(settings.customOverrides).length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: C.muted }}>Active Regulatory Modifications:</span>
                <button onClick={clearOverrides} style={{ background: "transparent", color: C.red, fontSize: 12, textDecoration: "underline" }}>Flush Custom Triggers</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.entries(settings.customOverrides).map(([c, r]) => (
                  <span key={c} className="mono" style={{ background: `${C.navyL}`, border: `1px solid ${C.gold}44`, padding: "4px 8px", borderRadius: 4, fontSize: 12 }}>
                    <strong>{c}</strong>: {r}%
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{globalStyle}</style>
      
      {/* ─── SYSTEM HEADER ─── */}
      <header style={{ background: C.navyL, borderBottom: `1px solid ${C.border}`, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ fontWeight: 700, trackingWidth: "-0.02em" }}>🏛️ Bureau of Customs Core Matrix</h2>
            <Pill color={C.gold}>{TARIFF_VERSION}</Pill>
          </div>
          <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Static Database Baseline Target • Updated: {LAST_UPDATED}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 13, color: C.muted }}>Operator: <strong style={{ color: C.white }}>{user?.username || "Authenticated Session"}</strong></span>
          <button onClick={logout} style={{ background: `${C.red}22`, color: C.red, border: `1px solid ${C.red}55`, padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>Sign Out</button>
        </div>
      </header>

      {/* ─── WORKSPACE CONTROLS ─── */}
      <div style={{ flex: 1, maxWidth: 1200, width: "100%", margin: "0 auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, gap: 4 }}>
          <button onClick={() => setTab("calc")} style={{ padding: "10px 16px", background: tab === "calc" ? C.blue : "transparent", color: tab === "calc" ? C.white : C.muted, fontWeight: 600, borderTopLeftRadius: 6, borderTopRightRadius: 6 }}>🧮 Compute Engine</button>
          <button onClick={() => setTab("lookup")} style={{ padding: "10px 16px", background: tab === "lookup" ? C.blue : "transparent", color: tab === "lookup" ? C.white : C.muted, fontWeight: 600, borderTopLeftRadius: 6, borderTopRightRadius: 6 }}>📖 HS/AHTN Lookup</button>
          <button onClick={() => setTab("ai")} style={{ padding: "10px 16px", background: tab === "ai" ? C.blue : "transparent", color: tab === "ai" ? C.white : C.muted, fontWeight: 600, borderTopLeftRadius: 6, borderTopRightRadius: 6 }}>🤖 AI Classifier</button>
          <button onClick={() => setTab("settings")} style={{ padding: "10px 16px", background: tab === "settings" ? C.blue : "transparent", color: tab === "settings" ? C.white : C.muted, fontWeight: 600, borderTopLeftRadius: 6, borderTopRightRadius: 6 }}>⚙️ Base Multipliers</button>
        </div>

        <div style={{ minHeight: 400 }}>
          {tab === "calc" && <InteractiveCalc />}
          {tab === "lookup" && <HSLookup />}
          {tab === "ai" && <AIClassifier />}
          {tab === "settings" && <CustomsSettings />}
        </div>
      </div>
    </div>
  );
}

// ─── OUTER AUTH ROUTER BOOTSTRAP ──────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><AppContent /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}
