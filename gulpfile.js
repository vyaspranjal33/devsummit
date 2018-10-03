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

const del = require('del');
const fs = require('fs');
const gulp = require('gulp');
const autoprefixer = require('gulp-autoprefixer');
const rollup = require('gulp-better-rollup')
const sourcemaps = require('gulp-sourcemaps');
const cleanCSS = require('gulp-clean-css');
const less = require('gulp-less');
const workbox = require('workbox-build');

exports.clean = function clean() {
  return del(['./res']);
}

exports.css = function css() {
  // exclude IE11's broken flexbox
  const browsers = ['last 2 versions', 'not IE <= 11', 'not IE_mob <= 11'];
  return gulp.src(['static/styles/*.less', '!static/styles/_*.less'])
    .pipe(less({rootpath: '../static/_IGNORED_'}))
    .pipe(autoprefixer({browsers}))
    .pipe(cleanCSS())
    .pipe(gulp.dest('./res'));
};

exports.js = function js() {
  // TODO(samthor): Minify.
  const options = {
    cache: false,  // cache clobbers other rollup tasks
  };
  return gulp.src(['src/*.js', '!src/sw.js'])
    .pipe(sourcemaps.init())
    .pipe(rollup(options, {format: 'es'}))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./res'));
};

exports.sw = gulp.series(gulp.parallel(exports.css, exports.js), async function sw() {
  const now = (+new Date).toString(16);

  const contentTransform = (manifest) => {
    const sections = fs.readdirSync('./sections').map((section) => {
      if (section === 'index.html') {
        return './';
      } else if (section.endsWith('.html')) {
        return './' + section.substr(0, section.length - 5);
      }
      return false;
    }).filter(Boolean);
    sections.forEach((section) => {
      manifest.push({
        url: section,
        revision: now,
      });
    });
    return {manifest, warnings: []};
  };

  const globPatterns = [
    'res/*.css',
    'res/*.js',
    'static/images/**',
  ];
  const globIgnores = [
    'static/images/gallery/**',
    'static/images/speakers/**',
    'res/sw.js',
  ];
  const {count, size, warnings} = await workbox.injectManifest({
    swSrc: './src/sw.js',
    swDest: './res/sw.js',
    globDirectory: './',
    globPatterns,
    globIgnores,
    manifestTransforms: [contentTransform],
  });
  if (!count || warnings.length) {
    warnings.forEach((w) => console.warn(w));
    throw new Error(`matched ${count} files in SW generation, ${warnings.length} warnings`)
  }
});

exports.build = gulp.series(exports.clean, gulp.parallel(exports.sw, exports.js, exports.css));
exports.default = exports.build;
