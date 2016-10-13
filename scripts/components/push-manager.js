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
import {urlBase64ToUint8Array} from '../third_party/urlBase64ToUint8Array.js';
import {Toast} from './toast';
import {PushControls} from './push-controls';

export class PushManager {

  static get REMOTE_SERVER () {
    return 'https://cds-push.appspot.com/';
  }

  static init () {
    if (Notification.permission === 'denied') {
      return;
    }

    this._waiting = false;
    this._key = null;
    this._keyString = null;
    this._keyHasChanged = false;
    this._subscription = null;
    this._intitialized = false;
    this._init = fetch(PushManager.REMOTE_SERVER)
        .then(r => r.text())
        .then(applicationServerKey => {
          this._keyString = applicationServerKey;
          this._key = urlBase64ToUint8Array(applicationServerKey);
          this._updateUIState();
        })
        .then(_ => idbKeyval.get('appkey'))
        .then(key => {
          if (!key) {
            idbKeyval.set('appkey', this._keyString);
            return;
          }

          this._intitialized = true;
          PushManager.updateCurrentView();
          PushControls.init();

          if (key !== this._keyString) {
            console.warn('Keys have changed... removing subscription');
            this._keyHasChanged = true;
            return this._killAll();
          }
        })
        .catch(err => {
          console.warn('Unable to get push started', err);
        });

    this.updateSubscriptions = this.updateSubscriptions.bind(this);
    this._killAll = this._killAll.bind(this);

    // Array.from(checkBoxes).forEach(cb => {
    //   idbKeyval.get(cb.id).then(value => {
    //     cb.disabled = false;
    //     cb.checked = value;
    //   });
    //   cb.addEventListener('change', this.updateSubscriptions);
    // });

    // killSwitch.addEventListener('click', this._killAll);
  }

  static enableGlobalControls () {
    const notificationTmpl = document.querySelector('#tmpl-notification-area');
    if (!notificationTmpl) {
      return;
    }

    SessionLoader.getData().then(function (sessions) {
      document.body.appendChild(notificationTmpl.content.cloneNode(true));
    });
  }

  static updateCurrentView () {
    if (!this._intitialized) {
      return;
    }

    const notificationButtons =
        Array.from(document.querySelectorAll('.notification-btn'));
    if (!notificationButtons.length) {
      return;
    }

    notificationButtons.forEach(notificationButton => {
      const ID = notificationButton.dataset.id;
      const notificationButtonContent =
          notificationButton.querySelector('.notification-btn__inner');
      if (!ID) {
        return;
      }

      notificationButton.disabled = true;
      notificationButton.hidden = false;

      idbKeyval.get(ID).then(value => {
        notificationButton.disabled = false;
        if (value) {
          notificationButtonContent.textContent = 'Notifications enabled';
          notificationButton.classList.add('notification-btn--enabled');
        } else {
          notificationButtonContent.textContent = 'Notifications disabled';
          notificationButton.classList.remove('notification-btn--enabled');
        }
      });
    });
  }

  static processChange (evt) {
    const node = evt.target || evt;
    if (!node) {
      return;
    }

    if (!node.dataset) {
      return;
    }

    const id = node.dataset.id;
    if (!id) {
      return;
    }

    // Disable any buttons for the item in question
    const buttons = Array.from(document.querySelectorAll(`*[data-id="${id}"]`));
        buttons.forEach(node => {
          node.disabled = true;
        })
    idbKeyval.get(id).then(currentValue => {
      const subscribed = (typeof currentValue === 'undefined') ? true : !currentValue;

      Toast.create('Updating subscriptions...');

      PushManager.updateSubscriptions([{id, subscribed}]).then(_ => {
        Toast.create(subscribed ?
            'Subscribed successfully.' :
            'Unsubscribed successfully.');
        PushManager.updateCurrentView();
        PushControls.updateListing();

        // Re-enable them.
        buttons.forEach(node => {
          // Just check that the node is still there.
          if (!node) {
            return;
          }

          node.disabled = false;
        });

        node.focus();
      });
    });
  }

  static _updateUIState () {
    if (Notification.permission === 'granted') {
      // killSwitch.removeAttribute('hidden');
      // killSwitch.removeAttribute('disabled');
      return;
    }
  }

  static _killAll () {
    return this._getSubscription().then(subscription => {
      const subscriptionJSON = subscription.toJSON();
      const body = {
        name: subscriptionJSON.endpoint
      };

      subscription.unsubscribe();
      this._keyHasChanged = false;

      return fetch(`${PushManager.REMOTE_SERVER}/remove`, {
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify(body)
      }).then(_ => {
        console.log('Removed subscription.');
        return idbKeyval.delete('appkey');
      }).catch(_ => {
        console.log('Failed to remove all.');
      });
    });
  }

  static _getSubscription () {
    return navigator.serviceWorker.ready.then(registration => {
      return registration.pushManager.getSubscription().then(subscription => {
        if (subscription && !this._keyHasChanged) {
          return subscription;
        }

        return idbKeyval.set('appkey', this._keyString).then(_ => {
          return registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this._key
          });
        });
      });
    });
  }

  static updateSubscriptions (values) {
    if (this._waiting) {
      // TODO: update the UI?
      return;
    }

    this._waiting = true;

    return this._getSubscription().then(subscription => {
      const subscriptionJSON = subscription.toJSON();
      const body = {
        name: subscriptionJSON.endpoint,
        subscription: subscriptionJSON
      };

      values.forEach(value => body[value.id] = value.subscribed);

      return fetch(`${PushManager.REMOTE_SERVER}/subscribe`, {
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify(body)
      }).then(_ => {
        console.log('Subscriptions updated');
        this._waiting = false;
      }).catch(_ => {
        console.log('Unable to update subscriptions');
      });
    })
    .then(_ => {
      return Promise.all(
        values.map(v => idbKeyval.set(v.id, v.subscribed))
      );
    });
  }
}
