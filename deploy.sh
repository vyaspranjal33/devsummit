#!/bin/bash

set -eu

gulp
gcloud app deploy --no-promote --project chromedevsummit-site
