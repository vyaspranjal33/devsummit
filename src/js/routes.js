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

import * as format from './format.js';
import {SPA_GOTO_EVENT} from './spa.js';

export async function upgrade(node, route) {
  if (route !== 'schedule') {
    return;  // nothing to do
  }

  const hideElement = (ev) => ev.target.hidden = true;
  const allImages = document.querySelectorAll('.speakers-image img');
  Array.from(allImages).forEach((img) => {
    if (!img.complete) {
      // not yet loaded, wait for error
      img.addEventListener('error', hideElement);
    } else if (!img.naturalWidth) {
      // already loaded, but failed to load
      img.hidden = true;
    }
  });
}

/**
 * Templating helper.
 * @param {string} tag element to create with this name
 * @param {!Object<string, string>} config properties to attach
 * @return {!HTMLElement}
 */
function $g(tag, config) {
  const element = document.createElement(tag);
  if (!config) {
    return element;
  }

  if ('text' in config) {
    element.textContent = config.text;
    delete config['text'];
  }
  if ('class' in config) {
    element.className = config.class;
    delete config['class'];
  }
  for (const keyId in config) {
    if (config[keyId] != null) {  // explicit !=
      element.setAttribute(keyId, config[keyId]);
    }
  }

  return element;
}

let scheduleFetchCache;
function scheduleFetch() {
  if (!scheduleFetchCache) {
    scheduleFetchCache = window.fetch('./schedule.json').then((r) => r.json());
  }
  return scheduleFetchCache;
}

let activeLightbox;

function generateSessionPopup(popup, session) {
  const base = new URL(document.head.querySelector('base').href);  

  popup.classList.add('session-popup');
  
  popup.querySelector('h1').textContent = session.name;

  const popin = $g('article');
  const time = $g('time', {'class': 'datetime-label', 'datetime': session.when});

  const timeLabel = $g('div', {'class': 'time-label', 'text': session.time_label});
  const dateLabel = $g('div', {'class': 'date-label', 'text': format.date(session.when)});
  time.appendChild(timeLabel);
  time.appendChild(dateLabel);

  popin.appendChild(time);

  const description = $g('p', {'text': session.description});
  popin.appendChild(description);

  popup.appendChild(popin);
  
  const grow = $g('div', {'class': 'grow'});
  popup.appendChild(grow);

  const speakerList = $g('ul', {'class': 'speakers'});
  popup.appendChild(speakerList);
  session.speakers.forEach((speaker) => {
    const listItem = $g('li');
    const speakerImage = $g('div', {'class': 'speakers-image'});
    speakerImage.classList.add('dino-' + ~~(Math.random() * 4));

    if (speaker.photo_available) {
      const imageSrc = `./static/images/speakers/${speaker.ldap}.jpg`;
      const img = $g('img', {
        'alt': speaker.name,
        'src': imageSrc,
      });
      speakerImage.appendChild(img);
    }
    listItem.appendChild(speakerImage);

    const speakerInfo = $g('div', {'class': 'speaker-info'});
    speakerInfo.appendChild($g(speaker.bio ? 'a' : 'span', {
      'href': `${base}schedule/${speaker.ldap}`,
      'text': speaker.name,
    }));
    speakerInfo.appendChild($g('span', {'class': 'role', 'text': `${speaker.role}, ${speaker.company}`}));

    listItem.appendChild(speakerInfo);

    speakerList.appendChild(listItem)
  });
}

function generateSpeakerPopup(popup, speaker) {
  popup.classList.add('speaker-popup');

  const h1 = popup.querySelector('h1');
  h1.textContent = speaker.name;

  const popin = $g('article');

  const speakerImage = $g('div', {'class': 'speakers-image'});
  speakerImage.classList.add('dino-' + ~~(Math.random() * 4));

  if (speaker.photo_available) {
    const imageSrc = `./static/images/speakers/${speaker.ldap}.jpg`;
    const img = $g('img', {
      'alt': speaker.name,
      'src': imageSrc,
    });
    speakerImage.appendChild(img);

    popin.appendChild(speakerImage);
  }

  const titleCompany = $g('div', {'class': 'speaker-role', 'text': `${speaker.role}, ${speaker.company}`});
  popin.appendChild(titleCompany);

  const description = $g('p', {'text': speaker.bio});
  popin.appendChild(description);

  if (speaker.link) {
    const externalLink = $g('a', {
      'text': `Follow ${speaker.name}`,
      'target': '_blank',
      'rel': 'noopener',
      'href': speaker.link || null,
    });
    popin.appendChild(externalLink);
  }

  popup.appendChild(popin);
}

export async function subroute(node, route, subroute) {
  activeLightbox && activeLightbox.remove();

  if (route !== 'schedule') {
    return;  // nothing to do
  }

  if (subroute === '') {
    return;  // nothing to do, we've cleaned up lightbox
  }

  const json = await scheduleFetch();

  const lightbox = $g('div', {'id': 'lightbox'});
  const popup = $g('div', {'id': 'popup'});
  lightbox.appendChild(popup);
  
  const h1 = $g('h1');
  popup.appendChild(h1);

  const session = json.sessions[subroute];
    
  if (!session) {
    const speaker = json.speakers[subroute];

    if (!speaker) {
      throw new Error('session/speaker not found');
    }

    generateSpeakerPopup(popup, speaker);
  } else {
    generateSessionPopup(popup, session);
  }
  
  const closeHelper = () => {
    const ev = new CustomEvent(SPA_GOTO_EVENT, {detail: './schedule', bubbles: true});
    document.body.dispatchEvent(ev);
  };

  const closeButton = $g('button', {'class': 'close'});
  closeButton.addEventListener('click', (ev) => closeHelper());
  h1.appendChild(closeButton);
  
  document.body.appendChild(lightbox);

  activeLightbox = lightbox;

  lightbox.addEventListener('click', (ev) => {
    if (ev.target === lightbox) {
      closeHelper();
    }
  });
}
