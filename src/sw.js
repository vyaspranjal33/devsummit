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

const VERSION = '10.0.2';

importScripts('https://storage.googleapis.com/workbox-cdn/releases/3.4.1/workbox-sw.js');

workbox.precaching.precacheAndRoute([]);
workbox.googleAnalytics.initialize();

self.addEventListener('install', (ev) => {
  ev.waitUntil(self.skipWaiting());  // become active immediately
});

self.addEventListener('activate', (ev) => {
  self.clients.claim();
});

self.addEventListener('message', (ev) => {
  // for CDS 2017 and before
  if (ev.data === 'version') {
    ev.source.postMessage({
      version: VERSION,
    });
  } else {
    console.debug('got unhandled message', ev.data);
  }
});