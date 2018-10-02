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


/**
 * @param {!URL} url to find route for, e.g., /devsummit/foo/bar => 'foo'
 * @return {?string}
 */
function routeForUrl(url) {
  if (!url.pathname.startsWith(base.pathname)) {
    return null;
  }
  const rest = url.pathname.substr(base.pathname.length);
  return rest.split('/')[0];
}

// nb. should be in form "/devsummit/"
const base = new URL(document.head.querySelector('base').href);
let activeRoute = routeForUrl(window.location);

window.addEventListener('popstate', (ev) => {
  const state = ev.state;

  const url = new URL(window.location);
  if (routeForUrl(url) === activeRoute) {
    ga('send', 'pageview');
    return;  // done, route was the same
  }

  tryLoad(url, state && state.html || null).catch((err) => {
    console.warn('couldn\'t popstate to', url, err);
    window.location.href = url.href;  // load manually
  });
});

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
  activeRoute = routeForUrl(url);
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
  const main = node.querySelector('main');

  const localMain = document.body.querySelector('main');
  await fadePromise;  // wait for animation to be done

  if (tryloadRequest !== localRequest) {
    return;  // bail out
  }

  // TODO(samthor): steal hue-rotate from new page
  mastheadSection.style.filter = `hue-rotate(0deg)`;

  localMain.innerHTML = main.innerHTML;
  await rAF();
  await timeout(34);  // two-ish frames

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

document.body.addEventListener('click', (ev) => {
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

  if (routeForUrl(url) === routeForUrl(window.location)) {
    // use existing state, same route
    window.history.pushState(window.history.state, null, url.href);
    ga('send', 'pageview');
    return;  // already here-ish
  }

  tryLoad(url).catch((err) => {
    console.warn('couldn\'t load', url, err)
    window.location.href = t.href;  // load manually
  });
});