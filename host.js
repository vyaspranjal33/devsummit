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

const Koa = require('koa');
const serve = require('koa-static');
const mount = require('koa-mount');
const hbs = require('koa-hbs');
const flat = require('./deps/router.js');

const app = new Koa();

// nb. This is superceded by app.yaml in prod, which serves the static folder for us.
app.use(mount('/static', serve('static')));
app.use(mount('/static', serve('dist')));  // nb. app.yaml just refers to cds.css, not the folder

app.use(hbs.middleware({
  viewPath: `${__dirname}/sections`,
  layoutsPath: `${__dirname}/templates`,
  extname: '.html',
}));

app.use(flat(async (ctx, next, path) => {
  switch (path) {
  case 'index':
  case 'schedule':
  case 'location':
  case 'code-of-conduct':
    break;
  default:
    return next();
  }

  const scope = {
    year: 2018,
    layout: 'devsummit',
    ua: 'UA-41980257-1',
    conversion: 935743779,
  };
  await ctx.render(path, scope);
}));

module.exports = app;
