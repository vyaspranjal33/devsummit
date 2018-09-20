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

const fs = require('fs');
const flat = require('./deps/router.js');
const hbs = require('koa-hbs');
const Koa = require('koa');
const mount = require('koa-mount');
const policy = require('./deps/policy.js');
const send = require('koa-send');
const serve = require('koa-static');

const app = new Koa();
const isProd = (process.env.NODE_ENV === 'production');

const schedule = require('./schedule.json');

// save policy string
const policyHeader = policy(isProd);

if (isProd) {
  app.use(mount('/res', serve('res')));        // runtime build assets
} else {
  app.use(mount('/static', serve('static')));  // app.yaml serves this in prod
  app.use(mount('/src', serve('src')));        // actual source folder
  app.use(mount('/node_modules', serve('node_modules')));
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

const sections = fs.readdirSync(`${__dirname}/sections`)
    .map((section) => {
      if (section.endsWith('.html')) {
        return section.substr(0, section.length - 5);
      }
    }).filter(Boolean);

app.use(flat(async (ctx, next, path, rest) => {
  if (sections.indexOf(path) === -1) {
    return next();
  }

  if (rest) {
    if (path !== 'schedule') {
      return next();
    }

    // lookup schedule and check ID doesn't start with _
    const data = schedule.sessions[rest];
    if (!data || rest.startsWith('_')) {
      return next();
    }

    ctx.set('Feature-Policy', policyHeader);

    // TODO(samthor): Unify a bit with the other rendering code. Share <head>?
    const sitePrefix = 'https://developer.chrome.com/devsummit';
    const scope = {
      year: 2018,
      prod: isProd,
      ua: 'UA-41980257-1',
      layout: 'amp',
      sitePrefix,
      title: data.name || '',
      description: data.description || '',
      payload: data,
    };
    return await ctx.render('amp-session', scope);
  }

  const scope = {
    year: 2018,
    prod: isProd,
    layout: 'devsummit',
    ua: 'UA-41980257-1',
    conversion: 935743779,
    sourcePrefix,
  };
  ctx.set('Feature-Policy', policyHeader);
  await ctx.render(path, scope);
}));

module.exports = app;
