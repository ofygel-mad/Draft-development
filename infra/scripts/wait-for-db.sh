#!/usr/bin/env sh
set -eu
until nc -z postgres 5432; do sleep 1; done
