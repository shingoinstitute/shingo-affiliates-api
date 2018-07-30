#!/bin/bash
IMG_NAME="shingo-affiliates-api"
CONT_NAME="shingo-affiliates-api"

if [[ "$MODE" == "dev" ]]; then
  PUBLISH_PORT="${PORT:-8080}"
  TAG="${TAG:-local}"
  NETWORK="${NETWORK:-shingo-dev-net}"
  export NODE_ENV="${NODE_ENV:-development}"
  export LOG_LEVEL="debug"
  export CLIENT_HOST="http://localhost:$PORT"
else
  TAG="${TAG:-latest}"
  NETWORK="${NETWORK:-shingo-net}"
  export SHINGO_REDIS="${SHINGO_REDIS:-shingo-redis}"
  export EMAIL_PASS="${EMAIL_PASS:?Must set EMAIL_PASS}"
fi

export SF_API="${SF_API:-shingo-sf-api}"
export AUTH_API="${AUTH_API:-shingo-auth-api}"

if [[ "$TAG" = "test" ]]; then
  CONT_NAME+="-test"
fi

NAME="${NAME:-$CONT_NAME}"

args=(
  -itd
  --name "$NAME"
  --network "$NETWORK"
  -e EMAIL_PASS
  -e SF_API
  -e AUTH_API
  -e SHINGO_REDIS
  -e NODE_ENV
  -e GLOBAL_PREFIX
  -e LOG_LEVEL
  -e CLIENT_HOST
)

if [[ ! -z "$PUBLISH_PORT" ]]; then
  args+=(-p "$PUBLISH_PORT":80)
fi

docker run "${args[@]}" docker.shingo.org/"$IMG_NAME":"$TAG"
