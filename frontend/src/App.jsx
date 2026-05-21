import { useState, useEffect, useRef, useCallback } from 'react';

/* ─── tiny hook: API call ─────────────────────────────────────── */
function useAnalyze() {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [result,   setResult]   = useState(null);

  const analyze = useCallback(async (file, threshold = 0.5) => {
    setLoading(true); setError(null); setResult(null);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('threshold', String(threshold));
      body.append('return_mask', 'true');
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 60000);
      const res  = await fetch('/v1/analyze', { method: 'POST', body, signal: ctrl.signal });
      clearTimeout(tid);
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || `Error ${res.status}`); }
      setResult(await res.json());
    } catch (e) {
      setError(e.name === 'AbortError' ? 'Request timed out.' : e.message);
    } finally { setLoading(false); }
  }, []);

  return { loading, error, result, analyze, reset: () => { setResult(null); setError(null); } };
}

/* ─── Animated scan-line canvas ──────────────────────────────── */
function ScanCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    let y = 0, raf;
    const draw = () => {
      cv.width = cv.offsetWidth; cv.height = cv.offsetHeight;
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (let i = 0; i < cv.height; i += 4) {
        ctx.fillStyle = `rgba(0,255,136,${i % 8 === 0 ? 0.03 : 0.008})`;
        ctx.fillRect(0, i, cv.width, 1);
      }
      const grad = ctx.createLinearGradient(0, y - 40, 0, y + 40);
      grad.addColorStop(0, 'rgba(0,255,136,0)');
      grad.addColorStop(0.5, 'rgba(0,255,136,0.18)');
      grad.addColorStop(1, 'rgba(0,255,136,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y - 40, cv.width, 80);
      y = (y + 1.5) % cv.height;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:1 }} />;
}
/* ─── Simple Title Text Component ──────────────────────────────
   Clean modern title without glitch animation
---------------------------------------------------------------- */
function GlitchText({ children, size = 48 }) {

  return (

    <div
      style={{

        // Dynamic font size
        fontSize: size,

        // Font styling
        fontFamily: 'var(--font-display)',

        // Bold text
        fontWeight: 700,

        // Text color
        color: 'white',

        // Better spacing
        lineHeight: 1.1,

        // Clean letter spacing
        letterSpacing: '2px',

        // Simple subtle shadow
        textShadow: '0 2px 10px rgba(0,0,0,0.3)'
      }}
    >
      {children}
    </div>
  );
}

/* ─── Animated number counter ─────────────────────────────────── */
function CountUp({ target, suffix = '', color = 'var(--neon)', duration = 1200 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(parseFloat((p * target).toFixed(1)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <span style={{ color, fontFamily:'var(--font-mono)', fontWeight:700 }}>{val}{suffix}</span>;
}

/* ─── Terminal log lines ─────────────────────────────────────── */
function Terminal({ lines }) {
  const [shown, setShown] = useState([]);
  useEffect(() => {
    setShown([]);
    lines.forEach((l, i) => setTimeout(() => setShown(p => [...p, l]), i * 120));
  }, [lines.join('|')]);
  return (
    <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--neon-dim)', lineHeight:1.8, background:'rgba(0,0,0,0.4)', borderRadius:8, padding:'12px 16px', border:'1px solid var(--border)', maxHeight:160, overflowY:'auto' }}>
      {shown.map((l, i) => (
        <div key={i}><span style={{ color:'var(--neon)', opacity:0.5 }}>&gt; </span>{l}</div>
      ))}
      <span style={{ animation:'blink 1s step-end infinite', color:'var(--neon)' }}>█</span>
    </div>
  );
}

/* ─── Upload drop zone ────────────────────────────────────────── */
function DropZone({ onFile, disabled }) {
  const [drag, setDrag] = useState(false);
  const [err, setErr]   = useState('');
  const inp = useRef(null);

  const handle = f => {
    setErr('');
    if (!f) return;
    if (!['image/jpeg','image/png','image/webp'].includes(f.type)) { setErr('UNSUPPORTED FORMAT — use JPEG / PNG / WebP'); return; }
    if (f.size > 10*1024*1024) { setErr('FILE TOO LARGE — max 10 MB'); return; }
    onFile(f);
  };

  return (
    <div>
      <div
        tabIndex={0} role="button"
        aria-label="Upload image for forensic analysis"
        onClick={() => !disabled && inp.current?.click()}
        onKeyDown={e => e.key==='Enter' && inp.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
        style={{
          border:`2px dashed ${drag ? 'var(--neon)' : 'var(--border)'}`,
          borderRadius:12, padding:'3rem 2rem', textAlign:'center',
          cursor: disabled ? 'not-allowed' : 'pointer', position:'relative', overflow:'hidden',
          background: drag ? 'rgba(0,255,136,0.04)' : 'rgba(0,0,0,0.3)',
          transition:'all 0.25s', opacity: disabled ? 0.5 : 1,
          boxShadow: drag ? '0 0 30px rgba(0,255,136,0.2)' : 'none',
        }}
      >
        <input ref={inp} type="file" accept=".jpg,.jpeg,.png,.webp" style={{display:'none'}} onChange={e=>handle(e.target.files[0])} disabled={disabled} />
        {drag && <ScanCanvas/>}
        <div style={{ fontSize:48, marginBottom:12, filter:'drop-shadow(0 0 12px var(--neon))', opacity:drag?1:0.6 }}>⬡</div>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--neon)', letterSpacing:3, textTransform:'uppercase', marginBottom:6 }}>
          {drag ? '[ DROP TO INITIATE SCAN ]' : '[ LOAD EVIDENCE FILE ]'}
        </div>
        <div style={{ fontSize:12, color:'var(--muted)', marginTop:8 }}>JPEG · PNG · WebP — max 10 MB</div>
      </div>
      {err && <div style={{ marginTop:8, fontFamily:'var(--font-mono)', fontSize:12, color:'var(--red)', letterSpacing:1 }}>⚠ {err}</div>}
    </div>
  );
}

/* ─── Scanning animation overlay ────────────────────────────── */
function ScanningOverlay({ src }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPct(p => { if (p >= 100) { clearInterval(id); return 100; } return p + Math.random() * 4; }), 60);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ position:'relative', borderRadius:12, overflow:'hidden' }}>
      <img src={src} alt="scanning" style={{ width:'100%', filter:'brightness(0.4) saturate(0.5)', display:'block' }} />
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent, transparent calc(100% - ' + pct + '%), rgba(0,255,136,0.06) calc(100% - ' + pct + '%), transparent)', transition:'none' }} />
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'var(--neon)', boxShadow:'0 0 20px var(--neon)', transform:`translateY(${pct}%)`, transition:'transform 0.06s linear' }} />
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
        <div style={{ width:56, height:56, border:'2px solid var(--neon)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', boxShadow:'0 0 20px rgba(0,255,136,0.4)' }} />
        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--neon)', letterSpacing:3 }}>SCANNING… {Math.min(Math.round(pct),99)}%</div>
      </div>
    </div>
  );
}

/* ─── Region map ─────────────────────────────────────────────── */
function RegionMap({ regions }) {
  if (!regions?.length) return null;
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:10 }}>
      {regions.map((r,i) => (
        <div key={r.id} style={{
          background:'rgba(255,51,68,0.06)', border:'1px solid rgba(255,51,68,0.3)',
          borderRadius:8, padding:'10px 12px', fontFamily:'var(--font-mono)', fontSize:11,
          animation:`fadeIn 0.4s ease ${i*0.08}s both`,
        }}>
          <div style={{ color:'var(--red)', fontWeight:700, marginBottom:6, letterSpacing:1 }}>REGION #{String(r.id).padStart(2,'0')}</div>
          <div style={{ color:'var(--muted)', lineHeight:1.8 }}>
            <div>AREA: <span style={{ color:'#fff' }}>{r.area_px.toLocaleString()} px</span></div>
            <div>CONF: <span style={{ color:'#fff' }}>{(r.confidence*100).toFixed(0)}%</span></div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:4 }}>
              [{r.bbox[0]},{r.bbox[1]}] → [{r.bbox[2]},{r.bbox[3]}]
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Result verdict display ─────────────────────────────────── */
function VerdictBanner({ result }) {
  const tampered = result.verdict === 'TAMPERED';
  return (
    <div style={{
      border:`2px solid ${tampered ? 'var(--red)' : 'var(--neon)'}`,
      borderRadius:12, padding:'24px 28px', position:'relative', overflow:'hidden',
      background: tampered ? 'rgba(255,51,68,0.05)' : 'rgba(0,255,136,0.05)',
      boxShadow: tampered ? '0 0 40px rgba(255,51,68,0.15)' : '0 0 40px rgba(0,255,136,0.15)',
      animation:'fadeIn 0.5s ease',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
        <div style={{ fontSize:56, lineHeight:1, filter:`drop-shadow(0 0 16px ${tampered?'var(--red)':'var(--neon)'})` }}>
          {tampered ? '⚠' : '✓'}
        </div>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:900, color: tampered?'var(--red)':'var(--neon)', letterSpacing:2, textTransform:'uppercase' }}>
            {tampered ? 'Evidence Tampered' : 'Image Authentic'}
          </div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--muted)', marginTop:4, letterSpacing:2 }}>
            VERDICT CONFIDENCE: <CountUp target={Math.round(result.confidence*100)} suffix="%" color={tampered?'var(--red)':'var(--neon)'} />
            &nbsp;·&nbsp; PROCESSED IN {result.processing_ms}ms
            {result.demo_mode && <span style={{ marginLeft:10, background:'rgba(255,200,0,0.15)', color:'#ffcc00', border:'1px solid rgba(255,200,0,0.3)', borderRadius:4, padding:'1px 8px', fontSize:10 }}>DEMO MODE</span>}
          </div>
        </div>
      </div>

      <div style={{ marginTop:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--muted)', marginBottom:8, letterSpacing:1 }}>
          <span>TAMPER COVERAGE</span>
          <CountUp target={result.tamper_percentage} suffix="%" color={tampered?'var(--red)':'var(--neon)'} />
        </div>
        <div style={{ height:8, background:'rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden' }}>
          <div style={{
            height:'100%', background: tampered
              ? 'linear-gradient(90deg,#ff3344,#ff6b35)'
              : 'linear-gradient(90deg,#00ff88,#00cfff)',
            borderRadius:4, boxShadow:`0 0 12px ${tampered?'rgba(255,51,68,0.6)':'rgba(0,255,136,0.6)'}`,
            animation:'growBar 1s cubic-bezier(0.22,1,0.36,1)',
            width:`${result.tamper_percentage}%`,
          }} />
        </div>
      </div>

      <div style={{ position:'absolute', top:0, right:0, fontFamily:'var(--font-mono)', fontSize:9, color: tampered?'rgba(255,51,68,0.15)':'rgba(0,255,136,0.15)', padding:'8px 12px', letterSpacing:1 }}>
        DETECTOO//FORENSICS//v2
      </div>
    </div>
  );
}

/* ─── NEW: Side-by-side image comparison viewer ──────────────── */
function ComparisonViewer({ originalSrc, highlightSrc, overlaySrc }) {
  const [viewMode, setViewMode] = useState('sidebyside');
  const [overlayOpacity, setOverlayOpacity] = useState(0.6);
  const [zoom, setZoom] = useState(false);
  const [sliderPct, setSliderPct] = useState(50);
  const sliderRef = useRef(null);
  const dragging = useRef(false);

  const onSliderMove = (clientX) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setSliderPct(pct);
  };
  useEffect(() => {
    const onMove = e => { if (dragging.current) onSliderMove(e.touches ? e.touches[0].clientX : e.clientX); };
    const onUp   = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend',  onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
    };
  }, []);

  const PanelLabel = ({ text, color = 'var(--neon)', side = 'left' }) => (
    <div style={{
      fontFamily:'var(--font-mono)', fontSize:10, color, letterSpacing:2,
      background:'rgba(0,0,0,0.75)', padding:'4px 10px', borderRadius:4,
      position:'absolute', top:10, [side]:10, zIndex:5, border:`1px solid ${color}`,
      textTransform:'uppercase', backdropFilter:'blur(4px)',
    }}>{text}</div>
  );

  return (
    <div style={{ animation:'fadeIn 0.5s ease' }}>
      {/* Mode switcher */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        {[
          { id:'sidebyside', label:'◫ SIDE BY SIDE'    },
          { id:'slider',     label:'◈ DRAG COMPARE'    },
          { id:'overlay',    label:'◉ HEATMAP OVERLAY' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setViewMode(id)}
            style={{
              fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:2,
              padding:'6px 14px', borderRadius:6, cursor:'pointer', textTransform:'uppercase',
              border: `1px solid ${viewMode===id ? 'var(--neon)' : 'var(--border)'}`,
              background: viewMode===id ? 'rgba(0,255,136,0.12)' : 'transparent',
              color: viewMode===id ? 'var(--neon)' : 'var(--muted)',
              transition:'all 0.2s',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── SIDE BY SIDE ── */}
      {viewMode === 'sidebyside' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {/* Before */}
            <div style={{ position:'relative', borderRadius:12, overflow:'hidden', background:'#000',
              border:'1px solid rgba(0,255,136,0.3)', boxShadow:'0 0 24px rgba(0,255,136,0.1)' }}>
              <PanelLabel text="BEFORE — ORIGINAL" color="var(--neon)" />
              <img src={originalSrc} alt="Original" style={{ width:'100%', display:'block' }} />
              <div style={{ position:'absolute', bottom:0, left:0, right:0,
                background:'linear-gradient(transparent, rgba(0,0,0,0.7))',
                padding:'20px 10px 8px', fontFamily:'var(--font-mono)', fontSize:9,
                color:'var(--neon)', letterSpacing:1, textAlign:'right' }}>
                UNMODIFIED EVIDENCE
              </div>
            </div>
            {/* After */}
            <div style={{ position:'relative', borderRadius:12, overflow:'hidden', background:'#000',
              border:'1px solid rgba(255,51,68,0.35)', boxShadow:'0 0 24px rgba(255,51,68,0.12)' }}>
              <PanelLabel text="AFTER — TAMPERED REGIONS" color="var(--red)" />
              {(highlightSrc || overlaySrc)
                ? <img src={highlightSrc || overlaySrc} alt="Forged regions" style={{ width:'100%', display:'block' }} />
                : (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    minHeight:220, color:'var(--muted)', fontFamily:'var(--font-mono)', fontSize:12, gap:10 }}>
                    <span style={{ fontSize:32 }}>✓</span><span>NO TAMPERING DETECTED</span>
                  </div>
                )
              }
              <div style={{ position:'absolute', bottom:0, left:0, right:0,
                background:'linear-gradient(transparent, rgba(0,0,0,0.7))',
                padding:'20px 10px 8px', fontFamily:'var(--font-mono)', fontSize:9,
                color:'var(--red)', letterSpacing:1, textAlign:'right' }}>
                FORGERY ISOLATION
              </div>
              <div style={{ position:'absolute', top:0, right:0, width:0, height:0,
                borderTop:'32px solid rgba(255,51,68,0.35)', borderLeft:'32px solid transparent' }} />
            </div>
          </div>
          <div style={{ display:'flex', gap:20, marginTop:10, flexWrap:'wrap' }}>
            {[
              { color:'var(--neon)', label:'AUTHENTIC REGION' },
              { color:'var(--red)',  label:'TAMPERED REGION (highlighted)' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:10, height:10, borderRadius:2, background:color, boxShadow:`0 0 5px ${color}` }} />
                <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--muted)', letterSpacing:1 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DRAG SLIDER ── */}
      {viewMode === 'slider' && (
        <div>
          <div
            ref={sliderRef}
            style={{ position:'relative', borderRadius:12, overflow:'hidden', cursor:'col-resize',
              border:'1px solid var(--border)', userSelect:'none' }}
            onMouseDown={e => { dragging.current = true; onSliderMove(e.clientX); }}
            onTouchStart={e => { dragging.current = true; onSliderMove(e.touches[0].clientX); }}
          >
            {/* After (bottom layer, full width) */}
            <img src={highlightSrc || overlaySrc || originalSrc} alt="After"
              style={{ width:'100%', display:'block' }} draggable={false} />
            {/* Before (clipped top layer) */}
            <div style={{ position:'absolute', top:0, left:0, bottom:0, width:`${sliderPct}%`, overflow:'hidden' }}>
              <img src={originalSrc} alt="Before"
                style={{ position:'absolute', top:0, left:0, height:'100%', width: sliderRef.current ? `${sliderRef.current.offsetWidth}px` : '100%', maxWidth:'none' }}
                draggable={false} />
            </div>
            {/* Labels */}
            <PanelLabel text="BEFORE" color="var(--neon)" side="left" />
            <PanelLabel text="AFTER"  color="var(--red)"  side="right" />
            {/* Divider */}
            <div style={{ position:'absolute', top:0, bottom:0, left:`${sliderPct}%`, width:3,
              background:'#fff', transform:'translateX(-50%)', boxShadow:'0 0 12px rgba(255,255,255,0.8)', zIndex:10, pointerEvents:'none' }}>
              <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
                width:36, height:36, borderRadius:'50%', background:'#fff', boxShadow:'0 2px 16px rgba(0,0,0,0.6)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, color:'#333', fontFamily:'var(--font-mono)', fontWeight:700 }}>◀▶</div>
            </div>
          </div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--muted)', letterSpacing:1, marginTop:8, textAlign:'center' }}>
            DRAG TO COMPARE ORIGINAL vs TAMPERED OVERLAY
          </div>
        </div>
      )}

      {/* ── HEATMAP OVERLAY ── */}
      {viewMode === 'overlay' && (
        <div>
          <div style={{ position:'relative', borderRadius:12, overflow:'hidden',
            cursor:zoom?'zoom-out':'zoom-in', background:'#000', border:'1px solid var(--border)' }}
            onClick={() => setZoom(z => !z)}
            role="img" aria-label="Image with forgery heatmap overlay"
          >
            <PanelLabel text="HEATMAP OVERLAY" color="var(--neon)" />
            <img src={originalSrc} alt="Original" style={{ width:'100%', display:'block',
              transition:'transform 0.3s', transform: zoom?'scale(1.8)':'scale(1)', transformOrigin:'center' }} />
            {(overlaySrc || highlightSrc) && (
              <img src={overlaySrc || highlightSrc} alt="Heatmap" style={{
                position:'absolute', inset:0, width:'100%', height:'100%',
                opacity:overlayOpacity, objectFit:'cover', mixBlendMode:'screen', transition:'opacity 0.2s',
              }} />
            )}
            <div style={{ position:'absolute', bottom:10, right:10, fontFamily:'var(--font-mono)', fontSize:9, color:'var(--neon)', opacity:0.5, letterSpacing:1 }}>
              {zoom ? 'CLICK TO ZOOM OUT' : 'CLICK TO ZOOM IN'}
            </div>
          </div>
          <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--muted)', letterSpacing:1 }}>OVERLAY OPACITY</span>
            <input type="range" min={0} max={1} step={0.01} value={overlayOpacity}
              onChange={e => setOverlayOpacity(+e.target.value)}
              style={{ flex:1, accentColor:'var(--neon)', height:4 }} />
            <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--neon)', minWidth:32 }}>{Math.round(overlayOpacity*100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Metrics dashboard ───────────────────────────────────────── */
function MetricsGrid({ result }) {
  const items = [
    { label:'TAMPER %',    val:`${result.tamper_percentage.toFixed(1)}%`, color:'var(--red)' },
    { label:'CONFIDENCE',  val:`${(result.confidence*100).toFixed(1)}%`,  color:'var(--neon)' },
    { label:'REGIONS',     val:result.regions?.length ?? 0,              color:'#00cfff' },
    { label:'PROC TIME',   val:`${result.processing_ms}ms`,              color:'#a78bfa' },
    { label:'FILE',        val:result.original_filename||'—',            color:'var(--muted)', small:true },
    { label:'MODEL',       val:result.demo_mode?'DEMO':'EFFNet-B4',      color:result.demo_mode?'#ffcc00':'var(--neon)' },
  ];
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
      {items.map(({ label, val, color, small }) => (
        <div key={label} style={{
          background:'rgba(255,255,255,0.03)', border:'1px solid var(--border)',
          borderRadius:8, padding:'12px 14px', animation:'fadeIn 0.5s ease both',
        }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--muted)', letterSpacing:2, marginBottom:6 }}>{label}</div>
          <div style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:small?11:18, color, wordBreak:'break-all' }}>{val}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Nav ─────────────────────────────────────────────────────── */
function Nav({ page, setPage }) {
  const links = ['home','detector','about'];
  return (
    <nav style={{
      display:'flex', justifyContent:'space-between', alignItems:'center',
      padding:'0 2rem', height:60, position:'sticky', top:0, zIndex:100,
      background:'rgba(8,8,16,0.85)', backdropFilter:'blur(12px)',
      borderBottom:'1px solid var(--border)',
    }}>
      <button onClick={()=>setPage('home')} style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:900, color:'var(--neon)', background:'none', border:'none', cursor:'pointer', letterSpacing:2, textShadow:'0 0 20px rgba(0,255,136,0.4)' }}>
        DETECTOO
      </button>
      <div style={{ display:'flex', gap:4 }}>
        {links.map(l => (
          <button key={l} onClick={()=>setPage(l)}
            style={{
              fontFamily:'var(--font-mono)', fontSize:11, letterSpacing:2,
              padding:'6px 14px', borderRadius:6, border:'none', cursor:'pointer',
              background: page===l ? 'rgba(0,255,136,0.1)' : 'transparent',
              color: page===l ? 'var(--neon)' : 'var(--muted)',
              textTransform:'uppercase', transition:'all 0.2s',
            }}>
            {l}
          </button>
        ))}
      </div>
    </nav>
  );
}

/* ─── HOME PAGE ───────────────────────────────────────────────── */
function Home({ navigate }) {
  const features = [
    { icon:'◈', title:'PIXEL-LEVEL SCAN',    desc:'EfficientNet-B4 + UNet++ segments every pixel for tamper evidence.' },
    { icon:'◫', title:'SIDE-BY-SIDE VIEW',   desc:'Original image next to isolated forged regions — compare at a glance.' },
    { icon:'◉', title:'MULTI-SIGNAL FUSION', desc:'ELA · DCT · Noise · Edge · Colour — 6 forensic channels, ensemble weighted.' },
    { icon:'◬', title:'INSTANT REPORT',      desc:'Download ZIP with highlight PNG, overlay PNG + full JSON metrics.' },
  ];

  return (
    <div style={{ padding:'4rem 0', position:'relative' }}>
      <div style={{ textAlign:'center', marginBottom:'5rem', position:'relative' }}>
       
        <GlitchText size={72}>DETECTOO</GlitchText>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--muted)', maxWidth:520, margin:'20px auto 0', letterSpacing:1, lineHeight:1.8 }}>
          PIXEL-LEVEL IMAGE FORGERY DETECTION<br />
          
        </div>
        <button
          onClick={() => navigate('detector')}
          style={{
            marginTop:40, fontFamily:'var(--font-mono)', fontSize:13, letterSpacing:3,
            padding:'14px 40px', border:'2px solid var(--neon)', borderRadius:8,
            background:'rgba(108, 177, 145, 0.08)', color:'var(--neon)', cursor:'pointer',
            textTransform:'uppercase', position:'relative', overflow:'hidden',
            boxShadow:'0 0 30px rgba(0,255,136,0.2)', transition:'all 0.25s',
          }}
          onMouseEnter={e => { e.target.style.background='rgba(6, 31, 19, 0.18)'; e.target.style.boxShadow='0 0 50px rgba(12, 40, 28, 0.4)'; }}
          onMouseLeave={e => { e.target.style.background='rgba(3, 19, 11, 0.08)'; e.target.style.boxShadow='0 0 30px rgba(13, 44, 28, 0.2)'; }}
          aria-label="Start forensic analysis"
        >
          ▶ INITIATE SCAN
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:16, maxWidth:900, margin:'0 auto' }}>
        {features.map(({ icon, title, desc }, i) => (
          <div key={title} style={{
            border:'1px solid var(--border)', borderRadius:12, padding:'24px 20px',
            background:'rgba(255,255,255,0.02)', transition:'all 0.25s', cursor:'default',
            animation:`fadeIn 0.5s ease ${i*0.1}s both`,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='var(--neon)'; e.currentTarget.style.background='rgba(224, 234, 231, 0.04)'; e.currentTarget.style.boxShadow='0 0 20px rgba(0,255,136,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='rgba(236, 230, 230, 0.02)'; e.currentTarget.style.boxShadow='none'; }}>
            <div style={{ fontSize:28, color:'var(--neon)', marginBottom:14, filter:'drop-shadow(0 0 8px rgba(0,255,136,0.5))' }}>{icon}</div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--neon)', letterSpacing:2, marginBottom:8 }}>{title}</div>
            <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.7 }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── DETECTOR PAGE ───────────────────────────────────────────── */
function Detector() {
  const { loading, error, result, analyze, reset } = useAnalyze();
  const [file,      setFile]      = useState(null);
  const [src,       setSrc]       = useState(null);
  const [threshold, setThreshold] = useState(0.5);

  const overlayB64   = result?.overlay_b64   || null;
  const highlightB64 = result?.highlight_b64 || null;
  const overlaySrc   = overlayB64   ? `data:image/png;base64,${overlayB64}`   : null;
  const highlightSrc = highlightB64 ? `data:image/png;base64,${highlightB64}` : null;

  const handleFile = useCallback(f => {
    setFile(f);
    const r = new FileReader();
    r.onload = e => { setSrc(e.target.result); analyze(f, threshold); };
    r.readAsDataURL(f);
  }, [analyze, threshold]);

  const handleReset = () => { reset(); setFile(null); setSrc(null); };

  const termLines = loading ? [
    'LOADING EVIDENCE FILE…',
    'RUNNING ERROR LEVEL ANALYSIS (ELA)…',
    'DCT BLOCK-FREQUENCY INCONSISTENCY…',
    'NOISE VARIANCE MAP COMPUTATION…',
    'EDGE ARTEFACT DETECTION…',
    'COLOUR-CHANNEL INCONSISTENCY…',
    'ENSEMBLE FUSION & MORPHOLOGICAL CLEANUP…',
    'BUILDING FORGERY HIGHLIGHT…',
  ] : result ? [
    `VERDICT: ${result.verdict}`,
    `TAMPER COVERAGE: ${result.tamper_percentage.toFixed(2)}%`,
    `CONFIDENCE: ${(result.confidence*100).toFixed(2)}%`,
    `REGIONS DETECTED: ${result.regions?.length ?? 0}`,
    `PROCESSING TIME: ${result.processing_ms}ms`,
    'ANALYSIS COMPLETE.',
  ] : [];

  const handleDownload = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, pageH = 297, margin = 14, col = W - margin * 2;
    const tampered = result.verdict === 'TAMPERED';
    const accentR = tampered ? [255, 51, 68] : [0, 255, 136];
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

    // ── Header bar ──
    doc.setFillColor(8, 8, 15);
    doc.rect(0, 0, W, 22, 'F');
    doc.setFillColor(...accentR);
    doc.rect(0, 22, W, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...accentR);
    doc.text('DETECTOO', margin, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 160);
    doc.text('FORENSIC IMAGE ANALYSIS REPORT', margin + 46, 10);
    doc.text(`GENERATED: ${ts}`, margin + 46, 16);
    doc.text('EfficientNet-B4 + UNet++ · v2.0', W - margin, 10, { align: 'right' });
    doc.text(result.demo_mode ? 'DEMO MODE' : 'LIVE MODEL', W - margin, 16, { align: 'right' });

    let y = 30;

    // ── Verdict block ──
    doc.setFillColor(tampered ? 40 : 8, tampered ? 8 : 30, tampered ? 10 : 16);
    doc.setDrawColor(...accentR);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, col, 28, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...accentR);
    doc.text(result.verdict, margin + 8, y + 14);
    doc.setFontSize(9);
    doc.setTextColor(180, 180, 190);
    doc.text(`CONFIDENCE: ${(result.confidence * 100).toFixed(1)}%`, margin + 8, y + 21);
    doc.text(`TAMPER COVERAGE: ${result.tamper_percentage.toFixed(2)}%`, margin + 8, y + 26);
    doc.setFontSize(10);
    doc.setTextColor(...accentR);
    doc.text(`${result.processing_ms}ms`, W - margin - 8, y + 14, { align: 'right' });
    doc.setFontSize(7);
    doc.setTextColor(130, 130, 140);
    doc.text('PROC TIME', W - margin - 8, y + 20, { align: 'right' });
    y += 36;

    // ── Section helper ──
    const sectionTitle = (title) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...accentR);
      doc.text(title, margin, y);
      doc.setDrawColor(...accentR);
      doc.setLineWidth(0.3);
      doc.line(margin + doc.getTextWidth(title) + 3, y - 0.5, W - margin, y - 0.5);
      y += 6;
    };

    // ── Metrics grid ──
    sectionTitle('SCAN METRICS');
    const metrics = [
      ['FILE',       file?.name || result.original_filename || '—'],
      ['FILE SIZE',  file ? `${Math.round(file.size / 1024)} KB` : `${result.file_size_kb ?? '—'} KB`],
      ['REGIONS',    String(result.regions?.length ?? 0)],
      ['MODEL',      result.demo_mode ? 'DEMO (ELA+DCT+Noise)' : 'EfficientNet-B4 + UNet++'],
      ['THRESHOLD',  result.threshold != null ? String(result.threshold) : '0.50'],
      ['TIMESTAMP',  ts],
    ];
    const cellW = col / 2, cellH = 9;
    metrics.forEach(([k, v], i) => {
      const cx = margin + (i % 2) * cellW;
      const cy = y + Math.floor(i / 2) * cellH;
      doc.setFillColor(18, 18, 28);
      doc.setDrawColor(40, 40, 55);
      doc.setLineWidth(0.2);
      doc.rect(cx, cy, cellW - 2, cellH - 1, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 135);
      doc.text(k, cx + 3, cy + 3.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(220, 220, 230);
      doc.text(String(v).slice(0, 38), cx + 3, cy + 7);
    });
    y += Math.ceil(metrics.length / 2) * cellH + 8;

    // ── Images: Before & After side by side ──
    if (src || overlayB64 || highlightB64) {
      sectionTitle('IMAGE COMPARISON — BEFORE vs AFTER');
      const imgH = 62, imgW = (col - 6) / 2;

      // Before
      if (src) {
        try {
          doc.setDrawColor(0, 200, 100);
          doc.setLineWidth(0.4);
          doc.rect(margin, y, imgW, imgH);
          doc.addImage(src, 'JPEG', margin, y, imgW, imgH, '', 'FAST');
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 220, 110);
          doc.text('ORIGINAL IMAGE', margin + 2, y + imgH - 2);
        } catch (_) {}
      }

      // After (prefer highlight, fallback to overlay)
      const afterSrc = highlightB64
        ? `data:image/png;base64,${highlightB64}`
        : overlayB64 ? `data:image/png;base64,${overlayB64}` : null;
      if (afterSrc) {
        const ax = margin + imgW + 6;
        try {
          doc.setDrawColor(...accentR);
          doc.setLineWidth(0.4);
          doc.rect(ax, y, imgW, imgH);
          doc.addImage(afterSrc, 'PNG', ax, y, imgW, imgH, '', 'FAST');
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...accentR);
          doc.text('TAMPERED REGIONS', ax + 2, y + imgH - 2);
        } catch (_) {}
      }
      y += imgH + 10;
    }

    // ── Tampered regions table ──
    if (result.regions?.length) {
      // New page if needed
      if (y > pageH - 70) { doc.addPage(); y = 18; }
      sectionTitle(`TAMPERED REGIONS (${result.regions.length} DETECTED)`);

      const cols = ['ID', 'BOUNDING BOX', 'AREA (px)', 'CONFIDENCE', 'LABEL'];
      const colW = [14, 52, 28, 28, 24];
      const rowH = 8;

      // Header row
      doc.setFillColor(25, 25, 40);
      doc.rect(margin, y, col, rowH, 'F');
      let cx = margin;
      cols.forEach((c, i) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...accentR);
        doc.text(c, cx + 2, y + 5.5);
        cx += colW[i];
      });
      y += rowH;

      result.regions.forEach((r, ri) => {
        if (y > pageH - 20) { doc.addPage(); y = 18; }
        doc.setFillColor(ri % 2 === 0 ? 14 : 18, ri % 2 === 0 ? 14 : 18, ri % 2 === 0 ? 22 : 28);
        doc.rect(margin, y, col, rowH, 'F');
        const row = [
          `#${String(r.id).padStart(3, '0')}`,
          `[${r.bbox[0]},${r.bbox[1]}]→[${r.bbox[2]},${r.bbox[3]}]`,
          r.area_px.toLocaleString(),
          `${(r.confidence * 100).toFixed(1)}%`,
          r.label,
        ];
        cx = margin;
        row.forEach((val, i) => {
          doc.setFont('helvetica', i === 4 ? 'bold' : 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(i === 4 ? accentR[0] : 200, i === 4 ? accentR[1] : 200, i === 4 ? accentR[2] : 210);
          doc.text(String(val), cx + 2, y + 5.5);
          cx += colW[i];
        });
        y += rowH;
      });
      y += 8;
    }

    // ── Confidence bar ──
    if (y < pageH - 30) {
      sectionTitle('CONFIDENCE BREAKDOWN');
      const bars = [
        { label: 'OVERALL CONFIDENCE', val: result.confidence },
        { label: 'TAMPER COVERAGE',    val: result.tamper_percentage / 100 },
      ];
      bars.forEach(({ label, val }) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(150, 150, 165);
        doc.text(label, margin, y + 4);
        doc.setTextColor(...accentR);
        doc.text(`${(val * 100).toFixed(1)}%`, W - margin, y + 4, { align: 'right' });
        doc.setFillColor(25, 25, 40);
        doc.rect(margin, y + 5.5, col, 4, 'F');
        doc.setFillColor(...accentR);
        doc.rect(margin, y + 5.5, col * val, 4, 'F');
        y += 13;
      });
      y += 4;
    }

    // ── Footer ──
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFillColor(8, 8, 15);
      doc.rect(0, pageH - 10, W, 10, 'F');
      doc.setDrawColor(...accentR);
      doc.setLineWidth(0.3);
      doc.line(0, pageH - 10, W, pageH - 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(90, 90, 100);
      doc.text('DETECTOO v2.0 · EfficientNet-B4 + UNet++ · College of Engineering Pune', margin, pageH - 3.5);
      doc.text(`Page ${p} of ${pages}`, W - margin, pageH - 3.5, { align: 'right' });
    }

    doc.save(`detectoo_report_${Date.now()}.pdf`);
  };

  return (
    <div style={{ maxWidth:1200, margin:'0 auto', padding:'2rem 0' }}>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--neon)', letterSpacing:4, marginBottom:8, opacity:0.6 }}>◈ FORENSIC ANALYSIS MODULE</div>
        <div style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:900, color:'#fff', letterSpacing:1 }}>Image Scanner</div>
      </div>

      {!src && (
        <div style={{ maxWidth:600 }}>
        
          <DropZone onFile={handleFile} disabled={loading} />
        </div>
      )}

      {loading && src && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, alignItems:'start' }}>
          <div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--muted)', letterSpacing:2, marginBottom:12 }}>EVIDENCE FILE</div>
            <ScanningOverlay src={src} />
          </div>
          <div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--muted)', letterSpacing:2, marginBottom:12 }}>SYSTEM LOG</div>
            <Terminal lines={termLines} />
          </div>
        </div>
      )}

      {error && (
        <div role="alert" style={{
          border:'1px solid var(--red)', borderRadius:12, padding:'16px 20px',
          background:'rgba(255,51,68,0.06)', fontFamily:'var(--font-mono)', fontSize:13, color:'var(--red)',
        }}>
          ⚠ {error}
          <button onClick={handleReset} style={{ marginLeft:16, fontFamily:'var(--font-mono)', fontSize:11, color:'var(--red)', background:'none', border:'1px solid var(--red)', borderRadius:4, padding:'4px 12px', cursor:'pointer', letterSpacing:1 }}>RETRY</button>
        </div>
      )}

      {result && src && (
        <div style={{ animation:'fadeIn 0.6s ease' }}>

          {/* ── MAIN COMPARISON VIEWER ── */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--muted)', letterSpacing:2, marginBottom:12 }}>
              IMAGE COMPARISON
            </div>
            <ComparisonViewer
              originalSrc={src}
              highlightSrc={highlightSrc}
              overlaySrc={overlaySrc}
            />
          </div>

          {/* ── VERDICT + METRICS ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
            <div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--muted)', letterSpacing:2, marginBottom:12 }}>VERDICT</div>
              <VerdictBanner result={result} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--muted)', letterSpacing:2, marginBottom:12 }}>METRICS</div>
                <MetricsGrid result={{ ...result, original_filename: file?.name }} />
              </div>
              <div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--muted)', letterSpacing:2, marginBottom:12 }}>SYSTEM LOG</div>
                <Terminal lines={termLines} />
              </div>
            </div>
          </div>

          {/* ── TAMPERED REGIONS ── */}
          {result.regions?.length > 0 && (
            <div style={{ marginBottom:24 }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--muted)', letterSpacing:2, marginBottom:12 }}>
                TAMPERED REGIONS ({result.regions.length})
              </div>
              <RegionMap regions={result.regions} />
            </div>
          )}

          {/* ── ACTION BUTTONS ── */}
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <button onClick={handleDownload}
              style={{ fontFamily:'var(--font-mono)', fontSize:12, letterSpacing:2, padding:'12px 28px', border:'1px solid var(--neon)', borderRadius:8, background:'rgba(0,255,136,0.08)', color:'var(--neon)', cursor:'pointer' }}>
              ⬇ DOWNLOAD PDF REPORT
            </button>
            <button onClick={handleReset}
              style={{ fontFamily:'var(--font-mono)', fontSize:12, letterSpacing:2, padding:'12px 28px', border:'1px solid var(--border)', borderRadius:8, background:'transparent', color:'var(--muted)', cursor:'pointer' }}>
              ↺ NEW SCAN
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes growBar { from { width:0; } }
        @keyframes glitch1 { 0%,92%,100% { opacity:0; } 94%,98% { opacity:0.7; transform:translateX(-3px); } }
        @keyframes glitch2 { 0%,90%,100% { opacity:0; } 92%,96% { opacity:0.7; transform:translateX(3px); } }
        @keyframes blink { 50% { opacity:0; } }
        input[type=range] { height:4px; }
      `}</style>
    </div>
  );
}

/* ─── ABOUT PAGE ───────────────────────────────────────────────── */
function About() {
  const team = [
    { name:'Anisha Sathe',      role:'Algorithm Development & Testing',   email:'anisha.sathe14@gmail.com' },
    { name:'Sneha Pawar',       role:'Lead Developer & Architecture',     email:'snehagpawar03@gmail.com'  },
    { name:'Shravani Sonawane', role:'UI/UX Design & Documentation',      email:'shravanis9493@gmail.com'  },
  ];
  const stack = [
    { k:'ENCODER',   v:'EfficientNet-B4 (ImageNet)' },
    { k:'DECODER',   v:'UNet++ deep supervision'     },
    { k:'LOSS',      v:'BCE + Dice + Focal'          },
    { k:'INPUT',     v:'512 × 512 × 3 channels'     },
    { k:'OUTPUT',    v:'Float32 probability mask'    },
    { k:'LATENCY',   v:'< 2s CPU · ~150ms GPU'      },
    { k:'DEMO SIGS', v:'ELA · DCT · Noise · Edge'   },
    { k:'FUSION',    v:'Ensemble (6-channel weighted)' },
  ];

  return (
    <div style={{ maxWidth:800, margin:'0 auto', padding:'2rem 0' }}>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--neon)', letterSpacing:4, marginBottom:8, opacity:0.6 }}>◈ SYSTEM DOCUMENTATION</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:900, color:'#fff', marginBottom:32 }}>About Detectoo</div>

      <div style={{ border:'1px solid var(--border)', borderRadius:12, padding:'24px', marginBottom:20, background:'rgba(255,255,255,0.02)' }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--neon)', letterSpacing:2, marginBottom:14 }}>MODEL ARCHITECTURE</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:10 }}>
          {stack.map(({k,v}) => (
            <div key={k} style={{ background:'rgba(0,0,0,0.3)', borderRadius:8, padding:'10px 14px', border:'1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--muted)', letterSpacing:2, marginBottom:4 }}>{k}</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--neon)', fontWeight:700 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ border:'1px solid var(--border)', borderRadius:12, padding:'24px', marginBottom:20, background:'rgba(255,255,255,0.02)' }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--neon)', letterSpacing:2, marginBottom:20 }}>DEVELOPMENT TEAM</div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {team.map(({ name, role, email }) => (
            <div key={name} style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 16px', borderRadius:8, border:'1px solid rgba(255,255,255,0.05)', background:'rgba(0,0,0,0.2)' }}>
              <div style={{ width:38, height:38, borderRadius:'50%', background:'rgba(0,255,136,0.1)', border:'1px solid var(--neon)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-mono)', fontSize:13, color:'var(--neon)', fontWeight:700, flexShrink:0 }}>
                {name.split(' ').map(w=>w[0]).join('')}
              </div>
              <div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'#fff', fontWeight:700 }}>{name}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--neon)', opacity:0.7, marginTop:2 }}>{role}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--muted)', marginTop:2 }}>{email}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--muted)', marginTop:16, letterSpacing:1 }}>
          COLLEGE OF ENGINEERING, PUNE — EDUCATIONAL & RESEARCH PROJECT
        </div>
      </div>

      <div style={{ border:'1px solid rgba(255,200,0,0.2)', borderRadius:12, padding:'20px 24px', background:'rgba(255,200,0,0.04)', fontFamily:'var(--font-mono)', fontSize:12, color:'rgba(255,200,0,0.7)', lineHeight:1.8 }}>
        ⚠ DISCLAIMER: No automated detection system is 100% accurate. Results are one factor among several for image authentication. This tool is for educational and research purposes.
      </div>
    </div>
  );
}

/* ─── ROOT APP ────────────────────────────────────────────────── */
export default function App() {
  const [page, setPage] = useState('home');
  const Page = { home: Home, detector: Detector, about: About }[page] || Home;

  return (
    <>
      <style>{`
        :root {
  --primary: #2563eb;   /* blue */
  --accent:  #10b981;   /* green */
  --danger:  #ef4444;   /* red */
  --border:  #e5e7eb;
  --bg:      #050705;
  --text:    #111827;
  --muted:   #6b7280;

  --font-main: Arial, Helvetica, sans-serif;
}
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:var(--bg); color:#fff; min-height:100vh; }
        body::before {
          content:'';
          position:fixed; inset:0; pointer-events:none; z-index:0;
          background-image:
            linear-gradient(rgba(0,255,136,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,136,0.015) 1px, transparent 1px);
          background-size:40px 40px;
        }
        @keyframes glitch1 { 0%,92%,100%{opacity:0;}94%,98%{opacity:.7;transform:translateX(-3px);} }
        @keyframes glitch2 { 0%,90%,100%{opacity:0;}92%,96%{opacity:.7;transform:translateX(3px);} }
        @keyframes blink   { 50%{opacity:0;} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;} }
        @keyframes growBar { from{width:0;} }
        @keyframes spin    { to{transform:rotate(360deg);} }
        @media (max-width:700px) {
          .two-col { grid-template-columns:1fr !important; }
        }
      `}</style>
      <div style={{ position:'relative', zIndex:1 }}>
        <Nav page={page} setPage={setPage} />
        <main style={{ maxWidth:1200, margin:'0 auto', padding:'0 1.5rem', position:'relative' }}>
          <Page navigate={setPage} />
        </main>
        <footer style={{ borderTop:'1px solid var(--border)', padding:'20px', textAlign:'center', fontFamily:'var(--font-mono)', fontSize:10, color:'rgba(255,255,255,0.15)', letterSpacing:2, marginTop:'3rem' }}>
          DETECTOO v2.0 · EFFICIENTNET-B4 + UNET++ · COLLEGE OF ENGINEERING PUNE
        </footer>
      </div>
    </>
  );
}
