/* Elysium NAV Prototype — Shared components.
   All components exported to window at bottom so other babel scripts can use them. */
const { useState, useEffect, useMemo, useRef, createContext, useContext } = React;

/* ─────────────────────────── ICONS ─────────────────────────── */
const Icon = {
  chevron: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="9 6 15 12 9 18"/></svg>,
  down: (p={}) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="4 6 8 10 12 6"/></svg>,
  arrowUpRight: (p={}) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4.66 11.33 11.33 4.66M11.33 4.66H4.66M11.33 4.66v6.67"/></svg>,
  bell: (p={}) => <svg viewBox="0 0 21 21" fill="currentColor" {...p}><path fillRule="evenodd" clipRule="evenodd" d="M7.52 17.78c.32-.36.87-.39 1.24-.07.46.41 1.07.65 1.73.65s1.27-.24 1.73-.65c.36-.32.92-.29 1.24.07.32.36.28.91-.07 1.24-.77.68-1.78 1.09-2.9 1.09s-2.13-.41-2.9-1.09c-.35-.33-.39-.88-.07-1.24Zm-1.36-15.11A5.99 5.99 0 0 1 10.5.87c1.62 0 3.18.65 4.33 1.79a6.13 6.13 0 0 1 1.78 4.33c0 2.55.64 4.24 1.31 5.32.31.5.56.9.73 1.19.08.14.16.28.22.4.03.06.06.13.08.22.02.07.06.22.04.4a.98.98 0 0 1-.17.44.93.93 0 0 1-.35.41c-.22.16-.47.2-.55.21l-.04.01a5.4 5.4 0 0 1-.42.04c-.29.01-.7.01-1.2.01H4.69c-.5 0-.91 0-1.2-.01a5.5 5.5 0 0 1-.42-.04l-.04-.01a.97.97 0 0 1-.55-.21.93.93 0 0 1-.35-.41.98.98 0 0 1-.17-.44.72.72 0 0 1 .04-.4c.02-.09.06-.16.08-.22.06-.12.14-.26.22-.4.17-.29.41-.69.73-1.19l.01-.02c.67-1.08 1.31-2.77 1.31-5.32 0-1.63.65-3.19 1.79-4.33Z"/></svg>,
  search: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  plus: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  x: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 6 6 18M6 6l18 18"/></svg>,
  check: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="20 6 9 17 4 12"/></svg>,
  info: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>,
  dots: (p={}) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>,
  download: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  arrowRight: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>,
  filter: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  home: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 21V13.6c0-.56 0-.84.11-1.05a1 1 0 0 1 .44-.44C9.76 12 10.04 12 10.6 12h2.8c.56 0 .84 0 1.05.11a1 1 0 0 1 .44.44c.11.21.11.49.11 1.05V21M11.02 2.76l-6.78 5.28a2.51 2.51 0 0 0-.85.75 2 2 0 0 0-.32.65c-.07.26-.07.55-.07 1.13V17.8c0 1.12 0 1.68.22 2.11a2 2 0 0 0 .87.87c.43.22.99.22 2.11.22h11.6c1.12 0 1.68 0 2.11-.22a2 2 0 0 0 .87-.87c.22-.43.22-.99.22-2.11v-7.24c0-.58 0-.87-.07-1.13a2 2 0 0 0-.32-.65 2.51 2.51 0 0 0-.85-.75l-6.78-5.28a2.18 2.18 0 0 0-.94-.46 1.16 1.16 0 0 0-.52 0 2.18 2.18 0 0 0-.94.46Z"/></svg>,
  zap: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M11 4H7.8C6.12 4 5.28 4 4.64 4.33a3 3 0 0 0-1.31 1.31C3 6.28 3 7.12 3 8.8v7.4c0 1.68 0 2.52.33 3.16a3 3 0 0 0 1.31 1.31c.64.33 1.48.33 3.16.33h7.4c1.68 0 2.52 0 3.16-.33a3 3 0 0 0 1.31-1.31c.33-.64.33-1.48.33-3.16V13M20.12 3.88a3 3 0 1 1-4.24 4.24 3 3 0 0 1 4.24-4.24Z"/></svg>,
  chat: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 8.5h5M7 12h8M7 18v2.34c0 .53 0 .8.11.93.1.12.24.19.39.19.18 0 .39-.17.8-.5L10.68 19c.49-.39.73-.59 1-.72.24-.13.5-.22.77-.27.3-.06.6-.06 1.23-.06H16.2c1.68 0 2.52 0 3.16-.33a3 3 0 0 0 1.31-1.31c.33-.64.33-1.48.33-3.16V7.8c0-1.68 0-2.52-.33-3.16a3 3 0 0 0-1.31-1.31C18.72 3 17.88 3 16.2 3H7.8c-1.68 0-2.52 0-3.16.33a3 3 0 0 0-1.31 1.31C3 5.28 3 6.12 3 7.8V14c0 .93 0 1.4.1 1.78a3 3 0 0 0 2.12 2.12c.38.1.85.1 1.78.1Z"/></svg>,
  grid: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  navIcon: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 16c0 2.21 1.79 4 4 4h4c2.21 0 4-1.79 4-4s-1.79-4-4-4h-4c-2.21 0-4-1.79-4-4s1.79-4 4-4h4c2.21 0 4 1.79 4 4M12 2v22"/></svg>,
  vault: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v.01M18 14v.01"/></svg>,
  register: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13 7 11.88 4.77c-.32-.64-.48-.96-.72-1.2a2 2 0 0 0-.74-.47C10.1 3 9.74 3 9.02 3H5.2c-1.12 0-1.68 0-2.11.22a2 2 0 0 0-.87.87C2 4.52 2 5.08 2 6.2V7M2 7h15.2c1.68 0 2.52 0 3.16.33a3 3 0 0 1 1.31 1.31c.33.64.33 1.48.33 3.16v4.4c0 1.68 0 2.52-.33 3.16a3 3 0 0 1-1.31 1.31c-.64.33-1.48.33-3.16.33H6.8c-1.68 0-2.52 0-3.16-.33a3 3 0 0 1-1.31-1.31C2 18.72 2 17.88 2 16.2V7Z"/></svg>,
  doc: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 2.27V6.4c0 .56 0 .84.11 1.05a1 1 0 0 0 .44.44c.21.11.49.11 1.05.11h4.13M16 13H8M16 17H8M10 9H8M14 2H8.8c-1.68 0-2.52 0-3.16.33a3 3 0 0 0-1.31 1.31C4 4.28 4 5.12 4 6.8v10.4c0 1.68 0 2.52.33 3.16a3 3 0 0 0 1.31 1.31c.64.33 1.48.33 3.16.33h6.4c1.68 0 2.52 0 3.16-.33a3 3 0 0 0 1.31-1.31c.33-.64.33-1.48.33-3.16V8l-6-6Z"/></svg>,
  chart: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 21H4.6c-.56 0-.84 0-1.05-.11a1 1 0 0 1-.44-.44C3 20.24 3 19.96 3 19.4V3M21 7l-5.43 5.43c-.2.2-.3.3-.41.34a.5.5 0 0 1-.31 0c-.11-.04-.21-.14-.41-.34l-1.87-1.87c-.2-.2-.3-.3-.41-.34a.5.5 0 0 0-.31 0c-.11.04-.21.14-.41.34L7 15M21 7h-4M21 7v4"/></svg>,
  scales: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 10l-3.43 3.43a.5.5 0 0 1-.41.34.5.5 0 0 1-.31 0 .76.76 0 0 1-.41-.34l-2.87-2.87c-.2-.2-.3-.3-.41-.34a.5.5 0 0 0-.31 0c-.11.04-.21.14-.41.34L6 14M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"/></svg>,
};

/* ─────────────────────────── CHART ─────────────────────────── */
// Generate deterministic NAV history series
function makeSeries(days, base, trend, volatility, seed=1) {
  const out = [];
  let v = base;
  let r = seed;
  for (let i = 0; i < days; i++) {
    r = (r * 9301 + 49297) % 233280;
    const rand = r / 233280 - 0.5;
    v += trend + rand * volatility;
    out.push(v);
  }
  return out;
}

function NavChart({ range, height = 280 }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);
  const [w, setW] = useState(800);

  useEffect(() => {
    const ro = new ResizeObserver(() => { if (ref.current) setW(ref.current.clientWidth); });
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const days = { '1W': 7, '1M': 30, '3M': 90, 'YTD': 38, '1Y': 365, 'All': 730 }[range] || 30;
  const series = useMemo(() => makeSeries(days, 45000000, 10000, 220000, 7), [days]);
  const pad = { l: 56, r: 16, t: 14, b: 28 };
  const H = height;
  const W = w;
  const min = Math.min(...series) * 0.995;
  const max = Math.max(...series) * 1.005;
  const sx = i => pad.l + (W - pad.l - pad.r) * (i / (series.length - 1));
  const sy = v => pad.t + (H - pad.t - pad.b) * (1 - (v - min) / (max - min));

  const path = series.map((v, i) => `${i===0?'M':'L'}${sx(i)},${sy(v)}`).join(' ');
  const area = path + ` L${sx(series.length-1)},${H-pad.b} L${sx(0)},${H-pad.b} Z`;

  // secondary dashed series (NAV/share) — flatter trend
  const share = useMemo(() => makeSeries(days, 98, 0.02, 0.55, 13), [days]);
  const smin = Math.min(...share) * 0.99;
  const smax = Math.max(...share) * 1.01;
  const syS = v => pad.t + (H - pad.t - pad.b) * (1 - (v - smin) / (smax - smin));
  const pathS = share.map((v, i) => `${i===0?'M':'L'}${sx(i)},${syS(v)}`).join(' ');

  const yTicks = 4;
  const yLabels = Array.from({length: yTicks}, (_,i) => {
    const v = min + (max - min) * (1 - i / (yTicks - 1));
    const y = pad.t + (H - pad.t - pad.b) * (i / (yTicks - 1));
    return { v, y, label: `$${(v/1e6).toFixed(1)}M` };
  });

  // x-axis labels
  const xLabels = [0, 0.25, 0.5, 0.75, 1].map(t => {
    const i = Math.round((series.length - 1) * t);
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return { i, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
  });

  function onMove(e) {
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const frac = Math.max(0, Math.min(1, (x - pad.l) / (W - pad.l - pad.r)));
    const i = Math.round(frac * (series.length - 1));
    setHover({ i, x: sx(i), y: sy(series[i]), ys: syS(share[i]), v: series[i], s: share[i] });
  }

  return (
    <div ref={ref} style={{ position: 'relative' }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg width={W} height={H} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="area-grad-chart" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--green-700)" stopOpacity="0.14"/>
            <stop offset="100%" stopColor="var(--green-700)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {yLabels.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} y1={t.y} x2={W-pad.r} y2={t.y} stroke="var(--line-1)" strokeDasharray={i===yLabels.length-1?'':'2 3'}/>
            <text x={pad.l - 10} y={t.y + 4} textAnchor="end" fontSize="10.5" fill="var(--ink-3)" fontFamily="Inter">{t.label}</text>
          </g>
        ))}
        {xLabels.map((t, i) => (
          <text key={i} x={sx(t.i)} y={H-8} textAnchor={i===0?'start':i===xLabels.length-1?'end':'middle'} fontSize="10.5" fill="var(--ink-3)" fontFamily="Inter">{t.label}</text>
        ))}
        <path d={area} fill="url(#area-grad-chart)"/>
        <path d={path} fill="none" stroke="var(--green-700)" strokeWidth="1.75"/>
        <path d={pathS} fill="none" stroke="var(--info-fg)" strokeWidth="1.25" strokeDasharray="3 3" opacity="0.9"/>
        {hover && (
          <g>
            <line x1={hover.x} y1={pad.t} x2={hover.x} y2={H-pad.b} stroke="var(--ink-3)" strokeDasharray="2 2"/>
            <circle cx={hover.x} cy={hover.y} r="4" fill="var(--green-700)" stroke="var(--bg-canvas)" strokeWidth="2"/>
            <circle cx={hover.x} cy={hover.ys} r="3.5" fill="var(--info-fg)" stroke="var(--bg-canvas)" strokeWidth="2"/>
          </g>
        )}
      </svg>
      {hover && (
        <div style={{
          position: 'absolute',
          left: Math.min(hover.x + 12, W - 190),
          top: Math.max(hover.y - 60, 8),
          background: 'var(--bg-canvas)',
          border: '1px solid var(--line-2)',
          borderRadius: '8px',
          padding: '10px 12px',
          fontSize: '12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          minWidth: 180,
          pointerEvents: 'none',
          fontVariantNumeric: 'tabular-nums',
        }}>
          <div style={{ color: 'var(--ink-3)', fontSize: 11, marginBottom: 4 }}>
            {(() => { const d = new Date(); d.setDate(d.getDate() - (days - 1 - hover.i)); return d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }); })()}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', gap: 12, marginBottom: 2 }}>
            <span style={{color:'var(--ink-2)'}}>Fund NAV</span>
            <b>${(hover.v/1e6).toFixed(2)}M</b>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', gap: 12 }}>
            <span style={{color:'var(--ink-2)'}}>NAV / share</span>
            <b>${hover.s.toFixed(2)}</b>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── DONUT ─────────────────────────── */
function Donut({ slices, total, label = 'NAV' }) {
  const sum = slices.reduce((s, x) => s + x.value, 0);
  let cum = 0;
  const stops = slices.map(s => {
    const a = cum / sum * 100;
    cum += s.value;
    const b = cum / sum * 100;
    return `${s.color} ${a.toFixed(2)}% ${b.toFixed(2)}%`;
  }).join(', ');
  return (
    <div style={{ width: 200, height: 200, borderRadius: '50%', position: 'relative', background: `conic-gradient(${stops})` }}>
      <div style={{ position: 'absolute', inset: 30, borderRadius: '50%', background: 'var(--bg-canvas)', boxShadow: 'inset 0 0 0 1px var(--line-1)' }}/>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{total}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>{slices.length} assets</div>
      </div>
    </div>
  );
}

/* ─────────────────────────── CHROME ─────────────────────────── */
function Navbar({ onNav, route }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  React.useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (!e.target.closest || !e.target.closest('[data-account-menu]')) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);
  // Breadcrumb label for the active route
  const routeLabels = {
    'home': 'Home', 'actions': 'Actions', 'communication': 'Communication',
    'overview': 'Overview', 'nav': 'NAV', 'collateral': 'Collateral & Treasury',
    'share-register': 'Share Register', 'economics': 'Economics',
    'pnl': 'Profit & Loss', 'balance-sheet': 'Balance Sheet', 'reconciliation': 'Reconciliation log',
    'order-book': 'Order Book',
  };
  const fundScopedRoutes = ['overview','nav','collateral','share-register','economics','pnl','balance-sheet','reconciliation','order-book'];
  const inFund = fundScopedRoutes.includes(route);
  const currentLabel = routeLabels[route] || '';
  return (
    <header style={{
      display: 'flex', alignItems: 'center',
      padding: '14px 0', background: 'var(--bg-canvas)',
      height: 64, flexShrink: 0,
    }}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',maxWidth:1500,margin:'0 auto',padding:'0 40px'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0,flex:1}}>
        {inFund ? (
          <React.Fragment>
            <div style={{width:22,height:22,borderRadius:'50%',background:'radial-gradient(circle at 30% 30%,#E9D5FF 0%,transparent 45%),radial-gradient(circle at 70% 35%,#BFDBFE 0%,transparent 50%),radial-gradient(circle at 50% 75%,#FCA5A5 0%,transparent 55%),linear-gradient(135deg,#C4B5FD 0%,#A5B4FC 55%,#FBCFE8 100%)',flexShrink:0}}/>
            <span style={{fontSize:14,fontWeight:500,color:'var(--ink-1)',whiteSpace:'nowrap'}}>POD Crypto Fund</span>
            <Icon.chevron style={{width:14,height:14,color:'var(--ink-3)',flexShrink:0}}/>
            <span style={{fontSize:14,fontWeight:500,color:'var(--ink-1)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{currentLabel}</span>
          </React.Fragment>
        ) : (
          <span style={{fontSize:14,fontWeight:500,color:'var(--ink-1)',whiteSpace:'nowrap'}}>{currentLabel}</span>
        )}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:14}}>
        {inFund && (
          <span style={{fontSize:12.5,color:'var(--ink-3)',whiteSpace:'nowrap',fontVariantNumeric:'tabular-nums'}}>Next dealing · 03d 14h 22m</span>
        )}
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          height: 32, padding: '0 12px', borderRadius: 8,
          border: 'none', background: 'var(--glass-bg)',
          color: 'var(--ink-1)', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3.23 8.05 1.25 10.03l4.99 4.99 1.98-1.98-4.99-4.99ZM8.22 13.04l2.66-2.67a2.6 2.6 0 0 1 3.97 0l-4.65 4.65-1.98-1.98ZM6.24 1.07 1.25 6.06l1.98 1.99 4.99-4.99-1.98-1.99ZM10.2 1.07l4.65 4.65a2.6 2.6 0 0 1-3.97 0L8.22 3.06l1.98-1.99Z" fill="#1CD264"/></svg>
          <span>Ceffu</span>
          <Icon.arrowUpRight style={{width:12,height:12,color:'var(--ink-3)'}}/>
        </button>
        <button className="icon-btn" style={{width:36,height:36,borderRadius:'50%',border:'none',background:'transparent',cursor:'pointer',color:'var(--ink-2)',display:'inline-flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
          <Icon.bell style={{width:18,height:18}}/>
          <span style={{position:'absolute',top:6,right:7,width:8,height:8,borderRadius:'50%',background:'var(--warn)',border:'2px solid var(--bg-canvas)'}}/>
        </button>
        <div data-account-menu style={{position:'relative'}}>
          <button onClick={() => setMenuOpen(o=>!o)} style={{position:'relative',width:36,height:36,border:'none',padding:0,cursor:'pointer',background:'transparent'}}>
            <div style={{
              width:36,height:36,borderRadius:'50%',
              background:'linear-gradient(135deg,#737373 0%,#404040 100%)',color:'#fff',
              display:'inline-flex',alignItems:'center',justifyContent:'center',
              fontSize:12,fontWeight:600,
            }}>RM</div>
            <span style={{position:'absolute',right:0,bottom:1,width:9,height:9,borderRadius:'50%',background:'var(--green-500)',border:'2px solid var(--bg-canvas)'}}/>
          </button>
          {menuOpen && (
            <div style={{
              position:'absolute',top:44,right:0,width:296,
              background:'var(--bg-canvas)',border:'1px solid var(--line-1)',
              borderRadius:14,boxShadow:'0 20px 56px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.06)',
              padding:'14px 14px 12px',zIndex:40,
            }}>
              <div style={{display:'flex',alignItems:'center',gap:13,paddingBottom:13,borderBottom:'1px solid var(--line-1)'}}>
                <div style={{width:46,height:46,borderRadius:'50%',background:'#15151A',color:'#fff',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:600,flexShrink:0}}>RM</div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:15,fontWeight:600,color:'var(--ink-1)',letterSpacing:'-0.01em'}}>Riko Matsuda</div>
                  <div style={{fontSize:12.5,color:'var(--ink-3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>POD Capital</div>
                </div>
              </div>
              <div style={{padding:'8px 0 2px',fontSize:10,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--ink-3)',fontWeight:600,paddingLeft:2}}>Workspaces</div>
              {[
                { n: 'POD Capital', r: 'Fund Ops', active: true, init: 'PC', grad: 'linear-gradient(135deg,#C4B5FD,#A5B4FC)' },
                { n: 'Meridian Partners', r: 'Observer', active: false, init: 'MP', grad: 'linear-gradient(135deg,#FDE68A,#FCA5A5)' },
              ].map((w,i) => (
                <button key={i} onClick={()=>setMenuOpen(false)} style={{display:'flex',alignItems:'center',gap:12,width:'100%',padding:'8px 6px',border:'none',background:'transparent',borderRadius:9,cursor:'pointer',fontFamily:'inherit',textAlign:'left',color:'var(--ink-1)'}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-subtle)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <span style={{width:26,height:26,borderRadius:7,background:w.grad,display:'inline-flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:10,fontWeight:700,flexShrink:0}}>{w.init}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12.5,fontWeight:500}}>{w.n}</div>
                    <div style={{fontSize:11,color:'var(--ink-3)'}}>{w.r}</div>
                  </div>
                  {w.active && <span style={{color:'var(--green-600)',fontSize:13}}>✓</span>}
                </button>
              ))}
              <div style={{height:1,background:'var(--line-1)',margin:'8px -2px'}}/>
              {[
                { l: 'Your details', icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
                )},
                { l: 'Settings', icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2.6"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 4.37 16.9l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                )},
                { l: 'Help centre', icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
                )},
                { l: 'Give feedback', icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                )},
              ].map((m,i) => (
                <button key={i} onClick={()=>setMenuOpen(false)} style={{display:'flex',alignItems:'center',gap:12,width:'100%',padding:'8px 6px',border:'none',background:'transparent',borderRadius:9,cursor:'pointer',fontFamily:'inherit',textAlign:'left',color:'var(--ink-1)',fontSize:13,fontWeight:500}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-subtle)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <span style={{width:18,height:18,color:'var(--ink-1)',display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{React.cloneElement(m.icon,{width:18,height:18})}</span>
                  {m.l}
                </button>
              ))}
              <div style={{display:'flex',alignItems:'center',gap:12,padding:'6px 6px',borderRadius:9}}>
                <span style={{width:18,height:18,display:'inline-flex',alignItems:'center',justifyContent:'center',color:'var(--ink-1)',flexShrink:0}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
                </span>
                <span style={{flex:1,fontSize:13,fontWeight:500,color:'var(--ink-1)'}}>Theme</span>
                <ThemeSegment/>
              </div>
              <div style={{height:1,background:'var(--line-1)',margin:'8px -2px'}}/>
              <button onClick={()=>setMenuOpen(false)} style={{display:'flex',alignItems:'center',gap:12,width:'100%',padding:'8px 6px',border:'none',background:'transparent',borderRadius:9,cursor:'pointer',fontFamily:'inherit',textAlign:'left',color:'var(--ink-1)',fontSize:13,fontWeight:500}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-subtle)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <span style={{width:18,height:18,display:'inline-flex',alignItems:'center',justifyContent:'center',color:'var(--ink-1)',flexShrink:0}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </span>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </header>
  );
}

function Sidebar({ route, onNav }) {
  const primary = [
    { id: 'home', label: 'Home', icon: Icon.home },
    { id: 'actions', label: 'Actions', icon: Icon.zap },
    { id: 'communication', label: 'Communication', icon: Icon.chat },
  ];
  // NAV children — sub-nav under NAV item
  const navChildren = [
    { id: 'pnl', label: 'Profit & Loss' },
    { id: 'balance-sheet', label: 'Balance Sheet' },
    { id: 'reconciliation', label: 'Reconciliation log' },
  ];
  // Top-level fund items (NAV shown separately with expandable chevron)
  const fundTop = [
    { id: 'overview', label: 'Overview', icon: Icon.grid },
  ];
  const fundBottom = [
    { id: 'collateral', label: 'Collateral & Treasury', icon: Icon.vault },
    { id: 'share-register', label: 'Share Register', icon: Icon.register },
    { id: 'economics', label: 'Economics', icon: Icon.chart },
  ];
  const navActive = route === 'nav' || navChildren.some(c => c.id === route);
  const [navExpanded, setNavExpanded] = React.useState(() => navActive);
  React.useEffect(() => { if (navActive) setNavExpanded(true); }, [navActive]);

  const NavItem = ({ item }) => {
    const active = route === item.id;
    const I = item.icon;
    return (
      <a onClick={(e) => { e.preventDefault(); onNav(item.id); }} href="#" style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '7px 12px', borderRadius: 8,
        color: active ? 'var(--ink-1)' : 'var(--ink-2)',
        fontSize: 14, fontWeight: active ? 600 : 500,
        textDecoration: 'none', cursor: 'pointer',
        background: active ? 'var(--bg-card)' : 'transparent',
        transition: 'background 0.12s',
      }} onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-card)'; }} onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
        <I style={{width:18,height:18,flexShrink:0}}/>
        <span style={{whiteSpace:'nowrap'}}>{item.label}</span>
      </a>
    );
  };
  const NavItemExpandable = () => {
    const isActive = route === 'nav';
    return (
      <div style={{display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center'}}>
          <a onClick={(e)=>{e.preventDefault();onNav('nav');}} href="#" style={{display:'flex',alignItems:'center',gap:14,padding:'7px 12px',borderRadius:8,color: isActive ? 'var(--ink-1)' : 'var(--ink-2)',fontSize:14,fontWeight: isActive ? 600 : 500,cursor:'pointer',textDecoration:'none',background: isActive ? 'var(--bg-card)' : 'transparent',transition:'background 0.12s',flex:1,minWidth:0}}
          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-card)'; }} onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
            <Icon.navIcon style={{width:18,height:18,flexShrink:0}}/>
            <span>NAV</span>
          </a>
          <button aria-label={navExpanded?'Collapse':'Expand'} onClick={(e)=>{e.stopPropagation();setNavExpanded(v=>!v);}} style={{
            width:22,height:22,border:'none',background:'transparent',cursor:'pointer',
            color:'var(--ink-3)',display:'inline-flex',alignItems:'center',justifyContent:'center',
            borderRadius:5,padding:0,flexShrink:0,
            transform: navExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition:'transform 0.15s',
          }} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-subtle)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <Icon.down style={{width:14,height:14}}/>
          </button>
        </div>
        {navExpanded && (
          <div style={{display:'flex',flexDirection:'column',gap:1,marginTop:2,marginLeft:24,borderLeft:'1px solid var(--line-1)',paddingLeft:10}}>
            {navChildren.map(c => {
              const active = route === c.id;
              return (
                <a key={c.id} onClick={(e)=>{e.preventDefault();onNav(c.id);}} href="#" style={{
                  display:'flex',alignItems:'center',
                  padding:'7px 10px',borderRadius:6,
                  color: active ? 'var(--ink-1)' : 'var(--ink-2)',
                  fontSize:13,fontWeight: active ? 600 : 500,
                  textDecoration:'none',cursor:'pointer',
                  background: active ? 'var(--bg-card)' : 'transparent',
                  transition:'background 0.12s',
                }} onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-card)'; }} onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                  {c.label}
                </a>
              );
            })}
          </div>
        )}
      </div>
    );
  };
  return (
    <nav style={{
      width: 240, padding: '14px 12px 16px',
      background: 'var(--bg-canvas)',
      display: 'flex', flexDirection: 'column', gap: 20,
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      alignSelf: 'flex-start',
      height: '100vh',
      overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', color: 'var(--ink-1)', cursor:'pointer', height: 36, padding: '0 8px' }} onClick={() => onNav('nav')}>
        <svg viewBox="0 0 116 28" fill="none" style={{height:24,width:'auto'}}>
          <path d="M18.52 14.51c0 2.96-2.4 5.35-5.35 5.35s-5.36-2.4-5.36-5.35 2.4-5.36 5.36-5.36 5.35 2.4 5.35 5.36Zm6.21-3.74a13.54 13.54 0 0 1 .3 9.62l-.45.92c-1.73 3.55-4.95 5.81-8.9 5.81h-5.07c-3.95 0-7.13-2.26-8.86-5.81l-.45-.92a13.54 13.54 0 0 1 .3-9.62l2.54-5.26A9.21 9.21 0 0 1 8.92 1.16c2.69-1.2 5.76-1.2 8.44 0 2.02.91 3.69 2.43 4.78 4.36l2.59 5.26M20.43 16.09c-.85-.85-.85-2.22 0-3.07 1.58-1.58 1.58-4.15 0-5.74-1.59-1.59-4.16-1.59-5.74 0a2.18 2.18 0 0 1-3.07 0c-1.59-1.59-4.16-1.59-5.74 0l-.06.06c-1.58 1.58-1.5 4.1.07 5.7.83.85.83 2.22-.01 3.06-1.59 1.58-1.59 4.15 0 5.74 1.58 1.58 4.15 1.58 5.74 0 .84-.84 2.22-.84 3.06 0 1.59 1.58 4.16 1.58 5.75 0 1.58-1.58 1.58-4.15 0-5.74Z" fill="currentColor"/>
          <path d="M40.98 16.86v6.33h-5.95V4.2h14.25c6.82 0 8.86 2.7 8.86 6.17v.25c0 3.4-2.07 6.23-8.86 6.23h-8.3Zm0-4.26h8.2c1.86 0 2.75-.72 2.75-2v-.08c0-1.27-.87-2.01-2.76-2.01h-8.2V12.6ZM87 13.26v.77c0 3.34-1.38 9.49-13.35 9.49h-1.1c-12.02 0-13.37-6.15-13.37-9.49v-.77c0-3.4 1.35-9.4 13.37-9.4h1.1c11.94 0 13.35 6 13.35 9.4ZM65.4 13.44v.31c0 2.17 1.28 5.15 7.69 5.15s7.68-2.91 7.68-5.1v-.36c0-2.19-1.27-4.97-7.68-4.97s-7.69 2.78-7.69 4.97Zm36.18-9.24c11 0 13.4 4.72 13.4 8.99v.76c0 4.08-2.27 9.27-13.38 9.24H88.99V4.2h12.59Zm-.46 14.42c6.74 0 7.63-2.96 7.63-4.9v-.15c0-1.94-.82-4.88-7.63-4.88h-6.18v9.93h6.18Z" fill="currentColor"/>
        </svg>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:2}}>
        {primary.map(i => <NavItem key={i.id} item={i}/>)}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'flex',flexDirection:'column',gap:6,paddingTop:8}}>
          <div style={{color:'var(--ink-2)',padding:'4px 12px',fontSize:12,fontWeight:500}}>Funds</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',gap:14,height:42,borderRadius:8,cursor:'pointer',color:'var(--ink-1)'}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-card)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <div style={{display:'flex',alignItems:'center',gap:12,minWidth:0}}>
              <div style={{width:22,height:22,borderRadius:'50%',background:'radial-gradient(circle at 30% 30%,#E9D5FF 0%,transparent 45%),radial-gradient(circle at 70% 35%,#BFDBFE 0%,transparent 50%),radial-gradient(circle at 50% 75%,#FCA5A5 0%,transparent 55%),linear-gradient(135deg,#C4B5FD 0%,#A5B4FC 55%,#FBCFE8 100%)',flexShrink:0}}/>
              <span style={{fontSize:14,fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>POD Crypto Fund</span>
            </div>
            <Icon.down style={{width:14,height:14,color:'var(--ink-2)',flexShrink:0}}/>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:2}}>
          {fundTop.map(i => <NavItem key={i.id} item={i}/>)}
          <NavItemExpandable/>
          {fundBottom.map(i => <NavItem key={i.id} item={i}/>)}
        </div>
      </div>
    </nav>
  );
}

function ThemeSegment() {
  const [mode, setMode] = React.useState(() => localStorage.getItem('mos.theme') || 'system');
  React.useEffect(() => {
    localStorage.setItem('mos.theme', mode);
    let dark = false;
    if (mode === 'dark') dark = true;
    else if (mode === 'light') dark = false;
    else dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle('dark', dark);
  }, [mode]);
  const opts = [
    { k: 'light', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg> },
    { k: 'dark', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> },
    { k: 'system', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
  ];
  return (
    <div style={{display:'inline-flex',background:'var(--bg-subtle)',borderRadius:8,padding:2,gap:2}}>
      {opts.map(o => (
        <button key={o.k} onClick={(e)=>{e.stopPropagation();setMode(o.k);}} style={{
          width:30,height:26,border:'none',borderRadius:6,cursor:'pointer',padding:0,
          display:'inline-flex',alignItems:'center',justifyContent:'center',
          background: mode === o.k ? 'var(--bg-canvas)' : 'transparent',
          color: mode === o.k ? 'var(--ink-1)' : 'var(--ink-3)',
          boxShadow: mode === o.k ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
        }}>{o.svg}</button>
      ))}
    </div>
  );
}

Object.assign(window, { Icon, NavChart, Donut, Navbar, Sidebar, ThemeSegment, useState, useEffect, useMemo, useRef });
