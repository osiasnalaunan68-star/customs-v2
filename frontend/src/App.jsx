import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './AuthContext';
import Login from './Login';
import Register from './Register';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { API_BASE_URL } from './config';

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

function Card({ children, style }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, ...style }}>{children}</div>;
}

function AppContent() {
  const { token, logout } = useAuth();
  const [tab, setTab] = useState("calc");
  const [sharedCodeData, setSharedCodeData] = useState(null);

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("boc_app_settings");
    return saved ? JSON.parse(saved) : { vatRate: 12, bocProcessingFee: 700, docStampFee: 130, exchangeRate: 60.74 };
  });

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
              <thead><tr><th>Code</th><th>Description</th><th>Rate</th><th>Action</th></tr></thead>
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

  function InteractiveCalc() {
    const [fob, setFob] = useState(sharedCodeData?.fob || 10000);
    const [freight, setFreight] = useState(sharedCodeData?.freight || 500);
    const [insurance, setInsurance] = useState(sharedCodeData?.insurance || 0);
    const [dutyRate, setDutyRate] = useState(sharedCodeData?.rate || 14);
    const [hsCode, setHsCode] = useState(sharedCodeData?.code || "0000.00.00");
    const [calcResult, setCalcResult] = useState(null);

    useEffect(() => {
      if (sharedCodeData) { setHsCode(sharedCodeData.code); setDutyRate(sharedCodeData.rate); }
    }, [sharedCodeData]);

    const handleCalculate = async () => {
      const currentRate = parseFloat(settings?.exchangeRate) || 60.74;
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
          import_processing_fee: 250.0,
          ahtn_code: hsCode
        })
      });
      const data = await res.json();
      if (res.ok) setCalcResult(data);
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
  if (loading) return <div>Loading...</div>;
  if (!token) return <Navigate to="/login" replace />;
  return <AppContent />;
}
