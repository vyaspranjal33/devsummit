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

const NAME = 'CDS';
const VERSION = '{{version}}';

self.oninstall = _ => {
  self.skipWaiting();
};

self.onactivate = _ => {
  self.clients.claim();
};

self.onfetch = evt => {
  // TODO(paullewis): Ensure only non-hashed versions of files are cached and
  // used for matching in the fetch.

  evt.respondWith(fetch(evt.request));
};
