/* Economics view — Fees earned & Expenses paid */
const { useState: _e1, useMemo: _e2 } = React;

function EconomicsView({ onNav }) {
  const [range, setRange] = _e1('ytd'); // mtd | qtd | ytd | itd

  // Fees earned over time — monthly series for current YTD (Apr)
  const series = [
    { m: 'May', mgt: 48.2, perf: 18.4 },
    { m: 'Jun', mgt: 49.1, perf: 22.9 },
    { m: 'Jul', mgt: 51.4, perf:  9.1 },
    { m: 'Aug', mgt: 53.0, perf: 14.7 },
    { m: 'Sep', mgt: 52.7, perf: 31.2 },
    { m: 'Oct', mgt: 55.8, perf: 26.5 },
    { m: 'Nov', mgt: 58.2, perf:  0.0 },
    { m: 'Dec', mgt: 59.0, perf: 42.4 },
    { m: 'Jan', mgt: 60.1, perf: 11.2 },
    { m: 'Feb', mgt: 61.4, perf: 33.0 },
    { m: 'Mar', mgt: 63.2, perf: 27.8 },
    { m: 'Apr', mgt: 64.0, perf: 18.6 },
  ];

  // Withdrawal ledger
  const withdrawals = [
    { date: '03 Apr 2026', to: 'Operating · Citi 4451', amount: '+$85,000',  memo: 'Management fee sweep — Mar' },
    { date: '06 Mar 2026', to: 'Operating · Citi 4451', amount: '+$72,400',  memo: 'Performance fee · Q1 interim' },
    { date: '05 Feb 2026', to: 'Operating · Citi 4451', amount: '+$61,250',  memo: 'Management fee sweep — Jan' },
    { date: '09 Jan 2026', to: 'Operating · Citi 4451', amount: '+$58,100',  memo: 'Management fee sweep — Dec' },
  ];

  // Re-invested tranches (fees left to compound alongside investors)
  const reinvested = [
    { date: '07 Apr 2026', class: 'Class A', units: '1,284.2', value: '$128,657', basis: '$100.16', status: 'locked' },
    { date: '05 Mar 2026', class: 'Class A', units:   '912.8', value: '$91,477',  basis: '$100.22', status: 'locked' },
    { date: '03 Feb 2026', class: 'Class I', units:   '42.10', value: '$423,141', basis: '$10,048.40', status: 'locked' },
    { date: '06 Jan 2026', class: 'Class A', units:   '683.3', value: '$68,488',  basis: '$100.24', status: 'locked' },
  ];

  // Custody fees by venue — monthly
  const custody = [
    { venue: 'Coinbase Prime', aum: '$18.0M', bps: 8,  monthly: '$12,000',  ytd: '$48,000',  logoBg: '#0E4FE3' },
    { venue: 'Copper.co',      aum: '$9.5M',  bps: 12, monthly: '$9,500',   ytd: '$38,000',  logoBg: '#111111' },
    { venue: 'BitGo',          aum: '$4.2M',  bps: 10, monthly: '$3,500',   ytd: '$14,000',  logoBg: '#0B1A33' },
    { venue: 'Fireblocks',     aum: '$3.8M',  bps: 14, monthly: '$4,430',   ytd: '$17,720',  logoBg: '#F06536' },
    { venue: 'Self-custody',   aum: '$7.5M',  bps: 0,  monthly: '—',        ytd: '—',        logoBg: '#5edaa6' },
  ];

  return (
    <div style={{padding:'48px 40px 80px',maxWidth:1500,margin:'0 auto'}} data-page>
      {/* ===== Head ===== */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:24,marginBottom:16}}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:24,fontWeight:600,color:'var(--ink-1)',letterSpacing:'-0.015em'}}>Economics</div>
          <div style={{fontSize:13,color:'var(--ink-2)',marginTop:4}}>Fees, performance and capital flows for the period.</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          <button aria-label="More" style={{width:32,height:32,border:'1px solid var(--line-2)',background:'var(--bg-canvas)',borderRadius:8,cursor:'pointer',color:'var(--ink-2)',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
          </button>
        </div>
      </div>

      {/* FilterBar hidden for now */}
      {false && <FilterBar
        range={range.toUpperCase()}
        setRange={r => setRange(r.toLowerCase())}
        ranges={['MTD','QTD','YTD','ITD']}
        chips={['All custody venues']}
      />}

      {/* ===== KPI strip ===== */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:48}}>
        <KpiCard l="Fees earned · YTD"      v="$844,200"  s={<><span style={{color:'var(--pos)',fontWeight:500}}>+12.4%</span> vs. prior YTD</>}/>
        <KpiCard l="Available for withdrawal" v="$118,400" s="Swept to Operating monthly"/>
        <KpiCard l="Invested in the fund"   v="$711,763"  s="Re-invested · 4,823 units across A/I"/>
        <KpiCard l="Expenses · YTD"         v="$117,720"  s="Custody fees across 4 venues" neg/>
      </div>

      {/* ===== Fees earned ===== */}
      <SectionHeadE title="Fees earned"/>

      {/* Timeline chart */}
      <div style={{background:'var(--bg-card)',border:'1px solid var(--line-1)',borderRadius:12,padding:'20px 24px',marginBottom:32}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div>
            <div style={{fontSize:13,fontWeight:500,color:'var(--ink-2)'}}>Fees earned, monthly</div>
            <div style={{fontSize:22,fontWeight:600,letterSpacing:'-0.01em',fontVariantNumeric:'tabular-nums',marginTop:4}}>$82.6K <span style={{fontSize:13,fontWeight:400,color:'var(--ink-3)'}}>· April</span></div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:14,fontSize:11.5,color:'var(--ink-2)'}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:6}}><span style={{width:10,height:10,borderRadius:2,background:'#1d7d59'}}/> Management</span>
            <span style={{display:'inline-flex',alignItems:'center',gap:6}}><span style={{width:10,height:10,borderRadius:2,background:'#82e0b9'}}/> Performance</span>
          </div>
        </div>
        <FeeBars data={series}/>
      </div>

      {/* Available for withdrawal + Invested */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:40}}>
        <SubCard
          title="Available for withdrawal"
          amount="$118,400"
          sub="Swept to Operating · Citi 4451 after each month-end"
          action="Withdraw funds"
        >
          <table style={{width:'100%',borderCollapse:'collapse',fontVariantNumeric:'tabular-nums',marginTop:4}}>
            <tbody>
              {withdrawals.map((w,i) => (
                <tr key={i} style={{fontSize:12.5,borderTop:i===0?'none':'1px solid var(--line-1)'}}>
                  <td style={{padding:'10px 0',color:'var(--ink-3)',whiteSpace:'nowrap',width:100}}>{w.date}</td>
                  <td style={{padding:'10px 8px'}}>
                    <div style={{color:'var(--ink-1)',fontWeight:500}}>{w.memo}</div>
                    <div style={{color:'var(--ink-3)',fontSize:11,marginTop:2}}>→ {w.to}</div>
                  </td>
                  <td style={{padding:'10px 0',textAlign:'right',fontWeight:500,color:'var(--pos)',whiteSpace:'nowrap'}}>{w.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SubCard>

        <SubCard
          title="Invested in the fund"
          amount="$711,763"
          sub="Manager fees re-subscribed to the fund. Locked, compounds with NAV."
          action="New re-investment"
        >
          <table style={{width:'100%',borderCollapse:'collapse',fontVariantNumeric:'tabular-nums',marginTop:4}}>
            <thead>
              <tr style={{fontSize:10.5,color:'var(--ink-3)',fontWeight:500,textAlign:'left'}}>
                <th style={{padding:'0 0 8px 0',fontWeight:500}}>Date</th>
                <th style={{padding:'0 8px 8px',fontWeight:500}}>Class</th>
                <th style={{padding:'0 0 8px 0',fontWeight:500,textAlign:'right'}}>Units</th>
                <th style={{padding:'0 0 8px 0',fontWeight:500,textAlign:'right'}}>Value</th>
              </tr>
            </thead>
            <tbody>
              {reinvested.map((r,i) => (
                <tr key={i} style={{fontSize:12.5,borderTop:'1px solid var(--line-1)'}}>
                  <td style={{padding:'10px 0',color:'var(--ink-3)',whiteSpace:'nowrap'}}>{r.date}</td>
                  <td style={{padding:'10px 8px',color:'var(--ink-2)'}}>{r.class}</td>
                  <td style={{padding:'10px 0',textAlign:'right',fontWeight:500}}>{r.units}</td>
                  <td style={{padding:'10px 0',textAlign:'right',fontWeight:500,color:'var(--ink-1)',whiteSpace:'nowrap'}}>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SubCard>
      </div>

      {/* ===== Expenses paid ===== */}
      <SectionHeadE title="Expenses paid"/>

      <SubCard
        title="Custody fees"
        amount="$117,720"
        sub="Paid YTD across 4 custody partners · Self-custody is free"
        action="Reconcile invoices"
      >
        <table style={{width:'100%',borderCollapse:'collapse',fontVariantNumeric:'tabular-nums',marginTop:4}}>
          <thead>
            <tr style={{fontSize:10.5,color:'var(--ink-3)',fontWeight:500,textAlign:'left'}}>
              <th style={{padding:'0 0 8px 0',fontWeight:500}}>Venue</th>
              <th style={{padding:'0 0 8px 0',fontWeight:500,textAlign:'right'}}>AUM held</th>
              <th style={{padding:'0 0 8px 0',fontWeight:500,textAlign:'right'}}>Rate</th>
              <th style={{padding:'0 0 8px 0',fontWeight:500,textAlign:'right'}}>Monthly fee</th>
              <th style={{padding:'0 0 8px 0',fontWeight:500,textAlign:'right'}}>YTD fee</th>
            </tr>
          </thead>
          <tbody>
            {custody.map((c,i) => (
              <tr key={i} style={{fontSize:13,borderTop:'1px solid var(--line-1)'}}>
                <td style={{padding:'12px 0'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <span style={{width:26,height:26,borderRadius:6,background:c.logoBg,color:'#fff',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:10.5,fontWeight:600}}>{c.venue.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase()}</span>
                    <span style={{fontWeight:500}}>{c.venue}</span>
                  </div>
                </td>
                <td style={{padding:'12px 0',textAlign:'right',color:'var(--ink-2)'}}>{c.aum}</td>
                <td style={{padding:'12px 0',textAlign:'right',color:'var(--ink-2)'}}>{c.bps === 0 ? '—' : `${c.bps} bps`}</td>
                <td style={{padding:'12px 0',textAlign:'right',fontWeight:500}}>{c.monthly}</td>
                <td style={{padding:'12px 0',textAlign:'right',fontWeight:500,color:c.ytd==='—'?'var(--ink-3)':'var(--ink-1)'}}>{c.ytd}</td>
              </tr>
            ))}
            <tr style={{fontSize:13,borderTop:'1px solid var(--line-1)',background:'var(--bg-subtle)'}}>
              <td style={{padding:'12px 12px',fontWeight:600}}>Total</td>
              <td style={{padding:'12px 0',textAlign:'right',color:'var(--ink-3)'}}></td>
              <td style={{padding:'12px 0',textAlign:'right',color:'var(--ink-3)'}}></td>
              <td style={{padding:'12px 0',textAlign:'right',fontWeight:600}}>$29,430</td>
              <td style={{padding:'12px 12px 12px 0',textAlign:'right',fontWeight:600}}>$117,720</td>
            </tr>
          </tbody>
        </table>
      </SubCard>
    </div>
  );
}

function KpiCard({ l, v, s, neg }) {
  return (
    <div style={{background:'var(--bg-card)',borderRadius:10,padding:'14px 18px'}}>
      <div style={{fontSize:11,color:'var(--ink-2)',fontWeight:500,marginBottom:8}}>{l}</div>
      <div style={{fontSize:32,fontWeight:500,letterSpacing:'-0.05em',fontVariantNumeric:'tabular-nums',color: neg?'var(--ink-1)':'var(--ink-1)'}}>{v}</div>
      <div style={{fontSize:12,color:'var(--ink-2)',marginTop:6}}>{s}</div>
    </div>
  );
}

function SectionHeadE({ title, desc }) {
  return (
    <div style={{marginBottom:18}}>
      <div style={{fontSize:18,fontWeight:600,letterSpacing:'-0.005em',color:'var(--ink-1)'}}>{title}</div>
      {desc && <div style={{fontSize:13,color:'var(--ink-2)',marginTop:4,maxWidth:640}}>{desc}</div>}
    </div>
  );
}

function SubCard({ title, amount, sub, action, children }) {
  return (
    <div style={{background:'var(--bg-card)',border:'1px solid var(--line-1)',borderRadius:12,padding:'20px 24px',display:'flex',flexDirection:'column',minWidth:0}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,marginBottom:16}}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:32,fontWeight:500,letterSpacing:'-0.05em',fontVariantNumeric:'tabular-nums',color:'var(--ink-1)',lineHeight:1.1}}>{amount}</div>
          <div style={{fontSize:14,fontWeight:500,color:'var(--ink-1)',marginTop:24}}>{title}</div>
          <div style={{fontSize:12.5,color:'var(--ink-2)',marginTop:4,maxWidth:360}}>{sub}</div>
        </div>
        {action && (
          <button style={{
            display:'inline-flex',alignItems:'center',gap:6,height:30,padding:'0 12px',
            border:'1px solid var(--line-2)',borderRadius:8,background:'var(--bg-canvas)',
            color:'var(--ink-1)',fontSize:12.5,fontWeight:500,cursor:'pointer',fontFamily:'inherit',
            whiteSpace:'nowrap',flexShrink:0
          }} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-subtle)'} onMouseLeave={e=>e.currentTarget.style.background='var(--bg-canvas)'}>
            {action}
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4.66 11.33 11.33 4.66M11.33 4.66H4.66M11.33 4.66v6.67"/></svg>
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function FeeBars({ data }) {
  const H = 140;
  const max = Math.max(...data.map(d => d.mgt + d.perf)) * 1.15;
  return (
    <div style={{position:'relative'}}>
      {/* grid lines */}
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',justifyContent:'space-between',pointerEvents:'none'}}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{height:1,background:'var(--line-1)',opacity: i===3?0:1}}/>
        ))}
      </div>
      <div style={{position:'relative',display:'grid',gridTemplateColumns:`repeat(${data.length},1fr)`,gap:6,alignItems:'end',height:H}}>
        {data.map((d,i) => {
          const total = d.mgt + d.perf;
          const totalH = (total / max) * H;
          const mgtH  = (d.mgt  / max) * H;
          const perfH = (d.perf / max) * H;
          return (
            <div key={i} style={{display:'flex',flexDirection:'column',justifyContent:'flex-end',height:H,position:'relative'}} title={`${d.m}: Mgt $${d.mgt.toFixed(1)}K + Perf $${d.perf.toFixed(1)}K`}>
              <div style={{display:'flex',flexDirection:'column',borderRadius:4,overflow:'hidden',height:totalH,animation:'barGrow 0.7s cubic-bezier(0.22,1,0.36,1) both',animationDelay:`${0.05+i*0.04}s`,transformOrigin:'bottom'}}>
                <div style={{height:perfH,background:'#82e0b9'}}/>
                <div style={{height:mgtH,background:'#1d7d59'}}/>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{display:'grid',gridTemplateColumns:`repeat(${data.length},1fr)`,gap:6,marginTop:8,fontSize:10.5,color:'var(--ink-3)',textAlign:'center',fontVariantNumeric:'tabular-nums'}}>
        {data.map(d => <div key={d.m}>{d.m}</div>)}
      </div>
    </div>
  );
}

Object.assign(window, { EconomicsView });
