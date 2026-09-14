// Opening splash for member pages, ported verbatim from the Kallistis website
// (src/routes/__root.tsx there): pulsing gold logo over a sliding progress bar.
// Members reach this page from a home-screen icon, so the full page load IS the
// app launching — showing the same splash the website uses makes the two feel
// like one product.
//
// Deliberately plain <style>/<script> rather than a React component: both are
// server-rendered into the initial HTML and run while the browser is still
// parsing, which is the only way to cover the gap before React hydrates. A
// client component would mount too late to hide anything.

const PRELOADER_CSS = `
#kfa-preloader{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1.25rem;background:#0a0a0a;color:#fff;height:100vh;height:100dvh;width:100vw;transition:opacity 300ms ease,transform 300ms ease;will-change:opacity,transform}
#kfa-preloader.kfa-hide{opacity:0;transform:scale(1.02);pointer-events:none}
#kfa-preloader .kfa-logo{width:120px;height:120px;object-fit:contain;animation:kfaPulse 1.6s ease-in-out infinite;filter:drop-shadow(0 0 30px rgba(212,175,55,.35))}
#kfa-preloader .kfa-bar{position:relative;width:160px;height:2px;background:rgba(255,255,255,.08);overflow:hidden;border-radius:2px}
#kfa-preloader .kfa-bar::after{content:"";position:absolute;inset:0;width:40%;background:linear-gradient(90deg,transparent,#D4AF37,transparent);animation:kfaSlide 1.2s ease-in-out infinite}
#kfa-preloader .kfa-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
html.kfa-loading,html.kfa-loading body{overflow:hidden!important}
@keyframes kfaPulse{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.06);opacity:1}}
@keyframes kfaSlide{0%{transform:translateX(-120%)}100%{transform:translateX(360%)}}
@media (prefers-reduced-motion: reduce){
  #kfa-preloader .kfa-logo{animation:none}
  #kfa-preloader .kfa-bar::after{animation:kfaSlide 2s linear infinite}
  #kfa-preloader{transition:opacity 200ms linear}
  #kfa-preloader.kfa-hide{transform:none}
}
`;

// MIN keeps the splash on screen long enough to read as intentional rather than
// a flicker; MAX guarantees it always clears, even if an image never resolves.
const PRELOADER_JS = `
(function(){
  try{
    document.documentElement.classList.add('kfa-loading');
    var start = performance.now();
    var MIN = 600, MAX = 3500;
    var done = false;
    function hide(){
      if(done) return; done = true;
      var el = document.getElementById('kfa-preloader');
      if(!el){ document.documentElement.classList.remove('kfa-loading'); return; }
      var elapsed = performance.now() - start;
      var wait = Math.max(0, MIN - elapsed);
      setTimeout(function(){
        el.classList.add('kfa-hide');
        setTimeout(function(){
          el.style.display='none';
          document.documentElement.classList.remove('kfa-loading');
        }, 320);
      }, wait);
    }
    function whenReady(cb){
      if(document.readyState === 'complete') return cb();
      window.addEventListener('load', cb, { once:true });
    }
    whenReady(function(){
      var fonts = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
      var imgs = Array.from(document.images || []).filter(function(i){
        var r = i.getBoundingClientRect();
        return r.top < (window.innerHeight || 800) && i.src;
      }).map(function(i){
        if(i.decode) return i.decode().catch(function(){});
        if(i.complete) return Promise.resolve();
        return new Promise(function(res){ i.addEventListener('load', res, {once:true}); i.addEventListener('error', res, {once:true}); });
      });
      Promise.all([fonts].concat(imgs)).then(hide).catch(hide);
    });
    setTimeout(hide, MAX);
  }catch(e){
    var el = document.getElementById('kfa-preloader');
    if(el) el.style.display='none';
    document.documentElement.classList.remove('kfa-loading');
  }
})();
`;

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRELOADER_CSS }} />
      <div
        id="kfa-preloader"
        role="status"
        aria-live="polite"
        aria-label="Φόρτωση"
        suppressHydrationWarning
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/kfa-logo.png"
          alt=""
          className="kfa-logo"
          width={120}
          height={120}
        />
        <div className="kfa-bar" aria-hidden="true" />
        <span className="kfa-sr">Φόρτωση…</span>
      </div>
      <script dangerouslySetInnerHTML={{ __html: PRELOADER_JS }} />
      {/* The splash is dismissed by script, so without JS it would cover the
          page forever. Hide it up front in that case. */}
      <noscript>
        <style dangerouslySetInnerHTML={{ __html: "#kfa-preloader{display:none}" }} />
      </noscript>
      {children}
    </>
  );
}
