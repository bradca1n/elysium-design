/* Secondary views: order book, collateral, share register, reconciliation */
const { useState: _s1 } = React;

// ============================================================================
// ORDER BOOK
// ============================================================================
function OrderBookView({ onNav }) {
  const [filter, setFilter] = _s1('all');
  const [selected, setSelected] = _s1(null);

  const orders = [
    { id: 'ORD-2026-00418', type: 'sub', holder: 'Meridian Capital Partners', class: 'B', amount: '$450,000', shares: '—', strike: 'Mon 08 Feb', status: 'approved', created: '07 Feb 14:22', note: 'Wire confirmed' },
    { id: 'ORD-2026-00417', type: 'red', holder: 'Henri Desrosiers', class: 'C', amount: '$82,500', shares: '2,128', strike: 'Mon 08 Feb', status: 'pending', created: '07 Feb 13:55', note: 'Awaiting AML re-check' },
    { id: 'ORD-2026-00416', type: 'sub', holder: 'Saltbush Super Fund', class: 'A', amount: 'A$1,200,000', shares: '—', strike: 'Mon 08 Feb', status: 'approved', created: '07 Feb 11:40', note: 'Settled' },
    { id: 'ORD-2026-00415', type: 'red', holder: 'M. Okafor', class: 'C', amount: '$24,000', shares: '619', strike: 'Mon 08 Feb', status: 'hold', created: '07 Feb 09:12', note: 'Cooling-off period' },
    { id: 'ORD-2026-00414', type: 'sub', holder: 'Peninsula Platform Nominees', class: 'D', amount: '$2,100,000', shares: '—', strike: 'Mon 08 Feb', status: 'approved', created: '06 Feb 18:30', note: 'Bulk platform order' },
    { id: 'ORD-2026-00413', type: 'sub', holder: 'J. Whitley-Bent', class: 'C', amount: '$15,000', shares: '—', strike: 'Mon 08 Feb', status: 'approved', created: '06 Feb 15:02', note: 'Monthly recurring' },
    { id: 'ORD-2026-00412', type: 'red', holder: 'Verdant Family Office', class: 'A', amount: '$780,000', shares: '21,576', strike: 'Mon 08 Feb', status: 'approved', created: '06 Feb 10:18', note: 'Rebalancing' },
  ];
  const filtered = filter === 'all' ? orders : orders.filter(o => filter === 'sub' ? o.type === 'sub' : filter === 'red' ? o.type === 'red' : o.status === filter);

  return (
    <div style={{padding:'48px 40px 80px',maxWidth:1500,margin:'0 auto'}} data-page>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'4px 0 24px',gap:24}}>
        <div>
          <div style={{fontSize:28,fontWeight:600,letterSpacing:'-0.015em',display:'flex',alignItems:'baseline',gap:12}}>
            Order book <span style={{fontSize:12,fontWeight:500,color:'var(--ink-2)'}}>7 orders · cutoff Mon 14:00 UTC</span>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button style={btnOutline}><Icon.download style={{width:13,height:13}}/> Export CSV</button>
          <button style={btnPrimary}>+ New order</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:28}}>
        {[
          { l: 'Gross subscriptions', v: '$3.77M', s: '4 orders' },
          { l: 'Gross redemptions', v: '$886K', s: '3 orders' },
          { l: 'Net flow (strike)', v: '+$2.88M', s: '+6.1% AUM', pos: true },
          { l: 'Pending review', v: '2', s: '1 AML · 1 cooling-off' },
        ].map((k,i) => (
          <div key={i} style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:10,padding:'16px 20px'}}>
            <div style={{fontSize:11,color:'var(--ink-2)',fontWeight:500,marginBottom:8}}>{k.l}</div>
            <div style={{fontSize:26,fontWeight:600,letterSpacing:'-0.015em',fontVariantNumeric:'tabular-nums',color:k.pos?'var(--pos)':'var(--ink-1)'}}>{k.v}</div>
            <div style={{fontSize:12,color:'var(--ink-2)',marginTop:6}}>{k.s}</div>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div style={{display:'flex',alignItems:'center',gap:6,paddingBottom:12,borderBottom:'1px solid var(--line-1)',marginBottom:0,flexWrap:'wrap'}}>
        {[['all','All orders'],['sub','Subscriptions'],['red','Redemptions'],['pending','Pending review'],['hold','On hold']].map(([k,l]) => (
          <button key={k} onClick={()=>setFilter(k)} style={{
            background: filter === k ? 'var(--ink-1)' : 'transparent',
            color: filter === k ? '#fff' : 'var(--ink-1)',
            border: filter === k ? 'none' : '1px solid var(--line-2)',
            padding: '6px 14px',borderRadius:999,fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit',
          }}>{l}</button>
        ))}
        <div style={{flex:1}}/>
        <div style={{display:'flex',alignItems:'center',gap:6,color:'var(--ink-2)',fontSize:12}}>
          <Icon.clock style={{width:13,height:13}}/> Cutoff in 18h 42m
        </div>
      </div>

      {/* Table */}
      <table style={{width:'100%',borderCollapse:'collapse',fontVariantNumeric:'tabular-nums',marginBottom:32}}>
        <thead>
          <tr style={{fontSize:10.5,color:'var(--ink-3)',fontWeight:500}}>
            <th style={th}>Order</th>
            <th style={th}>Holder</th>
            <th style={{...th,textAlign:'center'}}>Class</th>
            <th style={{...th,textAlign:'right'}}>Amount</th>
            <th style={{...th,textAlign:'right'}}>Est. shares</th>
            <th style={th}>Strike</th>
            <th style={th}>Status</th>
            <th/>
          </tr>
        </thead>
        <tbody>
          {filtered.map(o => (
            <tr key={o.id} onClick={() => setSelected(o)} style={{fontSize:13,cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-subtle)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <td style={td}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <OrderTypeTag type={o.type}/>
                  <div>
                    <div style={{fontFamily:'JetBrains Mono, monospace',fontSize:11.5,color:'var(--ink-2)'}}>{o.id}</div>
                    <div style={{fontSize:11,color:'var(--ink-3)',marginTop:1}}>{o.created}</div>
                  </div>
                </div>
              </td>
              <td style={td}>{o.holder}</td>
              <td style={{...td,textAlign:'center'}}>
                <span style={{display:'inline-block',width:22,height:22,lineHeight:'22px',borderRadius:4,background:'var(--bg-card)',fontSize:11,fontWeight:600}}>{o.class}</span>
              </td>
              <td style={{...td,textAlign:'right',fontWeight:500}}>{o.amount}</td>
              <td style={{...td,textAlign:'right',color:'var(--ink-2)'}}>{o.shares}</td>
              <td style={td}>{o.strike}</td>
              <td style={td}><StatusChipX status={o.status}/></td>
              <td style={{...td,textAlign:'right',color:'var(--ink-3)'}}><Icon.chevron style={{width:14,height:14,transform:'rotate(-90deg)'}}/></td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && <OrderDrawer order={selected} onClose={() => setSelected(null)}/>}
    </div>
  );
}

function OrderTypeTag({ type }) {
  const cfg = type === 'sub' ? { bg: 'var(--green-50)', fg: 'var(--green-700)', label: 'Sub', sym: '↑' } : { bg: '#FFF2F0', fg: '#A14133', label: 'Red', sym: '↓' };
  return <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:4,background:cfg.bg,color:cfg.fg,fontSize:11,fontWeight:600}}>{cfg.sym} {cfg.label}</span>;
}

function StatusChipX({ status }) {
  const map = {
    approved: { bg: 'var(--green-50)', fg: 'var(--green-700)', border: 'var(--green-200)', label: 'Approved' },
    pending: { bg: '#FFF6E6', fg: '#8A5A10', border: '#F5E2B8', label: 'Pending review' },
    hold: { bg: '#F4F0FF', fg: '#544497', border: '#DFD7F5', label: 'On hold' },
    verified: { bg: 'var(--green-50)', fg: 'var(--green-700)', border: 'var(--green-200)', label: 'Verified' },
  };
  const s = map[status] || map.pending;
  return <span style={{display:'inline-flex',alignItems:'center',gap:6,padding:'2px 10px',borderRadius:999,fontSize:11.5,fontWeight:500,background:s.bg,color:s.fg,border:`1px solid ${s.border}`}}>{s.label}</span>;
}

function OrderDrawer({ order, onClose }) {
  return (
    <>
      <div style={{position:'fixed',inset:0,background:'rgba(10,10,12,0.35)',zIndex:50}} onClick={onClose}/>
      <div style={{position:'fixed',top:0,right:0,bottom:0,width:480,maxWidth:'92vw',background:'var(--bg-canvas)',borderLeft:'1px solid var(--line-1)',boxShadow:'-12px 0 40px rgba(0,0,0,0.12)',display:'flex',flexDirection:'column',zIndex:51,animation:'slideIn 0.25s cubic-bezier(0.2,0.8,0.2,1)'}}>
        <div style={{padding:'20px 24px 16px',borderBottom:'1px solid var(--line-1)',position:'relative'}}>
          <button onClick={onClose} style={{position:'absolute',top:20,right:24,padding:'6px 10px',border:'none',background:'var(--bg-surface)',cursor:'pointer',borderRadius:999,fontFamily:'inherit',fontSize:12,fontWeight:500,color:'var(--ink-1)'}}>Close</button>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
            <OrderTypeTag type={order.type}/>
            <span style={{fontFamily:'JetBrains Mono, monospace',fontSize:11.5,color:'var(--ink-2)'}}>{order.id}</span>
          </div>
          <div style={{fontSize:20,fontWeight:600,letterSpacing:'-0.01em'}}>{order.amount} · Class {order.class}</div>
          <div style={{fontSize:13,color:'var(--ink-2)',marginTop:2}}>{order.holder}</div>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>
          <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:600,marginBottom:8}}>Order detail</div>
          <div style={{background:'var(--bg-card)',borderRadius:10,padding:'14px 16px',display:'grid',gridTemplateColumns:'1fr auto',gap:'10px 16px',fontSize:13,fontVariantNumeric:'tabular-nums',marginBottom:20}}>
            <div style={{color:'var(--ink-2)'}}>Created</div><div>{order.created}</div>
            <div style={{color:'var(--ink-2)'}}>Strike</div><div>{order.strike}</div>
            <div style={{color:'var(--ink-2)'}}>Gross amount</div><div style={{fontWeight:500}}>{order.amount}</div>
            <div style={{color:'var(--ink-2)'}}>Est. shares</div><div>{order.shares}</div>
            <div style={{color:'var(--ink-2)'}}>Applied NAV / share</div><div>Mon 16:00 strike</div>
            <div style={{color:'var(--ink-2)'}}>Status</div><div><StatusChipX status={order.status}/></div>
            <div style={{color:'var(--ink-2)'}}>Note</div><div>{order.note}</div>
          </div>

          <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:600,marginBottom:8}}>Timeline</div>
          <div style={{position:'relative',paddingLeft:20,borderLeft:'1px dashed var(--line-2)',marginLeft:6,display:'flex',flexDirection:'column',gap:18,fontSize:12.5}}>
            {[
              { t: 'Created', a: order.created, done: true, who: 'Investor portal' },
              { t: 'Funds verified', a: '07 Feb 14:45', done: order.status!=='pending', who: 'Treasury · Coinbase Prime' },
              { t: 'AML / KYC', a: order.status==='pending'?'In review':'07 Feb 15:02', done: order.status==='approved', who: 'Compliance' },
              { t: 'Strike applied', a: 'Mon 08 Feb 16:00', done: false, who: 'NAV ops' },
              { t: 'Shares issued', a: '—', done: false, who: 'Registry' },
            ].map((e,i) => (
              <div key={i} style={{position:'relative'}}>
                <span style={{position:'absolute',left:-26,top:3,width:10,height:10,borderRadius:'50%',background: e.done?'var(--green-600)':'var(--bg-surface)',border:`2px solid ${e.done?'var(--green-600)':'var(--line-2)'}`}}/>
                <div style={{fontWeight:500,color: e.done?'var(--ink-1)':'var(--ink-2)'}}>{e.t}</div>
                <div style={{color:'var(--ink-3)',fontSize:11.5,marginTop:2}}>{e.a} · {e.who}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{borderTop:'1px solid var(--line-1)',padding:'14px 24px',display:'flex',justifyContent:'flex-end',gap:10}}>
          <button style={btnOutline}>Hold</button>
          <button style={btnPrimary}>Approve</button>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// COLLATERAL TRANSFER WIZARD
// ============================================================================
function CollateralView({ onNav }) {
  const [sheetOpen, setSheetOpen] = _s1(false);

  const collateral = [
    { asset:'BTC', venue:'Coinbase Prime', type:'Custody', posted:'$4.1M', util:68, fee: 0.08, income: 0.42 },
    { asset:'ETH', venue:'Copper.co', type:'Clearloop', posted:'$1.6M', util:41, fee: 0.12, income: 0.30 },
    { asset:'USDC', venue:'Binance', type:'Margin', posted:'$2.7M', util:22, fee: 0.18, income: 0.06 },
    { asset:'SOL', venue:'OKX', type:'Perp', posted:'$0.8M', util:57, fee: 0.22, income: 0.00 },
    { asset:'USDT', venue:'Binance', type:'Margin', posted:'$1.2M', util:18, fee: 0.18, income: 0.06 },
  ];
  // Computed blended rates (weighted by posted value): fee 0.13%, income 0.20%, net +0.07%
  const redemptions = [
    { inv:'@NovaTechFund', cls:'Class A', units:'904.76', amt:'$950,000' },
    { inv:'@GlobalVest', cls:'Class B', units:'3,492.01', amt:'$350,000' },
    { inv:'@ApexHoldings', cls:'Class C', units:'1,428.57', amt:'$1,500,000' },
    { inv:'@ZenithCapital', cls:'Class A', units:'571.43', amt:'$600,000' },
  ];

  return (
    <div style={{padding:'48px 40px 80px',maxWidth:1500,margin:'0 auto'}} data-page>
      <section style={{marginBottom:56}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:24,marginBottom:20}}>
          <div>
            <div style={{fontSize:18,fontWeight:600,color:'var(--ink-1)',letterSpacing:'-0.005em'}}>Treasury</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:4}}>Free cash available for trading positions, and upcoming fund flows.</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button style={btnOutline}>View Cashbook</button>
            <button aria-label="More" style={{width:32,height:32,border:'none',background:'transparent',borderRadius:8,cursor:'pointer',color:'var(--ink-2)',display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-subtle)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
            </button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:10,padding:'20px 22px'}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:8}}>
                <div style={{fontSize:12,color:'var(--ink-2)',fontWeight:500}}>Free cash position</div>
                <span style={{fontSize:11.5,fontWeight:500,color:'var(--green-700)',background:'var(--green-50)',padding:'3px 10px',borderRadius:999,whiteSpace:'nowrap'}}>+4.2% APY on T-bills · ~$26,200 / mo</span>
              </div>
              <div style={{fontSize:32,fontWeight:600,letterSpacing:'-0.02em',fontVariantNumeric:'tabular-nums',color:'var(--ink-1)'}}>$6,246,000</div>
              <div style={{fontSize:12,color:'var(--green-700)',marginTop:4,fontWeight:500}}>13.2% of NAV</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div style={{background:'var(--glass-bg)',borderRadius:10,padding:'16px 20px'}}>
                <div style={{fontSize:12,color:'var(--ink-2)',fontWeight:500,marginBottom:6}}>USD</div>
                <div style={{fontSize:20,fontWeight:600,fontVariantNumeric:'tabular-nums',letterSpacing:'-0.015em'}}>$5,966,000</div>
              </div>
              <div style={{background:'var(--glass-bg)',borderRadius:10,padding:'16px 20px'}}>
                <div style={{fontSize:12,color:'var(--ink-2)',fontWeight:500,marginBottom:6}}>EUR</div>
                <div style={{fontSize:20,fontWeight:600,fontVariantNumeric:'tabular-nums',letterSpacing:'-0.015em'}}>$280,000</div>
              </div>
            </div>
          </div>
          <div style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:10,padding:'20px 22px',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:8}}>
              <div style={{fontSize:12,color:'var(--ink-2)',fontWeight:500}}>Next dealing in</div>
              <span style={{width:8,height:8,borderRadius:'50%',background:'#E08A42',marginTop:5,boxShadow:'0 0 0 3px rgba(224,138,66,0.15)'}}/>
            </div>
            <div style={{fontSize:32,fontWeight:600,letterSpacing:'-0.02em',fontVariantNumeric:'tabular-nums'}}>03d 14h 22m</div>
            <div style={{fontSize:12,color:'var(--ink-3)',marginTop:4}}>Window opens Mon 8 Feb, 17:00 UTC</div>
            <div style={{marginTop:18,paddingTop:16,borderTop:'1px solid var(--line-1)',display:'grid',gridTemplateColumns:'1fr auto',gap:'10px 20px',fontSize:13}}>
              <div style={{color:'var(--ink-2)'}}>Next dealing</div><div style={{fontVariantNumeric:'tabular-nums'}}>Mon 8 Feb, 17:00 UTC</div>
              <div style={{color:'var(--ink-2)'}}>Cutoff</div><div style={{fontVariantNumeric:'tabular-nums'}}>Sun 7 Feb, 17:00 UTC</div>
              <div style={{color:'var(--ink-2)'}}>Settlement</div><div style={{fontVariantNumeric:'tabular-nums'}}>Mon 8 Feb, 2026</div>
            </div>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:16}}>
          <div style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:10,padding:'16px 20px'}}>
            <div style={{fontSize:11,color:'var(--ink-2)',fontWeight:500,marginBottom:8}}>Coverage of avg daily withdrawal</div>
            <div style={{fontSize:24,fontWeight:600,letterSpacing:'-0.015em',fontVariantNumeric:'tabular-nums'}}>52×</div>
            <div style={{fontSize:11.5,color:'var(--ink-2)',marginTop:6}}>$6.25M cash ÷ $120K avg daily withdrawal</div>
          </div>
          <div style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:10,padding:'16px 20px'}}>
            <div style={{fontSize:11,color:'var(--ink-2)',fontWeight:500,marginBottom:8}}>Coverage of next notice period</div>
            <div style={{fontSize:24,fontWeight:600,letterSpacing:'-0.015em',fontVariantNumeric:'tabular-nums'}}>8.4×</div>
            <div style={{fontSize:11.5,color:'var(--ink-2)',marginTop:6}}>$6.25M cash ÷ $745K max plausible withdrawals</div>
          </div>
        </div>
      </section>

      <section style={{marginBottom:56}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:24,marginBottom:20}}>
          <div>
            <div style={{fontSize:18,fontWeight:600,color:'var(--ink-1)',letterSpacing:'-0.005em',display:'flex',alignItems:'baseline',gap:10}}>
              Collateral position
              <span style={{fontSize:11.5,fontWeight:500,color:'var(--green-700)',background:'var(--green-50)',padding:'3px 8px',borderRadius:999}}>68% utilised · 5 venues</span>
            </div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:4}}>Assets posted to exchanges to support trading. Not part of free cash — moves with positions and prices.</div>
          </div>
          <button onClick={()=>setSheetOpen(true)} style={btnOutline}>Move collateral</button>
        </div>

        <div style={{display:'flex',alignItems:'flex-start',gap:10,padding:'12px 16px',background:'var(--info-bg)',border:'1px solid var(--info-border)',borderRadius:10,marginBottom:20}}>
          <div style={{width:18,height:18,borderRadius:'50%',background:'var(--info-fg)',color:'#fff',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0,marginTop:1}}>i</div>
          <div style={{fontSize:13,color:'var(--info-fg)'}}>Collateral is required margin at exchanges, posted to back open positions. It's not available as free cash.</div>
        </div>

        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontVariantNumeric:'tabular-nums'}}>
            <thead>
              <tr style={{fontSize:12,color:'var(--ink-3)',fontWeight:500}}>
                <th style={th}>Asset</th>
                <th style={th}>Venue</th>
                <th style={th}>Account type</th>
                <th style={th}>Posted</th>
                <th style={{...th,textAlign:'right'}}>Utilization</th>
                <th style={{...th,textAlign:'right'}}>Fee</th>
                <th style={{...th,textAlign:'right'}}>Income</th>
                <th style={{...th,textAlign:'right'}}>Net rate</th>
              </tr>
            </thead>
            <tbody>
              {collateral.map((r,i) => {
                const net = r.income - r.fee;
                return (
                  <tr key={i} data-row>
                    <td style={{...td,fontWeight:500}}>{r.asset}</td>
                    <td style={td}>{r.venue}</td>
                    <td style={td}>{r.type}</td>
                    <td style={td}>{r.posted}</td>
                    <td style={{...td,textAlign:'right'}}>
                      <span style={{display:'inline-flex',fontSize:12,fontWeight:500,color:'var(--green-700)',background:'var(--green-50)',padding:'3px 10px',borderRadius:999}}>{r.util}%</span>
                    </td>
                    <td style={{...td,textAlign:'right',color:'var(--ink-2)'}}>{r.fee.toFixed(2)}%</td>
                    <td style={{...td,textAlign:'right',color:'var(--ink-2)'}}>{r.income.toFixed(2)}%</td>
                    <td style={{...td,textAlign:'right',fontWeight:500,color: net >= 0 ? 'var(--pos)' : 'var(--neg)'}}>{net >= 0 ? '+' : ''}{net.toFixed(2)}%</td>
                  </tr>
                );
              })}
              <tr style={{background:'var(--bg-subtle)',fontSize:13,fontWeight:600}}>
                <td style={{...td,fontWeight:600}} colSpan={4}>Blended (weighted by posted value)</td>
                <td style={{...td,textAlign:'right',color:'var(--ink-3)'}}>—</td>
                <td style={{...td,textAlign:'right'}}>0.13%</td>
                <td style={{...td,textAlign:'right'}}>0.20%</td>
                <td style={{...td,textAlign:'right',color:'var(--pos)'}}>+0.07%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section style={{marginBottom:56}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:24,marginBottom:20}}>
          <div>
            <div style={{fontSize:18,fontWeight:600,color:'var(--ink-1)',letterSpacing:'-0.005em'}}>Upcoming fund flows</div>
          </div>
          <button onClick={()=>onNav('order-book')} style={btnOutline}>View full order book</button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:16}} data-kpi-grid>
          <div>
            <div>Pending Subscriptions</div>
            <div style={{fontSize:26,fontWeight:600,letterSpacing:'-0.015em',fontVariantNumeric:'tabular-nums',color:'var(--pos)'}}>+$150,000</div>
            <div style={{fontSize:11.5}}>5 orders</div>
          </div>
          <div>
            <div>Pending Redemptions</div>
            <div style={{fontSize:26,fontWeight:600,letterSpacing:'-0.015em',fontVariantNumeric:'tabular-nums',color:'var(--neg)'}}>−$320,000</div>
            <div style={{fontSize:11.5}}>2 orders</div>
          </div>
          <div>
            <div>Projected post-dealing cash</div>
            <div style={{fontSize:26,fontWeight:600,letterSpacing:'-0.015em',fontVariantNumeric:'tabular-nums'}}>$2,476,000</div>
            <div style={{fontSize:11.5}}>after settlement Mon 8 Feb</div>
          </div>
          <div>
            <div>Net cash required</div>
            <div style={{fontSize:26,fontWeight:600,letterSpacing:'-0.015em',fontVariantNumeric:'tabular-nums'}}>$170,000</div>
            <div style={{fontSize:11.5}}>outflow at settlement</div>
          </div>
        </div>
      </section>

      <section>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:24,marginBottom:20}}>
          <div style={{fontSize:18,fontWeight:600,color:'var(--ink-1)',letterSpacing:'-0.005em'}}>Pending redemption orders</div>
          <button onClick={()=>onNav('order-book')} style={btnOutline}>View all</button>
        </div>

        <div style={{background:'var(--glass-bg)',borderRadius:10,padding:'18px 22px',marginBottom:16}}>
          <div style={{fontSize:12,color:'var(--ink-2)',fontWeight:500,marginBottom:6}}>Queued order amount</div>
          <div style={{fontSize:28,fontWeight:600,letterSpacing:'-0.015em',fontVariantNumeric:'tabular-nums'}}>$4.50M</div>
          <div style={{fontSize:12,color:'var(--ink-3)',marginTop:4}}>5 orders</div>
        </div>

        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontVariantNumeric:'tabular-nums'}}>
            <thead>
              <tr style={{fontSize:12,color:'var(--ink-3)',fontWeight:500}}>
                <th style={th}>Investor</th>
                <th style={th}>Class</th>
                <th style={th}>Units</th>
                <th style={th}>Amount</th>
                <th style={{...th,textAlign:'right'}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.map((r,i) => (
                <tr key={i} data-row>
                  <td style={{...td,fontWeight:500}}>{r.inv}</td>
                  <td style={td}>{r.cls}</td>
                  <td style={td}>{r.units}</td>
                  <td style={td}>{r.amt}</td>
                  <td style={{...td,textAlign:'right'}}>
                    <span style={{display:'inline-flex',fontSize:12,fontWeight:500,color:'var(--green-700)',background:'var(--green-50)',padding:'3px 10px',borderRadius:999}}>Pending</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <MoveCollateralSheet open={sheetOpen} onClose={()=>setSheetOpen(false)}/>
    </div>
  );
}

function MoveCollateralSheet({ open, onClose }) {
  const [step, setStep] = _s1(1);
  const [from, setFrom] = _s1('Binance');
  const [to, setTo] = _s1('Coinbase Prime');
  const [asset, setAsset] = _s1('BTC');
  const [amount, setAmount] = _s1('25.00');

  const steps = ['Source & destination', 'Amount & asset', 'Risk check', 'Sign & broadcast'];
  const usdValue = ((parseFloat(amount)||0)*101220).toLocaleString();

  return (
    <>
      <div className="no-page-anim" onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.28)',opacity: open?1:0, pointerEvents: open?'auto':'none',transition:'opacity 0.2s', zIndex:80}}/>
      <div className="no-page-anim" style={{position:'fixed',top:0,right:0,bottom:0,width:'min(640px, 94vw)',background:'var(--bg-canvas)',borderLeft:'1px solid var(--line-1)',boxShadow:'-24px 0 48px rgba(0,0,0,0.12)',zIndex:90,transform: open?'translateX(0)':'translateX(100%)',transition:'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 28px',flexShrink:0}}>
          <div>
            <div style={{fontSize:18,fontWeight:600,letterSpacing:'-0.005em'}}>Move collateral</div>
            <div style={{fontSize:12,color:'var(--ink-2)',marginTop:2}}>Rebalance holdings across venues · two sign-offs above $1M</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{width:32,height:32,border:'none',background:'var(--glass-bg)',borderRadius:'50%',cursor:'pointer',color:'var(--ink-2)',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6"/></svg>
          </button>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 28px 18px',flexShrink:0,borderBottom:'1px dashed var(--line-2)',marginBottom:2}}>
          {steps.map((lbl,i) => (
            <React.Fragment key={i}>
              <div style={{display:'inline-flex',alignItems:'center',gap:8,color: step>=i+1 ? 'var(--ink-1)':'var(--ink-3)',fontSize:11.5,fontWeight: step===i+1?600:500,whiteSpace:'nowrap'}}>
                <span style={{width:20,height:20,borderRadius:'50%',background: step>i+1?'var(--green-600)': step===i+1?'var(--ink-1)':'var(--bg-canvas)',color: step>=i+1?'#fff':'var(--ink-3)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:600,border: step===i+1?'none':'1px solid var(--line-2)'}}>{step > i+1 ? '✓' : i+1}</span>
                {lbl}
              </div>
              {i < steps.length - 1 && <div style={{flex:1,height:1,background:'var(--line-2)',margin:'0 2px'}}/>}
            </React.Fragment>
          ))}
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'28px'}}>
          {step === 1 && (
            <div style={{display:'flex',flexDirection:'column',gap:22}}>
              <div>
                <div style={{fontSize:16,fontWeight:500,marginBottom:4}}>Select source and destination</div>
                <div style={{fontSize:13,color:'var(--ink-2)'}}>Pick which venue funds leave from and where they land.</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:4,position:'relative'}}>
                <VenuePicker label="From" value={from} setValue={setFrom}/>
                <div style={{display:'flex',justifyContent:'center',margin:'-10px 0',position:'relative',zIndex:1}}>
                  <div style={{width:28,height:28,borderRadius:'50%',background:'var(--bg-canvas)',border:'1px solid var(--line-2)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--ink-2)',boxShadow:'0 0 0 3px var(--bg-canvas)'}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>
                  </div>
                </div>
                <VenuePicker label="To" value={to} setValue={setTo}/>
              </div>
            </div>
          )}
          {step === 2 && (
            <div style={{display:'flex',flexDirection:'column',gap:22}}>
              <div>
                <div style={{fontSize:16,fontWeight:500,marginBottom:4}}>Amount & asset</div>
                <div style={{fontSize:13,color:'var(--ink-2)'}}>Specify the asset and amount to move.</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:16}}>
                <div>
                  <label style={fLabel}>Asset</label>
                  <div style={{position:'relative'}}>
                    <select value={asset} onChange={e=>setAsset(e.target.value)} style={{...fInput,appearance:'none',WebkitAppearance:'none',MozAppearance:'none',padding:'0 36px 0 14px',cursor:'pointer',fontWeight:500,lineHeight:'40px'}}>
                      <option>BTC</option><option>ETH</option><option>USDC</option><option>LINK</option><option>LTC</option>
                    </select>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',color:'var(--ink-3)',pointerEvents:'none'}}><path d="M3 4.5 6 7.5 9 4.5"/></svg>
                  </div>
                </div>
                <div>
                  <label style={fLabel}>Amount</label>
                  <div style={{position:'relative'}}>
                    <input value={amount} onChange={e=>setAmount(e.target.value)} style={{...fInput,paddingRight:60,fontVariantNumeric:'tabular-nums',fontWeight:500}}/>
                    <div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:'var(--ink-3)',fontSize:12,fontWeight:500}}>{asset}</div>
                  </div>
                  <div style={{fontSize:11.5,color:'var(--ink-3)',marginTop:6}}>≈ ${'{'}usdValue{'}'} USD · Available: 323.80 {asset}</div>
                </div>
              </div>
              <div style={{padding:'14px 18px',background:'var(--bg-card)',borderRadius:10,display:'grid',gridTemplateColumns:'1fr auto',gap:'10px 16px',fontSize:13,fontVariantNumeric:'tabular-nums'}}>
                <div style={{color:'var(--ink-2)'}}>Estimated network fee</div><div>0.00034 BTC (~$34.40)</div>
                <div style={{color:'var(--ink-2)'}}>Estimated arrival</div><div>~22 minutes</div>
                <div style={{color:'var(--ink-2)'}}>Required confirmations</div><div>3 blocks</div>
              </div>
            </div>
          )}
          {step === 3 && <RiskCheckList key={'rc'+step}/>}
          {step === 4 && (
            <div style={{display:'flex',flexDirection:'column',gap:18}}>
              <div>
                <div style={{fontSize:16,fontWeight:500,marginBottom:4}}>Sign & broadcast</div>
                <div style={{fontSize:13,color:'var(--ink-2)'}}>Two signers required. Hardware wallets sealed to their desk.</div>
              </div>
              <div style={{background:'var(--glass-bg)',borderRadius:10,padding:20}}>
                <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:600,marginBottom:10}}>Transfer summary</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:'10px 20px',fontSize:13,fontVariantNumeric:'tabular-nums'}}>
                  <div>Move</div><div style={{fontWeight:600}}>{amount} {asset}</div>
                  <div>From</div><div>{from}</div>
                  <div>To</div><div>{to}</div>
                  <div>USD value (est.)</div><div>${'{'}usdValue{'}'}</div>
                  <div>Fee</div><div>0.00034 BTC</div>
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[
                { who: 'R. Matsuda', role: 'Fund Ops', signed: true, at: 'Today 09:14' },
                { who: 'S. Patel', role: 'Compliance', signed: false, at: 'Waiting' },
              ].map((p,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 12px',border:'1px solid var(--line-1)',borderRadius:10}}>
                  <div style={{width:28,height:28,borderRadius:'50%',background:'var(--bg-card)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontWeight:600,fontSize:11,border:'1px solid var(--line-2)'}}>{p.who.split(' ').map(x=>x[0]).join('')}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500}}>{p.who} <span style={{color:'var(--ink-3)',fontWeight:400}}>· {p.role}</span></div>
                    <div style={{fontSize:11.5,color:'var(--ink-3)'}}>{p.at}</div>
                  </div>
                  {p.signed ? <StatusChipX status="verified"/> : <button style={{...btnOutline,fontSize:11.5,height:28,padding:'0 10px'}}>Request signature</button>}
                </div>
              ))}
              </div>
            </div>
          )}
        </div>

        <div style={{display:'flex',justifyContent:'space-between',padding:'16px 28px',flexShrink:0,background:'var(--bg-canvas)'}}>
          <button onClick={onClose} style={btnOutline}>Cancel</button>
          <div style={{display:'flex',gap:10}}>
            <button disabled={step===1} onClick={()=>setStep(s=>Math.max(1,s-1))} style={{...btnOutline,opacity:step===1?0.5:1}}>Back</button>
            <button onClick={()=>{if(step===4){onClose();setStep(1);}else{setStep(s=>Math.min(4,s+1));}}} style={btnPrimary}>{step === 4 ? 'Broadcast transfer' : 'Continue'}</button>
          </div>
        </div>
      </div>
    </>
  );
}

function RiskCheckList() {
  const checks = [
    { l: 'Source venue authenticated', d: 'API session valid · IP allowlist matched' },
    { l: 'Destination address whitelisted', d: 'Added 14 Jan 2026 by S. Patel' },
    { l: 'Counterparty risk within limits', d: 'Exposure to Coinbase Prime 24% of AUM · cap 35%' },
    { l: 'Travel rule info exchanged', d: 'Notabene attestation ok · reference NB-4817' },
    { l: 'AML & sanctions screening clear', d: 'Chainalysis KYT pass · risk score 0.08' },
    { l: 'Sufficient post-move buffer', d: 'Binance remaining cash covers 4.2× avg daily margin' },
  ];
  const [done, setDone] = React.useState(0);
  React.useEffect(() => {
    if (done >= checks.length) return;
    const t = setTimeout(() => setDone(d => d + 1), done === 0 ? 220 : 360);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div>
        <div style={{fontSize:16,fontWeight:500,marginBottom:4}}>Risk check</div>
        <div style={{fontSize:13,color:'var(--ink-2)'}}>Automated pre-flight checks. All must pass before you can sign.</div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:0}}>
        {checks.map((c,i) => {
          const state = i < done ? 'done' : i === done ? 'running' : 'pending';
          return (
            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:14,padding:'12px 2px',borderBottom: i===checks.length-1?'none':'1px solid var(--line-1)',opacity: state==='pending'?0.45:1,transition:'opacity 0.25s'}}>
              <div style={{width:22,height:22,borderRadius:'50%',flexShrink:0,marginTop:1,display:'inline-flex',alignItems:'center',justifyContent:'center',background: state==='done'?'var(--green-600)':'transparent',color: state==='done'?'#fff':'var(--ink-3)'}}>
                {state === 'done' && (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3.5 8 6.5 11 12.5 5"/></svg>
                )}
                {state === 'running' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{animation:'rcSpin 0.9s linear infinite'}}>
                    <path d="M21 12a9 9 0 1 1-6.2-8.55" />
                  </svg>
                )}
                {state === 'pending' && (
                  <div style={{width:8,height:8,borderRadius:'50%',background:'var(--line-2)'}}/>
                )}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13.5,fontWeight:500,color:'var(--ink-1)'}}>{c.l}</div>
                <div style={{fontSize:12,color:'var(--ink-3)',marginTop:2}}>{c.d}</div>
              </div>
              {state === 'running' && <span style={{fontSize:11,color:'var(--ink-3)'}}>Checking…</span>}
              {state === 'done' && <span style={{fontSize:11,color:'var(--green-700)'}}>Pass</span>}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes rcSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function VenuePicker({ label, value, setValue }) {
  const venues = [
    { n: 'Coinbase Prime', b: '$18.0M', kind: 'Custody' },
    { n: 'Copper.co', b: '$9.5M', kind: 'Custody' },
    { n: 'Binance', b: '$7.1M', kind: 'Exchange' },
    { n: 'OKX', b: '$5.3M', kind: 'Exchange' },
    { n: 'Self custody', b: '$7.5M', kind: 'Cold' },
  ];
  const selected = venues.find(v => v.n === value) || venues[0];
  return (
    <div>
      <label style={fLabel}>{label}</label>
      <div style={{position:'relative'}}>
        <select
          value={value}
          onChange={e=>setValue(e.target.value)}
          style={{
            ...fInput,
            appearance:'none',
            WebkitAppearance:'none',
            MozAppearance:'none',
            paddingRight:40,
            cursor:'pointer',
            fontWeight:500,
          }}
        >
          {venues.map(v => (
            <option key={v.n} value={v.n}>{v.n} — {v.kind} · Bal {v.b}</option>
          ))}
        </select>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',color:'var(--ink-3)',pointerEvents:'none'}}>
          <path d="M3 4.5 6 7.5 9 4.5"/>
        </svg>
      </div>
      <div style={{fontSize:11.5,color:'var(--ink-3)',marginTop:6}}>{selected.kind} · Available balance {selected.b}</div>
    </div>
  );
}

// ============================================================================
// SHARE REGISTER
// ============================================================================
function ShareRegisterView({ onNav }) {
  const [holdingBy, setHoldingBy] = _s1('capital');
  const [resultsBy, setResultsBy] = _s1('book');

  // Investor rows — deterministic palette per avatar
  const palette = ['#D97A5B','#6E8AB5','#3F7E58','#9B6BA8','#C09A3C','#4A6B85','#8E5948','#6B8E6B','#B06A7E','#4C8D93'];
  const rows = [
    { name: 'L2-Eth Ventures',       loc: 'Singapore, SG · Institutional',  cls: 'Class A', units: '142,390', value: '$21,019,500', lockup: 'Locked 270d',  kyc: 'verified',  last: 'Sub · 12 Apr' },
    { name: 'ZkSync-Bridge Holdings',loc: 'Zug, CH · Institutional',         cls: 'Class A', units: '138,452', value: '$20,438,440', lockup: 'Locked 180d',  kyc: 'verified',  last: 'Sub · 09 Apr' },
    { name: 'Arbitrum-Gateway Fund', loc: 'George Town, KY · Institutional', cls: 'Class A', units: '132,580', value: '$19,572,150', lockup: 'In notice 18d',kyc: 'verified',  last: 'Red · 04 Apr' },
    { name: 'Optimism-Stream LP',    loc: 'Delaware, US · Institutional',    cls: 'Class B', units: '128,904', value: '$19,029,090', lockup: 'Free',         kyc: 'verified',  last: 'Sub · 07 Apr' },
    { name: 'Scroll-Channel Co.',    loc: 'London, UK · Corporate',          cls: 'Class A', units: '125,310', value: '$18,499,820', lockup: 'Locked 330d',  kyc: 'verified',  last: 'Onboarded · 11 Feb' },
    { name: 'Base-Relay Group',      loc: 'New York, US · Institutional',    cls: 'Class I', units: '119,472', value: '$17,635,460', lockup: 'Free',         kyc: 'verified',  last: 'Dividend · 31 Mar' },
    { name: 'Polygon-ZkRoute',       loc: 'Geneva, CH · Corporate',          cls: 'Class B', units: '114,238', value: '$16,862,180', lockup: 'In notice 23d',kyc: 'verified',  last: 'Sub · 02 Apr' },
    { name: 'Starknet-Path Fund',    loc: 'Boston, US · Institutional',      cls: 'Class A', units: '110,592', value: '$16,323,400', lockup: 'Free',         kyc: 'pending-dd',last: 'Sub pending · 14 Apr' },
    { name: 'Nomina-Universal',      loc: 'Monaco · HNWI',                   cls: 'Class A', units: '108,452', value: '$16,007,710', lockup: 'Expiring 1d', kyc: 'expiring',  last: 'KYC hold · 03 Apr' },
    { name: 'Vela Asset Mgmt',       loc: 'Boston, US · Institutional',      cls: 'Class A', units: '103,650', value: '$15,298,090', lockup: 'Free',         kyc: 'verified',  last: 'Sub · 05 Apr' },
  ];

  // Share classes
  const classes = [
    { name: 'Class A', nav: '100.20 USD', units: '3.20 M', totalNav: '10,050,200 USD', mgt: '4.50%', fees: '45,000 USD', investors: '85' },
    { name: 'Class B', nav: '1,050.20 USD', units: '1.0 M', totalNav: '10,050,200 USD', mgt: '1.0%',  fees: '45,000 USD', investors: '40' },
    { name: 'Class I', nav: '10,050.20 USD', units: '1.0 M', totalNav: '10,050,200 USD', mgt: '0.5%', fees: '4,500 USD', investors: '20' },
  ];

  // Blended measures (replaces old KPI strip; KYC health dropped per ptl-pod)
  const blended = [
    { l: 'Total AUM',        v: '$150.81 M', s: '+$6.4M MTD' },
    { l: 'Blended duration', v: '14.2 mo',   s: 'Min of notice or lock-up' },
    { l: 'Blended mgmt fee', v: '2.18%',     s: 'Weighted by AUM across A/B/I' },
    { l: 'Blended perf fee', v: '14.4%',     s: 'Weighted by AUM' },
  ];

  // Manager + POD own holdings
  const ownHoldings = [
    { who: 'Manager team',  units: '4,823.0',  value: '$711,763',   pct: '0.47%', duration: '12 mo locked', returns: '+8.1% YTD' },
    { who: 'POD',           units: '12,200.0', value: '$1,802,440', pct: '1.20%', duration: '24 mo locked', returns: '+8.1% YTD' },
  ];

  // Results delivered for investors — distribution of returns across the book
  const resultsBuckets = [
    { bucket: '<0%',     book: 4,  dealings: 6,  neg: true  },
    { bucket: '0–10%',   book: 22, dealings: 28 },
    { bucket: '10–25%',  book: 41, dealings: 35 },
    { bucket: '25–50%',  book: 26, dealings: 22 },
    { bucket: '>50%',    book: 7,  dealings: 9  },
  ];

  // Holding period bars (Investor view)
  const holdingInvestor = [
    { bucket: '< 6 m',   pct: 38.2, right: '$18.7M · 32 Investors' },
    { bucket: '6–12 m',  pct: 22.0, right: '$10.4M · 18 Investors' },
    { bucket: '1–2 y',   pct: 27.4, right: '$13.0M · 19 Investors' },
    { bucket: '2+ y',    pct: 12.4, right: '$5.9M · 14 Investors' },
  ];
  const holdingCapital = [
    { bucket: '< 6 m',   pct: 31.1, right: '$14.4M · 32 Investors' },
    { bucket: '6–12 m',  pct: 24.8, right: '$11.5M · 18 Investors' },
    { bucket: '1–2 y',   pct: 28.9, right: '$13.4M · 19 Investors' },
    { bucket: '2+ y',    pct: 15.2, right: '$7.0M · 14 Investors' },
  ];
  const holding = holdingBy === 'investor' ? holdingInvestor : holdingCapital;

  const jurisdictions = [
    { flag: '🇺🇸', name: 'United States',  pct: 38 },
    { flag: '🇨🇭', name: 'Switzerland',    pct: 18 },
    { flag: '🇸🇬', name: 'Singapore',      pct: 14 },
    { flag: '🇬🇧', name: 'United Kingdom', pct: 11 },
    { flag: '🇰🇾', name: 'Cayman Islands', pct: 8 },
    { flag: '🌐',  name: 'Other (7)',      pct: 11 },
  ];
  const entityTypes = [
    { icon: 'building', name: 'Institutional',     pct: 52 },
    { icon: 'briefcase', name: 'Corporate',        pct: 18 },
    { icon: 'home',     name: 'Family office',     pct: 16 },
    { icon: 'user',     name: 'HNW individual',    pct: 11 },
    { icon: 'award',    name: 'Endowment / other', pct: 3  },
  ];

  // Concentration slices — colour derived from active accent so it follows theme
  const concSlices = [
    { label: 'Top 5',         pct: 29, color: 'var(--accent-plum)' },
    { label: 'Next 5 (6–10)', pct: 19, color: 'color-mix(in oklab, var(--accent-plum) 72%, var(--bg-canvas))' },
    { label: 'Next 10 (11–20)', pct: 22, color: 'color-mix(in oklab, var(--accent-plum) 50%, var(--bg-canvas))' },
    { label: 'Remaining 115', pct: 30, color: '#BFD8B6' },
  ];

  return (
    <div style={{padding:'48px 40px 80px',maxWidth:1500,margin:'0 auto'}} data-page>
      {/* ===== Head ===== */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:24,marginBottom:32}}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:18,fontWeight:600,color:'var(--ink-1)',letterSpacing:'-0.005em'}}>Share Register</div>
          <div style={{fontSize:13,color:'var(--ink-2)',marginTop:4}}>Holders, share classes and lock-ups across the fund.</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          <button style={{...btnPrimary,height:32}}>+ New Share Class</button>
          <button aria-label="More" style={{width:32,height:32,border:'1px solid var(--line-2)',background:'var(--bg-canvas)',borderRadius:8,cursor:'pointer',color:'var(--ink-2)',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
          </button>
        </div>
      </div>

      {/* ===== Manager + POD holdings ===== */}
      <div style={{fontSize:15,fontWeight:600,marginBottom:12}}>Manager &amp; POD holdings</div>
      <div style={{border:'1px solid var(--line-1)',borderRadius:10,overflow:'hidden',marginBottom:32}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontVariantNumeric:'tabular-nums'}}>
          <thead>
            <tr style={{fontSize:10.5,color:'var(--ink-3)',fontWeight:500,background:'var(--bg-subtle)'}}>
              <th style={{...th,padding:'10px 16px'}}>Holder</th>
              <th style={{...th,padding:'10px 16px',textAlign:'right'}}>Units</th>
              <th style={{...th,padding:'10px 16px',textAlign:'right'}}>Value</th>
              <th style={{...th,padding:'10px 16px',textAlign:'right'}}>% of fund</th>
              <th style={{...th,padding:'10px 16px'}}>Duration profile</th>
              <th style={{...th,padding:'10px 16px',textAlign:'right'}}>Returns earned</th>
            </tr>
          </thead>
          <tbody>
            {ownHoldings.map((r,i) => (
              <tr key={i} style={{fontSize:13,borderTop:'1px solid var(--line-1)'}}>
                <td style={{...td,padding:'12px 16px',fontWeight:500}}>{r.who}</td>
                <td style={{...td,padding:'12px 16px',textAlign:'right'}}>{r.units}</td>
                <td style={{...td,padding:'12px 16px',textAlign:'right'}}>{r.value}</td>
                <td style={{...td,padding:'12px 16px',textAlign:'right',color:'var(--ink-2)'}}>{r.pct}</td>
                <td style={{...td,padding:'12px 16px',color:'var(--ink-2)'}}>{r.duration}</td>
                <td style={{...td,padding:'12px 16px',textAlign:'right',color:'var(--pos)',fontWeight:500}}>{r.returns}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== Blended measures ===== */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:40}}>
        {blended.map((k,i) => (
          <div key={i} style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:10,padding:'14px 18px'}}>
            <div style={{fontSize:11,color:'var(--ink-2)',fontWeight:500,marginBottom:8}}>{k.l}</div>
            <div style={{fontSize:22,fontWeight:600,letterSpacing:'-0.01em',fontVariantNumeric:'tabular-nums'}}>{k.v}</div>
            <div style={{fontSize:12,color:'var(--ink-2)',marginTop:6}}>{k.s}</div>
          </div>
        ))}
      </div>

      {/* ===== Summary charts: Duration profile + Concentration ===== */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:32,marginBottom:40}}>
        <div>
          <div style={{fontSize:15,fontWeight:600,marginBottom:14}}>Duration profile</div>
          <div style={{display:'flex',height:38,borderRadius:8,overflow:'hidden',border:'1px solid var(--line-1)'}}>
            <div style={{width:'24.1%',background:'var(--accent-plum)',color:'var(--accent-plum-on)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600}}>24.1%</div>
            <div style={{width:'13.5%',background:'color-mix(in oklab, var(--accent-plum) 55%, var(--bg-canvas))',color:'var(--ink-1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600}}>13.5%</div>
            <div style={{flex:1,background:'color-mix(in oklab, var(--accent-plum) 18%, var(--bg-canvas))',color:'var(--ink-2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600}}>62.4%</div>
          </div>
          <div style={{display:'flex',gap:18,marginTop:12,fontSize:12,color:'var(--ink-2)'}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:6}}><span style={{width:8,height:8,borderRadius:'50%',background:'var(--accent-plum)'}}/> Available · 24.1%</span>
            <span style={{display:'inline-flex',alignItems:'center',gap:6}}><span style={{width:8,height:8,borderRadius:'50%',background:'color-mix(in oklab, var(--accent-plum) 55%, var(--bg-canvas))'}}/> In notice · 13.5%</span>
            <span style={{display:'inline-flex',alignItems:'center',gap:6}}><span style={{width:8,height:8,borderRadius:'50%',background:'color-mix(in oklab, var(--accent-plum) 28%, var(--bg-canvas))'}}/> Locked · 62.4%</span>
          </div>

          <div style={{fontSize:15,fontWeight:600,margin:'28px 0 12px'}}>Holding period</div>
          <div style={{display:'inline-flex',padding:3,background:'var(--bg-subtle)',borderRadius:8,marginBottom:16}}>
            <button onClick={()=>setHoldingBy('capital')} style={{border:'none',cursor:'pointer',padding:'6px 14px',borderRadius:6,fontSize:12,fontWeight:500,background:holdingBy==='capital'?'var(--bg-canvas)':'transparent',color:holdingBy==='capital'?'var(--ink-1)':'var(--ink-2)',boxShadow:holdingBy==='capital'?'0 1px 2px rgba(0,0,0,0.06)':'none'}}>By Capital</button>
            <button onClick={()=>setHoldingBy('investor')} style={{border:'none',cursor:'pointer',padding:'6px 14px',borderRadius:6,fontSize:12,fontWeight:500,background:holdingBy==='investor'?'var(--bg-canvas)':'transparent',color:holdingBy==='investor'?'var(--ink-1)':'var(--ink-2)',boxShadow:holdingBy==='investor'?'0 1px 2px rgba(0,0,0,0.06)':'none'}}>By Investor</button>
          </div>
          <div>
            {holding.map((h,i) => (
              <div key={h.bucket} style={{display:'grid',gridTemplateColumns:'60px 1fr auto',gap:12,alignItems:'center',padding:'8px 0',fontSize:12,fontVariantNumeric:'tabular-nums'}}>
                <div style={{color:'var(--ink-2)'}}>{h.bucket}</div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{flex:1,height:6,background:'var(--bg-subtle)',borderRadius:3,overflow:'hidden'}}>
                    <div style={{width:`${h.pct * 2}%`,maxWidth:'100%',height:'100%',background:'var(--accent-plum)',borderRadius:3,transition:'width 0.6s cubic-bezier(0.22,1,0.36,1)'}}/>
                  </div>
                  <span style={{fontWeight:500,minWidth:40,textAlign:'right'}}>{h.pct}%</span>
                </div>
                <div style={{color:'var(--ink-3)',fontSize:11}}>{h.right}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{fontSize:15,fontWeight:600,marginBottom:14}}>Concentration</div>
          <div style={{display:'flex',alignItems:'center',gap:28}}>
            <ConcentrationPie slices={concSlices}/>
            <div style={{flex:1}}>
              <div style={{display:'inline-block',padding:'4px 12px',borderRadius:999,background:'#FFF2E8',color:'#A14133',fontSize:11,fontWeight:600,marginBottom:14}}>Moderate concentration</div>
              {concSlices.map((s,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'5px 0',fontSize:12.5}}>
                  <span style={{width:10,height:10,borderRadius:'50%',background:s.color}}/>
                  <span style={{color:'var(--ink-1)'}}>{s.label}</span>
                  <span style={{marginLeft:'auto',color:'var(--ink-3)',fontVariantNumeric:'tabular-nums'}}>{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Results delivered for investors ===== */}
      <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:24,marginBottom:14}}>
        <div>
          <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Results delivered for investors</div>
          <div style={{fontSize:12,color:'var(--ink-3)'}}>Distribution of investor returns across the {resultsBy === 'book' ? 'book' : 'dealings'}.</div>
        </div>
        <div style={{display:'inline-flex',padding:3,background:'var(--bg-subtle)',borderRadius:8}}>
          <button onClick={()=>setResultsBy('book')} style={{border:'none',cursor:'pointer',padding:'6px 14px',borderRadius:6,fontSize:12,fontWeight:500,background:resultsBy==='book'?'var(--bg-canvas)':'transparent',color:resultsBy==='book'?'var(--ink-1)':'var(--ink-2)',boxShadow:resultsBy==='book'?'0 1px 2px rgba(0,0,0,0.06)':'none'}}>By Book</button>
          <button onClick={()=>setResultsBy('dealings')} style={{border:'none',cursor:'pointer',padding:'6px 14px',borderRadius:6,fontSize:12,fontWeight:500,background:resultsBy==='dealings'?'var(--bg-canvas)':'transparent',color:resultsBy==='dealings'?'var(--ink-1)':'var(--ink-2)',boxShadow:resultsBy==='dealings'?'0 1px 2px rgba(0,0,0,0.06)':'none'}}>By Dealings</button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:48}}>
        {resultsBuckets.map(b => {
          const pct = resultsBy === 'book' ? b.book : b.dealings;
          return (
            <div key={b.bucket} style={{
              padding:'16px 18px',borderRadius:10,
              background: b.neg
                ? 'color-mix(in oklab, var(--neg) 14%, var(--glass-bg))'
                : 'color-mix(in oklab, var(--accent-plum) 14%, var(--glass-bg))',
              backdropFilter:'blur(10px)',
              WebkitBackdropFilter:'blur(10px)',
              color: b.neg ? 'var(--neg)' : 'var(--ink-1)',
            }}>
              <div style={{fontSize:24,fontWeight:600,letterSpacing:'-0.015em',fontVariantNumeric:'tabular-nums',marginBottom:4}}>{pct}%</div>
              <div style={{fontSize:11,opacity:0.8}}>{b.bucket} return</div>
            </div>
          );
        })}
      </div>

      {/* ===== Share Classes ===== */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div style={{fontSize:18,fontWeight:600,letterSpacing:'-0.005em'}}>Share Classes</div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button style={{...btnOutline,height:30,fontSize:12.5}}>+ Create class</button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:48}}>
        {classes.map((c,i) => (
          <div key={i} style={{background:'var(--bg-card)',border:'1px solid var(--line-1)',borderRadius:12,padding:'18px 20px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <div style={{fontSize:13,color:'var(--ink-2)',fontWeight:500}}>{c.name}</div>
              <span style={{fontSize:10.5,fontWeight:600,padding:'2px 8px',borderRadius:999,background:'var(--green-50)',color:'var(--green-700)',border:'1px solid var(--green-200)'}}>Active</span>
            </div>
            <div style={{fontSize:24,fontWeight:600,letterSpacing:'-0.015em',fontVariantNumeric:'tabular-nums',marginBottom:16}}>{c.nav}</div>
            <div style={{display:'grid',gridTemplateColumns:'auto 1fr',rowGap:8,columnGap:12,fontSize:12.5}}>
              <span style={{color:'var(--ink-3)'}}>Units</span><span style={{fontVariantNumeric:'tabular-nums',fontWeight:500,textAlign:'right'}}>{c.units}</span>
              <span style={{color:'var(--ink-3)'}}>NAV</span><span style={{fontVariantNumeric:'tabular-nums',fontWeight:500,textAlign:'right',whiteSpace:'nowrap'}}>{c.totalNav}</span>
              <span style={{color:'var(--ink-3)'}}>Mgt Fees</span><span style={{fontVariantNumeric:'tabular-nums',fontWeight:500,textAlign:'right'}}>{c.mgt}</span>
              <span style={{color:'var(--ink-3)'}}>Fees collected</span><span style={{fontVariantNumeric:'tabular-nums',fontWeight:500,textAlign:'right',whiteSpace:'nowrap'}}>{c.fees}</span>
              <span style={{color:'var(--ink-3)'}}>Investors</span><span style={{fontVariantNumeric:'tabular-nums',fontWeight:500,textAlign:'right'}}>{c.investors}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ===== Full share register ===== */}
      <div style={{fontSize:18,fontWeight:600,letterSpacing:'-0.005em',marginBottom:12}}>Full share register</div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
        <div style={{position:'relative',flex:1,maxWidth:320}}>
          <input placeholder="Search investor, wallet or reference..." style={{...fInput,height:36,paddingLeft:36,fontSize:13}}/>
          <Icon.search style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',width:14,height:14,color:'var(--ink-3)'}}/>
        </div>
        <button style={{...btnOutline,height:36}}><Icon.filter style={{width:12,height:12}}/> Filter by</button>
        <div style={{flex:1}}/>
        <button style={{...btnOutline,height:36}}><Icon.download style={{width:12,height:12}}/> Export</button>
      </div>

      <div style={{overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontVariantNumeric:'tabular-nums'}}>
          <thead>
            <tr style={{fontSize:10.5,color:'var(--ink-3)',fontWeight:500,background:'var(--bg-subtle)'}}>
              <th style={{...th,padding:'10px 16px'}}>Investor</th>
              <th style={{...th,padding:'10px 16px'}}>Class</th>
              <th style={{...th,textAlign:'right',padding:'10px 16px'}}>Units</th>
              <th style={{...th,textAlign:'right',padding:'10px 16px'}}>Value</th>
              <th style={{...th,padding:'10px 16px'}}>Lock-up</th>
              <th style={{...th,padding:'10px 16px'}}>KYC</th>
              <th style={{...th,padding:'10px 16px'}}>Last activity</th>
              <th style={{...th,padding:'10px 16px',width:32}}/>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i) => (
              <tr key={i} style={{fontSize:13}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-subtle)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{...td,padding:'12px 16px'}}>
                  <div style={{fontWeight:500,color:'var(--ink-1)'}}>{r.name}</div>
                </td>
                <td style={{...td,padding:'12px 16px',color:'var(--ink-2)'}}>{r.cls}</td>
                <td style={{...td,padding:'12px 16px',textAlign:'right',fontWeight:500}}>{r.units}</td>
                <td style={{...td,padding:'12px 16px',textAlign:'right'}}>{r.value}</td>
                <td style={{...td,padding:'12px 16px'}}><LockupChip value={r.lockup}/></td>
                <td style={{...td,padding:'12px 16px'}}><KycChip status={r.kyc}/></td>
                <td style={{...td,padding:'12px 16px',color:'var(--ink-2)'}}>{r.last}</td>
                <td style={{...td,padding:'12px 16px',textAlign:'right',color:'var(--ink-3)',cursor:'pointer'}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',margin:'16px 4px 48px',fontSize:12,color:'var(--ink-2)'}}>
        <div>Showing 10 of 135 investors</div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <PageBtn>‹</PageBtn>
          <PageBtn active>1</PageBtn>
          <PageBtn>2</PageBtn>
          <PageBtn>3</PageBtn>
          <span style={{padding:'0 6px',color:'var(--ink-3)'}}>…</span>
          <PageBtn>14</PageBtn>
          <PageBtn>›</PageBtn>
        </div>
      </div>

      {/* ===== Tail: Top Jurisdictions + Entity Type (preserved, may drop on review) ===== */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:32}}>
        <div>
          <div style={{fontSize:15,fontWeight:600,marginBottom:14}}>Top Jurisdictions</div>
          {jurisdictions.map((j,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 0',borderBottom:i<jurisdictions.length-1?'1px solid var(--line-1)':'none',fontSize:13}}>
              <span style={{fontSize:16,width:22,textAlign:'center'}}>{j.flag}</span>
              <span style={{color:'var(--ink-1)',flex:1}}>{j.name}</span>
              <span style={{fontVariantNumeric:'tabular-nums',color:'var(--ink-2)',fontWeight:500}}>{j.pct}%</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{fontSize:15,fontWeight:600,marginBottom:14}}>Entity Type</div>
          {entityTypes.map((e,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 0',borderBottom:i<entityTypes.length-1?'1px solid var(--line-1)':'none',fontSize:13}}>
              <EntityIcon name={e.icon}/>
              <span style={{color:'var(--ink-1)',flex:1}}>{e.name}</span>
              <span style={{fontVariantNumeric:'tabular-nums',color:'var(--ink-2)',fontWeight:500}}>{e.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PageBtn({ children, active }) {
  return (
    <button style={{
      minWidth:26,height:26,padding:'0 8px',borderRadius:6,
      border:'1px solid ' + (active ? 'var(--ink-1)' : 'var(--line-2)'),
      background: active ? 'var(--ink-1)' : 'var(--bg-canvas)',
      color: active ? 'var(--bg-canvas)' : 'var(--ink-2)',
      fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit'
    }}>{children}</button>
  );
}

function LockupChip({ value }) {
  const v = (value||'').toLowerCase();
  let bg='var(--bg-subtle)', fg='var(--ink-2)';
  if (v.includes('free')) { bg='transparent'; fg='var(--ink-2)'; }
  else if (v.includes('hot')) { bg='#FFE8E0'; fg='#A14133'; }
  else if (v.includes('locked')) { bg='#F5E9E4'; fg='#8E5948'; }
  else if (v.includes('expiring')) { bg='#FFF0DC'; fg='#8A5A10'; }
  else if (v.includes('expired')) { bg='#FFE1DC'; fg='#A14133'; }
  else if (v.includes('notice')) { bg='#FFF0DC'; fg='#8A5A10'; }
  return <span style={{display:'inline-block',padding:'2px 8px',borderRadius:5,fontSize:11.5,fontWeight:500,background:bg,color:fg}}>{value}</span>;
}

function KycChip({ status }) {
  const map = {
    verified:   { label: 'Verified',  bg:'var(--green-50)',  fg:'var(--green-700)' },
    'pending-dd':{label: 'Pending DD',bg:'#FFF0DC',          fg:'#8A5A10' },
    expiring:   { label: 'Expiring DD',bg:'#FFF0DC',          fg:'#8A5A10' },
    expired:    { label: 'Expired',   bg:'#FFE1DC',          fg:'#A14133' },
  };
  const s = map[status] || map.verified;
  return <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'2px 8px',borderRadius:5,fontSize:11.5,fontWeight:500,background:s.bg,color:s.fg}}>
    {status==='verified' && <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 8.5 6.5 12 13 5"/></svg>}
    {s.label}
  </span>;
}

function ConcentrationPie({ slices }) {
  const R = 62, C = Math.PI * 2 * R;
  let acc = 0;
  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      <g transform="translate(80,80) rotate(-90)">
        {slices.map((s,i) => {
          const len = (s.pct/100) * C;
          const off = -acc;
          acc += len;
          return <circle key={i} r={R} cx={0} cy={0} fill="none" stroke={s.color} strokeWidth={30} strokeDasharray={`${len} ${C}`} strokeDashoffset={off}/>;
        })}
      </g>
    </svg>
  );
}

function EntityIcon({ name }) {
  const common = { width:18, height:18, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:1.7, strokeLinecap:'round', strokeLinejoin:'round', style:{color:'var(--ink-2)'} };
  if (name === 'building') return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/></svg>;
  if (name === 'briefcase') return <svg {...common}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>;
  if (name === 'home') return <svg {...common}><path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/></svg>;
  if (name === 'user') return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>;
  return <svg {...common}><circle cx="12" cy="8" r="6"/><path d="M8.2 13.5 6 22l6-3 6 3-2.2-8.5"/></svg>;
}



// ============================================================================
// RECONCILIATION (full log)
// ============================================================================
function ReconciliationView({ onNav }) {
  const strikes = [
    { d: '07 Feb 16:00', nav: '$47,463,210', ch: '+$2,342,110', checks: '6 / 6', status: 'verified', hash: '0x3b7d…a0c5' },
    { d: '06 Feb 16:00', nav: '$45,121,100', ch: '−$380,400', checks: '6 / 6', status: 'verified', hash: '0xc9a1…4b88' },
    { d: '05 Feb 16:00', nav: '$45,501,500', ch: '+$910,220', checks: '6 / 6', status: 'verified', hash: '0x7e22…9f31' },
    { d: '04 Feb 16:00', nav: '$44,591,280', ch: '+$210,090', checks: '5 / 6', status: 'pending', hash: '0x1abc…d7e4' },
    { d: '03 Feb 16:00', nav: '$44,381,190', ch: '−$122,400', checks: '6 / 6', status: 'verified', hash: '0x66f0…02aa' },
  ];
  return (
    <div style={{padding:'48px 40px 80px',maxWidth:1500,margin:'0 auto'}} data-page>
      <div style={{paddingBottom:24}}>
        <div style={{fontSize:28,fontWeight:600,letterSpacing:'-0.015em',display:'flex',alignItems:'baseline',gap:12}}>Reconciliation log <span style={{fontSize:12,fontWeight:500,color:'var(--ink-2)'}}>· 5 most-recent strikes</span></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:28}}>
        {[
          { l: 'Strikes YTD', v: '27', s: 'All settled on time' },
          { l: 'Price sources', v: '3', s: 'Coinbase · Kraken · Binance' },
          { l: 'Mean dispersion', v: '0.018%', s: 'Well within 0.25% tolerance' },
          { l: 'Variances flagged', v: '1', s: '07 Feb · dust on Binance' },
        ].map((k,i) => (
          <div key={i} style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:10,padding:'16px 20px'}}>
            <div style={{fontSize:11,color:'var(--ink-2)',fontWeight:500,marginBottom:8}}>{k.l}</div>
            <div style={{fontSize:26,fontWeight:600,letterSpacing:'-0.015em',fontVariantNumeric:'tabular-nums'}}>{k.v}</div>
            <div style={{fontSize:12,color:'var(--ink-2)',marginTop:6}}>{k.s}</div>
          </div>
        ))}
      </div>

      <table style={{width:'100%',borderCollapse:'collapse',fontVariantNumeric:'tabular-nums'}}>
        <thead>
          <tr style={{fontSize:10.5,color:'var(--ink-3)',fontWeight:500}}>
            <th style={th}>Strike</th>
            <th style={{...th,textAlign:'right'}}>NAV</th>
            <th style={{...th,textAlign:'right'}}>Change</th>
            <th style={{...th,textAlign:'center'}}>Checks</th>
            <th style={th}>Hash</th>
            <th style={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {strikes.map((s,i) => (
            <tr key={i} style={{fontSize:13}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-subtle)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <td style={td}><div style={{fontWeight:500}}>{s.d} UTC</div></td>
              <td style={{...td,textAlign:'right',fontWeight:500}}>{s.nav}</td>
              <td style={{...td,textAlign:'right',color: s.ch.startsWith('+')?'var(--pos)':'var(--neg)',fontWeight:500}}>{s.ch}</td>
              <td style={{...td,textAlign:'center'}}>{s.checks}</td>
              <td style={{...td,fontFamily:'JetBrains Mono, monospace',fontSize:11.5,color:'var(--ink-2)'}}>{s.hash}</td>
              <td style={td}><StatusChipX status={s.status}/></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Shared styles
const btnOutline = { background:'var(--bg-canvas)',border:'1px solid var(--line-2)',height:34,padding:'0 14px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,color:'var(--ink-1)',display:'inline-flex',alignItems:'center',gap:6,fontFamily:'inherit' };
const btnPrimary = { background:'var(--accent-plum)',color:'var(--accent-plum-on)',border:'none',height:34,padding:'0 14px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,fontFamily:'inherit' };
const th = { textAlign:'left',padding:'8px 12px',borderBottom:'1px solid var(--line-1)',fontWeight:500 };
const td = { padding:'14px 12px',borderBottom:'1px solid var(--line-1)' };
const fLabel = { fontSize:11,color:'var(--ink-2)',fontWeight:500,marginBottom:6,display:'block' };
const fInput = { width:'100%',height:40,padding:'0 14px',border:'1px solid var(--line-2)',borderRadius:8,fontSize:13,color:'var(--ink-1)',background:'var(--bg-canvas)',fontFamily:'inherit',boxSizing:'border-box' };

Object.assign(window, { OrderBookView, CollateralView, ShareRegisterView, ReconciliationView });
