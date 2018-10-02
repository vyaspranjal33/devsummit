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
 * @fileoverview Schedule utility.
 */

'use strict';

function formatDate(d) {
  const pad = (x) => (x < 10 ? `0${x}` : '' + x);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function comparisonSort(key) {
  return (a, b) => {
    const ak = key(a);
    const bk = key(b);

    if (ak < bk) {
      return -1;
    } else if (ak > bk) {
      return +1;
    }
    return 0;
  };
}

module.exports = {
  days(schedule) {
    const out = {};
    if (!schedule || !schedule.sessions) {
      return out;
    }

    const sessions = schedule.sessions;
    for (const id in sessions) {
      const data = sessions[id];

      const when = new Date(data.when);
      if (isNaN(+when)) {
        continue;
      }

      const key = 'd' + formatDate(when);
      if (!(key in out)) {
        out[key] = [];
      }
      out[key].push({id, data});
    }

    const cmp = comparisonSort((x) => x.data.when);
    for (const key in out) {
      out[key].sort(cmp);
    }

    return out;
  },
};