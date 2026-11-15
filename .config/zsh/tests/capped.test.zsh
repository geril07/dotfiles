#!/usr/bin/env zsh
# Integration test: requires a working systemd user manager and tmux.
set -e

source "${0:A:h:h}/capped.zsh"

test_dir=$(mktemp -d "${TMPDIR:-/tmp}/capped-test.XXXXXXXX")
export XDG_CACHE_HOME="$test_dir/cache"
unset CAPPED_SCOPE
AGENT_TMUX_ISOLATE=1

cleanup() {
  local file unit cg
  for file in "$test_dir"/*.scope(N); do
    unit=$(<"$file")
    if [[ $unit == agent-capped-test-*.scope ]]; then
      if command systemctl --user stop "$unit" 2>/dev/null ||
        { cg=$(command systemctl --user show "$unit" -p ControlGroup --value 2>/dev/null) &&
          [[ -z $cg ]]; }; then
        rm -rf -- "$(_capped_tmux_dir "$unit")"
      else
        print -u2 -r -- "Could not stop test scope $unit"
      fi
    fi
  done
  rm -rf -- "$test_dir"
}
trap cleanup EXIT

fail() {
  print -u2 -r -- "FAIL: $*"
  exit 1
}

systemctl() {
  if [[ $2 == show && $3 == agent-capped-test-*.scope && $4 == -p && $5 == ControlGroup ]]; then
    if [[ ${CAPPED_TEST_CONTROLGROUP_ERROR:-0} == 1 ]]; then
      return 1
    elif [[ ${CAPPED_TEST_STALE_CGROUP:-0} == 1 ]]; then
      if [[ ! -e $test_dir/stale-reported ]]; then
        : > "$test_dir/stale-reported"
        print -r -- "/capped-test-${test_dir:t}-removed"
      else
        print -r -- ''
      fi
      return 0
    fi
  fi
  command systemctl "$@"
}

grep() {
  if [[ ${CAPPED_TEST_EVENTS_ERROR:-0} == 1 && $1 == -qx && $2 == 'populated 0' ]]; then
    return 2
  fi
  command grep "$@"
}

start_tmux() {
  local name=$1
  shift
  export CAP_TEST_SCOPE_FILE="$test_dir/$name.scope"
  export CAP_TEST_TMUX_FILE="$test_dir/$name.tmux"
  capped --slice= --name "capped-test-$name" "$@" sh -c '
    printf "%s\n" "$CAPPED_SCOPE" > "$CAP_TEST_SCOPE_FILE"
    printf "%s\n" "$TMUX_TMPDIR" > "$CAP_TEST_TMUX_FILE"
    if [ "${CAP_TEST_CHILD_CGROUP:-0}" = 1 ]; then
      while IFS=: read -r hierarchy controllers path; do
        if [ "$hierarchy" = 0 ]; then
          mkdir "/sys/fs/cgroup$path/capped-test-child"
          printf "%s\n" "$$" > "/sys/fs/cgroup$path/capped-test-child/cgroup.procs"
          break
        fi
      done < /proc/self/cgroup
    fi
    tmux -f /dev/null new-session -d -s capped-test sleep 300
  '
}

assert_tmux_alive() {
  local name=$1 unit dir
  unit=$(<"$test_dir/$name.scope")
  dir=$(<"$test_dir/$name.tmux")
  [[ -d $dir ]] || fail "$name: tmux directory was removed"
  [[ -r $XDG_CACHE_HOME/capped/last && "$(<"$XDG_CACHE_HOME/capped/last")" == "$unit" ]] ||
    fail "$name: last scope was not retained"
  env -u TMUX -u TMUX_PANE "TMUX_TMPDIR=$dir" tmux has-session -t capped-test ||
    fail "$name: could not reconnect to tmux"
}

start_tmux keep --keep
assert_tmux_alive keep
capped stop --unit "$(<"$test_dir/keep.scope")"

export CAP_TEST_CHILD_CGROUP=1
start_tmux child --keep
unset CAP_TEST_CHILD_CGROUP
child_unit=$(<"$test_dir/child.scope")
child_cg=$(command systemctl --user show "$child_unit" -p ControlGroup --value)
[[ -n $child_cg ]] || fail 'child: missing cgroup'
if command grep -q . "/sys/fs/cgroup$child_cg/cgroup.procs"; then
  fail 'child: expected no processes in the parent cgroup'
fi
command grep -qx 'populated 1' "/sys/fs/cgroup$child_cg/cgroup.events" ||
  fail 'child: expected a populated descendant cgroup'
assert_tmux_alive child
capped stop --unit "$child_unit"

start_tmux stop --stop
if command systemctl --user is-active --quiet "$(<"$test_dir/stop.scope")"; then
  fail 'stop: scope is still active'
fi
[[ ! -e "$(<"$test_dir/stop.tmux")" ]] || fail 'stop: tmux directory was not removed'
[[ ! -e $XDG_CACHE_HOME/capped/last ]] || fail 'stop: last scope was not removed'

export CAP_TEST_SCOPE_FILE="$test_dir/plain.scope"
export CAP_TEST_TMUX_FILE="$test_dir/plain.tmux"
if capped --slice= --name capped-test-plain sh -c '
  printf "%s\n" "$CAPPED_SCOPE" > "$CAP_TEST_SCOPE_FILE"
  printf "%s\n" "$TMUX_TMPDIR" > "$CAP_TEST_TMUX_FILE"
  exit 23
'; then
  fail 'plain: expected command exit status 23'
else
  rc=$?
  [[ $rc == 23 ]] || fail "plain: expected exit status 23, got $rc"
fi
[[ ! -e "$(<"$test_dir/plain.tmux")" ]] || fail 'plain: tmux directory was not removed'
[[ ! -e $XDG_CACHE_HOME/capped/last ]] || fail 'plain: last scope was not removed'

CAPPED_TEST_STALE_CGROUP=1
export CAP_TEST_SCOPE_FILE="$test_dir/stale.scope"
export CAP_TEST_TMUX_FILE="$test_dir/stale.tmux"
capped --slice= --name capped-test-stale sh -c '
  printf "%s\n" "$CAPPED_SCOPE" > "$CAP_TEST_SCOPE_FILE"
  printf "%s\n" "$TMUX_TMPDIR" > "$CAP_TEST_TMUX_FILE"
'
CAPPED_TEST_STALE_CGROUP=0
[[ ! -e "$(<"$test_dir/stale.tmux")" ]] || fail 'stale: tmux directory was not removed'
[[ ! -e $XDG_CACHE_HOME/capped/last ]] || fail 'stale: last scope was not removed'

CAPPED_TEST_CONTROLGROUP_ERROR=1
start_tmux unknown --keep
assert_tmux_alive unknown
CAPPED_TEST_CONTROLGROUP_ERROR=0
capped stop --unit "$(<"$test_dir/unknown.scope")"

CAPPED_TEST_EVENTS_ERROR=1
start_tmux unreadable --keep
assert_tmux_alive unreadable
CAPPED_TEST_EVENTS_ERROR=0
capped stop --unit "$(<"$test_dir/unreadable.scope")"

print -r -- 'PASS: capped tmux cleanup'
