# Pi TPS

`home/.pi/agent/extensions/pi-tps.ts` is a global Pi extension equivalent to
[`oc-tps`](https://github.com/Tarquinen/oc-tps). Pi auto-loads it from
`~/.pi/agent/extensions/` and shows:

```text
TPS <live> | AVG <session average> | TTFT <session average>
```

Live TPS uses a five-second streaming window and is hidden after 1.5 seconds
without a generated delta. Completed averages use Pi's provider-reported output
tokens; live TPS is an estimate from streamed text/reasoning deltas. Metrics are
kept in memory for the active extension runtime and reset when Pi reloads it.

Run the focused checks with:

```sh
node --test --experimental-strip-types home/.pi/agent/extensions/pi-tps.test.mjs
```
