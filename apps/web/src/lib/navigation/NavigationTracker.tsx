/**
 * Navigation direction from a history-state index, as React Router
 * (`history.state.idx`) and TanStack Router (`__TSR_index`) do: on popstate,
 * an index lower than the current one is Back.
 *
 * The script gives every entry a key and an index (`pushState` increments
 * it, `replaceState` keeps both), sets `window.__navIsBack` on popstate for
 * synchronous reads during render, and opens every new page at the top.
 *
 * A new page opens at the top: a push or replace that changes the pathname
 * scrolls the window to 0, after the commit that wrote the URL (a
 * microtask). Next's own scroll isn't enough: it only brings the new *leaf*
 * segment into view, and only when its top isn't already in the viewport.
 * When the old page hides (Activity), the document shrinks and the browser
 * clamps the offset, so a page that sits under its layout's own top (the
 * Settings hero, the profile's identity and tabs) often counts as visible and
 * nothing moves: you land mid-page. A changed parallel slot can hold Next's
 * scroll too (the profile's `@tail`, at the bottom on a phone). Next writes
 * the URL in the commit's insertion effects and scrolls in its layout
 * effects, so the microtask runs after both and before paint; and after the
 * push, so the old entry keeps its offset for Back. Left alone: Back and
 * Forward (the browser has already moved the URL, so the router's write
 * changes no pathname; the browser restores the offset), a query-only change
 * (`?episode=`, `?history`, `?season=`, the diary's months: Next's
 * `scroll={false}` there still holds) and a URL with a hash (Next scrolls to
 * the anchor).
 *
 * An inline script, not an effect: it has to run before hydration and
 * before Next patches pushState/replaceState.
 *
 * @see https://github.com/remix-run/react-router/blob/main/packages/react-router/lib/router/history.ts
 * @see https://github.com/TanStack/router/blob/main/packages/history/src/index.ts
 */
export const NAVIGATION_TRACKER_SCRIPT = `(function(){
  var k=function(){return Math.random().toString(36).slice(2)};
  var s=window.history.state||{};
  if(!s.key)s.key=k();
  if(s.__navIndex===undefined)s.__navIndex=0;
  window.__navIndex=s.__navIndex;
  window.__navIsBack=false;
  window.history.replaceState(s,'');
  var top=function(){window.scrollTo({behavior:'instant',left:0,top:0})};
  var write=function(f,d,t,u){
    var p=window.location.pathname;
    var r=f.call(window.history,d,t,u);
    if(window.location.pathname!==p&&!window.location.hash)queueMicrotask(top);
    return r;
  };
  var op=window.history.pushState;
  window.history.pushState=function(d,t,u){
    d=d||{};
    if(!d.key)d.key=k();
    window.__navIndex++;
    d.__navIndex=window.__navIndex;
    window.__navIsBack=false;
    return write(op,d,t,u);
  };
  var or=window.history.replaceState;
  window.history.replaceState=function(d,t,u){
    d=d||{};
    var cs=window.history.state||{};
    if(!d.key)d.key=cs.key||k();
    if(d.__navIndex===undefined)d.__navIndex=window.__navIndex;
    return write(or,d,t,u);
  };
  window.addEventListener('popstate',function(){
    var n=(window.history.state&&window.history.state.__navIndex)||0;
    window.__navIsBack=n<window.__navIndex;
    window.__navIndex=n;
  });
})();`;

export default function NavigationTracker() {
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: must run synchronously, before hydration and before Next patches pushState
      dangerouslySetInnerHTML={{ __html: NAVIGATION_TRACKER_SCRIPT }}
    />
  );
}
