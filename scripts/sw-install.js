/**
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

import {Toast} from './components/toast';
import {PushHandler} from './components/push-handler';

export function installServiceWorker () {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return;
  }

  let currentVersion = null;
  let preventReloadLoop = false;

  navigator.serviceWorker.onmessage = (evt) => {
    if (typeof evt.data.version === 'undefined') {
      return;
    }
    if (currentVersion === null) {
      currentVersion = evt.data.version;  // we didn't have a version, so just set it
      return;
    }

    // The SW tells us its version, so if we're here it's because a new SW has posted it to us.
    const newVersion = evt.data.version;
    const cvParts = currentVersion.split('.');
    const nvParts = newVersion.split('.');

    console.info('Service Worker upgrade from', currentVersion, 'to', newVersion);

    if (cvParts[0] !== nvParts[0]) {
      // The major version changed. Force a reload.
      if (!preventReloadLoop) {
        preventReloadLoop = true;
        window.location.reload();
      }
    } else if (cvParts[1] !== nvParts[1]) {
      // The minor version changed. Show a toast.
      Toast.create('Site updated. Refresh to get the latest!');
    } else if (cvParts[2] !== cvParts[1]) {
      // If the patch version changed, do nothing.
    }
  };

  navigator.serviceWorker.ready.then((registration) => {
    if (!('pushManager' in registration)) {
      return;
    }
    PushHandler.init();
  });

  navigator.serviceWorker.register('/devsummit/sw.js').then((registration) => {
    if (registration.active) {
      registration.active.postMessage('version');
    }

    // We should also start tracking for any updates to the Service Worker.
    registration.onupdatefound = () => {
      console.log('A new Service Worker version has been found... Installing...');

      // If an update is found the spec says that there is a new Service Worker
      // installing, so we should wait for that to complete then show a
      // notification to the user.
      registration.installing.onstatechange = function () {
        if (this.state === 'installed') {
          return console.log('Service Worker updated');
        }
        if (this.state === 'activated') {
          // This will cause the version to be posted to onmessage above, which
          // will reload or show a Toast as appropriate.
          registration.active.postMessage('version');
        }
        console.log('Incoming Service Worker state:', this.state);
      };
    };
  });
}
