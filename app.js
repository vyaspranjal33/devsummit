#!/usr/bin/env node
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

'use strict';

const config = Object.freeze({
  PREFIX: 'devsummit',
});

const express = require('express');
const fs = require('fs');

const app = express();

app.get(`/${config.PREFIX}`, (req, res) => {
  if (req.url === `/${config.PREFIX}`) {
    res.redirect(`/${config.PREFIX}/`);
    return;
  }

  const data = fs.readFileSync('index.html');

  res.set('Content-Type', 'text/html');
  res.status(200).send(data).end();
});
// nb. This is superceded by app.yaml in prod, which serves the static folder for us.
app.use(`/${config.PREFIX}/static`, express.static('static'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`App listening on :${PORT}`);
  console.log('Press Ctrl+C to quit.');
});
