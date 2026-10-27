#!/bin/sh
input=$(cat)

# Keep the Orca reporter that used to own this status line.
orca_hook="$HOME/.orca/agent-hooks/claude-statusline.sh"
if [ -x "$orca_hook" ]; then
  printf '%s' "$input" | "$orca_hook" >/dev/null 2>&1 || :
fi

j() { printf '%s' "$input" | jq -r "$1" 2>/dev/null; }
human_tokens() {
  jq -nr --argjson n "$1" '
    if $n >= 1000000 then "\(($n / 100000 | round) / 10)M"
    elif $n >= 1000 then "\(($n / 100 | round) / 10)k"
    else "\($n)"
    end
  '
}

ESC=$(printf '\033')
RESET="${ESC}[0m"
DIM="${ESC}[2m"
BOLD="${ESC}[1m"
CYAN="${ESC}[1;36m"
WHITE="${ESC}[1;37m"
GREEN="${ESC}[32m"
YELLOW="${ESC}[33m"
RED="${ESC}[31m"

tone_for_pct() {
  if [ "$1" -ge 90 ]; then printf '%s' "$RED"
  elif [ "$1" -ge 70 ]; then printf '%s' "$YELLOW"
  else printf '%s' "$GREEN"
  fi
}
progress_bar() {
  bar_pct=$1
  bar_width=$2
  [ "$bar_pct" -lt 0 ] && bar_pct=0
  [ "$bar_pct" -gt 100 ] && bar_pct=100
  bar_filled=$(((bar_pct * bar_width + 50) / 100))
  bar_tone=$(tone_for_pct "$bar_pct")
  printf '%s[' "$DIM"
  printf '%s' "$bar_tone"
  bar_i=0
  while [ "$bar_i" -lt "$bar_filled" ]; do
    printf '█'
    bar_i=$((bar_i + 1))
  done
  printf '%s' "$DIM"
  while [ "$bar_i" -lt "$bar_width" ]; do
    printf '░'
    bar_i=$((bar_i + 1))
  done
  printf '%s]' "$RESET"
}
format_reset() {
  case "$1" in ''|*[!0-9]*) return ;; esac
  reset_delta=$(($1 - now))
  if [ "$reset_delta" -le 0 ]; then
    printf 'now'
  elif [ "$reset_delta" -lt 3600 ]; then
    printf '%dm' "$((reset_delta / 60))"
  elif [ "$reset_delta" -lt 86400 ]; then
    printf '%dh%02dm' "$((reset_delta / 3600))" "$(((reset_delta % 3600) / 60))"
  else
    printf '%dd%02dh' "$((reset_delta / 86400))" "$(((reset_delta % 86400) / 3600))"
  fi
}
limit_line() {
  limit_name=$1
  limit_pct=$(printf '%.0f' "$2")
  limit_bar=$(progress_bar "$limit_pct" 8)
  limit_tone=$(tone_for_pct "$limit_pct")
  limit_out="${BOLD}${WHITE}${limit_name}${RESET} ${limit_bar} ${limit_tone}${limit_pct}%${RESET}"
  limit_reset=$(format_reset "$3")
  [ -n "$limit_reset" ] && limit_out="$limit_out ${DIM}↻ ${limit_reset}${RESET}"
  printf '%s' "$limit_out"
}
format_elapsed() {
  elapsed_seconds=$(($1 / 1000))
  if [ "$elapsed_seconds" -ge 3600 ]; then
    printf '%dh%02dm' "$((elapsed_seconds / 3600))" "$(((elapsed_seconds % 3600) / 60))"
  else
    printf '%dm' "$((elapsed_seconds / 60))"
  fi
}

cwd=$(j '.workspace.current_dir // .cwd // empty')
[ -n "$cwd" ] || cwd=$(pwd)
case "$cwd" in
  "$HOME") path='~' ;;
  "$HOME"/*) path="~/${cwd#"$HOME"/}" ;;
  *) path=$cwd ;;
esac

model=$(j '.model.display_name // .model.id // empty')
effort=$(j '.effort.level // empty')
branch=$(git -C "$cwd" --no-optional-locks symbolic-ref --quiet --short HEAD 2>/dev/null)
[ -n "$branch" ] || branch=$(git -C "$cwd" --no-optional-locks rev-parse --short HEAD 2>/dev/null)
if [ -n "$branch" ] && [ -n "$(git -C "$cwd" --no-optional-locks status --porcelain 2>/dev/null)" ]; then
  branch="$branch*"
fi

line1="${CYAN}${BOLD}${model:-Claude}${RESET}"
[ -n "$effort" ] && line1="$line1 ${DIM}·${RESET} ${effort}"
line1="$line1 ${DIM}│${RESET} ${WHITE}${path}${RESET}"
[ -n "$branch" ] && line1="$line1 ${DIM}│${RESET} ${GREEN}${branch}${RESET}"

pct=$(j '.context_window.used_percentage // empty')
size=$(j '.context_window.context_window_size // empty')
tokens=$(j '.context_window.total_input_tokens // empty')
if [ -n "$pct" ]; then
  pct_int=$(printf '%.0f' "$pct")
  ctx="$(progress_bar "$pct_int" 10) $(tone_for_pct "$pct_int")${pct_int}%${RESET}"
  if [ -n "$tokens" ] && [ -n "$size" ]; then
    ctx="$ctx ${DIM}$(human_tokens "$tokens")/$(human_tokens "$size")${RESET}"
  elif [ -n "$size" ]; then
    ctx="$ctx ${DIM}/ $(human_tokens "$size")${RESET}"
  fi
  line1="$line1 ${DIM}│${RESET} ctx $ctx"
fi

cost=$(j '.cost.total_cost_usd // empty')
duration=$(j '.cost.total_duration_ms // empty')
session=''
[ -n "$cost" ] && session="${YELLOW}$(printf '$%.2f' "$cost")${RESET}"
[ -n "$duration" ] && session="${session:+$session ${DIM}·${RESET} }${DIM}$(format_elapsed "$duration")${RESET}"
[ -n "$session" ] && line1="$line1 ${DIM}│${RESET} $session"

now=$(date +%s 2>/dev/null || printf '0')
five=$(j '.rate_limits.five_hour.used_percentage // empty')
five_reset=$(j '.rate_limits.five_hour.resets_at // empty')
week=$(j '.rate_limits.seven_day.used_percentage // empty')
week_reset=$(j '.rate_limits.seven_day.resets_at // empty')
line2=''
if [ -n "$five" ]; then
  line2=$(limit_line '5h' "$five" "$five_reset")
fi
if [ -n "$week" ]; then
  week_line=$(limit_line '7d' "$week" "$week_reset")
  line2="${line2:+$line2 ${DIM}│${RESET} }$week_line"
fi
spend_used=$(j '.rate_limits.spend_limit.used_usd // empty')
spend_limit=$(j '.rate_limits.spend_limit.limit_usd // empty')
spend_pct=$(j '.rate_limits.spend_limit.used_percentage // empty')
if [ -n "$spend_used" ] && [ -n "$spend_limit" ]; then
  spend="${DIM}spend${RESET} ${YELLOW}$(printf '$%.2f/$%.2f' "$spend_used" "$spend_limit")${RESET}"
elif [ -n "$spend_pct" ]; then
  spend_pct_int=$(printf '%.0f' "$spend_pct")
  spend="${DIM}spend${RESET} $(progress_bar "$spend_pct_int" 8) ${tone_for_pct "$spend_pct_int"}${spend_pct_int}%${RESET}"
else
  spend=''
fi
[ -n "$spend" ] && line2="${line2:+$line2 ${DIM}│${RESET} }$spend"

printf '%s' "$line1"
[ -n "$line2" ] && printf '\n%s' "$line2"
