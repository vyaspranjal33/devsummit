/*
 * Copyright 2018 Google LLC. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */


import * as routes from './routes.js';

export const SPA_GOTO_EVENT = '-spa-goto';


/**
 * @param {!URL} url to find route for, e.g., /devsummit/foo/bar => 'foo'
 * @return {{route: ?string, rest: ?string}}
 */
function splitUrl(url) {
  if (!url.pathname.startsWith(base.pathname)) {
    return {route: null, subroute: null};
  }
  const rest = url.pathname.substr(base.pathname.length);
  const parts = rest.split('/');
  return {
    route: parts[0],
    rest: parts.slice(1).join('/'),
  };
}


// nb. should be in form "/devsummit/"
const base = new URL(document.head.querySelector('base').href);
let activeRoute = splitUrl(window.location).route;


function safeLoad(url, state) {
  let p;
  const split = splitUrl(url);

  if (split.route === activeRoute) {
    if (window.location.href !== url.href) {
      window.history.pushState(state, null, url.href);
    }

    const main = document.body.querySelector('main');
    p = routes.subroute(main, split.route, split.rest);

    ga('send', 'pageview');
  } else {
    p = tryLoad(url, state && state.html || null);
  }

  p.catch((err) => {
    console.warn('couldn\'t load', url, err);
    window.location.href = url.href;  // load manually
  });
  return p;
}


window.addEventListener('popstate', (ev) => safeLoad(window.location, ev.state));


function timeout(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
function rAF() {
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

const menuToggle = document.getElementById('menu__toggle');
const mastheadSection = document.getElementById('masthead');

let tryloadRequest;
async function tryLoad(url, fallback=null) {
  const localRequest = new Object();
  tryloadRequest = localRequest;
  const localSplit = splitUrl(url);
  activeRoute = localSplit.route;
  // nb. ^ above setup happens before any await calls

  document.body.classList.add('fade');
  const fadePromise = timeout(250);  // nb. make equal to cds.less

  let raw;
  try {
    raw = await window.fetch(url).then((response) => response.text());
  } catch (err) {
    if (fallback === null) {
      throw err;  // rethrow, no fallback state
    }
    raw = fallback;  // offline, try fallback
  }

  // just dump the HTML into a tag so we can look for main
  const node = document.createElement('div');
  node.innerHTML = raw;
  const recievedMain = node.querySelector('main');           // main from incoming DOM
  const previousMain = document.body.querySelector('main');  // main to swap out
  const replacementMain = document.createElement('main');    // created main to set .innerHTML on

  await fadePromise;  // wait for animation to be done

  if (tryloadRequest !== localRequest) {
    return;  // bail out
  }

  // TODO(samthor): steal hue-rotate from new page
  mastheadSection.style.filter = `hue-rotate(0deg)`;

  replacementMain.innerHTML = recievedMain.innerHTML;
  previousMain.parentNode.replaceChild(replacementMain, previousMain);
  const upgradeResult = routes.upgrade(replacementMain, localSplit.route).then(() => {
    return routes.subroute(replacementMain, localSplit.route, localSplit.rest);
  });

  await rAF();
  await timeout(34);  // two-ish frames
  await upgradeResult;

  if (tryloadRequest !== localRequest) {
    return;  // bail out
  }

  document.body.classList.remove('fade');
  document.scrollingElement.scrollTop = 0;  // TODO: animate

  const state = {html: raw};
  if (window.location.href !== url.href) {
    window.history.pushState(state, null, url.href);
  }
  ga('send', 'pageview');
}


function clickHandler(ev) {
  if (ev.shiftKey || ev.ctrlKey || ev.metaKey) {
    return;
  }
  const t = ev.target.closest('a');
  if (!t) {
    return;
  }
  const url = new URL(t.href);
  if (url.origin !== window.location.origin || !url.pathname.startsWith(base.pathname)) {
    return;
  }

  ev.preventDefault();
  menuToggle.checked = false;  // uncheck menu if mobile nav
  if (url.href === window.location.href) {
    return;  // already here
  }

  safeLoad(url, null);
}


document.body.addEventListener(SPA_GOTO_EVENT, (ev) => {
  const url = new URL(ev.detail, base);
  safeLoad(url, null);
});


(async function preparePage() {
  const main = document.body.querySelector('main');  // main to swap out

  const split = splitUrl(window.location);
  await routes.upgrade(main, split.route);
  await routes.subroute(main, split.route, split.rest);

  // only add click handler after initial prep
  document.body.addEventListener('click', clickHandler);

}()).catch((err) => {
  console.warn('could not prepare page', err);
});
