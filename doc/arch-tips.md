# Some tips for arch

### Reflector

```bash
ExecStart=
ExecStart=/usr/bin/reflector --save /etc/pacman.d/mirrorlist --sort rate --age 12 -l 10
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
