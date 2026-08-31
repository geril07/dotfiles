# Pi TPS

`home/.pi/agent/extensions/pi-tps/index.ts` is a global Pi extension equivalent to
[`oc-tps`](https://github.com/Tarquinen/oc-tps). Pi auto-loads it from
`~/.pi/agent/extensions/` and shows:

```text
TPS <live> | AVG <session average> | TTFT <session average>
```

Live TPS uses a five-second streaming window and is hidden after 1.5 seconds
without a generated delta. It estimates the combined UTF-8 bytes of recent
non-empty `text_delta`, `thinking_delta`, and `toolcall_delta` events. Completed
averages prefer Pi's provider-reported `usage.output`, falling back to the
cumulative streamed-byte estimate when usage is unavailable. TTFT starts at
`before_provider_request` and ends at the first non-empty token-bearing delta.
The session average is weighted: total output tokens divided by total decode
time. Metrics are kept in memory for the active extension runtime and reset when
Pi reloads it.

Run the focused checks with:

```sh
node --test --experimental-strip-types home/.pi/agent/extensions/pi-tps/index.test.mjs
```
