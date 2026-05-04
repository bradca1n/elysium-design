/* Admin Onboarding views — AO01 + Create org (A05–A07) + Join org (J01–J03) + Accept invite (AO02–AO04) */

function AO01View({ onNav }) {
  const [pick, setPick] = React.useState('create');
  return (
    <SplitScreen
      left={
        <div style={{maxWidth:480,margin:'0 auto',width:'100%'}}>
          <BackBtn onClick={() => onNav('ac5')}/>
          <h1 style={{fontFamily:'\"Tiempos Headline\", \"Times New Roman\", serif',fontWeight:300,fontSize:32,lineHeight:1.15,letterSpacing:'-0.01em',color:'var(--ink-1)',margin:'24px 0 12px'}}>Create or join an organisation</h1>
          <p style={{fontSize:15,color:'var(--ink-2)',marginTop:0,marginBottom:28,maxWidth:420}}>We'll set up your workspace differently for each.</p>
          <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:28}}>
            <ActionRow
              icon="✦"
              title="Create a new organisation"
              body="As the first admin, you'll create a workspace, set up licensing, and ensure compliance"
              selected={pick === 'create'}
              onClick={() => setPick('create')}
            />
            <ActionRow
              icon="◇"
              title="Join an existing organisation"
              body="A teammate already runs a workspace on Elysium. You'll need an invite link or access request."
              selected={pick === 'join'}
              onClick={() => setPick('join')}
            />
          </div>
          <Button onClick={() => onNav(pick === 'create' ? 'a05' : 'j01')}>Continue</Button>
        </div>
      }
    />
  );
}

function A05View({ onNav }) {
  const [name, setName] = React.useState('Elysium Capital Ltd');
  const [jur, setJur] = React.useState('');
  const [lei, setLei] = React.useState('');
  const [licence, setLicence] = React.useState('');
  const [agree, setAgree] = React.useState(false);
  return (
    <SplitScreen
      left={
        <div style={{maxWidth:480,margin:'0 auto',width:'100%'}}>
          <BackBtn onClick={() => onNav('ao1')}/>
          <Stepper steps={['Identity','Address','Role']} current={0}/>
          <h1 style={{fontFamily:'\"Tiempos Headline\", \"Times New Roman\", serif',fontWeight:300,fontSize:30,lineHeight:1.15,letterSpacing:'-0.01em',color:'var(--ink-1)',margin:'8px 0 8px'}}>Organisation identity</h1>
          <p style={{fontSize:14,color:'var(--ink-2)',marginTop:0,marginBottom:24}}>Your legal entity and licence details.</p>
          <FormControl label="Organisation name">
            <TextInput value={name} onChange={setName}/>
          </FormControl>
          <FormControl label="Jurisdiction of incorporation">
            <Select value={jur} onChange={setJur} placeholder="Select jurisdiction" options={['Ireland','United Kingdom','United States','Cayman Islands','Singapore','Switzerland']}/>
          </FormControl>
          <FormControl label="Legal Entity Identifier (LEI)">
            <TextInput value={lei} onChange={setLei} placeholder="549300XXXXXXXXXXXXXX"/>
          </FormControl>
          <FormControl label="Regulator licence number">
            <TextInput value={licence} onChange={setLicence} placeholder="CBI-000000"/>
          </FormControl>
          <label style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:24,cursor:'pointer'}}>
            <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{marginTop:3,width:16,height:16,accentColor:'var(--ink-1)'}}/>
            <span style={{fontSize:13.5,color:'var(--ink-2)',lineHeight:1.5}}>I agree to the <a style={{color:'var(--ink-1)',fontWeight:500}}>Terms &amp; Conditions</a> and <a style={{color:'var(--ink-1)',fontWeight:500}}>Privacy Policy</a></span>
          </label>
          <Button onClick={() => onNav('a06')}>Continue</Button>
        </div>
      }
    />
  );
}

function A06View({ onNav }) {
  const [addr, setAddr] = React.useState('123 Main Street');
  const [city, setCity] = React.useState('Dublin');
  const [postcode, setPostcode] = React.useState('D02 XH89');
  const [country, setCountry] = React.useState('');
  const [bcpName, setBcpName] = React.useState('Jane Doe');
  const [bcpEmail, setBcpEmail] = React.useState('jane@example.com');
  const [insurer, setInsurer] = React.useState('AIG');
  const [policy, setPolicy] = React.useState('POL-000000');
  return (
    <SplitScreen
      left={
        <div style={{maxWidth:520,margin:'0 auto',width:'100%'}}>
          <BackBtn onClick={() => onNav('a05')}/>
          <Stepper steps={['Identity','Address','Role']} current={1}/>
          <h1 style={{fontFamily:'\"Tiempos Headline\", \"Times New Roman\", serif',fontWeight:300,fontSize:30,lineHeight:1.15,letterSpacing:'-0.01em',color:'var(--ink-1)',margin:'8px 0 8px'}}>Registered address &amp; compliance</h1>
          <p style={{fontSize:14,color:'var(--ink-2)',marginTop:0,marginBottom:24}}>Where you're incorporated and who runs continuity.</p>
          <FormControl label="Registered address">
            <TextInput value={addr} onChange={setAddr}/>
          </FormControl>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <FormControl label="City"><TextInput value={city} onChange={setCity}/></FormControl>
            <FormControl label="Postcode"><TextInput value={postcode} onChange={setPostcode}/></FormControl>
          </div>
          <FormControl label="Country of incorporation">
            <Select value={country} onChange={setCountry} placeholder="Select country" options={['Ireland','United Kingdom','United States','Cayman Islands','Singapore','Switzerland']}/>
          </FormControl>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <FormControl label="BCP officer name"><TextInput value={bcpName} onChange={setBcpName}/></FormControl>
            <FormControl label="BCP officer email"><TextInput value={bcpEmail} onChange={setBcpEmail}/></FormControl>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:24}}>
            <FormControl label="Insurance provider"><TextInput value={insurer} onChange={setInsurer}/></FormControl>
            <FormControl label="Policy number"><TextInput value={policy} onChange={setPolicy}/></FormControl>
          </div>
          <Button onClick={() => onNav('a07')}>Continue</Button>
        </div>
      }
    />
  );
}

function A07View({ onNav }) {
  const [role, setRole] = React.useState('');
  return (
    <SplitScreen
      left={
        <div style={{maxWidth:480,margin:'0 auto',width:'100%'}}>
          <BackBtn onClick={() => onNav('a06')}/>
          <Stepper steps={['Identity','Address','Role']} current={2}/>
          <h1 style={{fontFamily:'\"Tiempos Headline\", \"Times New Roman\", serif',fontWeight:300,fontSize:30,lineHeight:1.15,letterSpacing:'-0.01em',color:'var(--ink-1)',margin:'8px 0 8px'}}>Your admin role</h1>
          <p style={{fontSize:14,color:'var(--ink-2)',marginTop:0,marginBottom:24}}>Pick the role that best fits your responsibilities. You can change this later.</p>
          <FormControl label="Your role" helper="Determines which areas of POD you can administer">
            <Select value={role} onChange={setRole} placeholder="Select your role" options={[
              'Portfolio Manager',
              'Fund Operations',
              'Compliance Officer',
              'Chief Operating Officer',
              'Investor Relations',
            ]}/>
          </FormControl>
          <div style={{marginTop:32}}>
            <Button onClick={() => onNav('ao3')}>Finish setup</Button>
          </div>
        </div>
      }
    />
  );
}

function J01View({ onNav }) {
  const [email, setEmail] = React.useState('you@keelcapital.com');
  return (
    <SplitScreen
      left={
        <div style={{maxWidth:480,margin:'0 auto',width:'100%'}}>
          <BackBtn onClick={() => onNav('ao1')}/>
          <h1 style={{fontFamily:'\"Tiempos Headline\", \"Times New Roman\", serif',fontWeight:300,fontSize:30,lineHeight:1.15,letterSpacing:'-0.01em',color:'var(--ink-1)',margin:'24px 0 8px'}}>Find your organisation</h1>
          <p style={{fontSize:14,color:'var(--ink-2)',marginTop:0,marginBottom:24}}>Enter your work email and we'll show any Elysium organisations you can join.</p>
          <FormControl label="Work email">
            <TextInput type="email" value={email} onChange={setEmail}/>
          </FormControl>
          <div style={{fontSize:13.5,color:'var(--ink-2)',marginBottom:32}}>
            Have an organisation URL? <a style={{color:'var(--ink-1)',fontWeight:500,cursor:'pointer'}}>Use that instead</a>
          </div>
          <Button onClick={() => onNav('j02')}>Search organisations</Button>
        </div>
      }
    />
  );
}

function J02View({ onNav }) {
  return (
    <SplitScreen
      left={
        <div style={{maxWidth:520,margin:'0 auto',width:'100%'}}>
          <BackBtn onClick={() => onNav('j01')}/>
          <h1 style={{fontFamily:'\"Tiempos Headline\", \"Times New Roman\", serif',fontWeight:300,fontSize:30,lineHeight:1.15,letterSpacing:'-0.01em',color:'var(--ink-1)',margin:'24px 0 8px'}}>Organisations matching your email</h1>
          <p style={{fontSize:14,color:'var(--ink-2)',marginTop:0,marginBottom:24}}>We found these organisations using <strong style={{color:'var(--ink-1)'}}>@keelcapital.com</strong>. Pick one to request access.</p>
          <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
            <ActionRow
              icon="🏛"
              title="Keel Capital"
              body="12 members · Created Aug 2025 · Admin: Michael Whelan"
              onClick={() => onNav('j03')}
            />
          </div>
          <div style={{fontSize:13.5,color:'var(--ink-2)',marginBottom:32}}>
            Don't see yours? <a onClick={() => onNav('a05')} style={{color:'var(--ink-1)',fontWeight:500,cursor:'pointer'}}>Create a new organisation</a>
          </div>
          <Button onClick={() => onNav('j03')}>Verify and continue</Button>
        </div>
      }
    />
  );
}

function J03View({ onNav }) {
  return (
    <SplitScreen
      brandTagline="Welcome to the team."
      left={
        <div style={{maxWidth:480,margin:'0 auto',width:'100%'}}>
          <div style={{width:48,height:48,borderRadius:24,background:'var(--accent-soft)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--accent)',fontSize:20,marginBottom:24}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>
          </div>
          <h1 style={{fontFamily:'\"Tiempos Headline\", \"Times New Roman\", serif',fontWeight:300,fontSize:32,lineHeight:1.15,letterSpacing:'-0.01em',color:'var(--ink-1)',margin:'0 0 12px'}}>Your request is on its way</h1>
          <p style={{fontSize:15,color:'var(--ink-2)',marginTop:0,marginBottom:32,maxWidth:420}}>We've let the admins of <strong style={{color:'var(--ink-1)'}}>Keel Capital</strong> know you'd like to join. You'll get an email when they respond.</p>
          <Button variant="secondary" onClick={() => onNav('ac1')}>Back to login</Button>
        </div>
      }
    />
  );
}

function AO02View({ onNav }) {
  const [name, setName] = React.useState('Jane Doe');
  return (
    <SplitScreen
      left={
        <div style={{maxWidth:480,margin:'0 auto',width:'100%'}}>
          <BrandMark/>
          <h1 style={{fontFamily:'\"Tiempos Headline\", \"Times New Roman\", serif',fontWeight:300,fontSize:32,lineHeight:1.15,letterSpacing:'-0.01em',color:'var(--ink-1)',margin:'48px 0 12px'}}>Join Keel Capital on POD</h1>
          <p style={{fontSize:15,color:'var(--ink-2)',marginTop:0,marginBottom:28,maxWidth:420}}>You're accepting an invitation sent to <strong style={{color:'var(--ink-1)'}}>jane@keelcapital.com</strong>.</p>
          <FormControl label="Your name">
            <TextInput value={name} onChange={setName}/>
          </FormControl>
          <Button full onClick={() => onNav('ao3')}>Continue</Button>
          <Disclosure>
            By continuing, you're agreeing to our User Terms of Service. Additional disclosures are available in our Privacy Policy and Cookie Policy.
          </Disclosure>
        </div>
      }
    />
  );
}

function AO03View({ onNav }) {
  const [pick, setPick] = React.useState('app');
  return (
    <SplitScreen
      left={
        <div style={{maxWidth:520,margin:'0 auto',width:'100%'}}>
          <BackBtn onClick={() => onNav('a07')}/>
          <h1 style={{fontFamily:'\"Tiempos Headline\", \"Times New Roman\", serif',fontWeight:300,fontSize:30,lineHeight:1.15,letterSpacing:'-0.01em',color:'var(--ink-1)',margin:'24px 0 8px'}}>Choose your second factor</h1>
          <p style={{fontSize:14,color:'var(--ink-2)',marginTop:0,marginBottom:24}}>MFA protects every fund-impacting action. You can add a backup method later.</p>
          <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:28}}>
            <ActionRow
              icon="📱"
              title="Authenticator app (Recommended)"
              body="Use Authy, 1Password, Google Authenticator, or similar. Works offline."
              selected={pick === 'app'}
              onClick={() => setPick('app')}
            />
            <ActionRow
              icon="✉"
              title="SMS text message"
              body="We text a 6-digit code. Not recommended if you travel internationally."
              selected={pick === 'sms'}
              onClick={() => setPick('sms')}
            />
            <ActionRow
              icon="🔐"
              title="Security key"
              body="Hardware key via WebAuthn (YubiKey, Titan, etc.) — strongest option."
              selected={pick === 'key'}
              onClick={() => setPick('key')}
            />
          </div>
          <Button onClick={() => onNav('ao4')}>Continue</Button>
        </div>
      }
    />
  );
}

function AO04View({ onNav }) {
  const [rows, setRows] = React.useState([
    { email: 'teammate@keelcapital.com', role: 'Fund Accountant' },
    { email: '', role: '' },
  ]);
  const update = (i, k, v) => setRows(rs => rs.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  return (
    <SplitScreen
      left={
        <div style={{maxWidth:560,margin:'0 auto',width:'100%'}}>
          <BackBtn onClick={() => onNav('ao3')}/>
          <h1 style={{fontFamily:'\"Tiempos Headline\", \"Times New Roman\", serif',fontWeight:300,fontSize:30,lineHeight:1.15,letterSpacing:'-0.01em',color:'var(--ink-1)',margin:'24px 0 8px'}}>Invite your team</h1>
          <p style={{fontSize:14,color:'var(--ink-2)',marginTop:0,marginBottom:24}}>Add colleagues now or skip and invite them later from Settings.</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 0',rowGap:0,marginBottom:8,fontSize:12,color:'var(--ink-2)',fontWeight:500}}>
            <div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:12,padding:'0 4px'}}>
              <div>Email</div>
              <div>Role</div>
            </div>
          </div>
          {rows.map((r, i) => (
            <div key={i} style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:12,marginBottom:10}}>
              <TextInput value={r.email} onChange={(v) => update(i, 'email', v)} placeholder="teammate@keelcapital.com"/>
              <Select value={r.role} onChange={(v) => update(i, 'role', v)} placeholder="Select role" options={['Fund Accountant','Compliance Officer','Investor Relations','Read-only']}/>
            </div>
          ))}
          <button onClick={() => setRows(rs => [...rs, { email: '', role: '' }])} style={{
            background:'transparent',border:'none',color:'var(--ink-1)',
            fontSize:13.5,fontWeight:500,cursor:'pointer',padding:'4px 0',
            fontFamily:'inherit',marginBottom:28,
          }}>+ Add another</button>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <Button onClick={() => onNav('ac1')}>Send invites</Button>
            <button onClick={() => onNav('ac1')} style={{background:'transparent',border:'none',color:'var(--ink-2)',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>Skip for now</button>
          </div>
        </div>
      }
    />
  );
}

Object.assign(window, { AO01View, A05View, A06View, A07View, J01View, J02View, J03View, AO02View, AO03View, AO04View });
