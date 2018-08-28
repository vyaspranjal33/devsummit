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
 * @fileoverview Exports Koa middleware to serve the Chrome Dev Summit site at '/'.
 */

'use strict';

const Koa = require('Koa');
const serve = require('koa-static');
const mount = require('koa-mount');
const flat = require('./deps/router.js');

const app = new Koa();

app.use(flat(async (path, ctx) => {
  switch (path) {
  case 'index':
  case 'schedule':
  case 'location':
  case 'code-of-conduct':
    ctx.body = 'CoC page';
    break;
  }
}));

// nb. This is superceded by app.yaml in prod, which serves the static folder for us.
app.use(mount('/static', serve('static')));

module.exports = app;
