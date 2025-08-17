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
