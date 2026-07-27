// ============================================================
// MOBILE.JS — App Móvil · Sistema de Seguimiento Inversión Municipal
// ============================================================
const { useState, useMemo, useEffect, useRef } = React;
const {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} = Recharts;

// ── Helpers ───────────────────────────────────────────────────
function fCOP(v) {
  if (!v || v === 0) return '$0';
  const n = Math.abs(v);
  if (n >= 1e12) return `$${(v/1e12).toFixed(1)} B`;     // billón real (10¹²)
  if (n >= 1e9)  return `$${(v/1e9).toFixed(1)} mmM`;    // miles de millones (10⁹)
  if (n >= 1e6)  return `$${(v/1e6).toFixed(0)} M`;      // millones
  if (n >= 1e3)  return `$${(v/1e3).toFixed(0)} K`;      // miles
  return `$${v.toLocaleString('es-CO')}`;
}
function fBPIN(b) {
  return b ? String(b).replace(/\D/g, '') : '';
}
function pct(p, a) { return a > 0 ? Math.round((p / a) * 100) : 0; }
function pctColor(v) { return v >= 80 ? '#059669' : v >= 50 ? '#d97706' : '#ef4444'; }

// ── Base UI ───────────────────────────────────────────────────
const CARD = {
  background: '#fff', borderRadius: 14,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
  border: '1px solid #e5e7eb', marginBottom: 10, overflow: 'hidden',
};

function Bar2({ value, color = '#2563eb', height = 6 }) {
  return (
    <div style={{ background: '#f0f0f0', borderRadius: 4, height, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(Math.max(value || 0, 0), 100)}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .4s' }} />
    </div>
  );
}

function KPI({ icon, label, value, sub, color = '#2563eb' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '13px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <span style={{ background: color + '18', color, borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{icon}</span>
        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, lineHeight: 1.3 }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SBadge({ sector }) {
  const s = SECTORES[sector] || {};
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}><span>{s.icon}</span><span style={{ color: s.color, fontWeight: 700 }}>{s.label}</span></span>;
}

function EBadge({ estado }) {
  const e = ESTADOS[estado] || {};
  return <span style={{ background: e.bg || '#f3f4f6', color: e.text || '#374151', border: `1px solid ${e.color || '#d1d5db'}`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{e.label || estado}</span>;
}

function SearchBar({ value, onChange, placeholder = 'Buscar...' }) {
  return (
    <div style={{ position: 'relative', marginBottom: 12 }}>
      <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none' }}>🔍</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, border: '1px solid #d1d5db', borderRadius: 10, fontSize: 14, outline: 'none', background: '#f9fafb', boxSizing: 'border-box' }} />
    </div>
  );
}

function PageHeader({ title, sub, gradient = 'linear-gradient(135deg,#1e40af 0%,#2563eb 100%)' }) {
  return (
    <div style={{ background: gradient, padding: '18px 16px 16px', color: '#fff', flexShrink: 0 }}>
      <div style={{ fontSize: 20, fontWeight: 800 }}>{title}</div>
      {sub && <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────
function DashboardView({ vigencia }) {
  const proyVig = useMemo(() => PROYECTOS.filter(p => p.ejecucion.some(e => e.vigencia === vigencia)), [vigencia]);

  const { totalAp, totalPg, totalRp } = useMemo(() => ({
    totalAp: proyVig.reduce((a, p) => { const e = p.ejecucion.find(e => e.vigencia === vigencia); return a + (e?.apropiacion || 0); }, 0),
    totalPg: proyVig.reduce((a, p) => { const e = p.ejecucion.find(e => e.vigencia === vigencia); return a + (e?.pagos || 0); }, 0),
    totalRp: proyVig.reduce((a, p) => { const e = p.ejecucion.find(e => e.vigencia === vigencia); return a + (e?.rp || 0); }, 0),
  }), [proyVig, vigencia]);

  const pctEjec = pct(totalPg, totalAp);
  const avgFis  = proyVig.length ? Math.round(proyVig.reduce((a, p) => a + p.avanceFisico, 0) / proyVig.length) : 0;
  const conContrato = PROYECTOS.filter(p => p.contrato).length;

  const sectorChart = useMemo(() => Object.entries(SECTORES).map(([k, v]) => {
    const ps = proyVig.filter(p => p.sector === k);
    if (!ps.length) return null;
    const ap = ps.reduce((a, p) => { const e = p.ejecucion.find(e => e.vigencia === vigencia); return a + (e?.apropiacion || 0); }, 0);
    const pg = ps.reduce((a, p) => { const e = p.ejecucion.find(e => e.vigencia === vigencia); return a + (e?.pagos || 0); }, 0);
    return { name: v.label.slice(0, 11), ejec: pct(pg, ap), color: v.color };
  }).filter(Boolean).sort((a, b) => b.ejec - a.ejec), [proyVig, vigencia]);

  return (
    <div className="fade-up">
      {/* Hero banner */}
      <div style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%)', padding: '20px 16px 20px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <img src="img/escudo.png" style={{ height: 36, filter: 'brightness(0) invert(1)', opacity: 0.9 }} onError={e => e.target.style.display='none'} alt="" />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Frontino, Antioquia</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Plan de Desarrollo 2024–2027</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Ejecución Presup.', value: `${pctEjec}%`, bar: pctEjec, color: pctColor(pctEjec) },
            { label: 'Avance Físico Prom.', value: `${avgFis}%`, bar: avgFis, color: '#10b981' },
          ].map((m, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.13)', borderRadius: 12, padding: '12px 13px' }}>
              <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{m.value}</div>
              <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 4, height: 5, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ width: `${m.bar}%`, height: '100%', background: m.color, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 14px 0' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 14 }}>
          <KPI icon="📁" label="Proyectos activos"  value={proyVig.length}      sub={`Vigencia ${vigencia}`} color="#2563eb" />
          <KPI icon="📄" label="Con contrato"        value={conContrato}          sub="BPIN registrados"       color="#7c3aed" />
          <KPI icon="💰" label="Apropiación total"   value={fCOP(totalAp)}        sub="Presupuesto asignado"   color="#059669" />
          <KPI icon="💵" label="Pagos ejecutados"    value={fCOP(totalPg)}        sub={`${pctEjec}% del total`} color="#f59e0b" />
        </div>

        {/* Gráfica ejecución por sector */}
        <div style={CARD}>
          <div style={{ padding: '13px 14px 4px' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Ejecución por Sector {vigencia}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>% Pagos / Apropiación</div>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={sectorChart} layout="vertical" margin={{ left: 4, right: 22, top: 4, bottom: 4 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={68} />
              <Tooltip formatter={v => [`${v}%`, 'Ejecución']} />
              <Bar dataKey="ejec" radius={[0, 4, 4, 0]} barSize={13}>
                {sectorChart.map((d, i) => <Recharts.Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PDM cumplimiento */}
        <div style={{ ...CARD, padding: '13px 14px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🎯 Cumplimiento PDM</div>
          {PDM.indicadoresRadar.map((r, i) => (
            <div key={i} style={{ marginBottom: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: '#374151' }}>{r.eje}</span>
                <span style={{ fontWeight: 800, color: '#2563eb' }}>{r.logrado}%</span>
              </div>
              <Bar2 value={r.logrado} color="#2563eb" height={7} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── PROYECTOS ─────────────────────────────────────────────────
function ProyectosView({ vigencia, onDetail }) {
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');

  const base = useMemo(() => PROYECTOS.filter(p => p.ejecucion.some(e => e.vigencia === vigencia)), [vigencia]);

  const sectores = useMemo(() => {
    const s = new Set(base.map(p => p.sector));
    return Array.from(s).filter(k => SECTORES[k]);
  }, [base]);

  const filtered = useMemo(() => {
    let arr = base;
    if (sector) arr = arr.filter(p => p.sector === sector);
    if (search) { const q = search.toLowerCase(); arr = arr.filter(p => p.nombre.toLowerCase().includes(q) || String(p.bpin).includes(q)); }
    return arr;
  }, [base, sector, search]);

  return (
    <div className="fade-up">
      <PageHeader title="📁 Proyectos" sub={`${filtered.length} proyectos · Vigencia ${vigencia}`} />
      <div style={{ padding: '13px 14px 0' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar proyecto o BPIN..." />

        {/* Chips de sector */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 11 }}>
          {[['', 'Todos', '#6b7280'], ...sectores.map(k => [k, SECTORES[k].label, SECTORES[k].color])].map(([k, lbl, col]) => (
            <button key={k} onClick={() => setSector(k)}
              style={{ flexShrink: 0, padding: '5px 13px', borderRadius: 20, border: `1.5px solid ${sector === k ? col : '#d1d5db'}`, background: sector === k ? col + '18' : '#fff', color: sector === k ? col : '#6b7280', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
              {k && SECTORES[k]?.icon} {lbl}
            </button>
          ))}
        </div>

        {filtered.map(p => {
          const ejec = p.ejecucion.find(e => e.vigencia === vigencia);
          const ep = pct(ejec?.pagos, ejec?.apropiacion);
          return (
            <div key={p.bpin} onClick={() => onDetail(p)} style={{ ...CARD, padding: '13px', cursor: 'pointer' }}
              onTouchStart={e => e.currentTarget.style.background = '#f9fafb'}
              onTouchEnd={e => e.currentTarget.style.background = '#fff'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <SBadge sector={p.sector} />
                <EBadge estado={p.estado} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.4, marginBottom: 4 }}>
                {p.nombre.slice(0, 75)}{p.nombre.length > 75 ? '…' : ''}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 9 }}>BPIN {fBPIN(p.bpin)}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 3 }}>Avance Físico</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ flex: 1 }}><Bar2 value={p.avanceFisico} color="#10b981" height={5} /></div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', minWidth: 28 }}>{p.avanceFisico}%</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 3 }}>Ejec. Presup.</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ flex: 1 }}><Bar2 value={ep} color={pctColor(ep)} height={5} /></div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: pctColor(ep), minWidth: 28 }}>{ep}%</span>
                  </div>
                </div>
              </div>
              {ejec && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 7 }}>Apropiación: <strong>{fCOP(ejec.apropiacion)}</strong></div>}
            </div>
          );
        })}
        <div style={{ height: 10 }} />
      </div>
    </div>
  );
}

// ── DETALLE PROYECTO ──────────────────────────────────────────
function ProyectoDetalle({ proyecto, vigencia, onBack }) {
  const ejec = proyecto.ejecucion.find(e => e.vigencia === vigencia);
  const ep   = pct(ejec?.pagos, ejec?.apropiacion);

  return (
    <div className="fade-up">
      <div style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%)', padding: '14px 16px', color: '#fff' }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 8, padding: '6px 14px', color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>← Volver</button>
        <SBadge sector={proyecto.sector} />
        <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3, marginTop: 6 }}>{proyecto.nombre}</div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 3 }}>BPIN {fBPIN(proyecto.bpin)}</div>
      </div>

      <div style={{ padding: '13px 14px 80px' }}>
        {/* Ejecución presupuestal */}
        <div style={{ ...CARD, padding: '13px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 11 }}>💰 Ejecución {vigencia}</div>
          {ejec ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'Apropiación', val: ejec.apropiacion, color: '#059669', bg: '#f0fdf4' },
                  { label: 'Pagos',       val: ejec.pagos,       color: '#2563eb', bg: '#eff6ff' },
                  { label: 'CDP',         val: ejec.cdp,         color: '#d97706', bg: '#fef3c7' },
                  { label: 'RP',          val: ejec.rp,          color: '#7c3aed', bg: '#f5f3ff' },
                ].map((m, i) => (
                  <div key={i} style={{ background: m.bg, borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 3 }}>{m.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: m.color }}>{fCOP(m.val)}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span>Ejecución presupuestal</span><strong style={{ color: pctColor(ep) }}>{ep}%</strong>
              </div>
              <Bar2 value={ep} color={pctColor(ep)} height={8} />
            </>
          ) : <div style={{ color: '#9ca3af', fontSize: 13 }}>Sin datos para vigencia {vigencia}</div>}
        </div>

        {/* Avance */}
        <div style={{ ...CARD, padding: '13px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 11 }}>📊 Avance del Proyecto</div>
          {[
            { icon: '🏗️', label: 'Avance Físico',     val: proyecto.avanceFisico,     color: '#10b981' },
            { icon: '💰', label: 'Avance Financiero',  val: proyecto.avanceFinanciero, color: '#3b82f6' },
          ].map((m, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>{m.icon} {m.label}</span>
                <strong style={{ color: m.color }}>{m.val}%</strong>
              </div>
              <Bar2 value={m.val} color={m.color} height={8} />
            </div>
          ))}
        </div>

        {/* Contrato */}
        {proyecto.contrato && (
          <div style={{ ...CARD, padding: '13px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📄 Contrato</div>
            <div style={{ fontSize: 13, marginBottom: 5 }}><strong>No.:</strong> {proyecto.contrato.numero}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 5 }}><strong>Tipo:</strong> {proyecto.contrato.tipo}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}><strong>Contratista:</strong> {proyecto.contrato.contratista}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Valor contrato</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#059669' }}>{fCOP(proyecto.contrato.valor)}</span>
            </div>
            {proyecto.contrato.secopLink && (
              <a href={proyecto.contrato.secopLink} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', textAlign: 'center', padding: '10px', background: '#eff6ff', borderRadius: 9, color: '#2563eb', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                🔗 Ver en SECOP II
              </a>
            )}
          </div>
        )}

        {/* Info general */}
        <div style={{ ...CARD, padding: '13px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 9 }}>ℹ️ Información General</div>
          <div style={{ fontSize: 12, color: '#374151', lineHeight: 2 }}>
            <div><b>Responsable:</b> {proyecto.responsable}</div>
            <div><b>Período:</b> {proyecto.fechaInicio} → {proyecto.fechaFin}</div>
            <div><b>Población:</b> {proyecto.poblacionBeneficiada?.toLocaleString()} personas</div>
            <div><b>Tipo población:</b> {proyecto.tipoPoblacion}</div>
            {proyecto.indicadorDNP && <div><b>Indicador DNP:</b> {proyecto.indicadorDNP}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CONTRATOS ─────────────────────────────────────────────────
function ContratosView({ vigencia }) {
  const [search, setSearch] = useState('');

  // Un BPIN puede tener varios contratos → aplanamos el array
  const all = useMemo(() => {
    const rows = [];
    PROYECTOS.forEach(p => {
      const contratos = (p.contratos && p.contratos.length > 0)
        ? p.contratos
        : (p.contrato ? [p.contrato] : []);
      const ejec = p.ejecucion.find(e => e.vigencia === vigencia);
      const ep   = pct(ejec?.pagos, ejec?.apropiacion);
      contratos.forEach(c => rows.push({ ...c, bpin: p.bpin, proyecto: p, ep }));
    });
    return rows;
  }, [vigencia]);

  const filtered = useMemo(() => {
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(c =>
      (c.numero||'').toLowerCase().includes(q) ||
      (c.contratista||'').toLowerCase().includes(q) ||
      (c.proyecto.nombre||'').toLowerCase().includes(q)
    );
  }, [all, search]);

  const totalVal = filtered.reduce((a, c) => a + (c.valor||0), 0);
  // La ejecución vive a nivel BPIN → deduplicamos antes de promediar
  const uniqueBPIN = [...new Map(filtered.map(c => [c.bpin, c])).values()];
  const avgEp = uniqueBPIN.length
    ? Math.round(uniqueBPIN.reduce((a, c) => a + c.ep, 0) / uniqueBPIN.length)
    : 0;

  return (
    <div className="fade-up">
      <PageHeader title="📄 Contratos" sub={`${filtered.length} contratos · ${fCOP(totalVal)} · Ejec. prom. ${avgEp}%`} />
      <div style={{ padding: '13px 14px 0' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar contrato o contratista..." />

        {filtered.map((c, i) => {
          const pc = pctColor(c.ep);
          return (
            <div key={i} style={{ ...CARD, padding: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                <code style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 7px', borderRadius: 4, color: '#6b7280' }}>{c.numero}</code>
                <SBadge sector={c.proyecto.sector} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.4, marginBottom: 4 }}>
                {c.proyecto.nombre.slice(0, 70)}{c.proyecto.nombre.length > 70 ? '…' : ''}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{c.contratista}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#059669' }}>{fCOP(c.valor)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: pc, background: pc + '15', padding: '3px 10px', borderRadius: 20 }}>
                  Ejec. {c.ep}%
                </span>
              </div>
              <Bar2 value={c.ep} color={pc} height={5} />
              {c.secopLink && (
                <a href={c.secopLink} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', marginTop: 9, textAlign: 'center', padding: '8px', background: '#f0f9ff', borderRadius: 8, color: '#0369a1', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                  🔗 Ver SECOP II
                </a>
              )}
            </div>
          );
        })}
        <div style={{ height: 10 }} />
      </div>
    </div>
  );
}

// ── PDM ───────────────────────────────────────────────────────
function PDMView({ vigencia }) {
  const [open, setOpen] = useState(null);

  // Mismos datos que el Dashboard: PDM.indicadoresRadar (logrado vs meta)
  // + totales presupuestales por eje desde proyectos (para contexto)
  const lineasAvance = useMemo(() => PDM.ejes.map((eje, idx) => {
    const progIds = new Set(eje.programas.map(p => p.id));
    const proys_vig = PROYECTOS.filter(p => progIds.has(p.programaPDM) && p.ejecucion.some(e => e.vigencia === vigencia));
    const ap = proys_vig.reduce((a, p) => { const e = p.ejecucion.find(e => e.vigencia === vigencia); return a + (e?.apropiacion || 0); }, 0);
    const pg = proys_vig.reduce((a, p) => { const e = p.ejecucion.find(e => e.vigencia === vigencia); return a + (e?.pagos || 0); }, 0);
    // indicador del radar para este eje (por posición)
    const radar = PDM.indicadoresRadar[idx] || null;
    const logrado = radar ? radar.logrado : 0;
    const meta    = radar ? radar.meta    : 100;
    const shortName = eje.nombre
      .replace(/^FRONTINO NOS UNE CON\s+/i, '')
      .replace(/[.,]\s*$/, '')
      .trim();
    return { nombre: shortName, logrado, meta, ap, pg, cnt: proys_vig.length };
  }), [vigencia]);

  return (
    <div className="fade-up">
      <PageHeader title="🎯 Plan de Desarrollo" sub={`${PDM.nombre} · Vigencia ${vigencia}`} />
      <div style={{ padding: '13px 14px 0' }}>

        {/* ── Cumplimiento por Línea Estratégica (igual que Dashboard) ── */}
        <div style={{ ...CARD, padding: '14px' }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Cumplimiento por Dimensión</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 14, marginTop: 2 }}>
            Avance logrado vs meta cuatrienio · {PDM.periodo}
          </div>

          {lineasAvance.map((l, i) => {
            const pctLogrado = Math.min(l.logrado, 100);
            const pctMeta    = Math.min(l.meta, 100);
            const fc = pctColor(pctLogrado);
            return (
              <div key={i} style={{
                marginBottom: 16, paddingBottom: 16,
                borderBottom: i < lineasAvance.length - 1 ? '1px solid #f3f4f6' : 'none',
              }}>
                {/* Nombre + logrado */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1, marginRight: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', lineHeight: 1.35 }}>{l.nombre}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                      {l.cnt} proyectos · {fCOP(l.ap)} apropiados
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: fc, lineHeight: 1 }}>{pctLogrado}%</div>
                    <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 1 }}>de {pctMeta}% meta</div>
                  </div>
                </div>

                {/* Barra logrado sobre meta */}
                <div style={{ position: 'relative', background: '#f0f0f0', borderRadius: 5, height: 10, overflow: 'hidden' }}>
                  {/* Meta como zona de referencia */}
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pctMeta}%`, background: '#10b98120', borderRadius: 5 }} />
                  {/* Logrado */}
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pctLogrado}%`, background: fc, borderRadius: 5, transition: 'width .4s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#9ca3af', marginTop: 3 }}>
                  <span style={{ color: fc, fontWeight: 700 }}>Logrado: {pctLogrado}%</span>
                  <span>Meta cuatrienio: {pctMeta}%</span>
                </div>

                {/* Ejecución presupuestal de apoyo */}
                {l.ap > 0 && (() => {
                  const ep = pct(l.pg, l.ap);
                  return (
                    <div style={{ marginTop: 7, background: '#f8fafc', borderRadius: 8, padding: '7px 10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6b7280', marginBottom: 4 }}>
                        <span>💰 Ejecución presupuestal {vigencia}</span>
                        <span style={{ fontWeight: 700, color: pctColor(ep) }}>{ep}%</span>
                      </div>
                      <Bar2 value={ep} color={pctColor(ep)} height={5} />
                    </div>
                  );
                })()}
              </div>
            );
          })}

          {/* Promedio general */}
          {PDM.indicadoresRadar.length > 0 && (() => {
            const avgLogrado = Math.round(PDM.indicadoresRadar.reduce((a, r) => a + r.logrado, 0) / PDM.indicadoresRadar.length);
            const totAp = lineasAvance.reduce((a, l) => a + l.ap, 0);
            const totPg = lineasAvance.reduce((a, l) => a + l.pg, 0);
            const totEp = pct(totPg, totAp);
            return (
              <div style={{ background: '#eff6ff', borderRadius: 10, padding: '10px 12px', marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', marginBottom: 8 }}>📊 Resumen PDM {PDM.periodo}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                  {[
                    { label: 'Avance Prom.', val: `${avgLogrado}%`, color: pctColor(avgLogrado) },
                    { label: 'Ejec. Presup.', val: `${totEp}%`,     color: pctColor(totEp) },
                    { label: 'Apropiación',  val: fCOP(totAp),       color: '#059669' },
                  ].map((m, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: m.color }}>{m.val}</div>
                      <div style={{ fontSize: 9, color: '#6b7280', marginTop: 1 }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Ejes colapsables */}
        {PDM.ejes.map((eje, i) => {
          const progIds = new Set(eje.programas.map(p => p.id));
          const proyEje = PROYECTOS.filter(p => progIds.has(p.programaPDM) && p.ejecucion.some(e => e.vigencia === vigencia));
          const ap = proyEje.reduce((a, p) => { const e = p.ejecucion.find(e => e.vigencia === vigencia); return a + (e?.apropiacion || 0); }, 0);
          const pg = proyEje.reduce((a, p) => { const e = p.ejecucion.find(e => e.vigencia === vigencia); return a + (e?.pagos || 0); }, 0);
          const ep = pct(pg, ap);
          const isOpen = open === i;

          return (
            <div key={i} style={CARD}>
              <div onClick={() => setOpen(isOpen ? null : i)}
                style={{ padding: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, marginRight: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>{eje.nombre}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{proyEje.length} proyectos · {fCOP(ap)}</div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1 }}><Bar2 value={ep} color={pctColor(ep)} height={6} /></div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: pctColor(ep), minWidth: 32 }}>{ep}%</span>
                  </div>
                </div>
                <span style={{ color: '#9ca3af', fontSize: 16, marginTop: 2 }}>{isOpen ? '▲' : '▼'}</span>
              </div>

              {isOpen && (
                <div style={{ borderTop: '1px solid #f3f4f6' }}>
                  {/* Programas únicos de este eje */}
                  {Array.from(new Map(eje.programas.map(p => [p.id, p])).values()).map((prog, j) => {
                    const pps = PROYECTOS.filter(p => p.programaPDM === prog.id && p.ejecucion.some(e => e.vigencia === vigencia));
                    const pap = pps.reduce((a, p) => { const e = p.ejecucion.find(e => e.vigencia === vigencia); return a + (e?.apropiacion || 0); }, 0);
                    const ppg = pps.reduce((a, p) => { const e = p.ejecucion.find(e => e.vigencia === vigencia); return a + (e?.pagos || 0); }, 0);
                    const pep = pct(ppg, pap);
                    return (
                      <div key={j} style={{ padding: '10px 13px', borderBottom: '1px solid #f9fafb' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', lineHeight: 1.3, marginBottom: 3 }}>
                          {prog.nombre.replace(/\s*\(\d+\)\s*$/, '').slice(0, 70)}…
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>
                          <span>{pps.length} proyectos · {fCOP(prog.presupuesto)}</span>
                          <strong style={{ color: pctColor(pep) }}>{pep}%</strong>
                        </div>
                        <Bar2 value={pep} color={pctColor(pep)} height={5} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        <div style={{ height: 10 }} />
      </div>
    </div>
  );
}

// ── PRESUPUESTO ───────────────────────────────────────────────
function PresupuestoView({ vigencia }) {
  const proyVig = useMemo(() => PROYECTOS.filter(p => p.ejecucion.some(e => e.vigencia === vigencia)), [vigencia]);

  const sectData = useMemo(() => Object.entries(SECTORES).map(([k, v]) => {
    const ps = proyVig.filter(p => p.sector === k);
    if (!ps.length) return null;
    const ap = ps.reduce((a, p) => { const e = p.ejecucion.find(e => e.vigencia === vigencia); return a + (e?.apropiacion || 0); }, 0);
    const rp = ps.reduce((a, p) => { const e = p.ejecucion.find(e => e.vigencia === vigencia); return a + (e?.rp || 0); }, 0);
    const pg = ps.reduce((a, p) => { const e = p.ejecucion.find(e => e.vigencia === vigencia); return a + (e?.pagos || 0); }, 0);
    return { icon: v.icon, label: v.label, ap, rp, pg, ep: pct(pg, ap), color: v.color, cnt: ps.length };
  }).filter(Boolean).sort((a, b) => b.ap - a.ap), [proyVig, vigencia]);

  const totAp = sectData.reduce((a, s) => a + s.ap, 0);
  const totPg = sectData.reduce((a, s) => a + s.pg, 0);
  const totRp = sectData.reduce((a, s) => a + s.rp, 0);
  const totEp = pct(totPg, totAp);

  // Pie chart data
  const pieData = sectData.slice(0, 6).map(s => ({ name: s.label.slice(0, 10), value: s.ap, color: s.color }));

  return (
    <div className="fade-up">
      <div style={{ background: 'linear-gradient(135deg,#065f46 0%,#059669 100%)', padding: '18px 16px 20px', color: '#fff' }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>💰 Presupuesto</div>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 14 }}>Ejecución presupuestal {vigencia}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
          {[['Apropiación', totAp], ['Comprometido', totRp], ['Pagado', totPg]].map(([lbl, val], i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.14)', borderRadius: 10, padding: '9px 10px' }}>
              <div style={{ fontSize: 9, opacity: 0.85 }}>{lbl}</div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{fCOP(val)}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.14)', borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12 }}>Ejecución total</span>
          <span style={{ fontSize: 22, fontWeight: 800 }}>{totEp}%</span>
        </div>
      </div>

      <div style={{ padding: '13px 14px 0' }}>
        {/* Mini pie chart */}
        <div style={{ ...CARD, padding: '13px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Distribución Apropiación</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={65} innerRadius={30} paddingAngle={2}>
                {pieData.map((d, i) => <Recharts.Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={v => [fCOP(v), 'Apropiación']} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {pieData.map((d, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, display: 'inline-block' }} />
                {d.name}
              </span>
            ))}
          </div>
        </div>

        {/* Tabla por sector */}
        {sectData.map((s, i) => (
          <div key={i} style={{ ...CARD, padding: '12px 13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>{s.cnt} proyectos</div>
                </div>
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: pctColor(s.ep), background: pctColor(s.ep) + '15', padding: '4px 11px', borderRadius: 20 }}>{s.ep}%</span>
            </div>
            <Bar2 value={s.ep} color={s.color} height={7} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 11, color: '#9ca3af' }}>
              <span>Ap: <b style={{ color: '#374151' }}>{fCOP(s.ap)}</b></span>
              <span>Pag: <b style={{ color: '#059669' }}>{fCOP(s.pg)}</b></span>
            </div>
          </div>
        ))}
        <div style={{ height: 10 }} />
      </div>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard',   icon: '📊', label: 'Inicio'      },
  { id: 'proyectos',   icon: '📁', label: 'Proyectos'   },
  { id: 'contratos',   icon: '📄', label: 'Contratos'   },
  { id: 'pdm',         icon: '🎯', label: 'PDM'         },
  { id: 'presupuesto', icon: '💰', label: 'Presupuesto' },
];

function MobileApp() {
  const [tab,      setTab]      = useState('dashboard');
  const [vigencia, setVigencia] = useState(2026);
  const [detalle,  setDetalle]  = useState(null);

  const scrollRef = useRef(null);

  const goTab = t => { setTab(t); setDetalle(null); if (scrollRef.current) scrollRef.current.scrollTop = 0; };
  const goDetail = p => { setDetalle(p); if (scrollRef.current) scrollRef.current.scrollTop = 0; };
  const goBack   = () => { setDetalle(null); if (scrollRef.current) scrollRef.current.scrollTop = 0; };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', fontFamily: "'Inter',system-ui,sans-serif" }}>

      {/* Top bar */}
      <div style={{ flexShrink: 0, background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '7px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="img/escudo.png" style={{ height: 26 }} onError={e => e.target.style.display='none'} alt="" />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#1e40af' }}>Frontino</span>
        </div>
        <select value={vigencia} onChange={e => setVigencia(parseInt(e.target.value))}
          style={{ border: '1.5px solid #2563eb', borderRadius: 8, padding: '5px 10px', fontSize: 13, fontWeight: 700, color: '#2563eb', background: '#eff6ff', outline: 'none' }}>
          {[2024, 2025, 2026, 2027].map(v => <option key={v} value={v}>Vigencia {v}</option>)}
        </select>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', background: '#f8fafc', WebkitOverflowScrolling: 'touch' }}>
        {detalle && tab === 'proyectos' ? (
          <ProyectoDetalle proyecto={detalle} vigencia={vigencia} onBack={goBack} />
        ) : tab === 'dashboard' ? (
          <DashboardView vigencia={vigencia} />
        ) : tab === 'proyectos' ? (
          <ProyectosView vigencia={vigencia} onDetail={goDetail} />
        ) : tab === 'contratos' ? (
          <ContratosView vigencia={vigencia} />
        ) : tab === 'pdm' ? (
          <PDMView vigencia={vigencia} />
        ) : (
          <PresupuestoView vigencia={vigencia} />
        )}
      </div>

      {/* Bottom navigation */}
      <nav style={{
        flexShrink: 0, background: '#fff', borderTop: '1px solid #e5e7eb',
        display: 'grid', gridTemplateColumns: 'repeat(5,1fr)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 50,
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => goTab(t.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '8px 2px', border: 'none', background: 'transparent', cursor: 'pointer',
              color: tab === t.id ? '#2563eb' : '#9ca3af',
              borderTop: `2.5px solid ${tab === t.id ? '#2563eb' : 'transparent'}`,
              minHeight: 54, transition: 'color .15s',
            }}>
            <span style={{ fontSize: 21 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: tab === t.id ? 700 : 400, marginTop: 2 }}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<MobileApp />);
