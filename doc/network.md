Speedtest with hetzner inline command

```bash
for dc in nbg1 ash fsn1 hel1 hil sin; do echo "Testing $dc..."; curl "https://${dc}-speed.hetzner.com/100MB.bin" -o /dev/null --max-time 10 --connect-timeout 10; done
```
