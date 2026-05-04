/* Profit & Loss and Balance Sheet views */
const { useState: _pb1 } = React;

// ============================================================================
// PROFIT & LOSS — with subpage tabs
// ============================================================================
function ProfitLossView({ onNav }) {
  const [tab, setTab] = _pb1(() => localStorage.getItem('mos.pnl.tab') || 'statement');
  React.useEffect(() => { localStorage.setItem('mos.pnl.tab', tab); }, [tab]);
  const [range, setRange] = _pb1('MTD');

  return (
    <div style={{padding:'48px 40px 80px',maxWidth:1500,margin:'0 auto'}} data-page>
      {/* Head */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'4px 0 16px',gap:24}}>
        <div>
          <div style={{fontSize:24,fontWeight:600,letterSpacing:'-0.015em',color:'var(--ink-1)'}}>Profit &amp; Loss</div>
          <div style={{fontSize:13,color:'var(--ink-2)',marginTop:4}}>Close of 30 Apr 16:00 UTC · base USD</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
          <button style={pbBtnOutline}><Icon.download style={{width:13,height:13}}/> Export</button>
          <button style={pbBtnPrimary}>Lock period</button>
        </div>
      </div>

      {/* Filter row — hidden for now */}
      {false && <FilterBar
        range={range}
        setRange={setRange}
        ranges={['MTD','QTD','YTD','ITD']}
        chips={['Spot + derivatives','All venues']}
      />}

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:28}}>
        {[
          { l: 'Net P&L',               v: '+$2.34M',  pct: '+5.18%',  s: 'on opening NAV',                         pos: true },
          { l: 'Gross income',          v: '+$2.81M',  pct: '+6.21%',  s: 'Trading +$2.35M · Staking +$0.46M',      pos: true },
          { l: 'Total fees',            v: '−$0.47M',  pct: '−1.04%',  s: 'Mgmt −$0.31M · Perf −$0.16M',            neg: true },
          { l: 'Realised / unrealised', v: '62 / 38',  pct: null,      s: '$1.45M realised vs $0.89M mark' },
        ].map((k,i) => (
          <div key={i} style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,padding:'16px 20px'}}>
            <div style={{fontSize:14,color:'var(--ink-2)',fontWeight:500,marginBottom:8}}>{k.l}</div>
            <div style={{display:'flex',alignItems:'baseline',gap:10,flexWrap:'wrap'}}>
              <span style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums',color: k.pos?'var(--pos)': k.neg?'var(--neg)':'var(--ink-1)'}}>{k.v}</span>
              {k.pct && <span style={{fontSize:13,fontWeight:500,fontVariantNumeric:'tabular-nums',color: k.pos?'var(--pos)': k.neg?'var(--neg)':'var(--ink-3)'}}>{k.pct}</span>}
            </div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:10}}>{k.s}</div>
          </div>
        ))}
      </div>

      {/* Subpage tabs */}
      <div style={{display:'flex',alignItems:'center',gap:4,borderBottom:'1px solid var(--line-1)',marginBottom:24}}>
        {[
          { k: 'statement', l: 'Income statement' },
          { k: 'strategy', l: 'By strategy' },
          { k: 'asset', l: 'By asset' },
          { k: 'fees', l: 'Fees & expenses' },
          { k: 'attribution', l: 'Attribution' },
        ].map(t => (
          <button key={t.k} onClick={()=>setTab(t.k)} className="tab-btn" style={{
            background:'transparent',border:'none',padding:'10px 14px',cursor:'pointer',fontFamily:'inherit',
            fontSize:13,fontWeight: tab===t.k?600:500,
            color: tab===t.k?'var(--ink-1)':'var(--ink-2)',
            borderBottom: tab===t.k?'2px solid var(--ink-1)':'2px solid transparent',
            marginBottom:-1,
          }}>{t.l}</button>
        ))}
      </div>

      {tab === 'statement' && <IncomeStatement/>}
      {tab === 'strategy' && <ByStrategy/>}
      {tab === 'asset' && <ByAsset/>}
      {tab === 'fees' && <FeesExpenses/>}
      {tab === 'attribution' && <Attribution/>}
    </div>
  );
}

// ---- Subpages ----
function IncomeStatement() {
  const rows = [
    { g: 'Income', items: [
      { l: 'Realised trading gains',   v: '+$1,450,000', pct: '+51.6%', sub: '47 trades · avg +0.4%' },
      { l: 'Unrealised mark-to-market', v: '+$890,000',  pct: '+31.7%', sub: 'Across 6 asset lines' },
      { l: 'Staking & yield',          v: '+$462,000',   pct: '+16.4%', sub: 'ETH validators · LINK CCIP · T-bill coupon' },
      { l: 'FX & other',               v: '+$8,200',     pct: '+0.3%',  sub: 'USDC/USDT basis capture' },
    ], total: '+$2,810,200', totalPct: '+100.0%', totalLabel: 'Gross income' },
    { g: 'Costs', items: [
      { l: 'Management fee (1.50% p.a. accrual)',   v: '−$312,400', pct: '−11.1%', sub: 'Accrued daily · billed quarterly' },
      { l: 'Performance fee (20% over HWM)',        v: '−$156,800', pct: '−5.6%',  sub: 'Above high-water mark' },
      { l: 'Custody (0.60% p.a.)',                  v: '−$125,000', pct: '−4.4%',  sub: 'Copper + Ceffu' },
      { l: 'Administration (0.20% p.a.)',           v: '−$41,600',  pct: '−1.5%',  sub: 'EFS' },
      { l: 'Audit & Tax (flat annually)',           v: '−$13,000',  pct: '−0.5%',  sub: 'PwC · KPMG tax review' },
      { l: 'Initial Setup (Legal & Regulatory)',    v: '−$8,000',   pct: '−0.3%',  sub: 'One-off' },
    ], total: '−$656,800', totalPct: '−23.4%', totalLabel: 'Total costs' },
  ];
  return (
    <div>
      <div>
        <div style={{display:'flex',alignItems:'center',padding:'10px 4px',borderBottom:'1px solid var(--line-1)',gap:16,fontSize:11.5,fontWeight:500,color:'var(--ink-3)'}}>
          <div style={{flex:1}}>Line</div>
          <div style={{width:160,textAlign:'right'}}>Amount</div>
          <div style={{width:90,textAlign:'right'}}>% of gross</div>
        </div>
        {rows.map((grp, gi) => (
          <React.Fragment key={gi}>
            <div style={{padding:'14px 4px 8px',fontSize:12,fontWeight:600,color:'var(--ink-2)'}}>{grp.g}</div>
            {grp.items.map((r,i) => (
              <div key={i} style={{display:'flex',alignItems:'baseline',padding:'12px 4px',borderBottom:'1px solid var(--line-1)',gap:16}}>
                <div style={{flex:1,minWidth:0,fontSize:13,fontWeight:500,color:'var(--ink-1)'}}>{r.l}</div>
                <div style={{width:160,textAlign:'right',fontSize:13,fontWeight:500,fontVariantNumeric:'tabular-nums',color: r.v.startsWith('+')?'var(--pos)':'var(--neg)'}}>{r.v}</div>
                <div style={{width:90,textAlign:'right',fontSize:13,fontVariantNumeric:'tabular-nums',color:'var(--ink-3)'}}>{r.pct}</div>
              </div>
            ))}
            <div style={{display:'flex',alignItems:'baseline',padding:'12px 4px',borderBottom: gi===rows.length-1?'none':'1px solid var(--line-1)',gap:16}}>
              <div style={{flex:1,fontSize:13,fontWeight:600,color:'var(--ink-1)'}}>{grp.totalLabel}</div>
              <div style={{width:160,textAlign:'right',fontSize:13,fontWeight:600,fontVariantNumeric:'tabular-nums',color: grp.total.startsWith('+')?'var(--pos)':'var(--neg)'}}>{grp.total}</div>
              <div style={{width:90,textAlign:'right',fontSize:13,fontWeight:600,fontVariantNumeric:'tabular-nums',color:'var(--ink-2)'}}>{grp.totalPct}</div>
            </div>
          </React.Fragment>
        ))}
        <div style={{display:'flex',alignItems:'center',padding:'14px 20px',gap:16,background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,marginTop:8}}>
          <div style={{flex:1,fontSize:13,fontWeight:600,color:'var(--ink-1)'}}>Net P&amp;L for period</div>
          <div style={{width:160,textAlign:'right',fontSize:13,fontWeight:600,fontVariantNumeric:'tabular-nums',color:'var(--pos)'}}>+$2,153,400</div>
          <div style={{width:90,textAlign:'right',fontSize:13,fontWeight:600,fontVariantNumeric:'tabular-nums',color:'var(--pos)'}}>+76.6%</div>
        </div>
      </div>
      <NotesBlock items={[...rows[0].items, ...rows[1].items]}/>
      <div style={{marginTop:16,fontSize:12,color:'var(--ink-3)'}}>Figures reconcile to NAV strike 30 Apr 16:00 UTC · base currency USD · IFRS 9 fair value through P&amp;L</div>
    </div>
  );
}

function ByStrategy() {
  const strategies = [
    { name: 'Directional long', alloc: '58%', pnl: '+$1,420,000', contrib: '+3.15%', win: '72%', bar: 60, pos: true },
    { name: 'Staking / yield', alloc: '14%', pnl: '+$462,000', contrib: '+1.02%', win: '100%', bar: 20, pos: true },
    { name: 'Basis & carry', alloc: '12%', pnl: '+$318,000', contrib: '+0.70%', win: '81%', bar: 14, pos: true },
    { name: 'Market-making', alloc: '9%', pnl: '+$204,000', contrib: '+0.45%', win: '64%', bar: 9, pos: true },
    { name: 'Tactical hedges', alloc: '7%', pnl: '−$146,000', contrib: '−0.32%', win: '38%', bar: -6, pos: false },
  ];
  return (
    <div>
      <table style={{width:'100%',borderCollapse:'collapse',fontVariantNumeric:'tabular-nums'}}>
        <thead>
          <tr style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:500}}>
            <th style={pbTh}>Strategy</th>
            <th style={{...pbTh,textAlign:'right'}}>Allocation</th>
            <th style={{...pbTh,textAlign:'right'}}>P&amp;L</th>
            <th style={{...pbTh,textAlign:'right'}}>Contribution</th>
            <th style={{...pbTh,textAlign:'right'}}>Win rate</th>
            <th style={{...pbTh,minWidth:180}}>Distribution</th>
          </tr>
        </thead>
        <tbody>
          {strategies.map((s,i) => (
            <tr key={i} style={{fontSize:13}}>
              <td style={pbTd}><div style={{fontWeight:500}}>{s.name}</div></td>
              <td style={{...pbTd,textAlign:'right'}}>{s.alloc}</td>
              <td style={{...pbTd,textAlign:'right',fontWeight:500,color: s.pos?'var(--pos)':'var(--neg)'}}>{s.pnl}</td>
              <td style={{...pbTd,textAlign:'right',color: s.pos?'var(--pos)':'var(--neg)'}}>{s.contrib}</td>
              <td style={{...pbTd,textAlign:'right'}}>{s.win}</td>
              <td style={pbTd}>
                <div style={{position:'relative',height:6,background:'var(--bg-subtle)',borderRadius:3}}>
                  <div style={{position:'absolute',left:'50%',top:0,bottom:0,width:1,background:'var(--line-2)'}}/>
                  <div style={{position:'absolute',top:0,bottom:0,borderRadius:3,
                    left: s.bar >= 0 ? '50%' : `calc(50% + ${s.bar}%)`,
                    width: `${Math.abs(s.bar)}%`,
                    background: s.pos?'var(--green-500)':'var(--neg)',
                  }}/>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ByAsset() {
  const assets = [
    { n: 'Bitcoin', s: 'BTC', g: '₿', c: '#E69A2A', qty: '323.80', px: '$68,992', realised: '+$612,000', mtm: '+$420,000', total: '+$1,032,000', pos: true },
    { n: 'Ethereum', s: 'ETH', g: 'Ξ', c: '#5B6FBE', qty: '1,094.00', px: '$2,011', realised: '+$318,000', mtm: '+$186,000', total: '+$504,000', pos: true },
    { n: 'Chainlink', s: 'LINK', g: 'L', c: '#1F5BD9', qty: '109,489', px: '$13.70', realised: '+$82,400', mtm: '+$41,600', total: '+$124,000', pos: true },
    { n: 'Litecoin', s: 'LTC', g: 'Ł', c: '#9AA2A8', qty: '20,362', px: '$54.02', realised: '+$18,200', mtm: '+$34,800', total: '+$53,000', pos: true },
    { n: 'Cardano', s: 'ADA', g: '₳', c: '#1F3C9E', qty: '3.65M', px: '$0.26', realised: '−$12,400', mtm: '+$98,400', total: '+$86,000', pos: true },
    { n: 'Cash & T-bills', s: 'USD', g: '$', c: '#2775CA', qty: '6.25M', px: '—', realised: '+$8,200', mtm: '$0', total: '+$8,200', pos: true },
  ];
  return (
    <div>
      <table style={{width:'100%',borderCollapse:'collapse',fontVariantNumeric:'tabular-nums'}}>
        <thead>
          <tr style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:500}}>
            <th style={pbTh}>Asset</th>
            <th style={{...pbTh,textAlign:'right'}}>Quantity</th>
            <th style={{...pbTh,textAlign:'right'}}>Price</th>
            <th style={{...pbTh,textAlign:'right'}}>Realised</th>
            <th style={{...pbTh,textAlign:'right'}}>Mark-to-market</th>
            <th style={{...pbTh,textAlign:'right'}}>Total P&amp;L</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a,i) => (
            <tr key={i} style={{fontSize:13}}>
              <td style={pbTd}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{width:24,height:24,borderRadius:'50%',background:a.c,color:'#fff',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600}}>{a.g}</span>
                  <div>
                    <div style={{fontWeight:500}}>{a.n}</div>
                    <div style={{fontSize:11,color:'var(--ink-3)'}}>{a.s}</div>
                  </div>
                </div>
              </td>
              <td style={{...pbTd,textAlign:'right'}}>{a.qty}</td>
              <td style={{...pbTd,textAlign:'right'}}>{a.px}</td>
              <td style={{...pbTd,textAlign:'right',color: a.realised.startsWith('+')?'var(--pos)':'var(--neg)'}}>{a.realised}</td>
              <td style={{...pbTd,textAlign:'right',color: a.mtm.startsWith('+')?'var(--pos)': a.mtm==='$0'?'var(--ink-2)':'var(--neg)'}}>{a.mtm}</td>
              <td style={{...pbTd,textAlign:'right',fontWeight:500,color: a.pos?'var(--pos)':'var(--neg)'}}>{a.total}</td>
            </tr>
          ))}
          <tr style={{background:'var(--bg-subtle)',fontSize:13}}>
            <td style={pbTd}><strong>Total</strong></td>
            <td style={pbTd}></td>
            <td style={pbTd}></td>
            <td style={{...pbTd,textAlign:'right',fontWeight:600,color:'var(--pos)'}}>+$1,026,400</td>
            <td style={{...pbTd,textAlign:'right',fontWeight:600,color:'var(--pos)'}}>+$780,800</td>
            <td style={{...pbTd,textAlign:'right',fontWeight:600,color:'var(--pos)'}}>+$1,807,200</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function FeesExpenses() {
  const fees = [
    { l: 'Management fee', rate: '1.50% p.a.', period: '−$312,400', ytd: '−$625,300', note: 'Accrued daily on NAV, billed quarterly' },
    { l: 'Performance fee', rate: '20% over HWM', period: '−$156,800', ytd: '−$156,800', note: 'Crystallised on NAV strike' },
    { l: 'Custody', rate: '0.60% p.a.', period: '−$125,000', ytd: '−$248,500', note: 'Copper + Ceffu' },
    { l: 'Administration', rate: '0.20% p.a.', period: '−$41,600', ytd: '−$82,800', note: 'EFS (Elysium Fund Services)' },
    { l: 'Audit & Tax', rate: 'Flat annually', period: '−$13,000', ytd: '−$26,000', note: 'PwC · KPMG tax review' },
    { l: 'Initial Setup (Legal & Regulatory)', rate: 'One-off', period: '−$8,000', ytd: '−$8,000', note: 'Sub-fund setup' },
  ];
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
        {[
          { l: 'Expense ratio (period)', v: '0.48%', s: 'vs 0.52% prior period' },
          { l: 'YTD fee drag', v: '0.91%', s: 'Below 1.20% budget' },
          { l: 'Performance fee accrued', v: '$156,800', s: 'Above HWM by $784K' },
        ].map((k,i) => (
          <div key={i} style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,padding:'16px 20px'}}>
            <div style={{fontSize:14,color:'var(--ink-2)',fontWeight:500,marginBottom:8}}>{k.l}</div>
            <div style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums'}}>{k.v}</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:10}}>{k.s}</div>
          </div>
        ))}
      </div>
      <div>
        <table style={{width:'100%',borderCollapse:'collapse',fontVariantNumeric:'tabular-nums'}}>
          <thead>
            <tr style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:500}}>
              <th style={pbTh}>Line</th>
              <th style={pbTh}>Rate</th>
              <th style={{...pbTh,textAlign:'right'}}>Period</th>
              <th style={{...pbTh,textAlign:'right'}}>YTD</th>
            </tr>
          </thead>
          <tbody>
            {fees.map((f,i) => (
              <tr key={i} style={{fontSize:13}}>
                <td style={pbTd}><div style={{fontWeight:500}}>{f.l}</div></td>
                <td style={{...pbTd,color:'var(--ink-2)'}}>{f.rate}</td>
                <td style={{...pbTd,textAlign:'right',color:'var(--neg)',fontWeight:500}}>{f.period}</td>
                <td style={{...pbTd,textAlign:'right',color:'var(--ink-2)'}}>{f.ytd}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <NotesBlock items={fees.map(f => ({ l: f.l, sub: f.note }))}/>
      </div>
    </div>
  );
}

function Attribution() {
  const items = [
    { l: 'Asset selection', v: '+$1,182,000', pct: 52, pos: true },
    { l: 'Timing', v: '+$608,000', pct: 27, pos: true },
    { l: 'Sizing', v: '+$346,000', pct: 15, pos: true },
    { l: 'Currency / basis', v: '+$164,000', pct: 7, pos: true },
    { l: 'Hedge drag', v: '−$42,000', pct: 2, pos: false },
  ];
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:32}}>
      <div>
        <div style={{fontSize:14,fontWeight:500,color:'var(--ink-1)',marginBottom:16}}>Attribution breakdown</div>
        {items.map((it,i) => (
          <div key={i} style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:6}}>
              <span style={{fontSize:13,color:'var(--ink-1)'}}>{it.l}</span>
              <span style={{fontSize:13,fontVariantNumeric:'tabular-nums',fontWeight:500,color: it.pos?'var(--pos)':'var(--neg)'}}>{it.v}</span>
            </div>
            <div style={{height:4,background:'var(--bg-subtle)',borderRadius:2,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${it.pct}%`,background: it.pos?'var(--green-500)':'var(--neg)',borderRadius:2}}/>
            </div>
          </div>
        ))}
      </div>
      <div>
        <div style={{fontSize:14,fontWeight:500,color:'var(--ink-1)',marginBottom:12}}>vs benchmark (CCI 30)</div>
        <div style={{display:'flex',alignItems:'baseline',gap:12,marginBottom:20}}>
          <div style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',color:'var(--pos)',fontVariantNumeric:'tabular-nums'}}>+1.82%</div>
          <div style={{fontSize:13,color:'var(--ink-2)'}}>excess return, period</div>
        </div>
        {[
          { l: 'Fund return', v: '+5.18%' },
          { l: 'Benchmark (CCI 30)', v: '+3.36%' },
          { l: 'Information ratio', v: '1.24' },
          { l: 'Tracking error', v: '1.47%' },
          { l: 'Beta to benchmark', v: '0.89' },
        ].map((r,i) => (
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderTop: i===0?'none':'1px solid var(--line-1)',fontSize:13}}>
            <span style={{color:'var(--ink-2)'}}>{r.l}</span>
            <span style={{fontVariantNumeric:'tabular-nums',fontWeight:500}}>{r.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// BALANCE SHEET
// ============================================================================
function BalanceSheetView({ onNav }) {
  const [asOf] = _pb1('30 Apr 2026');

  const assets = [
    { g: 'Current assets', items: [
      { l: 'Digital assets at fair value', v: '$41,286,400', sub: 'BTC, ETH, LINK, LTC, ADA · marked at 16:00 UTC' },
      { l: 'Cash and cash equivalents', v: '$4,218,000', sub: 'USD operating accounts · 3 venues' },
      { l: 'US Treasury bills (< 90 days)', v: '$2,028,000', sub: 'Laddered 4-6wk · avg yield 5.18%' },
      { l: 'Staking receivables', v: '$182,400', sub: 'ETH consensus rewards accrued' },
      { l: 'Other receivables', v: '$46,200', sub: 'Subscription receivable · T+1' },
    ]},
    { g: 'Non-current assets', items: [
      { l: 'Locked staking positions', v: '$412,000', sub: 'ETH validators · 11 day unbond' },
    ]},
  ];
  const liabilities = [
    { g: 'Current liabilities', items: [
      { l: 'Redemption payable', v: '$82,500', sub: 'H. Desrosiers · pending AML' },
      { l: 'Management fee payable', v: '$104,800', sub: 'Q1 accrual' },
      { l: 'Performance fee payable', v: '$156,800', sub: 'Above HWM · crystallised' },
      { l: 'Trade payable', v: '$11,400', sub: 'Exchange fees · T+1' },
      { l: 'Audit & administration accrued', v: '$28,900', sub: 'Quarterly' },
    ]},
  ];
  const equity = [
    { l: 'Contributed capital', v: '$38,420,000', sub: '312 holders · 4 classes' },
    { l: 'Retained earnings', v: '$6,832,000', sub: 'Since inception 2021' },
    { l: 'Current period P&L', v: '$2,258,400', sub: 'MTD, unapproved' },
    { l: 'Less: distributions', v: '−$240,000', sub: 'Class A income Feb' },
  ];

  const totalAssets = 48173000;
  const totalLiab = 384400;
  const totalEquity = 47270400;

  return (
    <div style={{padding:'48px 40px 80px',maxWidth:1500,margin:'0 auto'}} data-page>
      {/* Head */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'4px 0 20px',gap:24}}>
        <div>
          <div style={{fontSize:24,fontWeight:600,letterSpacing:'-0.015em',color:'var(--ink-1)'}}>Balance Sheet</div>
          <div style={{fontSize:13,color:'var(--ink-2)',marginTop:4}}>As of {asOf} 16:00 UTC · base USD · IFRS</div>
        </div>
        <div style={{display:'flex',gap:8,flexShrink:0}}>
          <button style={pbBtnOutline}><Icon.check style={{width:13,height:13,color:'var(--green-600)'}}/> Reconciled</button>
          <button style={pbBtnOutline}><Icon.download style={{width:13,height:13}}/> Export</button>
          <button style={pbBtnPrimary}>Sign off</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:32}}>
        {[
          { l: 'Total assets', v: '$48.17M', s: '$41.3M digital · $6.2M cash/T-bills' },
          { l: 'Total liabilities', v: '$384K', s: '0.80% of assets · all current' },
          { l: "Net assets (equity)", v: '$47.27M', s: 'Ties to NAV within $1 tolerance' },
          { l: 'Leverage', v: '1.00×', s: 'Unlevered · no borrowings' },
        ].map((k,i) => (
          <div key={i} style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,padding:'16px 20px'}}>
            <div style={{fontSize:14,color:'var(--ink-2)',fontWeight:500,marginBottom:8}}>{k.l}</div>
            <div style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums'}}>{k.v}</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:10}}>{k.s}</div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:32,marginBottom:24}}>
        {/* Assets */}
        <div>
          <BSSectionHead title="Assets" total="$48,173,000"/>
          {assets.map((grp,gi) => (
            <React.Fragment key={gi}>
              <div style={{padding:'14px 4px 8px',fontSize:12,fontWeight:600,color:'var(--ink-2)'}}>{grp.g}</div>
              {grp.items.map((r,i) => <BSRow key={i} {...r}/>)}
            </React.Fragment>
          ))}
          <NotesBlock items={assets.flatMap(g => g.items)}/>
        </div>

        {/* Liabilities + Equity */}
        <div style={{display:'flex',flexDirection:'column',gap:32}}>
          <div>
            <BSSectionHead title="Liabilities" total="$384,400"/>
            {liabilities.map((grp,gi) => (
              <React.Fragment key={gi}>
                <div style={{padding:'14px 4px 8px',fontSize:12,fontWeight:600,color:'var(--ink-2)'}}>{grp.g}</div>
                {grp.items.map((r,i) => <BSRow key={i} {...r}/>)}
              </React.Fragment>
            ))}
            <NotesBlock items={liabilities.flatMap(g => g.items)}/>
          </div>

          <div>
            <BSSectionHead title="Net assets / Equity" total="$47,270,400"/>
            {equity.map((r,i) => <BSRow key={i} {...r} negColor/>)}
            <NotesBlock items={equity}/>
          </div>
        </div>
      </div>

      {/* Balance check */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,marginTop:4}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:24,height:24,borderRadius:'50%',background:'var(--green-500)',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
            <Icon.check style={{width:12,height:12,color:'#fff'}}/>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:'var(--ink-1)'}}>Books balance</div>
            <div style={{fontSize:11.5,color:'var(--ink-3)',marginTop:2}}>Assets = Liabilities + Equity · $0 variance · last verified 30 Apr 16:02 UTC</div>
          </div>
        </div>
        <div style={{display:'flex',gap:20,fontVariantNumeric:'tabular-nums'}}>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)'}}>Assets</div>
            <div style={{fontSize:13,fontWeight:600,color:'var(--ink-1)'}}>$48,173,000</div>
          </div>
          <div style={{color:'var(--ink-3)',fontSize:14,alignSelf:'center'}}>=</div>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)'}}>Liab. + Equity</div>
            <div style={{fontSize:13,fontWeight:600,color:'var(--ink-1)'}}>$48,173,000</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterBar({ range, setRange, ranges, chips = [] }) {
  const [activeChips, setActiveChips] = _pb1(chips);
  const removeChip = (c) => setActiveChips(cs => cs.filter(x => x !== c));
  const divider = <div style={{width:1,height:24,background:'var(--line-1)',flexShrink:0}}/>;
  return (
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:28,flexWrap:'wrap'}}>
      <div style={{display:'inline-flex',background:'var(--bg-subtle)',borderRadius:12,padding:4}}>
        {ranges.map(r => (
          <button key={r} onClick={()=>setRange(r)} style={{
            height:32,padding:'0 18px',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:500,
            background: range===r?'var(--bg-canvas)':'transparent',
            color: range===r?'var(--ink-1)':'var(--ink-3)',
            boxShadow: range===r?'0 1px 2px rgba(0,0,0,0.08)':'none',
            transition:'background 0.15s, color 0.15s',
          }}>{r}</button>
        ))}
      </div>
      {activeChips.length > 0 && divider}
      {activeChips.map(c => (
        <button key={c} onClick={()=>removeChip(c)} style={{
          display:'inline-flex',alignItems:'center',gap:8,height:32,padding:'0 14px',
          border:'none',background:'var(--bg-subtle)',borderRadius:8,
          color:'var(--ink-1)',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',
        }}>
          {c}
          <Icon.x style={{width:11,height:11,color:'var(--ink-3)'}}/>
        </button>
      ))}
      {divider}
      <button style={{
        display:'inline-flex',alignItems:'center',gap:8,height:32,padding:'0 14px',
        border:'1px solid var(--line-2)',background:'var(--bg-canvas)',borderRadius:8,
        color:'var(--ink-1)',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',
      }} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-subtle)'} onMouseLeave={e=>e.currentTarget.style.background='var(--bg-canvas)'}>
        <Icon.plus style={{width:13,height:13}}/>
        Filter
      </button>
    </div>
  );
}

// Scoped styles (renamed to avoid collision with views-other)
const pbBtnOutline = { background:'var(--bg-canvas)',border:'1px solid var(--line-2)',height:34,padding:'0 14px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,color:'var(--ink-1)',display:'inline-flex',alignItems:'center',gap:6,fontFamily:'inherit' };
const pbBtnPrimary = { background:'var(--accent-plum)',color:'var(--accent-plum-on)',border:'none',height:34,padding:'0 14px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,fontFamily:'inherit' };
const pbTh = { textAlign:'left',padding:'4px 4px 8px',fontWeight:500,borderBottom:'1px solid var(--line-1)' };
const pbTd = { padding:'12px 4px',borderBottom:'1px solid var(--line-1)' };

function BSSectionHead({ title, total }) {
  return (
    <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',padding:'4px 4px 8px',borderBottom:'1px solid var(--line-1)'}}>
      <div style={{fontSize:13,fontWeight:600,color:'var(--ink-1)'}}>{title}</div>
      <div style={{fontSize:13,fontWeight:600,fontVariantNumeric:'tabular-nums'}}>{total}</div>
    </div>
  );
}

function BSRow({ l, v, negColor }) {
  return (
    <div style={{display:'flex',padding:'12px 4px',borderBottom:'1px solid var(--line-1)',gap:16,alignItems:'baseline'}}>
      <div style={{flex:1,minWidth:0,fontSize:13,fontWeight:500,color:'var(--ink-1)'}}>{l}</div>
      <div style={{fontSize:13,fontWeight:500,fontVariantNumeric:'tabular-nums',color: negColor && v.startsWith('−') ? 'var(--neg)' : 'var(--ink-1)'}}>{v}</div>
    </div>
  );
}

function NotesBlock({ items }) {
  return (
    <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:6,fontSize:12,color:'var(--ink-3)'}}>
      {items.filter(it => it.sub || it.s).map((it,i) => (
        <div key={i}><span style={{color:'var(--ink-2)',fontWeight:500}}>{it.l}</span> · {it.sub || it.s}</div>
      ))}
    </div>
  );
}

Object.assign(window, { ProfitLossView, BalanceSheetView });
