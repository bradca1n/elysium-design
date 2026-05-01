/* NAV view — matches reference: KPIs + Portfolio composition + Venue breakdown + P&L + Balance Sheet */
const { useState: _u1, useMemo: _u2 } = React;

const RISKS_BY_RANGE = {
  '1M':  { sharpe: 0.15,  sortino: 0.20,  btcSharpe: 0.30, btcSortino: 0.45 },
  '3M':  { sharpe: 1.42,  sortino: 2.10,  btcSharpe: 0.85, btcSortino: 1.10 },
  '6M':  { sharpe: -0.85, sortino: -0.92, btcSharpe: 0.45, btcSortino: 0.65 },
  'YTD': { sharpe: -0.92, sortino: -1.04, btcSharpe: 0.55, btcSortino: 0.78 },
  '1Y':  { sharpe: 0.62,  sortino: 0.84,  btcSharpe: 0.92, btcSortino: 1.18 },
  'All': { sharpe: 0.65,  sortino: 0.92,  btcSharpe: 0.78, btcSortino: 1.02 },
};

function sharpeVerdict(v) {
  if (v < 0) return 'Underperforming the risk-free rate';
  if (v < 1) return 'Below benchmark';
  if (v < 2) return 'Solid risk-adjusted returns';
  return 'Excellent';
}
function sortinoVerdict(v) {
  if (v < 0) return 'Negative downside-adjusted returns';
  if (v < 1) return 'Below benchmark';
  if (v < 2) return 'Solid';
  return 'Excellent — downside risk well managed';
}

const RANGE_DEFS = [
  { k: '1M',  label: '1 month',      days: 22,  pct: '+0.17%',   pos: true  },
  { k: '3M',  label: '3 months',     days: 66,  pct: '+13.42%',  pos: true  },
  { k: '6M',  label: '6 months',     days: 130, pct: '−18.75%',  pos: false },
  { k: 'YTD', label: 'Year to date', days: 85,  pct: '−17.45%',  pos: false },
  { k: '1Y',  label: '1 year',       days: 260, pct: '+4.93%',   pos: true  },
  { k: 'All', label: 'All time',     days: 260, pct: '+4.93%',   pos: true  },
];

// Synthetic master series — ~261 daily points expressed as % from series start.
// Window slicing re-baselines so each visible window starts at 0%.
function buildSeries(anchors, jitter) {
  const out = [];
  for (let i = 0; i <= 260; i++) {
    let j = 0;
    while (j < anchors.length - 1 && anchors[j+1][0] < i) j++;
    if (j >= anchors.length - 1) { out.push(anchors[anchors.length-1][1]); continue; }
    const [x0,y0] = anchors[j], [x1,y1] = anchors[j+1];
    const t = (i - x0) / (x1 - x0);
    out.push(y0 + t*(y1-y0) + jitter(i));
  }
  return out;
}

const MASTER_PORTFOLIO = buildSeries(
  [[0,0],[22,8],[44,30],[66,50],[88,70],[110,80],[132,65],[154,45],[176,28],[198,25],[220,20],[240,-20],[250,-10],[260,5]],
  i => Math.sin(i*0.7)*2.5 + Math.sin(i*1.7+1)*1.5,
);
const MASTER_BENCHMARK = buildSeries(
  [[0,0],[44,3],[88,6],[132,9],[176,11],[220,13],[260,15]],
  i => Math.sin(i*0.5)*0.4,
);

function NavView({ onNav, showTweaks }) {
  const [activeAsset, setActiveAsset] = _u1(null);
  const [sheetOpen, setSheetOpen] = _u1(null);
  const [perfRange, setPerfRange] = _u1('1Y');

  const assets = [
    { id: 'btc', name: 'Bitcoin', sym: 'BTC', glyph: '₿', color: '#FF9900', price: '$68,992', pct: 47.1, value: '$22,340,000', delta: '+$22,340,000', d: '+0.8%', donutColor: '#FF9900' },
    { id: 'eth', name: 'Ethereum', sym: 'ETH', glyph: 'Ξ', color: '#8E76FF', price: '$2,011', pct: 4.6, value: '$2,200,000', delta: '+$2,200,000', d: '+3.5%', donutColor: '#8E76FF' },
    { id: 'link', name: 'Chainlink', sym: 'LINK', glyph: 'L', color: '#1C46EE', price: '$13.70', pct: 3.2, value: '$1,500,000', delta: '+$1,500,000', d: '+1.5%', donutColor: '#1C46EE' },
    { id: 'ltc', name: 'Litecoin', sym: 'LTC', glyph: 'Ł', color: '#A6A9AA', price: '$54.02', pct: 2.3, value: '$1,100,000', delta: '+$1,100,000', d: '+2.0%', donutColor: '#A6A9AA' },
    { id: 'ada', name: 'Cardano', sym: 'ADA', glyph: '₳', color: '#0033AD', price: '$0.26', pct: 2.0, value: '$950,000', delta: '+$950,000', d: '+4.1%', donutColor: '#0033AD' },
  ];
  // PLACEHOLDER — pending Timo's answer on Haruko spot vs. derivatives split
  const derivatives = [
    { id: 'btc-perp', name: 'BTC Perpetual', sym: 'BTC-PERP', glyph: '₿', color: '#FF9900', price: '$101,220', pct: 6.8, value: '$3,200,000', delta: '+$3,200,000', d: '+1.2%', donutColor: '#FF9900' },
    { id: 'eth-perp', name: 'ETH Perpetual', sym: 'ETH-PERP', glyph: 'Ξ', color: '#8E76FF', price: '$2,918',   pct: 1.1, value: '$525,000',   delta: '−$525,000',   d: '−0.4%', donutColor: '#8E76FF' },
    { id: 'sol-fut',  name: 'SOL Futures',   sym: 'SOL-FUT',  glyph: 'S', color: '#1C46EE', price: '$140',     pct: 0.6, value: '$280,000',   delta: '+$280,000',   d: '+2.1%', donutColor: '#1C46EE' },
  ];
  const venues = [
    { group: 'Custody', total: '$27.5M', share: '58%', rows: [
      { name: 'Coinbase Prime', holdings: 'BTC, ETH', value: '$18.0M', share: '38.0%', flow: '+0.32%', margin: null, status: 'verified' },
      { name: 'Copper.co', holdings: 'BTC, LINK', value: '$9.5M', share: '20.0%', flow: '+0.18%', margin: null, status: 'verified' },
    ]},
    { group: 'Exchange', total: '$12.4M', share: '26%', rows: [
      { name: 'Binance', holdings: 'ETH, LTC, ADA', value: '$7.1M', share: '15.0%', flow: '−0.12%', margin: 62, status: 'verified' },
      { name: 'OKX', holdings: 'LINK, LTC, ADA', value: '$5.3M', share: '11.0%', flow: '−0.08%', margin: 84, status: 'pending' },
    ]},
    { group: 'Cold', total: '$7.5M', share: '16%', rows: [
      { name: 'Self custody', holdings: 'BTC', value: '$7.5M', share: '16.0%', flow: '0.00%', margin: null, status: 'verified' },
    ]},
  ];
  const tickerColor = Object.fromEntries(assets.map(a => [a.sym, a.color]));

  const pnlKpis = [
    { l: 'Realized P&L', v: '+$612,400', s: '8 trades settled', pos: true },
    { l: 'Unrealized P&L', v: '+$1,720,000', s: 'Mark-to-market on open positions', pos: true },
    { l: 'Income', v: '+$26,200', s: 'T-bill yield on free cash', pos: true },
    { l: 'Fees & expenses', v: '−$18,540', s: 'Mgmt + perf accrued', pos: false },
  ];

  const attr = [
    { label: 'Opening NAV · 01 Apr', kind: 'neu', delta: '—', amt: '$45,100,000' },
    { label: 'Unrealized P&L', kind: 'pos', delta: '+$1,720,000', amt: 'Mark-to-market across 5 positions' },
    { label: 'Realized P&L', kind: 'pos', delta: '+$612,400', amt: '8 trades settled' },
    { label: 'Income · T-bills', kind: 'pos', delta: '+$26,200', amt: '4.2% APY on $6.25M free cash' },
    { label: 'Management fees', kind: 'neg', delta: '−$15,200', amt: 'daily pro-rata across classes' },
    { label: 'Performance fee accrual', kind: 'neg', delta: '−$3,340', amt: 'Class A + C above HWM' },
    { label: 'Subscriptions', kind: 'pos', delta: '+$150,000', amt: '5 orders settled' },
    { label: 'Redemptions', kind: 'neg', delta: '−$130,000', amt: 'capital outflow' },
  ];

  const bsAssets = [
    { l: 'Investments at fair value', s: '5 crypto positions · portfolio composition', v: '$41,213,790' },
    { l: 'Cash & equivalents', s: 'Free cash across 4 venues · earning 4.2% APY', v: '$6,246,000' },
    { l: 'Receivables', s: 'Subscriptions due to settle at next dealing', v: '$343,210' },
  ];
  const bsLiab = [
    { l: 'Redemptions payable', s: '2 orders queued at next dealing', v: '−$320,000' },
    { l: 'Fees payable', s: 'Management + performance accrued this period', v: '−$18,000' },
    { l: 'Trading settlements', s: 'Open trades pending settle · T+1', v: '−$5,000' },
  ];

  return (
    <div style={{padding:'48px 40px 80px',maxWidth:1500,margin:'0 auto'}} data-page>
      {/* Page header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'4px 0 32px',gap:24}}>
        <div>
          <div style={{fontSize:24,fontWeight:600,letterSpacing:'-0.015em',color:'var(--ink-1)'}}>NAV</div>
          <div style={{fontSize:13,color:'var(--ink-2)',marginTop:4}}>Portfolio allocation and live market values across custody & exchanges.</div>
        </div>
        <div style={{flexShrink:0}}><PageKebab/></div>
      </div>

      {/* ========= NET ASSET VALUE ========= */}
      <section style={{marginBottom:70}}>
        {/* Headline KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:48}}>
          {[
            { l: 'NAV',              v: '$47,460,000', pct: '+5.2%', s: 'vs. prior NAV' },
            { l: 'Period P&L (MTD)', v: '+$2,340,000', pct: '+5.2%', s: 'on opening NAV', pos: true },
            { l: 'NAV per share',    v: '$104.27',     pct: '+5.2%', s: '+$5.18 vs. prior NAV' },
          ].map((k,i) => <Kpi key={i} {...k}/>)}
        </div>

        <PerformanceSection range={perfRange} setRange={setPerfRange}/>

        <RisksSection range={perfRange}/>

        <SubTitle title="Portfolio composition"/>

        <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(280px,480px)',gap:32,alignItems:'start',marginBottom:24}}>
          <div>
            {/* Spot */}
            <div style={{display:'flex',alignItems:'baseline',gap:10,marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:600,color:'var(--ink-1)'}}>Spot</div>
              <div style={{fontSize:11.5,color:'var(--ink-3)'}}>{assets.length} positions · $28.09M</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'28px minmax(0,1fr) 100px 90px 140px 70px',gap:16,padding:'4px 4px 8px',borderBottom:'1px solid var(--line-1)',fontSize:11.5,color:'var(--ink-3)',fontWeight:500}}>
              <div/><div>Asset</div><div style={{textAlign:'right'}}>Price</div><div style={{textAlign:'right'}}>Allocation</div><div style={{textAlign:'right'}}>Value</div><div style={{textAlign:'right'}}>24h</div>
            </div>
            {assets.map(a => (
              <SpotRow key={a.id} a={a} active={activeAsset === a.id} onEnter={() => setActiveAsset(a.id)} onLeave={() => setActiveAsset(null)}/>
            ))}

            {/* Derivatives */}
            <div style={{display:'flex',alignItems:'baseline',gap:10,marginTop:32,marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:600,color:'var(--ink-1)'}}>Derivatives</div>
              <div style={{fontSize:11.5,color:'var(--ink-3)'}}>{derivatives.length} positions · $4.00M</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'28px minmax(0,1fr) 110px 130px 130px 70px',gap:16,padding:'4px 4px 8px',borderBottom:'1px solid var(--line-1)',fontSize:11.5,color:'var(--ink-3)',fontWeight:500}}>
              <div/><div>Asset</div><div style={{textAlign:'right'}}>Price</div><div style={{textAlign:'right'}}>Notional</div><div style={{textAlign:'right'}}>Delta</div><div style={{textAlign:'right'}}>24h</div>
            </div>
            {derivatives.map(a => (
              <DerivativeRow key={a.id} a={a}/>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'center'}}>
            <DonutChart assets={assets} activeAsset={activeAsset} onHover={setActiveAsset}/>
          </div>
        </div>

        {/* Venue breakdown */}
        <SubTitle title={<>Venue breakdown <span style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:400,marginLeft:8}}>5 venues · $47.46M</span></>} right={
          <button onClick={() => onNav('reconciliation')} style={{
            display:'inline-flex',alignItems:'center',gap:6,height:30,padding:'0 12px',
            border:'1px solid var(--line-2)',borderRadius:8,background:'var(--bg-canvas)',
            color:'var(--ink-1)',fontSize:12.5,fontWeight:500,cursor:'pointer',fontFamily:'inherit',
            whiteSpace:'nowrap',
          }} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-subtle)'} onMouseLeave={e=>e.currentTarget.style.background='var(--bg-canvas)'}>
            View reconciliation log
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4.66 11.33 11.33 4.66M11.33 4.66H4.66M11.33 4.66v6.67"/></svg>
          </button>
        }/>

        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7, minmax(0, 1fr))',gap:16,padding:'4px 4px 8px',borderBottom:'1px solid var(--line-1)',fontSize:11.5,color:'var(--ink-3)',fontWeight:500}}>
            <div>Venue</div><div>Holdings</div><div style={{textAlign:'right'}}>Value</div><div style={{textAlign:'right'}}>Share</div><div style={{textAlign:'right'}}>Net flow</div><div style={{textAlign:'right'}}>Margin</div><div style={{textAlign:'right'}}>Status</div>
          </div>
          {venues.map((v,i) => (
            <React.Fragment key={i}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7, minmax(0, 1fr))',gap:16,padding:'14px 4px 8px',borderBottom:'1px solid var(--line-2)',fontSize:10.5,color:'var(--ink-3)',fontWeight:600,marginTop:4}}>
                <div style={{color:'var(--ink-2)'}}>{v.group}</div>
                <div/>
                <div style={{textAlign:'right',color:'var(--ink-1)',textTransform:'none',letterSpacing:0,fontSize:12.5,fontWeight:500}}>{v.total}</div>
                <div style={{textAlign:'right',color:'var(--ink-3)',textTransform:'none',letterSpacing:0,fontSize:12.5,fontWeight:500}}>{v.share}</div>
                <div/><div/><div/>
              </div>
              {v.rows.map((r,j) => (
                <div key={j} style={{display:'grid',gridTemplateColumns:'repeat(7, minmax(0, 1fr))',gap:16,padding:'11px 4px',borderBottom:'1px solid var(--line-1)',alignItems:'center',fontSize:13,fontVariantNumeric:'tabular-nums'}}>
                  <div style={{fontWeight:500}}>{r.name}</div>
                  <div style={{display:'inline-flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                    {r.holdings.split(',').map(s => s.trim()).map((t,k) => {
                      const c = tickerColor[t] || '#888';
                      const r2 = parseInt(c.slice(1,3),16), g2 = parseInt(c.slice(3,5),16), b2 = parseInt(c.slice(5,7),16);
                      return (
                        <span key={k} style={{
                          display:'inline-flex',alignItems:'center',
                          padding:'2px 8px',borderRadius:5,
                          fontSize:11,fontWeight:500,
                          background:`rgba(${r2},${g2},${b2},0.15)`,
                          color:c,
                        }}>{t}</span>
                      );
                    })}
                  </div>
                  <div style={{textAlign:'right'}}>{r.value}</div>
                  <div style={{textAlign:'right'}}>{r.share}</div>
                  <div style={{textAlign:'right',color: r.flow.startsWith('+') ? 'var(--pos)' : r.flow.startsWith('−') ? 'var(--neg)' : 'var(--ink-3)',fontWeight:500}}>{r.flow}</div>
                  <div style={{textAlign:'right'}}>{r.margin != null ? <MarginBar used={r.margin}/> : <span style={{color:'var(--ink-3)'}}>—</span>}</div>
                  <div style={{textAlign:'right'}}><StatusChip status={r.status}/></div>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>

      </section>

      {/* ========= TREASURY FLOWS ========= */}
      <section style={{marginBottom:70}}>
        <SectionHead title="Treasury flows" cta={{ label: 'Open Treasury', onClick: () => onNav('collateral') }}/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
          <Kpi l="Net flow next dealing" v="−$170,000" s="Subs +$150K · Redemptions −$320K" neg/>
          <Kpi l="Available stables / USD" v="$6.25M" s="4.2% APY across 4 venues"/>
          <Kpi l="Coverage ratio" v="36×" s="Free cash ÷ net redemption demand"/>
        </div>
      </section>

      {/* ========= PROFIT & LOSS ========= */}
      <section style={{marginBottom:70}}>
        <SectionHead title="Profit & Loss" cta={{ label: 'Open Profit & Loss', onClick: () => onNav('pnl') }}/>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
          {pnlKpis.map((k,i) => <Kpi key={i} {...k}/>)}
        </div>

        <SubTitle title="Profit & Loss" right={<span style={{fontSize:11.5,color:'var(--ink-3)'}}>01 Apr → 30 Apr</span>}/>

        <div style={{marginTop:4}}>
              {attr.map((r,i) => (
                <div key={i} style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 160px 200px',gap:20,alignItems:'center',padding:'12px 4px',borderBottom:'1px solid var(--line-1)',fontSize:13,fontVariantNumeric:'tabular-nums'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,color:'var(--ink-1)'}}>
                    <AttrMarker kind={r.kind}/>
                    <span>{r.label}</span>
                  </div>
                  <div style={{textAlign:'right',fontWeight:500,color: r.kind==='pos'?'var(--pos)': r.kind==='neg'?'var(--neg)':'var(--ink-3)'}}>{r.delta}</div>
                  <div style={{textAlign:'right',color:'var(--ink-2)',fontSize:12.5}}>{r.amt}</div>
                </div>
              ))}
              {/* Closing row */}
              <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 160px 200px',gap:20,alignItems:'center',padding:'14px 4px',fontSize:13,fontVariantNumeric:'tabular-nums',background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,marginTop:4,paddingLeft:16,paddingRight:16}}>
                <div style={{fontWeight:600,color:'var(--ink-1)'}}>Closing NAV · 30 Apr</div>
                <div style={{textAlign:'right',fontWeight:600,color:'var(--pos)'}}>+$2,360,060</div>
                <div style={{textAlign:'right',fontWeight:600,color:'var(--ink-1)'}}>$47,460,060</div>
              </div>
            </div>
      </section>

      {/* ========= BALANCE SHEET ========= */}
      <section>
        <SectionHead title="Balance sheet" desc="Net assets snapshot reconciling to NAV. As of 30 Apr 16:00 UTC." cta={{ label: 'Open Balance Sheet', onClick: () => onNav('balance-sheet') }}/>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:24}}>
          <Kpi l="Total assets" v="$47,803,000" s="Investments + cash + receivables"/>
          <Kpi l="Total liabilities" v="−$343,000" s="Payables + settlements" pos={false} neg/>
          <Kpi l="Net assets (NAV)" v="$47,460,000" s="Assets − liabilities"/>
        </div>

        <div style={{overflow:'hidden'}}>
          <BSSection title="Assets" rows={bsAssets} total={{ l: 'Total assets', v: '$47,803,000' }}/>
          <BSSection title="Liabilities" rows={bsLiab} total={{ l: 'Total liabilities', v: '−$343,000', neg: true }}/>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,marginTop:4}}>
            <div style={{fontSize:13,fontWeight:600,color:'var(--ink-1)'}}>Net assets</div>
            <div style={{fontSize:13,fontWeight:600,fontVariantNumeric:'tabular-nums',color:'var(--ink-1)'}}>$47,460,000</div>
          </div>
        </div>
      </section>

      {sheetOpen && <SideSheet kind={sheetOpen} onClose={() => setSheetOpen(null)}/>}
    </div>
  );
}

// ---------- Helpers ----------
function DonutChart({ assets, activeAsset, onHover }) {
  const total = assets.reduce((s,a) => s + a.pct, 0);
  const SIZE = 300;
  const VB = 200;
  const cx = VB / 2, cy = VB / 2;
  const R = 78;
  const STROKE = 14;
  const GAP_DEG = 1;

  const slices = [];
  let cumDeg = -90;
  assets.forEach(a => {
    const sweep = (a.pct / total) * 360;
    slices.push({
      id: a.id,
      sym: a.sym,
      color: a.donutColor,
      pct: a.pct,
      startDeg: cumDeg + GAP_DEG / 2,
      endDeg: cumDeg + sweep - GAP_DEG / 2,
      midDeg: cumDeg + sweep / 2,
    });
    cumDeg += sweep;
  });

  const polar = (deg, r) => {
    const rad = deg * Math.PI / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };

  const arcPath = (startDeg, endDeg) => {
    const [x1, y1] = polar(startDeg, R);
    const [x2, y2] = polar(endDeg, R);
    const large = (endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
  };

  const active = slices.find(s => s.id === activeAsset);

  const project = (deg, r) => {
    const rad = deg * Math.PI / 180;
    return {
      x: SIZE / 2 + (r * Math.cos(rad) / VB) * SIZE,
      y: SIZE / 2 + (r * Math.sin(rad) / VB) * SIZE,
    };
  };

  const callout = active ? (() => {
    const edge = project(active.midDeg, R + STROKE / 2);
    const stub = project(active.midDeg, R + STROKE / 2 + 22);
    const above = Math.sin(active.midDeg * Math.PI / 180) < 0;
    return { edge, stub, above };
  })() : null;

  return (
    <div style={{position:'relative',width:SIZE,height:SIZE,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${VB} ${VB}`} style={{overflow:'visible',position:'absolute',inset:0}}>
        {slices.map((s,i) => {
          const dimmed = activeAsset && s.id !== activeAsset;
          return (
            <path key={i} d={arcPath(s.startDeg, s.endDeg)}
              fill="none"
              stroke={dimmed ? 'var(--ink-4)' : s.color}
              strokeWidth={STROKE}
              opacity={dimmed ? 0.4 : 1}
              style={{transition:'stroke 0.25s, opacity 0.25s',cursor:'pointer'}}
              onMouseEnter={() => onHover && onHover(s.id)}
              onMouseLeave={() => onHover && onHover(null)}
            />
          );
        })}
      </svg>

      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',pointerEvents:'none'}}>
        <div style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:500}}>NAV</div>
        <div style={{fontSize:28,fontWeight:500,letterSpacing:'-0.05em',fontVariantNumeric:'tabular-nums',marginTop:2}}>$47.46M</div>
        <div style={{fontSize:12,color:'var(--ink-3)',marginTop:2}}>{assets.length} assets</div>
      </div>

      {callout && (
        <>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}
            style={{position:'absolute',left:0,top:0,pointerEvents:'none',overflow:'visible'}}>
            <line x1={callout.edge.x} y1={callout.edge.y}
                  x2={callout.stub.x} y2={callout.stub.y}
                  stroke="var(--ink-3)" strokeWidth="1" opacity="0.5"/>
            <circle cx={callout.edge.x} cy={callout.edge.y} r="2" fill={active.color}/>
          </svg>
          <div style={{
            position:'absolute',
            left: callout.stub.x,
            top: callout.stub.y + (callout.above ? -10 : 10),
            transform: callout.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            display:'inline-flex',alignItems:'center',gap:8,
            fontSize:12,fontWeight:500,
            whiteSpace:'nowrap',
            pointerEvents:'none',
            transition:'left 0.25s ease, top 0.25s ease',
          }}>
            <span style={{width:8,height:8,borderRadius:'50%',background:active.color}}/>
            <span style={{color:'var(--ink-1)'}}>{active.sym}</span>
            <span style={{color:'var(--ink-3)',fontVariantNumeric:'tabular-nums'}}>{active.pct}%</span>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ l, v, pct, s, pos, neg }) {
  const valColor = pos ? 'var(--pos)' : neg ? 'var(--neg)' : 'var(--ink-1)';
  return (
    <div style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,padding:'16px 20px'}}>
      <div style={{fontSize:14,color:'var(--ink-2)',fontWeight:500,marginBottom:8}}>{l}</div>
      <div style={{display:'flex',alignItems:'baseline',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums',color: valColor}}>{v}</span>
        {pct && <span style={{fontSize:13,fontWeight:500,fontVariantNumeric:'tabular-nums',color: pos?'var(--pos)': neg?'var(--neg)':'var(--ink-3)'}}>{pct}</span>}
      </div>
      <div style={{fontSize:13,color:'var(--ink-2)',marginTop:10}}>{s}</div>
    </div>
  );
}

function PageKebab() {
  return (
    <button aria-label="More" style={{width:32,height:32,border:'none',background:'transparent',borderRadius:8,cursor:'pointer',color:'var(--ink-2)',display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-subtle)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
    </button>
  );
}

function SectionHead({ title, desc, cta, right }) {
  return (
    <div style={{marginBottom:20,display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:24}}>
      <div style={{minWidth:0}}>
        <div style={{fontSize:18,fontWeight:600,color:'var(--ink-1)',letterSpacing:'-0.005em'}}>{title}</div>
        <div style={{fontSize:13,color:'var(--ink-2)',marginTop:4}}>{desc}</div>
      </div>
      {right}
      {cta && (
        <button onClick={cta.onClick} style={{
          display:'inline-flex',alignItems:'center',gap:6,height:32,padding:'0 14px',
          border:'1px solid var(--line-2)',borderRadius:8,background:'var(--bg-canvas)',
          color:'var(--ink-1)',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',
          flexShrink:0,whiteSpace:'nowrap',
        }} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-subtle)'} onMouseLeave={e=>e.currentTarget.style.background='var(--bg-canvas)'}>
          {cta.label}
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4.66 11.33 11.33 4.66M11.33 4.66H4.66M11.33 4.66v6.67"/></svg>
        </button>
      )}
    </div>
  );
}

function SubTitle({ title, right }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:12,margin:'40px 0 20px'}}>
      <div style={{fontSize:18,fontWeight:600,color:'var(--ink-1)',letterSpacing:'-0.005em'}}>{title}</div>
      <div style={{flex:1}}/>
      {right}
    </div>
  );
}

function AttrMarker({ kind }) {
  const bg = kind === 'pos' ? 'var(--pos)' : kind === 'neg' ? 'var(--neg)' : 'var(--ink-4)';
  return <span style={{width:3,height:14,borderRadius:2,background:bg,flexShrink:0}}/>;
}

function BSSection({ title, rows, total }) {
  return (
    <>
      <div style={{padding:'10px 20px',background:'var(--glass-bg)',backdropFilter:'blur(10px)',fontSize:10.5,fontWeight:600,color:'var(--ink-2)',borderBottom:'1px solid var(--line-1)'}}>{title}</div>
      {rows.map((r,i) => (
        <div key={i} style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1.2fr) 160px',gap:16,padding:'14px 20px',borderBottom:'1px solid var(--line-1)',alignItems:'center',fontSize:13}}>
          <div style={{fontWeight:500,color:'var(--ink-1)'}}>{r.l}</div>
          <div style={{color:'var(--ink-2)',fontSize:12.5}}>{r.s}</div>
          <div style={{textAlign:'right',fontVariantNumeric:'tabular-nums',color: r.v.startsWith('−')?'var(--neg)':'var(--ink-1)'}}>{r.v}</div>
        </div>
      ))}
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 160px',gap:16,padding:'14px 20px',borderBottom:'1px solid var(--line-1)',alignItems:'center',fontSize:13,fontWeight:600}}>
        <div>{total.l}</div>
        <div style={{textAlign:'right',fontVariantNumeric:'tabular-nums',color: total.neg?'var(--neg)':'var(--ink-1)'}}>{total.v}</div>
      </div>
    </>
  );
}

function SegToggle({ value, setValue, options }) {
  return (
    <div style={{display:'inline-flex',padding:3,background:'var(--bg-subtle)',borderRadius:7}}>
      {options.map(o => (
        <button key={o.v} onClick={()=>setValue(o.v)} style={{
          border:'none',cursor:'pointer',padding:'4px 12px',borderRadius:5,
          fontSize:11.5,fontWeight:500,fontFamily:'inherit',
          background: value===o.v?'var(--bg-canvas)':'transparent',
          color: value===o.v?'var(--ink-1)':'var(--ink-2)',
          boxShadow: value===o.v?'0 1px 2px rgba(0,0,0,0.06)':'none',
        }}>{o.l}</button>
      ))}
    </div>
  );
}

function MarginBar({ used }) {
  const color = used < 70 ? 'var(--pos)' : used < 90 ? '#D89A20' : 'var(--neg)';
  return (
    <div style={{display:'inline-flex',alignItems:'center',gap:6,justifyContent:'flex-end'}}>
      <span style={{width:46,height:4,background:'var(--bg-subtle)',borderRadius:2,overflow:'hidden',display:'inline-block'}}>
        <span style={{display:'block',height:'100%',width:`${used}%`,background:color,borderRadius:2}}/>
      </span>
      <span style={{fontSize:11.5,color:'var(--ink-2)',fontVariantNumeric:'tabular-nums',minWidth:28,textAlign:'right'}}>{used}%</span>
    </div>
  );
}

function StatusChip({ status }) {
  const map = {
    verified: { fg: 'var(--green-700)', label: 'Verified' },
    pending: { fg: '#8A5A10', label: 'Pending' },
  };
  const s = map[status] || map.verified;
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11.5,fontWeight:500,color:s.fg,justifyContent:'flex-end'}}>
      {status === 'verified' && <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3.5 8.5 6.5 11.5 12.5 5"/></svg>}
      {status === 'pending' && <span style={{width:6,height:6,borderRadius:'50%',background:'#D89A20'}}/>}
      {s.label}
    </span>
  );
}

function SideSheet({ kind, onClose }) {
  return (
    <>
      <div style={{position:'fixed',inset:0,background:'rgba(10,10,12,0.35)',zIndex:50}} onClick={onClose}/>
      <div style={{position:'fixed',top:0,right:0,bottom:0,width:480,maxWidth:'92vw',background:'var(--bg-canvas)',borderLeft:'1px solid var(--line-1)',boxShadow:'-12px 0 40px rgba(0,0,0,0.12)',zIndex:51,padding:'24px'}}>
        <button onClick={onClose} style={{position:'absolute',top:20,right:24,padding:'6px 10px',border:'none',background:'var(--bg-surface)',cursor:'pointer',borderRadius:999,fontSize:12,fontWeight:500}}>Close</button>
        <div style={{fontSize:18,fontWeight:600,marginBottom:8}}>{kind === 'reconcile' ? 'Reconciliation' : 'Publish to investors'}</div>
      </div>
    </>
  );
}

function SpotRow({ a, active, onEnter, onLeave }) {
  const dNeg = a.d.startsWith('−') || a.d.startsWith('-');
  return (
    <div onMouseEnter={onEnter} onMouseLeave={onLeave} style={{
      display:'grid',gridTemplateColumns:'28px minmax(0,1fr) 100px 90px 140px 70px',gap:16,
      padding:'12px 4px',borderBottom:'1px solid var(--line-1)',alignItems:'center',cursor:'pointer',
      background: active ? 'var(--glass-bg)' : 'transparent',
      backdropFilter: active ? 'blur(10px)' : 'none',
      borderRadius: active ? 6 : 0,
    }}>
      <span style={{width:22,height:22,borderRadius:'50%',background:a.color,color:'#fff',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:9.5,fontWeight:700}}>{a.glyph}</span>
      <div style={{fontSize:13,fontWeight:500}}>{a.sym}</div>
      <div style={{fontSize:12.5,color:'var(--ink-2)',fontVariantNumeric:'tabular-nums',textAlign:'right'}}>{a.price}</div>
      <div style={{fontSize:12.5,color:'var(--ink-1)',fontVariantNumeric:'tabular-nums',textAlign:'right'}}>{a.pct}%</div>
      <div style={{textAlign:'right',fontVariantNumeric:'tabular-nums',fontSize:13}}>{a.value}</div>
      <div style={{textAlign:'right',fontVariantNumeric:'tabular-nums',fontSize:12.5,fontWeight:500,color: dNeg?'var(--neg)':'var(--pos)'}}>{a.d}</div>
    </div>
  );
}

function DerivativeRow({ a }) {
  const deltaNeg = a.delta.startsWith('−') || a.delta.startsWith('-');
  const dNeg = a.d.startsWith('−') || a.d.startsWith('-');
  return (
    <div style={{
      display:'grid',gridTemplateColumns:'28px minmax(0,1fr) 110px 130px 130px 70px',gap:16,
      padding:'12px 4px',borderBottom:'1px solid var(--line-1)',alignItems:'center',
    }}>
      <span style={{width:22,height:22,borderRadius:'50%',background:a.color,color:'#fff',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:9.5,fontWeight:700}}>{a.glyph}</span>
      <div style={{fontSize:13,fontWeight:500}}>{a.sym}</div>
      <div style={{fontSize:12.5,color:'var(--ink-2)',fontVariantNumeric:'tabular-nums',textAlign:'right'}}>{a.price}</div>
      <div style={{textAlign:'right',fontVariantNumeric:'tabular-nums',fontSize:13}}>{a.value}</div>
      <div style={{textAlign:'right',fontVariantNumeric:'tabular-nums',fontSize:12.5,fontWeight:500,color: deltaNeg?'var(--neg)':'var(--pos)'}}>{a.delta}</div>
      <div style={{textAlign:'right',fontVariantNumeric:'tabular-nums',fontSize:12.5,fontWeight:500,color: dNeg?'var(--neg)':'var(--pos)'}}>{a.d}</div>
    </div>
  );
}

function PerformanceSection({ range, setRange, bigHeadline }) {
  const def = RANGE_DEFS.find(d => d.k === range) || RANGE_DEFS[0];
  // Period returns computed from master series so they always match the chart endpoint
  const portSlice  = MASTER_PORTFOLIO.slice(-def.days - 1);
  const benchSlice = MASTER_BENCHMARK.slice(-def.days - 1);
  const portRet  = portSlice[portSlice.length - 1]  - portSlice[0];
  const benchRet = benchSlice[benchSlice.length - 1] - benchSlice[0];
  const fmtPct = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2) + '%';

  return (
    <div style={{marginBottom:48}}>
      <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:20,gap:16,flexWrap:'wrap'}}>
        {bigHeadline ? (
          <div>
            <div style={{fontSize:14,fontWeight:500,color:'var(--ink-1)',marginBottom:12}}>Portfolio return · {def.label}</div>
            <div style={{display:'flex',alignItems:'baseline',gap:14,flexWrap:'wrap'}}>
              <span style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums',color: portRet >= 0 ? 'var(--pos)' : 'var(--neg)'}}>{fmtPct(portRet)}</span>
              <span style={{fontSize:13,color:'var(--ink-3)'}}>vs BTCUSD <span style={{fontWeight:500,color:'var(--ink-1)',fontVariantNumeric:'tabular-nums'}}>{fmtPct(benchRet)}</span></span>
            </div>
          </div>
        ) : (
          <div style={{fontSize:18,fontWeight:600,color:'var(--ink-1)',letterSpacing:'-0.005em'}}>Performance</div>
        )}
        <div style={{fontSize:11.5,color:'var(--ink-3)'}}>
          Benchmark <span style={{color:'var(--ink-2)',fontWeight:500}}>BTC/USD</span>
          <span style={{margin:'0 8px',color:'var(--line-2)'}}>·</span>
          Risk-free rate <span style={{color:'var(--ink-2)',fontWeight:500}}>SOFR (4.83%)</span>
          <span style={{margin:'0 8px',color:'var(--line-2)'}}>·</span>
          Updated <span style={{color:'var(--ink-2)',fontWeight:500}}>30 Apr 2026, 14:02 UTC</span>
        </div>
      </div>
      <PerformanceChart range={range}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(6, minmax(0,1fr))',marginTop:24,gap:4}}>
        {RANGE_DEFS.map(def => (
          <button key={def.k} onClick={() => setRange(def.k)} style={{
            padding:'14px 18px',
            background: range === def.k ? 'var(--bg-subtle)' : 'transparent',
            border:'none',
            borderRadius: 12,
            cursor:'pointer',
            fontFamily:'inherit',
            textAlign:'left',
            color:'var(--ink-1)',
            transition:'background 0.15s',
          }}>
            <div style={{fontSize:14, color:'var(--ink-2)', marginBottom:6}}>{def.label}</div>
            <div style={{fontSize:18, fontWeight:500, color: def.pos ? 'var(--pos)' : 'var(--neg)', fontVariantNumeric:'tabular-nums'}}>
              {def.pct}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PerformanceChart({ range }) {
  const def = RANGE_DEFS.find(d => d.k === range);
  const days = def.days;
  const portSlice  = MASTER_PORTFOLIO.slice(-days - 1);
  const benchSlice = MASTER_BENCHMARK.slice(-days - 1);
  const port  = portSlice.map(v => v - portSlice[0]);
  const bench = benchSlice.map(v => v - benchSlice[0]);

  const allVals = [...port, ...bench, 0];
  const yMin = Math.floor(Math.min(...allVals) / 10) * 10;
  const yMax = Math.ceil(Math.max(...allVals) / 10) * 10;

  const W = 1000, H = 300, LABEL_W = 80;
  const xScale = i => (i / (port.length - 1)) * W;
  const yScale = v => H - ((v - yMin) / (yMax - yMin)) * H;

  const portPath  = port.map((v,i)  => `${i===0?'M':'L'}${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`).join(' ');
  const portFill  = `${portPath} L${xScale(port.length-1).toFixed(1)},${H} L${xScale(0).toFixed(1)},${H} Z`;
  const benchPath = bench.map((v,i) => `${i===0?'M':'L'}${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`).join(' ');

  const ticks = [];
  for (let t = yMin; t <= yMax; t += 10) ticks.push(t);

  const today = new Date('2026-04-30');
  const xLabelCount = days <= 30 ? 4 : days <= 95 ? 5 : days <= 180 ? 6 : 7;
  const xLabels = [];
  for (let i = 0; i < xLabelCount; i++) {
    const fraction = i / (xLabelCount - 1);
    const dataIndex = Math.round(fraction * (port.length - 1));
    const daysAgo = port.length - 1 - dataIndex;
    const d = new Date(today); d.setDate(d.getDate() - daysAgo);
    xLabels.push({ pct: fraction * 100, text: d.toLocaleDateString('en-US', { month: 'short' }) });
  }

  const portLast  = port[port.length - 1];
  const benchLast = bench[bench.length - 1];
  const fmt = v => (v >= 0 ? '+' : '') + v.toFixed(2) + '%';

  const [hover, setHover] = _u1(null);
  const wrapRef = React.useRef(null);

  const onMove = (e) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const chartW = rect.width - LABEL_W;
    const xPx = e.clientX - rect.left;
    if (xPx < 0 || xPx > chartW) { setHover(null); return; }
    const fraction = xPx / chartW;
    const idx = Math.max(0, Math.min(port.length - 1, Math.round(fraction * (port.length - 1))));
    setHover(idx);
  };

  let tooltip = null;
  if (hover != null) {
    const daysAgo = port.length - 1 - hover;
    const d = new Date(today); d.setDate(d.getDate() - daysAgo);
    const dateLabel = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: '2-digit' });
    const xPct = (hover / (port.length - 1)) * 100;
    const onLeftSide = xPct < 50;
    tooltip = {
      portVal: port[hover],
      benchVal: bench[hover],
      dateLabel,
      xPct,
      onLeftSide,
    };
  }

  return (
    <div ref={wrapRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{position:'relative', height: H + 28, paddingRight: LABEL_W}}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{display:'block', overflow:'visible'}}>
        <defs>
          <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4080FF" stopOpacity="0.40"/>
            <stop offset="100%" stopColor="#4080FF" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <line x1="0" y1={yScale(0)} x2={W} y2={yScale(0)} stroke="var(--line-2)" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
        <path d={portFill} fill="url(#portGrad)"/>
        <path d={portPath}  fill="none" stroke="#4080FF" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
        <path d={benchPath} fill="none" stroke="#5ed9b5" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
        {hover != null && (
          <line x1={xScale(hover)} y1={0} x2={xScale(hover)} y2={H} stroke="var(--ink-3)" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.6" style={{pointerEvents:'none'}}/>
        )}
      </svg>

      {hover != null && (
        <>
          <div style={{
            position:'absolute',
            left: `calc((100% - ${LABEL_W}px) * ${hover/(port.length-1)})`,
            top: yScale(port[hover]),
            width: 10, height: 10, borderRadius: '50%',
            background: '#5b9bff',
            border: '2px solid var(--bg-canvas)',
            transform: 'translate(-50%, -50%)',
            pointerEvents:'none',
            zIndex: 2,
          }}/>
          <div style={{
            position:'absolute',
            left: `calc((100% - ${LABEL_W}px) * ${hover/(port.length-1)})`,
            top: yScale(bench[hover]),
            width: 10, height: 10, borderRadius: '50%',
            background: '#6dd9b1',
            border: '2px solid var(--bg-canvas)',
            transform: 'translate(-50%, -50%)',
            pointerEvents:'none',
            zIndex: 2,
          }}/>
        </>
      )}

      {/* Y-axis labels */}
      {ticks.map(t => (
        <div key={t} style={{
          position:'absolute', right: 0, top: yScale(t),
          transform:'translateY(-50%)',
          fontSize: 11, color:'var(--ink-3)',
          fontVariantNumeric:'tabular-nums',
          paddingLeft: 8, lineHeight: 1, pointerEvents:'none',
        }}>{t.toFixed(2)}%</div>
      ))}

      {/* X-axis labels */}
      {xLabels.map((l, i) => (
        <div key={i} style={{
          position:'absolute',
          left: `calc((100% - ${LABEL_W}px) * ${l.pct/100})`,
          top: H + 8,
          transform:'translateX(-50%)',
          fontSize: 11, color:'var(--ink-3)', whiteSpace:'nowrap',
        }}>{l.text}</div>
      ))}

      {/* Legend pills at end of each line — filled, two-tone */}
      <div style={{position:'absolute', right: 0, top: yScale(benchLast), transform:'translateY(-50%)', display:'inline-flex', alignItems:'stretch', fontSize:12, fontWeight:500, lineHeight:1.4, zIndex:2}}>
        <span style={{background:'#6dd9b1', color:'#0e3829', padding:'3px 8px', borderRadius:'5px 0 0 5px'}}>BTCUSD</span>
        <span style={{background:'#a3e7ce', color:'#0e3829', padding:'3px 8px', borderRadius:'0 5px 5px 0', fontVariantNumeric:'tabular-nums'}}>{fmt(benchLast)}</span>
      </div>
      <div style={{position:'absolute', right: 0, top: yScale(portLast), transform:'translateY(-50%)', display:'inline-flex', alignItems:'stretch', fontSize:12, fontWeight:500, lineHeight:1.4, zIndex:2}}>
        <span style={{background:'#5b9bff', color:'#0c1f4a', padding:'3px 8px', borderRadius:'5px 0 0 5px'}}>Portfolio</span>
        <span style={{background:'#a5c4ff', color:'#0c1f4a', padding:'3px 8px', borderRadius:'0 5px 5px 0', fontVariantNumeric:'tabular-nums'}}>{fmt(portLast)}</span>
      </div>

      {/* Crosshair tooltip */}
      {tooltip && (
        <div style={{
          position:'absolute',
          left: `calc((100% - ${LABEL_W}px) * ${tooltip.xPct/100})`,
          top: 16,
          transform: tooltip.onLeftSide ? 'translate(12px, 0)' : 'translate(calc(-100% - 12px), 0)',
          background:'rgba(28, 30, 36, 0.96)',
          backdropFilter:'blur(8px)',
          WebkitBackdropFilter:'blur(8px)',
          border:'1px solid rgba(255,255,255,0.08)',
          borderRadius:8,
          padding:'10px 14px',
          color:'#fff',
          fontSize:13,
          fontFamily:'inherit',
          pointerEvents:'none',
          zIndex:3,
          minWidth:200,
          boxShadow:'0 4px 16px rgba(0,0,0,0.3)',
        }}>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:6}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:8}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:'#5b9bff'}}/>
              <span style={{fontWeight:500}}>Portfolio</span>
            </span>
            <span style={{marginLeft:'auto',fontVariantNumeric:'tabular-nums',fontWeight:500}}>{fmt(tooltip.portVal)}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:8}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:'#6dd9b1'}}/>
              <span style={{fontWeight:500}}>BTCUSD</span>
            </span>
            <span style={{marginLeft:'auto',fontVariantNumeric:'tabular-nums',fontWeight:500}}>{fmt(tooltip.benchVal)}</span>
          </div>
          <div style={{textAlign:'center',color:'rgba(255,255,255,0.55)',fontSize:11.5,marginTop:8,paddingTop:8,borderTop:'1px solid rgba(255,255,255,0.10)'}}>{tooltip.dateLabel}</div>
        </div>
      )}
    </div>
  );
}

function RisksSection({ range }) {
  const r = RISKS_BY_RANGE[range] || RISKS_BY_RANGE['1Y'];
  const def = RANGE_DEFS.find(d => d.k === range);
  return (
    <div style={{marginBottom:48}}>
      <div style={{display:'flex',alignItems:'baseline',gap:10,marginBottom:20}}>
        <div style={{fontSize:18,fontWeight:600,color:'var(--ink-1)',letterSpacing:'-0.005em'}}>Risks</div>
        <div style={{fontSize:11.5,color:'var(--ink-3)'}}>over <span style={{color:'var(--ink-2)',fontWeight:500}}>{def?.label || '1 year'}</span></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <RiskCard title="Sharpe ratio"  value={r.sharpe}  peerValue={r.btcSharpe}  peerLabel="BTCUSD" verdict={sharpeVerdict(r.sharpe)}/>
        <RiskCard title="Sortino ratio" value={r.sortino} peerValue={r.btcSortino} peerLabel="BTCUSD" verdict={sortinoVerdict(r.sortino)}/>
      </div>
    </div>
  );
}

function RiskCard({ title, value, peerValue, peerLabel, verdict }) {
  const delta = value - peerValue;
  const isPos = delta > 0.001;
  const isNeg = delta < -0.001;
  const arrow = isPos ? '↑' : isNeg ? '↓' : '=';
  const deltaColor = isPos ? 'var(--pos)' : isNeg ? 'var(--neg)' : 'var(--ink-3)';
  const valueColor = value < 0 ? 'var(--neg)' : 'var(--ink-1)';
  const fmt = v => v.toFixed(2);
  return (
    <div style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:12,padding:'20px 24px'}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontSize:14,fontWeight:500,color:'var(--ink-2)'}}>{title}</span>
        <span aria-hidden="true" style={{
          display:'inline-flex',alignItems:'center',justifyContent:'center',
          width:14,height:14,borderRadius:'50%',
          background:'var(--bg-subtle)',color:'var(--ink-3)',
          fontSize:10,fontWeight:600,
        }}>?</span>
      </div>
      <div style={{display:'flex',alignItems:'baseline',gap:14,marginTop:10,flexWrap:'wrap'}}>
        <span style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',color:valueColor,fontVariantNumeric:'tabular-nums',lineHeight:1}}>{fmt(value)}</span>
        <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:13}}>
          <span style={{color:deltaColor,fontWeight:500,fontVariantNumeric:'tabular-nums'}}>{arrow} {fmt(Math.abs(delta))}</span>
          <span style={{color:'var(--ink-3)'}}>vs {peerLabel} {fmt(peerValue)}</span>
        </span>
      </div>
      <div style={{fontSize:13,color:'var(--ink-2)',marginTop:10}}>{verdict}</div>
    </div>
  );
}

Object.assign(window, {
  NavView,
  Kpi, PerformanceSection, PerformanceChart, DonutChart, SpotRow,
  RANGE_DEFS, MASTER_PORTFOLIO, MASTER_BENCHMARK, RISKS_BY_RANGE,
});
