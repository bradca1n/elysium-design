/* Overview view — fund-level aggregate of NAV, dealing, capacity, classes, composition, activity */
const { useState: _ov1 } = React;

function OverviewView({ onNav }) {
  const [perfRange, setPerfRange] = _ov1('3M');

  const classes = [
    { name: 'Class A', navShare: '$104.27', units: '199,920', total: '$20,838,000', mgmt: '2.00%', perf: '20%', investors: 12, change: '+5.2%' },
    { name: 'Class B', navShare: '$213.50', units: '70,210',  total: '$14,990,000', mgmt: '1.50%', perf: '20%', investors: 4,  change: '+4.8%' },
    { name: 'Class C', navShare: '$556.20', units: '21,000',  total: '$11,680,000', mgmt: '0.50%', perf: '30%', investors: 3,  change: '+5.5%' },
  ];

  const activity = [
    { date: '29 Apr 2026', investor: 'NovaTech Fund',     type: 'Subscription', cls: 'A', amount: '$950,000', units: '9,113.04',  status: 'pending' },
    { date: '28 Apr 2026', investor: 'GlobalNest',        type: 'Redemption',  cls: 'B', amount: '$350,000', units: '−1,639.34', status: 'settled' },
    { date: '25 Apr 2026', investor: 'ApexHoldings',      type: 'Subscription', cls: 'C', amount: '$1,500,000', units: '2,696.15', status: 'pending' },
    { date: '23 Apr 2026', investor: 'Zenith Capital',    type: 'Redemption',  cls: 'A', amount: '$600,000', units: '−5,754.44', status: 'settled' },
    { date: '20 Apr 2026', investor: 'Vanguard Corp',     type: 'Subscription', cls: 'B', amount: '$1,100,000', units: '5,152.22', status: 'settled' },
  ];

  const summary = [
    { l: 'Strategy type', v: 'Liquid crypto multi-asset' },
    { l: 'Primary assets', v: 'BTC, ETH, LINK' },
    { l: 'Risk profile', v: 'Moderate-high' },
    { l: 'Liquidity',    v: 'Weekly dealing' },
    { l: 'Capacity',     v: '$100M' },
    { l: 'Current AUM',  v: '$47.46M' },
  ];

  // Capacity bar segments
  const cap = { hard: 100_000_000, filled: 47_460_000, pending: 3_200_000 };
  const filledPct  = (cap.filled / cap.hard) * 100;
  const pendingPct = (cap.pending / cap.hard) * 100;
  const availablePct = 100 - filledPct - pendingPct;

  return (
    <div style={{padding:'48px 40px 80px',maxWidth:1500,margin:'0 auto'}} data-page>
      {/* ===== Page header ===== */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'4px 0 32px',gap:24}}>
        <div>
          <div style={{fontSize:24,fontWeight:600,letterSpacing:'-0.015em',color:'var(--ink-1)'}}>Overview</div>
          <div style={{fontSize:13,color:'var(--ink-2)',marginTop:4}}>Fund-level snapshot across NAV, dealing, capacity and classes.</div>
        </div>
        <div style={{display:'flex',gap:8,flexShrink:0}}>
          <button style={ovBtnOutline}>Invite investor</button>
          <button style={ovBtnPrimary}>+ Add share class</button>
          <button aria-label="More" style={{width:32,height:32,border:'1px solid var(--line-2)',background:'var(--bg-canvas)',borderRadius:8,cursor:'pointer',color:'var(--ink-2)',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
          </button>
        </div>
      </div>

      {/* ===== Two-column main: chart + status ===== */}
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 340px',gap:32,marginBottom:48}}>
        <div style={{minWidth:0}}>
          {/* Headline NAV tile */}
          <div style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,padding:'18px 22px',marginBottom:24,position:'relative'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16}}>
              <div>
                <div style={{fontSize:14,color:'var(--ink-2)',fontWeight:500,marginBottom:8}}>NAV</div>
                <div style={{display:'flex',alignItems:'baseline',gap:10,flexWrap:'wrap'}}>
                  <span style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums',color:'var(--ink-1)'}}>$47,460,000</span>
                  <span style={{fontSize:13,fontWeight:500,color:'var(--pos)',fontVariantNumeric:'tabular-nums'}}>+5.2%</span>
                  <span style={{fontSize:13,color:'var(--ink-3)',fontVariantNumeric:'tabular-nums'}}>+$2,340,000 vs prior</span>
                </div>
              </div>
              <button onClick={() => onNav('nav')} style={{
                display:'inline-flex',alignItems:'center',gap:6,height:30,padding:'0 12px',
                border:'1px solid var(--line-2)',borderRadius:8,background:'var(--bg-canvas)',
                color:'var(--ink-1)',fontSize:12.5,fontWeight:500,cursor:'pointer',fontFamily:'inherit',
                whiteSpace:'nowrap',
              }}>
                Open NAV
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4.66 11.33 11.33 4.66M11.33 4.66H4.66M11.33 4.66v6.67"/></svg>
              </button>
            </div>
          </div>

          {/* Performance section (chart + period tabs) */}
          <PerformanceSection range={perfRange} setRange={setPerfRange} bigHeadline/>
        </div>

        {/* Status panel */}
        <StatusPanel cap={cap} filledPct={filledPct} pendingPct={pendingPct} availablePct={availablePct} onNav={onNav}/>
      </div>

      {/* ===== Share classes ===== */}
      <div style={{fontSize:18,fontWeight:600,letterSpacing:'-0.005em',marginBottom:20}}>Share classes</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:48}}>
        {classes.map((c,i) => <ClassCard key={i} {...c}/>)}
      </div>

      {/* ===== Recent activity ===== */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div style={{fontSize:18,fontWeight:600,letterSpacing:'-0.005em',color:'var(--ink-1)'}}>Recent activity</div>
        <button onClick={() => onNav('order-book')} style={{
          display:'inline-flex',alignItems:'center',gap:6,height:30,padding:'0 12px',
          border:'1px solid var(--line-2)',borderRadius:8,background:'var(--bg-canvas)',
          color:'var(--ink-1)',fontSize:12.5,fontWeight:500,cursor:'pointer',fontFamily:'inherit',
        }}>
          Open order book
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4.66 11.33 11.33 4.66M11.33 4.66H4.66M11.33 4.66v6.67"/></svg>
        </button>
      </div>
      <div style={{marginBottom:48}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontVariantNumeric:'tabular-nums'}}>
          <thead>
            <tr style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:500,textAlign:'left'}}>
              <th style={{padding:'4px 4px 8px',fontWeight:500,borderBottom:'1px solid var(--line-1)'}}>Date</th>
              <th style={{padding:'4px 4px 8px',fontWeight:500,borderBottom:'1px solid var(--line-1)'}}>Investor</th>
              <th style={{padding:'4px 4px 8px',fontWeight:500,borderBottom:'1px solid var(--line-1)'}}>Type</th>
              <th style={{padding:'4px 4px 8px',fontWeight:500,borderBottom:'1px solid var(--line-1)'}}>Class</th>
              <th style={{padding:'4px 4px 8px',fontWeight:500,textAlign:'right',borderBottom:'1px solid var(--line-1)'}}>Amount</th>
              <th style={{padding:'4px 4px 8px',fontWeight:500,textAlign:'right',borderBottom:'1px solid var(--line-1)'}}>Units</th>
              <th style={{padding:'4px 4px 8px',fontWeight:500,textAlign:'right',borderBottom:'1px solid var(--line-1)'}}>Status</th>
            </tr>
          </thead>
          <tbody>
            {activity.map((r,i) => (
              <tr key={i} style={{fontSize:13}}>
                <td style={{padding:'12px 4px',borderBottom:'1px solid var(--line-1)',color:'var(--ink-2)',whiteSpace:'nowrap'}}>{r.date}</td>
                <td style={{padding:'12px 4px',borderBottom:'1px solid var(--line-1)',fontWeight:500}}>{r.investor}</td>
                <td style={{padding:'12px 4px',borderBottom:'1px solid var(--line-1)',color: r.type==='Subscription' ? 'var(--pos)' : 'var(--neg)',fontWeight:500}}>{r.type}</td>
                <td style={{padding:'12px 4px',borderBottom:'1px solid var(--line-1)',color:'var(--ink-2)'}}>{r.cls}</td>
                <td style={{padding:'12px 4px',borderBottom:'1px solid var(--line-1)',textAlign:'right'}}>{r.amount}</td>
                <td style={{padding:'12px 4px',borderBottom:'1px solid var(--line-1)',textAlign:'right',color: r.units.startsWith('−') ? 'var(--neg)' : 'var(--ink-1)'}}>{r.units}</td>
                <td style={{padding:'12px 4px',borderBottom:'1px solid var(--line-1)',textAlign:'right'}}>
                  <span style={{
                    display:'inline-flex',alignItems:'center',gap:5,fontSize:11.5,fontWeight:500,
                    color: r.status === 'settled' ? 'var(--green-700)' : '#8A5A10',
                  }}>
                    {r.status === 'settled' && <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3.5 8.5 6.5 11.5 12.5 5"/></svg>}
                    {r.status === 'pending' && <span style={{width:6,height:6,borderRadius:'50%',background:'#D89A20'}}/>}
                    {r.status === 'settled' ? 'Settled' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== Strategy ===== */}
      <div style={{fontSize:18,fontWeight:600,letterSpacing:'-0.005em',marginBottom:20}}>Strategy</div>
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 320px',gap:32}}>
        <div>
          <div style={{fontSize:14,fontWeight:500,color:'var(--ink-1)',marginBottom:10}}>Description</div>
          <div style={{fontSize:13,color:'var(--ink-2)',lineHeight:1.6,maxWidth:640}}>
            The POD Crypto Fund is an actively managed, liquid digital asset strategy designed to provide long-term capital
            appreciation through diversified exposure to the cryptocurrency market. The fund primarily allocates to
            high-conviction assets such as Bitcoin and Ethereum, complemented by selective positions in emerging protocols
            and opportunistic allocations to stablecoin-based yield.
          </div>
        </div>
        <div>
          <div style={{fontSize:14,fontWeight:500,color:'var(--ink-1)',marginBottom:10}}>Summary</div>
          <div>
            {summary.map((r,i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderTop: i===0?'none':'1px solid var(--line-1)',fontSize:13}}>
                <span style={{color:'var(--ink-2)'}}>{r.l}</span>
                <span style={{color:'var(--ink-1)',fontWeight:500,fontVariantNumeric:'tabular-nums',textAlign:'right'}}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Status panel (right column) ---
function StatusPanel({ cap, filledPct, pendingPct, availablePct, onNav }) {
  const fmt$ = n => '$' + n.toLocaleString('en-US');
  return (
    <div style={{display:'flex',flexDirection:'column',gap:24}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,padding:'18px 22px'}}>
          <div style={{fontSize:14,color:'var(--ink-2)',fontWeight:500,marginBottom:8}}>Subscriptions</div>
          <div style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums'}}>5</div>
        </div>
        <div style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,padding:'18px 22px'}}>
          <div style={{fontSize:14,color:'var(--ink-2)',fontWeight:500,marginBottom:8}}>Redemptions</div>
          <div style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums'}}>2</div>
        </div>
      </div>
      <StatusGroup title="Status" rows={[
        { l: 'Dealing window',         v: <span style={{color:'var(--pos)',fontWeight:500}}>Open</span> },
        { l: 'Cutoff',                 v: 'Sun 03 May, 17:00 UTC' },
        { l: 'Next dealing',           v: 'Mon 04 May, 17:00 UTC' },
        { l: 'Settlement',             v: 'Mon 04 May, 2026' },
        { l: 'Last NAV',               v: 'Wed 30 Apr, 16:00 UTC' },
        { l: 'Frequency',              v: 'Weekly' },
        { l: 'Custody reconciliation', v: <StatusBadge status="verified"/> },
        { l: 'NAV calculation',        v: <StatusBadge status="complete"/> },
      ]}/>

      <StatusGroup title="Activity" rows={[
        { l: 'Subscriptions', v: <span style={{color:'var(--pos)',fontWeight:500,fontVariantNumeric:'tabular-nums'}}>+$3,200,000</span> },
        { l: 'Redemptions',   v: <span style={{color:'var(--neg)',fontWeight:500,fontVariantNumeric:'tabular-nums'}}>−$4,200,000</span> },
        { l: 'Net flow',      v: <span style={{color:'var(--neg)',fontWeight:500,fontVariantNumeric:'tabular-nums'}}>−$1,000,000</span> },
      ]}/>

      <StatusGroup title="Pending dealing impact" rows={[
        { l: 'Net units change', v: <span style={{fontVariantNumeric:'tabular-nums'}}>−6,243.43</span> },
        { l: 'Settlement impact', v: 'Mon 04 May' },
      ]}/>

      <div>
        <div style={{fontSize:14,fontWeight:500,color:'var(--ink-1)',marginBottom:12}}>Capacity</div>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:12.5}}>
          <span style={{color:'var(--ink-2)'}}>Hard cap</span>
          <span style={{fontVariantNumeric:'tabular-nums',fontWeight:500}}>{fmt$(cap.hard)}</span>
        </div>
        <div style={{display:'flex',height:8,borderRadius:4,overflow:'hidden',background:'var(--bg-subtle)',marginBottom:14}}>
          <div style={{width:`${filledPct}%`,background:'var(--accent-plum)'}}/>
          <div style={{width:`${pendingPct}%`,background:'color-mix(in oklab, var(--accent-plum) 50%, var(--bg-canvas))'}}/>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8,fontSize:12.5}}>
          <div style={{display:'flex',justifyContent:'space-between'}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:6,color:'var(--ink-2)'}}>
              <span style={{width:8,height:8,borderRadius:2,background:'var(--accent-plum)'}}/> Filled
            </span>
            <span style={{fontVariantNumeric:'tabular-nums'}}>{fmt$(cap.filled)} <span style={{color:'var(--ink-3)'}}>· {filledPct.toFixed(1)}%</span></span>
          </div>
          <div style={{display:'flex',justifyContent:'space-between'}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:6,color:'var(--ink-2)'}}>
              <span style={{width:8,height:8,borderRadius:2,background:'color-mix(in oklab, var(--accent-plum) 50%, var(--bg-canvas))'}}/> Pending
            </span>
            <span style={{fontVariantNumeric:'tabular-nums'}}>{fmt$(cap.pending)} <span style={{color:'var(--ink-3)'}}>· {pendingPct.toFixed(1)}%</span></span>
          </div>
          <div style={{display:'flex',justifyContent:'space-between'}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:6,color:'var(--ink-2)'}}>
              <span style={{width:8,height:8,borderRadius:2,background:'var(--bg-subtle)',border:'1px solid var(--line-2)'}}/> Available
            </span>
            <span style={{fontVariantNumeric:'tabular-nums'}}>{fmt$(cap.hard - cap.filled - cap.pending)} <span style={{color:'var(--ink-3)'}}>· {availablePct.toFixed(1)}%</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusGroup({ title, rows }) {
  return (
    <div>
      <div style={{fontSize:14,fontWeight:500,color:'var(--ink-1)',marginBottom:12}}>{title}</div>
      {rows.map((r,i) => (
        <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderTop: i===0?'none':'1px solid var(--line-1)',fontSize:12.5}}>
          <span style={{color:'var(--ink-2)'}}>{r.l}</span>
          <span style={{color:'var(--ink-1)',textAlign:'right'}}>{r.v}</span>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    verified: { fg:'var(--green-700)', label:'Verified' },
    complete: { fg:'var(--green-700)', label:'Complete' },
  };
  const s = map[status] || map.verified;
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:5,fontWeight:500,color:s.fg}}>
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3.5 8.5 6.5 11.5 12.5 5"/></svg>
      {s.label}
    </span>
  );
}

function ClassCard({ name, navShare, units, total, mgmt, perf, investors, change }) {
  return (
    <div style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:10,padding:'18px 22px'}}>
      <div style={{fontSize:14,fontWeight:500,color:'var(--ink-2)',marginBottom:10}}>{name}</div>
      <div style={{display:'flex',alignItems:'baseline',gap:10,flexWrap:'wrap',marginBottom:4}}>
        <span style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums',color:'var(--ink-1)'}}>{total}</span>
        <span style={{fontSize:13,fontWeight:500,fontVariantNumeric:'tabular-nums',color:'var(--pos)'}}>{change}</span>
      </div>
      <div style={{fontSize:13,color:'var(--ink-3)',fontVariantNumeric:'tabular-nums'}}>{navShare} / unit</div>
      <div style={{marginTop:16,paddingTop:14,borderTop:'1px solid var(--line-1)',display:'flex',flexDirection:'column',gap:6,fontSize:12.5,color:'var(--ink-2)',fontVariantNumeric:'tabular-nums'}}>
        <div>{units} units · {investors} investors</div>
        <div>{mgmt} mgmt · {perf} perf fee</div>
      </div>
    </div>
  );
}

const ovBtnOutline = { background:'var(--bg-canvas)',border:'1px solid var(--line-2)',height:32,padding:'0 14px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,color:'var(--ink-1)',display:'inline-flex',alignItems:'center',gap:6,fontFamily:'inherit' };
const ovBtnPrimary = { background:'var(--accent-plum)',color:'var(--accent-plum-on)',border:'none',height:32,padding:'0 14px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,fontFamily:'inherit',display:'inline-flex',alignItems:'center',gap:6 };

Object.assign(window, { OverviewView });
