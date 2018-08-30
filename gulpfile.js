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

const gulp = require('gulp');
const autoprefixer = require('gulp-autoprefixer');
const cleanCSS = require('gulp-clean-css');
const less = require('gulp-less');
const workbox = require('workbox-build');

exports.css = function css() {
  // exclude IE11's broken flexbox
  const browsers = ['last 2 versions', 'not IE <= 11', 'not IE_mob <= 11'];
  return gulp.src(['static/styles/*.less', '!static/styles/_*.less'])
    .pipe(less({rootpath: '../static/_IGNORED_'}))
    .pipe(autoprefixer({browsers}))
    .pipe(cleanCSS())
  .pipe(gulp.dest('./res'));
};

exports.sw = gulp.series(gulp.parallel(exports.css), async function sw() {
  const globPatterns = [
    'res/*.css',
    'static/images/**',
  ];
  const {count, size, warnings} = await workbox.injectManifest({
    swSrc: './src/sw.js',
    swDest: './res/sw.js',
    globDirectory: './',
    globPatterns,
  });
  if (!count || warnings.length) {
    warnings.forEach((w) => console.warn(w));
    throw new Error(`matched ${count} files in SW generation, ${warnings.length} warnings`)
  }
});

exports.build = gulp.parallel(exports.sw, exports.css);
exports.default = exports.build;
