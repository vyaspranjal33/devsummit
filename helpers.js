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
 * @fileoverview Helpers for Handlebars.
 */

'use strict';

const hbs = require('koa-hbs');
const dateFormat = require('dateformat');

hbs.registerHelper('formatTime', (raw) => {
  const d = new Date(raw);
  if (isNaN(+d)) {
    return '?';
  }
  const pad = (x) => (x < 10 ? `0${x}` : '' + x);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
});

hbs.registerHelper('formatDate', (raw) => {
  const d = new Date(raw);

  if (isNaN(+d)) {
    return '?';
  }
  
  return dateFormat(d, "dddd, mmmm dS");
});

const counters = {};

hbs.registerHelper('counter', (key='', mod=0) => {
  const prev = counters[key];
  const update = (prev === undefined ? 0 : prev + 1);
  counters[key] = update;
  return update % mod;
});

hbs.registerHelper('ifCond', function(v1, v2, options) {
  if(v1 === v2) {
    return options.fn(this);
  }
  return options.inverse(this);
});