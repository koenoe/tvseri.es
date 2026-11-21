/**
 * The one inline script of the sign-in pages, served verbatim:
 * a `String.raw` with no interpolation, so a regex like `\D` reaches the
 * browser as written (a plain template literal would turn it into `D`). Its
 * hash is in the CSP (assets.ts) and `client.test.ts` runs it in jsdom
 * against the rendered pages.
 *
 * Everything it adds is an enhancement: without it every action is a plain
 * form post or link. It adds: the `js` class (the code field painted as six
 * slots), the inline email check, busy buttons, the code field's digit
 * filter, auto-submit and in-page wrong-code handling, the resend cooldown,
 * and Not now's `history.back()`. After a wrong code the slots keep the
 * digits (red, drawn selected) but the field itself starts empty: wherever
 * a click puts the caret, typing or pasting is a new code, and nothing is
 * sent until six new digits are in. The server's page still carries the
 * digits in the field, so without the script they stay to correct. A
 * verify answer replaces the body in place; when it's another page (the
 * start page after too many tries) its style comes along. It runs
 * in <head>, so the `js` class is set before the first paint. Forms carry an input named `action` (OpenAuth's
 * field), so `form.action` is that input: read the attribute instead.
 */
export const CLIENT_SCRIPT = String.raw`(function(){
var d=document,N=6,COOL=30,RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/,sent=0,timer=0;
d.documentElement.classList.add('js');
function q(s){return d.querySelector(s)}
function say(t){var l=q('#live');if(l)l.textContent=t}
function busy(b,v){if(!b)return;if(v){b.setAttribute('data-v',v);b.setAttribute('aria-busy',String(v==='busy'))}else{b.removeAttribute('data-v');b.removeAttribute('aria-busy')}}
function nn(){var a=q('.a-nn');if(!a)return;a.addEventListener('click',function(e){try{if(history.length>1&&d.referrer&&new URL(d.referrer).origin===new URL(a.href).origin){e.preventDefault();history.back()}}catch(x){}})}
function providers(){d.querySelectorAll('a[data-busy]').forEach(function(a){a.addEventListener('click',function(e){if(a.getAttribute('data-v')){e.preventDefault();return}busy(a,'busy');say(a.getAttribute('data-busy'))})})}
function email(f){var i=q('#em'),box=i.parentNode,m=q('#em-m'),t=m.querySelector('span'),b=f.querySelector('.a-btn');
function bad(on){box.classList.toggle('bad',on);i.setAttribute('aria-invalid',String(on));m.hidden=!on;t.textContent=on?t.getAttribute('data-t'):''}
if(i.autofocus&&i.value){i.focus();i.select()}i.addEventListener('input',function(){if(!m.hidden)bad(false)});
f.addEventListener('submit',function(e){if(b.getAttribute('data-v')){e.preventDefault();return}var v=i.value.trim();if(!RE.test(v)){e.preventDefault();bad(true);i.focus();return}i.value=v;i.readOnly=true;busy(b,'busy');say('Sending code')})}
function code(f){var pg=q('.a-pg'),i=q('#code'),o=i.parentNode,sl=o.querySelectorAll('.a-sl'),b=f.querySelector('.a-btn'),old='',last;
function st(s){if(s)pg.setAttribute('data-state',s);return pg.getAttribute('data-state')}
if(st()==='wrong'){old=i.value;i.value=''}last=i.value;
function fresh(){st('typing');o.classList.remove('bad','shake');old=''}
function paint(pop){var s=st(),w=s==='wrong',v=w?old:i.value,fo=d.activeElement===i,on=fo&&!w&&s!=='checking'&&s!=='ok'?Math.min(v.length,N-1):-1;
o.classList.toggle('sel',w&&fo&&v.length>0);
for(var k=0;k<N;k++){var c=sl[k],ch=v.charAt(k),x=c.firstChild;if(x.textContent!==ch)x.textContent=ch;if(k===pop&&ch){x.classList.remove('pop');void x.offsetWidth;x.classList.add('pop')}c.classList.toggle('f',!!ch);c.classList.toggle('on',k===on);c.classList.toggle('cr',k===on&&!ch)}}
function submit(){var s=st();if(s==='checking'||s==='ok')return;if(i.value.length<N){i.focus();return}st('checking');busy(b,'busy');paint(-1);say('Signing in');
fetch(f.getAttribute('action'),{method:'POST',body:new FormData(f),credentials:'same-origin',redirect:'manual',headers:{'x-tvs-js':'1'}}).then(function(r){
if(r.type==='opaqueredirect'){f.submit();return}
if((r.headers.get('content-type')||'').indexOf('json')>-1)return r.json().then(function(j){st('ok');busy(b,'ok');say('Signed in. Taking you back.');location.replace(j.next)});
return r.text().then(function(h){var n=new DOMParser().parseFromString(h,'text/html'),os=d.querySelector('style'),ns=n.querySelector('style');d.title=n.title;if(os&&ns&&os.textContent!==ns.textContent)os.textContent=ns.textContent;d.body.replaceWith(d.adoptNode(n.body));init()})}).catch(function(){f.submit()})}
i.addEventListener('input',function(){var s=st();if(s==='checking'||s==='ok'){i.value=last;return}
var v=i.value.replace(/\D/g,'').slice(0,N),grew=v.length>last.length;if(i.value!==v)i.value=v;if(s==='wrong')fresh();last=v;paint(grew?v.length-1:-1);if(v.length===N)submit()});
i.addEventListener('keydown',function(e){if(st()==='wrong'&&(e.key==='Backspace'||e.key==='Delete')){fresh();paint(-1)}});
['focus','blur','select','keyup','click'].forEach(function(t){i.addEventListener(t,function(){paint(-1)})});
f.addEventListener('submit',function(e){e.preventDefault();submit()});
if(!i.disabled)i.focus();paint(-1)}
function cool(){var r=q('#res');if(!r)return;if(r.hasAttribute('data-fresh'))sent=Date.now();var b=q('#rsb');
b.addEventListener('click',function(e){if(b.getAttribute('aria-disabled')==='true')e.preventDefault()});clearTimeout(timer);tick()}
function tick(){var b=q('#rsb'),w=q('#res-in');if(!b||!w)return;var left=COOL-Math.floor((Date.now()-sent)/1000);
if(sent&&left>0){b.setAttribute('aria-disabled','true');w.hidden=false;w.lastChild.textContent='0:'+(left<10?'0':'')+left;timer=setTimeout(tick,1000-(Date.now()-sent)%1000)}else{b.removeAttribute('aria-disabled');w.hidden=true}}
function init(){nn();providers();var e=q('#ef');if(e)email(e);var c=q('#cf');if(c)code(c);cool()}
addEventListener('pageshow',function(e){if(!e.persisted)return;d.querySelectorAll('[data-v]').forEach(function(b){busy(b)});var i=q('#em');if(i)i.readOnly=false});
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init);else init();
})();`;
