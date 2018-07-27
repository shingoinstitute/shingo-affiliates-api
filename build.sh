#!/bin/bash

TAG="${TAG:-latest}"
IMG_NAME="shingo-affiliates-api"

HELP="USAGE: build.sh [OPTIONS]
Build and optionally push an image
Accepts all arguments that 'docker build' accepts

OPTIONS:
    -p|--push       Push image to registry after build
    -t|--tag TAG    Set image tag
    -h|--help       Show this help
"

build() {
    docker build --tag docker.shingo.org/"$IMG_NAME":"$TAG" "$@" .
    if [[ "$PUSH" = true ]]; then
        docker login docker.shingo.org
        docker push docker.shingo.org/"$IMG_NAME":"$TAG"
    fi
}

read_build_args() {
    while [[ $# -gt 0 ]]; do
        BUILD_ARGS+=("$1")
        shift
    done
}

PUSH=false
BUILD_ARGS=()
while [[ $# -gt 0 ]]; do
    arg="$1"
    case $arg in
        -p|--push)
            PUSH=true
            ;;
        -t|--tag)
            shift
            TAG="$1"
            ;;
        -h|--help)
            echo "$HELP"
            exit 0
            ;;
        --)
            shift
            read_build_args "$@"
            shift $#
            ;;
        *)
            echo "$HELP"
            exit 1
            ;;
    esac
    shift
done

build "${BUILD_ARGS[@]}"
