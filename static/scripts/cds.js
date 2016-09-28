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
 */function loadScript(a){return new Promise(function(b,c){var d=document.createElement('script');d.src=a,d.onerror=c,d.onload=b,document.head.appendChild(d)})}function loadStyles(a){return new Promise(function(b,c){var d=new XMLHttpRequest;d.returnType='text',d.onload=function(){var f=document.createElement('link');f.rel='stylesheet',f.href=a,document.head.appendChild(f),b()},d.onerror=c,d.open('get',a),d.send()})}function installServiceWorker(){return'serviceWorker'in navigator?void navigator.serviceWorker.register('/devsummit/sw.js').then(function(a){a.onupdatefound=function(){console.log('A new version has been found... Installing...'),a.installing.onstatechange=function(){return'installed'===this.state?console.log('App updated'):void console.log('Incoming SW state:',this.state)}}}):void console.log('Service Worker not supported - aborting')}var initialized=!1;function init(){initialized||(initialized=!0,customElements.define('cds-router',class extends HTMLElement{constructor(){super(),console.log('CDS Router')}connectedCallback(){console.log('CDS Router connected')}disconnectedCallback(){console.log('CDS Router disconnected')}}))}function loadPageStyles(){document.querySelector('link[href="{{ "/devsummit/static/styles/cds.css" | add_hash }}"]')||loadStyles('{{ "/devsummit/static/styles/cds.css" | add_hash }}')}function loadPageScripts(){var a=Promise.resolve();'customElements'in window||(a=a.then(function(){return loadScript('{{ "/devsummit/static/third_party/scripts/custom-elements.min.js" | add_hash }}')},function(){console.warn('Unable to load Custom Elements polyfill')})),a.then(function(){init()}).then(function(){console.log('Loaded')}).catch(function(b){console.warn('Unable to boot'),console.warn(b)})}(function(){installServiceWorker(),loadPageStyles(),loadPageScripts()})();
