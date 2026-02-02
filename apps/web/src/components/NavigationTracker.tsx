'use client';

/**
 * Navigation tracking using the TanStack Router pattern.
 *
 * This inline script runs before React hydration to:
 * 1. Ensure history.state.key exists (unique key per history entry)
 * 2. Track __navIndex in history.state (incrementing index)
 * 3. Patch pushState to increment index on forward navigation
 * 4. Patch replaceState to preserve key and index
 * 5. Listen to popstate to detect back (newIndex < currentIndex) vs forward
 * 6. Set window.__navIsBack for synchronous reads during render
 *
 * Why inline script?
 * - Must run before React hydration
 * - Must run before Next.js patches pushState/replaceState
 * - Synchronous execution ensures values are set before any React render
 */
export default function NavigationTracker() {
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: required for synchronous pre-hydration execution
      dangerouslySetInnerHTML={{
        __html: `(function(){
  var s=window.history.state||{};
  if(!s.key)s.key=Math.random().toString(36).slice(2);
  if(s.__navIndex===undefined)s.__navIndex=0;
  window.__navIndex=s.__navIndex;
  window.__navIsBack=false;
  window.history.replaceState(s,'');
  var op=window.history.pushState;
  window.history.pushState=function(d,t,u){
    d=d||{};
    if(!d.key)d.key=Math.random().toString(36).slice(2);
    window.__navIndex++;
    d.__navIndex=window.__navIndex;
    window.__navIsBack=false;
    return op.call(window.history,d,t,u);
  };
  var or=window.history.replaceState;
  window.history.replaceState=function(d,t,u){
    d=d||{};
    var cs=window.history.state||{};
    if(!d.key)d.key=cs.key||Math.random().toString(36).slice(2);
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
