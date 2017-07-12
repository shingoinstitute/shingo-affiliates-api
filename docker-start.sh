#!/bin/bash

TAG=$1
PORT=$2

if [ -z "$1" ]; then
    TAG="local"
fi
if [ -z "$2" ]; then
    PORT=3000;
fi

docker build --no-cache --tag shingo-affiliates-api:${TAG} .

docker kill shingo-affiliates-api
docker rm shingo-affiliates-api

docker run -itd                 \
    --name shingo-affiliates-api    \
    --network shingo-dev-net    \
    --volume $(pwd):/code       \
    shingo-affiliates-api:${TAG}