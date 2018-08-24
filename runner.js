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

const ngrok = require('ngrok');
const process = require('process');
const { spawn } = require('child_process');

console.log(`env travis: `, process.env.TRAVIS_EVENT_TYPE);
//console.log(`env variables: `, process.env);

async function foobar() {
    const url = await ngrok.connect(5000);
    
    console.log("ngrok:", url);
    
    const child = spawn('node', ['app.js']);
    child.stdout.on('data', (data) => {
        console.log(`app.js child stdout:\n${data}`);
        let logText = String(data);

        if (logText.startsWith('App listening on')) {
            console.log('Server is running. Calling Lighthouse CI.');

            const lighthouse = spawn('./node_modules/.bin/lighthouse-ci', [url]);
            lighthouse.stdout.on('data', (data) => {
                console.log(`lighthouse child stdout:\n${data}`);
                let lighthouseText = String(data);

                if (lighthouseText.startsWith('Lighthouse CI score')) {
                    process.exit(0);
                }
            });

            lighthouse.on('close', (code) => {
                console.log(`lighthouse child exited with code: ${code}`);
                process.exit(code);
            });
        }
    });

    child.on('close', (code) => {
        console.log(`app.js child exited with code: ${code}`);
        process.exit(code);
    });
}

var result = foobar();

result.catch((e) => {
    console.error(e);
    process.exit(1);
})
