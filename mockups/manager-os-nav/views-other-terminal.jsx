/* Secondary views: order book, collateral, share register, reconciliation */
const { useState: _s1 } = React;

// ============================================================================
// ORDER BOOK
// ============================================================================
function OrderBookView({ onNav }) {
  const [filter, setFilter] = _s1('all');
  const [selected, setSelected] = _s1(null);

  const orders = [
    { id: 'ORD-2026-00418', type: 'sub', holder: 'Meridian Capital Partners', class: 'B', amount: '$450,000', shares: '—', strike: 'Mon 04 May', status: 'approved', created: '30 Apr 14:22', note: 'Wire confirmed' },
    { id: 'ORD-2026-00417', type: 'red', holder: 'Henri Desrosiers', class: 'C', amount: '$82,500', shares: '2,128', strike: 'Mon 04 May', status: 'pending', created: '30 Apr 13:55', note: 'Awaiting AML re-check' },
    { id: 'ORD-2026-00416', type: 'sub', holder: 'Saltbush Super Fund', class: 'A', amount: 'A$1,200,000', shares: '—', strike: 'Mon 04 May', status: 'approved', created: '30 Apr 11:40', note: 'Settled' },
    { id: 'ORD-2026-00415', type: 'red', holder: 'M. Okafor', class: 'C', amount: '$24,000', shares: '619', strike: 'Mon 04 May', status: 'hold', created: '30 Apr 09:12', note: 'Cooling-off period' },
    { id: 'ORD-2026-00414', type: 'sub', holder: 'Peninsula Platform Nominees', class: 'D', amount: '$2,100,000', shares: '—', strike: 'Mon 04 May', status: 'approved', created: '29 Apr 18:30', note: 'Bulk platform order' },
    { id: 'ORD-2026-00413', type: 'sub', holder: 'J. Whitley-Bent', class: 'C', amount: '$15,000', shares: '—', strike: 'Mon 04 May', status: 'approved', created: '29 Apr 15:02', note: 'Monthly recurring' },
    { id: 'ORD-2026-00412', type: 'red', holder: 'Verdant Family Office', class: 'A', amount: '$780,000', shares: '21,576', strike: 'Mon 04 May', status: 'approved', created: '29 Apr 10:18', note: 'Rebalancing' },
  ];
  const filtered = filter === 'all' ? orders : orders.filter(o => filter === 'sub' ? o.type === 'sub' : filter === 'red' ? o.type === 'red' : o.status === filter);

  return (
    <div style={{padding:'48px 40px 80px',maxWidth:1500,margin:'0 auto'}} data-page>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'4px 0 24px',gap:24}}>
        <div>
          <div style={{fontSize:24,fontWeight:600,letterSpacing:'-0.015em',color:'var(--ink-1)'}}>Order book</div>
          <div style={{fontSize:13,color:'var(--ink-2)',marginTop:4}}>7 orders · cutoff Mon 14:00 UTC</div>
        </div>
        <div style={{display:'flex',gap:8,flexShrink:0}}>
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
          <div key={i} style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,padding:'16px 20px'}}>
            <div style={{fontSize:14,color:'var(--ink-2)',fontWeight:500,marginBottom:8}}>{k.l}</div>
            <div style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums',color:k.pos?'var(--pos)':'var(--ink-1)'}}>{k.v}</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:10}}>{k.s}</div>
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
          <tr style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:500}}>
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
                    <div style={{fontSize:11.5,color:'var(--ink-2)'}}>{o.id}</div>
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
  const cfg = type === 'sub' ? { bg: 'var(--green-50)', fg: 'var(--green-700)', label: 'Sub', sym: '↑' } : { bg: '#FFF2F0', fg: '#e13733', label: 'Red', sym: '↓' };
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
            <span style={{fontSize:11.5,color:'var(--ink-2)'}}>{order.id}</span>
          </div>
          <div style={{fontSize:20,fontWeight:600,letterSpacing:'-0.01em'}}>{order.amount} · Class {order.class}</div>
          <div style={{fontSize:13,color:'var(--ink-2)',marginTop:2}}>{order.holder}</div>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>
          <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:600,marginBottom:8}}>Order detail</div>
          <div style={{background:'var(--bg-card)',borderRadius:8,padding:'14px 16px',display:'grid',gridTemplateColumns:'1fr auto',gap:'10px 16px',fontSize:13,fontVariantNumeric:'tabular-nums',marginBottom:20}}>
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
              { t: 'Funds verified', a: '30 Apr 14:45', done: order.status!=='pending', who: 'Treasury · Coinbase Prime' },
              { t: 'AML / KYC', a: order.status==='pending'?'In review':'30 Apr 15:02', done: order.status==='approved', who: 'Compliance' },
              { t: 'Strike applied', a: 'Mon 04 May 16:00', done: false, who: 'NAV ops' },
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
    { asset:'BTC',  venue:'Copper', type:'Clearloop', exchange:'OKX',     posted:'$4.1M', fee: 0.65, income: 0.00 },
    { asset:'ETH',  venue:'Copper', type:'Clearloop', exchange:'Bybit',   posted:'$1.6M', fee: 0.65, income: 0.00 },
    { asset:'SOL',  venue:'Copper', type:'Clearloop', exchange:'Deribit', posted:'$0.8M', fee: 0.65, income: 0.00 },
    { asset:'USDC', venue:'Copper', type:'Clearloop', exchange:'OKX',     posted:'$2.7M', fee: 0.65, income: 3.00 },
    { asset:'ETH',  venue:'Ceffu',  type:'MirrorX',   exchange:'Binance', posted:'$1.6M', fee: 0.60, income: 0.00 },
  ];
  // Total posted $10.8M. Weighted blended: fee 0.64%, income 0.75%, net +0.11%
  const redemptions = [
    { inv:'@NovaTechFund', cls:'Class A', units:'904.76', amt:'$950,000' },
    { inv:'@GlobalVest', cls:'Class B', units:'3,492.01', amt:'$350,000' },
    { inv:'@ApexHoldings', cls:'Class C', units:'1,428.57', amt:'$1,500,000' },
    { inv:'@ZenithCapital', cls:'Class A', units:'571.43', amt:'$600,000' },
  ];

  return (
    <div style={{padding:'48px 40px 80px',maxWidth:1500,margin:'0 auto'}} data-page>
      {/* Page header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'4px 0 32px',gap:24}}>
        <div>
          <div style={{fontSize:24,fontWeight:600,letterSpacing:'-0.015em',color:'var(--ink-1)'}}>Collateral &amp; Treasury</div>
          <div style={{fontSize:13,color:'var(--ink-2)',marginTop:4}}>Free cash, custody balances and venue collateral across the fund.</div>
        </div>
      </div>

      <section style={{marginBottom:70}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:24,marginBottom:20}}>
          <div>
            <div style={{fontSize:18,fontWeight:600,color:'var(--ink-1)',letterSpacing:'-0.005em'}}>Treasury</div>
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
            <div style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,padding:'20px 22px'}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:8}}>
                <div style={{fontSize:12,color:'var(--ink-2)',fontWeight:500}}>Free cash position</div>
                <span style={{fontSize:11.5,fontWeight:500,color:'var(--green-700)',background:'var(--green-50)',padding:'3px 10px',borderRadius:999,whiteSpace:'nowrap'}}>+4.2% APY on T-bills · ~$26,200 / mo</span>
              </div>
              <div style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums',color:'var(--ink-1)'}}>$6,246,000</div>
              <div style={{fontSize:12,color:'var(--green-700)',marginTop:4,fontWeight:500}}>13.2% of NAV</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,padding:'16px 20px'}}>
                <div style={{fontSize:12,color:'var(--ink-2)',fontWeight:500,marginBottom:6}}>USD</div>
                <div style={{fontSize:20,fontWeight:500,fontVariantNumeric:'tabular-nums',letterSpacing:'-0.05em'}}>$5,966,000</div>
              </div>
              <div style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,padding:'16px 20px'}}>
                <div style={{fontSize:12,color:'var(--ink-2)',fontWeight:500,marginBottom:6}}>EUR</div>
                <div style={{fontSize:20,fontWeight:500,fontVariantNumeric:'tabular-nums',letterSpacing:'-0.05em'}}>$280,000</div>
              </div>
            </div>
          </div>
          <div style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,padding:'20px 22px',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:8}}>
              <div style={{fontSize:12,color:'var(--ink-2)',fontWeight:500}}>Next dealing in</div>
              <span style={{width:8,height:8,borderRadius:'50%',background:'#E08A42',marginTop:5,boxShadow:'0 0 0 3px rgba(224,138,66,0.15)'}}/>
            </div>
            <div style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums'}}>03d 14h 22m</div>
            <div style={{fontSize:12,color:'var(--ink-3)',marginTop:4}}>Window opens Mon 4 May, 17:00 UTC</div>
            <div style={{marginTop:18,paddingTop:16,borderTop:'1px solid var(--line-1)',display:'grid',gridTemplateColumns:'1fr auto',gap:'10px 20px',fontSize:13}}>
              <div style={{color:'var(--ink-2)'}}>Next dealing</div><div style={{fontVariantNumeric:'tabular-nums'}}>Mon 4 May, 17:00 UTC</div>
              <div style={{color:'var(--ink-2)'}}>Cutoff</div><div style={{fontVariantNumeric:'tabular-nums'}}>Sun 03 May, 17:00 UTC</div>
              <div style={{color:'var(--ink-2)'}}>Settlement</div><div style={{fontVariantNumeric:'tabular-nums'}}>Mon 4 May, 2026</div>
            </div>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:16}}>
          <div style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,padding:'16px 20px'}}>
            <div style={{fontSize:14,color:'var(--ink-2)',fontWeight:500,marginBottom:8}}>Coverage of avg daily withdrawal</div>
            <div style={{fontSize:24,fontWeight:500,letterSpacing:'-0.05em',fontVariantNumeric:'tabular-nums'}}>52×</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:10}}>$6.25M cash ÷ $120K avg daily withdrawal</div>
          </div>
          <div style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,padding:'16px 20px'}}>
            <div style={{fontSize:14,color:'var(--ink-2)',fontWeight:500,marginBottom:8}}>Coverage of next notice period</div>
            <div style={{fontSize:24,fontWeight:500,letterSpacing:'-0.05em',fontVariantNumeric:'tabular-nums'}}>8.4×</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:10}}>$6.25M cash ÷ $745K max plausible withdrawals</div>
          </div>
        </div>
      </section>

      <section style={{marginBottom:70}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:24,marginBottom:20}}>
          <div>
            <div style={{fontSize:18,fontWeight:600,color:'var(--ink-1)',letterSpacing:'-0.005em',display:'flex',alignItems:'baseline',gap:10}}>
              Collateral position
              <span style={{fontSize:11.5,fontWeight:500,color:'var(--green-700)',background:'var(--green-50)',padding:'3px 8px',borderRadius:999}}>$10.8M posted · 2 custodians · 4 exchanges</span>
            </div>
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
                <th style={th}>Exchange</th>
                <th style={{...th,textAlign:'right'}}>Posted</th>
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
                    <td style={td}>{r.exchange}</td>
                    <td style={{...td,textAlign:'right'}}>{r.posted}</td>
                    <td style={{...td,textAlign:'right',color:'var(--ink-2)'}}>{r.fee.toFixed(2)}%</td>
                    <td style={{...td,textAlign:'right',color:'var(--ink-2)'}}>{r.income.toFixed(2)}%</td>
                    <td style={{...td,textAlign:'right',fontWeight:500,color: net >= 0 ? 'var(--pos)' : 'var(--neg)'}}>{net >= 0 ? '+' : ''}{net.toFixed(2)}%</td>
                  </tr>
                );
              })}
              <tr style={{background:'var(--bg-subtle)',fontSize:13,fontWeight:600}}>
                <td style={{...td,fontWeight:600}} colSpan={4}>Blended (weighted by posted value)</td>
                <td style={{...td,textAlign:'right'}}>$10.8M</td>
                <td style={{...td,textAlign:'right'}}>0.64%</td>
                <td style={{...td,textAlign:'right'}}>0.75%</td>
                <td style={{...td,textAlign:'right',color:'var(--pos)'}}>+0.11%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section style={{marginBottom:70}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:24,marginBottom:20}}>
          <div>
            <div style={{fontSize:18,fontWeight:600,color:'var(--ink-1)',letterSpacing:'-0.005em'}}>Upcoming fund flows</div>
          </div>
          <button onClick={()=>onNav('order-book')} style={btnOutline}>View full order book</button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:16}}>
          <Kpi l="Pending subscriptions" v="+$150,000" s="5 orders" pos/>
          <Kpi l="Pending redemptions" v="−$320,000" s="2 orders" neg/>
          <Kpi l="Projected post-dealing cash" v="$2,476,000" s="after settlement Mon 4 May"/>
          <Kpi l="Net cash required" v="$170,000" s="outflow at settlement"/>
        </div>
      </section>

      <section>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:24,marginBottom:20}}>
          <div style={{fontSize:18,fontWeight:600,color:'var(--ink-1)',letterSpacing:'-0.005em'}}>Pending redemption orders</div>
          <button onClick={()=>onNav('order-book')} style={btnOutline}>View all</button>
        </div>

        <div style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,padding:'18px 22px',marginBottom:16}}>
          <div style={{fontSize:12,color:'var(--ink-2)',fontWeight:500,marginBottom:6}}>Queued order amount</div>
          <div style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums'}}>$4.50M</div>
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
              <div style={{padding:'14px 18px',background:'var(--bg-card)',borderRadius:8,display:'grid',gridTemplateColumns:'1fr auto',gap:'10px 16px',fontSize:13,fontVariantNumeric:'tabular-nums'}}>
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
              <div style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,padding:20}}>
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
function ShareRegisterView({ onNav, shareClasses, setShareClasses }) {
  const [holdingBy, setHoldingBy] = _s1('capital');
  const [resultsBy, setResultsBy] = _s1('book');
  const [sheetState, setSheetState] = _s1({ open: false, mode: 'create', data: null });
  const openCreate = () => setSheetState({ open: true, mode: 'create', data: null });
  const closeSheet = () => setSheetState(s => ({ ...s, open: false }));
  const onSheetSave = (next) => {
    setShareClasses(curr => {
      const idx = curr.findIndex(c => c.code === next.code);
      if (idx >= 0) { const copy = [...curr]; copy[idx] = next; return copy; }
      return [...curr, next];
    });
    closeSheet();
  };

  // Investor rows — deterministic palette per avatar
  const palette = ['#D97A5B','#6E8AB5','#1d7d59','#9B6BA8','#C09A3C','#4A6B85','#8E5948','#5edaa6','#B06A7E','#4C8D93'];
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

  // Share classes — derived from shared store, active classes only, mapped to card shape
  const cardChange = { 'POD-A': '+5.2%', 'POD-B': '+4.8%', 'POD-I': '+5.5%' };
  const classes = (shareClasses || []).filter(c => c.status === 'active').map(c => ({
    name: c.name, navShare: c.navShare, units: c.units, total: c.aum,
    mgmt: c.mgmt, perf: c.perf, investors: c.investors,
    change: cardChange[c.code] || '+0.0%',
  }));

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
    { label: 'Remaining 115', pct: 30, color: 'color-mix(in oklab, var(--accent-plum) 22%, var(--bg-canvas))' },
  ];

  return (
    <div style={{padding:'48px 40px 80px',maxWidth:1500,margin:'0 auto'}} data-page>
      {/* ===== Head ===== */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:24,marginBottom:32}}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:24,fontWeight:600,color:'var(--ink-1)',letterSpacing:'-0.015em'}}>Share Register</div>
          <div style={{fontSize:13,color:'var(--ink-2)',marginTop:4}}>Holders, share classes and lock-ups across the fund.</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          <button onClick={()=>onNav('share-classes')} style={{...btnOutline,height:32,fontSize:12.5}}>Manage classes</button>
          <button onClick={openCreate} style={{...btnPrimary,height:32}}>+ New Share Class</button>
          <button aria-label="More" style={{width:32,height:32,border:'1px solid var(--line-2)',background:'var(--bg-canvas)',borderRadius:8,cursor:'pointer',color:'var(--ink-2)',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
          </button>
        </div>
      </div>

      {/* ===== Blended measures ===== */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:12}}>
        {blended.map((k,i) => (
          <div key={i} style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,padding:'14px 18px'}}>
            <div style={{fontSize:14,color:'var(--ink-2)',fontWeight:500,marginBottom:8}}>{k.l}</div>
            <div style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums'}}>{k.v}</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:10}}>{k.s}</div>
          </div>
        ))}
      </div>

      {/* ===== Manager + POD holdings (KPI tiles, side-by-side) ===== */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:70}}>
        {ownHoldings.map((r,i) => (
          <div key={i} style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,padding:'14px 18px'}}>
            <div style={{fontSize:14,color:'var(--ink-2)',fontWeight:500,marginBottom:8}}>{r.who}</div>
            <div style={{display:'flex',alignItems:'baseline',gap:10,flexWrap:'wrap'}}>
              <span style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums',color:'var(--ink-1)'}}>{r.value}</span>
              <span style={{fontSize:13,fontWeight:500,fontVariantNumeric:'tabular-nums',color:'var(--pos)'}}>{r.returns}</span>
            </div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:10}}>{r.pct} of fund · {r.duration}</div>
          </div>
        ))}
      </div>

      {/* ===== Top split: Holding period + Duration profile ===== */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:32,marginBottom:48}}>
        {/* Holding period — horizontal bars w/ hover tooltip */}
        <div>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,marginBottom:18}}>
            <div style={{fontSize:18,fontWeight:600,letterSpacing:'-0.005em'}}>Holding period</div>
            <div style={{display:'inline-flex',padding:3,background:'var(--bg-subtle)',borderRadius:8}}>
              <button onClick={()=>setHoldingBy('capital')} style={{border:'none',cursor:'pointer',padding:'6px 14px',borderRadius:6,fontSize:12,fontWeight:500,background:holdingBy==='capital'?'var(--bg-canvas)':'transparent',color:holdingBy==='capital'?'var(--ink-1)':'var(--ink-2)',boxShadow:holdingBy==='capital'?'0 1px 2px rgba(0,0,0,0.06)':'none'}}>By Capital</button>
              <button onClick={()=>setHoldingBy('investor')} style={{border:'none',cursor:'pointer',padding:'6px 14px',borderRadius:6,fontSize:12,fontWeight:500,background:holdingBy==='investor'?'var(--bg-canvas)':'transparent',color:holdingBy==='investor'?'var(--ink-1)':'var(--ink-2)',boxShadow:holdingBy==='investor'?'0 1px 2px rgba(0,0,0,0.06)':'none'}}>By Investor</button>
            </div>
          </div>
          <HoldingBars data={holding}/>
        </div>

        {/* Duration profile — donut */}
        <div>
          <div style={{fontSize:18,fontWeight:600,letterSpacing:'-0.005em',marginBottom:24}}>Duration profile</div>
          <div style={{display:'grid',gridTemplateColumns:'320px 1fr',gap:28,alignItems:'center'}}>
            <div style={{position:'relative',width:320,height:320,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="320" height="320" viewBox="0 0 200 200" style={{overflow:'visible',position:'absolute',inset:0}}>
                {/* Available 24.1% */}
                <path d="M 101.36 22.01 A 78 78 0 0 1 177.84 94.91" fill="none" stroke="var(--accent-plum)" strokeWidth="14"/>
                {/* In notice 13.5% */}
                <path d="M 177.91 96.27 A 78 78 0 0 1 155.31 155.04" fill="none" stroke="color-mix(in oklab, var(--accent-plum) 55%, var(--bg-canvas))" strokeWidth="14"/>
                {/* Locked 62.4% */}
                <path d="M 154.30 155.99 A 78 78 0 1 1 99.32 22.00" fill="none" stroke="color-mix(in oklab, var(--accent-plum) 22%, var(--bg-canvas))" strokeWidth="14"/>
              </svg>
              <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',pointerEvents:'none'}}>
                <div style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:500}}>Available</div>
                <div style={{fontSize:32,fontWeight:500,letterSpacing:'-0.04em',fontVariantNumeric:'tabular-nums',marginTop:2,color:'var(--accent-plum)'}}>24.1%</div>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <DurationLegendRow color="var(--accent-plum)" label="Available" pct="24.1%"/>
              <DurationLegendRow color="color-mix(in oklab, var(--accent-plum) 55%, var(--bg-canvas))" label="In notice" pct="13.5%"/>
              <DurationLegendRow color="color-mix(in oklab, var(--accent-plum) 22%, var(--bg-canvas))" label="Locked" pct="62.4%"/>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Concentration full width ===== */}
      <div style={{marginBottom:48}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
          <div style={{fontSize:18,fontWeight:600,letterSpacing:'-0.005em'}}>Concentration</div>
          <div style={{display:'inline-block',padding:'3px 10px',borderRadius:999,background:'#FFF2E8',color:'#e13733',fontSize:11,fontWeight:600}}>Moderate concentration</div>
        </div>
        <div style={{display:'flex',height:64,borderRadius:6,overflow:'hidden'}}>
          {concSlices.map((s,i) => (
            <div key={i} style={{
              flex:s.pct,
              background:s.color,
              color: i === 0 ? 'var(--accent-plum-on)' : i === 3 ? '#fff' : 'var(--ink-1)',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:16,fontWeight:600,
              fontVariantNumeric:'tabular-nums',letterSpacing:'-0.005em',
            }}>{s.pct}%</div>
          ))}
        </div>
        <div style={{display:'flex',gap:24,marginTop:16,fontSize:12,color:'var(--ink-2)',flexWrap:'wrap'}}>
          {concSlices.map((s,i) => (
            <span key={i} style={{display:'inline-flex',alignItems:'center',gap:8}}>
              <span style={{width:10,height:10,borderRadius:3,background:s.color}}/>
              {s.label} · {s.pct}%
            </span>
          ))}
        </div>
      </div>

      {/* ===== Results delivered — KPI tiles ===== */}
      <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:24,marginBottom:20}}>
        <div style={{fontSize:18,fontWeight:600,letterSpacing:'-0.005em'}}>Results delivered for investors</div>
        <div style={{display:'inline-flex',padding:3,background:'var(--bg-subtle)',borderRadius:8}}>
          <button onClick={()=>setResultsBy('book')} style={{border:'none',cursor:'pointer',padding:'6px 14px',borderRadius:6,fontSize:12,fontWeight:500,background:resultsBy==='book'?'var(--bg-canvas)':'transparent',color:resultsBy==='book'?'var(--ink-1)':'var(--ink-2)',boxShadow:resultsBy==='book'?'0 1px 2px rgba(0,0,0,0.06)':'none'}}>By Book</button>
          <button onClick={()=>setResultsBy('dealings')} style={{border:'none',cursor:'pointer',padding:'6px 14px',borderRadius:6,fontSize:12,fontWeight:500,background:resultsBy==='dealings'?'var(--bg-canvas)':'transparent',color:resultsBy==='dealings'?'var(--ink-1)':'var(--ink-2)',boxShadow:resultsBy==='dealings'?'0 1px 2px rgba(0,0,0,0.06)':'none'}}>By Dealings</button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:70}}>
        {resultsBuckets.map(b => {
          const pct = resultsBy === 'book' ? b.book : b.dealings;
          return (
            <div key={b.bucket} style={{
              background: b.neg
                ? 'color-mix(in oklab, var(--neg) 14%, var(--glass-bg))'
                : 'var(--glass-bg)',
              borderRadius:8,padding:'16px 20px',
            }}>
              <div style={{fontSize:14,color: b.neg ? 'var(--neg)' : 'var(--ink-2)',fontWeight:500,marginBottom:8}}>{b.bucket} return</div>
              <div style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums',color: b.neg ? 'var(--neg)' : 'var(--ink-1)'}}>{pct}%</div>
            </div>
          );
        })}
      </div>

      {/* ===== Share Classes ===== */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div style={{fontSize:18,fontWeight:600,letterSpacing:'-0.005em'}}>Share Classes</div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button onClick={()=>onNav('share-classes')} style={{...btnOutline,height:30,fontSize:12.5}}>Manage classes</button>
          <button onClick={openCreate} style={{...btnOutline,height:30,fontSize:12.5}}>+ Create class</button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:70}}>
        {classes.map((c,i) => (
          <div key={i} style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:10,padding:'18px 22px'}}>
            <div style={{fontSize:14,fontWeight:500,color:'var(--ink-2)',marginBottom:10}}>{c.name}</div>
            <div style={{display:'flex',alignItems:'baseline',gap:10,flexWrap:'wrap',marginBottom:4}}>
              <span style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums',color:'var(--ink-1)'}}>{c.total}</span>
              <span style={{fontSize:13,fontWeight:500,fontVariantNumeric:'tabular-nums',color:'var(--pos)'}}>{c.change}</span>
            </div>
            <div style={{fontSize:13,color:'var(--ink-3)',fontVariantNumeric:'tabular-nums'}}>{c.navShare} / unit</div>
            <div style={{marginTop:16,paddingTop:14,borderTop:'1px solid var(--line-1)',display:'flex',flexDirection:'column',gap:6,fontSize:12.5,color:'var(--ink-2)',fontVariantNumeric:'tabular-nums'}}>
              <div>{c.units} units · {c.investors} investors</div>
              <div>{c.mgmt} mgmt · {c.perf} perf fee</div>
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
            <tr style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:500,background:'var(--bg-subtle)'}}>
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

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',margin:'16px 4px 70px',fontSize:12,color:'var(--ink-2)'}}>
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
          <div style={{fontSize:18,fontWeight:600,letterSpacing:'-0.005em',marginBottom:20}}>Top Jurisdictions</div>
          {jurisdictions.map((j,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 0',borderBottom:i<jurisdictions.length-1?'1px solid var(--line-1)':'none',fontSize:13}}>
              <span style={{fontSize:16,width:22,textAlign:'center'}}>{j.flag}</span>
              <span style={{color:'var(--ink-1)',flex:1}}>{j.name}</span>
              <span style={{fontVariantNumeric:'tabular-nums',color:'var(--ink-2)',fontWeight:500}}>{j.pct}%</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{fontSize:18,fontWeight:600,letterSpacing:'-0.005em',marginBottom:20}}>Entity Type</div>
          {entityTypes.map((e,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 0',borderBottom:i<entityTypes.length-1?'1px solid var(--line-1)':'none',fontSize:13}}>
              <EntityIcon name={e.icon}/>
              <span style={{color:'var(--ink-1)',flex:1}}>{e.name}</span>
              <span style={{fontVariantNumeric:'tabular-nums',color:'var(--ink-2)',fontWeight:500}}>{e.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <ShareClassSheet open={sheetState.open} mode={sheetState.mode} initialData={sheetState.data} onClose={closeSheet} onSave={onSheetSave}/>
    </div>
  );
}

// ============================================================================
// SHARE CLASSES (sub-page of Share Register)
// ============================================================================
function ShareClassesView({ onNav, shareClasses, setShareClasses }) {
  const [filter, setFilter] = _s1('all');
  const [sheetState, setSheetState] = _s1({ open: false, mode: 'create', data: null });
  const allClasses = shareClasses;

  const filtered = filter === 'all' ? allClasses : allClasses.filter(c => c.status === filter);
  const counts = {
    all: allClasses.length,
    draft: allClasses.filter(c => c.status === 'draft').length,
    active: allClasses.filter(c => c.status === 'active').length,
    inactive: allClasses.filter(c => c.status === 'inactive').length,
  };

  const openCreate = () => setSheetState({ open: true, mode: 'create', data: null });
  const openEdit = (c) => setSheetState({ open: true, mode: 'edit', data: c });
  const closeSheet = () => setSheetState(s => ({ ...s, open: false }));
  const onSave = (next) => {
    setShareClasses(curr => {
      const idx = curr.findIndex(c => c.code === next.code);
      if (idx >= 0) {
        const copy = [...curr]; copy[idx] = next; return copy;
      }
      return [...curr, next];
    });
    closeSheet();
  };

  const summary = [
    { l: 'Active classes',     v: '3',         s: 'A · B · I open for dealings' },
    { l: 'AUM (active)',       v: '$11.42 B',  s: '+$487M MTD across active' },
    { l: 'Investors (active)', v: '145',       s: '85 · 40 · 20 by class' },
    { l: 'Pending review',     v: '2',         s: '1 IC approval · 1 term sheet' },
  ];

  const filterTabs = [
    { k: 'all',      l: 'All' },
    { k: 'draft',    l: 'Draft' },
    { k: 'active',   l: 'Active' },
    { k: 'inactive', l: 'Inactive' },
  ];

  return (
    <div style={{padding:'48px 40px 80px',maxWidth:1500,margin:'0 auto'}} data-page>
      {/* ===== Page head ===== */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:24,marginBottom:32}}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:24,fontWeight:600,color:'var(--ink-1)',letterSpacing:'-0.015em'}}>Share classes</div>
          <div style={{fontSize:13,color:'var(--ink-2)',marginTop:4}}>Define, activate and retire share classes for the fund.</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          <button onClick={openCreate} style={{...btnPrimary,height:32}}>+ New share class</button>
        </div>
      </div>

      {/* ===== Summary KPIs ===== */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:70}}>
        {summary.map((k,i) => (
          <div key={i} style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,padding:'14px 18px'}}>
            <div style={{fontSize:14,color:'var(--ink-2)',fontWeight:500,marginBottom:8}}>{k.l}</div>
            <div style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums'}}>{k.v}</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:10}}>{k.s}</div>
          </div>
        ))}
      </div>

      {/* ===== Filter row ===== */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:14,flexWrap:'wrap'}}>
        <div style={{display:'inline-flex',padding:3,background:'var(--bg-subtle)',borderRadius:8}}>
          {filterTabs.map(t => {
            const active = filter === t.k;
            return (
              <button key={t.k} onClick={()=>setFilter(t.k)} style={{
                border:'none',cursor:'pointer',padding:'6px 14px',borderRadius:6,
                fontSize:12,fontWeight:500,fontFamily:'inherit',
                background: active?'var(--bg-canvas)':'transparent',
                color: active?'var(--ink-1)':'var(--ink-2)',
                boxShadow: active?'0 1px 2px rgba(0,0,0,0.06)':'none',
                display:'inline-flex',alignItems:'center',gap:6,
              }}>
                <span>{t.l}</span>
                <span style={{fontSize:11,color:'var(--ink-3)',fontVariantNumeric:'tabular-nums'}}>{counts[t.k]}</span>
              </button>
            );
          })}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{position:'relative'}}>
            <input placeholder="Search classes..." style={{...fInput,height:34,paddingLeft:32,fontSize:13,minWidth:240}}/>
            <Icon.search style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',width:13,height:13,color:'var(--ink-3)'}}/>
          </div>
          <button style={{...btnOutline,height:34}}><Icon.download style={{width:12,height:12}}/> Export</button>
        </div>
      </div>

      {/* ===== Table ===== */}
      <div style={{overflow:'hidden',marginBottom:16}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontVariantNumeric:'tabular-nums'}}>
          <thead>
            <tr style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:500,background:'var(--bg-subtle)'}}>
              <th style={{...th,padding:'10px 16px'}}>Class</th>
              <th style={{...th,padding:'10px 16px'}}>Reference</th>
              <th style={{...th,textAlign:'right',padding:'10px 16px'}}>NAV / unit</th>
              <th style={{...th,textAlign:'right',padding:'10px 16px'}}>Units</th>
              <th style={{...th,textAlign:'right',padding:'10px 16px'}}>AUM</th>
              <th style={{...th,textAlign:'right',padding:'10px 16px'}}>Mgmt / Perf</th>
              <th style={{...th,textAlign:'right',padding:'10px 16px'}}>Investors</th>
              <th style={{...th,padding:'10px 16px'}}>Lock-up</th>
              <th style={{...th,padding:'10px 16px'}}>Last activity</th>
              <th style={{...th,padding:'10px 16px'}}>Status</th>
              <th style={{...th,padding:'10px 16px',width:32}}/>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c,i) => {
              const muted = c.status !== 'active';
              return (
                <tr key={i} data-row style={{fontSize:13,cursor:'pointer'}} onClick={()=>openEdit(c)} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-subtle)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{...td,padding:'14px 16px',fontWeight:500,color:'var(--ink-1)'}}>{c.name}</td>
                  <td style={{...td,padding:'14px 16px',color:'var(--ink-2)',fontSize:12.5}}>{c.code} · {c.launched}</td>
                  <td style={{...td,padding:'14px 16px',textAlign:'right',color: muted ? 'var(--ink-3)' : 'var(--ink-1)'}}>{c.navShare}</td>
                  <td style={{...td,padding:'14px 16px',textAlign:'right',color: muted ? 'var(--ink-3)' : 'var(--ink-1)'}}>{c.units}</td>
                  <td style={{...td,padding:'14px 16px',textAlign:'right',fontWeight:500,color: muted ? 'var(--ink-3)' : 'var(--ink-1)'}}>{c.aum}</td>
                  <td style={{...td,padding:'14px 16px',textAlign:'right',color:'var(--ink-2)',fontSize:12.5}}>{c.mgmt} / {c.perf}</td>
                  <td style={{...td,padding:'14px 16px',textAlign:'right',color: muted ? 'var(--ink-3)' : 'var(--ink-1)'}}>{c.investors}</td>
                  <td style={{...td,padding:'14px 16px',color:'var(--ink-2)'}}>{c.lockup}</td>
                  <td style={{...td,padding:'14px 16px',color:'var(--ink-2)',fontSize:12.5}}>{c.activity}</td>
                  <td style={{...td,padding:'14px 16px'}}><ClassStatusChip status={c.status}/></td>
                  <td style={{...td,padding:'14px 16px',textAlign:'right',color:'var(--ink-3)'}} onClick={(e)=>{e.stopPropagation(); openEdit(c);}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={11} style={{...td,padding:'40px 16px',textAlign:'center',color:'var(--ink-3)'}}>No share classes match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{fontSize:12,color:'var(--ink-3)'}}>
        Showing {filtered.length} of {allClasses.length} classes
      </div>

      <ShareClassSheet open={sheetState.open} mode={sheetState.mode} initialData={sheetState.data} onClose={closeSheet} onSave={onSave}/>
    </div>
  );
}

// ============================================================================
// SHARE CLASS SIDE SHEET (Create / Edit)
// ============================================================================
function FloatingField({ label, value, onChange, type='text', step, min, prefix, suffix, options, hint, autoFocus }) {
  const [focused, setFocused] = _s1(false);
  const isSelect = !!options;
  const hasValue = value !== '' && value !== null && value !== undefined;
  const float = focused || hasValue;
  const wrapperS = {
    position:'relative', height:56,
    border:'1px solid '+(focused ? 'var(--ink-1)' : 'var(--line-2)'),
    borderRadius:8, background:'var(--bg-canvas)',
    transition:'border-color 0.12s',
  };
  const labelS = {
    position:'absolute', left:14,
    top: float ? 9 : '50%',
    transform: float ? 'none' : 'translateY(-50%)',
    fontSize: float ? 11 : 14,
    color: focused ? 'var(--ink-1)' : 'var(--ink-3)',
    fontWeight: float ? 500 : 400,
    transition: 'top 0.12s, font-size 0.12s, color 0.12s, transform 0.12s, font-weight 0.12s',
    pointerEvents:'none', whiteSpace:'nowrap',
  };
  const prefixPad = prefix ? (prefix.length > 2 ? 50 : 26) : 0;
  const fieldS = {
    width:'100%', height:'100%', border:'none', background:'transparent',
    fontSize:14, color:'var(--ink-1)',
    paddingLeft: 14 + prefixPad,
    paddingRight: isSelect ? 32 : (suffix ? 30 : 14),
    paddingTop: float ? 20 : 0,
    paddingBottom: 0,
    fontFamily:'inherit', outline:'none', boxShadow:'none', boxSizing:'border-box',
    fontVariantNumeric:'tabular-nums',
    appearance: isSelect ? 'none' : undefined,
    WebkitAppearance: isSelect ? 'none' : undefined,
    cursor: isSelect ? 'pointer' : 'text',
  };
  return (
    <React.Fragment>
      <div style={wrapperS}>
        <label style={labelS}>{label}</label>
        {prefix && float && <span style={{position:'absolute', left:14, top:28, fontSize:14, color:'var(--ink-1)', pointerEvents:'none', fontVariantNumeric:'tabular-nums'}}>{prefix}</span>}
        {suffix && float && <span style={{position:'absolute', right:14, top:28, fontSize:14, color:'var(--ink-3)', pointerEvents:'none', fontVariantNumeric:'tabular-nums'}}>{suffix}</span>}
        {isSelect ? (
          <select autoFocus={autoFocus} value={value || ''} onChange={onChange} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={fieldS}>
            <option value="" disabled hidden></option>
            {options.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input autoFocus={autoFocus} type={type} step={step} min={min} value={value} onChange={onChange} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={fieldS}/>
        )}
        {isSelect && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--ink-3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none'}}>
            <path d="M3 4.5 6 7.5 9 4.5"/>
          </svg>
        )}
      </div>
      {hint && <div style={{fontSize:11.5, color:'var(--ink-3)', marginTop:6, paddingLeft:2}}>{hint}</div>}
    </React.Fragment>
  );
}


const SHARE_CLASS_EMPTY = {
  name: '', feeTier: '', income: 'accumulation', distFreq: '',
  currency: 'USD', hedging: 'unhedged',
  mgmtNum: '', perfNum: '', subFee: '', redFee: '',
  minInvestment: '', lockupNum: '', lockupUnit: 'Months',
  noticeNum: '', noticeUnit: 'Days', dealing: '', voting: true,
  hwm: 'Per class', dilution: false, swing: '', gates: '',
};
const CURRENCY_PREFIX = { USD: '$', EUR: '€', GBP: '£', CHF: 'CHF ', JPY: '¥', AUD: 'A$', CAD: 'C$', SGD: 'S$', HKD: 'HK$' };

function ShareClassSheet({ open, mode, initialData, onClose, onSave }) {
  const [form, setForm] = _s1(SHARE_CLASS_EMPTY);

  React.useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initialData) {
      const merged = { ...SHARE_CLASS_EMPTY };
      Object.keys(SHARE_CLASS_EMPTY).forEach(k => {
        if (initialData[k] !== undefined && initialData[k] !== null) merged[k] = initialData[k];
      });
      setForm(merged);
    } else {
      setForm(SHARE_CLASS_EMPTY);
    }
  }, [open, mode, initialData]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  const set = (k) => (e) => {
    const v = e && e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setForm(f => ({ ...f, [k]: v }));
  };
  const setVal = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const isValid = form.name.trim().length > 0 && !!form.feeTier;
  const prefix = CURRENCY_PREFIX[form.currency] || '$';

  const buildClass = (status) => {
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const fallbackCode = 'POD-' + ((form.name.match(/Class\s+(\w)/i) || [])[1] || form.name[0] || 'X').toUpperCase();
    const code = mode === 'edit' && initialData ? initialData.code : fallbackCode;
    const days = (n, unit) => n * (unit === 'Years' ? 365 : unit === 'Months' ? 30 : 1);
    const lockDays = days(parseFloat(form.lockupNum) || 0, form.lockupUnit);
    const noticeDays = days(parseFloat(form.noticeNum) || 0, form.noticeUnit);
    const lockupText = lockDays > 0 ? `${lockDays}d hard lock` : noticeDays > 0 ? `${noticeDays}d notice` : '—';
    const base = mode === 'edit' && initialData
      ? { ...initialData }
      : { navShare: '—', units: '—', aum: '—', investors: 0, launched: status === 'draft' ? 'Term sheet · drafting' : `Launched ${today}` };
    return {
      ...base,
      ...form,
      code,
      status,
      mgmt: `${(parseFloat(form.mgmtNum) || 0).toFixed(2)}%`,
      perf: `${parseInt(form.perfNum) || 0}%`,
      lockup: lockupText,
      activity: mode === 'edit' ? `Edited · ${today}` : `Created · ${today}`,
    };
  };

  const onCancel = () => onClose();
  const onCreate = () => { if (isValid) onSave(buildClass('active')); };
  const onDraft = () => { if (form.name.trim()) onSave(buildClass('draft')); };
  const onSaveChanges = () => { if (isValid) onSave(buildClass(initialData?.status || 'draft')); };

  // Styles (scoped, all use manager-os-nav tokens)
  const overlayS = { position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:60, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition:'opacity 0.2s ease' };
  const panelS = { position:'fixed', top:0, right:0, bottom:0, width:660, maxWidth:'100vw', background:'var(--bg-canvas)', borderLeft:'1px solid var(--line-1)', zIndex:61, transform: open ? 'translateX(0)' : 'translateX(100%)', transition:'transform 0.3s ease', display:'flex', flexDirection:'column', boxShadow:'-24px 0 48px rgba(0,0,0,0.18)' };
  const topbarS = { padding:'16px 48px', flexShrink:0 };
  const cancelBtnS = { display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', border:'none', background:'var(--bg-subtle)', cursor:'pointer', borderRadius:999, fontFamily:'inherit', fontSize:12, fontWeight:500, color:'var(--ink-1)' };
  const bodyS = { flex:1, overflowY:'auto', padding:'0 48px 48px' };
  const footerS = { padding:'20px 48px', flexShrink:0, borderTop:'1px solid var(--line-1)', display:'flex', gap:8 };

  const sectionLabelS = { fontSize:13, fontWeight:600, color:'var(--ink-1)', marginTop:40, marginBottom:14, paddingTop:24, borderTop:'1px solid var(--line-1)' };
  const groupS = { marginTop:16 };
  const rowS = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 };
  const fInputBox = { ...fInput };
  const fSelectS = { ...fInput, appearance:'none', WebkitAppearance:'none', paddingRight:36, cursor:'pointer', backgroundImage:`url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none' stroke='%2382858B' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 4.5 6 7.5 9 4.5'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center' };

  const pillBtn = (active) => ({
    flex:1, padding:'9px 14px', borderRadius:8, border:'1px solid '+(active?'var(--ink-1)':'var(--line-2)'), background: active?'var(--ink-1)':'var(--bg-canvas)', color: active?'var(--bg-canvas)':'var(--ink-1)', cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:'inherit',
  });
  const Toggle = ({ on, onChange }) => (
    <button type="button" onClick={()=>onChange(!on)} style={{
      width:36, height:20, borderRadius:10, border:'none', cursor:'pointer', padding:0,
      background: on ? 'var(--accent-plum)' : 'var(--line-2)', position:'relative', transition:'background 0.15s'
    }}>
      <span style={{position:'absolute', top:2, left: on?18:2, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.15s'}}/>
    </button>
  );

  const InputSuffix = ({ children, suffix }) => (
    <div style={{position:'relative'}}>
      {children}
      <span style={{position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', color:'var(--ink-3)', fontSize:13, fontVariantNumeric:'tabular-nums', pointerEvents:'none'}}>{suffix}</span>
    </div>
  );
  const InputPrefix = ({ children, prefix }) => (
    <div style={{position:'relative'}}>
      <span style={{position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--ink-3)', fontSize:13, fontVariantNumeric:'tabular-nums', pointerEvents:'none'}}>{prefix}</span>
      {children}
    </div>
  );

  return ReactDOM.createPortal(
    <React.Fragment>
      <div style={overlayS} onClick={onCancel}/>
      <div style={panelS} role="dialog" aria-label={mode==='edit'?'Edit share class':'Add share class'}>
        <div style={topbarS}>
          <button style={cancelBtnS} onClick={onCancel} aria-label="Cancel">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Cancel
          </button>
        </div>

        <div style={bodyS}>
          <div style={{paddingBottom:24}}>
            <div style={{fontSize:24,fontWeight:600,letterSpacing:'-0.015em',color:'var(--ink-1)'}}>
              {mode==='edit' ? `Edit ${initialData?.name || 'share class'}` : 'Add share class'}
            </div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:4}}>
              {mode==='edit' ? 'Update terms for this share class.' : 'Define the terms for a new share class in this fund.'}
            </div>
          </div>

          {/* Identity */}
          <div style={{...sectionLabelS, marginTop:0, paddingTop:0, borderTop:'none'}}>Identity</div>
          <div style={groupS}>
            <FloatingField label="Class name" value={form.name} onChange={set('name')}/>
          </div>
          <div style={groupS}>
            <FloatingField label="Fee tier" value={form.feeTier} onChange={set('feeTier')} options={['Retail','Institutional','Seed','Platform','Bundled']}/>
          </div>
          <div style={groupS}>
            <label style={fLabel}>Income treatment</label>
            <div style={{display:'flex', gap:8}}>
              <button type="button" style={pillBtn(form.income==='accumulation')} onClick={()=>setVal('income','accumulation')}>Accumulation</button>
              <button type="button" style={pillBtn(form.income==='distribution')} onClick={()=>setVal('income','distribution')}>Distribution</button>
            </div>
          </div>
          {form.income === 'distribution' && (
            <div style={groupS}>
              <FloatingField label="Distribution frequency" value={form.distFreq} onChange={set('distFreq')} options={['Monthly','Quarterly','Semi-annual','Annual']}/>
            </div>
          )}

          {/* Currency & Hedging */}
          <div style={sectionLabelS}>Currency &amp; Hedging</div>
          <div style={groupS}>
            <FloatingField label="Denomination currency" value={form.currency} onChange={set('currency')} options={[
              {value:'USD',label:'USD — US Dollar'},
              {value:'EUR',label:'EUR — Euro'},
              {value:'GBP',label:'GBP — British Pound'},
              {value:'CHF',label:'CHF — Swiss Franc'},
              {value:'JPY',label:'JPY — Japanese Yen'},
              {value:'AUD',label:'AUD — Australian Dollar'},
              {value:'CAD',label:'CAD — Canadian Dollar'},
              {value:'SGD',label:'SGD — Singapore Dollar'},
              {value:'HKD',label:'HKD — Hong Kong Dollar'},
            ]}/>
          </div>
          <div style={groupS}>
            <FloatingField label="FX hedging model" value={form.hedging} onChange={set('hedging')} options={[
              {value:'unhedged',label:'Unhedged'},
              {value:'passive',label:'Passive'},
              {value:'active',label:'Active'},
            ]}/>
          </div>

          {/* Fees */}
          <div style={sectionLabelS}>Fees</div>
          <div style={{...groupS, ...rowS}}>
            <FloatingField label="Management fee" type="number" step="0.01" min="0" suffix="%" value={form.mgmtNum} onChange={set('mgmtNum')}/>
            <FloatingField label="Performance fee" type="number" step="0.01" min="0" suffix="%" value={form.perfNum} onChange={set('perfNum')}/>
          </div>
          <div style={{...groupS, ...rowS}}>
            <FloatingField label="Subscription fee" type="number" step="0.01" min="0" suffix="%" value={form.subFee} onChange={set('subFee')}/>
            <FloatingField label="Redemption fee" type="number" step="0.01" min="0" suffix="%" value={form.redFee} onChange={set('redFee')}/>
          </div>

          {/* Dealing & Liquidity */}
          <div style={sectionLabelS}>Dealing &amp; Liquidity</div>
          <div style={groupS}>
            <FloatingField label="Minimum investment" type="number" min="0" prefix={prefix} value={form.minInvestment} onChange={set('minInvestment')}/>
          </div>
          <div style={{...groupS, ...rowS}}>
            <div style={{display:'grid', gridTemplateColumns:'1fr 110px', gap:8}}>
              <FloatingField label="Lock-up period" type="number" min="0" value={form.lockupNum} onChange={set('lockupNum')}/>
              <FloatingField label="Unit" value={form.lockupUnit} onChange={set('lockupUnit')} options={['Days','Months','Years']}/>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 110px', gap:8}}>
              <FloatingField label="Notice period" type="number" min="0" value={form.noticeNum} onChange={set('noticeNum')}/>
              <FloatingField label="Unit" value={form.noticeUnit} onChange={set('noticeUnit')} options={['Days','Months']}/>
            </div>
          </div>
          <div style={groupS}>
            <FloatingField label="Dealing schedule" value={form.dealing} onChange={set('dealing')} options={['Daily','Weekly','Monthly']}/>
          </div>
          <div style={groupS}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 14px', border:'1px solid var(--line-2)', borderRadius:8}}>
              <span style={{fontSize:14, color:'var(--ink-1)'}}>Shareholders can vote</span>
              <Toggle on={form.voting} onChange={(v)=>setVal('voting', v)}/>
            </div>
          </div>

          {/* Advanced */}
          <div style={sectionLabelS}>Advanced</div>
          <div style={groupS}>
            <FloatingField label="High water mark scope" value={form.hwm} onChange={set('hwm')} options={['Per class','Per dealing']}/>
          </div>
          <div style={groupS}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 14px', border:'1px solid var(--line-2)', borderRadius:8}}>
              <span style={{fontSize:14, color:'var(--ink-1)'}}>Enable dilution adjustment</span>
              <Toggle on={form.dilution} onChange={(v)=>setVal('dilution', v)}/>
            </div>
          </div>
          {form.dilution && (
            <div style={groupS}>
              <FloatingField label="Swing pricing threshold" type="number" step="0.01" min="0" suffix="%" value={form.swing} onChange={set('swing')}/>
            </div>
          )}
          <div style={groupS}>
            <FloatingField label="Redemption gates" type="number" step="0.01" min="0" suffix="%" value={form.gates} onChange={set('gates')} hint="Max % of NAV per dealing day"/>
          </div>
        </div>

        <div style={footerS}>
          {mode === 'edit' ? (
            <button style={{...btnPrimary, flex:1, height:40, opacity: isValid?1:0.5, cursor: isValid?'pointer':'not-allowed'}} onClick={onSaveChanges} disabled={!isValid}>Save Changes</button>
          ) : (
            <React.Fragment>
              <button style={{...btnOutline, flex:1, height:40, opacity: form.name.trim()?1:0.5, cursor: form.name.trim()?'pointer':'not-allowed'}} onClick={onDraft} disabled={!form.name.trim()}>Save Draft</button>
              <button style={{...btnPrimary, flex:1, height:40, opacity: isValid?1:0.5, cursor: isValid?'pointer':'not-allowed'}} onClick={onCreate} disabled={!isValid}>Create Class</button>
            </React.Fragment>
          )}
        </div>
      </div>
    </React.Fragment>,
    document.body
  );
}

function ClassStatusChip({ status }) {
  const map = {
    draft:    { label: 'Draft',    bg: 'var(--bg-subtle)',  fg: 'var(--ink-2)',      dot: 'var(--ink-3)',         border: 'none' },
    active:   { label: 'Active',   bg: 'var(--green-50)',   fg: 'var(--green-700)',  dot: 'var(--accent-plum)',   border: 'none' },
    inactive: { label: 'Inactive', bg: 'transparent',       fg: 'var(--ink-3)',      dot: 'var(--ink-3)',         border: '1px solid var(--line-2)' },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:6,padding:'2px 8px',borderRadius:5,fontSize:11.5,fontWeight:500,background:s.bg,color:s.fg,border:s.border}}>
      <span style={{width:6,height:6,borderRadius:'50%',background:s.dot}}/>
      {s.label}
    </span>
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
  else if (v.includes('hot')) { bg='#FFE8E0'; fg='#e13733'; }
  else if (v.includes('locked')) { bg='#F5E9E4'; fg='#8E5948'; }
  else if (v.includes('expiring')) { bg='#FFF0DC'; fg='#8A5A10'; }
  else if (v.includes('expired')) { bg='#FFE1DC'; fg='#e13733'; }
  else if (v.includes('notice')) { bg='#FFF0DC'; fg='#8A5A10'; }
  return <span style={{display:'inline-block',padding:'2px 8px',borderRadius:5,fontSize:11.5,fontWeight:500,background:bg,color:fg}}>{value}</span>;
}

function KycChip({ status }) {
  const map = {
    verified:   { label: 'Verified',  bg:'var(--green-50)',  fg:'var(--green-700)' },
    'pending-dd':{label: 'Pending DD',bg:'#FFF0DC',          fg:'#8A5A10' },
    expiring:   { label: 'Expiring DD',bg:'#FFF0DC',          fg:'#8A5A10' },
    expired:    { label: 'Expired',   bg:'#FFE1DC',          fg:'#e13733' },
  };
  const s = map[status] || map.verified;
  return <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'2px 8px',borderRadius:5,fontSize:11.5,fontWeight:500,background:s.bg,color:s.fg}}>
    {status==='verified' && <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 8.5 6.5 12 13 5"/></svg>}
    {s.label}
  </span>;
}

function DurationLegendRow({ color, label, pct }) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'8px 1fr auto',gap:10,alignItems:'center'}}>
      <span style={{width:8,height:8,borderRadius:'50%',background:color}}/>
      <span style={{color:'var(--ink-1)',fontSize:15,fontWeight:500}}>{label}</span>
      <span style={{fontSize:15,fontWeight:600,letterSpacing:'-0.005em',fontVariantNumeric:'tabular-nums',color:'var(--ink-1)'}}>{pct}</span>
    </div>
  );
}

function HoldingBars({ data }) {
  const [hovered, setHovered] = _s1(null);
  const max = 40; // axis scale; bars scale relative to this
  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {data.map((h, i) => {
        const isHovered = hovered === i;
        const [capital, invStr] = (h.right || '').split(' · ');
        const investors = invStr ? invStr.replace(' Investors', '') : '';
        return (
          <div key={h.bucket}
               style={{display:'grid',gridTemplateColumns:'80px 1fr 60px',gap:20,alignItems:'center',padding:'6px 0',cursor:'default'}}
               onMouseEnter={()=>setHovered(i)}
               onMouseLeave={()=>setHovered(null)}>
            <div style={{color:'var(--ink-1)',fontSize:15,fontWeight:500,fontVariantNumeric:'tabular-nums'}}>{h.bucket}</div>
            <div style={{position:'relative'}}>
              <div style={{height:16,background:'var(--bg-subtle)',borderRadius:5,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${(h.pct / max) * 100}%`,background:'var(--accent-plum)',borderRadius:5,transition:'width 0.6s cubic-bezier(0.22,1,0.36,1), filter 0.18s',filter: isHovered ? 'brightness(1.08)' : 'none'}}/>
              </div>
              {isHovered && (
                <div style={{position:'absolute',bottom:'calc(100% + 10px)',left:0,background:'var(--ink-1)',color:'var(--bg-canvas)',borderRadius:6,padding:'10px 14px',fontSize:12,fontWeight:500,whiteSpace:'nowrap',zIndex:10,boxShadow:'0 4px 16px rgba(0,0,0,0.12)',pointerEvents:'none'}}>
                  <div style={{display:'flex',justifyContent:'space-between',gap:18}}>
                    <span style={{opacity:0.65}}>Capital</span>
                    <span style={{fontVariantNumeric:'tabular-nums'}}>{capital}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',gap:18,marginTop:4}}>
                    <span style={{opacity:0.65}}>Investors</span>
                    <span style={{fontVariantNumeric:'tabular-nums'}}>{investors}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',gap:18,marginTop:4}}>
                    <span style={{opacity:0.65}}>Share</span>
                    <span style={{fontVariantNumeric:'tabular-nums'}}>{h.pct}%</span>
                  </div>
                  <div style={{position:'absolute',top:'100%',left:16,width:0,height:0,border:'5px solid transparent',borderTopColor:'var(--ink-1)'}}/>
                </div>
              )}
            </div>
            <div style={{color:'var(--ink-1)',fontSize:15,fontWeight:600,letterSpacing:'-0.005em',fontVariantNumeric:'tabular-nums',textAlign:'right'}}>{h.pct}%</div>
          </div>
        );
      })}
    </div>
  );
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
    { d: '30 Apr 16:00', nav: '$47,463,210', ch: '+$2,342,110', checks: '6 / 6', status: 'verified', hash: '0x3b7d…a0c5' },
    { d: '29 Apr 16:00', nav: '$45,121,100', ch: '−$380,400', checks: '6 / 6', status: 'verified', hash: '0xc9a1…4b88' },
    { d: '28 Apr 16:00', nav: '$45,501,500', ch: '+$910,220', checks: '6 / 6', status: 'verified', hash: '0x7e22…9f31' },
    { d: '27 Apr 16:00', nav: '$44,591,280', ch: '+$210,090', checks: '5 / 6', status: 'pending', hash: '0x1abc…d7e4' },
    { d: '26 Apr 16:00', nav: '$44,381,190', ch: '−$122,400', checks: '6 / 6', status: 'verified', hash: '0x66f0…02aa' },
  ];
  return (
    <div style={{padding:'48px 40px 80px',maxWidth:1500,margin:'0 auto'}} data-page>
      <div style={{paddingBottom:24}}>
        <div style={{fontSize:24,fontWeight:600,letterSpacing:'-0.015em',color:'var(--ink-1)'}}>Reconciliation log</div>
        <div style={{fontSize:13,color:'var(--ink-2)',marginTop:4}}>5 most-recent strikes</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:28}}>
        {[
          { l: 'Strikes YTD', v: '27', s: 'All settled on time' },
          { l: 'Price sources', v: '3', s: 'Coinbase · Kraken · Binance' },
          { l: 'Mean dispersion', v: '0.018%', s: 'Well within 0.25% tolerance' },
          { l: 'Variances flagged', v: '1', s: '30 Apr · dust on Binance' },
        ].map((k,i) => (
          <div key={i} style={{background:'var(--glass-bg)',backdropFilter:'blur(10px)',borderRadius:8,padding:'16px 20px'}}>
            <div style={{fontSize:14,color:'var(--ink-2)',fontWeight:500,marginBottom:8}}>{k.l}</div>
            <div style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums'}}>{k.v}</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:10}}>{k.s}</div>
          </div>
        ))}
      </div>

      <table style={{width:'100%',borderCollapse:'collapse',fontVariantNumeric:'tabular-nums'}}>
        <thead>
          <tr style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:500}}>
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
              <td style={{...td,fontSize:11.5,color:'var(--ink-2)'}}>{s.hash}</td>
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

Object.assign(window, { OrderBookView, CollateralView, ShareRegisterView, ShareClassesView, ReconciliationView });
