import React, { useState } from 'react';

const C = {
  navy:"#0A1628", navyL:"#112240", blue:"#1B4F9B",
  gold:"#C8972B", goldL:"#F0B429", white:"#F5F7FA",
  muted:"#8899AA", border:"#1E3A5F", green:"#1A7F5A",
  red:"#B03A2E", card:"#0D1F3C",
};

const STAGES = [
  { id: 'arrival',    icon: '🚢', label: 'Vessel Arrival',       desc: 'Vessel berthed at port. Cargo manifest lodged with BOC.' },
  { id: 'lodgement',  icon: '📄', label: 'IEIRD Lodgement',      desc: 'Import Entry and Internal Revenue Declaration filed via eSakay.' },
  { id: 'assessment', icon: '🔍', label: 'Assessment & Tagging', desc: 'Customs examiner assigned. Entry tagged for Green/Yellow/Red lane.' },
  { id: 'payment',    icon: '💰', label: 'Duty & Tax Payment',   desc: 'Duties, taxes, and BOC fees paid at authorized agent bank.' },
  { id: 'release',    icon: '✅', label: 'Cargo Release',        desc: 'Gate pass issued. Cargo released from port/customs custody.' },
  { id: 'delivery',   icon: '🚛', label: 'Delivery to Consignee', desc: 'Shipment transported to consignee warehouse or address.' },
];

const LANE_INFO = {
  green:  { color: C.green,  label: '🟢 Green Lane',  note: 'Automatic release. No physical examination required.' },
  yellow: { color: C.gold,   label: '🟡 Yellow Lane', note: 'Documentary check only. Physical exam may follow.' },
  red:    { color: C.red,    label: '🔴 Red Lane',    note: 'Full physical examination and valuation review required.' },
};

export default function ShipmentTracker() {
  const [activeStage, setActiveStage] = useState(0);
  const [lane, setLane]               = useState('green');
  const [note, setNote]               = useState('');
  const [notes, setNotes]             = useState({});
  const [editMode, setEditMode]       = useState(false);

  const addNote = () => {
    if (!note.trim()) return;
    setNotes(p => ({ ...p, [activeStage]: [...(p[activeStage] || []), { text: note.trim(), ts: Date.now() }] }));
    setNote('');
  };

  const laneInfo = LANE_INFO[lane];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.goldL }}>🚢 Shipment Clearance Tracker</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
              Philippine Bureau of Customs — BOC Port of Manila / Port of Cebu
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.muted }}>Customs Lane:</span>
            {Object.entries(LANE_INFO).map(([k, v]) => (
              <button key={k} onClick={() => setLane(k)} style={{
                padding: '5px 14px', borderRadius: 20, fontWeight: 700, fontSize: 12, border: `2px solid ${lane === k ? v.color : C.border}`,
                background: lane === k ? v.color + '22' : 'transparent', color: lane === k ? v.color : C.muted, cursor: 'pointer',
              }}>{k.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 12, background: laneInfo.color + '18', border: `1px solid ${laneInfo.color}44`, borderLeft: `4px solid ${laneInfo.color}`, borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
          <strong style={{ color: laneInfo.color }}>{laneInfo.label}</strong>
          <span style={{ color: C.muted, marginLeft: 10 }}>{laneInfo.note}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', marginBottom: 24 }}>
          {STAGES.map((s, i) => (
            <React.Fragment key={s.id}>
              <div
                onClick={() => setActiveStage(i)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', position: 'relative', zIndex: 1 }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: i < activeStage ? C.green : i === activeStage ? C.gold : C.navyL,
                  border: `3px solid ${i < activeStage ? C.green : i === activeStage ? C.goldL : C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  boxShadow: i === activeStage ? `0 0 16px ${C.gold}66` : 'none',
                  transition: 'all 0.3s',
                }}>
                  {i < activeStage ? '✓' : s.icon}
                </div>
                <div style={{ fontSize: 10, color: i === activeStage ? C.goldL : i < activeStage ? C.green : C.muted, marginTop: 6, textAlign: 'center', maxWidth: 60, lineHeight: 1.3, fontWeight: i === activeStage ? 700 : 400 }}>
                  {s.label}
                </div>
              </div>
              {i < STAGES.length - 1 && (
                <div style={{ flex: 1, height: 3, background: i < activeStage ? C.green : C.border, transition: 'background 0.3s', marginBottom: 24 }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Active Stage Detail */}
        <div style={{ background: C.navyL, borderRadius: 10, padding: 20, border: `1px solid ${C.gold}33` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 28 }}>{STAGES[activeStage].icon}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.goldL, marginTop: 6 }}>{STAGES[activeStage].label}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4, maxWidth: 500 }}>{STAGES[activeStage].desc}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={activeStage === 0} onClick={() => setActiveStage(p => p - 1)} style={{ padding: '8px 16px', background: C.blue, color: C.white, borderRadius: 7, fontWeight: 600, border: 'none', opacity: activeStage === 0 ? 0.4 : 1, cursor: activeStage === 0 ? 'not-allowed' : 'pointer' }}>← Prev</button>
              <button disabled={activeStage === STAGES.length - 1} onClick={() => setActiveStage(p => p + 1)} style={{ padding: '8px 16px', background: C.gold, color: C.navy, borderRadius: 7, fontWeight: 700, border: 'none', opacity: activeStage === STAGES.length - 1 ? 0.4 : 1, cursor: activeStage === STAGES.length - 1 ? 'not-allowed' : 'pointer' }}>Next Stage →</button>
            </div>
          </div>

          {/* Notes for this stage */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, fontWeight: 600 }}>📝 Stage Notes</div>
            {(notes[activeStage] || []).map((n, i) => (
              <div key={i} style={{ background: C.navy, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: C.white }}>{n.text}</span>
                <span style={{ color: C.muted, fontSize: 11, marginLeft: 8 }}>{new Date(n.ts).toLocaleTimeString('en-PH')}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote()} placeholder="Add a note for this stage..." style={{ flex: 1, background: C.navy, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.white, fontSize: 13, outline: 'none' }} />
              <button onClick={addNote} style={{ padding: '8px 14px', background: C.blue, color: C.white, borderRadius: 6, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Add</button>
            </div>
          </div>
        </div>

        {/* Progress summary */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 8, background: C.navyL, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(activeStage / (STAGES.length - 1)) * 100}%`, background: `linear-gradient(90deg, ${C.blue}, ${C.gold})`, borderRadius: 4, transition: 'width 0.4s' }} />
          </div>
          <span style={{ fontSize: 13, color: C.goldL, fontWeight: 700, whiteSpace: 'nowrap' }}>
            Stage {activeStage + 1} / {STAGES.length}
          </span>
        </div>
      </div>

      {/* All stages list */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.goldL, marginBottom: 14 }}>📋 All Clearance Stages</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {STAGES.map((s, i) => (
            <div key={s.id} onClick={() => setActiveStage(i)} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
              background: i === activeStage ? `${C.gold}18` : 'transparent',
              border: `1px solid ${i === activeStage ? C.gold + '44' : 'transparent'}`,
              transition: 'all 0.2s',
            }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>
                {i < activeStage ? '✅' : i === activeStage ? '🔄' : '⬜'}
              </span>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: i === activeStage ? 700 : 400, color: i === activeStage ? C.goldL : i < activeStage ? C.green : C.white }}>{s.label}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{s.desc}</div>
              </div>
              {(notes[i] || []).length > 0 && (
                <span style={{ marginLeft: 'auto', background: `${C.blue}33`, color: C.blue, borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{notes[i].length} note{notes[i].length > 1 ? 's' : ''}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legal ref */}
      <div style={{ background: `${C.gold}0d`, border: `1px solid ${C.gold}22`, borderRadius: 8, padding: '12px 16px', fontSize: 12, color: C.muted }}>
        <strong style={{ color: C.goldL }}>⚖️ Reference: </strong>
        BOC Customs Memorandum Order (CMO) on Selectivity System · CMTA Sec. 412–423 Import Entry & Release ·
        eSakay Electronic Lodgement System · Sec. 800 CMTA on Examination of Goods.
      </div>
    </div>
  );
}
