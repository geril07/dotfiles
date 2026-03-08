# System updates

Update package databases and upgrade everything:

```bash
sudo pacman -Syu
```

Force refresh package databases:

```bash
sudo pacman -Syyu
```

---

# Installing packages

Install a package:

```bash
sudo pacman -S package
```

Install multiple packages:

```bash
sudo pacman -S pkg1 pkg2
```

Reinstall a package:

```bash
sudo pacman -S package
```

---

# Removing packages

Remove package only:

```bash
sudo pacman -R package
```

Remove package + unused dependencies:

```bash
sudo pacman -Rs package
```

Remove package + configs + unused dependencies:

```bash
sudo pacman -Rns package
```

---

# Searching packages

Search repositories:

```bash
pacman -Ss keyword
```

Search installed packages:

```bash
pacman -Qs keyword
```

---

# Package information

Show info about repo package:

```bash
pacman -Si package
```

Show info about installed package:

```bash
pacman -Qi package
```

List files installed by package:

```bash
pacman -Ql package
```

Find which package owns a file:

```bash
pacman -Qo /path/to/file
```

Find package that provides a file in repos:

```bash
pacman -F filename
```

---

# Query installed packages

List all installed packages:

```bash
pacman -Q
```

Explicitly installed packages:

```bash
pacman -Qe
```

Packages installed as dependencies:

```bash
pacman -Qd
```

Orphaned packages:

```bash
pacman -Qdt
```

---

# Dependency inspection

List dependencies of a package:

```bash
pacman -Qi package
```

Reverse dependencies (what depends on it):

```bash
pactree -r package
```

Dependency tree:

```bash
pactree package
```

(`pactree` is in the **pacman-contrib** package.)

---

# Cache management

Clean old package cache (safe):

```bash
sudo pacman -Sc
```

Remove all cached packages:

```bash
sudo pacman -Scc
```

Keep last 3 versions (recommended):

```bash
sudo paccache -r
```

---

# Useful diagnostics

Check for missing dependencies:

```bash
pacman -Dk
```

Check package file integrity:

```bash
pacman -Qk
```

Verify all packages:

```bash
pacman -Qkk
```

---

# Very useful quick commands

List packages by install date:

```bash
expac --timefmt='%Y-%m-%d %T' '%l\t%n' | sort
```

List largest installed packages:

```bash
expac -H M '%m\t%n' | sort -h
```

(`expac` is also in **pacman-contrib**.)
