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
 * @fileoverview Simple router for Koa for single-slug page components.
 */

// slug includes \w and "-"
const sectionRe = /^\/([-\w]*)$/;

module.exports = (mw) => {
  return async (ctx, next) => {
    const validMethod = (ctx.method === 'GET' || ctx.method === 'HEAD');
    if (!validMethod) {
      return next();
    }

    const m = sectionRe.exec(ctx.path);
    if (!m) {
      return next();
    }

    // redirect "/devsummit" => "/devsummit/"
    if (ctx.path === '/' && !ctx.originalUrl.endsWith('/')) {
      return ctx.redirect(ctx.originalUrl + '/');
    }

    if (ctx.fresh) {
      // TODO: we don't set ETags to check this yet
      ctx.status = 304;
      ctx.body = null;
    } else {
      const path = m[1] || 'index';
      await mw.call(this, ctx, next, path);
    }
  };
};
