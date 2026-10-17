#!/usr/bin/env bash

if [[ -n $HERDR_ENV ]]; then
  exec herdr-sessionizer "$@"
elif [[ -n $TMUX ]]; then
  exec tmux-sessionizer "$@"
elif pgrep -x herdr >/dev/null; then
  exec herdr-sessionizer "$@"
else
  exec tmux-sessionizer "$@"
fi
