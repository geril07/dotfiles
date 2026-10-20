# Dotfiles repo

This is the dotfiles repository which contains folders that are usually symlinked to the .config or ~

## Private skills

Public skills live in `home/.agents/skills/` and are committed to this public repo. Make a skill private instead when it contains material that should not be published: employer-specific services, internal URLs or domains, account and session details, or workflows tied to a private project. When a new or changed skill touches such material, propose creating it as private and let the user decide.

Private skills are symlinks in `home/.agents/skills/` listed in this repo's `.git/info/exclude`; their contents live in a separate private repo. Find that repo with `readlink` on any listed symlink, then edit and commit there, not in this repo. To add one: create the skill in the private repo, symlink it into `home/.agents/skills/`, and add `home/.agents/skills/<name>` to `.git/info/exclude`.

Never ignore these symlinks in a `.gitignore` or `.ignore` file under `home/.agents/skills/`. Pi skill discovery honors those files and silently drops every skill they match, so the skill vanishes from the prompt with no warning.
