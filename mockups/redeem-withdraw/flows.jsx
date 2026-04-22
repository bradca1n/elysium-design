// Flow screens for Redeem & Withdraw wireframes
// Each variation is a function that returns a <Column> of phones connected by arrows.

// ════════════════════════════════════════════════════════════
// REDEEM FLOWS
// ════════════════════════════════════════════════════════════

// ─── V1: Classic linear Redeem flow ───
function RedeemV1({ edge }) {
  return (
    <FlowColumn>
      <SectionTag color="#fecaca">REDEEM — Classic linear (OTP)</SectionTag>

      <PhoneRow>
        <Phone title="Holdings" label="Entry: portfolio screen">
          <Hand style={{ fontSize: 14, marginBottom: 8 }}>Your funds</Hand>
          <Rect><b>Alpha Growth Fund</b><br/><Mono>$12,480 · +4.2%</Mono></Rect>
          <Rect tone="primary" style={{ background: '#f3f3f3' }}><b>Beta Income Fund</b> ← tap<br/><Mono>$8,220 · +1.8%</Mono></Rect>
          <Rect><b>Gamma Balanced</b><br/><Mono>$3,110 · -0.4%</Mono></Rect>
          <Rect><b>Delta Bond Fund</b><br/><Mono>$5,900 · +2.1%</Mono></Rect>
        </Phone>

        <Arrow dir="right" length={32}/>

        <Phone title="Beta Income" label="Fund detail → Redeem">
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <Hand style={{ fontSize: 22, fontWeight: 700 }}>$8,220.00</Hand>
            <Mono>412.03 units · NAV $19.95</Mono>
          </div>
          <Rect tone="muted" style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mono>[ price chart ]</Mono>
          </Rect>
          <Row label="Return" value="+1.8%"/>
          <Row label="Invested" value="$8,075"/>
          <Row label="Next NAV" value="6:00 PM"/>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <Btn>Redeem</Btn>
            <Btn tone="ghost">Buy more</Btn>
          </div>
        </Phone>

        <Arrow dir="right" length={32}/>

        <Phone title="Amount" label={edge ? 'Amount — cutoff warning' : 'Enter cash amount'} tone={edge ? 'edge' : 'neutral'}>
          <Hand style={{ fontSize: 12, color: INK3, marginBottom: 4 }}>You want to redeem</Hand>
          <div style={{ textAlign: 'center', padding: '12px 0', borderBottom: `2px solid ${INK}` }}>
            <Hand style={{ fontSize: 32, fontWeight: 700 }}>$2,000</Hand>
          </div>
          <Mono style={{ textAlign: 'center', marginTop: 6 }}>≈ 100.25 units</Mono>
          <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
            {['25%', '50%', '75%', 'All'].map(p => (
              <Rect key={p} style={{ flex: 1, textAlign: 'center', marginBottom: 0, padding: 6, fontSize: 11 }}>{p}</Rect>
            ))}
          </div>
          <Mono style={{ marginTop: 10 }}>Available: $8,220 · 412.03 units</Mono>
          {edge && (
            <Rect tone="edge" style={{ marginTop: 10 }}>
              <Hand style={{ fontSize: 13, color: FLAG }}>⚠ Market cut-off 3:00 PM</Hand>
              <Mono>Orders after cut-off use tomorrow's NAV</Mono>
            </Rect>
          )}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <Btn>Review redemption</Btn>
          </div>
        </Phone>
      </PhoneRow>

      <Arrow dir="down" length={36}/>

      <PhoneRow>
        <Phone title="Review" label="Review — fees, NAV, settlement" tone={edge ? 'edge' : 'neutral'}>
          <Hand style={{ fontSize: 12, color: INK3 }}>Beta Income Fund</Hand>
          <Hand style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Redeem $2,000</Hand>
          <Row label="Units redeemed" value="~100.25"/>
          <Row label="NAV used" value="$19.95 (indicative)"/>
          <Row label="Exit load" value={edge ? '-$42.00 (2%)' : '—'} tone={edge ? 'edge' : 'muted'}/>
          <Row label="Tax withheld" value="-$14.80"/>
          <Row label="Estimated proceeds" value={edge ? '$1,943.20' : '$1,985.20'}/>
          <Row label="Settlement" value="T+2 · Apr 24"/>
          <Row label="To wallet" value="Cash balance"/>
          <Mono style={{ marginTop: 8, fontSize: 9 }}>* Price may vary. Final NAV set at 6:00 PM.</Mono>
          {edge && (
            <Rect tone="edge" style={{ marginTop: 6 }}>
              <Hand style={{ fontSize: 12, color: FLAG }}>Lock-up until May 4</Hand>
              <Mono>2% early exit load applies</Mono>
            </Rect>
          )}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <Btn>Confirm & get code</Btn>
            <Btn tone="ghost">Edit</Btn>
          </div>
        </Phone>

        <Arrow dir="right" length={32}/>

        <Phone title="Verify" label="OTP — 6 digits to phone">
          <Hand style={{ fontSize: 13, marginBottom: 4 }}>Enter the code</Hand>
          <Mono style={{ marginBottom: 16 }}>Sent to ••• 4421</Mono>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
            {['4', '8', '2', '—', '—', '—'].map((d, i) => (
              <div key={i} style={{
                width: 28, height: 36, border: `2px solid ${i < 3 ? INK : '#ccc'}`,
                borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Inter, sans-serif', fontSize: 20, fontWeight: 700,
                color: i < 3 ? INK : INK3,
              }}>{d}</div>
            ))}
          </div>
          <Mono style={{ textAlign: 'center' }}>Resend in 0:24</Mono>
          <Rect tone="muted" style={{ marginTop: 20, fontSize: 11 }}>
            <Mono>[ numeric keypad ]</Mono>
          </Rect>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <Btn>Verify & redeem</Btn>
          </div>
        </Phone>

        <Arrow dir="right" length={32}/>

        <Phone title="" label={edge ? 'Pending — insufficient units' : 'Success → pending settlement'} tone={edge ? 'edge' : 'success'}>
          <div style={{ paddingTop: 30, textAlign: 'center' }}>
            <Circle tone={edge ? 'edge' : 'success'} size={50}>{edge ? '!' : '✓'}</Circle>
            <Hand style={{ fontSize: 20, fontWeight: 700, marginTop: 12 }}>
              {edge ? 'Partial redemption' : 'Redemption placed'}
            </Hand>
            <Mono style={{ marginTop: 6, lineHeight: 1.5 }}>
              {edge
                ? 'Only 100.25 of 412.03 units available. $1,943 will settle T+2. Remainder in 3 days.'
                : 'Units locked. Funds land in your cash wallet on Apr 24 (T+2).'}
            </Mono>
            <Rect tone="muted" style={{ marginTop: 16, textAlign: 'left' }}>
              <Mono>REF: RDM-00A42K</Mono>
              <Row label="Amount" value="$2,000"/>
              <Row label="Settles" value="Apr 24"/>
              <Row label="Status" value={edge ? 'Partial' : 'Processing'}/>
            </Rect>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <Btn>Track in activity</Btn>
            <Btn tone="ghost">Done</Btn>
          </div>
        </Phone>
      </PhoneRow>
    </FlowColumn>
  );
}

// ─── V2: Compact single-sheet Redeem ───
function RedeemV2({ edge }) {
  return (
    <FlowColumn>
      <SectionTag color="#fecaca">REDEEM — Compact sheet (amount + review in one)</SectionTag>
      <PhoneRow>
        <Phone title="Holdings" label="1. Tap fund" >
          <Rect><b>Alpha Growth</b><Mono>$12,480</Mono></Rect>
          <Rect tone="primary" style={{ background: '#f3f3f3' }}><b>Beta Income ← tap</b><Mono>$8,220</Mono></Rect>
          <Rect><b>Gamma Balanced</b><Mono>$3,110</Mono></Rect>
          <Rect><b>Delta Bond</b><Mono>$5,900</Mono></Rect>
        </Phone>

        <Arrow dir="right" length={32}/>

        <Phone title="Redeem" label="One-sheet: amount, live preview, fees" tone={edge ? 'edge' : 'neutral'}>
          <Mono>Beta Income · Available $8,220</Mono>
          <div style={{ textAlign: 'center', padding: '10px 0', borderBottom: `2px solid ${INK}`, marginBottom: 6 }}>
            <Hand style={{ fontSize: 28, fontWeight: 700 }}>$2,000</Hand>
          </div>
          <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
            {['25', '50', '75', 'Max'].map(p => (
              <Rect key={p} style={{ flex: 1, textAlign: 'center', marginBottom: 0, padding: 5, fontSize: 10 }}>{p}{p !== 'Max' && '%'}</Rect>
            ))}
          </div>

          <Hand style={{ fontSize: 12, marginTop: 8, marginBottom: 4 }}>Preview</Hand>
          <Row label="Units" value="~100.25"/>
          <Row label="NAV" value="$19.95 *"/>
          <Row label="Exit load" value={edge ? '-$42' : '—'} tone={edge ? 'edge' : 'muted'}/>
          <Row label="Tax" value="-$14.80"/>
          <Row label="You get" value={edge ? '$1,943' : '$1,985'}/>
          <Row label="Settles" value="T+2 · Apr 24"/>
          <Mono style={{ fontSize: 9, marginTop: 4 }}>* Indicative NAV; locks at 6 PM.</Mono>

          {edge && (
            <Rect tone="edge" style={{ marginTop: 6, padding: 6 }}>
              <Mono style={{ color: FLAG, fontSize: 10 }}>⚠ Lock-up · 2% exit load</Mono>
            </Rect>
          )}

          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <Btn>Redeem → send OTP</Btn>
          </div>
        </Phone>

        <Arrow dir="right" length={32}/>

        <Phone title="Confirm" label="OTP slide-up sheet">
          {/* dimmed review skeleton behind — real-looking content */}
          <div style={{ opacity: 0.35, pointerEvents: 'none' }}>
            <Hand style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 2 }}>$1,985</Hand>
            <Mono style={{ textAlign: 'center', marginBottom: 10 }}>Beta Income Fund</Mono>
            <Row label="Units" value="18.842"/>
            <Row label="NAV" value="$105.11"/>
            <Row label="Fee" value="-$2.50"/>
            <Row label="Settles" value="Apr 24"/>
            <Row label="Lock-up" value="none"/>
            <Row label="Net" value="$1,982.50"/>
          </div>
          {/* scrim covers the dimmed content area only (stops above the sheet) */}
          <div style={{
            position: 'absolute', left: -14, right: -14, top: -14, bottom: 184,
            background: 'rgba(30,30,30,0.28)',
            pointerEvents: 'none',
          }}/>
          {/* bottom sheet — compact, sits ~35% of frame */}
          <div style={{
            position: 'absolute', left: -14, right: -14, bottom: 0,
            border: `2px solid ${INK}`,
            borderBottom: 'none',
            borderRadius: '18px 18px 0 0',
            background: '#fff',
            padding: '8px 14px 10px',
          }}>
            <div style={{
              width: 32, height: 3, borderRadius: 2, background: '#c8c8c8',
              margin: '0 auto 6px',
            }}/>
            <Hand style={{ fontSize: 13, fontWeight: 700, textAlign: 'center', marginBottom: 0 }}>Enter code</Hand>
            <Mono style={{ textAlign: 'center', marginBottom: 8 }}>••• 4421</Mono>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8, justifyContent: 'center' }}>
              {['4', '8', '2', '—', '—', '—'].map((d, i) => (
                <div key={i} style={{
                  width: 24, height: 28, border: `1.5px solid ${i < 3 ? INK : '#ccc'}`,
                  borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700,
                }}>{d}</div>
              ))}
            </div>
            <Btn style={{ marginBottom: 0 }}>Verify</Btn>
          </div>
        </Phone>

        <Arrow dir="right" length={32}/>

        <Phone title="" label={edge ? 'Partial fill result' : 'Success — minimal'} tone={edge ? 'edge' : 'success'}>
          <div style={{ paddingTop: 60, textAlign: 'center' }}>
            <Circle tone={edge ? 'edge' : 'success'} size={44}>{edge ? '!' : '✓'}</Circle>
            <Hand style={{ fontSize: 22, fontWeight: 700, marginTop: 14 }}>
              {edge ? `$1,943 filled` : `$1,985 on the way`}
            </Hand>
            <Mono style={{ marginTop: 6 }}>lands Apr 24 in cash wallet</Mono>
            <Mono style={{ marginTop: 4, fontSize: 9 }}>REF RDM-00A42K</Mono>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <Btn>Done</Btn>
            <Btn tone="ghost">Withdraw to bank</Btn>
          </div>
        </Phone>
      </PhoneRow>
    </FlowColumn>
  );
}

// ════════════════════════════════════════════════════════════
// WITHDRAW FLOWS (multi-sig)
// ════════════════════════════════════════════════════════════

// ─── V3: Classic linear withdraw w/ multi-sig ───
function WithdrawV3({ edge }) {
  return (
    <FlowColumn>
      <SectionTag color="#bae6fd">WITHDRAW — Classic linear + multi-sig approval</SectionTag>
      <PhoneRow>
        <Phone title="Wallet" label="Entry: cash wallet tab">
          <Hand style={{ fontSize: 12, color: INK3 }}>Cash balance</Hand>
          <Hand style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>$14,240.18</Hand>
          <Mono style={{ marginBottom: 10 }}>+$1,985 from Beta Income · Apr 24</Mono>
          <Rect tone="muted" style={{ padding: 8 }}>
            <Mono>Recent</Mono>
            <Mono>· Redeem Beta Income +$1,985</Mono>
            <Mono>· Redeem Alpha Growth +$4,010</Mono>
            <Mono>· Withdraw to HSBC  -$3,000</Mono>
          </Rect>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <Btn>Withdraw</Btn>
            <Btn tone="ghost">Top up</Btn>
          </div>
        </Phone>

        <Arrow dir="right" length={32}/>

        <Phone title="Amount" label="Limit meter visible" tone={edge ? 'edge' : 'neutral'}>
          <Mono>Withdraw from cash wallet</Mono>
          <div style={{ textAlign: 'center', padding: '10px 0', borderBottom: `2px solid ${INK}`, marginTop: 6 }}>
            <Hand style={{ fontSize: 32, fontWeight: 700 }}>{edge ? '$55,000' : '$5,000'}</Hand>
            <Mono>USD</Mono>
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {['25%', '50%', '75%', 'All'].map(p => (
              <Rect key={p} style={{ flex: 1, textAlign: 'center', marginBottom: 0, padding: 6, fontSize: 11 }}>{p}</Rect>
            ))}
          </div>

          <Hand style={{ fontSize: 11, color: INK3, marginTop: 12, marginBottom: 4 }}>Daily limit</Hand>
          <div style={{ position: 'relative', height: 8, background: '#eee', borderRadius: 4, marginBottom: 4 }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: edge ? '100%' : '10%',
              background: edge ? FLAG : INK, borderRadius: 4,
            }}/>
          </div>
          <Mono>{edge ? '$55,000 of $50,000 daily' : '$5,000 of $50,000 daily'}</Mono>

          {edge && (
            <Rect tone="edge" style={{ marginTop: 10 }}>
              <Hand style={{ fontSize: 12, color: FLAG }}>⚠ Exceeds daily limit</Hand>
              <Mono>Raise limit or split into 2 withdrawals</Mono>
            </Rect>
          )}

          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <Btn>Next: destination</Btn>
          </div>
        </Phone>

        <Arrow dir="right" length={32}/>

        <Phone title="Bank" label="Pick linked account">
          <Hand style={{ fontSize: 12, marginBottom: 8 }}>Send to</Hand>
          <Rect tone="primary" style={{ background: '#f3f3f3' }}>
            <b>HSBC Checking ••• 3421</b>
            <Mono>Default · verified</Mono>
          </Rect>
          <Rect>
            <b>Chase Savings ••• 9810</b>
            <Mono>verified</Mono>
          </Rect>
          <Rect dashed tone="muted">
            <Mono>+ Add new bank account</Mono>
          </Rect>
          <Mono style={{ marginTop: 8, fontSize: 9 }}>New accounts need 24h cool-down</Mono>

          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <Btn>Review withdrawal</Btn>
          </div>
        </Phone>
      </PhoneRow>

      <Arrow dir="down" length={36}/>

      <PhoneRow>
        <Phone title="Review" label="Final review before sig request">
          <Hand style={{ fontSize: 12, color: INK3 }}>You're sending</Hand>
          <Hand style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>$5,000.00</Hand>
          <Row label="From" value="Cash wallet"/>
          <Row label="To" value="HSBC ••• 3421"/>
          <Row label="Network fee" value="-$2.50"/>
          <Row label="You receive" value="$4,997.50"/>
          <Row label="Arrives" value="Tomorrow by 5 PM"/>
          <Row label="Remaining" value="$9,240.18"/>

          <Rect tone="muted" style={{ marginTop: 10, padding: 8 }}>
            <Hand style={{ fontSize: 13 }}>🔐 Requires 2-of-3 signatures</Hand>
            <Mono>You + 1 co-signer needed</Mono>
          </Rect>

          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <Btn>Sign & request approval</Btn>
            <Btn tone="ghost">Edit</Btn>
          </div>
        </Phone>

        <Arrow dir="right" length={32} label="sign 1/2"/>

        <Phone title="Multi-sig" label="Awaiting co-signer(s)" tone={edge ? 'edge' : 'neutral'}>
          <div style={{ textAlign: 'center', paddingTop: 8 }}>
            <Hand style={{ fontSize: 18, fontWeight: 700 }}>Awaiting approvals</Hand>
            <Mono>Withdraw $5,000 → HSBC</Mono>
          </div>

          <div style={{ margin: '16px 0' }}>
            <Rect tone="success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><b>You</b> (initiator)<br/><Mono>signed 2:14 PM</Mono></span>
              <Circle tone="success" size={22}>✓</Circle>
            </Rect>
            <Rect style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><b>Sarah K.</b><br/><Mono>notified · pending</Mono></span>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                border: `2px dashed ${INK3}`, margin: 0,
              }}/>
            </Rect>
            <Rect style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6 }}>
              <span><b>Mike P.</b><br/><Mono>backup signer</Mono></span>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                border: `2px dashed #ccc`, margin: 0,
              }}/>
            </Rect>
          </div>

          <Mono style={{ fontSize: 10 }}>Request expires in 23:47:12</Mono>
          {edge && (
            <Rect tone="edge" style={{ marginTop: 6, padding: 6 }}>
              <Mono style={{ color: FLAG, fontSize: 10 }}>✗ Sarah declined — find another signer</Mono>
            </Rect>
          )}

          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <Btn tone="ghost">Nudge signer</Btn>
            <Btn tone="ghost" style={{ fontSize: 13 }}>Cancel request</Btn>
          </div>
        </Phone>

        <Arrow dir="right" length={32} label="nudge"/>

        <Phone title="Multi-sig" label="After tapping 'Nudge signer'" tone={edge ? 'edge' : 'neutral'}>
          {/* toast */}
          <div style={{
            position: 'absolute', top: -6, left: 0, right: 0,
            background: INK, color: '#fff',
            padding: '7px 10px', borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '2px 3px 0 rgba(0,0,0,0.08)',
            zIndex: 2,
          }}>
            <span style={{ fontSize: 12 }}>🔔</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600 }}>
              Reminder sent to Sarah K.
            </span>
          </div>

          <div style={{ textAlign: 'center', paddingTop: 18 }}>
            <Hand style={{ fontSize: 18, fontWeight: 700 }}>Awaiting approvals</Hand>
            <Mono>Withdraw $5,000 → HSBC</Mono>
          </div>

          <div style={{ margin: '16px 0' }}>
            <Rect tone="success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><b>You</b> (initiator)<br/><Mono>signed 2:14 PM</Mono></span>
              <Circle tone="success" size={22}>✓</Circle>
            </Rect>
            <Rect style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><b>Sarah K.</b><br/><Mono>nudged · 2:41 PM</Mono></span>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                border: `2px dashed ${INK3}`, margin: 0,
              }}/>
            </Rect>
            <Rect style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6 }}>
              <span><b>Mike P.</b><br/><Mono>backup signer</Mono></span>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                border: `2px dashed #ccc`, margin: 0,
              }}/>
            </Rect>
          </div>

          <Mono style={{ fontSize: 10 }}>Request expires in 23:47:12</Mono>

          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <Btn tone="ghost" style={{ opacity: 0.4, color: INK3 }}>Nudge again in 0:42</Btn>
            <Btn tone="ghost" style={{ fontSize: 13 }}>Cancel request</Btn>
          </div>
        </Phone>

        <Arrow dir="right" length={32} label="2/2"/>

        <Phone title="" label={edge ? 'Withdrawal failed' : 'Approved → processing'} tone={edge ? 'edge' : 'success'}>
          <div style={{ paddingTop: 30, textAlign: 'center' }}>
            <Circle tone={edge ? 'edge' : 'success'} size={48}>{edge ? '✗' : '✓'}</Circle>
            <Hand style={{ fontSize: 20, fontWeight: 700, marginTop: 10 }}>
              {edge ? 'Withdrawal failed' : 'Approved & sent'}
            </Hand>
            <Mono style={{ marginTop: 6, lineHeight: 1.5 }}>
              {edge
                ? 'Bank rejected transfer. Funds returned to wallet. Check account details.'
                : '$4,997.50 wired to HSBC ••• 3421. Arrives tomorrow by 5 PM.'}
            </Mono>
            <Rect tone="muted" style={{ marginTop: 14, textAlign: 'left', padding: 8 }}>
              <Mono>REF: WDR-00B91P</Mono>
              <Row label="Signed by" value="You, Sarah K."/>
              <Row label="Status" value={edge ? 'Failed — returned' : 'In transit'}/>
            </Rect>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <Btn>{edge ? 'Retry' : 'Track in activity'}</Btn>
            <Btn tone="ghost">Done</Btn>
          </div>
        </Phone>
      </PhoneRow>
    </FlowColumn>
  );
}

// ─── V4: Progress-first Withdraw (status-tracker dominant) ───
function WithdrawV4({ edge }) {
  const steps = [
    { label: 'Initiated', status: 'done', time: '2:14 PM' },
    { label: 'You signed', status: 'done', time: '2:14 PM' },
    { label: edge ? 'Sarah declined' : 'Sarah signed', status: edge ? 'fail' : 'done', time: '2:18 PM' },
    { label: edge ? 'Mike — pending' : 'Bank processing', status: edge ? 'active' : 'active', time: edge ? '—' : '2:19 PM' },
    { label: 'Funds arrive', status: 'todo', time: 'Tomorrow 5 PM' },
  ];

  return (
    <FlowColumn>
      <SectionTag color="#bae6fd">WITHDRAW — Progress-first (tracker dominates pending & success)</SectionTag>
      <PhoneRow>
        <Phone title="Withdraw" label="Compact setup — 1 screen">
          <Hand style={{ fontSize: 12, color: INK3 }}>From cash wallet</Hand>
          <Hand style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>$14,240 available</Hand>

          <Hand style={{ fontSize: 11, color: INK3 }}>Amount</Hand>
          <div style={{ border: `1.5px solid ${INK}`, borderRadius: 6, padding: 10, marginBottom: 8 }}>
            <Hand style={{ fontSize: 22, fontWeight: 700 }}>$5,000</Hand>
          </div>

          <Hand style={{ fontSize: 11, color: INK3 }}>To</Hand>
          <Rect><b>HSBC ••• 3421</b> ▾<Mono>default</Mono></Rect>

          <Row label="Fee" value="-$2.50"/>
          <Row label="You get" value="$4,997.50"/>
          <Row label="Daily limit" value="$5,000 / $50,000"/>

          <Rect tone="muted" style={{ padding: 6, marginTop: 6 }}>
            <Mono style={{ fontSize: 9 }}>🔐 2-of-3 signatures required</Mono>
          </Rect>

          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <Btn>Sign & send</Btn>
          </div>
        </Phone>

        <Arrow dir="right" length={32}/>

        <Phone title="Status" label="Progress-first tracker" tone={edge ? 'edge' : 'neutral'}>
          <Hand style={{ fontSize: 12, color: INK3 }}>Withdrawal</Hand>
          <Hand style={{ fontSize: 20, fontWeight: 700 }}>$5,000 → HSBC</Hand>
          <Mono style={{ marginBottom: 12 }}>REF WDR-00B91P</Mono>

          {/* Vertical tracker */}
          <div style={{ position: 'relative', paddingLeft: 4 }}>
            {steps.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start',
                marginBottom: 12, position: 'relative',
              }}>
                <div style={{ position: 'relative', marginRight: 10 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: `2px solid ${s.status === 'done' ? OK : s.status === 'fail' ? FLAG : s.status === 'active' ? INK : '#ccc'}`,
                    background: s.status === 'done' ? OK : s.status === 'fail' ? FLAG : s.status === 'active' ? '#fff' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700,
                  }}>{s.status === 'done' ? '✓' : s.status === 'fail' ? '✗' : ''}</div>
                  {i < steps.length - 1 && (
                    <div style={{
                      position: 'absolute', top: 18, left: 8, width: 2, height: 18,
                      background: s.status === 'done' ? OK : '#ccc',
                    }}/>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <Hand style={{ fontSize: 13, fontWeight: s.status === 'active' ? 700 : 400 }}>{s.label}</Hand>
                  <Mono style={{ fontSize: 9 }}>{s.time}</Mono>
                </div>
              </div>
            ))}
          </div>

          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <Btn tone="ghost">{edge ? 'Reassign signer' : 'Share receipt'}</Btn>
          </div>
        </Phone>

        <Arrow dir="right" length={32}/>

        <Phone title="" label="Success — proceeds landed" tone="success">
          <div style={{ paddingTop: 24, textAlign: 'center' }}>
            <Circle tone="success" size={48}>✓</Circle>
            <Hand style={{ fontSize: 22, fontWeight: 700, marginTop: 12 }}>$4,997.50 landed</Hand>
            <Mono style={{ marginTop: 4 }}>HSBC Checking ••• 3421</Mono>

            <div style={{
              margin: '18px 0', padding: 10,
              border: `1.5px dashed ${OK}`, borderRadius: 8,
              textAlign: 'left',
            }}>
              <Row label="Signed by" value="You, Sarah K."/>
              <Row label="Sent" value="Apr 22, 2:19 PM"/>
              <Row label="Arrived" value="Apr 23, 11:04 AM"/>
              <Row label="Fee" value="$2.50"/>
            </div>
            <Mono style={{ fontSize: 9 }}>Tap receipt to download PDF</Mono>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <Btn>Done</Btn>
          </div>
        </Phone>
      </PhoneRow>
    </FlowColumn>
  );
}

// ─── Layout helpers ───
function FlowColumn({ children }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'flex-start', marginBottom: 60,
      minWidth: 'max-content',
    }}>{children}</div>
  );
}

function PhoneRow({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      gap: 0, marginTop: 16,
    }}>{children}</div>
  );
}

Object.assign(window, {
  RedeemV1, RedeemV2, WithdrawV3, WithdrawV4,
  FlowColumn, PhoneRow,
});
