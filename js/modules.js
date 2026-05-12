// ============================================================
// MÓDULOS ADICIONALES
// ============================================================

// ============================================================
// CONTRATOS PAGE
// ============================================================
function ContratosPage({ onSelectProyecto }) {
  const vigencia    = React.useContext(VigenciaContext);
  const [search,              setSearch]              = useState('');
  const [filtroBPIN,          setFiltroBPIN]          = useState('');
  const [filtroSec,           setFiltroSec]           = useState('');
  const [filtroEstadoCont,    setFiltroEstadoCont]    = useState('');
  const [sortBy,              setSortBy]              = useState('valor');

  // Build PDM program lookup: id → short name (strip trailing "(XXXX)")
  const pdmProgs = useMemo(() => {
    const m = {};
    PDM.ejes.forEach(eje => eje.programas.forEach(p => {
      if (!m[p.id]) m[p.id] = p.nombre.replace(/\s*\(\d+\)\s*$/, '').trim();
    }));
    return m;
  }, []);

  const todos = useMemo(() => {
    const rows = [];
    PROYECTOS.forEach(p => {
      // Usar array completo de contratos; retroceder a contrato único si no existe
      const lista = (p.contratos && p.contratos.length > 0)
        ? p.contratos
        : (p.contrato ? [p.contrato] : []);
      if (!lista.length) return;

      const ejec    = p.ejecucion.find(e => e.vigencia === vigencia);
      const ejecPct = ejec && ejec.apropiacion > 0
        ? Math.round((ejec.pagos / ejec.apropiacion) * 100)
        : null;

      lista.forEach(c => {
        rows.push({
          ...c,
          proyectoId:       p.id,
          proyectoNombre:   p.nombre,
          sector:           p.sector,
          estadoProyecto:   p.estado,
          bpin:             p.bpin,
          avanceFisico:     p.avanceFisico,
          avanceFinanciero: p.avanceFinanciero,
          ejecPct,
          programaPDM:      p.programaPDM,
          programaNombre:   pdmProgs[p.programaPDM] || p.programaPDM || '—',
          _ref:             p,
        });
      });
    });
    return rows;
  }, [vigencia, pdmProgs]);

  const filtered = useMemo(() => {
    let arr = todos;
    if (filtroSec)  arr = arr.filter(c => c.sector === filtroSec);
    if (filtroBPIN) arr = arr.filter(c => String(c.bpin).includes(filtroBPIN.replace(/-/g, '')));
    if (filtroEstadoCont) arr = arr.filter(c => (c.estado||'').toUpperCase() === filtroEstadoCont);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(c =>
        (c.numero||'').toLowerCase().includes(q) ||
        (c.contratista||'').toLowerCase().includes(q) ||
        (c.proyectoNombre||'').toLowerCase().includes(q) ||
        (c.objeto||'').toLowerCase().includes(q)
      );
    }
    return [...arr].sort((a, b) =>
      sortBy === 'valor'   ? b.valor - a.valor :
      sortBy === 'avance'  ? b.avanceFisico - a.avanceFisico :
      sortBy === 'ejecucion' ? (b.ejecPct||0) - (a.ejecPct||0) :
      a.numero.localeCompare(b.numero)
    );
  }, [todos, filtroSec, filtroEstadoCont, search, sortBy]);

  const totalValor   = filtered.reduce((a, c) => a + c.valor, 0);

  // La ejecución (avanceFisico, ejecPct) vive a nivel BPIN — no por contrato.
  // Deduplicamos por BPIN antes de promediar para que un BPIN con N contratos
  // no pese N veces en el promedio.
  const uniqueBPIN = [...new Map(filtered.map(c => [c.bpin, c])).values()];
  const avgAvance  = uniqueBPIN.length ? Math.round(uniqueBPIN.reduce((a, c) => a + (c.avanceFisico||0), 0) / uniqueBPIN.length) : 0;
  const withEjec   = uniqueBPIN.filter(c => c.ejecPct !== null);
  const avgEjec    = withEjec.length ? Math.round(withEjec.reduce((a, c) => a + c.ejecPct, 0) / withEjec.length) : 0;
  const tiposCount = filtered.reduce((acc, c) => { const t = c.tipo || 'Sin tipo'; acc[t] = (acc[t]||0)+1; return acc; }, {});

  // Gráfica por sector
  const porSector = Object.entries(SECTORES).map(([k, v]) => {
    const cs = filtered.filter(c => c.sector === k);
    if (!cs.length) return null;
    return { sector: v.label.slice(0,12), valor: cs.reduce((a,c)=>a+c.valor,0)/1e9, count: cs.length, color: v.color };
  }).filter(Boolean);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>📄 Gestión de Contratos</h1>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
          {filtered.length} contratos · {formatCOP(totalValor)} en valor total · Vigencia {vigencia}
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, marginBottom: 20 }}>
        <KPICard icon="📄" label="Total Contratos"   value={filtered.length}       sub="Con BPIN asignado"                   color="#2563eb" />
        <KPICard icon="💵" label="Valor Total"        value={formatCOP(totalValor)} sub="Suma contratos filtrados"            color="#059669" />
        <KPICard icon="🏗️" label="Avance Físico Prom." value={`${avgAvance}%`}     sub="Avance físico promedio"              color="#7c3aed" />
        <KPICard icon="💰" label={`Ejec. Presup. ${vigencia}`} value={`${avgEjec}%`} sub="Pagos / Apropiación promedio"      color="#f59e0b" />
        <KPICard icon="✅" label="Terminados"           value={filtered.filter(c=>(c.estado||'').toUpperCase()==='TERMINADO').length} sub="Contratos terminados" color="#10b981" />
      </div>

      {/* Gráfica + Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, marginBottom: 20 }}>
        <Card title="Valor Contratado por Sector" subtitle="Miles de millones COP">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={porSector} margin={{ top: 5, right: 5, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="sector" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v.toFixed(1)} mmM`} />
              <Tooltip formatter={v => [`$${v.toFixed(2)} mmM`, 'Valor']} />
              <Bar dataKey="valor" radius={[3,3,0,0]}>
                {porSector.map((d, i) => <Recharts.Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Tipos de Contrato" style={{ minWidth: 220 }}>
          {(() => {
            const TIPO_CFG = {
              'Prestación de servicios':                    { color:'#2563eb', short:'Prest. Servicios' },
              'Régimen especial':                           { color:'#7c3aed', short:'Rég. Especial' },
              'Minima Cuantia':                             { color:'#f59e0b', short:'Mínima Cuantía' },
              'Régimen especial - Obra':                    { color:'#9333ea', short:'Rég. Esp. Obra' },
              'Suministro':                                 { color:'#0891b2', short:'Suministro' },
              'Contratos o convenios Interadministrativos': { color:'#16a34a', short:'Interadministrat.' },
              'Obra':                                       { color:'#64748b', short:'Obra' },
            };
            const total = Object.values(tiposCount).reduce((a,b)=>a+b, 0);
            const sorted = Object.entries(tiposCount).sort((a,b) => b[1]-a[1]);
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:9, paddingTop:4 }}>
                {sorted.map(([tipo, cnt]) => {
                  const cfg = TIPO_CFG[tipo] || { color:'#6b7280', short: tipo };
                  const pct = total ? Math.round((cnt/total)*100) : 0;
                  return (
                    <div key={tipo}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ width:8, height:8, borderRadius:'50%', background:cfg.color, flexShrink:0, display:'inline-block' }}/>
                          <span style={{ fontSize:11, color:'#374151', fontWeight:500 }} title={tipo}>{cfg.short}</span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <span style={{ fontSize:10, color:'#9ca3af' }}>{pct}%</span>
                          <span style={{ fontWeight:700, fontSize:13, color:cfg.color }}>{cnt}</span>
                        </div>
                      </div>
                      <div style={{ height:4, background:'#f3f4f6', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ width:`${pct}%`, height:'100%', background:cfg.color, borderRadius:3 }}/>
                      </div>
                    </div>
                  );
                })}
                <div style={{ borderTop:'1px solid #f3f4f6', paddingTop:6, display:'flex', justifyContent:'space-between', fontSize:11 }}>
                  <span style={{ color:'#6b7280' }}>Total</span>
                  <span style={{ fontWeight:700, color:'#111827' }}>{total}</span>
                </div>
              </div>
            );
          })()}
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar contrato, contratista u objeto..." />

          {/* Filtro BPIN */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position:'absolute', left:10, fontSize:13, color:'#6b7280', fontWeight:700, pointerEvents:'none' }}>BPIN</span>
            <input
              value={filtroBPIN}
              onChange={e => setFiltroBPIN(e.target.value.replace(/[^0-9-]/g, ''))}
              placeholder="Ej: 47420"
              maxLength={18}
              style={{
                paddingLeft: 52, paddingRight: filtroBPIN ? 30 : 12,
                paddingTop: 8, paddingBottom: 8,
                border: `1.5px solid ${filtroBPIN ? '#2563eb' : '#d1d5db'}`,
                borderRadius: 8, fontSize: 13, outline: 'none',
                width: 170, background: filtroBPIN ? '#eff6ff' : '#fafafa',
                fontFamily: 'monospace', color: '#1e40af', fontWeight: 600,
                transition: 'border-color .15s, background .15s',
              }}
            />
            {filtroBPIN && (
              <button onClick={() => setFiltroBPIN('')}
                style={{ position:'absolute', right:6, background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:16, lineHeight:1, padding:2 }}
                title="Limpiar filtro BPIN">✕</button>
            )}
          </div>

          <Sel value={filtroSec} onChange={setFiltroSec}
            options={[{ value:'', label:'Todos los sectores' }, ...Object.entries(SECTORES).map(([k,v])=>({ value:k, label:v.label }))]} />
          <Sel value={filtroEstadoCont} onChange={setFiltroEstadoCont}
            options={[
              { value:'',            label:'Todos los estados' },
              { value:'EN_EJECUCION', label:'⚡ En Ejecución' },
              { value:'TERMINADO',   label:'✅ Terminado' },
            ]} />
          <Sel value={sortBy} onChange={setSortBy}
            options={[{ value:'valor', label:'Ordenar: Mayor valor' }, { value:'avance', label:'Ordenar: Mayor avance físico' }, { value:'ejecucion', label:'Ordenar: Mayor ejecución presup.' }, { value:'numero', label:'Ordenar: No. contrato' }]} />

          {/* Chips de filtros activos */}
          {(filtroBPIN || filtroSec || filtroEstadoCont) && (
            <button onClick={() => { setFiltroBPIN(''); setFiltroSec(''); setFiltroEstadoCont(''); }}
              style={{ padding:'6px 12px', background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, color:'#991b1b', fontSize:12, fontWeight:700, cursor:'pointer' }}>
              🗑 Limpiar filtros
            </button>
          )}
        </div>
        <Tbl
          columns={[
            { title: 'No. Contrato', key: 'numero', render: v => <code style={{ fontSize:12, color:'#6b7280' }}>{v}</code> },
            { title: 'Proyecto / PDM', key: 'proyectoNombre', render: (v, r) => (
              <div>
                <div style={{ fontWeight:600, fontSize:13, color:'#111827' }}>{v.slice(0,45)}{v.length>45?'…':''}</div>
                <div style={{ fontSize:11, color:'#9ca3af' }}>BPIN {formatBPIN(r.bpin)}</div>
                {r.programaNombre && r.programaNombre !== '—' && (
                  <div style={{ fontSize:10, color:'#6b7280', marginTop:2, fontStyle:'italic' }}
                    title={r.programaNombre}>
                    PDM: {r.programaNombre.slice(0,50)}{r.programaNombre.length>50?'…':''}
                  </div>
                )}
              </div>
            )},
            { title: 'Sector', key: 'sector', render: v => <SectorBadge sector={v} /> },
            { title: 'Contratista', key: 'contratista', render: v => <span style={{ fontSize:12 }}>{v}</span> },
            { title: 'Valor', key: 'valor', render: v => <strong style={{ fontFamily:'monospace', fontSize:12 }}>{formatCOP(v)}</strong> },
            { title: 'Avance Físico', key: 'avanceFisico', render: v => {
              const pct = v || 0;
              const c = pct===100?'#10b981':pct>=60?'#3b82f6':pct>=30?'#f59e0b':'#ef4444';
              return (
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:64, height:7, background:'#f3f4f6', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ width:`${pct}%`, height:'100%', background:c, borderRadius:4 }} />
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:c }}>{pct}%</span>
                </div>
              );
            }},
            { title: 'Ejec. Presup.', key: 'ejecPct', render: (v, r) => {
              if (v === null) return <span style={{ fontSize:12, color:'#9ca3af' }}>—</span>;
              const c = v>=80?'#059669':v>=50?'#f59e0b':'#ef4444';
              const brecha = Math.abs((r.avanceFisico||0) - v);
              return (
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:64, height:7, background:'#f3f4f6', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ width:`${Math.min(v,100)}%`, height:'100%', background:c, borderRadius:4 }} />
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, color:c }}>{v}%</span>
                  </div>
                  {brecha > 20 && (
                    <div style={{ fontSize:10, color:'#d97706', marginTop:2 }}>⚠ Brecha {brecha}pp</div>
                  )}
                </div>
              );
            }},
            { title: 'Estado Contrato', key: 'estado', render: (v, r) => {
              const upper = (v||'').toUpperCase();
              const cfg = upper === 'TERMINADO'
                ? { bg:'#d1fae5', color:'#065f46', dot:'#10b981', label:'Terminado' }
                : upper === 'EN_EJECUCION'
                ? { bg:'#dbeafe', color:'#1e40af', dot:'#3b82f6', label:'En Ejecución' }
                : { bg:'#f3f4f6', color:'#6b7280', dot:'#9ca3af', label: v||'—' };
              return (
                <div>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:cfg.bg, color:cfg.color, padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700 }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.dot, flexShrink:0 }}/>
                    {cfg.label}
                  </span>
                  <div style={{ fontSize:10, color:'#9ca3af', marginTop:2 }}>Proy: <EstadoBadge estado={r.estadoProyecto}/></div>
                </div>
              );
            }},
            { title: '', key: '_ref', render: (r) => (
              <button onClick={() => onSelectProyecto(r)}
                style={{ padding:'5px 12px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:6, color:'#2563eb', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                Ver →
              </button>
            )},
          ]}
          data={filtered}
          onRow={r => onSelectProyecto(r._ref)}
        />
      </Card>
    </div>
  );
}

// ============================================================
// COMPARATIVO MULTI-VIGENCIA
// ============================================================
function ComparativoPage() {
  const [vigA, setVigA] = useState(2023);
  const [vigB, setVigB] = useState(2024);

  const vigOpts = [2022,2023,2024,2025].map(v => ({ value:v, label:`Vigencia ${v}` }));

  const calcVig = (vig) => {
    const proyVig = PROYECTOS.filter(p =>
      p.ejecucion.some(e => e.vigencia === vig)
    );
    const totalAp = proyVig.reduce((a,p)=>{ const e=p.ejecucion.find(e=>e.vigencia===vig); return a+(e?.apropiacion||0); },0);
    const totalPg = proyVig.reduce((a,p)=>{ const e=p.ejecucion.find(e=>e.vigencia===vig); return a+(e?.pagos||0); },0);
    const totalRp = proyVig.reduce((a,p)=>{ const e=p.ejecucion.find(e=>e.vigencia===vig); return a+(e?.rp||0); },0);
    return { vig, proyectos:proyVig.length, apropiacion:totalAp, pagos:totalPg, rp:totalRp,
      pctEjecucion: totalAp ? ((totalPg/totalAp)*100).toFixed(1) : '0' };
  };

  const dataA = calcVig(vigA);
  const dataB = calcVig(vigB);

  // Por sector comparativo
  const sectorComp = Object.entries(SECTORES).map(([k, cfg]) => {
    const pA = PROYECTOS.filter(p=>p.sector===k&&p.ejecucion.some(e=>e.vigencia===vigA)).reduce((a,p)=>{const e=p.ejecucion.find(e=>e.vigencia===vigA);return a+(e?.pagos||0);},0);
    const pB = PROYECTOS.filter(p=>p.sector===k&&p.ejecucion.some(e=>e.vigencia===vigB)).reduce((a,p)=>{const e=p.ejecucion.find(e=>e.vigencia===vigB);return a+(e?.pagos||0);},0);
    if (!pA && !pB) return null;
    return { sector: cfg.label.slice(0,12), [`v${vigA}`]: pA/1e9, [`v${vigB}`]: pB/1e9 };
  }).filter(Boolean);

  const DeltaBadge = ({ a, b, prefix='', suffix='', invert=false }) => {
    const na = parseFloat(a), nb = parseFloat(b);
    if (!na && !nb) return <span style={{color:'#9ca3af'}}>—</span>;
    const delta = na ? ((nb-na)/na*100).toFixed(1) : null;
    const up = nb > na;
    const good = invert ? !up : up;
    return (
      <span style={{ fontSize:12, fontWeight:700, color: good?'#059669':'#dc2626', marginLeft:6 }}>
        {delta!==null ? `${up?'▲':'▼'} ${Math.abs(delta)}%` : '—'}
      </span>
    );
  };

  const MetricRow = ({ label, vA, vB, fmt=v=>v, invert=false }) => (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, padding:'12px 0', borderBottom:'1px solid #f3f4f6', alignItems:'center' }}>
      <div style={{ fontSize:13, color:'#6b7280', fontWeight:600 }}>{label}</div>
      <div style={{ fontSize:16, fontWeight:800, color:'#2563eb', textAlign:'center' }}>{fmt(vA)}</div>
      <div style={{ fontSize:16, fontWeight:800, color:'#059669', textAlign:'center' }}>
        {fmt(vB)}
        <DeltaBadge a={vA} b={vB} invert={invert}/>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#111827' }}>📊 Comparativo Multi-Vigencia</h1>
        <p style={{ margin:'4px 0 0', color:'#6b7280', fontSize:14 }}>Análisis comparativo de ejecución entre vigencias fiscales</p>
      </div>

      {/* Selector vigencias */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ fontSize:13, fontWeight:600, color:'#374151' }}>Comparar:</span>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:12, height:12, borderRadius:2, background:'#2563eb' }}/>
            <Sel value={vigA} onChange={v=>setVigA(parseInt(v))} options={vigOpts} />
          </div>
          <span style={{ color:'#9ca3af', fontWeight:700 }}>vs</span>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:12, height:12, borderRadius:2, background:'#059669' }}/>
            <Sel value={vigB} onChange={v=>setVigB(parseInt(v))} options={vigOpts} />
          </div>
        </div>
      </Card>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        {/* Métricas comparativas */}
        <Card title="Indicadores Clave">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:8 }}>
            <div/>
            <div style={{ textAlign:'center', fontSize:12, fontWeight:700, color:'#2563eb', background:'#eff6ff', borderRadius:6, padding:'6px 8px' }}>Vigencia {vigA}</div>
            <div style={{ textAlign:'center', fontSize:12, fontWeight:700, color:'#059669', background:'#f0fdf4', borderRadius:6, padding:'6px 8px' }}>Vigencia {vigB}</div>
          </div>
          <MetricRow label="Proyectos con ejecución" vA={dataA.proyectos}       vB={dataB.proyectos}       fmt={v=>v} />
          <MetricRow label="Apropiación total"        vA={dataA.apropiacion/1e9} vB={dataB.apropiacion/1e9} fmt={v=>`$${v.toFixed(2)} mmM`} />
          <MetricRow label="Comprometido (RP)"        vA={dataA.rp/1e9}          vB={dataB.rp/1e9}          fmt={v=>`$${v.toFixed(2)} mmM`} />
          <MetricRow label="Pagos efectivos"          vA={dataA.pagos/1e9}       vB={dataB.pagos/1e9}       fmt={v=>`$${v.toFixed(2)} mmM`} />
          <MetricRow label="% Ejecución"              vA={dataA.pctEjecucion}    vB={dataB.pctEjecucion}    fmt={v=>`${v}%`} />
        </Card>

        {/* Barras comparativas */}
        <Card title={`Pagos por Sector — Vigencia ${vigA} vs ${vigB}`} subtitle="Miles de millones COP">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sectorComp} margin={{ top:5, right:5, left:0, bottom:55 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="sector" tick={{ fontSize:10 }} angle={-38} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize:11 }} tickFormatter={v=>`$${v.toFixed(1)} mmM`} />
              <Tooltip formatter={(v,n)=>[`$${v.toFixed(2)} mmM`,n.includes(vigA)?`Vigencia ${vigA}`:`Vigencia ${vigB}`]} />
              <Legend verticalAlign="top" formatter={v=>v.includes(vigA)?`Vigencia ${vigA}`:`Vigencia ${vigB}`}/>
              <Bar dataKey={`v${vigA}`} fill="#93c5fd" radius={[3,3,0,0]}/>
              <Bar dataKey={`v${vigB}`} fill="#059669" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Tabla de proyectos nuevos en vigB vs vigA */}
      <Card title={`Proyectos nuevos en Vigencia ${vigB}`} subtitle={`No presentes en vigencia ${vigA}`}>
        {(() => {
          const idsA = new Set(PROYECTOS.filter(p=>p.ejecucion.some(e=>e.vigencia===vigA)).map(p=>p.id));
          const nuevos = PROYECTOS.filter(p=>p.ejecucion.some(e=>e.vigencia===vigB) && !idsA.has(p.id));
          if (!nuevos.length) return <div style={{textAlign:'center',padding:30,color:'#9ca3af'}}>No hay proyectos nuevos en la vigencia {vigB}</div>;
          return (
            <Tbl columns={[
              { title:'BPIN',    key:'bpin',    render:v=><code style={{fontSize:12,color:'#6b7280'}}>{formatBPIN(v)}</code> },
              { title:'Proyecto',key:'nombre',  render:(v,r)=><div><div style={{fontWeight:600,fontSize:13}}>{v}</div><SectorBadge sector={r.sector}/></div> },
              { title:'Estado',  key:'estado',  render:v=><EstadoBadge estado={v}/> },
              { title:'Valor',   key:'valorTotal', render:v=><strong>{formatCOP(v)}</strong> },
            ]} data={nuevos} />
          );
        })()}
      </Card>
    </div>
  );
}

// ============================================================
// INDICADORES PDM PAGE
// ============================================================
function IndicadoresPDMPage() {
  const EJE_COLORS = ['#2563eb','#059669','#7c3aed','#d97706','#dc2626','#0891b2','#c026d3','#0f766e'];
  const [ejeActivo, setEjeActivo] = useState(0);

  // --- FIX 1: filtrar filas de nota (⚠) que pudieron colarse desde Excel ---
  const ejesLimpios = (PDM.ejes || []).filter(e =>
    e.id && !String(e.id).startsWith('⚠') && !String(e.nombre).startsWith('⚠')
  );

  // --- FIX 2: asignar color por índice (los ejes no tienen .color en la estructura) ---
  const ejesConColor = ejesLimpios.map((eje, i) => ({
    ...eje,
    color: eje.color || EJE_COLORS[i % EJE_COLORS.length],
  }));

  // --- FIX 3: relacionar proyectos por programaPDM ↔ eje.programas[].id
  //            (antes usaba p.pdm.eje que ya no existe en la estructura actual) ---
  const proyPorEje = ejesConColor.map(eje => {
    const progIds = new Set((eje.programas || []).map(pr => String(pr.id)));
    return {
      ...eje,
      proyectos: PROYECTOS.filter(p => progIds.has(String(p.programaPDM))),
      // programas únicos para mostrar (deduplicar por id)
      programasUnicos: [...new Map((eje.programas || []).map(pr => [pr.id, pr])).values()],
    };
  });

  // --- FIX 4: radarData calculado dinámicamente si PDM.indicadoresRadar no existe ---
  const radarData = (PDM.indicadoresRadar && PDM.indicadoresRadar.length)
    ? PDM.indicadoresRadar
    : proyPorEje.map(eje => {
        const ps = eje.proyectos;
        const logrado = ps.length
          ? Math.round(ps.reduce((a, p) => a + (p.avanceFisico || 0), 0) / ps.length)
          : 0;
        // etiqueta corta para el radar
        const label = eje.id || eje.nombre.slice(0, 14);
        return { eje: label, logrado, meta: 100 };
      });

  const ejeActual = proyPorEje[ejeActivo] || proyPorEje[0] || { proyectos:[], programasUnicos:[], nombre:'', color:'#2563eb' };

  // Métricas del eje activo
  const vigActual = new Date().getFullYear();
  const totalValorEje = ejeActual.proyectos.reduce((a,p) => a + (p.valorTotal||0), 0);
  const totalPagosEje = ejeActual.proyectos.reduce((a,p) => {
    const e = p.ejecucion.find(e => e.vigencia === vigActual) || p.ejecucion[p.ejecucion.length-1];
    return a + (e?.pagos || 0);
  }, 0);
  const enEjecPs = ejeActual.proyectos.filter(p => p.estado==='EN_EJECUCION' || p.estado==='EJECUCION');
  const avFisEje = enEjecPs.length
    ? Math.round(enEjecPs.reduce((a,p) => a + (p.avanceFisico||0), 0) / enEjecPs.length)
    : (ejeActual.proyectos.every(p => p.estado==='TERMINADO'||p.estado==='CERRADO') ? 100 : 0);

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#111827' }}>🎯 Indicadores PDM</h1>
        <p style={{ margin:'4px 0 0', color:'#6b7280', fontSize:14 }}>{PDM.nombre}</p>
      </div>

      {/* Radar + semáforo */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
        <Card title="Cumplimiento Global por Eje" subtitle="Avance físico promedio vs meta (%)">
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={100}>
                <PolarGrid stroke="#e5e7eb"/>
                <PolarAngleAxis dataKey="eje" tick={{ fontSize:10, fill:'#374151' }}/>
                <Radar name="Avance actual" dataKey="logrado" stroke="#2563eb" fill="#2563eb" fillOpacity={0.25} strokeWidth={2}/>
                <Radar name="Meta"          dataKey="meta"    stroke="#d1d5db" fill="transparent" strokeWidth={1} strokeDasharray="5 5"/>
                <Legend />
                <Tooltip formatter={v=>`${v}%`}/>
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{textAlign:'center',padding:60,color:'#9ca3af'}}>Sin datos de radar — cargue proyectos con programaPDM asignado</div>
          )}
        </Card>

        <Card title="Estado por Eje Estratégico">
          <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:280, overflowY:'auto' }}>
            {radarData.map((d,i) => {
              const c  = d.logrado>=75?'#059669':d.logrado>=50?'#f59e0b':'#ef4444';
              const bg = d.logrado>=75?'#f0fdf4':d.logrado>=50?'#fffbeb':'#fff5f5';
              return (
                <div key={i} style={{ background:bg, borderRadius:8, padding:'9px 13px', flexShrink:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:'#111827' }}>{d.eje}</span>
                    <span style={{ fontSize:13, fontWeight:800, color:c }}>{d.logrado}%</span>
                  </div>
                  <div style={{ height:6, background:'rgba(0,0,0,0.06)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ width:`${Math.min(d.logrado,100)}%`, height:'100%', background:c, borderRadius:3, transition:'width .5s' }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Detalle por eje */}
      <Card title="Detalle por Eje Estratégico">
        {/* Tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          {proyPorEje.map((eje,i) => (
            <button key={i} onClick={() => setEjeActivo(i)}
              style={{ padding:'7px 14px', borderRadius:8,
                border:`2px solid ${ejeActivo===i ? eje.color : '#e5e7eb'}`,
                background: ejeActivo===i ? eje.color+'18' : '#fff',
                color: ejeActivo===i ? eje.color : '#6b7280',
                cursor:'pointer', fontSize:12, fontWeight:700, maxWidth:180,
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {eje.id}
            </button>
          ))}
        </div>

        {/* Banner eje activo */}
        <div style={{ background:`${ejeActual.color}0d`, borderRadius:10, padding:'13px 17px', marginBottom:16, borderLeft:`4px solid ${ejeActual.color}` }}>
          <div style={{ fontWeight:700, color:ejeActual.color, fontSize:13, marginBottom:4 }}>{ejeActual.nombre}</div>
          {/* FIX 5: programas son objetos, usar .map(p=>p.nombre) para mostrarlos */}
          <div style={{ fontSize:11, color:'#6b7280', lineHeight:1.6 }}>
            {ejeActual.programasUnicos.slice(0,4).map((pr,i) => (
              <span key={i} style={{ display:'inline-block', background:'#fff', border:'1px solid #e5e7eb', borderRadius:4, padding:'1px 7px', marginRight:4, marginBottom:3, fontSize:11 }}>
                {pr.id} — {pr.nombre.slice(0,50)}{pr.nombre.length>50?'…':''}
              </span>
            ))}
            {ejeActual.programasUnicos.length > 4 && (
              <span style={{ color:'#9ca3af', fontSize:11 }}>+{ejeActual.programasUnicos.length-4} más</span>
            )}
          </div>
        </div>

        {/* KPIs eje */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
          {[
            { label:'Proyectos',        value: ejeActual.proyectos.length,   icon:'📁' },
            { label:'Inversión total',  value: formatCOP(totalValorEje),     icon:'💰' },
            { label:'Pagos vigencia',   value: formatCOP(totalPagosEje),     icon:'✅' },
            { label:'Avance físico',    value: `${avFisEje}%`,               icon:'🏗️' },
          ].map((k,i) => (
            <div key={i} style={{ background:'#f9fafb', borderRadius:8, padding:'12px 14px', textAlign:'center', border:'1px solid #e5e7eb' }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{k.icon}</div>
              <div style={{ fontSize:15, fontWeight:800, color:'#111827' }}>{k.value}</div>
              <div style={{ fontSize:11, color:'#9ca3af' }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Tabla proyectos del eje */}
        {ejeActual.proyectos.length > 0 ? (
          <Tbl columns={[
            { title:'BPIN',     key:'bpin',       render:v=><code style={{fontSize:11,color:'#6b7280'}}>{formatBPIN(v)}</code> },
            { title:'Proyecto', key:'nombre',     render:(v,r)=>(
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{v.slice(0,55)}{v.length>55?'…':''}</div>
                <SectorBadge sector={r.sector}/>
              </div>
            )},
            { title:'Programa', key:'programaPDM', render:v=><span style={{fontSize:11,color:'#6b7280',fontFamily:'monospace'}}>{v}</span> },
            { title:'Estado',   key:'estado',     render:v=><EstadoBadge estado={v}/> },
            { title:'Valor',    key:'valorTotal', render:v=><strong>{formatCOP(v)}</strong> },
            { title:'Avance',   key:'avanceFisico', render:(v,r)=>(
              r.estado==='EN_EJECUCION'||r.estado==='EJECUCION'
                ? <AvanceBar fisico={v} financiero={r.avanceFinanciero}/>
                : <span style={{color:'#9ca3af',fontSize:12}}>
                    {r.estado==='TERMINADO'||r.estado==='CERRADO' ? '✅ Terminado' : '—'}
                  </span>
            )},
          ]} data={ejeActual.proyectos}/>
        ) : (
          <div style={{ textAlign:'center', padding:30, color:'#9ca3af' }}>
            Sin proyectos con <code>programaPDM</code> asignado a este eje
          </div>
        )}
      </Card>
    </div>
  );
}

// ============================================================
// ALERTAS PAGE
// ============================================================
function AlertasPage() {
  const alertas = useMemo(() => {
    const lista = [];

    PROYECTOS.forEach(p => {
      // Brecha crítica
      if (p.estado === 'EJECUCION') {
        const brecha = Math.abs(p.avanceFisico - p.avanceFinanciero);
        if (brecha > 25) lista.push({ tipo:'CRITICO', icono:'🔴', titulo:'Brecha crítica físico/financiero', descripcion:`Brecha de ${brecha}pp entre avance físico (${p.avanceFisico}%) y financiero (${p.avanceFinanciero}%)`, proyecto:p });
        else if (brecha > 15) lista.push({ tipo:'ALERTA', icono:'⚠️', titulo:'Brecha significativa', descripcion:`Brecha de ${brecha}pp — requiere seguimiento`, proyecto:p });

        // Rezago en avance
        if (p.avanceFisico < 30 && p.vigenciaFin === 2024) {
          lista.push({ tipo:'ALERTA', icono:'⏳', titulo:'Avance físico bajo para el plazo', descripcion:`Solo ${p.avanceFisico}% de avance con vigencia terminando en 2024`, proyecto:p });
        }

        // Comprometido sin pagar
        const e = p.ejecucion.find(e=>e.vigencia===2024);
        if (e && e.rp > 0 && e.pagos < e.rp * 0.5) {
          lista.push({ tipo:'INFORMATIVO', icono:'💳', titulo:'Alto saldo pendiente de pago', descripcion:`${formatCOP(e.rp - e.pagos)} comprometido pero no pagado`, proyecto:p });
        }
      }

      // Proyecto suspendido
      if (p.estado === 'SUSPENDIDO') {
        lista.push({ tipo:'CRITICO', icono:'🛑', titulo:'Proyecto suspendido', descripcion:`El proyecto se encuentra suspendido. Requiere acciones para reactivación.`, proyecto:p });
      }

      // Hitos vencidos sin cumplir
      const hoy = '2024-12-01';
      const hitosVencidos = p.hitos.filter(h => !h.cumplido && h.fecha < hoy).length;
      if (hitosVencidos > 0 && (p.estado==='EJECUCION'||p.estado==='REGISTRADO')) {
        lista.push({ tipo:'ALERTA', icono:'📅', titulo:`${hitosVencidos} hito(s) vencido(s) sin cumplir`, descripcion:`Existen hitos con fecha pasada pendientes de cumplimiento`, proyecto:p });
      }
    });

    return lista.sort((a,b) => {
      const ord = { CRITICO:0, ALERTA:1, INFORMATIVO:2 };
      return ord[a.tipo] - ord[b.tipo];
    });
  }, []);

  const criticos    = alertas.filter(a=>a.tipo==='CRITICO').length;
  const alertasCnt  = alertas.filter(a=>a.tipo==='ALERTA').length;
  const infosCnt    = alertas.filter(a=>a.tipo==='INFORMATIVO').length;

  const colores = {
    CRITICO:     { bg:'#fff5f5', border:'#fca5a5', text:'#991b1b', label:'Crítico' },
    ALERTA:      { bg:'#fffbeb', border:'#fcd34d', text:'#92400e', label:'Alerta' },
    INFORMATIVO: { bg:'#eff6ff', border:'#93c5fd', text:'#1e40af', label:'Informativo' },
  };

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#111827' }}>🔔 Centro de Alertas</h1>
        <p style={{ margin:'4px 0 0', color:'#6b7280', fontSize:14 }}>{alertas.length} alertas activas — Vigencia 2024</p>
      </div>

      {/* Resumen */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:24 }}>
        <div style={{ background:'#fff5f5', border:'2px solid #fca5a5', borderRadius:12, padding:'16px 20px', textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:4 }}>🔴</div>
          <div style={{ fontSize:28, fontWeight:800, color:'#991b1b' }}>{criticos}</div>
          <div style={{ fontSize:13, fontWeight:600, color:'#991b1b' }}>Críticos</div>
        </div>
        <div style={{ background:'#fffbeb', border:'2px solid #fcd34d', borderRadius:12, padding:'16px 20px', textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:4 }}>⚠️</div>
          <div style={{ fontSize:28, fontWeight:800, color:'#92400e' }}>{alertasCnt}</div>
          <div style={{ fontSize:13, fontWeight:600, color:'#92400e' }}>Alertas</div>
        </div>
        <div style={{ background:'#eff6ff', border:'2px solid #93c5fd', borderRadius:12, padding:'16px 20px', textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:4 }}>ℹ️</div>
          <div style={{ fontSize:28, fontWeight:800, color:'#1e40af' }}>{infosCnt}</div>
          <div style={{ fontSize:13, fontWeight:600, color:'#1e40af' }}>Informativos</div>
        </div>
      </div>

      {/* Lista alertas */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {alertas.map((a, i) => {
          const c = colores[a.tipo];
          return (
            <div key={i} style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:10, padding:'14px 18px', borderLeft:`4px solid ${c.border}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:18 }}>{a.icono}</span>
                    <span style={{ fontWeight:700, fontSize:14, color:c.text }}>{a.titulo}</span>
                    <span style={{ background:c.border, color:c.text, borderRadius:4, padding:'1px 8px', fontSize:11, fontWeight:700 }}>{c.label}</span>
                  </div>
                  <div style={{ fontSize:13, color:'#374151', marginBottom:6 }}>{a.descripcion}</div>
                  <div style={{ fontSize:12, color:'#6b7280' }}>
                    {SECTORES[a.proyecto.sector]?.icon} <strong>{a.proyecto.nombre.slice(0,50)}{a.proyecto.nombre.length>50?'…':''}</strong>
                    {' '}· BPIN <code>{formatBPIN(a.proyecto.bpin)}</code>
                    {' '}· <EstadoBadge estado={a.proyecto.estado}/>
                  </div>
                </div>
                {a.proyecto.estado==='EJECUCION' && (
                  <div style={{ minWidth:200 }}>
                    <AvanceBar fisico={a.proyecto.avanceFisico} financiero={a.proyecto.avanceFinanciero}/>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {!alertas.length && (
          <div style={{ textAlign:'center', padding:60, color:'#9ca3af' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
            <div style={{ fontWeight:600 }}>Sin alertas activas</div>
          </div>
        )}
      </div>
    </div>
  );
}


// ============================================================
// CATÁLOGO DNP — Módulo de consulta
// ============================================================

const ODS_ICONS = {
  1:'🏚',2:'🍽',3:'💊',4:'🎓',5:'♀️',6:'💧',7:'⚡',8:'💼',9:'🏭',
  10:'⚖️',11:'🏙',12:'♻️',13:'🌡',14:'🌊',15:'🌿',16:'🏛',17:'🤝'
};
const ODS_COLORS = {
  1:'#e5243b',2:'#dda63a',3:'#4c9f38',4:'#c5192d',5:'#ff3a21',
  6:'#26bde2',7:'#fcc30b',8:'#a21942',9:'#fd6925',10:'#dd1367',
  11:'#fd9d24',12:'#bf8b2e',13:'#3f7e44',14:'#0a97d9',15:'#56c02b',
  16:'#00689d',17:'#19486a'
};

function CatalogoDNPPage() {
  const [search,     setSearch]     = useState('');
  const [secFiltro,  setSecFiltro]  = useState('');
  const [progFiltro, setProgFiltro] = useState('');
  const [odsFiltro,  setOdsFiltro]  = useState('');
  const [pagina,     setPagina]     = useState(0);
  const [detalle,    setDetalle]    = useState(null);
  const POR_PAGINA = 50;

  const programasDeSector = useMemo(() => {
    const entries = Object.entries(CATALOGO_PROGRAMAS);
    const filtered = secFiltro ? entries.filter(([,v]) => v[1] === secFiltro) : entries;
    return filtered.map(([k,v]) => ({cod:k, nom:v[0]}))
      .sort((a,b) => a.nom.localeCompare(b.nom));
  }, [secFiltro]);

  const odsUnicos = useMemo(() => {
    const s = new Set(CATALOGO_PRODUCTOS.map(p=>p[7]).filter(Boolean));
    return [...s].sort((a,b)=>a-b);
  }, []);

  const filtrados = useMemo(() => {
    const q = search.toLowerCase().trim();
    return CATALOGO_PRODUCTOS.filter(p => {
      if (secFiltro  && p[2] !== secFiltro)           return false;
      if (progFiltro && p[3] !== progFiltro)          return false;
      if (odsFiltro  && p[7] !== parseInt(odsFiltro)) return false;
      if (!q) return true;
      return p[0].includes(q) || p[1].toLowerCase().includes(q) || p[5].toLowerCase().includes(q);
    });
  }, [search, secFiltro, progFiltro, odsFiltro]);

  useEffect(() => { setPagina(0); }, [search, secFiltro, progFiltro, odsFiltro]);

  const paginas  = Math.ceil(filtrados.length / POR_PAGINA);
  const visibles = filtrados.slice(pagina * POR_PAGINA, (pagina+1) * POR_PAGINA);
  const limpiar  = () => { setSearch(''); setSecFiltro(''); setProgFiltro(''); setOdsFiltro(''); };

  if (detalle) return <CatalogoDetalle producto={detalle} onBack={()=>setDetalle(null)}/>;

  return (
    <div className="fade-in">
      <div style={{marginBottom:20}}>
        <h1 style={{margin:0,fontSize:22,fontWeight:800,color:'#111827'}}>📚 Catálogo de Productos DNP</h1>
        <p style={{margin:'4px 0 0',color:'#6b7280',fontSize:14}}>
          {CATALOGO_PRODUCTOS.length.toLocaleString('es-CO')} productos territoriales · {Object.keys(CATALOGO_SECTORES).length} sectores · Fuente SUIFP/DNP · Actualizado 14/04/2025
        </p>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:20}}>
        {[
          {icon:'📦',label:'Productos',    val:CATALOGO_PRODUCTOS.length.toLocaleString('es-CO'),color:'#2563eb'},
          {icon:'🏛', label:'Sectores',    val:Object.keys(CATALOGO_SECTORES).length,             color:'#7c3aed'},
          {icon:'📋',label:'Programas',    val:Object.keys(CATALOGO_PROGRAMAS).length,            color:'#059669'},
          {icon:'🎯',label:'Encontrados',  val:filtrados.length.toLocaleString('es-CO'),          color:'#d97706'},
        ].map((k,i)=>(
          <div key={i} style={{background:'#fff',borderRadius:10,padding:'14px 16px',border:'1px solid #e5e7eb',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <span style={{fontSize:18}}>{k.icon}</span>
              <span style={{fontSize:11,color:'#6b7280',fontWeight:500}}>{k.label}</span>
            </div>
            <div style={{fontSize:22,fontWeight:800,color:k.color}}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{background:'#fff',borderRadius:12,padding:'16px 20px',marginBottom:16,border:'1px solid #e5e7eb',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end'}}>
          <div style={{flex:'2 1 240px'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#374151',marginBottom:4}}>Buscar por código, nombre o indicador</div>
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#9ca3af',fontSize:15}}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Ej: vía terciaria, 2402, agua potable..."
                style={{width:'100%',paddingLeft:34,paddingRight:12,paddingTop:8,paddingBottom:8,border:'1px solid #d1d5db',borderRadius:8,fontSize:13,outline:'none',background:'#fafafa',boxSizing:'border-box'}}/>
            </div>
          </div>
          <div style={{flex:'1 1 180px'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#374151',marginBottom:4}}>Sector</div>
            <select value={secFiltro} onChange={e=>{setSecFiltro(e.target.value);setProgFiltro('');}}
              style={{width:'100%',padding:'8px 10px',border:'1px solid #d1d5db',borderRadius:8,fontSize:12,outline:'none',background:'#fafafa'}}>
              <option value="">Todos los sectores</option>
              {Object.entries(CATALOGO_SECTORES).sort((a,b)=>a[1].localeCompare(b[1])).map(([k,v])=>(
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div style={{flex:'1 1 180px'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#374151',marginBottom:4}}>Programa</div>
            <select value={progFiltro} onChange={e=>setProgFiltro(e.target.value)}
              style={{width:'100%',padding:'8px 10px',border:'1px solid #d1d5db',borderRadius:8,fontSize:12,outline:'none',background:'#fafafa'}}>
              <option value="">Todos los programas</option>
              {programasDeSector.map(pr=>(
                <option key={pr.cod} value={pr.cod}>{pr.cod} — {pr.nom.slice(0,55)}{pr.nom.length>55?'…':''}</option>
              ))}
            </select>
          </div>
          <div style={{flex:'0 0 120px'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#374151',marginBottom:4}}>ODS</div>
            <select value={odsFiltro} onChange={e=>setOdsFiltro(e.target.value)}
              style={{width:'100%',padding:'8px 10px',border:'1px solid #d1d5db',borderRadius:8,fontSize:12,outline:'none',background:'#fafafa'}}>
              <option value="">Todos</option>
              {odsUnicos.map(o=>(
                <option key={o} value={o}>{ODS_ICONS[o]||''} ODS {o}</option>
              ))}
            </select>
          </div>
          <button onClick={limpiar}
            style={{padding:'8px 14px',background:'#f3f4f6',border:'1px solid #d1d5db',borderRadius:8,fontSize:12,cursor:'pointer',color:'#374151',fontWeight:600,whiteSpace:'nowrap'}}>
            ✕ Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid #f3f4f6',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
          <span style={{fontSize:13,color:'#6b7280'}}>
            {filtrados.length === 0 ? 'Sin resultados'
              : `Mostrando ${pagina*POR_PAGINA+1}–${Math.min((pagina+1)*POR_PAGINA,filtrados.length)} de ${filtrados.length.toLocaleString('es-CO')}`}
          </span>
          {paginas > 1 && (
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <button disabled={pagina===0} onClick={()=>setPagina(p=>p-1)}
                style={{padding:'4px 10px',borderRadius:6,border:'1px solid #d1d5db',background:pagina===0?'#f9fafb':'#fff',cursor:pagina===0?'default':'pointer',fontSize:13}}>‹</button>
              <span style={{fontSize:12,color:'#6b7280'}}>{pagina+1} / {paginas}</span>
              <button disabled={pagina===paginas-1} onClick={()=>setPagina(p=>p+1)}
                style={{padding:'4px 10px',borderRadius:6,border:'1px solid #d1d5db',background:pagina===paginas-1?'#f9fafb':'#fff',cursor:pagina===paginas-1?'default':'pointer',fontSize:13}}>›</button>
            </div>
          )}
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:'#f8fafc'}}>
                {['Cód. Producto','Nombre del Producto','Sector / Programa','Indicador Principal','Unidad','ODS',''].map((h,i)=>(
                  <th key={i} style={{padding:'10px 14px',textAlign:'left',fontWeight:700,color:'#374151',borderBottom:'2px solid #e5e7eb',whiteSpace:'nowrap',fontSize:11}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 ? (
                <tr><td colSpan={7} style={{textAlign:'center',padding:48,color:'#9ca3af'}}>Sin productos que coincidan</td></tr>
              ) : visibles.map((p,i) => {
                const secNom  = CATALOGO_SECTORES[p[2]] || p[2];
                const progNom = CATALOGO_PROGRAMAS[p[3]] ? CATALOGO_PROGRAMAS[p[3]][0] : p[3];
                return (
                  <tr key={i}
                    style={{borderBottom:'1px solid #f3f4f6',cursor:'pointer',transition:'background .1s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e=>e.currentTarget.style.background=''}
                    onClick={()=>setDetalle(p)}>
                    <td style={{padding:'9px 14px'}}>
                      <code style={{fontFamily:'monospace',background:'#f1f5f9',padding:'2px 7px',borderRadius:4,color:'#1e3a5f',fontWeight:700,fontSize:12}}>{p[0]}</code>
                    </td>
                    <td style={{padding:'9px 14px',maxWidth:260}}>
                      <div style={{fontWeight:600,color:'#111827',lineHeight:1.35}}>{p[1]}</div>
                    </td>
                    <td style={{padding:'9px 14px',maxWidth:200}}>
                      <div style={{fontSize:11,fontWeight:700,color:'#2563eb'}}>{secNom}</div>
                      <div style={{fontSize:10,color:'#9ca3af',marginTop:1}}>{progNom.slice(0,55)}{progNom.length>55?'…':''}</div>
                    </td>
                    <td style={{padding:'9px 14px',maxWidth:260,color:'#374151',fontSize:11}}>
                      {p[5].slice(0,80)}{p[5].length>80?'…':''}
                    </td>
                    <td style={{padding:'9px 14px',whiteSpace:'nowrap'}}>
                      <span style={{background:'#eff6ff',color:'#1d4ed8',padding:'2px 8px',borderRadius:4,fontWeight:600,fontSize:11}}>{p[6]}</span>
                    </td>
                    <td style={{padding:'9px 14px',textAlign:'center'}}>
                      {p[7] ? <span title={'ODS '+p[7]} style={{fontSize:17}}>{ODS_ICONS[p[7]]||p[7]}</span> : <span style={{color:'#d1d5db'}}>—</span>}
                    </td>
                    <td style={{padding:'9px 14px'}}>
                      <button onClick={e=>{e.stopPropagation();setDetalle(p);}}
                        style={{padding:'4px 10px',background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:6,color:'#2563eb',cursor:'pointer',fontSize:11,fontWeight:600,whiteSpace:'nowrap'}}>
                        Ver →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Detalle de producto ───────────────────────────────────────────────────────
function CatalogoDetalle({ producto: p, onBack }) {
  const secNom  = CATALOGO_SECTORES[p[2]] || p[2];
  const progNom = CATALOGO_PROGRAMAS[p[3]] ? CATALOGO_PROGRAMAS[p[3]][0] : p[3];
  const odsColor = ODS_COLORS[p[7]] || '#9ca3af';

  const [copiado, setCopiado] = useState('');
  const copiar = (texto, llave) => {
    navigator.clipboard && navigator.clipboard.writeText(texto).catch(()=>{});
    setCopiado(llave);
    setTimeout(()=>setCopiado(''), 1800);
  };

  return (
    <div className="fade-in">
      <button onClick={onBack}
        style={{marginBottom:16,padding:'6px 14px',background:'#f3f4f6',border:'1px solid #d1d5db',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,color:'#374151'}}>
        ← Volver al catálogo
      </button>

      {/* Header */}
      <div style={{background:'#fff',borderRadius:12,padding:'20px 24px',marginBottom:16,border:'1px solid #e5e7eb',boxShadow:'0 1px 4px rgba(0,0,0,0.08)',borderLeft:'4px solid #2563eb'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:'#6b7280',fontWeight:600,marginBottom:4,letterSpacing:1}}>CÓDIGO DE PRODUCTO DNP / SUIFP</div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <code style={{fontSize:24,fontWeight:800,color:'#1e3a5f',fontFamily:'monospace'}}>{p[0]}</code>
              <button onClick={()=>copiar(p[0],'cod')}
                style={{padding:'3px 10px',background:copiado==='cod'?'#d1fae5':'#f3f4f6',border:'1px solid #d1d5db',borderRadius:6,cursor:'pointer',fontSize:11,color:copiado==='cod'?'#065f46':'#374151',fontWeight:600}}>
                {copiado==='cod'?'✓ Copiado':'Copiar'}
              </button>
            </div>
            <h2 style={{margin:'0 0 4px',fontSize:18,fontWeight:800,color:'#111827'}}>{p[1]}</h2>
          </div>
          {p[7] ? (
            <div style={{background:odsColor+'18',border:'2px solid '+odsColor,borderRadius:12,padding:'12px 16px',textAlign:'center',minWidth:80}}>
              <div style={{fontSize:26}}>{ODS_ICONS[p[7]]||''}</div>
              <div style={{fontSize:10,fontWeight:700,color:odsColor,marginTop:4}}>ODS {p[7]}</div>
            </div>
          ) : null}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:14}}>
          <div style={{background:'#f8fafc',borderRadius:8,padding:'10px 14px'}}>
            <div style={{fontSize:10,color:'#9ca3af',fontWeight:600,marginBottom:2,letterSpacing:.8}}>SECTOR</div>
            <div style={{fontSize:13,fontWeight:700,color:'#2563eb'}}>{p[2]} — {secNom}</div>
          </div>
          <div style={{background:'#f8fafc',borderRadius:8,padding:'10px 14px'}}>
            <div style={{fontSize:10,color:'#9ca3af',fontWeight:600,marginBottom:2,letterSpacing:.8}}>PROGRAMA</div>
            <div style={{fontSize:12,fontWeight:600,color:'#374151'}}>{p[3]} — {progNom.slice(0,90)}{progNom.length>90?'…':''}</div>
          </div>
        </div>
      </div>

      {/* Indicador principal */}
      <div style={{background:'#fff',borderRadius:12,padding:'18px 22px',marginBottom:16,border:'2px solid #2563eb',boxShadow:'0 1px 6px rgba(37,99,235,0.12)'}}>
        <div style={{fontSize:11,fontWeight:700,color:'#2563eb',marginBottom:10,letterSpacing:.8}}>⭐ INDICADOR PRINCIPAL DE PRODUCTO</div>
        <div style={{display:'grid',gridTemplateColumns:'auto 1fr auto auto',gap:12,alignItems:'center',flexWrap:'wrap'}}>
          <code style={{fontFamily:'monospace',fontSize:13,background:'#eff6ff',padding:'5px 12px',borderRadius:6,color:'#1e40af',fontWeight:700,whiteSpace:'nowrap'}}>{p[4]}</code>
          <div style={{fontSize:14,fontWeight:600,color:'#111827',lineHeight:1.4}}>{p[5]}</div>
          <span style={{background:'#dcfce7',color:'#166534',padding:'5px 14px',borderRadius:8,fontSize:13,fontWeight:700,whiteSpace:'nowrap'}}>{p[6]}</span>
          <button onClick={()=>copiar(p[4],'ind')}
            style={{padding:'5px 12px',background:copiado==='ind'?'#d1fae5':'#f3f4f6',border:'1px solid #d1d5db',borderRadius:6,cursor:'pointer',fontSize:11,color:copiado==='ind'?'#065f46':'#374151',fontWeight:600,whiteSpace:'nowrap'}}>
            {copiado==='ind'?'✓ Copiado':'Copiar cód.'}
          </button>
        </div>
      </div>

      {/* Guía de uso */}
      <div style={{background:'#fffbeb',border:'1px solid #fcd34d',borderRadius:10,padding:'14px 18px'}}>
        <div style={{fontSize:12,fontWeight:700,color:'#92400e',marginBottom:8}}>📌 Cómo registrar este producto en un proyecto</div>
        <ol style={{margin:0,paddingLeft:18,fontSize:12,color:'#78350f',lineHeight:2}}>
          <li>En SUIFP (suifp.dnp.gov.co) registre el proyecto con <strong>Código de Producto: {p[0]}</strong></li>
          <li>SUIFP asignará automáticamente el BPIN de 14 dígitos al aprobar el proyecto</li>
          <li>Para el seguimiento físico use el indicador <strong>{p[4]}</strong></li>
          <li>Reporte el avance en <strong>{p[6]}</strong> según la meta programada</li>
          <li>En la app, ingrese el BPIN en el formulario de proyecto (campo de 14 dígitos)</li>
        </ol>
      </div>
    </div>
  );
}
