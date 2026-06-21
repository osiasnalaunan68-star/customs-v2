import React, { useState, useEffect } from 'react';
import { API_BASE_URL, TARIFF_VERSION, LAST_UPDATED } from './config';

const C = {
  navy:   "#0A1628", navyL:  "#112240", blue:   "#1B4F9B",
  gold:   "#C8972B", goldL:  "#F0B429", white:  "#F5F7FA",
  muted:  "#8899AA", border: "#1E3A5F", green:  "#1A7F5A",
  red:    "#B03A2E", card:   "#0D1F3C",
};

const stat_style = {
  card: {
    background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 12, padding: '20px 24px',
    display: 'flex', flexDirection: 'column', gap: 6,
    transition: 'border-color 0.2s, box-shadow 0.2s',
    cursor: 'default',
  }
};

function StatCard({ icon, label, value, sub, color, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      style={{
        ...stat_style.card,
        borderColor: hov ? color : C.border,
        boxShadow: hov ? `0 0 24px ${color}22` : 'none',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
    >
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span style={{ fontSize: 28, fontWeight: 800, color, fontFamily: 'JetBrains Mono, monospace' }}>{value}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{label}</span>
      {sub && <span style={{ fontSize: 11, color: C.muted }}>{sub}</span>}
    </div>
  );
}

function QuickAction({ icon, label, desc, color, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? `${color}22` : C.navyL,
        border: `1px solid ${hov ? color : C.border}`,
        borderRadius: 10, padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
        color: C.white, textAlign: 'left', transition: 'all 0.2s',
        width: '100%',
      }}
    >
      <span style={{ fontSize: 28, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: hov ? color : C.white }}>{label}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{desc}</div>
      </div>
    </button>
  );
}

function AlertBanner({ type, text }) {
  const colors = { info: C.blue, warn: C.gold, error: C.red, ok: C.green };
  const icons  = { info: 'ℹ️', warn: '⚠️', error: '🚨', ok: '✅' };
  const c = colors[type] || C.blue;
  return (
    <div style={{
      background: `${c}18`, border: `1px solid ${c}55`,
      borderLeft: `4px solid ${c}`, borderRadius: 8,
      padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 13,
    }}>
      <span>{icons[type]}</span>
      <span style={{ color: C.white }}>{text}</span>
    </div>
  );
}

export default function DashboardTab({ token, history, setTab, settings }) {
  const [serverStatus, setServerStatus] = useState('checking');
  const [tariffCount, setTariffCount] = useState(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/health`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? setServerStatus('online') : setServerStatus('degraded'))
      .catch(() => setServerStatus('offline'));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/tariff-count`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setTariffCount(d.count || d.total || null)).catch(() => {});
  }, [token]);

  const totalTax = history.reduce((s, e) => s + (e.total_tax_payable || 0), 0);
  const avgDuty  = history.length ? (history.reduce((s, e) => s + (e.rate_of_duty || 0), 0) / history.length) : 0;
  const lastCalc = history[0];
  const statusColor = { online: C.green, degraded: C.gold, offline: C.red, checking: C.muted };
  const statusLabel = { online: '🟢 API Online', degraded: '🟡 Degraded', offline: '🔴 Offline', checking: '⏳ Checking…' };

  const phTime = time.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const phDate = time.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header Banner ── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navyL} 0%, #0d2137 100%)`,
        border: `1px solid ${C.border}`, borderRadius: 14,
        padding: '24px 28px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.goldL, letterSpacing: '-0.5px' }}>
            ⚓ PH Customs Platform
          </div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
            Bureau of Customs — AHTN 2022 CMTA Reference System
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span style={{
              background: statusColor[serverStatus] + '22',
              color: statusColor[serverStatus],
              border: `1px solid ${statusColor[serverStatus]}55`,
              borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600,
            }}>{statusLabel[serverStatus]}</span>
            <span style={{ background: `${C.blue}22`, color: C.goldL, border: `1px solid ${C.blue}55`, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>
              {TARIFF_VERSION}
            </span>
            <span style={{ background: `${C.blue}22`, color: C.muted, border: `1px solid ${C.blue}33`, borderRadius: 20, padding: '3px 12px', fontSize: 12 }}>
              Updated: {LAST_UPDATED}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 26, fontWeight: 700, color: C.white }}>{phTime}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{phDate}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Philippine Standard Time (PHT)</div>
        </div>
      </div>

      {/* ── Alerts ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <AlertBanner type="info" text="AHTN 2022 tariff schedule active. MFN rates effective January 2026." />
        {history.length === 0 && <AlertBanner type="warn" text="No calculations recorded yet. Use the Calculator tab to begin." />}
        {serverStatus === 'offline' && <AlertBanner type="error" text="Cannot reach API server. Check your connection or Render deployment." />}
      </div>

      {/* ── Stats Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <StatCard icon="🧮" label="Calculations Run" value={history.length} sub="Session total" color={C.blue} onClick={() => setTab('history')} />
        <StatCard icon="💰" label="Total Tax Assessed" value={history.length ? '₱' + (totalTax / 1000).toFixed(1) + 'K' : '—'} sub="Across all runs" color={C.goldL} onClick={() => setTab('history')} />
        <StatCard icon="📊" label="Avg Duty Rate" value={history.length ? avgDuty.toFixed(1) + '%' : '—'} sub="Session average" color={C.green} />
        <StatCard icon="📦" label="AHTN Entries" value={tariffCount ? tariffCount.toLocaleString() : '...'} sub="Loaded in DB" color={C.gold} onClick={() => setTab('lookup')} />
        <StatCard icon="💱" label="Exchange Rate" value={'₱' + (parseFloat(settings.exchangeRate) || 0).toFixed(2)} sub="USD per 1 PHP" color={C.muted} onClick={() => setTab('calc')} />
        <StatCard icon="🏛️" label="BOC Proc. Fee" value={'₱' + (parseFloat(settings.bocProcessingFee) || 0)} sub="Current setting" color={C.muted} onClick={() => setTab('settings')} />
      </div>

      {/* ── Quick Actions + Last Calc ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.goldL, marginBottom: 4 }}>⚡ Quick Actions</div>
          <QuickAction icon="🔍" label="HS Code Lookup" desc="Search AHTN 2022 tariff database" color={C.blue} onClick={() => setTab('lookup')} />
          <QuickAction icon="🧮" label="Compute Duties" desc="BOC tax cascade calculator" color={C.gold} onClick={() => setTab('calc')} />
          <QuickAction icon="🤖" label="AI Classifier" desc="Claude-powered cargo classification" color={C.green} onClick={() => setTab('ai')} />
          <QuickAction icon="🚢" label="Shipment Tracker" desc="Track clearance stage timeline" color={C.goldL} onClick={() => setTab('tracker')} />
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.goldL, marginBottom: 14 }}>📋 Last Calculation</div>
          {lastCalc ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: C.muted }}>AHTN Code</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: C.goldL, fontWeight: 700 }}>{lastCalc.ahtn_code}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: C.muted }}>FOB Value</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: C.white }}>USD {lastCalc.fob_fca_value?.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: C.muted }}>Duty Rate</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: C.white }}>{lastCalc.rate_of_duty}%</span>
              </div>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: C.white }}>Total Tax</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: C.goldL, fontWeight: 800, fontSize: 18 }}>
                  ₱{lastCalc.total_tax_payable?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>{new Date(lastCalc.timestamp).toLocaleString('en-PH')}</div>
              <div style={{ fontSize: 12, color: C.muted, background: C.navyL, padding: '8px 10px', borderRadius: 6, lineHeight: 1.4 }}>
                {lastCalc.description}
              </div>
            </div>
          ) : (
            <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 30 }}>
              No calculations yet.<br />
              <button onClick={() => setTab('calc')} style={{ marginTop: 12, background: C.gold, color: C.navy, padding: '8px 20px', borderRadius: 6, fontWeight: 700, border: 'none', cursor: 'pointer' }}>Start Computing</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Legal Reference Bar ── */}
      <div style={{ background: `${C.gold}0d`, border: `1px solid ${C.gold}33`, borderRadius: 10, padding: '14px 20px', fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
        <strong style={{ color: C.goldL }}>⚖️ Legal Reference: </strong>
        Republic Act No. 10863 (CMTA) · TRAIN Law (RA 10963) · CMO 25-2023 · AHTN 2022 Philippine Schedule ·
        BOC CMO on Informal Entry De Minimis (Sec. 423) · 12% VAT per NIRC as amended.
        <strong style={{ color: C.goldL }}> This tool is for reference only. </strong>
        Final assessment is subject to BOC official valuation.
      </div>
    </div>
  );
}
