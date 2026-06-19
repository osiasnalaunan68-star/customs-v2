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
  exchangeRate: 58.50,
  docStampFee: 265.00, // Fixed Legal Import Doc Stamp Surcharge
  bocFeeSchedule: [
    { maxUSD: 4400, fee: 250 },
    { maxUSD: 8800, fee: 500 },
    { maxUSD: 17500, fee: 1000 },
    { maxUSD: Infinity, fee: 1500 }
  ],
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
    // ─── INTERACTIVE CALCULATOR (CASCADING ASSESSMENT ENGINE) ────
  function InteractiveCalc() {
    const [fobUSD, setFobUSD] = useState("10000");
    const [insuranceUSD, setInsuranceUSD] = useState("200");
    const [freightUSD, setFreightUSD] = useState("800");
    const [hsCode, setHsCode] = useState("");
    const [dutyRate, setDutyRate] = useState("3");
    const [desc, setDesc] = useState("");

    useEffect(() => {
      if (sharedCodeData) {
        setHsCode(sharedCodeData.code || "");
        setDutyRate(sharedCodeData.rate?.toString() || "0");
        setDesc(sharedCodeData.desc || "");
      }
    }, [sharedCodeData]);

    const fob = parseFloat(fobUSD) || 0;
    const insurance = parseFloat(insuranceUSD) || 0;
    const freight = parseFloat(freightUSD) || 0;
    const rate = parseFloat(dutyRate) || 0;

    // A. Dutiable Value Formula (USD Base)
    const dutiableValueUSD = fob + insurance + freight;
    
    // B. Conversion to Local Currency via Daily BOC Exchange Rate Basis
    const dutiableValuePHP = dutiableValueUSD * settings.exchangeRate;
    
    // C. Customs Duty Computation (Ad Valorem Tariff)
    const customsDuty = dutiableValuePHP * (rate / 100);
    
    // D. Dynamic BOC Processing Fee Surcharge (Enforced via CAO 02-2001 Bracket)
    const matchedBocFee = settings.bocFeeSchedule.find(b => dutiableValueUSD <= b.maxUSD)?.fee || 1500;
    
    // E. Landed Cost Base Definition (Aggregated Base Matrix for Internal Revenue Value)
    const landedCost = dutiableValuePHP + customsDuty + matchedBocFee + settings.docStampFee;
    
    // F. Value Added Tax (VAT 12% Assessment)
    const vatAmount = landedCost * (settings.vatRate / 100);
    
    // G. Total Aggregate Import Revenue Payable
    const totalPayable = customsDuty + vatAmount + matchedBocFee + settings.docStampFee;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: 20 }}>
          
          {/* Declaration Control Matrix */}
          <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ color: C.gold, fontSize: 15, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>📊 Declared Valuation Rules</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={{ fontSize: 11, color: C.muted }}>FOB / FCA Value (USD)</label><input type="number" value={fobUSD} onChange={e => setFobUSD(e.target.value)} /></div>
              <div><label style={{ fontSize: 11, color: C.muted }}>Insurance Cost (USD)</label><input type="number" value={insuranceUSD} onChange={e => setInsuranceUSD(e.target.value)} /></div>
              <div><label style={{ fontSize: 11, color: C.muted }}>Freight/Shipping (USD)</label><input type="number" value={freightUSD} onChange={e => setFreightUSD(e.target.value)} /></div>
              <div><label style={{ fontSize: 11, color: C.muted }}>Tariff Base Rate (%)</label><input type="number" value={dutyRate} onChange={e => setDutyRate(e.target.value)} /></div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.muted }}>Target AHTN Heading</label>
              <input type="text" className="mono" value={hsCode} onChange={e => setHsCode(e.target.value)} placeholder="0000.00.00" />
            </div>
            {desc && <div style={{ fontSize: 11, color: C.muted, background: C.navy, padding: 8, borderRadius: 6, borderLeft: `2px solid ${C.gold}` }}><strong>Selected Commodity:</strong> {desc}</div>}
          </Card>

          {/* Real-time Procedure Flow Trace */}
          <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 style={{ color: C.gold, fontSize: 15, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>⚙️ Legal Processing Procedure</h3>
            
            <div style={{ fontSize: 12, background: C.navy, padding: 10, borderRadius: 6, border: `1px solid ${C.border}` }}>
              <span style={{ color: C.goldL, fontWeight: 600, display: "block" }}>Step 1: Get Dutiable Value (DV)</span>
              <span className="mono text-white">($ {fob.toFixed(2)} + $ {insurance.toFixed(2)} + $ {freight.toFixed(2)}) = $ {dutiableValueUSD.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
              <span className="mono" style={{ display: "block", color: C.muted, marginTop: 4 }}>In PHP Base: $ {dutiableValueUSD.toFixed(2)} × ₱{settings.exchangeRate} = ₱{dutiableValuePHP.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
            </div>

            <div style={{ fontSize: 12, background: C.navy, padding: 10, borderRadius: 6, border: `1px solid ${C.border}` }}>
              <span style={{ color: C.goldL, fontWeight: 600, display: "block" }}>Step 2: Customs Bracket Verification</span>
              <span className="mono">DV Threshold Bracket matched: <strong>₱{matchedBocFee} CPF</strong></span>
              <span style={{ display: "block", fontSize: 10, color: C.muted }}>Verified via CMTA Tier: Bracket Limit Allocation</span>
            </div>

            <div style={{ fontSize: 12, background: C.navy, padding: 10, borderRadius: 6, border: `1px solid ${C.border}` }}>
              <span style={{ color: C.goldL, fontWeight: 600, display: "block" }}>Step 3: Landed Cost Definition</span>
              <span className="mono" style={{ fontSize: 11 }}>DV (₱{dutiableValuePHP.toFixed(0)}) + Duty (₱{customsDuty.toFixed(0)}) + CPF (₱{matchedBocFee}) + DST (₱{settings.docStampFee})</span>
              <span className="mono" style={{ display: "block", color: C.green, marginTop: 4 }}>= ₱{landedCost.toLocaleString(undefined,{minimumFractionDigits:2})} (VAT Base)</span>
            </div>
          </Card>

        </div>

        {/* Final Audit Summary Sheet */}
        <Card style={{ borderLeft: `4px solid ${C.gold}` }}>
          <h3 style={{ color: C.white, fontSize: 14, marginBottom: 12 }}>📑 Official Customs Import Assessment Sheet</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <div><span style={{ fontSize: 11, color: C.muted }}>Customs Duty ({rate}%):</span><h2 className="mono" style={{ fontSize: 18, color: C.white }}>₱{customsDuty.toLocaleString(undefined,{minimumFractionDigits:2})}</h2></div>
            <div><span style={{ fontSize: 11, color: C.muted }}>BOC Processing Fee (CPF):</span><h2 className="mono" style={{ fontSize: 18, color: C.white }}>₱{matchedBocFee.toFixed(2)}</h2></div>
            <div><span style={{ fontSize: 11, color: C.muted }}>Documentary Stamp Tax:</span><h2 className="mono" style={{ fontSize: 18, color: C.white }}>₱{settings.docStampFee.toFixed(2)}</h2></div>
            <div><span style={{ fontSize: 11, color: C.muted }}>Value Added Tax ({settings.vatRate}%):</span><h2 className="mono" style={{ fontSize: 18, color: C.white }}>₱{vatAmount.toLocaleString(undefined,{minimumFractionDigits:2})}</h2></div>
          </div>
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 12, color: C.goldL, fontWeight: 600 }}>AGGREGATE DUTIES & TAXES PAYABLE</span>
              <p style={{ fontSize: 10, color: C.muted }}>Payable to Authorized Agent Banks (AAB) via BOC Electronic-to-Mobile System</p>
            </div>
            <h1 className="mono" style={{ color: C.goldL, fontSize: 32 }}>₱{totalPayable.toLocaleString(undefined,{minimumFractionDigits:2})}</h1>
          </div>
        </Card>
      </div>
    );
  }


  // ─── MODULE 3: AI SMART CLASSIFIER ──────────────────────────────────────
    // ─── MODULE 3: AI NEURAL CLASSIFIER MATRIX ───────────────────────────
    // ─── MODULE 3: AI NEURAL CLASSIFIER MATRIX ───────────────────────────
  function AIClassifier() {
    const [text, setText] = useState("");
    const [predicting, setPredicting] = useState(false);
    const [matches, setMatches] = useState([]);

    // Auto-fill mula sa HSLookup AI Classify (🤖) button kung may laman
    useEffect(() => {
      if (window.__aiPrefill) {
        setText(window.__aiPrefill);
        window.__aiPrefill = null;
      }
    }, []);

    const runClassification = async (e) => {
      if (e) e.preventDefault();
      if (!text.trim()) return;
      setPredicting(true);
      setMatches([]);
      try {
        const res = await fetch(`${API_BASE_URL}/classify`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ text })
        });
        const data = await res.json();
        if (res.ok) {
          setMatches(data.predictions || data.matches || data.results || []);
        }
      } catch (err) {
        console.error("AI Classification Error:", err);
      }
      setPredicting(false);
    };

    return (
      <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <h3 style={{ color: C.gold }}>🤖 AI Neural Classifier Matrix</h3>
          <p style={{ fontSize: 12, color: C.muted }}>Mag-paste ng description o item declaration mula sa HSLookup para awtomatikong hanapin ang tamang HS Code.</p>
        </div>
        <form onSubmit={runClassification} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <textarea 
            rows="4" 
            value={text} 
            onChange={e => setText(e.target.value)} 
            placeholder="Mag-type o mag-paste ng item declaration dito..." 
          />
          <button type="submit" disabled={predicting} style={{ background: C.gold, color: C.navy, padding: 12, borderRadius: 6, fontWeight: 700 }}>
            {predicting ? "Analyzing Components..." : "Deploy Extraction Pattern"}
          </button>
        </form>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
          {matches && matches.map((m, i) => {
            const code = m.code || m.ahtn_code || "N/A";
            const description = m.description || m.desc || (typeof m === 'string' ? m : "No Description");
            const rate = m.rate !== undefined ? m.rate : (m.rate_2026 || 0);

            return (
              <div key={i} style={{ background: C.navyL, padding: 14, borderRadius: 6, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, paddingRight: 14 }}>
                  <span className="mono" style={{ color: C.goldL, fontWeight: 700, fontSize: 14 }}>{code}</span>
                  <span style={{ color: C.muted, fontSize: 12, marginLeft: 10 }}>MFN Rate: {rate}%</span>
                  <p style={{ fontSize: 13, marginTop: 4, color: C.white, lineHeight: 1.4 }}>{description}</p>
                </div>
                <button 
                  onClick={() => handleCodeTransfer(code, rate, description)} 
                  style={{ background: C.green, color: C.navy, fontWeight: 700, padding: "8px 14px", borderRadius: 4, fontSize: 12 }}
                >
                  💉 Inject
                </button>
              </div>
            );
          })}
          
          {!predicting && matches.length === 0 && text.trim() && (
            <p style={{ fontSize: 12, color: C.muted, textAlign: "center" }}>No analysis rows extracted. Try refining the text description.</p>
          )}
        </div>
      </Card>
    );
  }



  // ─── MODULE 4: SYSTEM SETTINGS OVERRIDES ────────────────────────────────
    function CustomsSettings() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Card>
          <h3 style={{ color: C.gold, fontSize: 15, marginBottom: 10 }}>📖 Official BOC Legal Processing Bracket Rules (CAO 02-2001 Basis)</h3>
          <p style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
            The Customs Processing Fee (CPF) cascades strictly based on the aggregated Dutiable Value (FOB + Insurance + Freight) tier limits under Philippine regulatory mandates:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {settings.bocFeeSchedule && settings.bocFeeSchedule.map((tier, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", background: C.navy, padding: "10px 14px", borderRadius: 6, border: `1px solid ${C.border}`, alignItems: "center" }}>
                <span style={{ fontSize: 13 }}>
                  Bracket {idx + 1}: {tier.maxUSD === Infinity ? "Shipments exceeding $17,500 USD" : `Up to $ ${tier.maxUSD.toLocaleString()} USD`}
                </span>
                <span className="mono" style={{ color: C.goldL, fontWeight: 700 }}>₱ {tier.fee.toFixed(2)} CPF Charge</span>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h3 style={{ color: C.gold, fontSize: 15 }}>📋 Administrative Operational Multipliers</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: C.muted }}>BOC Daily Exchange Rate (USD/PHP)</label>
              <input type="number" step="0.01" value={settings.exchangeRate} onChange={e => setSettings({...settings, exchangeRate: parseFloat(e.target.value) || 0})} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted }}>Internal Revenue VAT Rate (%)</label>
              <input type="number" value={settings.vatRate} onChange={e => setSettings({...settings, vatRate: parseFloat(e.target.value) || 0})} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted }}>Import Documentary Stamp Surcharge (PHP)</label>
              <input type="number" value={settings.docStampFee} onChange={e => setSettings({...settings, docStampFee: parseFloat(e.target.value) || 0})} />
            </div>
          </div>
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
