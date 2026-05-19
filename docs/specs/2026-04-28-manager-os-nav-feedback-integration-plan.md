# Manager OS Nav — ptl-pod Feedback Integration — Implementation Plan

> **Implementer (Claude Code) — read this preamble first.**
> - Design is already approved. Do **not** invoke `brainstorming`, `writing-plans`, `frontend-design`, or `implement-design` skills. Execute directly.
> - Read each target file **once** at the start of its task. Do not re-read between edits unless an Edit call returns an anchor mismatch.
> - **Anchors are exact.** All `old_string` snippets in this plan are copied verbatim from the file. Paste them into the Edit tool as-is.
> - **Browser-check gate is per-page only**, at the end of each task. No mid-task visual checks.
> - **No `TodoWrite`** — this plan is the todo list.
> - **Be terse.** One short sentence per status update. No summaries between sub-steps. End-of-task: confirm done, await Brad's review.
> - **Commits**: one per task after Brad's approval. Push runs in Task 5.

**Goal:** Integrate ptl-pod's six review comments into `mockups/manager-os-nav/*.jsx`.
**Spec:** [2026-04-28-manager-os-nav-feedback-integration-design.md](2026-04-28-manager-os-nav-feedback-integration-design.md)
**Tech:** React via in-browser Babel, no build step, inline styles using CSS vars from `mockups/elysium.css`.

---

## Files

| File | Functions to edit |
|------|-------------------|
| `mockups/manager-os-nav/views-nav.jsx` | `NavView` (whole file) |
| `mockups/manager-os-nav/views-other.jsx` | `CollateralView` (L190–382), `ShareRegisterView` (L614–900) |
| `mockups/manager-os-nav/views-economics.jsx` | `EconomicsView` (whole file) |

Helpers already in scope (do not redefine): `Kpi`, `SectionHead`, `SubTitle`, `KpiCard`, `SubCard`, `SectionHeadE`, `Icon.*`, `btnOutline`, `btnPrimary`, `th`, `td`, `fInput`, `fLabel`.

---

## Task 1 — NAV page (`views-nav.jsx`)

Read the file once. All line numbers below match it.

### 1.1 Add `assetGroup` state (after L7 `const [activeAsset, setActiveAsset] = _u1(null);`)

**Edit 1.1** — anchor on the existing useState line
- old_string:
  ```
  const [activeAsset, setActiveAsset] = _u1(null);
  const [sheetOpen, setSheetOpen] = _u1(null);
  ```
- new_string:
  ```
  const [activeAsset, setActiveAsset] = _u1(null);
  const [sheetOpen, setSheetOpen] = _u1(null);
  const [assetGroup, setAssetGroup] = _u1('spot');
  ```

### 1.2 Add `derivatives` placeholder data + rename `assets` for clarity

**Edit 1.2** — after the closing `];` of `assets` (L14), and before `const venues = [`
- old_string:
  ```
    ];
    const venues = [
  ```
- new_string:
  ```
    ];
    // PLACEHOLDER — pending Timo's answer on Haruko spot vs. derivatives split
    const derivatives = [
      { id: 'btc-perp', name: 'BTC Perpetual', sym: 'BTC-PERP', glyph: '₿', color: '#E69A2A', units: '+12.40 BTC notional', price: '$101,220', pct: 6.8, bar: 22, value: '$3,200,000', d: '+1.2%', donutColor: 'var(--green-700)' },
      { id: 'eth-perp', name: 'ETH Perpetual', sym: 'ETH-PERP', glyph: 'Ξ', color: '#5B6FBE', units: '−180.00 ETH notional', price: '$2,918',   pct: 1.1, bar: 4,  value: '$525,000',   d: '−0.4%', donutColor: 'var(--green-500)' },
      { id: 'sol-fut',  name: 'SOL Futures',   sym: 'SOL-FUT',  glyph: 'S', color: '#7E5BBE', units: '+8,400 SOL notional',  price: '$140',     pct: 0.6, bar: 2,  value: '$280,000',   d: '+2.1%', donutColor: 'var(--green-400)' },
    ];
    const activeAssets = assetGroup === 'spot' ? assets : derivatives;
    const venues = [
  ```

### 1.3 Add `flow` and `margin` fields to venue rows

**Edit 1.3** — replace the entire `venues` const block
- old_string:
  ```
    const venues = [
      { group: 'Custody', total: '$27.5M', share: '58%', rows: [
        { name: 'Coinbase Prime', holdings: 'BTC, ETH, USDC', value: '$18.0M', share: '38.0%', status: 'verified' },
        { name: 'Copper.co', holdings: 'BTC, SOL', value: '$9.5M', share: '20.0%', status: 'verified' },
      ]},
      { group: 'Exchange', total: '$12.4M', share: '26%', rows: [
        { name: 'Binance', holdings: 'Mixed', value: '$7.1M', share: '15.0%', status: 'verified' },
        { name: 'OKX', holdings: 'Mixed', value: '$5.3M', share: '11.0%', status: 'pending' },
      ]},
      { group: 'Cold', total: '$7.5M', share: '16%', rows: [
        { name: 'Self custody', holdings: 'BTC', value: '$7.5M', share: '16.0%', status: 'verified' },
      ]},
    ];
  ```
- new_string:
  ```
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
  ```

### 1.4 Collapse P&L attribution to category rows

**Edit 1.4** — replace four position rows in `attr` (currently L37–41)
- old_string:
  ```
      { label: 'Opening NAV · 01 Feb', kind: 'neu', delta: '—', amt: '$45,100,000' },
      { label: 'Unrealized P&L · BTC', kind: 'pos', delta: '+$1,085,400', amt: 'price $97,840 → $101,220' },
      { label: 'Unrealized P&L · ETH', kind: 'pos', delta: '+$428,310', amt: 'price $2,780 → $2,918' },
      { label: 'Unrealized P&L · other', kind: 'pos', delta: '+$206,290', amt: 'XRP / LTC / ADA aggregate' },
      { label: 'Realized P&L', kind: 'pos', delta: '+$612,400', amt: '8 trades settled' },
  ```
- new_string:
  ```
      { label: 'Opening NAV · 01 Feb', kind: 'neu', delta: '—', amt: '$45,100,000' },
      { label: 'Unrealized P&L', kind: 'pos', delta: '+$1,720,000', amt: 'Mark-to-market across 5 positions' },
      { label: 'Realized P&L', kind: 'pos', delta: '+$612,400', amt: '8 trades settled' },
  ```

### 1.5 Portfolio composition — toggle in SubTitle right slot

**Edit 1.5** — replace existing `SubTitle title="Portfolio composition"` line (L88)
- old_string:
  ```
          <SubTitle title="Portfolio composition" right={<span style={{fontSize:11.5,color:'var(--ink-3)'}}>Total assets: {assets.length}</span>}/>
  ```
- new_string:
  ```
          <SubTitle title="Portfolio composition" right={<SegToggle value={assetGroup} setValue={setAssetGroup} options={[{v:'spot',l:'Spot'},{v:'derivatives',l:'Derivatives'}]}/>}/>
  ```

### 1.6 Swap `assets` → `activeAssets` in donut + table

**Edit 1.6.a** — donut chart
- old_string: `<DonutChart assets={assets}/>`
- new_string: `<DonutChart assets={activeAssets}/>`

**Edit 1.6.b** — table header `Total assets` reference (the `right={` slot already replaced in 1.5, so skip)

**Edit 1.6.c** — `assets.map`
- old_string: `{assets.map(a => (`
- new_string: `{activeAssets.map(a => (`

### 1.7 Venue breakdown — add Net flow + Margin columns

The venue table grid template appears 3 times (header L137, group row L142, data row L150). Update all three.

**Edit 1.7.a** — header row + add two header cells
- old_string:
  ```
            <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.4fr) minmax(0,1.2fr) 110px 80px 110px',gap:16,padding:'4px 4px 8px',borderBottom:'1px solid var(--line-1)',fontSize:10.5,color:'var(--ink-3)',fontWeight:500}}>
              <div>Venue</div><div>Holdings</div><div style={{textAlign:'right'}}>Value</div><div style={{textAlign:'right'}}>Share</div><div style={{textAlign:'right'}}>Status</div>
            </div>
  ```
- new_string:
  ```
            <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.3fr) minmax(0,1.0fr) 100px 70px 90px 110px 100px',gap:16,padding:'4px 4px 8px',borderBottom:'1px solid var(--line-1)',fontSize:10.5,color:'var(--ink-3)',fontWeight:500}}>
              <div>Venue</div><div>Holdings</div><div style={{textAlign:'right'}}>Value</div><div style={{textAlign:'right'}}>Share</div><div style={{textAlign:'right'}}>Net flow</div><div style={{textAlign:'right'}}>Margin</div><div style={{textAlign:'right'}}>Status</div>
            </div>
  ```

**Edit 1.7.b** — group row (the row that shows "Custody / Exchange / Cold" totals)
- old_string:
  ```
                <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.4fr) minmax(0,1.2fr) 110px 80px 110px',gap:16,padding:'14px 4px 8px',borderBottom:'1px solid var(--line-2)',fontSize:10.5,color:'var(--ink-3)',fontWeight:600,marginTop:4}}>
                  <div style={{color:'var(--ink-2)'}}>{v.group}</div>
                  <div/>
                  <div style={{textAlign:'right',color:'var(--ink-1)',textTransform:'none',letterSpacing:0,fontSize:12.5,fontWeight:500}}>{v.total}</div>
                  <div style={{textAlign:'right',color:'var(--ink-3)',textTransform:'none',letterSpacing:0,fontSize:12.5,fontWeight:500}}>{v.share}</div>
                  <div/>
                </div>
  ```
- new_string:
  ```
                <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.3fr) minmax(0,1.0fr) 100px 70px 90px 110px 100px',gap:16,padding:'14px 4px 8px',borderBottom:'1px solid var(--line-2)',fontSize:10.5,color:'var(--ink-3)',fontWeight:600,marginTop:4}}>
                  <div style={{color:'var(--ink-2)'}}>{v.group}</div>
                  <div/>
                  <div style={{textAlign:'right',color:'var(--ink-1)',textTransform:'none',letterSpacing:0,fontSize:12.5,fontWeight:500}}>{v.total}</div>
                  <div style={{textAlign:'right',color:'var(--ink-3)',textTransform:'none',letterSpacing:0,fontSize:12.5,fontWeight:500}}>{v.share}</div>
                  <div/><div/><div/>
                </div>
  ```

**Edit 1.7.c** — data row + add flow + margin cells
- old_string:
  ```
                <div key={j} style={{display:'grid',gridTemplateColumns:'minmax(0,1.4fr) minmax(0,1.2fr) 110px 80px 110px',gap:16,padding:'11px 4px',borderBottom:'1px solid var(--line-1)',alignItems:'center',fontSize:13,fontVariantNumeric:'tabular-nums'}}>
                    <div style={{fontWeight:500}}>{r.name}</div>
                    <div style={{color:'var(--ink-2)',fontSize:12.5}}>{r.holdings}</div>
                    <div style={{textAlign:'right'}}>{r.value}</div>
                    <div style={{textAlign:'right'}}>{r.share}</div>
                    <div style={{textAlign:'right'}}><StatusChip status={r.status}/></div>
                  </div>
  ```
- new_string:
  ```
                <div key={j} style={{display:'grid',gridTemplateColumns:'minmax(0,1.3fr) minmax(0,1.0fr) 100px 70px 90px 110px 100px',gap:16,padding:'11px 4px',borderBottom:'1px solid var(--line-1)',alignItems:'center',fontSize:13,fontVariantNumeric:'tabular-nums'}}>
                    <div style={{fontWeight:500}}>{r.name}</div>
                    <div style={{color:'var(--ink-2)',fontSize:12.5}}>{r.holdings}</div>
                    <div style={{textAlign:'right'}}>{r.value}</div>
                    <div style={{textAlign:'right'}}>{r.share}</div>
                    <div style={{textAlign:'right',color: r.flow.startsWith('+') ? 'var(--pos)' : r.flow.startsWith('−') ? 'var(--neg)' : 'var(--ink-3)',fontWeight:500}}>{r.flow}</div>
                    <div style={{textAlign:'right'}}>{r.margin != null ? <MarginBar used={r.margin}/> : <span style={{color:'var(--ink-3)'}}>—</span>}</div>
                    <div style={{textAlign:'right'}}><StatusChip status={r.status}/></div>
                  </div>
  ```

### 1.8 Insert Treasury flows mini-section between Venue breakdown and P&L

**Edit 1.8** — insert before the closing `</section>` of the NAV section (L161). Anchor on the line that follows the closing `</div>` of the venue map.
- old_string:
  ```
          </div>
        </section>

        {/* ========= PROFIT & LOSS ========= */}
  ```
- new_string:
  ```
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
  ```

### 1.9 Add `SegToggle` and `MarginBar` helpers

**Edit 1.9** — anchor on the `function StatusChip` line (around L318) and insert helpers above
- old_string: `function StatusChip({ status }) {`
- new_string:
  ```
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
  ```

### 1.10 Brad's review gate

- [ ] Confirm `mockups/manager-os-nav/index.html` renders cleanly (Spot/Derivatives toggle works, venue table has 7 columns, Treasury flows section visible, P&L shows 8 attribution rows).
- [ ] On approval:
  ```bash
  cd "/Users/brad/Good Behaviour Dropbox/Brad 2025/LOCAL/elysium-design"
  git add mockups/manager-os-nav/views-nav.jsx
  git commit -m "Manager OS: NAV page — ptl-pod feedback (toggle, venue cols, treasury flows, P&L collapse)"
  ```

---

## Task 2 — Treasury & Collateral page (`CollateralView` in `views-other.jsx`)

Read L190–382 once. Note: Treasury section already exists at L261 below Collateral at L216; this task reorders them and adds three things — coverage metrics on Treasury, fee/income columns on Collateral, blended-rate footer.

### 2.1 Rename page header

**Edit 2.1**
- old_string: `<span style={{color:'var(--ink-1)'}}>Collateral & Treasury</span>`
- new_string: `<span style={{color:'var(--ink-1)'}}>Treasury & Collateral</span>`

### 2.2 Reorder: move Treasury section above Collateral section

The Collateral section is L216–259 (`<section style={{marginBottom:56}}>` opening at L216, closing `</section>` at L259). Treasury section is L261–305. After this edit, Treasury must appear first.

**Edit 2.2** — replace the Collateral + Treasury blocks together (single replace; preserves "Upcoming fund flows" L307+ untouched).

Use the existing source verbatim as `old_string`; in `new_string`, the same two `<section>` blocks but Treasury first. The Treasury section gains a coverage metrics card at the bottom, and the Collateral section gains fee/income/net-rate columns + a blended footer row (handled in Edits 2.3–2.5; do those after this reorder).

For this step, do a **pure swap** of section order. Anchor: the opening `<section style={{marginBottom:56}}>` of Collateral and the closing `</section>` of Treasury.

- old_string: starts at L216 with `<section style={{marginBottom:56}}>` (the Collateral section opener) and ends at L305 with the Treasury section closing `</section>`.
- new_string: same two sections but Treasury block placed before Collateral block. Copy the L261–305 block (Treasury) to the top, then the L216–259 block (Collateral) below it. No content changes in this edit — only order.

> **If the Edit tool struggles with such a large block:** do it in two passes — (a) delete the Treasury section from its current position, (b) insert a copy of it before the Collateral section. Anchors for each are unique enough.

### 2.3 Add coverage metrics to Treasury section

After the existing two-column grid in Treasury (the `Free cash position` block + `Next dealing in` block), add a third row of metrics.

**Edit 2.3** — anchor on the closing `</div>` of the two-column grid that ends with "Settlement Mon 8 Feb, 2026" line. The Treasury section's `</section>` closer follows. Insert a metrics row before that `</section>`.

- old_string:
  ```
                <div style={{color:'var(--ink-2)'}}>Settlement</div><div style={{fontVariantNumeric:'tabular-nums'}}>Mon 8 Feb, 2026</div>
              </div>
            </div>
          </div>
        </section>
  ```
- new_string:
  ```
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
  ```

### 2.4 Extend collateral data with fee/income/netRate

**Edit 2.4** — replace the `collateral` array (L193–199)
- old_string:
  ```
    const collateral = [
      { asset:'BTC', venue:'Coinbase Prime', type:'Custody', posted:'$4.1M', util:68 },
      { asset:'ETH', venue:'Copper.co', type:'Clearloop', posted:'$1.6M', util:41 },
      { asset:'USDC', venue:'Binance', type:'Margin', posted:'$2.7M', util:22 },
      { asset:'SOL', venue:'OKX', type:'Perp', posted:'$0.8M', util:57 },
      { asset:'USDT', venue:'Binance', type:'Margin', posted:'$1.2M', util:18 },
    ];
  ```
- new_string:
  ```
    const collateral = [
      { asset:'BTC', venue:'Coinbase Prime', type:'Custody', posted:'$4.1M', util:68, fee: 0.08, income: 0.42, },
      { asset:'ETH', venue:'Copper.co', type:'Clearloop', posted:'$1.6M', util:41, fee: 0.12, income: 0.30, },
      { asset:'USDC', venue:'Binance', type:'Margin', posted:'$2.7M', util:22, fee: 0.18, income: 0.06, },
      { asset:'SOL', venue:'OKX', type:'Perp', posted:'$0.8M', util:57, fee: 0.22, income: 0.00, },
      { asset:'USDT', venue:'Binance', type:'Margin', posted:'$1.2M', util:18, fee: 0.18, income: 0.06, },
    ];
    // Computed blended rates (weighted by posted value): fee 0.13%, income 0.20%, net +0.07%
  ```

### 2.5 Add Fee / Income / Net columns to collateral table

**Edit 2.5.a** — table header (L235–242)
- old_string:
  ```
              <thead>
                <tr style={{fontSize:12,color:'var(--ink-3)',fontWeight:500}}>
                  <th style={th}>Asset</th>
                  <th style={th}>Venue</th>
                  <th style={th}>Account type</th>
                  <th style={th}>Posted</th>
                  <th style={{...th,textAlign:'right'}}>Utilization</th>
                </tr>
              </thead>
  ```
- new_string:
  ```
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
  ```

**Edit 2.5.b** — data rows + extra cells, and add blended footer row
- old_string:
  ```
              <tbody>
                {collateral.map((r,i) => (
                  <tr key={i} data-row>
                    <td style={{...td,fontWeight:500}}>{r.asset}</td>
                    <td style={td}>{r.venue}</td>
                    <td style={td}>{r.type}</td>
                    <td style={td}>{r.posted}</td>
                    <td style={{...td,textAlign:'right'}}>
                      <span style={{display:'inline-flex',fontSize:12,fontWeight:500,color:'var(--green-700)',background:'var(--green-50)',padding:'3px 10px',borderRadius:999}}>{r.util}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
  ```
- new_string:
  ```
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
  ```

### 2.6 Brad's review gate

- [ ] Browser check: page header reads "Treasury & Collateral", Treasury appears above Collateral, coverage metrics row visible, collateral table has 8 columns + blended footer.
- [ ] On approval:
  ```bash
  git add mockups/manager-os-nav/views-other.jsx
  git commit -m "Manager OS: Treasury & Collateral — ptl-pod feedback (reorder, treasury coverage, collateral fee/income blends)"
  ```

---

## Task 3 — Share Register page (`ShareRegisterView` in `views-other.jsx`)

Read L614–900 once. The current order is: header → KPI strip → Share Classes → Full register → Analytics row 1 (Duration profile + Concentration) → Analytics row 2 (Jurisdictions + Entity Type).

Target order per spec: header → Manager+POD holdings → Blended measures → Summary charts (Duration profile + Concentration moved up) → Results delivered → Share Classes → Full register. Analytics row 2 (Jurisdictions + Entity Type) becomes a tail "More analytics" block under the register, OR drops — keep it under the register for now to preserve the data; Brad can drop on review.

The cleanest approach: replace the entire `return (...)` block of `ShareRegisterView`. Keep all consts (rows, classes, holding\*, jurisdictions, entityTypes, concSlices). Replace the kpis array. Insert two new const arrays before the `return`. Replace the JSX top-to-bottom.

### 3.1 Drop KYC health from KPI strip + repurpose strip as "Blended measures"

**Edit 3.1** — replace the `kpis` array (L640–645)
- old_string:
  ```
    // KPI row
    const kpis = [
      { l: 'Total AUM', v: '$150.81 M', s: '+$6.4M' },
      { l: 'Investors', v: '135',       s: '4 this month' },
      { l: 'Free float', v: '62.4%',    s: 'Locked 24.1% · Notice 13.5%' },
      { l: 'KYC health', v: '3',        s: <span style={{color:'var(--neg)'}}>3 active issues</span> },
    ];
  ```
- new_string:
  ```
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

    // Results delivered for investors
    const resultsBuckets = [
      { bucket: '<0%',     book: 4,  dealings: 6  },
      { bucket: '0–10%',   book: 22, dealings: 28 },
      { bucket: '10–25%',  book: 41, dealings: 35 },
      { bucket: '25–50%',  book: 26, dealings: 22 },
      { bucket: '>50%',    book: 7,  dealings: 9  },
    ];
  ```

### 3.2 Switch Holding-period default to "capital"

**Edit 3.2** — useState init at L615
- old_string: `const [holdingBy, setHoldingBy] = _s1('investor');`
- new_string: `const [holdingBy, setHoldingBy] = _s1('capital');`

### 3.3 Restructure JSX — replace the page-render block

The opening `<div style={{padding:'48px 40px 80px',maxWidth:1160,margin:'0 auto'}} data-page>` is at L687. The matching closing `</div>` is at L898. **Replace everything between** the opening and closing of this outer wrapper (i.e., from after `data-page>` on L687 down to the line before `</div>` on L898).

For implementer simplicity, do this as a **single Edit** anchored on the unique opening `<div ... data-page>` line and the unique `</div>\n  );` close.

**Edit 3.3** — replace from page-head opening through the end of "Top Jurisdictions / Entity Type" row.

- old_string: starts at the opening `<div style={{padding:'48px 40px 80px'...data-page>` (L687) and ends at the `</div>` immediately before `);` (L899). Use the entire L687–898 block verbatim.

- new_string: the new structured page below. Note: this re-uses existing helper components (`LockupChip`, `KycChip`, `ConcentrationPie`, `EntityIcon`, `PageBtn`, `Icon.*`, `btnPrimary`, `btnOutline`, `fInput`, `th`, `td`) which are unchanged elsewhere in the file.

```jsx
    <div style={{padding:'48px 40px 80px',maxWidth:1160,margin:'0 auto'}} data-page>
      {/* ===== Head ===== */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:24,marginBottom:32}}>
        <div style={{display:'flex',alignItems:'center',gap:8,fontSize:14,color:'var(--ink-2)'}}>
          <span style={{width:18,height:18,borderRadius:'50%',background:'linear-gradient(135deg,#D9C9EC,#BBA3DC)',boxShadow:'0 0 0 1px var(--line-2)'}}/>
          <span>POD Crypto Fund</span>
          <Icon.chevron style={{width:13,height:13,color:'var(--ink-3)'}}/>
          <span style={{color:'var(--ink-1)',fontWeight:500}}>Share Register</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
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
            <div style={{width:'24.1%',background:'#3F7E58',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600}}>24.1%</div>
            <div style={{width:'13.5%',background:'#A8D0B4',color:'#1C4A34',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600}}>13.5%</div>
            <div style={{flex:1,background:'#E8F2EC',color:'#2E6B46',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600}}>62.4%</div>
          </div>
          <div style={{display:'flex',gap:18,marginTop:12,fontSize:12,color:'var(--ink-2)'}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:6}}><span style={{width:8,height:8,borderRadius:'50%',background:'#3F7E58'}}/> Available · 24.1%</span>
            <span style={{display:'inline-flex',alignItems:'center',gap:6}}><span style={{width:8,height:8,borderRadius:'50%',background:'#A8D0B4'}}/> In notice · 13.5%</span>
            <span style={{display:'inline-flex',alignItems:'center',gap:6}}><span style={{width:8,height:8,borderRadius:'50%',background:'#BFD8B6'}}/> Locked · 62.4%</span>
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
                    <div style={{width:`${h.pct * 2}%`,maxWidth:'100%',height:'100%',background:'#3F7E58',borderRadius:3,transition:'width 0.6s cubic-bezier(0.22,1,0.36,1)'}}/>
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
      <div style={{fontSize:15,fontWeight:600,marginBottom:14}}>Results delivered for investors</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:32,marginBottom:48}}>
        <ResultsBars title="% of book by return threshold" data={resultsBuckets} field="book"/>
        <ResultsBars title="% of dealings by return threshold" data={resultsBuckets} field="dealings"/>
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

      <div style={{border:'1px solid var(--line-1)',borderRadius:10,overflow:'hidden'}}>
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
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:28,height:28,borderRadius:'50%',background:palette[i%palette.length],color:'#fff',display:'inline-flex',alignItems:'center',justifyContent:'center',fontWeight:600,fontSize:10.5,letterSpacing:'0.01em'}}>{r.name.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase()}</div>
                    <div>
                      <div style={{fontWeight:500,color:'var(--ink-1)'}}>{r.name}</div>
                      <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>{r.loc}</div>
                    </div>
                  </div>
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
```

### 3.4 Add `ResultsBars` helper

**Edit 3.4** — anchor on the existing `function PageBtn` line (around L902) and insert above
- old_string: `function PageBtn({ children, active }) {`
- new_string:
  ```
  function ResultsBars({ title, data, field }) {
    const max = Math.max(...data.map(d => d[field]));
    return (
      <div>
        <div style={{fontSize:13,color:'var(--ink-2)',fontWeight:500,marginBottom:14}}>{title}</div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {data.map(d => (
            <div key={d.bucket} style={{display:'grid',gridTemplateColumns:'70px 1fr 44px',gap:12,alignItems:'center',fontSize:12,fontVariantNumeric:'tabular-nums'}}>
              <div style={{color:'var(--ink-2)'}}>{d.bucket}</div>
              <div style={{height:8,background:'var(--bg-subtle)',borderRadius:4,overflow:'hidden'}}>
                <div style={{width:`${(d[field]/max)*100}%`,height:'100%',background: d.bucket.startsWith('<') ? 'var(--neg)' : '#3F7E58',borderRadius:4}}/>
              </div>
              <span style={{textAlign:'right',fontWeight:500}}>{d[field]}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function PageBtn({ children, active }) {
  ```

### 3.5 Brad's review gate

- [ ] Browser check: top-down order is Manager+POD holdings → Blended measures (4 cards, no KYC health) → Duration profile + Concentration → Results delivered (two bar charts) → Share Classes → Full register → Jurisdictions/Entity tail.
- [ ] On approval:
  ```bash
  git add mockups/manager-os-nav/views-other.jsx
  git commit -m "Manager OS: Share Register restructure — ptl-pod feedback (manager+POD holdings, blended measures, results delivered, drop KYC health)"
  ```

---

## Task 4 — Economics page (`views-economics.jsx`)

Read the file once. Current structure: header → KPI strip → Section 1 "Fees earned" (timeline + Available-for-withdrawal + Invested-in-fund) → Section 2 "Expenses paid" (Custody fees).

ptl-pod's split:
- (a) **Fees earned** = manager PnL with payables (custody fees) shown against it
- (b) **Returns generated** = from monies the manager invested in the fund, with locked/available breakdown

Mapping: keep "Fees earned" section, add a payables sub-card showing custody fees as offsets, drop the standalone "Expenses paid" section. Move "Invested in the fund" sub-card under a new section "Returns generated".

### 4.1 Add `econUnit` state + `aum` const

**Edit 4.1** — anchor on the `range` useState (L5)
- old_string: `  const [range, setRange] = _e1('ytd'); // mtd | qtd | ytd | itd`
- new_string:
  ```
    const [range, setRange] = _e1('ytd'); // mtd | qtd | ytd | itd
    const [econUnit, setEconUnit] = _e1('dollar'); // dollar | percent
    const aum = 47460000; // POD Crypto Fund NAV
    const fmtPct = (dollar) => ((dollar / aum) * 100).toFixed(2) + '%';
  ```

### 4.2 Add $ / % toggle in header right cluster

**Edit 4.2** — insert toggle next to the existing range toggle. Anchor on the `<button aria-label="More"` line.
- old_string:
  ```
            ))}
          </div>
          <button aria-label="More" style={{width:32,height:32,border:'1px solid var(--line-2)',background:'var(--bg-canvas)',borderRadius:8,cursor:'pointer',color:'var(--ink-2)',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
  ```
- new_string:
  ```
            ))}
          </div>
          <div style={{display:'inline-flex',padding:3,background:'var(--bg-subtle)',borderRadius:8}}>
            {[{v:'dollar',l:'$'},{v:'percent',l:'%'}].map(o => (
              <button key={o.v} onClick={()=>setEconUnit(o.v)} style={{
                border:'none',cursor:'pointer',padding:'6px 12px',borderRadius:6,
                fontSize:12,fontWeight:500,fontFamily:'inherit',
                background: econUnit===o.v?'var(--bg-canvas)':'transparent',
                color: econUnit===o.v?'var(--ink-1)':'var(--ink-2)',
                boxShadow: econUnit===o.v?'0 1px 2px rgba(0,0,0,0.06)':'none',
              }}>{o.l}</button>
            ))}
          </div>
          <button aria-label="More" style={{width:32,height:32,border:'1px solid var(--line-2)',background:'var(--bg-canvas)',borderRadius:8,cursor:'pointer',color:'var(--ink-2)',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
  ```

### 4.3 Update KPI strip values to react to `econUnit`

**Edit 4.3** — replace the four `KpiCard` instances
- old_string:
  ```
        <KpiCard l="Fees earned · YTD"      v="$844,200"  s={<><span style={{color:'var(--pos)',fontWeight:500}}>+12.4%</span> vs. prior YTD</>}/>
        <KpiCard l="Available for withdrawal" v="$118,400" s="Swept to Operating monthly"/>
        <KpiCard l="Invested in the fund"   v="$711,763"  s="Re-invested · 4,823 units across A/I"/>
        <KpiCard l="Expenses · YTD"         v="$117,720"  s="Custody fees across 4 venues" neg/>
  ```
- new_string:
  ```
        <KpiCard l="Fees earned · YTD"      v={econUnit==='dollar' ? '$844,200' : fmtPct(844200) + ' of AUM'}  s={<><span style={{color:'var(--pos)',fontWeight:500}}>+12.4%</span> vs. prior YTD</>}/>
        <KpiCard l="Available for withdrawal" v={econUnit==='dollar' ? '$118,400' : fmtPct(118400) + ' of AUM'} s="Swept to Operating monthly"/>
        <KpiCard l="Invested in the fund"   v={econUnit==='dollar' ? '$711,763' : fmtPct(711763) + ' of AUM'}  s="Re-invested · 4,823 units across A/I"/>
        <KpiCard l="Expenses · YTD"         v={econUnit==='dollar' ? '$117,720' : fmtPct(117720) + ' of AUM'}  s="Custody fees across 4 venues" neg/>
  ```

### 4.4 Restructure Fees earned section + drop standalone Expenses

The current structure has Section 1 "Fees earned" (with sub a + sub b) and Section 2 "Expenses paid".
Target: Section 1 "Fees earned" (timeline + Available-for-withdrawal + custody-fee payables → net manager P&L), Section 2 "Returns generated" (Invested-in-fund moved here, gains a returns line).

**Edit 4.4** — replace from the end of the KPI strip's closing `</div>` through the Custody-fees `</SubCard>`. Specifically replace L83–201 (the entire body from "Section 1" through end of Section 2).

- old_string: starts at `      {/* ===== 1. Fees earned ===== */}` (L84) and ends at the `</SubCard>` that closes Custody fees (around L201, the line `      </SubCard>`).

- new_string:

```jsx
      {/* ===== 1. Fees earned (manager PnL with payables shown) ===== */}
      <SectionHeadE n="1" title="Fees earned" desc="Management and performance fees accrued to the manager. Payables (custody, vendor costs) are offset to compute net manager P&L."/>

      {/* Timeline chart */}
      <div style={{background:'var(--bg-card)',border:'1px solid var(--line-1)',borderRadius:12,padding:'20px 24px',marginBottom:32}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div>
            <div style={{fontSize:13,fontWeight:500,color:'var(--ink-2)'}}>Fees earned, monthly</div>
            <div style={{fontSize:22,fontWeight:600,letterSpacing:'-0.01em',fontVariantNumeric:'tabular-nums',marginTop:4}}>{econUnit==='dollar' ? '$82.6K' : fmtPct(82600)} <span style={{fontSize:13,fontWeight:400,color:'var(--ink-3)'}}>· April</span></div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:14,fontSize:11.5,color:'var(--ink-2)'}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:6}}><span style={{width:10,height:10,borderRadius:2,background:'#3F7E58'}}/> Management</span>
            <span style={{display:'inline-flex',alignItems:'center',gap:6}}><span style={{width:10,height:10,borderRadius:2,background:'#9BC3A5'}}/> Performance</span>
          </div>
        </div>
        <FeeBars data={series}/>
      </div>

      {/* a. Cash withdrawals + b. Payables (custody fees) → net manager P&L */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
        <SubCard
          label="a."
          title="Available for withdrawal"
          amount={econUnit==='dollar' ? '$118,400' : fmtPct(118400)}
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
          label="b."
          title="Payables (custody fees)"
          amount={econUnit==='dollar' ? '−$117,720' : '−' + fmtPct(117720)}
          sub="Charged against manager fees · paid monthly from Operating"
          action="Reconcile invoices"
        >
          <table style={{width:'100%',borderCollapse:'collapse',fontVariantNumeric:'tabular-nums',marginTop:4}}>
            <thead>
              <tr style={{fontSize:10.5,color:'var(--ink-3)',fontWeight:500,textAlign:'left'}}>
                <th style={{padding:'0 0 8px 0',fontWeight:500}}>Venue</th>
                <th style={{padding:'0 0 8px 0',fontWeight:500,textAlign:'right'}}>Rate</th>
                <th style={{padding:'0 0 8px 0',fontWeight:500,textAlign:'right'}}>YTD fee</th>
              </tr>
            </thead>
            <tbody>
              {custody.map((c,i) => (
                <tr key={i} style={{fontSize:12.5,borderTop:'1px solid var(--line-1)'}}>
                  <td style={{padding:'10px 0',fontWeight:500}}>{c.venue}</td>
                  <td style={{padding:'10px 0',textAlign:'right',color:'var(--ink-2)'}}>{c.bps === 0 ? '—' : `${c.bps} bps`}</td>
                  <td style={{padding:'10px 0',textAlign:'right',fontWeight:500,color:c.ytd==='—'?'var(--ink-3)':'var(--neg)'}}>{c.ytd==='—' ? '—' : '−' + c.ytd.replace('$','$')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SubCard>
      </div>

      {/* Net manager P&L summary */}
      <div style={{background:'var(--bg-subtle)',border:'1px solid var(--line-1)',borderRadius:10,padding:'14px 20px',marginBottom:48,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:11,color:'var(--ink-2)',fontWeight:500}}>Net manager P&L · YTD</div>
          <div style={{fontSize:11.5,color:'var(--ink-3)',marginTop:2}}>Fees earned ($844,200) − Payables ($117,720)</div>
        </div>
        <div style={{fontSize:22,fontWeight:600,fontVariantNumeric:'tabular-nums',color:'var(--pos)',letterSpacing:'-0.01em'}}>{econUnit==='dollar' ? '+$726,480' : '+' + fmtPct(726480)}</div>
      </div>

      {/* ===== 2. Returns generated (manager's invested fees) ===== */}
      <SectionHeadE n="2" title="Returns generated" desc="Returns on manager fees that were re-subscribed to the fund (invested alongside LPs). These compound with NAV and are separate from cash fee earnings."/>

      <SubCard
        label="a."
        title="Invested in the fund"
        amount={econUnit==='dollar' ? '$711,763' : fmtPct(711763)}
        sub="Manager fees re-subscribed to the fund. Locked, compounds with NAV."
        action="New re-investment"
      >
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14,padding:'12px 14px',background:'var(--bg-subtle)',borderRadius:8}}>
          <div>
            <div style={{fontSize:11,color:'var(--ink-2)',fontWeight:500,marginBottom:4}}>Returns earned (since first re-investment)</div>
            <div style={{fontSize:18,fontWeight:600,fontVariantNumeric:'tabular-nums',color:'var(--pos)'}}>{econUnit==='dollar' ? '+$57,640' : '+' + fmtPct(57640)}</div>
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--ink-2)',fontWeight:500,marginBottom:4}}>Status</div>
            <div style={{fontSize:13,fontWeight:500,color:'var(--ink-1)'}}>100% locked · 0% available</div>
            <div style={{fontSize:11.5,color:'var(--ink-3)',marginTop:2}}>Earliest tranche unlocks Jan 2027</div>
          </div>
        </div>
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
```

### 4.5 Brad's review gate

- [ ] Browser check: $/% toggle works on KPI strip + headline numbers; Section 1 has Available + Payables side-by-side and a "Net manager P&L" summary; Section 2 "Returns generated" contains "Invested in the fund" with returns + locked/available status.
- [ ] On approval:
  ```bash
  git add mockups/manager-os-nav/views-economics.jsx
  git commit -m "Manager OS: Economics — ptl-pod feedback (\$/% toggle, fees-earned vs returns-generated split)"
  ```

---

## Task 5 — Push to remote

- [ ] After all four pages approved + committed:
  ```bash
  git push origin main
  ```
- [ ] Verify https://raw.githack.com/bradca1n/elysium-design/main/mockups/manager-os-nav/index.html updates (~30s).

---

## Out of scope
- Distribution / Benchmarking pages (v2)
- Figma file (mockup-only)
- Spot/Derivatives final design (placeholder only)
- Balance Sheet items (deferred per ptl-pod)
