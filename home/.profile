LOCAL_BIN=$HOME/.local/bin
CARGO_BIN=$HOME/.cargo/bin
GO_BIN=/opt/go/bin
LOCAL_GO_BIN=$HOME/go/bin
BUN_BIN=$HOME/.bun/bin

export PATH=$LOCAL_BIN:$CARGO_BIN:$LOCAL_GO_BIN:$GO_BIN:$BUN_BIN:$PATH
export LANG="en_GB.UTF-8"

# export QT_QPA_PLATFORM=wayland

[ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"

[ -f "/home/ilya/.ghcup/env" ] && . "/home/ilya/.ghcup/env" # ghcup-env