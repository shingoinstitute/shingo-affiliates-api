#!/bin/bash

TAG="${TAG:-latest}"
NETWORK="${NETWORK:-shingo-net}"
IMG_NAME="shingo-affiliates-api"
CONT_NAME="shingo-affiliates-api"
PORT=${PORT:-80}
SF_API=${SF_API:-shingo-sf-api}
AUTH_API=${AUTH_API:-shingo-auth-api}
SHINGO_REDIS=${SHINGO_REDIS:-shingo-redis}

EMAIL_PASS=${EMAIL_PASS:?"Must set EMAIL_PASS"}

if [[ "$TAG" = "test" ]]; then
  CONT_NAME+="-test"
fi

NAME="${NAME:-$CONT_NAME}"

docker run -itd                     \
    --name "$NAME"                  \
    --network "$NETWORK"            \
    --publish "$PORT":80            \
    -e EMAIL_PASS="$EMAIL_PASS"     \
    -e SF_API="$SF_API"             \
    -e AUTH_API="$AUTH_API"         \
    -e SHINGO_REDIS="$SHINGO_REDIS" \
    docker.shingo.org/"$IMG_NAME":"$TAG"
