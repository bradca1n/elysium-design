// Low-fi wireframe primitives — sketchy/handwritten vibe
// All components are globally exported for use across script tags.

const INK = '#1a1a1a';
const INK2 = '#4a4a4a';
const INK3 = '#888';
const PAPER = '#ffffff';
const LINE = '#2a2a2a';
const FLAG = '#f4a261';   // edge-case highlight (amber)
const OK = '#8ab97f';     // success highlight (sage)

// ─── Sketchy rounded-rect path (slightly wobbly) ───
function sketchRect(x, y, w, h, r = 8, seed = 1) {
  // deterministic jitter
  const j = (i) => {
    const s = Math.sin(seed * 9301 + i * 49297) * 233280;
    return ((s - Math.floor(s)) - 0.5) * 0.9;
  };
  return `
    M ${x + r + j(1)} ${y + j(2)}
    L ${x + w - r + j(3)} ${y + j(4)}
    Q ${x + w + j(5)} ${y + j(6)} ${x + w + j(7)} ${y + r + j(8)}
    L ${x + w + j(9)} ${y + h - r + j(10)}
    Q ${x + w + j(11)} ${y + h + j(12)} ${x + w - r + j(13)} ${y + h + j(14)}
    L ${x + r + j(15)} ${y + h + j(16)}
    Q ${x + j(17)} ${y + h + j(18)} ${x + j(19)} ${y + h - r + j(20)}
    L ${x + j(21)} ${y + r + j(22)}
    Q ${x + j(23)} ${y + j(24)} ${x + r + j(25)} ${y + j(26)}
    Z
  `;
}

// ─── Phone frame (low-fi, ~280×570) ───
function Phone({ title, label, tone = 'neutral', children, scale = 1, annotation }) {
  const borderColor = tone === 'edge' ? FLAG : tone === 'success' ? OK : LINE;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, fontFamily: 'Inter, sans-serif' }}>
      {label && (
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 18, color: INK2,
          textAlign: 'center', maxWidth: 280,
        }}>{label}</div>
      )}
      <div style={{
        width: 280 * scale, height: 570 * scale,
        border: `2px solid ${borderColor}`,
        borderRadius: 32,
        background: PAPER,
        padding: '18px 14px 24px',
        boxSizing: 'border-box',
        position: 'relative',
        boxShadow: '2px 3px 0 rgba(0,0,0,0.05)',
      }}>
        {/* top notch */}
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          width: 60, height: 6, borderRadius: 4, background: '#d0d0d0',
        }} />
        {/* title bar */}
        {title && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 12, marginBottom: 14, padding: '0 2px',
          }}>
            <span style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', color: INK3 }}>‹ back</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: INK, fontWeight: 600, letterSpacing: -0.1 }}>{title}</span>
            <span style={{ fontSize: 13, color: INK3 }}>×</span>
          </div>
        )}
        {/* content */}
        <div style={{ height: 'calc(100% - 52px)', overflow: 'hidden', position: 'relative' }}>
          {children}
        </div>
        {/* home bar */}
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          width: 80, height: 3, borderRadius: 2, background: '#c8c8c8',
        }} />
      </div>
      {annotation && (
        <div style={{
          fontFamily: 'Inter, sans-serif', fontSize: 10,
          color: INK3, textAlign: 'center', maxWidth: 260,
          lineHeight: 1.4,
        }}>{annotation}</div>
      )}
    </div>
  );
}

// ─── Primitive: sketchy box ───
function Box({ children, style, tone, dashed, seed = 1 }) {
  const stroke = tone === 'edge' ? FLAG : tone === 'success' ? OK : tone === 'primary' ? INK : '#999';
  const fill = tone === 'edge' ? 'rgba(244,162,97,0.08)' : tone === 'success' ? 'rgba(138,185,127,0.1)' : 'transparent';
  return (
    <div style={{
      position: 'relative',
      padding: '10px 12px',
      marginBottom: 8,
      ...style,
    }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} preserveAspectRatio="none">
        <path
          d={sketchRect(2, 2, 1000, 1000, 8, seed)}
          fill={fill}
          stroke={stroke}
          strokeWidth="1.4"
          strokeDasharray={dashed ? '4 3' : undefined}
          vectorEffect="non-scaling-stroke"
          transform="scale(1)"
        />
      </svg>
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

// Simpler rect via border (less fancy but reliable for many small elements)
function Rect({ children, tone = 'neutral', dashed = false, style = {}, onClick }) {
  const border = tone === 'edge' ? FLAG : tone === 'success' ? OK : tone === 'primary' ? INK : tone === 'muted' ? '#bbb' : '#888';
  const bg = tone === 'edge' ? 'rgba(244,162,97,0.1)' : tone === 'success' ? 'rgba(138,185,127,0.12)' : 'transparent';
  return (
    <div onClick={onClick} style={{
      border: `1.5px ${dashed ? 'dashed' : 'solid'} ${border}`,
      borderRadius: 7,
      padding: '8px 10px',
      background: bg,
      marginBottom: 8,
      fontFamily: 'Inter, sans-serif',
      fontSize: 12,
      color: INK,
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>{children}</div>
  );
}

// Pill button
function Btn({ children, tone = 'primary', style = {} }) {
  const bg = tone === 'primary' ? INK : tone === 'edge' ? FLAG : tone === 'success' ? OK : 'transparent';
  const fg = tone === 'ghost' ? INK : '#fff';
  const border = tone === 'ghost' ? '1.5px solid #888' : 'none';
  return (
    <div style={{
      background: bg, color: fg, border,
      borderRadius: 20, padding: '8px 12px',
      textAlign: 'center',
      fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 700,
      marginBottom: 6,
      ...style,
    }}>{children}</div>
  );
}

// Text row helpers
function Row({ label, value, tone }) {
  const color = tone === 'edge' ? FLAG : tone === 'muted' ? INK3 : INK;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '5px 2px',
      borderBottom: '1px dashed #ddd',
      fontFamily: 'Inter, sans-serif', fontSize: 11,
      color,
    }}>
      <span style={{ color: INK3 }}>{label}</span>
      <span style={{ color, fontWeight: tone === 'edge' ? 700 : 400 }}>{value}</span>
    </div>
  );
}

function Hand({ children, style = {} }) {
  return <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, color: INK, ...style }}>{children}</div>;
}

function Mono({ children, style = {} }) {
  return <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: INK3, ...style }}>{children}</div>;
}

// Circle icon placeholder
function Circle({ size = 36, tone = 'success', children, style = {} }) {
  const bg = tone === 'success' ? OK : tone === 'edge' ? FLAG : '#ddd';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif', fontSize: size * 0.5, fontWeight: 700,
      margin: '0 auto',
      ...style,
    }}>{children}</div>
  );
}

// Arrow connector (SVG). dir: 'down' | 'right' | 'down-right'
function Arrow({ dir = 'down', length = 40, label, style = {} }) {
  const isDown = dir === 'down';
  return (
    <div style={{
      display: 'flex',
      flexDirection: isDown ? 'column' : 'row',
      alignItems: 'center', justifyContent: 'center',
      gap: 4, margin: isDown ? '4px 0' : '0 4px',
      ...style,
    }}>
      {label && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: INK2 }}>{label}</span>}
      <svg width={isDown ? 16 : length} height={isDown ? length : 16} viewBox={`0 0 ${isDown ? 16 : length} ${isDown ? length : 16}`}>
        {isDown ? (
          <>
            <path d={`M 8 2 Q 8.5 ${length/2} 8 ${length - 6}`} stroke={INK2} strokeWidth="1.6" fill="none" strokeLinecap="round"/>
            <path d={`M 3 ${length - 10} L 8 ${length - 3} L 13 ${length - 10}`} stroke={INK2} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </>
        ) : (
          <>
            <path d={`M 2 8 Q ${length/2} 8.5 ${length - 6} 8`} stroke={INK2} strokeWidth="1.6" fill="none" strokeLinecap="round"/>
            <path d={`M ${length - 10} 3 L ${length - 3} 8 L ${length - 10} 13`} stroke={INK2} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </>
        )}
      </svg>
    </div>
  );
}

// Section header: colored tag + title
function SectionTag({ color, children }) {
  return (
    <div style={{
      display: 'inline-block',
      background: color,
      padding: '6px 16px',
      borderRadius: 4,
      fontFamily: 'Inter, sans-serif',
      fontSize: 18,
      fontWeight: 700,
      color: INK,
      marginBottom: 8,
    }}>{children}</div>
  );
}

// Sticky-note annotation
function Sticky({ children, color = '#fef08a', rotate = -2, style = {} }) {
  return (
    <div style={{
      background: color,
      padding: '10px 12px',
      fontFamily: 'Inter, sans-serif',
      fontSize: 13,
      color: INK,
      maxWidth: 180,
      boxShadow: '1px 2px 4px rgba(0,0,0,0.1)',
      transform: `rotate(${rotate}deg)`,
      lineHeight: 1.3,
      ...style,
    }}>{children}</div>
  );
}

Object.assign(window, {
  Phone, Box, Rect, Btn, Row, Hand, Mono, Circle, Arrow, SectionTag, Sticky,
  INK, INK2, INK3, PAPER, LINE, FLAG, OK,
});
