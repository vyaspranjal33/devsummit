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

import {idbKeyval} from '../third_party/idb-keyval.js';
import {SessionLoader} from '../session-loader';
import {PushManager} from './push-manager';

export class PushControls {

  static init () {
    const notificationTmpl = document.querySelector('#tmpl-notification-area');
    if (!notificationTmpl) {
      return;
    }

    this._duration = 4000;
    this._startTime = 0;
    this._startScale = 1;
    this._targetScale = PushControls.SCALE_COLLAPSED;
    this._scale = PushControls.SCALE_COLLAPSED;
    this._running = false;

    this._toggleViewVisibility = this._toggleViewVisibility.bind(this);
    this._collapseView = this._collapseView.bind(this);
    this._expandView = this._expandView.bind(this);
    this._trapTabKey = this._trapTabKey.bind(this);
    this._firstTabStop = null;
    this._lastTabStop = null;
    this._list = null;

    SessionLoader.getData().then(sessions => {
      document.body.appendChild(notificationTmpl.content.cloneNode(true));
      this._element = document.querySelector('.notification-area');
      this._content = this._element.querySelector('.notification-content__list');

      this._toggleButton =
          this._element.querySelector('.notification-toggle-button');
      this._panelTitle =
          this._element.querySelector('.notification-content__title');
      this._panelHeader =
          this._element.querySelector('.notification-content__headline');

      this._populateElement(sessions);
      this._addEventListeners();
    });
  }

  static _populateElement(sessions) {
    const notificationTmpl = document.querySelector('#tmpl-notification-item');

    // Format the session time to the local time.
    const formatter = new Intl.DateTimeFormat(undefined,
        {hour: 'numeric', minute: 'numeric', timeZoneName: 'short'});

    if (!notificationTmpl) {
      return;
    }

    sessions.forEach((session, date, vals) => {
      if (!session.url) {
        return;
      }

      const sessionNode = notificationTmpl.content.cloneNode(true);
      const container =
          sessionNode.querySelector('.notification-item__details');
      const title =
          sessionNode.querySelector('.notification-item__breakdown-title');
      const time =
          sessionNode.querySelector('.notification-item__breakdown-time');

      container.dataset.id = session.url;
      title.textContent = session.speaker + ': ' + session.name;
      container.dataset.title = session.speaker + ': ' + session.name;
      time.textContent = formatter.format(date);

      this._content.appendChild(sessionNode);
    });

    this.updateListing();

    const items =
        Array.from(this._element.querySelectorAll('.notification-item__details'));

    if (items.length < 1) {
      return;
    }

    this._firstTabStop = items[0];
    this._lastTabStop = items[items.length - 1];
    this._list = this._element.querySelector('.notification-content__list');
    console.log(this._firstTabStop, this._lastTabStop);
  }

  static updateListing () {
    const items = Array.from(
        this._element.querySelectorAll('.notification-item__details'));

    items.forEach(item => {
      const id = item.dataset.id;
      if (!id) {
        return;
      }

      idbKeyval.get(id).then(value => {
        if (value) {
          item.classList.add('notification-item__details--active');
          item.setAttribute('aria-label', 'Disable notifications for ' +
              item.dataset.title);
        } else {
          item.classList.remove('notification-item__details--active');
          item.setAttribute('aria-label', 'Enable notifications for ' +
              item.dataset.title);
        }
      })
    });
  }

  static _addEventListeners () {
    this._toggleButton.addEventListener('click', this._toggleViewVisibility);
    this._element.addEventListener('click', this._handleClick);
    document.addEventListener('click', this._collapseView);
    window.addEventListener('keydown', this._trapTabKey);
    this._element.addEventListener('transitionend', evt => {
      // Limit this to just one transitionend event.
      if (!evt.target.classList.contains('notification-ripple')) {
        return;
      }

      if (this._element.classList.contains('notification-area--expanded')) {
        this._panelHeader.inert = false;
        this._list.inert = false;
        this._panelTitle.focus();
      } else {
        this._list.inert = true;
        this._panelHeader.inert = true;
        this._toggleButton.focus();
      }
    });
  }

  static _handleClick (evt) {
    evt.stopPropagation();

    let node = evt.target;
    do {
      if (node && node.classList && node.classList.contains('notification-item__details')) {
        PushManager.processChange(node);
        return;
      }
      node = node.parentNode;
    } while (node && node !== this._element);
  }

  static _toggleViewVisibility () {
    if (this._element.classList.contains('notification-area--expanded')) {
      this._collapseView();
    } else {
      this._expandView();
    }
  }

  static _expandView () {
    this._element.classList.add('notification-area--expanded');
  }

  static _collapseView () {
    this._element.classList.remove('notification-area--expanded');
  }

  static _trapTabKey (evt) {
    if (this._element.hasAttribute('inert')) {
      return;
    }

    // Check for TAB key press
    if (evt.keyCode === 9) {
      // SHIFT + TAB
      if (evt.shiftKey) {
        if (document.activeElement === this._firstTabStop) {
          evt.preventDefault();
          this._lastTabStop.focus();
        }
      // TAB
      } else if (document.activeElement === this._lastTabStop) {
        evt.preventDefault();
        this._firstTabStop.focus();
      }
    }

    // ESCAPE
    if (evt.keyCode === 27) {
      this._collapseView();
    }
  }
}
