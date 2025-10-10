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

export NVM_DIR="$HOME/.nvm"

[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

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

alias ls="eza -la --group-directories-first --icons"
alias lg="lazygit"
alias ld="lazydocker"
alias nvide="neovide"
alias vim="nvim"

bindkey '^[f' autosuggest-accept
bindkey -s "^[F" "tmux-sessioner\n"

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
