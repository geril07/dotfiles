# catppuccin macchiato
export FZF_DEFAULT_OPTS=" \
--color=bg+:#363a4f,bg:#24273a,spinner:#f4dbd6,hl:#ed8796 \
--color=fg:#cad3f5,header:#ed8796,info:#c6a0f6,pointer:#f4dbd6 \
--color=marker:#b7bdf8,fg+:#cad3f5,prompt:#c6a0f6,hl+:#ed8796 \
--color=selected-bg:#494d64" 

export FZF_DEFAULT_OPTS="$FZF_DEFAULT_OPTS \
--multi --bind change:first --height=15% --min-height 15 --layout=reverse --cycle"

export _ZO_FZF_OPTS="$FZF_DEFAULT_OPTS"

export LS_COLORS="$LS_COLORS:ow=1;34:tw=1;34:"
export EDITOR="nvim"

export MANPAGER='nvim +Man!'
export VISUAL="$EDITOR"

LOCAL_BIN=$HOME/.local/bin
CARGO_BIN=$HOME/.cargo/bin
GO_BIN=/opt/go/bin
LOCAL_GO_BIN=$HOME/go/bin
BUN_BIN=$HOME/.bun/bin

export PATH=$LOCAL_BIN:$CARGO_BIN:$LOCAL_GO_BIN:$GO_BIN:$BUN_BIN:$PATH

export LANG="en_GB.UTF-8"

# export QT_QPA_PLATFORM=wayland

[ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"

[ -f "$HOME/.ghcup/env" ] && . "$HOME/.ghcup/env" # ghcup-env
