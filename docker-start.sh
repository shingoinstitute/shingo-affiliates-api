#!/bin/bash

TAG=$1
PORT=$2

if [ -z "$1" ]; then
    TAG="local"
fi
if [ -z "$2" ]; then
    PORT=3000;
fi

docker build --tag shingo-affiliates-api:${TAG} .

docker kill shingo-affiliates-api
docker rm shingo-affiliates-api

docker run -itd                     \
    --name shingo-affiliates-api    \
    --network shingo-dev-net        \
    --volume $(pwd):/code           \
    --publish 8080:80               \
    -e EMAIL_PASS=${EMAIL_PASS}     \
    -e CLIENT_HOST='http://localhost:4200' \
    shingo-affiliates-api:${TAG}