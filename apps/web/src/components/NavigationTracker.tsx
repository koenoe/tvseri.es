'use client';

/**
 * Navigation direction tracking using history state index.
 *
 * This pattern is used by major routing libraries:
 * - React Router uses `history.state.idx` (@remix-run/router)
 * - TanStack Router uses `history.state.__TSR_index`
 *
 * Both calculate direction on popstate: delta = newIndex - oldIndex
 * - delta < 0 = back navigation
 * - delta > 0 = forward navigation
 *
 * Our implementation adds a pre-hydration inline script that:
 * 1. Ensures history.state has a unique key and index
 * 2. Patches pushState to increment index on forward navigation
 * 3. Patches replaceState to preserve key and index
 * 4. Listens to popstate to detect back (newIndex < currentIndex) vs forward
 * 5. Sets window.__navIsBack for synchronous reads during render
 *
 * Why inline script instead of useEffect?
 * - Must run BEFORE React hydration (synchronous)
 * - Must run BEFORE Next.js patches pushState/replaceState
 * - Enables pre-hydration DOM updates (BackgroundStyle) to prevent flicker
 *
 * @see rendering-hydration-no-flicker - Pre-hydration script pattern
 * @see https://github.com/remix-run/react-router/blob/main/packages/react-router/lib/router/history.ts
 * @see https://github.com/TanStack/router/blob/main/packages/history/src/index.ts
 */
export default function NavigationTracker() {
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: required for synchronous pre-hydration execution
      dangerouslySetInnerHTML={{
        __html: `(function(){
  var k=function(){return Math.random().toString(36).slice(2)};
  var s=window.history.state||{};
  if(!s.key)s.key=k();
  if(s.__navIndex===undefined)s.__navIndex=0;
  window.__navIndex=s.__navIndex;
  window.__navIsBack=false;
  window.history.replaceState(s,'');
  var op=window.history.pushState;
  window.history.pushState=function(d,t,u){
    d=d||{};
    if(!d.key)d.key=k();
    window.__navIndex++;
    d.__navIndex=window.__navIndex;
    window.__navIsBack=false;
    return op.call(window.history,d,t,u);
  };
  var or=window.history.replaceState;
  window.history.replaceState=function(d,t,u){
    d=d||{};
    var cs=window.history.state||{};
    if(!d.key)d.key=cs.key||k();
    if(d.__navIndex===undefined)d.__navIndex=window.__navIndex;
    return or.call(window.history,d,t,u);
  };
  window.addEventListener('popstate',function(){
    var n=(window.history.state&&window.history.state.__navIndex)||0;
    window.__navIsBack=n<window.__navIndex;
    window.__navIndex=n;
  });
})();`,
      }}
    />
  );
}
