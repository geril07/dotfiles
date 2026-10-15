zstyle ':omz:update' mode disabled

setopt HIST_FIND_NO_DUPS        # do not display previously found command
setopt HIST_IGNORE_DUPS         # do not save duplicate of prior command
setopt HIST_IGNORE_SPACE        # do not save if line starts with space
setopt HIST_NO_STORE            # do not save history commands
setopt HIST_REDUCE_BLANKS       # strip superfluous blanks
setopt INC_APPEND_HISTORY       # don’t wait for shell to exit to save history lines
setopt complete_aliases

# setopt HIST_ALLOW_CLOBBER       # related to shell clobber setting
# setopt HIST_IGNORE_ALL_DUPS     # remove old event if new one is a duplicate
# setopt HIST_LEX_WORDS           # related to how white space is saved
# setopt HIST_NO_FUNCTIONS        # do not save function commands
# setopt HIST_SAVE_NO_DUPS        # omit older duplicates of newer commands
# setopt HIST_SUBST_PATTERN       # use pattern matching for substitutions
# setopt HIST_VERIFY              # expand command line without executing it

eval "$(mise activate zsh)"

[[ -f ~/.lex-gitlab-auth-token ]] && export LEX_GITLAB_AUTH_TOKEN=$(cat ~/.lex-gitlab-auth-token)
[[ -f ~/.npm-token ]] && export NPM_TOKEN=$(cat ~/.npm-token)

ZSH_THEME="robbyrussell"

plugins=(git zsh-autosuggestions) # z

export ZSH="$HOME/.oh-my-zsh"
source $ZSH/oh-my-zsh.sh

source <(fzf --zsh)
[[ ! -r /home/ilya/.opam/opam-init/init.zsh ]] || source /home/ilya/.opam/opam-init/init.zsh  > /dev/null 2> /dev/null
# [ -f ~/.profile ] && source ~/.profile
[ -s "/home/ilya/.bun/_bun" ] && source "/home/ilya/.bun/_bun"
[ -f "/home/ilya/.ghcup/env" ] && . "/home/ilya/.ghcup/env" # ghcup-env

eval "$(oh-my-posh init zsh --config $HOME/ohmyposh.json)"
eval "$(zoxide init zsh)"

alias ls="eza -la --group-directories-first --icons auto"
alias lg="lazygit"
alias ld="lazydocker"
alias nvide="neovide"
alias vim="nvim"

# Keep the agents at normal priority; lower only heavy child commands.
# Shims go before mise activate paths: those are fixed to the launch directory,
# and agent commands do not run the prompt hook when they cd to another project.
AGENT_PATH="$HOME/.local/lowprio-bin:$HOME/.local/share/mise/shims"
alias pi='PATH="$AGENT_PATH:$PATH" command pi'
alias opencode='PATH="$AGENT_PATH:$PATH" command opencode'
alias opencode2='PATH="$AGENT_PATH:$PATH" command opencode2'
alias agy='PATH="$AGENT_PATH:$PATH" command agy'
alias codex='PATH="$AGENT_PATH:$PATH" command codex'
alias claude='PATH="$AGENT_PATH:$PATH" command claude --mcp-config="$HOME/.claude/mcp.json"'

ca() (
  if (( $# < 2 )); then
    printf '%s\n' 'Usage: ca <profile> <command> [args...]' >&2
    return 2
  fi

  local profile="$1"
  if [[ "$profile" == *[^a-zA-Z0-9_-]* ]]; then
    printf '%s\n' 'Profile must contain only letters, digits, underscores or hyphens.' >&2
    return 2
  fi
  if [[ -z "$profile" ]]; then
    printf '%s\n' 'Profile must not be empty.' >&2
    return 2
  fi
  shift

  umask 077
  export CLAUDE_CONFIG_DIR="$HOME/.claude-profiles/$profile"
  mkdir -p -- "$CLAUDE_CONFIG_DIR" || return

  # Argument-based commands bypass the agent aliases above.
  export PATH="${AGENT_PATH:+$AGENT_PATH:}$PATH"
  command "$@"
)

bindkey '^[f' autosuggest-accept
bindkey -s "^[F" "sessionizer\n"

function __zoxide_z() {
    __zoxide_doctor
    if [[ "$#" -eq 0 ]]; then
        __zoxide_cd ~
    elif [[ "$#" -eq 1 ]] && { [[ -d "$1" ]] || [[ "$1" = '-' ]] || [[ "$1" =~ ^[-+][0-9]+$ ]]; }; then
        __zoxide_cd "$1"
    elif [[ "$#" -eq 2 ]] && [[ "$1" = "--" ]]; then
        __zoxide_cd "$2"
    else
        local result
        # shellcheck disable=SC2312
        result="$(\command zoxide query -- "$@")" && __zoxide_cd "${result}"
    fi
}

# Pi bash commands default to three minutes; explicit commands may run up to 30 minutes.
export PI_BASH_DEFAULT_TIMEOUT_SECONDS=180
export PI_BASH_MAX_TIMEOUT_SECONDS=1800

# OpenCode V2 must watch the real config directory, not the symlink at ~/.config/opencode.
export OPENCODE_CONFIG_DIR="$HOME/my/dotfiles/.config/opencode"
export OPENCODE_AGENTS_SWITCH_SINGLE_MODEL=1
export OPENCODE_DISABLE_LSP_DOWNLOAD=1
export OPENCODE_DISABLE_AUTOCOMPACT=1

# oh-my-opencode is V1-only and is not active in the V2 configuration.
omo() {
  printf '%s\n' 'omo is unavailable until oh-my-opencode publishes a V2 plugin.' >&2
  return 1
}

alias mirrorlist-update='export TMPFILE="$(mktemp)"; \
    sudo true; \
    rate-mirrors --save=$TMPFILE arch --max-delay=21600 \
      && sudo mv /etc/pacman.d/mirrorlist /etc/pacman.d/mirrorlist-backup \
      && sudo mv $TMPFILE /etc/pacman.d/mirrorlist \
'

export SYSTEMD_LESS=FRXMK

tn() {
  local name="${PWD:t}"

  if tmux has-session -t "$name" 2>/dev/null; then
    if [[ -n "$TMUX" ]]; then
      tmux switch-client -t "$name"
    else
      tmux attach-session -t "$name"
    fi
    return
  fi

  if [[ -n "$TMUX" ]]; then
    tmux new-session -d -s "$name" -c "$PWD"
    tmux switch-client -t "$name"
  else
    tmux new-session -s "$name" -c "$PWD"
  fi
}

# >>> oh-my-opencode-slim background subagents >>>
#export OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true
# <<< oh-my-opencode-slim background subagents <<<

export OH_MY_OPENCODE_SLIM_DISABLE=1
