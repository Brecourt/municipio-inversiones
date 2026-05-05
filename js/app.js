// ============================================================
// APP.JS – Sistema de Seguimiento Inversión Municipal
// ============================================================
const { useState, useMemo, useCallback, useEffect } = React;
const {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, ComposedChart, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} = Recharts;

// ── Contexto global de vigencia ───────────────────────────────────────────────
const VigenciaContext = React.createContext(2026);
const VIGENCIAS = [2024, 2025, 2026, 2027];

// ============================================================
// UI BASE
// ============================================================
function Badge({ children, color, bg, text }) {
  return (
    <span style={{
      background: bg||'#f3f4f6', color: text||'#374151',
      border:`1px solid ${color||'#d1d5db'}`,
      borderRadius:6, padding:'2px 10px', fontSize:12, fontWeight:600,
      display:'inline-flex', alignItems:'center', gap:4, whiteSpace:'nowrap'
    }}>{children}</span>
  );
}
function EstadoBadge({ estado }) {
  const c = ESTADOS[estado]||{};
  return <Badge color={c.color} bg={c.bg} text={c.text}>{c.label||estado}</Badge>;
}
function SectorBadge({ sector }) {
  const c = SECTORES[sector]||{};
  return <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:13}}><span>{c.icon}</span><span style={{color:c.color,fontWeight:600}}>{c.label}</span></span>;
}
function SemaforoBadge({ proyecto }) {
  const s = semaforoColor(proyecto.avanceFisico, proyecto.avanceFinanciero, proyecto.estado);
  if (!s) return null;
  const map = { VERDE:{bg:'#d1fae5',text:'#065f46',label:'✅ Normal'}, AMARILLO:{bg:'#fef3c7',text:'#92400e',label:'⚠️ Alerta'}, ROJO:{bg:'#fee2e2',text:'#991b1b',label:'🔴 Crítico'} };
  const m = map[s];
  return <span style={{background:m.bg,color:m.text,borderRadius:6,padding:'2px 10px',fontSize:12,fontWeight:700}}>{m.label}</span>;
}
function AvanceBar({ fisico, financiero, showLabels=true }) {
  const brecha = Math.abs(fisico - financiero);
  return (
    <div style={{width:'100%'}}>
      {showLabels && (
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:12}}>
          <span>🏗️ Físico: <b style={{color:'#059669'}}>{fisico}%</b></span>
          <span>💰 Financiero: <b style={{color:'#2563eb'}}>{financiero}%</b></span>
          {brecha>15 && <span style={{color:'#d97706',fontWeight:700}}>⚠ {brecha}pp</span>}
        </div>
      )}
      <div style={{height:7,background:'#f0fdf4',borderRadius:4,overflow:'hidden',marginBottom:3}}>
        <div style={{width:`${fisico}%`,height:'100%',background:'#10b981',borderRadius:4,transition:'width .5s'}}/>
      </div>
      <div style={{height:7,background:'#eff6ff',borderRadius:4,overflow:'hidden'}}>
        <div style={{width:`${financiero}%`,height:'100%',background:'#3b82f6',borderRadius:4,transition:'width .5s'}}/>
      </div>
    </div>
  );
}
function Card({ children, title, subtitle, extra, style={} }) {
  return (
    <div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.08)',border:'1px solid #e5e7eb',overflow:'hidden',...style}}>
      {(title||extra) && (
        <div style={{padding:'16px 20px 0',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            {title && <h3 style={{margin:0,fontSize:15,fontWeight:700,color:'#111827'}}>{title}</h3>}
            {subtitle && <p style={{margin:'2px 0 0',fontSize:12,color:'#6b7280'}}>{subtitle}</p>}
          </div>
          {extra && <div>{extra}</div>}
        </div>
      )}
      <div style={{padding:20}}>{children}</div>
    </div>
  );
}
function KPICard({ icon, label, value, sub, color='#2563eb' }) {
  return (
    <div style={{background:'#fff',borderRadius:12,padding:'18px 20px',boxShadow:'0 1px 4px rgba(0,0,0,0.08)',border:'1px solid #e5e7eb',display:'flex',flexDirection:'column',gap:8}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <span style={{background:`${color}18`,color,borderRadius:8,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{icon}</span>
        <span style={{fontSize:12,color:'#6b7280',fontWeight:500}}>{label}</span>
      </div>
      <div style={{fontSize:26,fontWeight:800,color:'#111827',lineHeight:1}}>{value}</div>
      {sub && <div style={{fontSize:12,color:'#9ca3af'}}>{sub}</div>}
    </div>
  );
}
function SearchInput({ value, onChange, placeholder='Buscar...' }) {
  return (
    <div style={{position:'relative'}}>
      <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#9ca3af',fontSize:15}}>🔍</span>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{paddingLeft:34,paddingRight:12,paddingTop:8,paddingBottom:8,border:'1px solid #d1d5db',borderRadius:8,fontSize:14,outline:'none',width:240,background:'#fafafa'}}/>
    </div>
  );
}
function Sel({ value, onChange, options, style={} }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{padding:'7px 12px',border:'1px solid #d1d5db',borderRadius:8,fontSize:13,background:'#fafafa',cursor:'pointer',outline:'none',...style}}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function Tbl({ columns, data, onRow }) {
  return (
    <div style={{overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
        <thead>
          <tr style={{background:'#f9fafb',borderBottom:'2px solid #e5e7eb'}}>
            {columns.map((c,i)=><th key={i} style={{padding:'10px 14px',textAlign:'left',fontWeight:700,color:'#374151',whiteSpace:'nowrap',fontSize:12}}>{c.title}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row,ri)=>(
            <tr key={ri} onClick={onRow?()=>onRow(row):undefined}
              style={{borderBottom:'1px solid #f3f4f6',cursor:onRow?'pointer':'default',background:ri%2===0?'#fff':'#fafafa'}}
              onMouseEnter={e=>{if(onRow)e.currentTarget.style.background='#eff6ff'}}
              onMouseLeave={e=>{if(onRow)e.currentTarget.style.background=ri%2===0?'#fff':'#fafafa'}}>
              {columns.map((c,ci)=>(
                <td key={ci} style={{padding:'10px 14px',verticalAlign:'middle'}}>
                  {c.render?c.render(row[c.key],row):row[c.key]}
                </td>
              ))}
            </tr>
          ))}
          {data.length===0 && <tr><td colSpan={columns.length} style={{textAlign:'center',padding:40,color:'#9ca3af'}}>Sin resultados</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
function Modal({ open, onClose, title, children, width=780 }) {
  if (!open) return null;
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:width,maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #e5e7eb',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:'#111827'}}>{title}</h2>
          <button onClick={onClose} style={{border:'none',background:'#f3f4f6',borderRadius:8,width:32,height:32,cursor:'pointer',fontSize:16}}>✕</button>
        </div>
        <div style={{overflow:'auto',padding:20,flex:1}}>{children}</div>
      </div>
    </div>
  );
}
function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{display:'flex',borderBottom:'2px solid #e5e7eb',marginBottom:20,gap:0,overflowX:'auto'}}>
      {tabs.map(t=>(
        <button key={t.key} onClick={()=>onChange(t.key)} style={{padding:'10px 18px',border:'none',background:'transparent',cursor:'pointer',fontSize:13,fontWeight:active===t.key?700:500,color:active===t.key?'#2563eb':'#6b7280',borderBottom:active===t.key?'2px solid #2563eb':'2px solid transparent',marginBottom:-2,whiteSpace:'nowrap'}}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
function InfoRow({ label, value }) {
  return (
    <div style={{display:'flex',borderBottom:'1px solid #f3f4f6',padding:'10px 0'}}>
      <div style={{width:200,fontSize:12,color:'#6b7280',fontWeight:600,flexShrink:0}}>{label}</div>
      <div style={{fontSize:13,color:'#111827',flex:1}}>{value}</div>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function DashboardPage() {
  const vigencia = React.useContext(VigenciaContext);
  const totalInversion = PROYECTOS.reduce((a,p)=>{const e=p.ejecucion.find(e=>e.vigencia===vigencia);return a+(e?.apropiacion||0);},0);
  const totalPagado   = PROYECTOS.reduce((a,p)=>{const e=p.ejecucion.find(e=>e.vigencia===vigencia);return a+(e?.pagos||0);},0);
  const enEjecucion   = PROYECTOS.filter(p=>p.estado==='EJECUCION');
  const avgFis  = enEjecucion.length ? Math.round(enEjecucion.reduce((a,p)=>a+p.avanceFisico,0)/enEjecucion.length) : 0;
  const avgFin  = enEjecucion.length ? Math.round(enEjecucion.reduce((a,p)=>a+p.avanceFinanciero,0)/enEjecucion.length) : 0;
  const alertas = enEjecucion.filter(p=>Math.abs(p.avanceFisico-p.avanceFinanciero)>15).length;

  const porSector = Object.entries(SECTORES).map(([key,cfg])=>{
    const ps=PROYECTOS.filter(p=>p.sector===key); if(!ps.length) return null;
    const ap=ps.reduce((a,p)=>{const e=p.ejecucion.find(e=>e.vigencia===vigencia);return a+(e?.apropiacion||0);},0);
    const pg=ps.reduce((a,p)=>{const e=p.ejecucion.find(e=>e.vigencia===vigencia);return a+(e?.pagos||0);},0);
    const ej=ps.filter(p=>p.estado==='EJECUCION');
    const af=ej.length?Math.round(ej.reduce((a,p)=>a+p.avanceFisico,0)/ej.length):0;
    return {sector:cfg.label,apropiacion:ap/1e9,pagos:pg/1e9,avanceFisico:af,count:ps.length,color:cfg.color};
  }).filter(Boolean);

  const fuentesData = Object.entries(FUENTES).map(([key,cfg])=>{
    const t=PROYECTOS.reduce((a,p)=>{const f=p.fuentes.find(f=>f.f===key);return a+(f?.monto||0);},0);
    return {name:cfg.label,value:t/1e9,color:cfg.color};
  }).filter(d=>d.value>0);

  const estadosData = Object.entries(ESTADOS).map(([key,cfg])=>({
    estado:cfg.label, count:PROYECTOS.filter(p=>p.estado===key).length, color:cfg.color
  })).filter(d=>d.count>0);

  const proyAlerta = enEjecucion
    .map(p=>({...p,brecha:Math.abs(p.avanceFisico-p.avanceFinanciero)}))
    .filter(p=>p.brecha>5).sort((a,b)=>b.brecha-a.brecha).slice(0,5);

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{margin:0,fontSize:22,fontWeight:800,color:'#111827'}}>📊 Dashboard Ejecutivo</h1>
        <p style={{margin:'4px 0 0',color:'#6b7280',fontSize:14}}>{PDM.municipio} · Vigencia {vigencia} · PDM {PDM.periodo} "{PDM.nombre}"</p>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))',gap:16,marginBottom:24}}>
        <KPICard icon="📁" label="Total Proyectos"        value={PROYECTOS.length} sub={`${enEjecucion.length} en ejecución`} color="#2563eb"/>
        <KPICard icon="💰" label={`Inversión ${vigencia}`}   value={formatCOP(totalInversion)} sub="Apropiación vigente" color="#059669"/>
        <KPICard icon="✅" label="Pagos acumulados"        value={formatCOP(totalPagado)} sub={`${totalInversion?((totalPagado/totalInversion)*100).toFixed(1):0}% ejecutado`} color="#7c3aed"/>
        <KPICard icon="🏗️" label="Avance Físico Prom."    value={`${avgFis}%`} sub="Proyectos activos" color="#0891b2"/>
        <KPICard icon="📈" label="Avance Financiero Prom." value={`${avgFin}%`} sub="Proyectos activos" color="#f59e0b"/>
        <KPICard icon="⚠️" label="Alertas Activas"         value={alertas} sub="Brecha >15pp" color="#ef4444"/>
      </div>

      {/* Tendencia mensual */}
      <Card title={`Tendencia de Ejecución Presupuestal ${vigencia}`} subtitle="Apropiado vs Comprometido vs Pagado — miles de millones COP" style={{marginBottom:20}}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={TENDENCIA_MENSUAL} margin={{top:5,right:10,left:0,bottom:0}}>
            <defs>
              <linearGradient id="gAp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#93c5fd" stopOpacity={0.4}/><stop offset="95%" stopColor="#93c5fd" stopOpacity={0}/></linearGradient>
              <linearGradient id="gCo" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
              <linearGradient id="gPg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
            <XAxis dataKey="mes" tick={{fontSize:11}}/>
            <YAxis tick={{fontSize:11}} tickFormatter={v=>`$${v}B`}/>
            <Tooltip formatter={(v,n)=>[`$${v}B`,{apropiado:'Apropiado',comprometido:'Comprometido',pagado:'Pagado'}[n]||n]}/>
            <Legend/>
            <Area type="monotone" dataKey="apropiado"    stroke="#93c5fd" fill="url(#gAp)" strokeWidth={2} name="apropiado"/>
            <Area type="monotone" dataKey="comprometido" stroke="#8b5cf6" fill="url(#gCo)" strokeWidth={2} name="comprometido"/>
            <Area type="monotone" dataKey="pagado"       stroke="#10b981" fill="url(#gPg)" strokeWidth={2} name="pagado"/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
        <Card title={`Ejecución por Sector (${vigencia})`} subtitle="Apropiado vs Pagado — $B COP">
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={porSector} margin={{top:5,right:5,left:0,bottom:65}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="sector" tick={{fontSize:10}} angle={-38} textAnchor="end" interval={0}/>
              <YAxis tick={{fontSize:11}} tickFormatter={v=>`$${v.toFixed(1)}B`}/>
              <Tooltip formatter={(v,n)=>[`$${v.toFixed(2)}B`,n==='apropiacion'?'Apropiado':'Pagado']}/>
              <Legend verticalAlign="top"/>
              <Bar dataKey="apropiacion" name="Apropiado" fill="#93c5fd" radius={[3,3,0,0]}/>
              <Bar dataKey="pagos"       name="Pagado"    fill="#2563eb" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Fuentes de Financiación" subtitle="Distribución inversión total">
          <ResponsiveContainer width="100%" height={270}>
            <PieChart>
              <Pie data={fuentesData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={40}>
                {fuentesData.map((d,i)=><Cell key={i} fill={d.color}/>)}
              </Pie>
              <Tooltip formatter={v=>`$${v.toFixed(2)}B`}/>
              <Legend iconType="circle" iconSize={10}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20,marginBottom:20}}>
        {/* Radar PDM */}
        <Card title="Cumplimiento PDM por Dimensión" subtitle="Avance 2024 vs meta cuatrienio">
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={PDM.indicadoresRadar} cx="50%" cy="50%" outerRadius={90}>
              <PolarGrid/>
              <PolarAngleAxis dataKey="eje" tick={{fontSize:11}}/>
              <Radar name="Logrado" dataKey="logrado" stroke="#2563eb" fill="#2563eb" fillOpacity={0.25} strokeWidth={2}/>
              <Radar name="Meta"    dataKey="meta"    stroke="#10b981" fill="#10b981" fillOpacity={0.08} strokeWidth={1} strokeDasharray="5 5"/>
              <Legend/>
              <Tooltip formatter={v=>`${v}%`}/>
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        {/* Estado proyectos */}
        <Card title="Estado Proyectos" subtitle="Por tipo">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={estadosData} dataKey="count" nameKey="estado" cx="50%" cy="50%" innerRadius={45} outerRadius={90}>
                {estadosData.map((d,i)=><Cell key={i} fill={d.color}/>)}
              </Pie>
              <Tooltip/>
              <Legend iconType="circle" iconSize={10}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Alertas */}
      {proyAlerta.length>0 && (
        <Card title="⚠️ Proyectos con Brecha Físico / Financiero" subtitle="Requieren seguimiento especial">
          {proyAlerta.map(p=>(
            <div key={p.id} style={{padding:'12px 16px',borderRadius:8,border:`1px solid ${p.brecha>25?'#fca5a5':'#fed7aa'}`,background:p.brecha>25?'#fff5f5':'#fffbeb',marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <div style={{fontWeight:700,fontSize:13,color:'#111827'}}>{p.nombre}</div>
                  <div style={{fontSize:12,color:'#6b7280',marginTop:2}}>{SECTORES[p.sector]?.icon} {SECTORES[p.sector]?.label} · BPIN {formatBPIN(p.bpin)}</div>
                </div>
                <span style={{background:p.brecha>25?'#fee2e2':'#fef3c7',color:p.brecha>25?'#991b1b':'#92400e',padding:'2px 10px',borderRadius:20,fontSize:12,fontWeight:700}}>
                  Brecha: {p.brecha}pp
                </span>
              </div>
              <AvanceBar fisico={p.avanceFisico} financiero={p.avanceFinanciero}/>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ============================================================
// SEMÁFORO PAGE
// ============================================================
function SemaforoPage({ onSelect }) {
  const vigencia = React.useContext(VigenciaContext);
  const grupos = {
    VERDE:   PROYECTOS.filter(p=>semaforoColor(p.avanceFisico,p.avanceFinanciero,p.estado)==='VERDE'),
    AMARILLO:PROYECTOS.filter(p=>semaforoColor(p.avanceFisico,p.avanceFinanciero,p.estado)==='AMARILLO'),
    ROJO:    PROYECTOS.filter(p=>semaforoColor(p.avanceFisico,p.avanceFinanciero,p.estado)==='ROJO'),
  };
  const cfg = {
    VERDE:   {label:'Ejecución Normal',    bg:'#d1fae5',border:'#6ee7b7',text:'#065f46',dot:'#10b981'},
    AMARILLO:{label:'En Seguimiento',      bg:'#fef3c7',border:'#fcd34d',text:'#92400e',dot:'#f59e0b'},
    ROJO:    {label:'Atención Prioritaria', bg:'#fee2e2',border:'#fca5a5',text:'#991b1b',dot:'#ef4444'},
  };

  return (
    <div>
      <div style={{marginBottom:20}}>
        <h1 style={{margin:0,fontSize:22,fontWeight:800,color:'#111827'}}>🚦 Semáforo de Proyectos</h1>
        <p style={{margin:'4px 0 0',color:'#6b7280',fontSize:14}}>Estado de riesgo de proyectos en ejecución · Vigencia {vigencia}</p>
      </div>
      {/* Resumen */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:24}}>
        {Object.entries(grupos).map(([k,ps])=>(
          <div key={k} style={{background:cfg[k].bg,border:`2px solid ${cfg[k].border}`,borderRadius:12,padding:'16px 20px',textAlign:'center'}}>
            <div style={{fontSize:32,marginBottom:4}}>{k==='VERDE'?'✅':k==='AMARILLO'?'⚠️':'🔴'}</div>
            <div style={{fontSize:24,fontWeight:800,color:cfg[k].text}}>{ps.length}</div>
            <div style={{fontSize:13,fontWeight:600,color:cfg[k].text}}>{cfg[k].label}</div>
          </div>
        ))}
      </div>
      {/* Cards por grupo */}
      {Object.entries(grupos).map(([k,ps])=>{
        if (!ps.length) return null;
        return (
          <div key={k} style={{marginBottom:24}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <div style={{width:14,height:14,borderRadius:'50%',background:cfg[k].dot}}/>
              <h3 style={{margin:0,fontSize:15,fontWeight:700,color:cfg[k].text}}>{cfg[k].label} ({ps.length})</h3>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))',gap:12}}>
              {ps.map(p=>(
                <div key={p.id} onClick={()=>onSelect(p)}
                  style={{background:'#fff',borderRadius:10,padding:'14px 16px',border:`1px solid ${cfg[k].border}`,cursor:'pointer',borderLeft:`4px solid ${cfg[k].dot}`}}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:'#111827',marginBottom:2}}>{p.nombre}</div>
                      <div style={{fontSize:11,color:'#9ca3af'}}><SectorBadge sector={p.sector}/> · BPIN {formatBPIN(p.bpin)}</div>
                    </div>
                    <div style={{fontSize:12,color:'#6b7280',whiteSpace:'nowrap',marginLeft:8}}>
                      Brecha: <b style={{color:cfg[k].dot}}>{Math.abs(p.avanceFisico-p.avanceFinanciero)}pp</b>
                    </div>
                  </div>
                  <AvanceBar fisico={p.avanceFisico} financiero={p.avanceFinanciero}/>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {Object.values(grupos).every(g=>g.length===0) && (
        <div style={{textAlign:'center',padding:60,color:'#9ca3af'}}>No hay proyectos en ejecución registrados.</div>
      )}
    </div>
  );
}

// ============================================================
// FORMULARIO PROYECTO (crear / editar)
// ============================================================
function BuscadorCatalogoDNP({ onSelect }) {
  const [q, setQ] = useState('');
  const resultados = useMemo(() => {
    if (q.trim().length < 2) return [];
    const t = q.toLowerCase();
    return CATALOGO_PRODUCTOS.filter(p =>
      p[0].includes(t) || p[1].toLowerCase().includes(t)
    ).slice(0, 8);
  }, [q]);
  return (
    <div style={{position:'relative'}}>
      <div style={{fontSize:11,fontWeight:600,color:'#374151',marginBottom:4}}>Buscar Código de Producto DNP</div>
      <input value={q} onChange={e=>setQ(e.target.value)}
        placeholder="Ej: 2402 — vía terciaria..."
        style={{width:'100%',padding:'8px 12px',border:'1px solid #d1d5db',borderRadius:8,fontSize:13,outline:'none',background:'#fafafa',boxSizing:'border-box'}}/>
      {resultados.length > 0 && (
        <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1px solid #d1d5db',borderRadius:8,boxShadow:'0 8px 24px rgba(0,0,0,0.12)',zIndex:50,maxHeight:280,overflowY:'auto',marginTop:2}}>
          {resultados.map((p,i)=>(
            <div key={i} onClick={()=>{onSelect(p);setQ('');}}
              style={{padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid #f3f4f6',display:'flex',gap:10,alignItems:'flex-start'}}
              onMouseEnter={e=>e.currentTarget.style.background='#f0f9ff'}
              onMouseLeave={e=>e.currentTarget.style.background=''}>
              <code style={{fontFamily:'monospace',fontSize:11,background:'#eff6ff',padding:'2px 6px',borderRadius:4,color:'#1e3a5f',fontWeight:700,whiteSpace:'nowrap',marginTop:1}}>{p[0]}</code>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:'#111827',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p[1]}</div>
                <div style={{fontSize:10,color:'#6b7280',marginTop:1}}>
                  {CATALOGO_SECTORES[p[2]]||p[2]} · Ind: {p[5].slice(0,50)}… · {p[6]}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {q.trim().length >= 2 && resultados.length === 0 && (
        <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1px solid #d1d5db',borderRadius:8,boxShadow:'0 4px 12px rgba(0,0,0,0.08)',zIndex:50,padding:'12px 14px',fontSize:12,color:'#9ca3af',marginTop:2}}>
          Sin coincidencias en el catálogo DNP
        </div>
      )}
    </div>
  );
}

function ProyectoForm({ proyecto, onSave, onCancel }) {
  const esNuevo = !proyecto;
  const [form, setForm] = useState(proyecto ? { ...proyecto } : {
    bpin:'', nombre:'', descripcion:'', objetivo:'',
    sector:'EDUCACION', subsector:'', estado:'FORMULACION',
    vigenciaInicio:2025, vigenciaFin:2025, valorTotal:'',
    fuentes:[{f:'SGP',monto:''}],
    pdm:{ eje:'Eje 1: Municipio Educado y Saludable', programa:'', meta:'' },
    avanceFisico:0, avanceFinanciero:0,
    ejecucion:[], hitos:[], contrato:null,
    codigoProductoDNP:'', indicadorDNP:'', unidadDNP:'',
  });
  const [errors, setErrors] = useState({});

  const set = (key, val) => setForm(f=>({...f,[key]:val}));
  const setNestedPdm = (key, val) => setForm(f=>({...f,pdm:{...f.pdm,[key]:val}}));

  const validate = () => {
    const e={};
    if (!form.bpin || !/^\d{14}$/.test(form.bpin)) e.bpin='BPIN debe tener 14 dígitos numéricos';
    if (!form.nombre.trim()) e.nombre='Nombre requerido';
    if (!form.valorTotal || isNaN(Number(form.valorTotal)) || Number(form.valorTotal)<=0) e.valorTotal='Valor debe ser mayor a 0';
    if (!form.fuentes.length || form.fuentes.some(f=>!f.monto||isNaN(Number(f.monto)))) e.fuentes='Complete todas las fuentes';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const saved = {
      ...form,
      id: esNuevo ? `PRY-${String(PROYECTOS.length+1).padStart(3,'0')}` : form.id,
      valorTotal: Number(form.valorTotal),
      fuentes: form.fuentes.map(f=>({...f,monto:Number(f.monto)})),
    };
    if (esNuevo) PROYECTOS.push(saved);
    else { const idx=PROYECTOS.findIndex(p=>p.id===saved.id); if(idx>=0) PROYECTOS[idx]=saved; }
    onSave(saved);
  };

  const addFuente = ()=>setForm(f=>({...f,fuentes:[...f.fuentes,{f:'RECURSOS_PROPIOS',monto:''}]}));
  const removeFuente = i=>setForm(f=>({...f,fuentes:f.fuentes.filter((_,j)=>j!==i)}));

  const fieldStyle = { width:'100%', padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', background:'#fafafa' };
  const labelStyle = { fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 };
  const errStyle   = { fontSize:11, color:'#ef4444', marginTop:3 };

  return (
    <div>
      {/* Buscador Catálogo DNP */}
      <div style={{background:'#eff6ff',borderRadius:10,padding:'14px 16px',marginBottom:16,border:'1px solid #bfdbfe'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <span style={{fontSize:16}}>📚</span>
          <span style={{fontSize:12,fontWeight:700,color:'#1e40af'}}>Catálogo DNP — Código de Producto Estandarizado</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:12,alignItems:'start'}}>
          <BuscadorCatalogoDNP onSelect={p=>{
            set('codigoProductoDNP', p[0]);
            set('indicadorDNP', p[5]);
            set('unidadDNP', p[6]);
            if (!form.nombre) set('nombre', p[1]);
          }}/>
          <div style={{paddingTop:18}}>
            {form.codigoProductoDNP ? (
              <div style={{background:'#fff',border:'1px solid #bfdbfe',borderRadius:8,padding:'8px 12px',minWidth:200}}>
                <div style={{fontSize:10,color:'#6b7280',marginBottom:2}}>Producto seleccionado</div>
                <code style={{fontFamily:'monospace',fontSize:13,fontWeight:800,color:'#1e3a5f'}}>{form.codigoProductoDNP}</code>
                <div style={{fontSize:11,color:'#374151',marginTop:2}}>{form.indicadorDNP.slice(0,50)}{form.indicadorDNP.length>50?'…':''}</div>
                <div style={{fontSize:10,color:'#059669',fontWeight:600,marginTop:1}}>Unidad: {form.unidadDNP}</div>
              </div>
            ) : (
              <div style={{fontSize:11,color:'#93c5fd',fontStyle:'italic',paddingTop:4}}>Sin producto seleccionado</div>
            )}
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        {/* BPIN */}
        <div>
          <label style={labelStyle}>Código BPIN *</label>
          <input style={{...fieldStyle,borderColor:errors.bpin?'#ef4444':'#d1d5db'}} value={form.bpin}
            onChange={e=>set('bpin',e.target.value.replace(/\D/g,'').slice(0,14))} placeholder="Ej: 20250000000816" maxLength={14}/>
          {errors.bpin && <div style={errStyle}>{errors.bpin}</div>}
          <div style={{fontSize:11,color:'#9ca3af',marginTop:2}}>Formato: {form.bpin.length===14?formatBPIN(form.bpin):'14 dígitos numéricos'}</div>
        </div>
        {/* Estado */}
        <div>
          <label style={labelStyle}>Estado</label>
          <Sel value={form.estado} onChange={v=>set('estado',v)}
            options={Object.entries(ESTADOS).map(([k,v])=>({value:k,label:v.label}))} style={{width:'100%'}}/>
        </div>
        {/* Nombre */}
        <div style={{gridColumn:'1/-1'}}>
          <label style={labelStyle}>Nombre del Proyecto *</label>
          <input style={{...fieldStyle,borderColor:errors.nombre?'#ef4444':'#d1d5db'}} value={form.nombre}
            onChange={e=>set('nombre',e.target.value)} placeholder="Ej: Construcción..."/>
          {errors.nombre && <div style={errStyle}>{errors.nombre}</div>}
        </div>
        {/* Descripción */}
        <div style={{gridColumn:'1/-1'}}>
          <label style={labelStyle}>Descripción</label>
          <textarea style={{...fieldStyle,minHeight:70,resize:'vertical'}} value={form.descripcion}
            onChange={e=>set('descripcion',e.target.value)} placeholder="Descripción del proyecto..."/>
        </div>
        {/* Objetivo */}
        <div style={{gridColumn:'1/-1'}}>
          <label style={labelStyle}>Objetivo General</label>
          <textarea style={{...fieldStyle,minHeight:55,resize:'vertical'}} value={form.objetivo}
            onChange={e=>set('objetivo',e.target.value)} placeholder="Objetivo..."/>
        </div>
        {/* Sector */}
        <div>
          <label style={labelStyle}>Sector</label>
          <Sel value={form.sector} onChange={v=>set('sector',v)}
            options={Object.entries(SECTORES).map(([k,v])=>({value:k,label:`${v.icon} ${v.label}`}))} style={{width:'100%'}}/>
        </div>
        {/* Subsector */}
        <div>
          <label style={labelStyle}>Subsector</label>
          <input style={fieldStyle} value={form.subsector} onChange={e=>set('subsector',e.target.value)} placeholder="Ej: Infraestructura Educativa"/>
        </div>
        {/* Vigencias */}
        <div>
          <label style={labelStyle}>Vigencia Inicio</label>
          <Sel value={form.vigenciaInicio} onChange={v=>set('vigenciaInicio',parseInt(v))}
            options={[2023,2024,2025,2026,2027].map(y=>({value:y,label:y}))} style={{width:'100%'}}/>
        </div>
        <div>
          <label style={labelStyle}>Vigencia Fin</label>
          <Sel value={form.vigenciaFin} onChange={v=>set('vigenciaFin',parseInt(v))}
            options={[2023,2024,2025,2026,2027,2028].map(y=>({value:y,label:y}))} style={{width:'100%'}}/>
        </div>
        {/* Valor Total */}
        <div style={{gridColumn:'1/-1'}}>
          <label style={labelStyle}>Valor Total (COP) *</label>
          <input type="number" style={{...fieldStyle,borderColor:errors.valorTotal?'#ef4444':'#d1d5db'}}
            value={form.valorTotal} onChange={e=>set('valorTotal',e.target.value)} placeholder="Ej: 1500000000"/>
          {errors.valorTotal && <div style={errStyle}>{errors.valorTotal}</div>}
          {form.valorTotal>0 && <div style={{fontSize:11,color:'#059669',marginTop:2}}>≈ {formatCOP(Number(form.valorTotal))}</div>}
        </div>
      </div>

      {/* Fuentes de financiación */}
      <div style={{marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <label style={labelStyle}>Fuentes de Financiación *</label>
          <button onClick={addFuente} style={{fontSize:12,padding:'4px 10px',background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:6,cursor:'pointer',color:'#2563eb',fontWeight:600}}>+ Agregar</button>
        </div>
        {form.fuentes.map((f,i)=>(
          <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:10,marginBottom:8,alignItems:'flex-end'}}>
            <Sel value={f.f} onChange={v=>setForm(fm=>({...fm,fuentes:fm.fuentes.map((ff,j)=>j===i?{...ff,f:v}:ff)}))}
              options={Object.entries(FUENTES).map(([k,v])=>({value:k,label:v.full}))} style={{width:'100%'}}/>
            <div>
              <input type="number" style={fieldStyle} value={f.monto} placeholder="Monto COP"
                onChange={e=>setForm(fm=>({...fm,fuentes:fm.fuentes.map((ff,j)=>j===i?{...ff,monto:e.target.value}:ff)}))}/>
              {f.monto>0 && <div style={{fontSize:11,color:'#059669',marginTop:1}}>{formatCOP(Number(f.monto))}</div>}
            </div>
            {form.fuentes.length>1 && <button onClick={()=>removeFuente(i)} style={{padding:'7px 10px',background:'#fee2e2',border:'none',borderRadius:6,cursor:'pointer',color:'#ef4444',fontWeight:700}}>✕</button>}
          </div>
        ))}
        {errors.fuentes && <div style={errStyle}>{errors.fuentes}</div>}
      </div>

      {/* PDM */}
      <div style={{marginBottom:16,padding:'14px 16px',background:'#f0f4f8',borderRadius:10}}>
        <label style={{...labelStyle,marginBottom:10,color:'#1e3a5f'}}>🎯 Alineación PDM</label>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div style={{gridColumn:'1/-1'}}>
            <label style={labelStyle}>Eje Estratégico</label>
            <Sel value={form.pdm.eje} onChange={v=>setNestedPdm('eje',v)}
              options={PDM.ejes.map(e=>({value:e.nombre,label:e.nombre}))} style={{width:'100%'}}/>
          </div>
          <div>
            <label style={labelStyle}>Programa</label>
            <input style={fieldStyle} value={form.pdm.programa} onChange={e=>setNestedPdm('programa',e.target.value)} placeholder="Nombre del programa"/>
          </div>
          <div>
            <label style={labelStyle}>Meta PDM</label>
            <input style={fieldStyle} value={form.pdm.meta} onChange={e=>setNestedPdm('meta',e.target.value)} placeholder="Meta que contribuye"/>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div style={{display:'flex',gap:12,justifyContent:'flex-end',paddingTop:8,borderTop:'1px solid #e5e7eb'}}>
        <button onClick={onCancel} style={{padding:'9px 20px',background:'#f3f4f6',border:'1px solid #d1d5db',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,color:'#374151'}}>
          Cancelar
        </button>
        <button onClick={handleSubmit} style={{padding:'9px 20px',background:'#2563eb',border:'none',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:700,color:'#fff'}}>
          {esNuevo?'✅ Registrar Proyecto':'💾 Guardar Cambios'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// PROYECTOS PAGE
// ============================================================
function ProyectosPage({ onSelect, onNew }) {
  const vigencia = React.useContext(VigenciaContext);
  const [search,  setSearch]  = useState('');
  const [filtroS, setFiltroS] = useState('');
  const [filtroE, setFiltroE] = useState('');
  const [vista,   setVista]   = useState('tabla'); // tabla | tarjetas

  const filtered = useMemo(()=>PROYECTOS.filter(p=>{
    if(filtroS && p.sector!==filtroS) return false;
    if(filtroE && p.estado!==filtroE) return false;
    if(search){ const q=search.toLowerCase(); return p.nombre.toLowerCase().includes(q)||p.bpin.includes(q); }
    return true;
  }),[search,filtroS,filtroE]);

  const totalAp = filtered.reduce((a,p)=>{const e=p.ejecucion.find(e=>e.vigencia===vigencia);return a+(e?.apropiacion||0);},0);

  const cols = [
    {title:'BPIN', key:'bpin', render:v=><code style={{fontSize:12,color:'#6b7280'}}>{formatBPIN(v)}</code>},
    {title:'Proyecto', key:'nombre', render:(v,r)=>(
      <div><div style={{fontWeight:600,color:'#111827',fontSize:13}}>{v}</div><SectorBadge sector={r.sector}/></div>
    )},
    {title:'Estado',   key:'estado',  render:v=><EstadoBadge estado={v}/>},
    {title:'Semáforo', key:'avanceFisico', render:(_,r)=><SemaforoBadge proyecto={r}/>},
    {title:'Vigencia', key:'vigenciaInicio', render:(v,r)=>`${v}${r.vigenciaFin!==v?'–'+r.vigenciaFin:''}`},
    {title:'Valor Total', key:'valorTotal', render:v=><span style={{fontWeight:700}}>{formatCOP(v)}</span>},
    {title:'Avance', key:'avanceFisico', render:(v,r)=>r.estado==='EJECUCION'?<AvanceBar fisico={v} financiero={r.avanceFinanciero}/>:<span style={{color:'#9ca3af'}}>—</span>},
    {title:'', key:'id', render:(_,r)=>(
      <button onClick={()=>onSelect(r)} style={{padding:'5px 12px',background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:6,color:'#2563eb',cursor:'pointer',fontSize:12,fontWeight:600}}>Ver →</button>
    )},
  ];

  return (
    <div>
      <div style={{marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:800,color:'#111827'}}>📁 Proyectos de Inversión</h1>
          <p style={{margin:'4px 0 0',color:'#6b7280',fontSize:14}}>{filtered.length} proyectos · {formatCOP(totalAp)} apropiados 2024</p>
        </div>
        <button onClick={onNew} style={{padding:'9px 18px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:700}}>
          + Nuevo Proyecto
        </button>
      </div>
      <Card>
        <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap',alignItems:'center'}}>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar nombre o BPIN..."/>
          <Sel value={filtroS} onChange={setFiltroS} options={[{value:'',label:'Todos los sectores'},...Object.entries(SECTORES).map(([k,v])=>({value:k,label:v.label}))]}/>
          <Sel value={filtroE} onChange={setFiltroE} options={[{value:'',label:'Todos los estados'},...Object.entries(ESTADOS).map(([k,v])=>({value:k,label:v.label}))]}/>
          {(filtroS||filtroE||search) && (
            <button onClick={()=>{setFiltroS('');setFiltroE('');setSearch('');}} style={{padding:'6px 12px',background:'#fef3c7',border:'1px solid #fcd34d',borderRadius:6,cursor:'pointer',fontSize:12,color:'#92400e',fontWeight:600}}>✕ Limpiar</button>
          )}
          <div style={{marginLeft:'auto',display:'flex',gap:6}}>
            {['tabla','tarjetas'].map(v=>(
              <button key={v} onClick={()=>setVista(v)} style={{padding:'6px 12px',borderRadius:6,border:'1px solid #d1d5db',cursor:'pointer',fontSize:12,fontWeight:600,background:vista===v?'#1e3a5f':'#fff',color:vista===v?'#fff':'#374151'}}>
                {v==='tabla'?'☰ Tabla':'⊞ Tarjetas'}
              </button>
            ))}
          </div>
        </div>

        {vista==='tabla' && <Tbl columns={cols} data={filtered} onRow={onSelect}/>}
        {vista==='tarjetas' && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
            {filtered.map(p=>{
              const sec=SECTORES[p.sector]||{};
              return (
                <div key={p.id} onClick={()=>onSelect(p)}
                  style={{borderRadius:10,border:'1px solid #e5e7eb',padding:'14px 16px',cursor:'pointer',background:'#fff',borderLeft:`4px solid ${sec.color}`}}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#111827',flex:1,marginRight:8}}>{p.nombre}</div>
                    <EstadoBadge estado={p.estado}/>
                  </div>
                  <div style={{fontSize:12,color:'#6b7280',marginBottom:6}}>{sec.icon} {sec.label} · BPIN {formatBPIN(p.bpin)}</div>
                  <div style={{fontSize:14,fontWeight:800,color:'#059669',marginBottom:8}}>{formatCOP(p.valorTotal)}</div>
                  {p.estado==='EJECUCION' && <AvanceBar fisico={p.avanceFisico} financiero={p.avanceFinanciero}/>}
                  <div style={{marginTop:8,display:'flex',justifyContent:'space-between',fontSize:11,color:'#9ca3af'}}>
                    <span>Vigencia {p.vigenciaInicio}{p.vigenciaFin!==p.vigenciaInicio?'–'+p.vigenciaFin:''}</span>
                    <SemaforoBadge proyecto={p}/>
                  </div>
                </div>
              );
            })}
            {!filtered.length && <div style={{textAlign:'center',padding:40,color:'#9ca3af',gridColumn:'1/-1'}}>Sin resultados</div>}
          </div>
        )}
      </Card>
    </div>
  );
}

// ============================================================
// PROYECTO DETALLE
// ============================================================
function ProyectoDetalle({ proyecto, onBack, onEdit }) {
  const [tab, setTab] = useState('general');
  const tabs=[
    {key:'general',    label:'📋 Ficha General'},
    {key:'fisico',     label:'🏗️ Seg. Físico'},
    {key:'financiero', label:'💰 Seg. Financiero'},
    {key:'pdm',        label:'🎯 PDM'},
  ];

  return (
    <div>
      <div style={{display:'flex',gap:10,marginBottom:16,alignItems:'center'}}>
        <button onClick={onBack} style={{padding:'6px 14px',background:'#f3f4f6',border:'1px solid #d1d5db',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,color:'#374151'}}>← Volver</button>
        <button onClick={()=>onEdit(proyecto)} style={{padding:'6px 14px',background:'#fffbeb',border:'1px solid #fcd34d',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,color:'#92400e'}}>✏️ Editar</button>
      </div>

      <div style={{background:'#fff',borderRadius:12,padding:'20px 24px',marginBottom:20,border:'1px solid #e5e7eb',boxShadow:'0 1px 4px rgba(0,0,0,0.08)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:8}}>
              <EstadoBadge estado={proyecto.estado}/>
              <SectorBadge sector={proyecto.sector}/>
              <SemaforoBadge proyecto={proyecto}/>
              <code style={{background:'#f3f4f6',padding:'2px 8px',borderRadius:4,fontSize:12,color:'#6b7280'}}>BPIN: {formatBPIN(proyecto.bpin)}</code>
            </div>
            <h2 style={{margin:0,fontSize:20,fontWeight:800,color:'#111827'}}>{proyecto.nombre}</h2>
            <p style={{margin:'6px 0 0',fontSize:13,color:'#6b7280'}}>{proyecto.descripcion}</p>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:12,color:'#9ca3af'}}>Valor Total</div>
            <div style={{fontSize:24,fontWeight:800,color:'#059669'}}>{formatCOP(proyecto.valorTotal)}</div>
            <div style={{fontSize:12,color:'#9ca3af'}}>Vigencia {proyecto.vigenciaInicio}–{proyecto.vigenciaFin}</div>
          </div>
        </div>
        {proyecto.estado==='EJECUCION' && <div style={{marginTop:16}}><AvanceBar fisico={proyecto.avanceFisico} financiero={proyecto.avanceFinanciero}/></div>}
      </div>

      <TabBar tabs={tabs} active={tab} onChange={setTab}/>
      {tab==='general'    && <TabGeneral    p={proyecto}/>}
      {tab==='fisico'     && <TabFisico     p={proyecto}/>}
      {tab==='financiero' && <TabFinanciero p={proyecto}/>}
      {tab==='pdm'        && <TabPDM        p={proyecto}/>}
    </div>
  );
}

function TabGeneral({ p }) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
      <Card title="Información General">
        <InfoRow label="Nombre" value={p.nombre}/>
        <InfoRow label="BPIN" value={<code>{formatBPIN(p.bpin)}</code>}/>
        <InfoRow label="Sector" value={<SectorBadge sector={p.sector}/>}/>
        <InfoRow label="Subsector" value={p.subsector||'—'}/>
        <InfoRow label="Estado" value={<EstadoBadge estado={p.estado}/>}/>
        <InfoRow label="Vigencia" value={`${p.vigenciaInicio} – ${p.vigenciaFin}`}/>
        <InfoRow label="Objetivo" value={p.objetivo}/>
      </Card>
      <Card title="Fuentes de Financiación">
        {p.fuentes.map((f,i)=>{
          const cfg=FUENTES[f.f]||{};
          const pct=((f.monto/p.valorTotal)*100).toFixed(1);
          return (
            <div key={i} style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <span style={{fontWeight:600,fontSize:13}}>{cfg.full||f.f}</span>
                <span style={{fontSize:13,fontWeight:700}}>{formatCOP(f.monto)} <span style={{color:'#9ca3af',fontWeight:400}}>({pct}%)</span></span>
              </div>
              <div style={{height:8,background:'#f3f4f6',borderRadius:4}}>
                <div style={{height:'100%',width:`${pct}%`,background:cfg.color||'#ccc',borderRadius:4}}/>
              </div>
            </div>
          );
        })}
        <div style={{borderTop:'2px solid #f3f4f6',paddingTop:12,display:'flex',justifyContent:'space-between'}}>
          <span style={{fontWeight:700}}>Total</span>
          <span style={{fontWeight:800,fontSize:16,color:'#059669'}}>{formatCOP(p.valorTotal)}</span>
        </div>
      </Card>
    </div>
  );
}
function TabFisico({ p }) {
  const ok=p.hitos.filter(h=>h.cumplido).length;
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
      <Card title="Hitos" subtitle={`${ok}/${p.hitos.length} completados`}>
        {p.hitos.map((h,i)=>(
          <div key={i} style={{display:'flex',gap:10,marginBottom:14}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
              <div style={{width:26,height:26,borderRadius:'50%',background:h.cumplido?'#d1fae5':'#f3f4f6',border:`2px solid ${h.cumplido?'#10b981':'#d1d5db'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}>
                {h.cumplido?'✓':`${i+1}`}
              </div>
              {i<p.hitos.length-1 && <div style={{width:2,flex:1,background:h.cumplido?'#10b981':'#e5e7eb',minHeight:14}}/>}
            </div>
            <div style={{paddingBottom:6}}>
              <div style={{fontWeight:600,fontSize:13,color:h.cumplido?'#065f46':'#374151'}}>{h.nombre}</div>
              <div style={{fontSize:11,color:'#9ca3af'}}>{h.fecha}</div>
            </div>
          </div>
        ))}
      </Card>
      {p.contrato ? (
        <Card title="Contrato Asociado">
          <InfoRow label="Número" value={p.contrato.numero}/>
          <InfoRow label="Objeto" value={p.contrato.objeto}/>
          <InfoRow label="Contratista" value={p.contrato.contratista}/>
          <InfoRow label="Valor" value={formatCOP(p.contrato.valor)}/>
          <InfoRow label="Avance Físico" value={
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:100,height:8,background:'#f0fdf4',borderRadius:4,overflow:'hidden'}}>
                <div style={{width:`${p.contrato.avanceFisico}%`,height:'100%',background:'#10b981'}}/>
              </div>
              <strong>{p.contrato.avanceFisico}%</strong>
            </div>
          }/>
        </Card>
      ) : (
        <Card title="Contrato Asociado"><div style={{textAlign:'center',padding:30,color:'#9ca3af'}}>Sin contrato registrado</div></Card>
      )}
    </div>
  );
}
function TabFinanciero({ p }) {
  if (!p.ejecucion.length) return <div style={{textAlign:'center',padding:60,color:'#9ca3af'}}>Sin información de ejecución presupuestal</div>;
  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      {p.ejecucion.map((e,i)=>{
        const pct=v=>e.apropiacion>0?((v/e.apropiacion)*100).toFixed(1):'0';
        const steps=[
          {label:'Apropiación Final',value:e.apropiacion,color:'#6b7280'},
          {label:'CDP',value:e.cdp,color:'#2563eb'},
          {label:'Comprometido (RP)',value:e.rp,color:'#7c3aed'},
          {label:'Obligaciones',value:e.obligaciones,color:'#f59e0b'},
          {label:'Pagos',value:e.pagos,color:'#10b981'},
        ];
        return (
          <Card key={i} title={`Vigencia ${e.vigencia}`} subtitle="Cadena de ejecución presupuestal">
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead>
                  <tr style={{background:'#f9fafb',borderBottom:'2px solid #e5e7eb'}}>
                    {['Concepto','Valor (COP)','% Apropiación','Ejecución'].map((h,j)=>(
                      <th key={j} style={{padding:'10px 14px',textAlign:j>0?'right':'left',fontSize:12,fontWeight:700,color:'#374151'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {steps.map((s,j)=>(
                    <tr key={j} style={{borderBottom:'1px solid #f3f4f6',background:j%2===0?'#fff':'#fafafa'}}>
                      <td style={{padding:'10px 14px',fontWeight:j===0?700:500}}>{s.label}</td>
                      <td style={{padding:'10px 14px',textAlign:'right',fontFamily:'monospace',fontWeight:600}}>{formatCOPFull(s.value)}</td>
                      <td style={{padding:'10px 14px',textAlign:'right',fontWeight:700,color:s.color}}>{pct(s.value)}%</td>
                      <td style={{padding:'10px 14px',textAlign:'right'}}>
                        <div style={{height:8,background:'#f3f4f6',borderRadius:4,overflow:'hidden',width:120,marginLeft:'auto'}}>
                          <div style={{width:`${Math.min(parseFloat(pct(s.value)),100)}%`,height:'100%',background:s.color,borderRadius:4}}/>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
function TabPDM({ p }) {
  return (
    <Card title="Alineación con el PDM 2024-2027">
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={{background:'#eff6ff',borderRadius:10,padding:16}}>
          <div style={{fontSize:11,fontWeight:700,color:'#2563eb',marginBottom:6,textTransform:'uppercase',letterSpacing:1}}>Eje Estratégico</div>
          <div style={{fontSize:14,fontWeight:700,color:'#1e40af'}}>{p.pdm.eje}</div>
        </div>
        <div style={{background:'#f0fdf4',borderRadius:10,padding:16}}>
          <div style={{fontSize:11,fontWeight:700,color:'#059669',marginBottom:6,textTransform:'uppercase',letterSpacing:1}}>Programa</div>
          <div style={{fontSize:14,fontWeight:700,color:'#065f46'}}>{p.pdm.programa}</div>
        </div>
        <div style={{background:'#fff7ed',borderRadius:10,padding:16,gridColumn:'1/-1'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#d97706',marginBottom:6,textTransform:'uppercase',letterSpacing:1}}>Meta PDM</div>
          <div style={{fontSize:14,color:'#92400e'}}>{p.pdm.meta}</div>
        </div>
      </div>
    </Card>
  );
}

// ============================================================
// POLÍTICAS PÚBLICAS
// ============================================================
function PoliticasPage({ onSelect }) {
  const [filtroS, setFiltroS] = useState('');
  const filtered = POLITICAS.filter(p=>!filtroS||p.sector===filtroS);
  return (
    <div>
      <div style={{marginBottom:20}}>
        <h1 style={{margin:0,fontSize:22,fontWeight:800,color:'#111827'}}>📜 Políticas Públicas</h1>
        <p style={{margin:'4px 0 0',color:'#6b7280',fontSize:14}}>{filtered.length} políticas registradas</p>
      </div>
      <div style={{display:'flex',gap:12,marginBottom:20}}>
        <Sel value={filtroS} onChange={setFiltroS} options={[{value:'',label:'Todos los sectores'},...Object.entries(SECTORES).map(([k,v])=>({value:k,label:v.label}))]}/>
      </div>
      <div style={{display:'grid',gap:14}}>
        {filtered.map(pol=>(
          <div key={pol.id} onClick={()=>onSelect(pol)}
            style={{background:'#fff',borderRadius:12,padding:'18px 22px',border:'1px solid #e5e7eb',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',cursor:'pointer'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor='#93c5fd'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='#e5e7eb'}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8,flexWrap:'wrap'}}>
                  <SectorBadge sector={pol.sector}/>
                  <Badge color="#8b5cf6" bg="#ede9fe" text="#5b21b6">{pol.estado}</Badge>
                  <span style={{fontSize:12,color:'#9ca3af'}}>{pol.actoAdministrativo}</span>
                </div>
                <h3 style={{margin:'0 0 4px',fontSize:15,fontWeight:700,color:'#111827'}}>{pol.nombre}</h3>
                <p style={{margin:0,fontSize:12,color:'#6b7280'}}>{pol.descripcion.slice(0,120)}…</p>
                <div style={{marginTop:6,fontSize:12,color:'#9ca3af'}}>
                  👤 {pol.responsable} · Vigencia {pol.vigenciaInicio}–{pol.vigenciaFin}
                </div>
              </div>
              <div style={{textAlign:'right',minWidth:130}}>
                <div style={{fontSize:12,color:'#9ca3af'}}>Presupuesto</div>
                <div style={{fontSize:18,fontWeight:800,color:'#7c3aed'}}>{formatCOP(pol.presupuestoTotal)}</div>
                <div style={{fontSize:12,color:'#9ca3af',marginTop:4}}>Plan 2024: {pol.planesAccion[0]?.avance||0}%</div>
                <div style={{height:6,background:'#f3f4f6',borderRadius:3,marginTop:4,overflow:'hidden'}}>
                  <div style={{width:`${pol.planesAccion[0]?.avance||0}%`,height:'100%',background:'#8b5cf6'}}/>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function PoliticaDetalle({ politica, onBack }) {
  const [tab, setTab] = useState('general');
  const tabs=[{key:'general',label:'📋 General'},{key:'plan',label:'📅 Plan de Acción 2024'},{key:'indicadores',label:'📊 Indicadores'}];
  return (
    <div>
      <button onClick={onBack} style={{marginBottom:16,padding:'6px 14px',background:'#f3f4f6',border:'1px solid #d1d5db',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,color:'#374151'}}>← Volver</button>
      <div style={{background:'#fff',borderRadius:12,padding:'20px 24px',marginBottom:20,border:'1px solid #e5e7eb',boxShadow:'0 1px 4px rgba(0,0,0,0.08)'}}>
        <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
          <SectorBadge sector={politica.sector}/>
          <Badge color="#8b5cf6" bg="#ede9fe" text="#5b21b6">{politica.estado}</Badge>
          <code style={{background:'#f3f4f6',padding:'2px 8px',borderRadius:4,fontSize:12,color:'#6b7280'}}>{politica.actoAdministrativo}</code>
        </div>
        <h2 style={{margin:0,fontSize:20,fontWeight:800,color:'#111827'}}>{politica.nombre}</h2>
        <p style={{margin:'6px 0 0',color:'#6b7280',fontSize:13}}>{politica.descripcion}</p>
      </div>
      <TabBar tabs={tabs} active={tab} onChange={setTab}/>
      {tab==='general' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <Card title="Información General">
            <InfoRow label="Objetivo" value={politica.objetivo}/>
            <InfoRow label="Población objetivo" value={politica.poblacionObjetivo}/>
            <InfoRow label="Responsable" value={politica.responsable}/>
            <InfoRow label="Vigencia" value={`${politica.vigenciaInicio} – ${politica.vigenciaFin}`}/>
            <InfoRow label="Presupuesto" value={<strong style={{color:'#7c3aed'}}>{formatCOP(politica.presupuestoTotal)}</strong>}/>
          </Card>
          <Card title="Entidades Responsables">
            {politica.entidades.map((e,i)=>(
              <div key={i} style={{padding:'8px 0',borderBottom:'1px solid #f3f4f6',display:'flex',gap:8}}>
                <span>🏛️</span><span style={{fontSize:13}}>{e}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
      {tab==='plan' && (
        <Card title="Plan de Acción 2024" subtitle={`${formatCOP(politica.planesAccion[0]?.presupuesto||0)} · Avance ${politica.planesAccion[0]?.avance||0}%`}>
          <div style={{height:10,background:'#f3f4f6',borderRadius:5,overflow:'hidden',marginBottom:16}}>
            <div style={{width:`${politica.planesAccion[0]?.avance||0}%`,height:'100%',background:'#8b5cf6',borderRadius:5}}/>
          </div>
          <Tbl columns={[
            {title:'Acción',key:'nombre'},
            {title:'Responsable',key:'responsable'},
            {title:'Estado',key:'estado',render:v=>{
              const m={COMPLETADA:{bg:'#d1fae5',t:'#065f46'},EN_PROGRESO:{bg:'#dbeafe',t:'#1e40af'},PENDIENTE:{bg:'#fef3c7',t:'#92400e'}};
              return <Badge bg={m[v]?.bg} text={m[v]?.t} color="transparent">{v.replace('_',' ')}</Badge>;
            }},
            {title:'Avance',key:'avance',render:v=>(
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <div style={{width:70,height:6,background:'#f3f4f6',borderRadius:3,overflow:'hidden'}}><div style={{width:`${v}%`,height:'100%',background:'#8b5cf6'}}/></div>
                <span style={{fontSize:12,fontWeight:700}}>{v}%</span>
              </div>
            )},
          ]} data={politica.planesAccion[0]?.acciones||[]}/>
        </Card>
      )}
      {tab==='indicadores' && (
        <Card title="Indicadores de Resultado">
          <Tbl columns={[
            {title:'Indicador',key:'nombre',render:v=><strong>{v}</strong>},
            {title:'Unidad',key:'unidad'},
            {title:'Línea Base',key:'lineaBase'},
            {title:'Meta',key:'metaCuatrienio',render:v=><strong>{v}</strong>},
            {title:'Logrado 2024',key:'logrado2024',render:v=><strong style={{color:'#059669'}}>{v}</strong>},
            {title:'Avance',key:'logrado2024',render:(v,r)=>{
              const pct=r.metaCuatrienio>0?Math.min(Math.round((v/r.metaCuatrienio)*100),100):0;
              const c=pct>=75?'#10b981':pct>=50?'#f59e0b':'#ef4444';
              return <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:60,height:6,background:'#f3f4f6',borderRadius:3,overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',background:c}}/></div><span style={{fontSize:12,fontWeight:700,color:c}}>{pct}%</span></div>;
            }},
          ]} data={politica.indicadores}/>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// PLANES SECTORIALES
// ============================================================
function PlanesSectorialesPage({ onSelect }) {
  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{margin:0,fontSize:22,fontWeight:800,color:'#111827'}}>🗂️ Planes Sectoriales</h1>
        <p style={{margin:'4px 0 0',color:'#6b7280',fontSize:14}}>{PLANES_SECTORIALES.length} planes · Período {PDM.periodo}</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:20}}>
        {PLANES_SECTORIALES.map(plan=>{
          const sec=SECTORES[plan.sector]||{};
          const presTotal=Object.values(plan.presupuesto).reduce((a,b)=>a+b,0);
          const objsOk=plan.objetivos.filter(o=>o.avance>=80).length;
          return (
            <div key={plan.id} onClick={()=>onSelect(plan)}
              style={{background:'#fff',borderRadius:12,padding:'20px 22px',border:'1px solid #e5e7eb',cursor:'pointer',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',borderLeft:`4px solid ${sec.color}`}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.12)'}
              onMouseLeave={e=>e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'}>
              <div style={{fontSize:28,marginBottom:6}}>{sec.icon}</div>
              <h3 style={{margin:'0 0 4px',fontSize:15,fontWeight:700,color:'#111827'}}>{plan.nombre}</h3>
              <div style={{fontSize:12,color:'#6b7280',marginBottom:12}}>{plan.entidadLider}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
                <div style={{background:'#f9fafb',borderRadius:8,padding:'8px 12px',textAlign:'center'}}>
                  <div style={{fontSize:11,color:'#9ca3af'}}>Presupuesto Total</div>
                  <div style={{fontSize:14,fontWeight:800,color:sec.color}}>{formatCOP(presTotal)}</div>
                </div>
                <div style={{background:'#f9fafb',borderRadius:8,padding:'8px 12px',textAlign:'center'}}>
                  <div style={{fontSize:11,color:'#9ca3af'}}>Objetivos en meta</div>
                  <div style={{fontSize:14,fontWeight:800}}>{objsOk}/{plan.objetivos.length}</div>
                </div>
              </div>
              <AvanceBar fisico={plan.avanceFisico[2024]||0} financiero={plan.avanceFinanciero[2024]||0}/>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function PlanDetalle({ plan, onBack }) {
  const sec=SECTORES[plan.sector]||{};
  const presTotal=Object.values(plan.presupuesto).reduce((a,b)=>a+b,0);
  return (
    <div>
      <button onClick={onBack} style={{marginBottom:16,padding:'6px 14px',background:'#f3f4f6',border:'1px solid #d1d5db',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,color:'#374151'}}>← Volver</button>
      <div style={{background:'#fff',borderRadius:12,padding:'20px 24px',marginBottom:20,border:'1px solid #e5e7eb',borderLeft:`4px solid ${sec.color}`,boxShadow:'0 1px 4px rgba(0,0,0,0.08)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{fontSize:32,marginBottom:6}}>{sec.icon}</div>
            <h2 style={{margin:0,fontSize:20,fontWeight:800,color:'#111827'}}>{plan.nombre}</h2>
            <div style={{fontSize:13,color:'#6b7280',marginTop:4}}>{plan.entidadLider} · {plan.responsable}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:12,color:'#9ca3af'}}>Presupuesto cuatrienio</div>
            <div style={{fontSize:24,fontWeight:800,color:sec.color}}>{formatCOP(presTotal)}</div>
          </div>
        </div>
        <div style={{marginTop:16}}><AvanceBar fisico={plan.avanceFisico[2024]||0} financiero={plan.avanceFinanciero[2024]||0}/></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {Object.entries(plan.presupuesto).map(([v,val])=>(
          <div key={v} style={{background:'#fff',borderRadius:10,padding:'14px 16px',border:'1px solid #e5e7eb',textAlign:'center'}}>
            <div style={{fontSize:11,color:'#9ca3af',fontWeight:600}}>Vigencia {v}</div>
            <div style={{fontSize:16,fontWeight:800,color:'#111827',marginTop:4}}>{formatCOP(val)}</div>
            {parseInt(v)===2024 && <div style={{fontSize:11,color:'#059669',marginTop:2}}>✓ Activa</div>}
          </div>
        ))}
      </div>
      <Card title="Objetivos Sectoriales y Metas">
        <Tbl columns={[
          {title:'Cód.',key:'codigo',render:v=><code style={{fontSize:12,color:'#6b7280'}}>{v}</code>},
          {title:'Objetivo',key:'nombre',render:v=><strong style={{fontSize:13}}>{v}</strong>},
          {title:'Meta',key:'meta',render:v=><span style={{fontSize:12}}>{v}</span>},
          {title:'Indicador',key:'indicador'},
          {title:'Esperado',key:'esperado',render:v=><span style={{fontFamily:'monospace'}}>{v}</span>},
          {title:'Logrado',key:'logrado',render:v=><strong style={{color:'#059669',fontFamily:'monospace'}}>{v}</strong>},
          {title:'Avance',key:'avance',render:v=>{
            const c=v>=80?'#059669':v>=50?'#f59e0b':'#ef4444';
            return <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:80,height:8,background:'#f3f4f6',borderRadius:4,overflow:'hidden'}}><div style={{width:`${v}%`,height:'100%',background:c,borderRadius:4}}/></div><span style={{fontSize:13,fontWeight:700,color:c}}>{v}%</span></div>;
          }},
        ]} data={plan.objetivos}/>
      </Card>
    </div>
  );
}

// ============================================================
// REPORTES
// ============================================================
function ReportesPage() {
  const vigencia = React.useContext(VigenciaContext);
  const [tipo, setTipo] = useState('ejecucion');
  const tipos=[
    {value:'ejecucion',label:'💰 Ejecución Presupuestal'},
    {value:'avance',   label:'🏗️ Avance Físico'},
    {value:'contratos',label:'📄 Contratos'},
    {value:'pdm',      label:'🎯 Cumplimiento PDM'},
  ];
  const dataEjecucion = PROYECTOS.map(p=>{
    const e=p.ejecucion.find(e=>e.vigencia===vigencia);
    if(!e||!e.apropiacion) return null;
    return {bpin:formatBPIN(p.bpin),nombre:p.nombre,sector:SECTORES[p.sector]?.label||'',apropiacion:e.apropiacion,pagos:e.pagos,pct:((e.pagos/e.apropiacion)*100).toFixed(1)};
  }).filter(Boolean);

  const exportCSV = (data, fn) => {
    const h=Object.keys(data[0]).join(',');
    const r=data.map(r=>Object.values(r).map(v=>`"${v}"`).join(',')).join('\n');
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([h+'\n'+r],{type:'text/csv'}));
    a.download=fn; a.click();
  };

  return (
    <div>
      <div style={{marginBottom:20}}>
        <h1 style={{margin:0,fontSize:22,fontWeight:800,color:'#111827'}}>📑 Reportes</h1>
        <p style={{margin:'4px 0 0',color:'#6b7280',fontSize:14}}>Generación y exportación de informes</p>
      </div>
      <div style={{display:'flex',gap:10,marginBottom:24,flexWrap:'wrap'}}>
        {tipos.map(t=>(
          <button key={t.value} onClick={()=>setTipo(t.value)}
            style={{padding:'8px 18px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,background:tipo===t.value?'#2563eb':'#fff',color:tipo===t.value?'#fff':'#374151',border:tipo===t.value?'1px solid #2563eb':'1px solid #d1d5db'}}>
            {t.label}
          </button>
        ))}
      </div>
      {tipo==='ejecucion' && (
        <Card title={`Ejecución Presupuestal ${vigencia}`} extra={<button onClick={()=>exportCSV(dataEjecucion,`ejecucion_${vigencia}.csv`)} style={{padding:'6px 14px',background:'#059669',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:600}}>⬇ CSV</button>}>
          <Tbl columns={[
            {title:'BPIN',key:'bpin',render:v=><code style={{fontSize:12}}>{v}</code>},
            {title:'Proyecto',key:'nombre',render:v=><span style={{fontSize:12}}>{v}</span>},
            {title:'Sector',key:'sector'},
            {title:'Apropiado',key:'apropiacion',render:v=><span style={{fontFamily:'monospace',fontSize:12,fontWeight:600}}>{formatCOP(v)}</span>},
            {title:'Pagado',key:'pagos',render:v=><span style={{fontFamily:'monospace',fontSize:12,fontWeight:600,color:'#059669'}}>{formatCOP(v)}</span>},
            {title:'%',key:'pct',render:v=>{
              const n=parseFloat(v),c=n>=75?'#059669':n>=50?'#f59e0b':'#ef4444';
              return <div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:55,height:6,background:'#f3f4f6',borderRadius:3}}><div style={{width:`${Math.min(n,100)}%`,height:'100%',background:c,borderRadius:3}}/></div><span style={{fontWeight:700,color:c,fontSize:12}}>{v}%</span></div>;
            }},
          ]} data={dataEjecucion}/>
          <div style={{marginTop:14,display:'flex',gap:20,padding:'12px 16px',background:'#f9fafb',borderRadius:8,flexWrap:'wrap'}}>
            <span style={{fontSize:13}}>Total apropiado: <strong>{formatCOP(dataEjecucion.reduce((a,d)=>a+d.apropiacion,0))}</strong></span>
            <span style={{fontSize:13}}>Total pagado: <strong style={{color:'#059669'}}>{formatCOP(dataEjecucion.reduce((a,d)=>a+d.pagos,0))}</strong></span>
            <span style={{fontSize:13}}>Ejecución global: <strong>{((dataEjecucion.reduce((a,d)=>a+d.pagos,0)/dataEjecucion.reduce((a,d)=>a+d.apropiacion,0))*100).toFixed(1)}%</strong></span>
          </div>
        </Card>
      )}
      {tipo==='avance' && (
        <Card title="Avance Físico por Proyecto">
          <Tbl columns={[
            {title:'BPIN',key:'bpin',render:v=><code style={{fontSize:12}}>{formatBPIN(v)}</code>},
            {title:'Proyecto',key:'nombre',render:v=><span style={{fontSize:12}}>{v}</span>},
            {title:'Sector',key:'sector',render:v=><SectorBadge sector={v}/>},
            {title:'Estado',key:'estado',render:v=><EstadoBadge estado={v}/>},
            {title:'Avance',key:'avanceFisico',render:(v,r)=>r.estado==='EJECUCION'?<AvanceBar fisico={v} financiero={r.avanceFinanciero}/>:<span style={{color:'#9ca3af'}}>—</span>},
            {title:'Semáforo',key:'id',render:(_,r)=><SemaforoBadge proyecto={r}/>},
            {title:'Hitos',key:'hitos',render:v=>`${v.filter(h=>h.cumplido).length}/${v.length}`},
          ]} data={PROYECTOS}/>
        </Card>
      )}
      {tipo==='contratos' && (
        <Card title="Reporte de Contratos">
          <Tbl columns={[
            {title:'No.',key:'contrato',render:v=><code style={{fontSize:12}}>{v?.numero||'—'}</code>},
            {title:'Proyecto',key:'nombre',render:v=><span style={{fontSize:12}}>{v}</span>},
            {title:'Sector',key:'sector',render:v=><SectorBadge sector={v}/>},
            {title:'Contratista',key:'contrato',render:v=><span style={{fontSize:12}}>{v?.contratista||'—'}</span>},
            {title:'Valor',key:'contrato',render:v=><strong style={{fontFamily:'monospace',fontSize:12}}>{formatCOP(v?.valor||0)}</strong>},
            {title:'Avance',key:'contrato',render:v=>v?<div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:70,height:6,background:'#f3f4f6',borderRadius:3}}><div style={{width:`${v.avanceFisico}%`,height:'100%',background:v.avanceFisico>=80?'#10b981':v.avanceFisico>=50?'#f59e0b':'#ef4444',borderRadius:3}}/></div><span style={{fontSize:12,fontWeight:700}}>{v.avanceFisico}%</span></div>:<span style={{color:'#9ca3af'}}>—</span>},
          ]} data={PROYECTOS.filter(p=>p.contrato)}/>
        </Card>
      )}
      {tipo==='pdm' && (
        <Card title="Cumplimiento PDM 2024-2027 por Eje Estratégico">
          {PDM.ejes.map((eje,i)=>{
            const ps=PROYECTOS.filter(p=>p.pdm.eje===eje.nombre);
            return (
              <div key={i} style={{marginBottom:20,paddingLeft:12,borderLeft:`3px solid ${eje.color}`}}>
                <h4 style={{margin:'0 0 6px',fontSize:14,fontWeight:700,color:eje.color}}>{eje.nombre}</h4>
                <div style={{fontSize:12,color:'#6b7280',marginBottom:8}}>Programas: {eje.programas.join(' · ')} · {ps.length} proyectos alineados</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {ps.map(p=>(
                    <div key={p.id} style={{background:'#f9fafb',borderRadius:6,padding:'5px 10px',fontSize:11,border:'1px solid #e5e7eb',display:'flex',alignItems:'center',gap:6}}>
                      <code>{formatBPIN(p.bpin)}</code>
                      <span>{p.nombre.slice(0,35)}…</span>
                      <EstadoBadge estado={p.estado}/>
                    </div>
                  ))}
                  {!ps.length && <span style={{fontSize:12,color:'#9ca3af'}}>Sin proyectos asociados</span>}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

// ============================================================
// APP ROOT
// ============================================================
function App() {
  const [page,              setPage]              = useState('dashboard');
  const [selectedProyecto,  setSelectedProyecto]  = useState(null);
  const [selectedPolitica,  setSelectedPolitica]  = useState(null);
  const [selectedPlan,      setSelectedPlan]      = useState(null);
  const [showForm,          setShowForm]          = useState(false);
  const [editingProyecto,   setEditingProyecto]   = useState(null);
  const [sidebar,           setSidebar]           = useState(true);
  const [vigencia,          setVigencia]          = useState(2026);
  const [, forceUpdate] = useState(0);

  const navItems = [
    {id:'dashboard',   label:'Dashboard',               icon:'📊', group:''},
    {id:'proyectos',   label:'Proyectos de Inversión',  icon:'📁', group:'Seguimiento'},
    {id:'semaforo',    label:'Semáforo de Riesgo',      icon:'🚦', group:'Seguimiento'},
    {id:'alertas',     label:'Centro de Alertas',       icon:'🔔', group:'Seguimiento'},
    {id:'contratos',   label:'Contratos',               icon:'📄', group:'Seguimiento'},
    {id:'politicas',   label:'Políticas Públicas',      icon:'📜', group:'Planificación'},
    {id:'planes',      label:'Planes Sectoriales',      icon:'🗂️', group:'Planificación'},
    {id:'indicadores', label:'Indicadores PDM',         icon:'🎯', group:'Planificación'},
    {id:'comparativo', label:'Comparativo Vigencias',   icon:'📊', group:'Análisis'},
    {id:'reportes',    label:'Reportes',                icon:'📑', group:'Análisis'},
    {id:'catalogo',    label:'Catálogo DNP',            icon:'📚', group:'Referencia'},
  ];

  const navigate = p => {
    setPage(p); setSelectedProyecto(null); setSelectedPolitica(null);
    setSelectedPlan(null); setShowForm(false); setEditingProyecto(null);
  };

  const handleSaveProyecto = (saved) => {
    setShowForm(false); setEditingProyecto(null);
    setSelectedProyecto(saved);
    if (page!=='proyectos') setPage('proyectos');
    forceUpdate(n=>n+1);
  };

  const renderContent = () => {
    // Formulario modal
    if (showForm) {
      return (
        <div>
          <button onClick={()=>{setShowForm(false);setEditingProyecto(null);}} style={{marginBottom:16,padding:'6px 14px',background:'#f3f4f6',border:'1px solid #d1d5db',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,color:'#374151'}}>← Cancelar</button>
          <div style={{background:'#fff',borderRadius:12,padding:'24px',border:'1px solid #e5e7eb',boxShadow:'0 1px 4px rgba(0,0,0,0.08)'}}>
            <h2 style={{margin:'0 0 20px',fontSize:18,fontWeight:800,color:'#111827'}}>{editingProyecto?'✏️ Editar Proyecto':'➕ Registrar Nuevo Proyecto'}</h2>
            <ProyectoForm proyecto={editingProyecto} onSave={handleSaveProyecto} onCancel={()=>{setShowForm(false);setEditingProyecto(null);}}/>
          </div>
        </div>
      );
    }
    if (page==='dashboard') return <DashboardPage/>;
    if (page==='proyectos') {
      if (selectedProyecto) return <ProyectoDetalle proyecto={selectedProyecto} onBack={()=>setSelectedProyecto(null)} onEdit={p=>{setEditingProyecto(p);setShowForm(true);}}/>;
      return <ProyectosPage onSelect={setSelectedProyecto} onNew={()=>{setEditingProyecto(null);setShowForm(true);}}/>;
    }
    if (page==='semaforo')    return <SemaforoPage     onSelect={p=>{setSelectedProyecto(p);setPage('proyectos');}}/>;
    if (page==='alertas')     return <AlertasPage/>;
    if (page==='contratos')   return <ContratosPage    onSelectProyecto={p=>{setSelectedProyecto(p);setPage('proyectos');}}/>;
    if (page==='indicadores') return <IndicadoresPDMPage/>;
    if (page==='comparativo') return <ComparativoPage/>;
    if (page==='politicas') {
      if (selectedPolitica) return <PoliticaDetalle politica={selectedPolitica} onBack={()=>setSelectedPolitica(null)}/>;
      return <PoliticasPage onSelect={setSelectedPolitica}/>;
    }
    if (page==='planes') {
      if (selectedPlan) return <PlanDetalle plan={selectedPlan} onBack={()=>setSelectedPlan(null)}/>;
      return <PlanesSectorialesPage onSelect={setSelectedPlan}/>;
    }
    if (page==='reportes')    return <ReportesPage/>;
    if (page==='catalogo')    return <CatalogoDNPPage/>;
    return null;
  };

  const currentNav = navItems.find(n=>n.id===page);

  return (
    <VigenciaContext.Provider value={vigencia}>
    <div style={{display:'flex',minHeight:'100vh',background:'#f8fafc',fontFamily:"'Inter',system-ui,sans-serif"}}>
      {/* Sidebar */}
      <div style={{width:sidebar?242:0,minWidth:sidebar?242:0,background:'linear-gradient(180deg,#1e3a5f 0%,#0f2442 100%)',display:'flex',flexDirection:'column',transition:'width .25s,min-width .25s',overflow:'hidden',flexShrink:0,position:'sticky',top:0,height:'100vh'}}>
        <div style={{padding:'16px 18px 14px',borderBottom:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',gap:12}}>
          <img
            src="img/escudo.png"
            alt="Escudo"
            onError={e=>{e.currentTarget.style.display='none';e.currentTarget.nextSibling.style.display='flex';}}
            style={{width:52,height:52,objectFit:'contain',flexShrink:0,filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.4))'}}
          />
          <span style={{display:'none',width:46,height:46,background:'rgba(255,255,255,0.12)',borderRadius:10,alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🏛️</span>
          <div>
            <div style={{color:'#fff',fontWeight:800,fontSize:12.5,lineHeight:1.3}}>{PDM.municipio||'Municipio'}</div>
            <div style={{color:'rgba(255,255,255,0.6)',fontSize:10.5,marginTop:1}}>Sistema de Seguimiento</div>
            <div style={{color:'rgba(255,255,255,0.45)',fontSize:10,marginTop:1}}>Inversión Municipal · Colombia</div>
          </div>
        </div>
        <nav style={{flex:1,padding:'10px 8px',overflowY:'auto'}}>
          {(() => {
            const groups = ['', 'Seguimiento', 'Planificación', 'Análisis', 'Referencia'];
            return groups.map(grp => {
              const items = navItems.filter(n => n.group === grp);
              return (
                <div key={grp}>
                  {grp && <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:1.5,padding:'10px 12px 4px'}}>{grp}</div>}
                  {items.map(item => (
                    <button key={item.id} onClick={()=>navigate(item.id)}
                      style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:8,border:'none',cursor:'pointer',background:page===item.id?'rgba(255,255,255,0.13)':'transparent',color:page===item.id?'#fff':'rgba(255,255,255,0.62)',fontSize:13,fontWeight:page===item.id?700:500,marginBottom:1,textAlign:'left'}}
                      onMouseEnter={e=>{if(page!==item.id)e.currentTarget.style.background='rgba(255,255,255,0.07)'}}
                      onMouseLeave={e=>{if(page!==item.id)e.currentTarget.style.background='transparent'}}>
                      <span style={{fontSize:15,flexShrink:0}}>{item.icon}</span>
                      <span style={{whiteSpace:'nowrap',fontSize:12.5}}>{item.label}</span>
                      {item.id==='alertas' && (() => {
                        const cnt = PROYECTOS.filter(p=>p.estado==='SUSPENDIDO'||(p.estado==='EJECUCION'&&Math.abs(p.avanceFisico-p.avanceFinanciero)>15)).length;
                        return cnt>0?<span style={{marginLeft:'auto',background:'#ef4444',color:'#fff',borderRadius:10,fontSize:10,fontWeight:800,padding:'1px 6px',minWidth:18,textAlign:'center'}}>{cnt}</span>:null;
                      })()}
                    </button>
                  ))}
                </div>
              );
            });
          })()}
        </nav>
        <div style={{padding:'12px 16px',borderTop:'1px solid rgba(255,255,255,0.1)',fontSize:11,color:'rgba(255,255,255,0.4)'}}>
          <div style={{fontWeight:600,color:'rgba(255,255,255,0.55)',marginBottom:2}}>{PDM.municipio}</div>
          <div>{PDM.departamento}</div>
          <div>{PDM.periodo}</div>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>
        {/* Header */}
        <div style={{background:'#fff',borderBottom:'1px solid #e5e7eb',padding:'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <button onClick={()=>setSidebar(!sidebar)} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,padding:4,borderRadius:6,color:'#374151'}}>☰</button>
            <span style={{fontSize:13,color:'#6b7280'}}>
              {currentNav?.icon} {currentNav?.label}
              {selectedProyecto && !showForm && ` › ${selectedProyecto.nombre.slice(0,38)}…`}
              {selectedPolitica && ` › ${selectedPolitica.nombre.slice(0,38)}…`}
              {selectedPlan && ` › ${selectedPlan.nombre.slice(0,38)}…`}
              {showForm && ` › ${editingProyecto?'Editar':'Nuevo Proyecto'}`}
            </span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:12,color:'#9ca3af',fontWeight:500}}>Vigencia:</span>
            <select
              value={vigencia}
              onChange={e=>setVigencia(parseInt(e.target.value))}
              style={{padding:'5px 10px',border:'2px solid #2563eb',borderRadius:8,fontSize:13,fontWeight:700,color:'#1e40af',background:'#eff6ff',cursor:'pointer',outline:'none',appearance:'none',WebkitAppearance:'none',paddingRight:28,backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%232563eb' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",backgroundRepeat:'no-repeat',backgroundPosition:'right 8px center'}}
            >
              {VIGENCIAS.map(y=>(
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <div style={{width:32,height:32,borderRadius:'50%',background:'#e0e7ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>👤</div>
          </div>
        </div>
        {/* Content */}
        <div style={{flex:1,padding:24,overflowY:'auto'}} className="fade-in">
          {renderContent()}
        </div>
      </div>
    </div>
    </VigenciaContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
