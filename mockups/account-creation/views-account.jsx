/* Account Creation views — AC1 through AC5 (Sign up, Verify email, Phone, Verify phone) */

function AC1View({ onNav }) {
  const [email, setEmail] = React.useState('');
  return (
    <SplitScreen
      brandTagline={<>"We were paying $50k a year for quarterly NAVs still reconciled by hand. POD runs them daily at a fraction of the cost, and our investors can check every figure themselves."</>}
      right={<TestimonialPane name="Michael Whelan" role="Portfolio Manager, Keel Capital" quote='"We were paying $50k a year for quarterly NAVs still reconciled by hand. POD runs them daily at a fraction of the cost, and our investors can check every figure themselves."'/>}
      left={
        <div style={{maxWidth:420,margin:'0 auto',width:'100%'}}>
          <BrandMark/>
          <h1 style={{fontFamily:'\"Tiempos Headline\", \"Times New Roman\", serif',fontWeight:300,fontSize:36,lineHeight:1.15,letterSpacing:'-0.01em',color:'var(--ink-1)',margin:'56px 0 32px'}}>Create a POD account</h1>
          <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
            <SocialButton provider="apple" label="Continue with Apple"/>
            <SocialButton provider="google" label="Continue with Google"/>
          </div>
          <Divider label="or sign up with email"/>
          <FormControl label="Email">
            <TextInput type="email" value={email} onChange={setEmail} placeholder="Email address"/>
          </FormControl>
          <Button full onClick={() => onNav('ac1-email')}>Sign up</Button>
          <FooterLink>Already have an account?</FooterLink>
          <Disclosure>
            By creating an account, you agree to our Investment Advisory Agreement, Terms of Service and Privacy Policy. You also acknowledge that you have reviewed our Form ADV Brochure and Form CRS.
          </Disclosure>
        </div>
      }
    />
  );
}

function AC1EmailView({ onNav }) {
  const [email, setEmail] = React.useState('bc@elysiumfs.com');
  const [name, setName] = React.useState('');
  const [pw, setPw] = React.useState('');
  return (
    <SplitScreen
      left={
        <div style={{maxWidth:420,margin:'0 auto',width:'100%'}}>
          <BrandMark/>
          <h1 style={{fontFamily:'\"Tiempos Headline\", \"Times New Roman\", serif',fontWeight:300,fontSize:36,lineHeight:1.15,letterSpacing:'-0.01em',color:'var(--ink-1)',margin:'56px 0 32px'}}>Create a POD account</h1>
          <FormControl label="Email">
            <TextInput value={email} onChange={setEmail}/>
          </FormControl>
          <FormControl label="Name">
            <TextInput value={name} onChange={setName} placeholder="Your full legal name"/>
          </FormControl>
          <FormControl label="Password">
            <TextInput type="password" value={pw} onChange={setPw} placeholder="Placeholder text"/>
            <PwStrength label="Strong" level={4}/>
          </FormControl>
          <Button full onClick={() => onNav('ac2')}>Continue</Button>
          <FooterLink>Already have an account?</FooterLink>
        </div>
      }
    />
  );
}

function AC2View({ onNav }) {
  return (
    <SplitScreen
      brandTagline="Your data, encrypted end-to-end."
      left={
        <div style={{maxWidth:480,margin:'0 auto',width:'100%'}}>
          <BackBtn onClick={() => onNav('ac1-email')}/>
          <h1 style={{fontFamily:'\"Tiempos Headline\", \"Times New Roman\", serif',fontWeight:300,fontSize:36,lineHeight:1.15,letterSpacing:'-0.01em',color:'var(--ink-1)',margin:'24px 0 12px'}}>Verify your email</h1>
          <p style={{fontSize:15,color:'var(--ink-2)',marginTop:0,marginBottom:32,maxWidth:420}}>We've sent a 6-digit code to <strong style={{color:'var(--ink-1)'}}>jane@elysium.capital</strong>. Enter it below to confirm your email.</p>
          <OtpInput length={6} value="000000"/>
          <div style={{marginTop:24,marginBottom:32,fontSize:13.5,color:'var(--ink-2)'}}>
            Didn't get it? <a style={{color:'var(--ink-1)',fontWeight:500,cursor:'pointer'}}>Resend code</a>
          </div>
          <Button onClick={() => onNav('ac4')}>Verify and continue</Button>
        </div>
      }
    />
  );
}

function AC4View({ onNav }) {
  const [country, setCountry] = React.useState('IE');
  const [phone, setPhone] = React.useState('87 123 4567');
  return (
    <SplitScreen
      left={
        <div style={{maxWidth:480,margin:'0 auto',width:'100%'}}>
          <BackBtn onClick={() => onNav('ac2')}/>
          <h1 style={{fontFamily:'\"Tiempos Headline\", \"Times New Roman\", serif',fontWeight:300,fontSize:36,lineHeight:1.15,letterSpacing:'-0.01em',color:'var(--ink-1)',margin:'24px 0 12px'}}>Secure your account</h1>
          <p style={{fontSize:15,color:'var(--ink-2)',marginTop:0,marginBottom:32,maxWidth:420}}>Add your mobile number. We use two-factor auth by SMS for every fund-impacting action.</p>
          <div style={{display:'grid',gridTemplateColumns:'140px 1fr',gap:12,marginBottom:24}}>
            <FormControl label="Country">
              <Select value={country} onChange={setCountry} options={[
                { value: 'IE', label: '🇮🇪 +353' },
                { value: 'US', label: '🇺🇸 +1' },
                { value: 'GB', label: '🇬🇧 +44' },
                { value: 'AU', label: '🇦🇺 +61' },
              ]}/>
            </FormControl>
            <FormControl label="Phone number">
              <TextInput value={phone} onChange={setPhone}/>
            </FormControl>
          </div>
          <Button onClick={() => onNav('ac5')}>Send SMS code</Button>
        </div>
      }
    />
  );
}

function AC5View({ onNav }) {
  return (
    <SplitScreen
      brandTagline="Verified and ready in seconds."
      left={
        <div style={{maxWidth:480,margin:'0 auto',width:'100%'}}>
          <BackBtn onClick={() => onNav('ac4')}/>
          <h1 style={{fontFamily:'\"Tiempos Headline\", \"Times New Roman\", serif',fontWeight:300,fontSize:36,lineHeight:1.15,letterSpacing:'-0.01em',color:'var(--ink-1)',margin:'24px 0 12px'}}>Verify your phone</h1>
          <p style={{fontSize:15,color:'var(--ink-2)',marginTop:0,marginBottom:32,maxWidth:420}}>Enter the 6-digit code we sent to <strong style={{color:'var(--ink-1)'}}>+353 87 XXX X627</strong></p>
          <OtpInput length={6} value="482000"/>
          <div style={{marginTop:24,marginBottom:32,fontSize:13.5,color:'var(--ink-2)'}}>
            Didn't receive the code? <span style={{color:'var(--ink-3)'}}>Resend in 00:42</span>
          </div>
          <Button onClick={() => onNav('ao1')}>Verify and continue</Button>
        </div>
      }
    />
  );
}

// ─── Helpers used only in this file ────────────────────────────────────────
function SocialButton({ provider, label }) {
  const icons = {
    apple:  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.365 1.43c.092 1.115-.342 2.214-1.014 3.001-.69.81-1.812 1.435-2.913 1.355-.108-1.087.395-2.222 1.052-2.937.74-.81 1.987-1.43 2.875-1.42zm3.557 17.116c-.612 1.34-.91 1.94-1.7 3.13-1.105 1.66-2.66 3.73-4.6 3.75-1.72.02-2.16-1.12-4.5-1.1-2.34.01-2.83 1.12-4.55 1.1-1.93-.02-3.4-1.89-4.51-3.55C-1.06 17.78-1.4 11.61 2.18 8.36c1.27-1.16 3.07-1.89 4.81-1.89 1.78 0 2.91 1.13 4.39 1.13 1.43 0 2.3-1.13 4.36-1.13 1.55 0 3.21.85 4.39 2.32-3.86 2.12-3.23 7.68.79 9.76z"/></svg>,
    google: <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>,
  };
  return (
    <button style={{
      display:'inline-flex',alignItems:'center',justifyContent:'center',gap:10,
      height:48,width:'100%',padding:'0 20px',borderRadius:10,
      border:'1px solid var(--line-2)',background:'var(--bg-card)',
      fontSize:15,fontWeight:500,color:'var(--ink-1)',fontFamily:'inherit',
    }}>{icons[provider]} {label}</button>
  );
}

function Divider({ label }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:14,margin:'24px 0',color:'var(--ink-3)',fontSize:13}}>
      <span style={{flex:1,height:1,background:'var(--line-1)'}}/>
      <span>{label}</span>
      <span style={{flex:1,height:1,background:'var(--line-1)'}}/>
    </div>
  );
}

function PwStrength({ label, level }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}>
      {[1,2,3,4].map(i => (
        <span key={i} style={{flex:1,height:3,borderRadius:2,background: i <= level ? 'var(--accent)' : 'var(--line-2)'}}/>
      ))}
      <span style={{fontSize:11.5,fontWeight:500,color:'var(--accent)',marginLeft:4}}>{label}</span>
    </div>
  );
}

function TestimonialPane({ name, role, quote }) {
  return (
    <div style={{maxWidth:480}}>
      <div style={{fontFamily:'\"Tiempos Headline\", \"Times New Roman\", serif',fontWeight:300,fontSize:24,lineHeight:1.4,color:'var(--on-brand)',marginBottom:32,letterSpacing:'-0.005em'}}>{quote}</div>
      <div style={{fontSize:14,fontWeight:500,color:'var(--on-brand)'}}>{name}</div>
      <div style={{fontSize:13,color:'var(--on-brand-2)',marginTop:2}}>{role}</div>
    </div>
  );
}

Object.assign(window, { AC1View, AC1EmailView, AC2View, AC4View, AC5View });
