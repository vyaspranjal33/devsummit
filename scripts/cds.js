/*!
 *
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

import {VideoHandler} from './components/video-handler';
import {SideNav} from './components/side-nav';
import {LiveSessionInfo} from './components/live-session-info';
import {LiveBanner} from './components/live-banner';

var initialized = false;
export function init () {
  if (initialized) {
    return;
  }
  initialized = true;
  SideNav.init();
  LiveSessionInfo.toggle();
  LiveBanner.toggle();

  class CDS {
    constructor () {
      this._isSwapping = false;
      this._request = null;
      this._spinnerTimeout = 0;
      this._onChanged = this._onChanged.bind(this);
      this._onLoad = this._onLoad.bind(this);
      this._onClick = this._onClick.bind(this);
      this._onSwapComplete = this._onSwapComplete.bind(this);
      this._newContent = null;

      this._masthead = document.querySelector('.masthead');
      this._mastheadTitle = document.querySelector('.masthead__title');
      this._mastheadGraphic = document.querySelector('.masthead__graphic');
      this._mastheadDivider =
          document.querySelector('.masthead-underlay__divider');
      this._pageContent = document.querySelector('.page-content');
      this._liveBanner = document.querySelector('.header__live-stream');
      this._videoPlayer = document.querySelector('.youtube-video-player');

      this.addEventListeners();
      document.body.classList.add('animatable');
    }

    _onLoad (evt) {
      // Bail if this request has been superseded by another, more recent req.
      if (evt.target !== this._request) {
        return;
      }

      this._newContent = evt.target.response;
    }

    _onChanged (evt) {
      VideoHandler.toggleSmallPlayerIfNeeded();
      this._updateNavLinks();
      this._showSpinner();

      Promise.all([
        this._hideAreas(),
        this._loadNewPath()
      ]).then(function () {
        if (this._isSwapping) {
          return;
        }
        this._isSwapping = true;

        this._hideSpinner();
        this._swapContents();
      }.bind(this)).then(_ => {
        // Restore scroll positioning if needed.
        if (evt && evt.state) {
          window.scrollTo(0, evt.state.scrollY);
        }
      });
    }

    _showSpinner () {
      this._spinnerTimeout = setTimeout(function () {
        this._masthead.classList.add('masthead--spinner');
      }.bind(this), 1000);
    }

    _hideSpinner () {
      clearTimeout(this._spinnerTimeout);
      this._masthead.classList.remove('masthead--spinner');
    }

    _loadNewPath () {
      return new Promise(function (resolve, reject) {
        var path = window.location.pathname + window.location.search;
        this._request = new XMLHttpRequest();
        this._request.responseType = 'document';
        this._request.onload = function (evt) {
          this._onLoad(evt);
          resolve();
        }.bind(this);
        this._request.onerror = reject;
        this._request.open('get', path);
        this._request.send();
      }.bind(this));
    }

    _updateNavLinks () {
      var navLinks = document.querySelectorAll('nav a');
      var navHref;
      var navLink;

      for (var i = 0; i < navLinks.length; i++) {
        navLink = navLinks[i];
        navHref = new URL(navLink.href).href;

        // Assume this nav item isn't active.
        navLink.parentNode.classList.remove('menu__nav-item--active');

        // And if it matches, then yay!
        if (navHref === window.location.href) {
          navLink.parentNode.classList.add('menu__nav-item--active');
        }
      }
    }

    _hideAreas () {
      return new Promise(function (resolve, reject) {
        document.body.classList.add('hide-areas');
        this._mastheadGraphic.addEventListener('transitionend', resolve);
      }.bind(this));
    }

    _swapContents () {
      var newTitle = this._newContent.querySelector('.masthead__title');
      var newMasthead =
          this._newContent.querySelector('.masthead');
      var newMastheadGraphic =
          this._newContent.querySelector('.masthead__graphic');
      var newMastheadDivider =
          this._newContent.querySelector('.masthead-underlay__divider');
      var newPageContent = this._newContent.querySelector('.page-content');
      var newPageStyles =
          this._newContent.querySelector('style[id^="styles"]');
      var newLiveBanner =
          this._newContent.querySelector('.header__live-stream');
      var newPageVideo =
          this._newContent.querySelector('.youtube-video-player');

      this._mastheadGraphic.removeEventListener('transitionend',
          this._onTransitionEnd);

      if (newTitle) {
        this._mastheadTitle.innerHTML =
            newTitle.innerHTML;
        this._mastheadTitle.removeAttribute('aria-hidden');
        this._mastheadTitle.focus();
      } else {
        this._mastheadTitle.innerHTML = '';
        this._mastheadTitle.setAttribute('aria-hidden', 'true');
        this._pageContent.focus();
      }

      // Take a copy of the page-specific styles if they don't already exist.
      if (!document.querySelector('#' + newPageStyles.id)) {
        document.head.appendChild(newPageStyles.cloneNode(true));
      }

      var liveStreamLinkVisible =
          newLiveBanner.classList.contains('visible');

      VideoHandler.handle(newPageVideo);

      this._mastheadGraphic.innerHTML =
          newMastheadGraphic.innerHTML;

      this._pageContent.innerHTML =
          newPageContent.innerHTML;

      // Change over the CSS classes.
      this._pageContent.className = newPageContent.className;
      this._masthead.className = newMasthead.className;
      this._liveBanner.className = newLiveBanner.className;

      // Uses classList because changing className on SVG is read-only.
      if (newMastheadDivider.classList.contains('masthead-underlay__divider--invisible')) {
        this._mastheadDivider.classList.add(
            'masthead-underlay__divider--invisible');
      } else {
        this._mastheadDivider.classList.remove(
            'masthead-underlay__divider--invisible');
      }

      if (liveStreamLinkVisible) {
        this._liveBanner.removeAttribute('aria-hidden');
      } else {
        this._liveBanner.setAttribute('aria-hidden', 'true');
      }

      // Double rAF to allow all changes to take hold.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          document.body.classList.remove('hide-areas');

          // Wait another frame before allowing other requests through.
          requestAnimationFrame(this._onSwapComplete);
        }.bind(this));
      }.bind(this));
    }

    _onSwapComplete () {
      this._isSwapping = false;
      LiveSessionInfo.toggle();
      LiveBanner.toggle();
    }

    go (url) {
      if (window.location.href === url) {
        return;
      }

      var state = {
        scrollY: window.scrollY
      };

      // Update the current state to have the window.scrollY value.
      window.history.replaceState(state, null, window.location.href);

      // Now redirect to the new URL.
      window.history.pushState(null, null, url);
      return this._onChanged();
    }

    _onClick (evt) {
      var node = evt.target;
      do {
        if (node === null || node.nodeName.toLowerCase() === 'a') {
          break;
        }
        node = node.parentNode;
      } while (node);

      if (node) {
        var isInternal = /devsummit/.test(node.href);
        var isYouTube = /youtube\.com/.test(node.href);

        if (isInternal) {
          evt.preventDefault();
          this.go(node.href);
          SideNav.close();
        } else if (isYouTube) {
          evt.preventDefault();
          VideoHandler.beginPlayback(node.href);
        }
      }
    }

    addEventListeners () {
      document.addEventListener('click', this._onClick);
      window.addEventListener('popstate', this._onChanged);
    }
  }

  /* eslint-disable no-new */
  new CDS();
  /* eslint-enable no-new */
}

