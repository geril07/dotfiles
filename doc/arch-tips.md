# Some tips for arch

### Reflector

/etc/xdg/reflector/reflector.conf

```bash
# Reflector configuration file for the systemd service.
#
# Empty lines and lines beginning with "#" are ignored.  All other lines should
# contain valid reflector command-line arguments. The lines are parsed with
# Python's shlex modules so standard shell syntax should work. All arguments are
# collected into a single argument list.
#
# See "reflector --help" for details.

# Recommended Options

# Set the output path where the mirrorlist will be saved (--save).
--save /etc/pacman.d/mirrorlist

# Select the transfer protocol (--protocol).
--protocol https
--protocol http

# Select the country (--country).
# Consult the list of available countries with "reflector --list-countries" and
# select the countries nearest to you or the ones that you trust. For example:
# --country France,Germany

# Use only the  most recently synchronized mirrors (--latest).
--latest 50

# Sort the mirrors by synchronization time (--sort).
--sort rate

-n 10

--verbose
```

```bash
sudo systemctl enable --now reflector.timer
```

### Journald

`/etc/systemd/journald.conf`

```bash
[Journal]
MaxRetentionSec=7d
MaxFileSec=1d
```

### Sway

Env from zsh at startup.

```bash
❯ cat /usr/share/wayland-sessions/sway-zsh.desktop
[Desktop Entry]
Name=Sway(Zsh)
Comment=An i3-compatible Wayland compositor
Exec=zsh -lc sway
Type=Application
DesktopNames=sway;wlroots;swayfx
```

You mean that annoying “A stop job is running for … (1min30s)” thing when shutting down? 😅

That’s controlled by systemd’s stop job timeout. By default it’s 90 seconds. You can shorten it.

Temporary (single unit) fix

If you know which service is causing the delay:

```bash
sudo systemctl edit service-name.service
```

Then add:

```bash
[Service]
TimeoutStopSec=10s
```

That sets the stop timeout for just that service.

Global fix (affects everything)

Edit /etc/systemd/system.conf (and maybe /etc/systemd/user.conf) and add/change:

DefaultTimeoutStopSec=10s

Then reload systemd:

sudo systemctl daemon-reexec

### Nautilus as a default mime for dirs

```bash
xdg-mime default org.gnome.Nautilus.desktop inode/directory

```

### Dconf and gnome apps

1. Export a whole schema (recommended if you only care about gnome-text-editor)

```bash
   dconf dump /org/gnome/TextEditor/ > gnome-text-editor.ini
```

Then in a fresh system, restore with:

```bash
dconf load /org/gnome/TextEditor/ < gnome-text-editor.ini
```

### Mask `xdg-desktop-portal-gnome`, so it will never mess with wlr

```bash
systemctl --user mask xdg-desktop-portal-gnome
```
