import React, { useState, useEffect } from 'react';
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
  @media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr !important; } .header { flex-direction: column; text-align: center; } .card { padding: 12px; } }
  @media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr !important; } .header { flex-direction: column; text-align: center; } .card { padding: 12px; } }
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
      {species.emoji} {species.name}
    </span>
  );
}

// ─── Main App Content ──────────────────────────────────────────────────
function AppContent() {
  const { token, logout } = useAuth();
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

  // ─── HSLookup ──────────────────────────────────────────────────────────
  function HSLookup() {
    const [query, setQuery] = useState("");
    const [speciesFilter, setSpeciesFilter] = useState("");
    const [speciesList, setSpeciesList] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
      const fetchSpecies = async () => {
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

    const search = async () => {
      if (!query.trim()) return;
      setLoading(true); setError(""); setResults([]);
      try {
        const params = new URLSearchParams({
          q: query,
          limit: 25,
        });
        if (speciesFilter) params.append('species', speciesFilter);
        const res = await fetch(`${API_BASE_URL}/search?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Search failed");
        setResults(data.results || []);
        if (!data.results?.length) setError("No matches found.");
      } catch (err) {
        setError(err.message || "API error.");
      }
      setLoading(false);
    };

    const grouped = results.reduce((acc, item) => {
      const heading = item.code.slice(0, 4);
      if (!acc[heading]) acc[heading] = [];
      acc[heading].push(item);
      return acc;
    }, {});

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              placeholder="Enter HS code or keyword..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
              style={{ flex: 2, minWidth: 200 }}
            />
            <select
              value={speciesFilter}
              onChange={e => setSpeciesFilter(e.target.value)}
              style={{ flex: 0.5, minWidth: 120 }}
            >
              <option value="">All Species</option>
              {speciesList.map(sp => (
                <option key={sp.name} value={sp.name}>{sp.emoji} {sp.name}</option>
              ))}
            </select>
            <button
              onClick={search}
              disabled={loading}
              style={{ background: C.gold, color: C.navy, padding: "0 24px", borderRadius: 7, fontWeight: 600 }}
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
          {error && <p style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{error}</p>}
        </Card>

        {results.length > 0 && (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflow: "auto", maxHeight: 500 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.navyL, color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ padding: "12px 14px", textAlign: "left" }}>Code</th>
                    <th style={{ padding: "12px 14px", textAlign: "left" }}>Description / Hierarchical Path</th>
                    <th style={{ padding: "12px 14px", textAlign: "left" }}>Rate</th>
                    <th style={{ padding: "12px 14px", textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(grouped).map(([heading, items]) => {
                    const firstItem = items[0];
                    const headingDesc = firstItem.hierarchical_path.split('>')[1]?.trim() || heading;
                    return (
                      <React.Fragment key={heading}>
                        <tr style={{ background: `${C.navyL}55`, borderTop: `2px solid ${C.border}` }}>
                          <td colSpan="4" style={{ padding: "8px 14px", fontWeight: 700, color: C.goldL }}>
                            {heading} – {headingDesc}
                          </td>
                        </tr>
                        {items.map((item, idx) => {
                          const hasOverride = settings.customOverrides[item.code] !== undefined;
                          const finalRate = hasOverride ? settings.customOverrides[item.code] : item.rate_2024;
                          const indent = item.code.length > 4 ? 20 : 0;
                          return (
                            <tr key={idx} style={{ borderBottom: `1px solid ${C.border}20` }}>
                              <td className="mono" style={{ padding: "10px 14px", paddingLeft: indent + 14, color: C.goldL, fontWeight: 600 }}>
                                {item.code}
                              </td>
                              <td style={{ padding: "10px 14px", paddingLeft: indent + 14, lineHeight: 1.4 }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  <span>{item.description}</span>
                                  <span style={{ fontSize: 11, color: C.muted }}>{item.hierarchical_path}</span>
                                  <div style={{ marginTop: 4 }}>
                                    <SpeciesBadge species={item.species} />
                                  </div>
                                </div>
                              </td>
                              <td className="mono" style={{ padding: "10px 14px", paddingLeft: indent + 14 }}>
                                {finalRate}% {hasOverride && <span style={{ color: C.gold, display: "block", fontSize: 10 }}>(EO)</span>}
                              </td>
                              <td style={{ padding: "10px 14px", textAlign: "center" }}>
                                <button
                                  onClick={() => handleCodeTransfer(item.code, finalRate, item.description, item.hierarchical_path, item.species)}
                                  style={{ padding: "4px 12px", background: C.blue, color: C.white, borderRadius: 5, fontSize: 12, fontWeight: 600 }}
                                >
                                  Inject
                                </button>
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
        )}
      </div>
    );
  }

  // ─── Interactive Calculator with Edit buttons & Live Rate ──────────────
  function InteractiveCalc() {
    const [cifUsd, setCifUsd] = useState("10000");
    const [dutyRate, setDutyRate] = useState("5");
    const [hsCode, setHsCode] = useState("0000.00.00");
    const [legalDesc, setLegalDesc] = useState("General baseline description");
    const [hierPath, setHierPath] = useState("");
    const [species, setSpecies] = useState(null);
    const [calculated, setCalculated] = useState(false);
    const [fetchingRate, setFetchingRate] = useState(false);

    useEffect(() => {
      if (sharedCodeData) {
        setHsCode(sharedCodeData.code);
        setDutyRate(sharedCodeData.rate !== null ? String(sharedCodeData.rate) : "0");
        setLegalDesc(sharedCodeData.desc || "Loaded from system");
        setHierPath(sharedCodeData.path || "");
        setSpecies(sharedCodeData.species || null);
        setCalculated(false);
      }
    }, [sharedCodeData]);

    // Live exchange rate fetch
        
    
    
    
    const fetchLiveRate = async () => {
      setFetchingRate(true);
      try {
        // Fixer.io free tier only supports EUR as base
        const res = await fetch(
          `http://data.fixer.io/api/latest?access_key=${FIXER_API_KEY}&symbols=USD,PHP`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success && data.rates) {
          const eurToUsd = data.rates.USD;
          const eurToPhp = data.rates.PHP;
          if (eurToUsd && eurToPhp) {
            // Calculate PHP per USD
            const rate = eurToPhp / eurToUsd;
            setSettings(prev => ({ ...prev, exchangeRate: rate }));
            alert(`✅ Live rate (Fixer.io): ₱${rate.toFixed(2)} per USD`);
          } else {
            throw new Error("Missing rate data");
          }
        } else {
          throw new Error(data.error?.info || "Unexpected response");
        }
      } catch (err) {
        console.error("Fixer.io failed:", err);
        // Fallback to exchangerate-api.com
        try {
          const fallback = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
          if (!fallback.ok) throw new Error(`HTTP ${fallback.status}`);
          const data = await fallback.json();
          if (data.rates && data.rates.PHP) {
            const rate = data.rates.PHP;
            setSettings(prev => ({ ...prev, exchangeRate: rate }));
            alert(`💡 Live rate (backup): ₱${rate.toFixed(2)} per USD`);
          } else {
            throw new Error("Fallback rate missing");
          }
        } catch (fallbackErr) {
          alert(`❌ Could not fetch live rate: ${fallbackErr.message}`);
        }
      }
      setFetchingRate(false);
    };
;
;
;
;;

    const currentExRate = parseFloat(settings.exchangeRate) || 1;
    const totalCifPhp   = (parseFloat(cifUsd) || 0) * currentExRate;
    const computedDuty  = totalCifPhp * ((parseFloat(dutyRate) || 0) / 100);
    const totalLanded   = totalCifPhp + computedDuty + parseFloat(settings.bocProcessingFee) + parseFloat(settings.docStampFee);
    const computedVat   = totalLanded * ((parseFloat(settings.vatRate) || 0) / 100);
    const grandTotal    = computedDuty + computedVat + parseFloat(settings.bocProcessingFee) + parseFloat(settings.docStampFee);

    const fmt = n => "₱ " + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const handleCalculate = () => setCalculated(true);

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <p style={{ fontWeight: 700, color: C.goldL }}>🎛️ Live Simulation</p>
              <Pill color={C.green}>Real-Time</Pill>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* CIF with edit button */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ fontSize: 12, color: C.muted, flex: 1 }}>CIF Value (USD)</label>
                  <button
                    onClick={() => setTab("settings")}
                    style={{ background: 'transparent', color: C.muted, border: '1px solid ' + C.border, borderRadius: 4, padding: '2px 8px', fontSize: 12 }}
                    title="Edit in Settings"
                  >
                    ⚙️
                  </button>
                </div>
                <input type="number" value={cifUsd} onChange={e => setCifUsd(e.target.value)} />
              </div>

              {/* Duty Rate with edit button */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ fontSize: 12, color: C.muted, flex: 1 }}>Duty Rate: <span className="mono" style={{ color: C.goldL }}>{dutyRate}%</span></label>
                  <button
                    onClick={() => setTab("settings")}
                    style={{ background: 'transparent', color: C.muted, border: '1px solid ' + C.border, borderRadius: 4, padding: '2px 8px', fontSize: 12 }}
                    title="Edit in Settings"
                  >
                    ⚙️
                  </button>
                </div>
                <input type="range" min="0" max="50" step="1" value={dutyRate} onChange={e => setDutyRate(e.target.value)} style={{ padding: 0, height: 6, cursor: "pointer" }} />
              </div>

              {/* Exchange Rate with edit + fetch live */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <label style={{ fontSize: 12, color: C.muted, flex: 1 }}>Exchange Rate (USD→PHP): <span className="mono" style={{ color: C.goldL }}>{currentExRate.toFixed(2)}</span></label>
                  <button
                    onClick={() => setTab("settings")}
                    style={{ background: 'transparent', color: C.muted, border: '1px solid ' + C.border, borderRadius: 4, padding: '2px 8px', fontSize: 12 }}
                    title="Edit in Settings"
                  >
                    ⚙️
                  </button>
                  <button
                    onClick={fetchLiveRate}
                    disabled={fetchingRate}
                    style={{ background: C.blue, color: C.white, padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}
                  >
                    {fetchingRate ? 'Loading...' : 'Fetch Live'}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>Last updated: {new Date().toLocaleString()}</div>
              </div>

              {/* VAT with edit button */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ fontSize: 12, color: C.muted, flex: 1 }}>VAT Rate: <span className="mono" style={{ color: C.goldL }}>{settings.vatRate}%</span></label>
                  <button
                    onClick={() => setTab("settings")}
                    style={{ background: 'transparent', color: C.muted, border: '1px solid ' + C.border, borderRadius: 4, padding: '2px 8px', fontSize: 12 }}
                    title="Edit in Settings"
                  >
                    ⚙️
                  </button>
                </div>
              </div>

              {/* BOC Processing Fee with edit button */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ fontSize: 12, color: C.muted, flex: 1 }}>BOC Processing Fee: <span className="mono" style={{ color: C.goldL }}>₱{settings.bocProcessingFee}</span></label>
                  <button
                    onClick={() => setTab("settings")}
                    style={{ background: 'transparent', color: C.muted, border: '1px solid ' + C.border, borderRadius: 4, padding: '2px 8px', fontSize: 12 }}
                    title="Edit in Settings"
                  >
                    ⚙️
                  </button>
                </div>
              </div>

              {/* Doc Stamp Fee with edit button */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ fontSize: 12, color: C.muted, flex: 1 }}>Customs Doc Stamp: <span className="mono" style={{ color: C.goldL }}>₱{settings.docStampFee}</span></label>
                  <button
                    onClick={() => setTab("settings")}
                    style={{ background: 'transparent', color: C.muted, border: '1px solid ' + C.border, borderRadius: 4, padding: '2px 8px', fontSize: 12 }}
                    title="Edit in Settings"
                  >
                    ⚙️
                  </button>
                </div>
              </div>

              {/* AHTN Code display */}
              <div style={{ background: C.navyL, padding: 12, borderRadius: 6, border: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 11, color: C.muted }}>AHTN Code</span>
                <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: C.gold }}>{hsCode}</span>
                {species && <div style={{ marginTop: 4 }}><SpeciesBadge species={species} /></div>}
                <p style={{ fontSize: 12, color: C.white, marginTop: 4, lineHeight: 1.3 }}>{legalDesc}</p>
                {hierPath && <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{hierPath}</p>}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleCalculate} style={{ flex: 1, background: C.gold, color: C.navy, padding: 10, borderRadius: 6, fontWeight: 600 }}>
                  Calculate
                </button>
                <button onClick={() => setTab("settings")} style={{ flex: 1, background: C.blue, color: C.white, padding: 10, borderRadius: 6, fontWeight: 600 }}>
                  Edit Settings
                </button>
              </div>
            </div>
          </Card>
        </div>
        <div>
          <Card style={{ position: "sticky", top: 20, borderLeft: `4px solid ${C.gold}` }}>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: C.goldL }}>📊 Duty & Tax Cascade</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>CIF PHP</span>
                <span className="mono">{fmt(totalCifPhp)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Customs Duty ({dutyRate}%)</span>
                <span className="mono">{calculated ? fmt(computedDuty) : "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.border}55`, paddingBottom: 10 }}>
                <span>BOC Fees + Stamp</span>
                <span className="mono">{calculated ? fmt(parseFloat(settings.bocProcessingFee) + parseFloat(settings.docStampFee)) : "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", background: `${C.blue}15`, padding: "8px 10px", borderRadius: 5 }}>
                <span style={{ color: C.muted }}>Landed Cost (VAT base)</span>
                <span className="mono">{calculated ? fmt(totalLanded) : "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>VAT ({settings.vatRate}%)</span>
                <span className="mono">{calculated ? fmt(computedVat) : "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: `2px solid ${C.gold}`, paddingTop: 14, marginTop: 6 }}>
                <span style={{ fontWeight: 700 }}>TOTAL DUE</span>
                <span className="mono" style={{ color: C.goldL, fontWeight: 800, fontSize: 20 }}>{calculated ? fmt(grandTotal) : "—"}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ─── AI Classifier ────────────────────────────────────────────────────
  function AIClassifier() {
    const [desc, setDesc] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const runClassification = async () => {
      if (!desc.trim()) return;
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/classify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ description: desc }),
        });
        const data = await res.json();
        setResult(data);
      } catch (e) {}
      setLoading(false);
    };

    return (
      <Card>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>Describe cargo for AI suggestion.</p>
        <textarea rows={3} style={{ marginBottom: 12 }} value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g., fresh apples, rice, live horses..." />
        <button onClick={runClassification} style={{ width: "100%", background: C.gold, color: C.navy, padding: 12, fontWeight: 600, borderRadius: 6 }}>
          {loading ? "Processing..." : "Classify"}
        </button>
        {result && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 18, color: C.goldL, fontWeight: 700 }}>Suggested: {result.hs_code}</p>
            {result.species && <SpeciesBadge species={result.species} />}
            <p style={{ fontSize: 13, marginTop: 4 }}>{result.description}</p>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{result.hierarchical_path}</p>
            <p style={{ fontSize: 13, marginTop: 8, lineHeight: 1.4 }}>{result.reasoning}</p>
            <button
              onClick={() => handleCodeTransfer(result.hs_code, result.duty_rate, result.description, result.hierarchical_path, result.species)}
              style={{ marginTop: 12, padding: "8px 16px", background: C.blue, color: C.white, borderRadius: 5, fontWeight: 600 }}
            >
              Inject into Simulation
            </button>
          </div>
        )}
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

    const addOverride = () => {
      if (!ovCode.trim()) return;
      setSettings(p => ({ ...p, customOverrides: { ...p.customOverrides, [ovCode.trim()]: parseFloat(ovRate) || 0 } }));
      setOvCode(""); setOvRate("");
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
              <button onClick={saveGlobalSettings} style={{ background: C.green, color: C.white, padding: 12, borderRadius: 6, fontWeight: 600 }}>Save</button>
            </div>
          </Card>
          <Card>
            <p style={{ fontWeight: 600, marginBottom: 14 }}>🏷️ EO Overrides</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input placeholder="HS Code" value={ovCode} onChange={e => setOvCode(e.target.value)} />
              <input type="number" placeholder="Rate %" value={ovRate} onChange={e => setOvRate(e.target.value)} />
              <button onClick={addOverride} style={{ background: C.blue, color: C.white, padding: 10, borderRadius: 6, fontWeight: 600 }}>Add Override</button>
              <div style={{ marginTop: 10, borderTop: `1px solid ${C.border}55`, paddingTop: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.goldL }}>Active Overrides</span>
                {Object.entries(settings.customOverrides).map(([c, r]) => (
                  <div key={c} className="mono" style={{ display: "flex", justifyContent: "space-between", background: C.navyL, padding: "6px 10px", borderRadius: 4, fontSize: 12, marginTop: 4 }}>
                    <span>{c}</span><span style={{ color: C.gold }}>{r}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "lookup",    label: "🔍 HS Lookup" },
    { id: "calc",      label: "🧮 Calculator" },
    { id: "ai",        label: "🤖 AI Classifier" },
    { id: "settings",  label: "⚙️ Settings" },
  ];

  const VIEWS = { lookup: <HSLookup />, calc: <InteractiveCalc />, ai: <AIClassifier />, settings: <CustomsSettings /> };

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
              <button onClick={logout} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, padding: "6px 14px", borderRadius: 5, fontSize: 12 }}>Logout</button>
            </div>
          </div>
        </div>
        <div style={{ background: C.navyL, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", padding: "0 24px" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "14px 20px", fontSize: 13, fontWeight: tab === t.id ? 700 : 400,
                color: tab === t.id ? C.goldL : C.muted, background: "transparent",
                borderBottom: tab === t.id ? `2px solid ${C.gold}` : "2px solid transparent"
              }}>{t.label}</button>
            ))}
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

function PrivateRoute() {
  const { token, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (!token) return <Navigate to="/login" replace />;
  return <AppContent />;
}
