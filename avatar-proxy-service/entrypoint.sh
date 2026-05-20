#!/usr/bin/env sh
set -eu

: "${IMGPROXY_KEY:=}" 
: "${IMGPROXY_SALT:=}"

imgproxy &
IMGPROXY_PID=$!

node src/server.js &
API_PID=$!

trap 'kill ${IMGPROXY_PID} ${API_PID}' INT TERM
wait -n ${IMGPROXY_PID} ${API_PID}
