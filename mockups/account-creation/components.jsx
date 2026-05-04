/* Shared components for the Account Creation mockup */

function SplitScreen({ left, right, brandTagline }) {
  return (
    <div data-page style={{display:'grid',gridTemplateColumns:'1fr 1fr',minHeight:'100vh',width:'100%',maxWidth:1440,margin:'0 auto'}}>
      <div style={{padding:'56px 80px 80px',display:'flex',flexDirection:'column',background:'var(--bg-canvas)',minWidth:0}}>
        {left}
      </div>
      <div style={{background:'var(--bg-brand)',color:'var(--on-brand)',padding:'56px 80px 80px',display:'flex',flexDirection:'column',justifyContent:'space-between',position:'relative',overflow:'hidden'}}>
        <BrandMark/>
        {right || <BrandTagline text={brandTagline || 'Onboard your fund in minutes, not weeks.'}/>}
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,fontSize:14,fontWeight:500,color:'var(--on-brand-2)'}}>
      <span style={{width:22,height:22,borderRadius:'50%',background:'linear-gradient(135deg,#D9C9EC,#BBA3DC)',boxShadow:'0 0 0 1px rgba(255,255,255,0.08)'}}/>
      <span style={{color:'var(--on-brand)'}}>POD</span>
    </div>
  );
}

function BrandTagline({ text }) {
  return (
    <div style={{fontFamily:'\"Tiempos Headline\", \"Times New Roman\", serif',fontWeight:300,fontSize:36,lineHeight:1.15,letterSpacing:'-0.01em',maxWidth:520}}>
      {text}
    </div>
  );
}

function PageHead({ title, subtitle }) {
  return (
    <div style={{marginBottom:32}}>
      <BackBtn/>
      <h1 style={{fontFamily:'\"Tiempos Headline\", \"Times New Roman\", serif',fontWeight:300,fontSize:36,lineHeight:1.15,letterSpacing:'-0.01em',color:'var(--ink-1)',margin:'24px 0 12px'}}>{title}</h1>
      {subtitle && <p style={{fontSize:15,color:'var(--ink-2)',margin:0,maxWidth:480}}>{subtitle}</p>}
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Back" style={{
      width:36,height:36,borderRadius:'50%',
      border:'1px solid var(--line-2)',background:'var(--bg-card)',
      display:'inline-flex',alignItems:'center',justifyContent:'center',
      color:'var(--ink-1)',fontSize:14,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
    </button>
  );
}

function Stepper({ steps, current }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:24}}>
      {steps.map((_, i) => (
        <span key={i} style={{
          flex:1,height:3,borderRadius:2,
          background: i <= current ? 'var(--ink-1)' : 'var(--line-2)',
          transition:'background 0.2s',
        }}/>
      ))}
      <span style={{marginLeft:8,fontSize:11.5,color:'var(--ink-3)',fontWeight:500,fontVariantNumeric:'tabular-nums'}}>{current + 1} / {steps.length}</span>
    </div>
  );
}

function FormControl({ label, helper, error, children }) {
  return (
    <div style={{marginBottom:16,minWidth:0}}>
      {label && <label style={{display:'block',fontSize:12,color:'var(--ink-2)',fontWeight:500,marginBottom:6}}>{label}</label>}
      {children}
      {(helper || error) && <div style={{fontSize:11.5,color: error ? 'var(--neg)' : 'var(--ink-3)',marginTop:6}}>{error || helper}</div>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type, prefix }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{
      display:'flex',alignItems:'center',
      height:44,padding:'0 14px',
      border:`1px solid ${focused ? 'var(--ink-1)' : 'var(--line-2)'}`,
      borderRadius:8,background:'var(--bg-card)',
      transition:'border-color 0.15s',
    }}>
      {prefix && <span style={{fontSize:15,color:'var(--ink-1)',marginRight:8,whiteSpace:'nowrap'}}>{prefix}</span>}
      <input
        type={type || 'text'}
        value={value || ''}
        onChange={onChange ? (e=>onChange(e.target.value)) : undefined}
        onFocus={()=>setFocused(true)}
        onBlur={()=>setFocused(false)}
        placeholder={placeholder}
        style={{flex:1,border:'none',outline:'none',fontSize:15,color:'var(--ink-1)',background:'transparent',minWidth:0}}
      />
    </div>
  );
}

function Select({ value, onChange, placeholder, options }) {
  return (
    <div style={{position:'relative'}}>
      <select
        value={value || ''}
        onChange={onChange ? (e=>onChange(e.target.value)) : undefined}
        style={{
          width:'100%',height:44,padding:'0 36px 0 14px',
          border:'1px solid var(--line-2)',borderRadius:8,background:'var(--bg-card)',
          fontSize:15,color: value ? 'var(--ink-1)' : 'var(--ink-3)',appearance:'none',cursor:'pointer',
        }}>
        <option value="" disabled>{placeholder || 'Select'}</option>
        {(options || []).map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
      </select>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',color:'var(--ink-3)',pointerEvents:'none'}}><path d="M3 4.5 6 7.5 9 4.5"/></svg>
    </div>
  );
}

function OtpInput({ length, value }) {
  const digits = (value || '').padEnd(length, ' ').slice(0, length).split('');
  return (
    <div style={{display:'flex',gap:10}}>
      {digits.map((d, i) => (
        <div key={i} style={{
          width:54,height:62,
          border:`1px solid ${d.trim() ? 'var(--ink-1)' : 'var(--line-2)'}`,
          borderRadius:10,background:'var(--bg-card)',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:24,fontWeight:500,color:'var(--ink-1)',fontVariantNumeric:'tabular-nums',
        }}>{d.trim() || ''}</div>
      ))}
    </div>
  );
}

function Button({ variant, onClick, children, full, size }) {
  const base = {
    display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,
    height: size === 'sm' ? 36 : 48,
    padding: size === 'sm' ? '0 16px' : '0 24px',
    borderRadius: 10,
    fontSize: size === 'sm' ? 14 : 15, fontWeight: 500,
    border: 'none', cursor: 'pointer',
    width: full ? '100%' : 'auto',
    fontFamily: 'inherit',
    transition: 'background 0.15s, color 0.15s',
  };
  const styles = {
    primary:   { ...base, background:'var(--ink-1)', color:'var(--bg-canvas)' },
    secondary: { ...base, background:'var(--bg-card)', color:'var(--ink-1)', border:'1px solid var(--line-2)' },
    ghost:     { ...base, background:'transparent', color:'var(--ink-1)' },
    text:      { ...base, background:'transparent', color:'var(--ink-1)', textDecoration:'underline', height:'auto', padding:0 },
  };
  return <button onClick={onClick} style={styles[variant || 'primary']}>{children}</button>;
}

function ActionRow({ icon, title, body, onClick, selected }) {
  return (
    <button onClick={onClick} style={{
      display:'flex',alignItems:'flex-start',gap:14,
      width:'100%',padding:'18px 20px',
      border:`1px solid ${selected ? 'var(--ink-1)' : 'var(--line-2)'}`,
      borderRadius:12,background:selected ? 'var(--bg-card)' : 'var(--bg-card)',
      cursor:'pointer',textAlign:'left',
      boxShadow: selected ? '0 0 0 3px rgba(20,19,15,0.08)' : 'none',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}>
      {icon && <div style={{flexShrink:0,width:36,height:36,borderRadius:10,background:'var(--bg-subtle)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--ink-1)',fontSize:18}}>{icon}</div>}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:15,fontWeight:500,color:'var(--ink-1)',marginBottom:4}}>{title}</div>
        {body && <div style={{fontSize:12.5,color:'var(--ink-2)',lineHeight:1.5}}>{body}</div>}
      </div>
    </button>
  );
}

function Disclosure({ children }) {
  return <div style={{fontSize:11.5,color:'var(--ink-3)',lineHeight:1.55,marginTop:24,maxWidth:480}}>{children}</div>;
}

function FooterLink({ children, onClick }) {
  return (
    <div style={{fontSize:13.5,color:'var(--ink-2)',marginTop:20}}>
      {children} <a onClick={onClick} style={{color:'var(--ink-1)',fontWeight:500,cursor:'pointer'}}>Log in</a>
    </div>
  );
}

Object.assign(window, { SplitScreen, BrandTagline, BrandMark, PageHead, BackBtn, Stepper, FormControl, TextInput, Select, OtpInput, Button, ActionRow, Disclosure, FooterLink });
