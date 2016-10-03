#!/usr/bin/env python
#
# Copyright 2016 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
import os
import jinja2
import webapp2
import random
import re
import json
import mimetypes
import hashlib
from datetime import datetime

_SERVICE_WORKER_PATH = 'static/scripts/sw.js'

# Grab the version from the package.json.
version = None
with open('./package.json') as f:
    data = json.load(f)
    version = data["version"]

sessions = None
with open('./static/json/sessions.json') as s:
    sessions = json.load(s)

# Set up the environment.
JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)

def convert_to_class(name):
    """Converts a section name to a CSS class.

    Args:
      name: (string) The section name.

    Returns:
      Returns a CSS class (string) of the section name.
    """
    return re.sub(r"\s", "-", name.lower())


def add_hash(path):
    """Generates a hash from a file.

    Args:
      path: (string) The path to the file to generate the hash from.

    Returns:
      Returns a hash digest (string) of the file.
    """
    blocksize = 32768
    file_hash = hashlib.sha256()
    file_path = re.sub(r'/devsummit/', './', path)

    with open(file_path) as file_to_hash:
        file_buffer = file_to_hash.read(blocksize)
        while (len(file_buffer) > 0):
            file_hash.update(file_buffer)
            file_buffer = file_to_hash.read(blocksize)

    return re.sub(r'(.*?)\.(.*)$', ("\\1.%s.\\2" % file_hash.hexdigest()), path)

def find_session(sessions_info, url):
    """Finds an individual session based off the URL.

    Args:
      url: (string) The URL to use to match the session.

    Returns:
      Returns the session info or none.
    """
    # Try and find the session info.
    for _, day in sessions_info.iteritems():
        for _, session in day.iteritems():
            if "url" not in session:
                continue

            if session["url"] == ('/devsummit/%s' % url):
                return session

    return None

def as_pst(time, date):
    """Converts the datetime to a PST-centric label.

    Args:
      time: (string) The time of day in HH:MM:SS format.
      date: (string) The date in YYYY-mm-dd format.

    Returns:
      Returns the PST label.
    """
    # Try and find the session info.
    date = datetime.strptime('%sT%s' % (date, time), '%Y-%m-%dT%H:%M:%S')
    meridiem = 'AM'
    if date.hour > 12:
      meridiem = 'PM'

    return '%s %s PST' % (date.hour % 12, meridiem)

def as_24hr(time):
    """Converts the time to a 24hr label.

    Args:
      time: (string) The time of day in HH:MM:SS format.

    Returns:
      Returns the PST label.
    """
    return re.sub(r"[^\d]", "", time)[:4]

def get_keys_for_date(sessions_info, date):
    return sorted(sessions_info[date].keys())

JINJA_ENVIRONMENT.filters["add_hash"] = add_hash
JINJA_ENVIRONMENT.filters["convert_to_class"] = convert_to_class
JINJA_ENVIRONMENT.filters["find_session"] = find_session
JINJA_ENVIRONMENT.filters["as_pst"] = as_pst
JINJA_ENVIRONMENT.filters["as_24hr"] = as_24hr
JINJA_ENVIRONMENT.filters["get_keys_for_date"] = get_keys_for_date

class MainHandler(webapp2.RequestHandler):

    def get_template_info(self, url):
        template_info = {
            "path": url,
            "mimetype": (None, None),
            # Static files can be cached for a year, since there are hashes to
            # track changes to files, and so on. And we don't cache HTML.
            "cache": "public, max-age=31536000"
        }

        # If this is not a static file, use a template.
        if re.search(r"^static/", url) is None:
            # Get the template based on the path the person is visiting.
            template = re.search(r"^([^/]+)/?", url)

            if re.search(r"/$", url):
                url = url + "index"

            # For a total non-match we're looking at the root
            if template is None:
                template_info["path"] = "sections/home.html"
            elif re.search(r"sessions", url):
                template_info["path"] = "sections/schedule/session.html"
            else:
                template_info["path"] = "sections/" + url + ".html"

            # HTML files should expire immediately.
            template_info["cache"] = "public, no-cache"

        # Strip off the hash from the path we're looking for.
        template_info["path"] = re.sub(r'[a-f0-9]{64}.', '', template_info["path"])

        # Make a special exception for the Service Worker, since we serve it
        # from /devsummit/sw.js, even though the file lives elsewhere.
        if re.search("sw.js$", url) is not None:
            template_info["path"] = _SERVICE_WORKER_PATH

        template_info["mimetype"] = mimetypes.guess_type(template_info["path"])

        return template_info

    def get(self, url):
        is_partial = self.request.get('partial', None) is not None
        autoplay = self.request.get('autoplay', None) is not None
        template_info = self.get_template_info(url)
        content_type = "text/plain"
        response = {
            "code": 404,
            "content": "URL not found: %s" % url
        }

        if template_info["mimetype"][0]:
            content_type = "%s; charset=utf-8" % template_info["mimetype"][0]

        try:
            template = JINJA_ENVIRONMENT.get_template(template_info["path"])
            response["code"] = 200
            response["content"] = template.render(
                is_partial=is_partial,
                version=version,
                url=url,
                autoplay=autoplay,
                is_live=True,
                sessions=sessions
            )
        except jinja2.TemplateNotFound as template_name:
            print ("Template not found: %s (requested by %s)" %
                  (str(template_name), template_info["path"]))

        # Make an ETag for the content
        etag = hashlib.sha256()
        etag.update(response["content"].encode('utf-8'))

        self.response.status = response["code"]
        self.response.headers["Content-Type"] = content_type
        self.response.headers["ETag"] = etag.hexdigest()
        self.response.headers["Cache-Control"] = template_info["cache"]
        self.response.write(response["content"])

app = webapp2.WSGIApplication([
    ('/devsummit/?(.*)', MainHandler)
], debug=True)
