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

/**
 * @fileoverview Generates session JSON from source TSV files.
 */

'use strict';

const request = require('request');
const fs = require('fs');
const parse = require('csv-parse/lib/sync')
const assert = require('assert')
const md5 = require('md5');
const path = require('path');
 
const inputSessionsFilePath = "./sessions.tsv";
const inputSpeakersFilePath = "./speakers.tsv";
const outputFilePath = "./schedule.json";

// if (process.argv.length <= 2) {
//     console.log("Usage: .tsv file");
//     process.exit(-1);
// }
// const filename = process.argv[2];

const sessionsText = fs.readFileSync(inputSessionsFilePath, "utf8");
const speakersText = fs.readFileSync(inputSpeakersFilePath, "utf8");

const sessions = parse(sessionsText, {
    columns: true,
    skip_empty_lines: true,
    delimiter: '\t',
    quote: null
})

const speakers = parse(speakersText, {
    columns: true,
    skip_empty_lines: true,
    delimiter: '\t',
    quote: null
})

const output = {};
output.sessions = {};
output.speakers = {};

for (const i in speakers) {
    let speaker = speakers[i];
    let speakerId = md5(speaker.ldap);
    
    let profilePath = path.join('static/images/speakers', speaker.ldap + '.jpg');

    if (fs.existsSync(profilePath)) {
        console.log(profilePath, 'exists');
        let newPath = path.join('static/images/speakers', speakerId + '.jpg');

        fs.renameSync(profilePath, newPath);

    } else {
        console.log(profilePath, 'nope');
    }

    speaker.ldap = speakerId;

    output.speakers[speakerId] = speaker;
}

//console.log(output.speakers);

for(const i in sessions) {
    let session = sessions[i];

    let sessionSpeakers = [];
    if (session.internal_speakers) {
        sessionSpeakers = session.internal_speakers.split(',');
    }
    
    output.sessions[session.key] = {
        "day_index": session.day_index,
        "name": session.name,
        "theme": session.theme,
        "time_label": session.time_label,
        "when": session.when,
       "description": session.description,
        "speakers": []
    }

    for(const i in sessionSpeakers) {
        let speakerLdap = sessionSpeakers[i];
        let speakerId = md5(speakerLdap);
        output.sessions[session.key].speakers.push(
            output.speakers[speakerId]
        )
    }
}

console.log(output);
fs.writeFileSync(outputFilePath, JSON.stringify(output, null, 4));
