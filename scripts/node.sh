#!/bin/sh
if [ -f "$HOME"/.nvm/nvm-exec ]; then
  ~/.nvm/nvm-exec node "$@"
else
  node "$@"
fi
