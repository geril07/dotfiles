# Path to your secrets folder
SECRETS_DIR="$HOME/.secrets"

zmodload zsh/stat
typeset -a secret_stat

# Safety: check if folder exists
if [[ -d "$SECRETS_DIR" ]]; then
  for file in "$SECRETS_DIR"/*; do
    # Skip if not a regular file
    [[ -f "$file" ]] || continue

    # Safety: check file size (e.g., max 8KB)
    zstat -L -A secret_stat +size -- "$file" || continue
    if (( secret_stat[1] > 8192 )); then
      print -u2 "Warning: Skipping large secret file (>8KB): $file"
      continue
    fi

    value=$(<"$file")

    # Export as env var
    export "${file:t}=$value"
  done
else
  print -u2 "Secrets folder not found: $SECRETS_DIR"
fi
