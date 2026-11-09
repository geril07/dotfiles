---
name: OpenCode Export Images
description: Save images the user attached in OpenCode (pasted screenshots, clipboard images) as real files. Use when asked to save, export, extract, copy, or reuse an attached image — for a repo, PR/issue, task, subagent, or reference folder.
---

# Export attached images

A pasted image is base64 inside the session message, not a file on disk; the model only sees `[Image N]`. Extract it with the commands below — do not screenshot the chat, OCR, or ask the user to upload again.

`opencode session export` streams the transcript through the pipe; nothing is written to disk. The stream can be large, so never read it into context.

## All attachments

```sh
d=/tmp/opencode/images
rm -rf "$d"
mkdir -p "$d"
opencode session export "$OPENCODE_SESSION_ID" | jq -r '.messages[] | select(.type=="user") | .files[] | .data' | split -l 1 - "$d/part-"
for f in "$d"/part-*; do base64 -d "$f" > "$f.bin" && rm "$f"; done
for f in "$d"/part-*.bin; do ext=$(file -b --extension "$f" | cut -d/ -f1); if [ -z "$ext" ] || [ "$ext" = "???" ]; then ext=bin; fi; mv "$f" "${f%.bin}.$ext"; done
ls -l "$d"
```

One file per attachment, in message order: `part-aa`, `part-ab`, … The extension is read from the bytes, not from the MIME or `name` (both unreliable; `name` is usually `clipboard`).

If the directory stays empty, the session has no attachments — check the ID.

## Single image

```sh
opencode session export "$OPENCODE_SESSION_ID" | jq -r '[.messages[] | select(.type=="user") | .files[].data] | last' | base64 -d > /tmp/opencode/image
file /tmp/opencode/image
```

## Rules

- `$OPENCODE_SESSION_ID` is the current session (set by the shell tool). For another session: `opencode session list --format json`, then export that ID; export works across projects.
- Never use `jq @base64d` — it corrupts binary data (invalid UTF-8 becomes U+FFFD). Decode with `base64 -d`.
- `[Image N]` numbering restarts in every message; file order follows messages, not those numbers.
- `Attached file: <path>` in a message means the attachment is already a file — use that path.
- Screenshots are often private: keep scratch files in `/tmp`; do not commit them, attach them to public issues, or upload them without permission.
