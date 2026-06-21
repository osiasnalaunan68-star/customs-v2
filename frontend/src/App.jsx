import { useState, useEffect } from "react";

const API = "http://localhost:8000";

// ─── THEME & COLOR PALETTE ───────────────────────────────────────────────
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
    color: ${C.white}; border-radius: 6px; padding: 8px 12px;
    font-family: 'Inter', sans-serif; font-size: 14px; outline: none;
    transition: border 0.2s;
  }
  input:focus, select:focus, textarea:focus { border-color: ${C.gold}; }
  button { cursor: pointer; font-family: 'Inter', sans-serif; border: none; }
  .mono { font-family: 'JetBrains Mono', monospace; }
`;

const TABS = [
  { id: "lookup",    label: "🔍 HS Lookup" },
  { id: "calc",      label: "🧮 Duty Calculator" },
  { id: "ai",        label: "🤖 AI Classifier" },
  { id: "browser",   label: "📚 Tariff Browser" },
  { id: "settings",  label: "⚙️ Customs Settings" },
];

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

// ─── SYSTEM CORE CONFIGURATION STATE MANAGEMENT ───────────────────────────
const DEFAULT_SETTINGS = {
  vatRate: 12,
  bocProcessingFee: 250,
  docStampFee: 265,
  exchangeRate: 58.50,
  customOverrides: {}, 
};

// ─── MASTER PLATFORM ROUTER ────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("lookup");
  const [sharedCodeData, setSharedCodeData] = useState(null);
  
  // Persistent Regulatory State (Simulating local configuration persistence)
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("boc_app_settings");
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem("boc_app_settings", JSON.stringify(settings));
  }, [settings]);

  const handleCodeTransfer = (code, rate) => {
    setSharedCodeData({ code, rate });
    setTab("calc");
  };

  // ─── TAB COMPONENTS EMBEDDED TO CONSERVE FLOW ───────────────────────────
  
  // 1. HS LOOKUP MODULE
  function HSLookup() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const search = async () => {
      if (!query.trim()) return;
      setLoading(true); setError(""); setResults([]);
      try {
        const r = await fetch(`${API}/search?q=${encodeURIComponent(query)}&limit=50`);
        const d = await r.json();
        setResults(d.results || []);
        if (!d.results?.length) setError("No results found.");
      } catch {
        setError("Cannot connect to backend. Verify your FastAPI server status.");
      }
      setLoading(false);
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>
            Search by AHTN code or commodity keyword using your local memory data engine.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ flex: 1 }} placeholder="Enter HS code or description..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} />
            <button onClick={search} disabled={loading} style={{ background: C.gold, color: C.navy, padding: "10px 18px", borderRadius: 7, fontWeight: 600 }}>{loading ? "Searching..." : "Search"}</button>
          </div>
        </Card>
        {results.length > 0 && (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}` }}><span style={{ fontWeight: 600 }}>Tariff Matching Matrix</span></div>
            <div style={{ overflow: "auto", maxHeight: 400 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.navyL }}>
                    {["Code", "Description", "Base Rate", "Status", "Action"].map(h => <th key={h} style={{ padding: "10px 14px", color: C.muted, textAlign: "left" }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    // FIXED: Using r.rate instead of r.rate_2024 since backend passes rate.
                    const hasOverride = settings.customOverrides[r.code] !== undefined;
                    const finalRate = hasOverride ? settings.customOverrides[r.code] : r.rate;
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}20` }}>
                        <td className="mono" style={{ padding: "10px 14px", color: C.goldL }}>{r.code}</td>
                        <td style={{ padding: "10px 14px" }}>{r.description}</td>
                        <td className="mono" style={{ padding: "10px 14px" }}>
                          {finalRate}% {hasOverride && <span style={{ color: C.gold, fontSize: 10 }}>(Overridden)</span>}
                        </td>
                        <td style={{ padding: "10px 14px" }}><Pill color={r.quota_type === "In-Quota" ? C.green : C.blue}>{r.quota_type || "MFN"}</Pill></td>
                        <td style={{ padding: "10px 14px" }}><button onClick={() => handleCodeTransfer(r.code, finalRate)} style={{ padding: "4px 8px", background: C.blue, color: C.white, borderRadius: 4, fontSize: 11 }}>Select</button></td>
                      </tr>
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

  // 2. DYNAMIC REVENUE CALCULATOR
  function DutyCalc() {
    const [form, setForm] = useState({
      usdValue: "", freightUsd: "", insuranceUsd: "",
      dutyRate: "", manualCode: ""
    });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
      if (sharedCodeData) {
        setForm(p => ({
          ...p,
          manualCode: sharedCodeData.code,
          dutyRate: sharedCodeData.rate !== null && sharedCodeData.rate !== undefined ? String(sharedCodeData.rate) : ""
        }));
        setSharedCodeData(null);
      }
    }, [sharedCodeData]);

    // FIXED: Properly POSTing to your FastAPI endpoint to get robust BOC calculation
    const calculateAssessment = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = {
          fob_fca_value: parseFloat(form.usdValue) || 0,
          exchange_rate: parseFloat(settings.exchangeRate) || 1,
          freight_cost: parseFloat(form.freightUsd) || 0,
          insurance_cost: parseFloat(form.insuranceUsd) || 0,
          rate_of_duty: parseFloat(form.dutyRate) || 0,
          is_dangerous_goods: false,
          excise_tax: 0,
          brokerage_fee: 700, 
          import_processing_fee: parseFloat(settings.bocProcessingFee) || 0,
          ahtn_code: form.manualCode || "0000.00.00"
        };

        const res = await fetch(`${API}/calculator/compute-boc-taxes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Calculation failed. Verify backend.");
        const data = await res.json();
        setResult(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const fmt = n => "₱ " + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <p style={{ fontWeight: 600, marginBottom: 14, color: C.goldL }}>🚢 Commercial Assessment (USD)</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="number" placeholder="FOB Cargo Value (USD)" value={form.usdValue} onChange={e => setForm({...form, usdValue: e.target.value})} />
              <input type="number" placeholder="International Freight (USD)" value={form.freightUsd} onChange={e => setForm({...form, freightUsd: e.target.value})} />
              <input type="number" placeholder="Insurance Premium (USD)" value={form.insuranceUsd} onChange={e => setForm({...form, insuranceUsd: e.target.value})} />
            </div>
          </Card>
          <Card>
            <p style={{ fontWeight: 600, marginBottom: 14, color: C.goldL }}>⚖️ Classification Verification</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input placeholder="Target AHTN Code" value={form.manualCode} onChange={e => setForm({...form, manualCode: e.target.value})} />
              <input type="number" placeholder="Target Duty Rate (%)" value={form.dutyRate} onChange={e => setForm({...form, dutyRate: e.target.value})} />
              <p style={{ fontSize: 11, color: C.muted }}>App is processing values using active configuration: 1 USD = ₱{settings.exchangeRate}</p>
            </div>
          </Card>
          {error && <p style={{ color: C.red, fontSize: 13 }}>{error}</p>}
          <button onClick={calculateAssessment} disabled={loading} style={{ background: C.gold, color: C.navy, padding: 14, borderRadius: 7, fontWeight: 700 }}>
            {loading ? "Running CMTA Assessment..." : "Execute Assessment Logic"}
          </button>
        </div>

        <div>
          {result ? (
            <Card style={{ borderLeft: `4px solid ${result.risk_profile?.level === 'CRITICAL' ? C.red : C.gold}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <p style={{ fontWeight: 700, fontSize: 16, color: C.goldL }}>📊 CMTA Legal Assessment Summary</p>
                <Pill color={result.risk_profile?.level === 'LOW' ? C.green : result.risk_profile?.level === 'MEDIUM' ? C.gold : C.red}>{result.risk_profile?.level} RISK</Pill>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Entry Type</span><span style={{textTransform: "capitalize", color: C.goldL}}>{result.entry_type}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Customs Valuation Basis (CIF)</span><span className="mono">{fmt(result.valuation.dutiable_value_php)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Calculated Customs Duty</span><span className="mono">{fmt(result.assessment.customs_duty)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }} style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}><span style={{ color: C.muted }}>Landed Cost (Tax Base)</span><span className="mono">{fmt(result.assessment.total_landed_cost)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Value-Added Tax ({settings.vatRate}%)</span><span className="mono">{fmt(result.assessment.vat_12)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>BOC Administrative Processing Fee</span><span className="mono">{fmt(settings.bocProcessingFee)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Customs Documentary Stamp</span><span className="mono">{fmt(settings.docStampFee)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: `2px solid ${C.gold}`, paddingTop: 12, marginTop: 8 }}>
                  <span style={{ fontWeight: 700 }}>TOTAL FIELD LIABILITIES</span>
                  <span className="mono" style={{ color: C.goldL, fontWeight: 800, fontSize: 18 }}>{fmt(result.assessment.total_tax_payable)}</span>
                </div>
                <p style={{fontSize: 11, color: C.muted, marginTop: 10, fontStyle: "italic"}}>{result.legal_justification}</p>
              </div>
            </Card>
          ) : (
            <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, color: C.muted }}>
              <p>Enter cargo variables to compile legal assessment</p>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // 3. PROTOTYPE AI CLASSIFIER
  function AIClassifier() {
    const [desc, setDesc] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const runClassification = async () => {
      if (!desc.trim()) return;
      setLoading(true);
      try {
        const r = await fetch(`${API}/classify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: desc })
        });
        const d = await r.json();
        // Fallback for demo since we don't have perfect anthropic integration
        setResult(d.predictions && d.predictions.length > 0 ? d.predictions[0] : null);
      } catch {}
      setLoading(false);
    };

    return (
      <Card>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>Input shipping manifest descriptors to parse AHTN targets.</p>
        <textarea rows={3} style={{ width: "100%", marginBottom: 12 }} value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Premium frozen yellowfin tuna belly slices..." />
        <button onClick={runClassification} style={{ width: "100%", background: C.gold, color: C.navy, padding: 12, fontWeight: 600 }}>{loading ? "Processing NLP Descriptors..." : "Execute AI Profiling"}</button>
        {result && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 18, color: C.goldL, fontWeight: 700 }}>AHTN Target: {result.code || result.hs_code}</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>{result.reasoning}</p>
            <button onClick={() => handleCodeTransfer(result.code || result.hs_code, result.duty_rate)} style={{ marginTop: 12, padding: "6px 12px", background: C.blue, color: C.white, borderRadius: 4 }}>Send to Core Engine</button>
          </div>
        )}
      </Card>
    );
  }

  // 4. TARIFF CHAPTER BROWSER
  function TariffBrowser() {
    const [chapters, setChapters] = useState([]);
    const [selected, setSelected] = useState(null);
    const [items, setItems] = useState([]);

    useEffect(() => {
      fetch(`${API}/chapters`).then(r => r.json()).then(d => setChapters(d.chapters || []));
    }, []);

    const loadChapter = async (ch) => {
      setSelected(ch);
      const r = await fetch(`${API}/chapter/${ch.number}`);
      const d = await r.json();
      setItems(d.items || []);
    };

    return (
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }}>
        <Card style={{ padding: 0, maxHeight: 500, overflow: "auto" }}>
          {chapters.map(ch => (
            <div key={ch.number} onClick={() => loadChapter(ch)} style={{ padding: "10px 14px", cursor: "pointer", background: selected?.number === ch.number ? C.blue + "33" : "transparent" }}>
              <span style={{ color: C.gold, fontSize: 11, marginRight: 6 }}>Ch.{ch.number}</span> {ch.title}
            </div>
          ))}
        </Card>
        <div>
          {selected ? (
            <Card style={{ padding: 0 }}>
              <div style={{ overflow: "auto", maxHeight: 500 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}15` }}>
                        <td className="mono" style={{ padding: 12, color: C.goldL }}>{item.code}</td>
                        <td style={{ padding: 12 }}>{item.description}</td>
                        {/* FIXED: Passed item.rate instead of undefined item.rate_2024 */}
                        <td style={{ padding: 12 }}><button onClick={() => handleCodeTransfer(item.code, item.rate)} style={{ padding: "4px 8px", background: C.blue, color: C.white, borderRadius: 4 }}>Use</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : <Card style={{ color: C.muted }}>Select a chapter to browse structured data lines.</Card>}
        </div>
      </div>
    );
  }

  // 5. EDITABLE CUSTOMS REGULATORY SETTINGS PANEL
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
      alert("System Configuration Synchronized Successfully!");
    };

    const addOverride = () => {
      if (!ovCode.trim()) return;
      setSettings(p => ({
        ...p,
        customOverrides: {
          ...p.customOverrides,
          [ovCode.trim()]: parseFloat(ovRate) || 0
        }
      }));
      setOvCode(""); setOvRate("");
    };

    const clearOverrides = () => {
      setSettings(p => ({ ...p, customOverrides: {} }));
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card style={{ borderLeft: `4px solid ${C.gold}` }}>
          <p style={{ fontWeight: 700, fontSize: 16, color: C.gold, marginBottom: 4 }}>⚙️ Legal Variable Control Terminal</p>
          <p style={{ color: C.muted, fontSize: 13 }}>Modify statutory values to match incoming EOs, CMOs, or updated BOC weekly exchange rates. System state is retained in local cache memory.</p>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card>
            <p style={{ fontWeight: 600, marginBottom: 14, color: C.white }}>🌐 Global Tariffs & Customs Duties</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, color: C.muted }}>BOC Weekly Exchange Rate (USD to PHP)</label>
                <input type="number" value={ex} onChange={e => setEx(e.target.value)} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, color: C.muted }}>Value-Added Tax (VAT %)</label>
                <input type="number" value={vat} onChange={e => setVat(e.target.value)} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, color: C.muted }}>BOC Processing Fee (PHP)</label>
                <input type="number" value={proc} onChange={e => setProc(e.target.value)} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, color: C.muted }}>Customs Documentary Stamp Fee (PHP)</label>
                <input type="number" value={doc} onChange={e => setDoc(e.target.value)} />
              </div>
              <button onClick={saveGlobalSettings} style={{ background: C.green, color: C.white, padding: 10, borderRadius: 6, fontWeight: 600, marginTop: 8 }}>Apply Regulatory Settings</button>
            </div>
          </Card>

          <Card>
            <p style={{ fontWeight: 600, marginBottom: 14, color: C.white }}>🏷️ Targeted AHTN Code Overrides (Executive Orders)</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 12, color: C.muted }}>If a Presidential Executive Order overrides a baseline rate for a specific item, enter the parameters below:</p>
              <input placeholder="AHTN Code (e.g. 1006.30.99)" value={ovCode} onChange={e => setOvCode(e.target.value)} />
              <input type="number" placeholder="New Executive Order Rate (%)" value={ovRate} onChange={e => setOvRate(e.target.value)} />
              <button onClick={addOverride} style={{ background: C.blue, color: C.white, padding: 8, borderRadius: 6, fontWeight: 600 }}>Inject Code Override</button>
              
              <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontSize: 12, fontWeight: 600 }}>Active Custom Exceptions</span><button onClick={clearOverrides} style={{ background: "transparent", color: C.red, fontSize: 11 }}>Clear All</button></div>
                <div style={{ maxHeight: 120, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                  {Object.keys(settings.customOverrides).length === 0 ? <p style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: 10 }}>No custom code exceptions active.</p> : Object.entries(settings.customOverrides).map(([code, r]) => (
                    <div key={code} style={{ background: C.navyL, padding: "6px 10px", borderRadius: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="mono" style={{ fontSize: 12, color: C.goldL }}>{code}</span><span className="mono" style={{ fontSize: 12 }}>{r}%</span></div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const VIEWS = {
    lookup:    <HSLookup />,
    calc:      <DutyCalc />,
    ai:        <AIClassifier />,
    browser:   <TariffBrowser />,
    settings:  <CustomsSettings />,
  };

  return (
    <>
      <style>{globalStyle}</style>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ background: C.navyL, borderBottom: `1px solid ${C.border}`, padding: "0 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, background: C.gold, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: C.navy, fontSize: 16 }}>CB</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, lineHeight: 1 }}>PH Customs Broker App Framework</p>
                <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Adaptive Variable Computation Engine</p>
              </div>
            </div>
            <Pill color={C.gold}>V2 Core</Pill>
          </div>
        </div>
        <div style={{ background: C.navyL, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", padding: "0 24px", gap: 4 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "14px 18px", fontSize: 13, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? C.goldL : C.muted, background: "transparent", border: "none", borderBottom: tab === t.id ? `2px solid ${C.gold}` : "2px solid transparent", transition: "all 0.2s" }}>{t.label}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, maxWidth: 1200, margin: "0 auto", width: "100%", padding: "24px" }}>{VIEWS[tab]}</div>
      </div>
    </>
  );
}
