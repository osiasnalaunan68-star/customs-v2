import React, { useState, useMemo } from 'react';

const C = {
  navy:"#0A1628", navyL:"#112240", blue:"#1B4F9B",
  gold:"#C8972B", goldL:"#F0B429", white:"#F5F7FA",
  muted:"#8899AA", border:"#1E3A5F", green:"#1A7F5A",
  red:"#B03A2E", card:"#0D1F3C",
};

function Row({ label, value, highlight, sub }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '8px 0', borderBottom: `1px solid ${C.border}22`,
      background: highlight ? `${C.gold}0d` : 'transparent',
      borderRadius: highlight ? 4 : 0, paddingLeft: highlight ? 8 : 0, paddingRight: highlight ? 8 : 0,
    }}>
      <div>
        <span style={{ fontSize: 13, color: highlight ? C.white : C.muted }}>{label}</span>
        {sub && <div style={{ fontSize: 11, color: C.muted }}>{sub}</div>}
      </div>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: highlight ? 16 : 13, fontWeight: highlight ? 800 : 400, color: highlight ? C.goldL : C.white }}>
        {value}
      </span>
    </div>
  );
}

const COMMON_RATES = [
  { label: 'Agricultural — Rice (Sec 47 CMTA)', rate: 35 },
  { label: 'Agricultural — Pork Products',       rate: 25 },
  { label: 'Industrial — Machinery (most)',      rate: 0  },
  { label: 'Electronics — Consumer Devices',     rate: 5  },
  { label: 'Vehicles — Passenger Cars',          rate: 30 },
  { label: 'Textiles & Apparel',                 rate: 10 },
  { label: 'Chemicals — Industrial Grade',       rate: 3  },
  { label: 'Footwear',                           rate: 20 },
];

export default function PreEstimator({ onTransferToCalc }) {
  const [fob,      setFob]      = useState(5000);
  const [freight,  setFreight]  = useState(300);
  const [ins,      setIns]      = useState(0);
  const [rate,     setRate]     = useState(5);
  const [exRate,   setExRate]   = useState(58.50);
  const [vatRate,  setVatRate]  = useState(12);
  const [preset,   setPreset]   = useState('');

  const applyPreset = (e) => {
    const found = COMMON_RATES.find(r => r.label === e.target.value);
    if (found) { setRate(found.rate); setPreset(found.label); }
  };

  const calc = useMemo(() => {
    const f  = parseFloat(fob)     || 0;
    const fr = parseFloat(freight) || 0;
    const i  = parseFloat(ins)     || 0;
    const r  = parseFloat(rate)    || 0;
    const ex = parseFloat(exRate)  || 1;
    const vr = parseFloat(vatRate) || 12;

    const cif_usd = f + fr + i;
    const cif_php = cif_usd * ex;
    const duty    = cif_php * (r / 100);
    // BOC simplified fees (client-side estimate)
    const boc_fee = f * ex < 250000 ? 250 : 500;
    const bir_doc = 265;
    const landed  = cif_php + duty + boc_fee + bir_doc;
    const vat     = landed * (vr / 100);
    const total   = duty + boc_fee + bir_doc + vat;
    const isDeMinimis = cif_usd <= 200;

    return { cif_usd, cif_php, duty, boc_fee, bir_doc, landed, vat, total, isDeMinimis };
  }, [fob, freight, ins, rate, exRate, vatRate]);

  const fmt = n => '₱ ' + (n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.goldL }}>⚡ Quick Pre-Estimator</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Instant client-side estimate — no API call needed</div>
        </div>
        {calc.isDeMinimis && (
          <span style={{ background: `${C.green}22`, color: C.green, border: `1px solid ${C.green}55`, borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700 }}>
            🟢 De Minimis (≤ USD 200)
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4 }}>Common Duty Rate Presets</label>
            <select value={preset} onChange={applyPreset} style={{ width: '100%', background: C.navyL, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.white, fontSize: 13, outline: 'none' }}>
              <option value="">— Select a common commodity —</option>
              {COMMON_RATES.map(r => <option key={r.label} value={r.label}>{r.label} ({r.rate}%)</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.muted }}>FOB Value (USD)</label>
            <input type="number" value={fob} onChange={e => setFob(e.target.value)} style={{ width: '100%', background: C.navyL, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.white, fontSize: 13, outline: 'none', marginTop: 4 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.muted }}>Freight (USD)</label>
            <input type="number" value={freight} onChange={e => setFreight(e.target.value)} style={{ width: '100%', background: C.navyL, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.white, fontSize: 13, outline: 'none', marginTop: 4 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.muted }}>Insurance (USD)</label>
            <input type="number" value={ins} onChange={e => setIns(e.target.value)} style={{ width: '100%', background: C.navyL, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.white, fontSize: 13, outline: 'none', marginTop: 4 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.muted }}>Duty Rate (%): <strong style={{ color: C.goldL }}>{rate}%</strong></label>
            <input type="range" min="0" max="65" step="0.5" value={rate} onChange={e => setRate(e.target.value)} style={{ width: '100%', marginTop: 4, cursor: 'pointer' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.muted }}>Exchange Rate (₱/USD)</label>
            <input type="number" value={exRate} step="0.01" onChange={e => setExRate(e.target.value)} style={{ width: '100%', background: C.navyL, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.white, fontSize: 13, outline: 'none', marginTop: 4 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.muted }}>VAT Rate (%)</label>
            <input type="number" value={vatRate} onChange={e => setVatRate(e.target.value)} style={{ width: '100%', background: C.navyL, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.white, fontSize: 13, outline: 'none', marginTop: 4 }} />
          </div>
        </div>

        {/* Results */}
        <div style={{ background: C.navyL, borderRadius: 10, padding: 16, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.goldL, marginBottom: 10 }}>📊 Estimated Breakdown</div>
          <Row label="CIF Value (USD)" value={`USD ${(calc.cif_usd || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} />
          <Row label={`CIF Value (PHP @ ₱${parseFloat(exRate).toFixed(2)})`} value={fmt(calc.cif_php)} />
          <Row label={`Customs Duty (${rate}%)`} value={fmt(calc.duty)} />
          <Row label="BOC Processing Fee (est.)" value={fmt(calc.boc_fee)} sub="Simplified client-side estimate" />
          <Row label="BIR Documentary Stamp" value={fmt(calc.bir_doc)} />
          <Row label="Total Landed Cost (VAT base)" value={fmt(calc.landed)} />
          <Row label={`VAT (${vatRate}%)`} value={fmt(calc.vat)} />
          <div style={{ borderTop: `2px solid ${C.gold}`, paddingTop: 12, marginTop: 8 }}>
            <Row label="TOTAL ESTIMATED TAX" value={fmt(calc.total)} highlight />
          </div>
          <div style={{ marginTop: 14, padding: '10px 12px', background: `${C.gold}0d`, border: `1px solid ${C.gold}22`, borderRadius: 8, fontSize: 11, color: C.muted }}>
            ⚠️ <strong>Estimate only.</strong> BOC fees simplified. Use the official Calculator tab for auditable results with exact CMTA computation.
          </div>
          {onTransferToCalc && (
            <button onClick={() => onTransferToCalc({ fob: parseFloat(fob), freight: parseFloat(freight), insurance: parseFloat(ins), rate: parseFloat(rate) })} style={{ marginTop: 12, padding: '10px 0', background: C.gold, color: C.navy, borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 14, width: '100%' }}>
              🚀 Send to Official Calculator
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
