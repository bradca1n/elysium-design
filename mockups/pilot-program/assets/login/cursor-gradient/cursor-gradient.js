/* ============================================================
   Cursor-following radial gradient — vanilla JS, no dependencies

   How it works:
   - Listens for mouse / touch movement and stores the position as
     a "target" (in % of viewport).
   - Each animation frame, "current" lerps toward "target" with a
     smoothing factor — this creates the soft trailing lag.
   - Updates only CSS custom properties (--mx, --my), so the browser
     doesn't re-parse the full gradient string each frame.
   ============================================================ */

(() => {
  const el = document.getElementById('radial');
  const hint = document.getElementById('hint');
  if (!el) return;

  // Smoothing factor per frame. Lower = more lag/inertia, higher = snappier.
  // 0.12 gives a gentle drift without feeling sluggish.
  // Set to 1.0 for 1:1 cursor tracking with no lag.
  const SMOOTHING = 0.12;

  // Respect users who prefer reduced motion — snap instead of easing.
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let targetX = 50, targetY = 50;
  let currentX = 50, currentY = 50;
  let interacted = false;

  function onMove(clientX, clientY) {
    targetX = (clientX / window.innerWidth)  * 100;
    targetY = (clientY / window.innerHeight) * 100;

    if (!interacted && hint) {
      interacted = true;
      hint.classList.add('hide');
    }

    if (prefersReduced) {
      // Snap directly without animation
      currentX = targetX;
      currentY = targetY;
      el.style.setProperty('--mx', currentX.toFixed(2) + '%');
      el.style.setProperty('--my', currentY.toFixed(2) + '%');
    }
  }

  window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY), { passive: true });

  window.addEventListener('touchmove', e => {
    if (e.touches.length) onMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  // When pointer leaves the window, ease back toward center
  window.addEventListener('mouseleave', () => {
    targetX = 50;
    targetY = 50;
  });

  if (!prefersReduced) {
    function tick() {
      currentX += (targetX - currentX) * SMOOTHING;
      currentY += (targetY - currentY) * SMOOTHING;
      el.style.setProperty('--mx', currentX.toFixed(2) + '%');
      el.style.setProperty('--my', currentY.toFixed(2) + '%');
      requestAnimationFrame(tick);
    }
    tick();
  }
})();
