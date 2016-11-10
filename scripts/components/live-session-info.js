/*!
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

import {SessionLoader} from '../session-loader';

export class LiveSessionInfo {

  static toggle () {
    if (document.querySelector('.live-info')) {
      this._enableUpdates();
    } else {
      this._disableUpdates();
    }
  }

  static _dateAsString (date) {
    return `${
        date.getFullYear()
        }-${
        date.getMonth() + 1
        }-${
        date.getDate()
        }`;
  }

  static _getCurrentSessionIndex (sessionTimeArray) {
    var now = new Date();
    var sessionIndex = null;
    var sessionDateString;
    var nowString = this._dateAsString(now);

    for (var i = 0; i < sessionTimeArray.length; i++) {
      sessionDateString = this._dateAsString(sessionTimeArray[i]);

      // Skip any not-today dates.
      if (sessionDateString !== nowString) {
        continue;
      }

      if (sessionTimeArray[i].getTime() < now.getTime()) {
        sessionIndex = i;
      } else {
        break;
      }
    }

    return sessionIndex;
  }

  static _getNextSessionIndex (sessionTimeArray, currentSessionIndex) {
    var nextSessionIndex = currentSessionIndex + 1;

    if (currentSessionIndex === null &&
        sessionTimeArray.length > 0) {
      // This should be the first session of the day, so we need to find out
      // exactly which day.
      var now = new Date();
      var sessionDateString;
      var nowString = this._dateAsString(now);

      for (var i = 0; i < sessionTimeArray.length; i++) {
        sessionDateString = this._dateAsString(sessionTimeArray[i]);

        // Skip any not-today dates.
        if (sessionDateString !== nowString) {
          continue;
        }

        if (sessionTimeArray[i].getTime() > now.getTime()) {
          return i;
        }
      }

      return 0;
    }

    // If the next session is out past the end of the array, we're done.
    if (nextSessionIndex >= sessionTimeArray.length) {
      return null;
    }

    // Or if it's effectively going to be "tomorrow", same.
    if (sessionTimeArray[currentSessionIndex].getUTCDate() !==
        sessionTimeArray[nextSessionIndex].getUTCDate()) {
      return null;
    }

    return nextSessionIndex;
  }

  static _getNextSessionSwitchTime (sessionTimeArray) {
    var now = new Date().getTime();
    for (var i = 0; i < sessionTimeArray.length; i++) {
      if (sessionTimeArray[i].getTime() > now) {
        return sessionTimeArray[i].getTime() - now;
      }
    }

    return null;
  }

  static _refresh () {
    if (!this._sessions) {
      console.warn('Unable to get session info.');
      return;
    }

    var sessionTimeArray = [];
    if (sessionTimeArray.length === 0) {
      sessionTimeArray = SessionLoader.toArray(this._sessions);
    }

    var currentSessionIndex =
        this._getCurrentSessionIndex(sessionTimeArray);
    var nextSessionIndex =
        this._getNextSessionIndex(sessionTimeArray, currentSessionIndex);

    var currentSessionTime = sessionTimeArray[currentSessionIndex];
    var currentSession = this._sessions.get(currentSessionTime);
    this._setCurrentSessionInfo(currentSession);

    var nextSessionTime = sessionTimeArray[nextSessionIndex];
    var nextSession = this._sessions.get(nextSessionTime);
    this._setNextSessionInfo(nextSessionTime, nextSession);

    this._populateRemainingDayItems(sessionTimeArray);

    var refreshTimeout = this._getNextSessionSwitchTime(sessionTimeArray);
    if (refreshTimeout !== null) {
      // Add a little buffer time on.
      refreshTimeout += 1000;

      var timeInSec = Math.round(refreshTimeout / 1000);
      var timeInMins = timeInSec / 60;

      console.log('Refreshing listing in ' + timeInMins.toFixed(2) + ' mins');

      clearTimeout(this._refreshTimeoutIndex);
      this._refreshTimeoutIndex =
          setTimeout(this._refresh.bind(this), refreshTimeout);
    }
  }

  static _enableUpdates () {
    SessionLoader.getData().then(function (sessions) {
      this._sessions = sessions;
      this._refresh();
    }.bind(this));
  }

  static _setCurrentSessionInfo (sessionInfo) {
    var liveInfoCurrent = document.querySelector('.js-live-info-current');
    if (!liveInfoCurrent) {
      return;
    }

    if (!sessionInfo) {
      liveInfoCurrent.querySelector('.live-info__section').textContent = '';
      liveInfoCurrent.querySelector('.live-info__title').textContent = '';
      liveInfoCurrent.querySelector('.live-info__description').textContent = '';

      // Hide it.
      liveInfoCurrent.setAttribute('aria-hidden', 'true');
      return;
    }

    liveInfoCurrent.removeAttribute('aria-hidden');
    liveInfoCurrent.querySelector('.live-info__section').textContent =
        'Live Now';
    liveInfoCurrent.querySelector('.live-info__title').textContent =
        (sessionInfo.speaker ? sessionInfo.speaker + ': ' : '') +
        sessionInfo.name;
    liveInfoCurrent.querySelector('.live-info__description').textContent =
        sessionInfo.description;
  }

  static _setNextSessionInfo (sessionTime, sessionInfo) {
    var liveInfoNext = document.querySelector('.js-live-info-next');
    if (!liveInfoNext) {
      return;
    }

    if (!sessionInfo) {
      liveInfoNext.querySelector('.live-info__section').textContent = '';
      liveInfoNext.querySelector('.live-info__title').textContent = '';
      liveInfoNext.querySelector('.live-info__time').textContent = '';
      liveInfoNext.querySelector('.live-info__description').textContent = '';

      // Hide it.
      liveInfoNext.setAttribute('aria-hidden', 'true');
      return;
    }

    liveInfoNext.removeAttribute('aria-hidden');
    liveInfoNext.querySelector('.live-info__section').textContent =
        'Up Next...';

    liveInfoNext.querySelector('.live-info__title').textContent =
        (sessionInfo.speaker ? sessionInfo.speaker + ': ' : '') +
        sessionInfo.name;

    // Format the session time to the local time.
    var formatter = new Intl.DateTimeFormat(undefined,
        {hour: 'numeric', minute: 'numeric', timeZoneName: 'short',
        hour12: false});

    liveInfoNext.querySelector('.live-info__time').textContent =
        formatter.format(sessionTime);

    liveInfoNext.querySelector('.live-info__description').textContent =
        sessionInfo.description;
  }

  static _disableUpdates () {
    clearTimeout(this._refreshTimeoutIndex);
  }

  static _populateRemainingDayItems (sessionTimeArray) {
    var comingUp = document.querySelector('.live-coming-up');
    if (!comingUp) {
      return;
    }

    var comingUpList = document.querySelector('.live-coming-up__list');
    var today = new Date();
    var now = today.getTime();
    var sessionTime;
    var sessionTimeString;
    var sessionTimeStringHours;
    var sessionTimeStringMinutes;
    var session;
    var sessionList = [];
    var skipFirstMatchedItem = true;

    for (var i = 0; i < sessionTimeArray.length; i++) {
      sessionTime = sessionTimeArray[i];
      if (sessionTime.getTime() < now) {
        continue;
      }

      // Go past the first available item as this should be listed above.
      if (skipFirstMatchedItem) {
        skipFirstMatchedItem = false;
        continue;
      }

      if (today.getUTCDate() !== sessionTime.getUTCDate()) {
        continue;
      }

      sessionTimeStringHours = (sessionTime.getHours() < 10 ?
          `0${sessionTime.getHours()}` :
          sessionTime.getHours()).toString();
      sessionTimeStringMinutes = (sessionTime.getMinutes() < 10 ?
          `0${sessionTime.getMinutes()}` :
          sessionTime.getMinutes()).toString();

      session = this._sessions.get(sessionTime);
      sessionTimeString = sessionTimeStringHours + sessionTimeStringMinutes;

      // Make a list item for the upcoming session.
      sessionList.push(
        `<li class="live-coming-up__item">
          <time class="live-coming-up__item-time"
                datetime="${sessionTime.toISOString()}">
            ${sessionTimeString}
          </time>
          <a class="live-coming-up__item-description">
            <h3 class="live-coming-up__item-title">
              ${session.name}
            </h3>
            ${
              session.speaker ?
              `<p class="live-coming-up__item-author">${session.speaker}</p>` :
              ''
            }
          </a>
        </li>`);
    }

    if (sessionList.length === 0) {
      comingUpList.innerHTML = '';
      comingUp.classList.add('live-coming-up--empty');
      comingUp.setAttribute('aria-hidden', true);
      return;
    }

    comingUp.classList.remove('live-coming-up--empty');
    comingUp.removeAttribute('aria-hidden');
    comingUpList.innerHTML = sessionList.join('');
  }
}
