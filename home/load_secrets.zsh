# Path to your secrets folder
SECRETS_DIR="$HOME/.secrets"

# Safety: check if folder exists
if [[ -d "$SECRETS_DIR" ]]; then
  for file in "$SECRETS_DIR"/*; do
    # Skip if not a regular file
    [[ -f "$file" ]] || continue

    # Safety: check file size (e.g., max 8KB)
    if [[ $(wc -c < "$file") -gt 8192 ]]; then
      echo "Warning: Skipping large secret file (>8KB): $file" >&2
      continue
    fi

    key=$(basename "$file")
    value=$(<"$file")

    # Export as env var
    export "$key=$value"
  done
else
  echo "Secrets folder not found: $SECRETS_DIR" >&2
fi
