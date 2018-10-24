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

export async function upgrade(node, route) {
  if (route !== 'schedule') {
    return;  // nothing to do
  }

  const hideElement = (ev) => ev.target.hidden = true;
  const allImages = document.querySelectorAll('.session__speakers-image img');
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

function $g(tag, config, children) {
  config = config || null;
  children = children || null;
  var element = document.createElement(tag);

  if (config == null) return element;

  if ('text' in config) {
    element.textContent = config.text;
    delete config['text'];
  }
  if ('id' in config) {
    element.setAttribute('id', config.id)
    delete config['id'];
  }
  if ('class' in config) {
    var classes = config.class.split(' ')
    classes.forEach((className) => {
      element.classList.add(className);
    })
    delete config['class'];
  }

  for (var keyId in config) {
    if (config.hasOwnProperty(keyId)) {
        element.setAttribute(keyId, config[keyId]);
    }
}

  if (children == null) return element;

  children.foreach((child) => {
    element.appendChild(child);
  })

  return element;
}

function formatTime(foo) {
  return foo;
}

function formatDate(foo) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dateEnding = ['st', 'nd', 'rd', 'th'];

  var date = new Date(foo);
  return days[date.getDay()] + ", " + months[date.getMonth()] + " " + date.getDate() + dateEnding[Math.min(date.getDate(), 3)];
}

export async function subroute(node, route, subroute) {
  if (route !== 'schedule') {
    return;  // nothing to do
  }

  if (subroute == '') {
    return;  // nothing to do
  }

  fetch(`schedule.json`).then((result) => {
    return result.json();
  }).then((json) => {
    const session = json.sessions[subroute];
    const base = new URL(document.head.querySelector('base').href);

    var oldBox = document.getElementById('lightbox');
    if (oldBox) oldBox.remove();

    var lightbox = document.createElement('div')
    lightbox.setAttribute('id', 'lightbox');

    var popup = document.createElement('div');
    popup.setAttribute('id', 'popup');
    
    var h1 = $g('h1', { 'text': session.name});
    popup.appendChild(h1);

    var popin = $g('div', { 'id': 'popin'});
    var time = $g('time', {'class': 'datetime-label', 'datetime': 'foobar'});
   
    //var timeLabel = $g('div', {'text': formatTime(session.when)});
    var timeLabel = $g('div', {'class': 'time-label', 'text': session.time_label});
    var dateLabel = $g('div', {'class': 'date-label', 'text': formatDate(session.when)});
    time.appendChild(timeLabel);
    time.appendChild(dateLabel);

    popin.appendChild(time);

    var description = $g('p', {'text': session.description});
    popin.appendChild(description);

    // End
    popup.appendChild(popin);
    
    var grow = $g('div', {'class': 'grow'});
    popup.appendChild(grow);

    var speakerList = $g('ul', {'class': 'speakers'});

    session.speakers.forEach((speaker) => {
      var listItem = $g('li');

      let imageSrc = base.href + `static/images/icons/dino-blue.png`;

      if (speaker.photo_available) {
        imageSrc = base.href + `static/images/speakers/` + speaker.ldap + `.jpg`;
      }

      var img = $g('img', {
        'alt': speaker.name,
        'src': imageSrc,
        'width': 64,
        'height': 64
      });
      listItem.appendChild(img);

      var speakerInfo = $g('div', {'class': 'speaker-info'});      
      if (speaker.link) {
        speakerInfo.innerHTML = `<a href="`+speaker.link+`">` + speaker.name + `</a><span class="role">` + speaker.role + `</span>`;
      } else {
        speakerInfo.innerHTML = speaker.name + `<span class="role">` + speaker.role + `</span>`;
      }
      listItem.appendChild(speakerInfo);

      // End
      speakerList.appendChild(listItem)
    })

    popup.appendChild(speakerList);

    lightbox.appendChild(popup);
    document.body.appendChild(lightbox);

    var darkBox = document.getElementById('darkbox');
    if (darkBox) darkBox.remove();

    var darkbox = document.createElement('div')
    darkbox.setAttribute('id', 'darkbox');

    darkbox.addEventListener('click', () => {
      lightbox.remove();
      darkbox.remove();

      window.history.pushState(null, null, base.href + 'schedule');
    })
    document.body.appendChild(darkbox);
  })
}
