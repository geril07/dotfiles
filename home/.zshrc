zstyle ':omz:update' mode disabled

ZSH_THEME="robbyrussell"

plugins=(git zsh-autosuggestions) # z

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

export FZF_DEFAULT_OPTS=" \
--color=bg+:#363a4f,bg:#24273a,spinner:#f4dbd6,hl:#ed8796 \
--color=fg:#cad3f5,header:#ed8796,info:#c6a0f6,pointer:#f4dbd6 \
--color=marker:#b7bdf8,fg+:#cad3f5,prompt:#c6a0f6,hl+:#ed8796 \
--color=selected-bg:#494d64 \
--multi --bind change:first --no-cycle --height=5% --layout=reverse" 

export ZSH="$HOME/.oh-my-zsh"
export LS_COLORS="$LS_COLORS:ow=1;34:tw=1;34:"
export EDITOR="nvim"

[[ -f ~/.lex-gitlab-auth-token ]] && export LEX_GITLAB_AUTH_TOKEN=$(<~/.lex-gitlab-auth-token)
[[ -f ~/.npm-token ]] && export NPM_TOKEN=$(cat ~/.npm-token)

source $ZSH/oh-my-zsh.sh
source <(fzf --zsh)
[[ ! -r /home/ilya/.opam/opam-init/init.zsh ]] || source /home/ilya/.opam/opam-init/init.zsh  > /dev/null 2> /dev/null
[ -f ~/.profile ] && source ~/.profile
[ -s "/home/ilya/.bun/_bun" ] && source "/home/ilya/.bun/_bun"

eval "$(oh-my-posh init zsh --config $HOME/ohmyposh.json)"
eval "$(zoxide init zsh)"

alias ls="eza -la --group-directories-first --icons"
alias lg="lazygit"
alias ld="lazydocker"
alias nvide="neovide"
alias vim="nvim"

bindkey '^[f' autosuggest-accept
bindkey -s "^[F" "tmux-sessioner\n"


[ -f "/home/ilya/.ghcup/env" ] && . "/home/ilya/.ghcup/env" # ghcup-env

