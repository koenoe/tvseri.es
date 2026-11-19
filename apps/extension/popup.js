// The popup: the services and their state, and each one's consent screen.
// No sign-in leaves the browser until Continue; before that a full code is
// only checked.

import {
  DECLINED_KEY,
  disclosure,
  isCode,
  livePending,
  PENDING_KEY,
  recordConsent,
} from './consent.js';
import {
  PRODUCTION_ORIGIN,
  RESULTS_KEY,
  SERVICE_KEY,
  SITE_ORIGIN,
  updateResults,
} from './origins.js';
import { SERVICE_IDS, SERVICES } from './services.js';

const form = document.querySelector('#link');
const input = document.querySelector('#code');
const otp = document.querySelector('#otp');
const slots = [...otp.querySelectorAll('.sl')];
const submit = document.querySelector('#submit');
const cancel = document.querySelector('#cancel');
const status = document.querySelector('#status');
const home = document.querySelector('#home');
const list = document.querySelector('#services');
const view = document.querySelector('#service');
const back = document.querySelector('#back');
const title = document.querySelector('#service-title');
const pair = document.querySelector('#pair');
const sentence = document.querySelector('#disclosure');
const destination = document.querySelector('#destination');
const done = document.querySelector('#done');
const again = document.querySelector('#again');
const doneBody = document.querySelector('#done-body');
const account = document.querySelector('#account');
const logos = [...document.querySelectorAll('[data-logo]')];

const DIGITS = 4;

// Keyed on the reasons the site forwards; anything else gets the generic line
const message = (reason, { name, site: signIn }) =>
  ({
    'bad-code':
      'That code isn’t valid, or it expired. Get a new one on tvseri.es.',
    'rate-limited': 'Too many tries. Wait a minute, then get a new code.',
    'signed-out': `This browser isn’t signed in to ${name}. Sign in on ${signIn}, then try again.`,
    'test-read-failed': `${name} didn’t answer the check. Get a new code on tvseri.es and try again in a moment.`,
    unavailable: 'tvseri.es couldn’t be reached. Try again shortly.',
  })[reason];
const GENERIC_MESSAGE = 'Couldn’t connect. Try again.';

// The live region stays in the DOM and only its text changes, so screen
// readers announce it
const say = (text, tone) => {
  status.textContent = text;
  status.className = tone ? `note ${tone}` : 'note';
};

// The service open in the popup, null on the list
let service = null;
const config = () => SERVICES[service];

let pending = null;

let busy = false;

// The site's check of the code on screen (`reply` null while it runs).
// Continue waits for an account, so a code someone else sent never links
// unseen
let verdict = null;
const codeKey = () => `${service}:${input.value}`;
const named = () => verdict?.key === codeKey() && verdict.reply?.ok === true;

const readResults = async () => {
  const stored = await chrome.storage.local.get(RESULTS_KEY);
  return stored[RESULTS_KEY]?.[SITE_ORIGIN] ?? {};
};

/** The site's request if still live; a dead one is dropped */
const readPending = async () => {
  const { [PENDING_KEY]: stored } =
    await chrome.storage.session.get(PENDING_KEY);
  const live = livePending(stored);
  if (stored && !live) {
    await chrome.storage.session.remove(PENDING_KEY);
  }
  return live;
};

const CHEVRON =
  '<svg aria-hidden="true" class="chev" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>';

const tile = (id) => {
  const box = document.createElement('span');
  box.className = 'tile';
  const logo = document.createElement('img');
  logo.alt = '';
  logo.src = SERVICES[id].logo;
  box.append(logo);
  return box;
};

const paintList = async () => {
  const results = await readResults();
  list.replaceChildren(
    ...SERVICE_IDS.map((id) => {
      const result = results[id];
      const row = document.createElement('li');
      const button = document.createElement('button');
      button.className = 'row';
      button.type = 'button';
      button.value = id;
      const text = document.createElement('span');
      text.className = 'txt';
      const name = document.createElement('span');
      name.className = 'nm';
      name.textContent = SERVICES[id].name;
      const state = document.createElement('span');
      state.className = result?.ok ? 'st on' : 'st';
      // This browser's own record: with no tvseri.es session to ask, it never
      // claims a live connection
      state.textContent = result?.ok
        ? ['Linked from this browser', result.profile]
            .filter(Boolean)
            .join(' · ')
        : 'Not linked yet';
      text.append(name, state);
      button.append(tile(id), text);
      button.insertAdjacentHTML('beforeend', CHEVRON);
      row.append(button);
      return row;
    }),
  );
};

const paint = () => {
  const value = input.value;
  const focused = document.activeElement === input;
  const at = focused ? Math.min(value.length, DIGITS - 1) : -1;
  slots.forEach((slot, index) => {
    const digit = value.charAt(index);
    slot.firstChild.textContent = digit;
    slot.classList.toggle('f', Boolean(digit));
    slot.classList.toggle('on', index === at);
    slot.classList.toggle('cr', index === at && !digit);
  });
  submit.disabled = !isCode(value) || !named();
};

// Built from text nodes: the username is the site's, never markup
const showVerdict = () => {
  const reply = verdict?.reply;
  account.className = reply === null ? 'body acct wait' : 'body acct';
  if (!verdict) {
    account.replaceChildren();
  } else if (!reply) {
    account.textContent = 'Checking the code…';
  } else if (reply.ok) {
    const name = document.createElement('b');
    name.textContent = reply.username;
    account.replaceChildren('Links to ', name, ' on tvseri.es');
  } else {
    account.replaceChildren();
    otp.classList.add('bad');
    input.setAttribute('aria-invalid', 'true');
    say(message(reply.reason, config()) ?? GENERIC_MESSAGE, 'warn');
  }
  paint();
};

// Not cached, so a refusal (the site down, a limit) is asked again with the
// next code or when the popup reopens
const checkCode = async () => {
  const key = codeKey();
  const code = input.value;
  verdict = { key, reply: null };
  showVerdict();
  const reply = await chrome.runtime
    .sendMessage({ code, service, type: 'check' })
    .catch(() => null);
  // The code or the service changed meanwhile
  if (verdict?.key !== key) {
    return;
  }
  verdict = { key, reply: reply ?? { ok: false, reason: 'unavailable' } };
  showVerdict();
};

const checkIfFull = () => {
  // The same code pasted over itself: its answer stands, shown again as the
  // input cleared the note
  if (isCode(input.value) && verdict?.key === codeKey()) {
    showVerdict();
    return;
  }
  if (isCode(input.value)) {
    checkCode();
    return;
  }
  verdict = null;
  showVerdict();
};

// Right after a link (`fresh`) nothing has synced yet: the first sync is the
// viewer's, from its card (How far back, then Sync now); nightly runs follow
const showDone = (profile, fresh) => {
  pair.hidden = true;
  done.hidden = false;
  back.hidden = false;
  title.textContent = `${config().name} is linked`;
  const whose = profile ? `${profile}’s history` : 'Your history';
  doneBody.textContent = fresh
    ? 'Now pick how far back on its card on tvseri.es and run the first sync. After that it syncs every night.'
    : `${whose} syncs to tvseri.es every night once its first sync has run. Check it or disconnect it in Settings → Connected apps on tvseri.es.`;
  say('', null);
};

// A code from the site arrives filled in with focus on the title, so the
// sentence is read first and no stray Enter agrees
const showPair = () => {
  done.hidden = true;
  pair.hidden = false;
  back.hidden = true;
  title.textContent = `Connect ${config().name}?`;
  sentence.textContent = disclosure(service);
  // The dev copy says where it sends, so it's never mistaken for the real
  // one. Emptied, not only hidden: the code field's description reads it
  const elsewhere = SITE_ORIGIN !== PRODUCTION_ORIGIN;
  destination.textContent = elsewhere
    ? `Sends to ${new URL(SITE_ORIGIN).host}`
    : '';
  destination.hidden = !elsewhere;
  otp.classList.remove('bad');
  input.removeAttribute('aria-invalid');
  input.value = pending?.code ?? '';
  if (pending) {
    title.focus();
  } else {
    input.focus();
  }
  verdict = null;
  checkIfFull();
};

// A pending request for the service wins over its linked state
const open = async (id) => {
  service = id;
  for (const node of logos) {
    node.src = config().logo;
  }
  home.hidden = true;
  view.hidden = false;
  say('', null);
  await chrome.storage.local.set({ [SERVICE_KEY]: id });
  const request = await readPending();
  pending = request?.service === id ? request : null;
  const result = (await readResults())[id];
  if (!pending && result?.ok) {
    showDone(result.profile, false);
    title.focus();
    return;
  }
  showPair();
};

// Repainted, as a link may have just landed
const showHome = async () => {
  const from = service;
  service = null;
  pending = null;
  verdict = null;
  view.hidden = true;
  home.hidden = false;
  await chrome.storage.local.remove(SERVICE_KEY);
  await paintList();
  list.querySelector(`button[value='${from}']`)?.focus();
};

const init = async () => {
  // Else the service left open last, so a code typed after a trip to the
  // site lands where it was
  const request = await readPending();
  if (request) {
    await open(request.service);
    return;
  }
  const { [SERVICE_KEY]: last } = await chrome.storage.local.get(SERVICE_KEY);
  if (Object.hasOwn(SERVICES, last ?? '')) {
    await open(last);
    return;
  }
  await showHome();
};

// A request from the site while the popup is already open takes the screen;
// one the site cancelled leaves it
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'session' || !(PENDING_KEY in changes) || busy) {
    return;
  }
  const request = livePending(changes[PENDING_KEY].newValue);
  if (request) {
    open(request.service);
    return;
  }
  if (pending && changes[PENDING_KEY].oldValue?.code === pending.code) {
    pending = null;
    showHome();
  }
});

list.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (button) {
    open(button.value);
  }
});
back.addEventListener('click', () => {
  if (!busy) {
    showHome();
  }
});

// The cancelled code is kept as declined, so the card waiting on it hears so
cancel.addEventListener('click', async () => {
  if (busy) {
    return;
  }
  if (pending) {
    await chrome.storage.session.set({
      [DECLINED_KEY]: { at: Date.now(), code: pending.code },
    });
    await chrome.storage.session.remove(PENDING_KEY);
  }
  await showHome();
});

input.addEventListener('input', () => {
  input.value = input.value.replace(/\D/g, '').slice(0, DIGITS);
  otp.classList.remove('bad');
  input.removeAttribute('aria-invalid');
  say('', null);
  checkIfFull();
});
input.addEventListener('focus', paint);
input.addEventListener('blur', paint);

again.addEventListener('click', async () => {
  await updateResults((results) => {
    const forSite = { ...results[SITE_ORIGIN] };
    delete forSite[service];
    return { ...results, [SITE_ORIGIN]: forSite };
  });
  say('', null);
  showPair();
});

// A failed link keeps the site's request, so the viewer can sign in to the
// service and try again
const link = async () => {
  if (busy || !isCode(input.value) || !named()) {
    return;
  }
  busy = true;
  submit.setAttribute('aria-busy', 'true');
  submit.textContent = 'Connecting…';
  say('', null);
  await recordConsent(service);
  const reply = await chrome.runtime
    .sendMessage({ code: input.value, service, type: 'link' })
    .catch(() => null);
  busy = false;
  submit.removeAttribute('aria-busy');
  submit.textContent = 'Continue';
  const result = reply || { ok: false, reason: 'no-reply' };
  if (result.ok) {
    if (pending) {
      await chrome.storage.session.remove(PENDING_KEY);
      pending = null;
    }
    showDone(result.profile, true);
    title.focus();
    return;
  }
  // The code died after its check (spent, expired, revoked)
  if (result.reason === 'bad-code') {
    verdict = { key: codeKey(), reply: result };
    showVerdict();
    return;
  }
  otp.classList.add('bad');
  input.setAttribute('aria-invalid', 'true');
  say(message(result.reason, config()) ?? GENERIC_MESSAGE, 'warn');
};

form.addEventListener('submit', (event) => {
  event.preventDefault();
  link();
});

init();
