#!/usr/bin/env bash

if [[ $# -eq 1 ]]; then
  selected=$1
else
  roots=(~/code ~/my)
  [[ -d ~/.t3/worktrees ]] && roots+=(~/.t3/worktrees)
  case ${SESSIONIZER_SCANNER:-python} in
    python)
      selected=$(fzf < <(sessionizer-dirs "${roots[@]}"))
      ;;
    fd)
      selected=$(fzf < <(fd -HI '^\.(git|sessionizer)$' --exclude node_modules --exclude '.git/objects' --exclude '.git/logs' "${roots[@]}" -x dirname))
      ;;
    *)
      printf 'Unknown SESSIONIZER_SCANNER: %s (expected python or fd)\n' "$SESSIONIZER_SCANNER" >&2
      exit 1
      ;;
  esac
fi

if [[ -z $selected ]]; then
  exit 0
fi

zoxide add "$selected"
printf '%s\n' "$selected"
