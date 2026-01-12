Speedtest with hetzner inline command

```bash
for dc in ash nbg1 fsn1 hel1 hil sin; do echo "Testing $dc..."; curl "https://${dc}-speed.hetzner.com/100MB.bin" -o /dev/null; done
```
