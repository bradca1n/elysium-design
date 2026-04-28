/* NAV view — matches reference: KPIs + Portfolio composition + Venue breakdown + P&L + Balance Sheet */
const { useState: _u1, useMemo: _u2 } = React;

function NavView({ onNav, showTweaks }) {
  const [activeAsset, setActiveAsset] = _u1(null);
  const [sheetOpen, setSheetOpen] = _u1(null);
  const [assetGroup, setAssetGroup] = _u1('spot');

  const assets = [
    { id: 'btc', name: 'Bitcoin', sym: 'BTC', glyph: '₿', color: '#E69A2A', units: '323.80 BTC', price: '$68,992', pct: 47.1, bar: 47.1, value: '$22,340,000', d: '+0.8%', donutColor: 'var(--green-700)' },
    { id: 'eth', name: 'Ethereum', sym: 'ETH', glyph: 'Ξ', color: '#5B6FBE', units: '1,094.00 ETH', price: '$2,011', pct: 4.6, bar: 15, value: '$2,200,000', d: '+3.5%', donutColor: 'var(--green-500)' },
    { id: 'link', name: 'Chainlink', sym: 'LINK', glyph: 'L', color: '#1F5BD9', units: '109,489.00 LINK', price: '$13.70', pct: 3.2, bar: 10, value: '$1,500,000', d: '+1.5%', donutColor: 'var(--green-400)' },
    { id: 'ltc', name: 'Litecoin', sym: 'LTC', glyph: 'Ł', color: '#9AA2A8', units: '20,362.82 LTC', price: '$54.02', pct: 2.3, bar: 7, value: '$1,100,000', d: '+2.0%', donutColor: 'var(--green-300)' },
    { id: 'ada', name: 'Cardano', sym: 'ADA', glyph: '₳', color: '#1F3C9E', units: '3,653,846.15 ADA', price: '$0.26', pct: 2.0, bar: 6, value: '$950,000', d: '+4.1%', donutColor: 'var(--green-200)' },
  ];
  // PLACEHOLDER — pending Timo's answer on Haruko spot vs. derivatives split
  const derivatives = [
    { id: 'btc-perp', name: 'BTC Perpetual', sym: 'BTC-PERP', glyph: '₿', color: '#E69A2A', units: '+12.40 BTC notional', price: '$101,220', pct: 6.8, bar: 22, value: '$3,200,000', d: '+1.2%', donutColor: 'var(--green-700)' },
    { id: 'eth-perp', name: 'ETH Perpetual', sym: 'ETH-PERP', glyph: 'Ξ', color: '#5B6FBE', units: '−180.00 ETH notional', price: '$2,918',   pct: 1.1, bar: 4,  value: '$525,000',   d: '−0.4%', donutColor: 'var(--green-500)' },
    { id: 'sol-fut',  name: 'SOL Futures',   sym: 'SOL-FUT',  glyph: 'S', color: '#7E5BBE', units: '+8,400 SOL notional',  price: '$140',     pct: 0.6, bar: 2,  value: '$280,000',   d: '+2.1%', donutColor: 'var(--green-400)' },
  ];
  const activeAssets = assetGroup === 'spot' ? assets : derivatives;
  const venues = [
    { group: 'Custody', total: '$27.5M', share: '58%', rows: [
      { name: 'Coinbase Prime', holdings: 'BTC, ETH, USDC', value: '$18.0M', share: '38.0%', flow: '+0.32%', margin: null, status: 'verified' },
      { name: 'Copper.co', holdings: 'BTC, SOL', value: '$9.5M', share: '20.0%', flow: '+0.18%', margin: null, status: 'verified' },
    ]},
    { group: 'Exchange', total: '$12.4M', share: '26%', rows: [
      { name: 'Binance', holdings: 'Mixed', value: '$7.1M', share: '15.0%', flow: '−0.12%', margin: 62, status: 'verified' },
      { name: 'OKX', holdings: 'Mixed', value: '$5.3M', share: '11.0%', flow: '−0.08%', margin: 84, status: 'pending' },
    ]},
    { group: 'Cold', total: '$7.5M', share: '16%', rows: [
      { name: 'Self custody', holdings: 'BTC', value: '$7.5M', share: '16.0%', flow: '0.00%', margin: null, status: 'verified' },
    ]},
  ];

  const pnlKpis = [
    { l: 'Realized P&L', v: '+$612,400', s: '8 trades settled', pos: true },
    { l: 'Unrealized P&L', v: '+$1,720,000', s: 'Mark-to-market on open positions', pos: true },
    { l: 'Income', v: '+$26,200', s: 'T-bill yield on free cash', pos: true },
    { l: 'Fees & expenses', v: '−$18,540', s: 'Mgmt + perf accrued', pos: false },
  ];

  const attr = [
    { label: 'Opening NAV · 01 Feb', kind: 'neu', delta: '—', amt: '$45,100,000' },
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
      {/* ========= NET ASSET VALUE ========= */}
      <section style={{marginBottom:56}}>
        <SectionHead title="NAV" desc="Portfolio allocation and live market values across custody & exchanges." right={<PageKebab/>}/>

        {/* Headline KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:8}}>
          {[
            { l: 'NAV', v: '$47,460,000', s: <><span style={{color:'var(--pos)',fontWeight:500}}>+5.2%</span> vs. prior NAV</>, pos: false },
            { l: 'Period P&L (MTD)', v: '+$2,340,000', s: <><span style={{color:'var(--pos)',fontWeight:500}}>+5.2%</span> on opening NAV</>, pos: true },
            { l: 'NAV per share', v: '$104.27', s: <><span style={{color:'var(--pos)',fontWeight:500}}>+$5.18</span> vs. prior NAV</>, pos: false },
          ].map((k,i) => <Kpi key={i} {...k}/>)}
        </div>

        <SubTitle title="Portfolio composition" right={<SegToggle value={assetGroup} setValue={setAssetGroup} options={[{v:'spot',l:'Spot'},{v:'derivatives',l:'Derivatives'}]}/>}/>

        <div style={{display:'grid',gridTemplateColumns:'240px 1fr',gap:32,alignItems:'center',marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'center'}}>
            <DonutChart assets={activeAssets}/>
          </div>
          <div>
            <div style={{display:'grid',gridTemplateColumns:'28px minmax(0,1.3fr) minmax(0,1.4fr) 120px 70px',gap:16,padding:'4px 4px 8px',borderBottom:'1px solid var(--line-1)',fontSize:10.5,color:'var(--ink-3)',fontWeight:500}}>
              <div/><div>Asset</div><div>Allocation</div><div style={{textAlign:'right'}}>Value</div><div style={{textAlign:'right'}}>24h</div>
            </div>
            {activeAssets.map(a => (
              <div key={a.id} onMouseEnter={() => setActiveAsset(a.id)} onMouseLeave={() => setActiveAsset(null)} style={{
                display:'grid',gridTemplateColumns:'28px minmax(0,1.3fr) minmax(0,1.4fr) 120px 70px',gap:16,
                padding:'12px 4px',borderBottom:'1px solid var(--line-1)',alignItems:'center',cursor:'pointer',
                background: activeAsset === a.id ? 'var(--glass-bg)' : 'transparent',
                backdropFilter: activeAsset === a.id ? 'blur(10px)' : 'none',
                borderRadius: activeAsset === a.id ? 6 : 0,
              }}>
                <span style={{width:22,height:22,borderRadius:'50%',background:a.color,color:'#fff',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:9.5,fontWeight:700}}>{a.glyph}</span>
                <div style={{fontSize:13,fontWeight:500}}>
                  {a.name}
                  <span style={{display:'block',fontSize:11.5,color:'var(--ink-3)',marginTop:2,fontVariantNumeric:'tabular-nums',fontWeight:400}}>{a.units} · {a.price}</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:12,minWidth:0}}>
                  <span style={{fontSize:12,fontVariantNumeric:'tabular-nums',minWidth:40,color:'var(--ink-1)'}}>{a.pct}%</span>
                  <span style={{flex:1,height:4,background:'var(--bg-subtle)',borderRadius:3,overflow:'hidden',minWidth:60}}>
                    <span style={{display:'block',height:'100%',width:`${a.bar}%`,background:a.donutColor,borderRadius:3,transition:'width 0.4s'}}/>
                  </span>
                </div>
                <div style={{textAlign:'right',fontVariantNumeric:'tabular-nums',fontSize:13}}>{a.value}</div>
                <div style={{textAlign:'right',fontVariantNumeric:'tabular-nums',fontSize:12.5,fontWeight:500,color:'var(--pos)'}}>{a.d}</div>
              </div>
            ))}
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
          <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.3fr) minmax(0,1.0fr) 100px 70px 90px 110px 100px',gap:16,padding:'4px 4px 8px',borderBottom:'1px solid var(--line-1)',fontSize:10.5,color:'var(--ink-3)',fontWeight:500}}>
            <div>Venue</div><div>Holdings</div><div style={{textAlign:'right'}}>Value</div><div style={{textAlign:'right'}}>Share</div><div style={{textAlign:'right'}}>Net flow</div><div style={{textAlign:'right'}}>Margin</div><div style={{textAlign:'right'}}>Status</div>
          </div>
          {venues.map((v,i) => (
            <React.Fragment key={i}>
              <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.3fr) minmax(0,1.0fr) 100px 70px 90px 110px 100px',gap:16,padding:'14px 4px 8px',borderBottom:'1px solid var(--line-2)',fontSize:10.5,color:'var(--ink-3)',fontWeight:600,marginTop:4}}>
                <div style={{color:'var(--ink-2)'}}>{v.group}</div>
                <div/>
                <div style={{textAlign:'right',color:'var(--ink-1)',textTransform:'none',letterSpacing:0,fontSize:12.5,fontWeight:500}}>{v.total}</div>
                <div style={{textAlign:'right',color:'var(--ink-3)',textTransform:'none',letterSpacing:0,fontSize:12.5,fontWeight:500}}>{v.share}</div>
                <div/><div/><div/>
              </div>
              {v.rows.map((r,j) => (
                <div key={j} style={{display:'grid',gridTemplateColumns:'minmax(0,1.3fr) minmax(0,1.0fr) 100px 70px 90px 110px 100px',gap:16,padding:'11px 4px',borderBottom:'1px solid var(--line-1)',alignItems:'center',fontSize:13,fontVariantNumeric:'tabular-nums'}}>
                  <div style={{fontWeight:500}}>{r.name}</div>
                  <div style={{color:'var(--ink-2)',fontSize:12.5}}>{r.holdings}</div>
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

        {/* Treasury flows */}
        <SubTitle title="Treasury flows" right={<span style={{fontSize:11.5,color:'var(--ink-3)'}}>Next dealing · 03d 14h 22m</span>}/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
          <Kpi l="Net flow next dealing" v="−$170,000" s="Subs +$150K · Redemptions −$320K" neg/>
          <Kpi l="Available stables / USD" v="$6.25M" s="4.2% APY across 4 venues"/>
          <Kpi l="Coverage ratio" v="36×" s="Free cash ÷ net redemption demand"/>
        </div>
      </section>

      {/* ========= PROFIT & LOSS ========= */}
      <section style={{marginBottom:56}}>
        <SectionHead title="Profit & Loss" desc="Drivers of NAV change this period. Month-to-date as of 07 Feb 16:00 UTC." cta={{ label: 'Open Profit & Loss', onClick: () => onNav('pnl') }}/>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
          {pnlKpis.map((k,i) => <Kpi key={i} {...k}/>)}
        </div>

        <SubTitle title="Profit & Loss" right={<span style={{fontSize:11.5,color:'var(--ink-3)'}}>01 Feb → 07 Feb</span>}/>

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
                <div style={{fontWeight:600,color:'var(--ink-1)'}}>Closing NAV · 07 Feb</div>
                <div style={{textAlign:'right',fontWeight:600,color:'var(--pos)'}}>+$2,360,060</div>
                <div style={{textAlign:'right',fontWeight:600,color:'var(--ink-1)'}}>$47,460,060</div>
              </div>
            </div>
      </section>

      {/* ========= BALANCE SHEET ========= */}
      <section>
        <SectionHead title="Balance sheet" desc="Net assets snapshot reconciling to NAV. As of 07 Feb 16:00 UTC." cta={{ label: 'Open Balance Sheet', onClick: () => onNav('balance-sheet') }}/>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:24}}>
          <Kpi l="Total assets" v="$47,803,000" s="Investments + cash + receivables"/>
          <Kpi l="Total liabilities" v="−$343,000" s="Payables + settlements" pos={false} neg/>
          <Kpi l="Net assets (NAV)" v="$47,460,000" s="Assets − liabilities"/>
        </div>

        <div style={{overflow:'hidden'}}>
          <BSSection title="Assets" rows={bsAssets} total={{ l: 'Total assets', v: '$47,803,000' }}/>
          <BSSection title="Liabilities" rows={bsLiab} total={{ l: 'Total liabilities', v: '−$343,000', neg: true }}/>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',background:'#15151A',color:'#F2F0EC',borderRadius:8,marginTop:8}}>
            <div style={{fontSize:14,fontWeight:600}}>Net assets</div>
            <div style={{fontSize:16,fontWeight:600,fontVariantNumeric:'tabular-nums'}}>$47,460,000</div>
          </div>
        </div>
      </section>

      {sheetOpen && <SideSheet kind={sheetOpen} onClose={() => setSheetOpen(null)}/>}
    </div>
  );
}

// ---------- Helpers ----------
function DonutChart({ assets }) {
  // Normalize slices so they sum to 100% of the donut regardless of actual pct
  const total = assets.reduce((s,a) => s + a.pct, 0);
  const R = 78, r = 54, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div style={{position:'relative',width:180,height:180}}>
      <svg width="180" height="180" viewBox="0 0 180 180" style={{transform:'rotate(-90deg)'}}>
        <circle cx="90" cy="90" r={R} fill="none" stroke="var(--bg-subtle)" strokeWidth={R - r}/>
        {assets.map((a,i) => {
          const share = a.pct / total;
          const len = share * C;
          const el = (
            <circle key={i} cx="90" cy="90" r={R} fill="none"
              stroke={a.donutColor}
              strokeWidth={R - r}
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
        <div style={{fontSize:10.5,color:'var(--ink-3)',fontWeight:500}}>NAV</div>
        <div style={{fontSize:22,fontWeight:600,letterSpacing:'-0.015em',fontVariantNumeric:'tabular-nums',marginTop:2}}>$47.46M</div>
        <div style={{fontSize:11.5,color:'var(--ink-3)',marginTop:2}}>5 assets</div>
      </div>
    </div>
  );
}

function Kpi({ l, v, s, pos, neg }) {
  return (
    <div style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:10,padding:'16px 20px'}}>
      <div style={{fontSize:11,color:'var(--ink-2)',fontWeight:500,marginBottom:8}}>{l}</div>
      <div style={{fontSize:26,fontWeight:600,letterSpacing:'-0.015em',fontVariantNumeric:'tabular-nums',color: pos?'var(--pos)': neg?'var(--neg)':'var(--ink-1)'}}>{v}</div>
      <div style={{fontSize:11.5,color:'var(--ink-2)',marginTop:6}}>{s}</div>
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
    <div style={{display:'flex',alignItems:'center',gap:12,margin:'32px 0 12px'}}>
      <div style={{fontSize:16,fontWeight:500,color:'var(--ink-1)'}}>{title}</div>
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
    verified: { bg: 'var(--green-50)', fg: 'var(--green-700)', border: 'var(--green-200)', label: 'Verified' },
    pending: { bg: '#FFF6E6', fg: '#8A5A10', border: '#F5E2B8', label: 'Pending' },
  };
  const s = map[status] || map.verified;
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'2px 8px',borderRadius:999,fontSize:11.5,fontWeight:500,background:s.bg,color:s.fg,border:`1px solid ${s.border}`}}>
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

Object.assign(window, { NavView });
