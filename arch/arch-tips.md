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

### zram

Compressed swap that lives in RAM. Size it at about half of RAM: the configured size is the uncompressed limit, and zstd typically compresses 2–3×, so the RAM actually used stays far below it.

`/etc/systemd/zram-generator.conf`

```ini
[zram0]
zram-size = ram / 2
compression-algorithm = zstd(level=2)
swap-priority = 100
```

```bash
sudo systemctl daemon-reload
zramctl
swapon --show
```

### zswap — keep it off when zram is the only swap

Rule: one compression layer in RAM.

zswap is a compressed cache in front of a swap device. When that device is zram, enabling zswap stacks a second compressed pool on top of an already compressed one: pages are compressed into the zswap pool first (up to `max_pool_percent` of RAM, 20% by default) and only reach zram when the pool evicts — and eviction targets the highest-priority swap area, which is zram, where the page is compressed again. Two compressors, two allocators, one job, while `zramctl` looks nearly empty because zswap holds the pages. Arch Wiki (Zram): *"If the related zswap kernel feature remains enabled, it will prevent zram from being used effectively."*

Nothing in zram-generator or systemd turns zswap off, and Arch kernels ship with `CONFIG_ZSWAP_DEFAULT_ON=y`, so it is on by default.

```bash
cat /sys/module/zswap/parameters/enabled     # Y / N
zgrep CONFIG_ZSWAP_DEFAULT_ON /proc/config.gz
```

Disable permanently:

- Built in (`CONFIG_ZSWAP=y`): add `zswap.enabled=0` to the kernel command line. `/etc/modprobe.d` options do not apply to built-in code.
- Built as a module (`CONFIG_ZSWAP=m`): `options zswap enabled=0` in `/etc/modprobe.d/zswap.conf` also works.

`echo 0 > /sys/module/zswap/parameters/enabled` only stops new stores. Pages already in the pool stay in RAM until faulted back in or swapped off (kernel docs), so check `grep -E '^(Zswap|Zswapped):' /proc/meminfo`; only a reboot or `swapoff` actually frees them.

### Adding a swap file later

Keep zswap off while zram has the highest priority. zswap sits in front of every swap area regardless of priority, and its evictions go to the highest-priority area — zram again. The disk file would see almost no traffic and overflowing pages would be compressed twice.

The ladder that works is zram (`prio 100`) → swap file (`prio 10`), zswap off: one compression per page, disk used only after zram is full.

zswap makes sense in the other layout instead: drop zram and use the disk swap as the only backing device, letting zswap be the fast tier.

Swap file on btrfs:

```bash
sudo btrfs filesystem mkswapfile --size 8g --uuid clear /swapfile
# /etc/fstab:
# /swapfile none swap defaults,pri=10 0 0
```

btrfs swap files must be on a single-device filesystem. Hibernation also needs `resume=`/`resume_offset=` and a file large enough for the image — separate topic.

### swappiness

`vm.swappiness` (0–200) is the relative cost the VM assigns to reclaiming anonymous memory through swap versus dropping file page cache. 100 means equal cost; the ratio is roughly `swappiness : (200 - swappiness)` for `file : swap`.

The default 60 assumes swap lives on a disk, where re-reading a file is cheaper than swapping. With swap in RAM the assumption flips: compressing a cold page costs microseconds of CPU and a fraction of the page in RAM, while re-reading a dropped file costs disk I/O.

| value | VM treats |
| --- | --- |
| 60 | file reclaim ~2.3× cheaper |
| 100 | equal |
| 133 | swap 2× cheaper — the kernel doc's example for swap twice as fast as the filesystem |
| 150 | swap 3× cheaper |
| 180 | 9×, aggressive |

For a zram-only setup anything in 133–180 is defensible; 100 is the safe neutral value. The felt difference on a desktop is small, so pick a value and check the counters instead of arguing about it.

`/etc/sysctl.d/99-swappiness.conf` — the `99-` prefix sorts after `/usr/lib/sysctl.d/50-*`, so it wins:

```ini
vm.swappiness = 150
```

```bash
sudo sysctl --system
sysctl vm.swappiness
```

After a day, `pgsteal_anon` should grow and the growth of `workingset_refault_file` should slow down:

```bash
grep -E 'pgsteal_(anon|file)|workingset_refault_file' /proc/vmstat
```

Revert:

```bash
sudo rm /etc/sysctl.d/99-swappiness.conf
sudo sysctl -w vm.swappiness=60
```
