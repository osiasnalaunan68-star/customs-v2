import React, { useState, useEffect, useRef } from 'react';
import { useAuth, AuthProvider } from './AuthContext';
import Login from './Login';
import Register from './Register';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { API_BASE_URL, TARIFF_VERSION, LAST_UPDATED } from './config';

const C = {
  navy:   "#0A1628", navyL:  "#112240", blue:   "#1B4F9B", gold:   "#C8972B",
  goldL:  "#F0B429", white:  "#F5F7FA", muted:  "#8899AA", border: "#1E3A5F",
  green:  "#1A7F5A", red:    "#B03A2E", card:   "#0D1F3C", orange: "#D35400"
};

const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0A0F1E; color: #E8F0FE; font-family: 'Inter', sans-serif; }
  input, select, textarea { background: #112240; border: 1px solid #1E3A5F; color: #E8F0FE; border-radius: 6px; padding: 10px 14px; width: 100%; }
  input:focus, select:focus, textarea:focus { border-color: #C8972B; }
  button { cursor: pointer; font-family: 'Inter', sans-serif; border: none; transition: all 0.2s; }
  .mono { font-family: 'JetBrains Mono', monospace; }
  .calc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .nav-tabs { display: flex; overflow-x: auto; }
  .nav-tabs button { padding: 14px 20px; color: #8899AA; background: transparent; border-bottom: 2px solid transparent; }
  .nav-tabs button.active { color: #F0B429; border-bottom-color: #C8972B; font-weight: 700; }
  .hs-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .hs-table th { padding: 12px 14px; background: #112240; color: #8899AA; text-align: left; }
  .hs-table td { padding: 10px 14px; border-bottom: 1px solid #1E3A5F20; }
  @media (max-width: 768px) { .calc-grid { grid-template-columns: 1fr !important; } }
`;

function Pill({ color, children }) {
  return <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{children}</span>;
}

function Card({ children, style }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, ...style }}>{children}</div>;
}

function AppContent() {
  const { token, logout } = useAuth();
  const [tab, setTab] = useState("calc");
  const [sharedCodeData, setSharedCodeData] = useState(null);

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("boc_app_settings");
    return saved ? JSON.parse(saved) : { vatRate: 12, bocProcessingFee: 700, docStampFee: 130, exchangeRate: 60.74, customOverrides: {} };
  });

  const [history, setHistory] = useState([]);

  // ─── HSLookup Component ───
  function HSLookup() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const search = async () => {
      const res = await fetch(`${API_BASE_URL}/search?q=${query}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setResults(data.results || []);
    };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="Search tariff items..." value={query} onChange={e => setQuery(e.target.value)} />
            <button onClick={search} style={{ background: C.gold, color: C.navy, padding: "0 20px", borderRadius: 6 }}>Search</button>
          </div>
        </Card>
        {results.length > 0 && (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <table className="hs-table">
              <thead>
                <tr><th>Code</th><th>Description</th><th>Rate</th><th>Action</th></tr>
              </thead>
              <tbody>
                {results.map((item, i) => (
                  <tr key={i}>
                    <td className="mono">{item.code}</td>
                    <td>{item.description}</td>
                    <td>{item.rate_2026 || 0}%</td>
                    <td>
                      <button onClick={() => { setSharedCodeData({ code: item.code, rate: item.rate_2026 || 0, desc: item.description }); setTab("calc"); }} style={{ background: C.blue, color: C.white, padding: "4px 8px", borderRadius: 4 }}>Inject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    );
  }

  // ─── Interactive Calculator ───
  function InteractiveCalc() {
    const [fob, setFob] = useState(sharedCodeData?.fob || 10000);
    const [freight, setFreight] = useState(sharedCodeData?.freight || 500);
    const [insurance, setInsurance] = useState(sharedCodeData?.insurance || 0);
    const [dutyRate, setDutyRate] = useState(sharedCodeData?.rate || 5);
    const [hsCode, setHsCode] = useState(sharedCodeData?.code || "0000.00.00");
    const [legalDesc, setLegalDesc] = useState(sharedCodeData?.desc || "General cargo baseline entry");
    const [calcResult, setCalcResult] = useState(null);

    useEffect(() => {
      if (sharedCodeData) {
        setHsCode(sharedCodeData.code || "0000.00.00");
        setDutyRate(sharedCodeData.rate || 0);
        setLegalDesc(sharedCodeData.desc || "");
      }
    }, [sharedCodeData]);

    const handleCalculate = async () => {
      const currentRate = parseFloat(settings?.exchangeRate) || 60.74;
      const currentProcessingFee = parseFloat(settings?.bocProcessingFee) || 0.0;

      const res = await fetch(`${API_BASE_URL}/calculator/compute-boc-taxes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fob_fca_value: parseFloat(fob) || 0,
          exchange_rate: currentRate,
          freight_cost: parseFloat(freight) || 0,
          insurance_cost: parseFloat(insurance) || 0,
          rate_of_duty: parseFloat(dutyRate) || 0,
          is_dangerous_goods: false,
          excise_tax: 0.0,
          brokerage_fee: 700.0,
          import_processing_fee: currentProcessingFee,
          ahtn_code: hsCode
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCalcResult(data);
      } else {
        console.error("Calculation Error:", data);
      }
    };

    const fmt = n => n !== undefined ? "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2 }) : "—";

    return (
      <div className="calc-grid">
        <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontWeight: 700, color: C.goldL }}>🎛️ Simulation Modifiers</p>
          <div><label style={{ fontSize: 12, color: C.muted }}>FOB Value (USD)</label><input type="number" value={fob} onChange={e => setFob(e.target.value)} /></div>
          <div><label style={{ fontSize: 12, color: C.muted }}>Freight (USD)</label><input type="number" value={freight} onChange={e => setFreight(e.target.value)} /></div>
          <div><label style={{ fontSize: 12, color: C.muted }}>Insurance (USD)</label><input type="number" value={insurance} onChange={e => setInsurance(e.target.value)} /></div>
          <div><label style={{ fontSize: 12, color: C.muted }}>Duty Rate (%)</label><input type="number" value={dutyRate} onChange={e => setDutyRate(e.target.value)} /></div>
          <div style={{ background: C.navyL, padding: 10, borderRadius: 6 }}>
            <span style={{ fontSize: 11, color: C.gold }}>Active Item Code: {hsCode}</span>
            <p style={{ fontSize: 12 }}>{legalDesc}</p>
          </div>
          <button onClick={handleCalculate} style={{ background: C.gold, color: C.navy, padding: 12, borderRadius: 6, fontWeight: 700 }}>Compute Taxes</button>
        </Card>

        <div>
          {calcResult && (
            <Card style={{ display: "flex", flexDirection: "column", gap: 12, borderLeft: `4px solid ${C.gold}` }}>
              <p style={{ fontWeight: 700, color: C.goldL }}>📊 Duty & Tax Cascade Output</p>

              <div style={{ background: C.navyL, padding: 10, borderRadius: 6, fontSize: 12 }}>
                <span style={{ fontWeight: 600, color: C.gold }}>⚖️ Legal Rule Base:</span>
                <p>{calcResult.legal_justification}</p>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Customs Duty:</span><span className="mono">{fmt(calcResult.assessment?.customs_duty)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>VAT (12%):</span><span className="mono">{fmt(calcResult.assessment?.vat_12)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                <strong>Total Tax Payable:</strong><span className="mono" style={{ color: C.goldL, fontWeight: 700 }}>{fmt(calcResult.assessment?.total_tax_payable)}</span>
              </div>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 4 }}>
                <p style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>💸 Volatility Buffer (Variance +1.5%)</p>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span>Suggested Safeguard Reserve:</span>
                  <span className="mono" style={{ color: C.orange }}>+{fmt(calcResult.volatility_buffer?.suggested_buffer_php)}</span>
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, background: 'rgba(176,58,46,0.1)', padding: 10, borderRadius: 6 }}>
                <p style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>🔍 Post-Clearance Audit Risk Level: {calcResult.risk_profile?.level}</p>
                <p style={{ fontSize: 11, color: C.muted }}>Risk Score: {calcResult.risk_profile?.score}/100</p>
                {calcResult.risk_profile?.triggers?.map((tg, i) => (
                  <span key={i} style={{ display: "inline-block", background: C.navy, fontSize: 10, padding: "2px 6px", marginRight: 4, borderRadius: 4 }}>⚠️ {tg}</span>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{globalStyle}</style>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ background: C.navyL, padding: "0 24px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
            <span style={{ fontWeight: 700 }}>⚓ PH Customs Workspace</span>
            <button onClick={logout} style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, padding: "6px 12px", borderRadius: 4 }}>Logout</button>
          </div>
        </div>
        <div style={{ background: C.navyL, borderBottom: `1px solid ${C.border}` }}>
          <div className="nav-tabs" style={{ maxWidth: 1200, margin: "0 auto" }}>
            <button className={tab === "lookup" ? "active" : ""} onClick={() => setTab("lookup")}>🔍 HS Lookup</button>
            <button className={tab === "calc" ? "active" : ""} onClick={() => setTab("calc")}>🧮 Calculator</button>
          </div>
        </div>
        <div style={{ flex: 1, maxWidth: 1200, margin: "0 auto", width: "100%", padding: 24 }}>
          {tab === "lookup" ? <HSLookup /> : <InteractiveCalc />}
        </div>
      </div>
    </>
  );
}

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
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading Workspace...</div>;
  if (!token) return <Navigate to="/login" replace />;
  return <AppContent />;
}
