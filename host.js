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

const flat = require('./deps/router.js');
const hbs = require('koa-hbs');
const Koa = require('koa');
const mount = require('koa-mount');
const send = require('koa-send');
const serve = require('koa-static');

const app = new Koa();
const isProd = (process.env.NODE_ENV === 'production');

if (isProd) {
  app.use(mount('/res', serve('res')));        // runtime build assets
} else {
  app.use(mount('/static', serve('static')));  // app.yaml serves this in prod
  app.use(mount('/src', serve('src')));        // actual source folder
}

// Serve sw.js from top-level.
const sourcePrefix = isProd ? 'res' : 'src';
app.use(async (ctx, next) => {
  if (ctx.path === '/sw.js') {
    return send(ctx, `${sourcePrefix}/sw.js`);
  }
  return next();
});

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
  case 'community-guidelines':
    break;
  default:
    return next();
  }

  const scope = {
    year: 2018,
    prod: isProd,
    layout: 'devsummit',
    ua: 'UA-41980257-1',
    conversion: 935743779,
    sourcePrefix,
  };
  await ctx.render(path, scope);
}));

module.exports = app;
