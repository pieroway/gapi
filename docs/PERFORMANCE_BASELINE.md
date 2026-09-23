# Initial PHP performance baseline

Measured 2026-09-23T00:07:07.620Z on local Docker Desktop. Command: `scripts\test-load.bat`.

500 active synthetic listings, 500 comments, 500 ratings, one deleted listing,
no photos; MySQL data lives in tmpfs. Five warmups per scenario precede 100
measured requests at each concurrency. All 1,500 measured requests passed.

| Scenario | Concurrency | p50 ms | p95 ms | p99 ms | Requests/s | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| list | 1 | 43.3 | 66.1 | 78.6 | 21.3 | 0 |
| list | 4 | 70.0 | 104.9 | 139.0 | 54.6 | 0 |
| list | 8 | 147.9 | 235.2 | 329.3 | 48.9 | 0 |
| detail | 1 | 5.9 | 9.1 | 11.8 | 158.0 | 0 |
| detail | 4 | 7.4 | 10.0 | 11.6 | 524.7 | 0 |
| detail | 8 | 11.2 | 23.4 | 27.9 | 603.7 | 0 |
| lookup | 1 | 3.4 | 5.9 | 6.9 | 263.7 | 0 |
| lookup | 4 | 4.6 | 7.3 | 9.1 | 810.7 | 0 |
| lookup | 8 | 7.5 | 10.6 | 12.3 | 1004.8 | 0 |
| denied-report | 1 | 2.1 | 4.9 | 7.1 | 385.8 | 0 |
| denied-report | 4 | 3.3 | 7.6 | 8.7 | 972.6 | 0 |
| denied-report | 8 | 9.8 | 14.9 | 22.5 | 770.5 | 0 |
| missing | 1 | 4.1 | 5.5 | 6.3 | 236.3 | 0 |
| missing | 4 | 4.8 | 7.0 | 8.3 | 800.1 | 0 |
| missing | 8 | 6.0 | 9.1 | 10.8 | 1235.7 | 0 |

Collection payload: 198403 bytes. The collection endpoint
returns every active listing; browser search/map filters are not measured here.
Its increased latency and flattening throughput at concurrency 8 warrant
profiling before deciding on query or pagination changes. This sample alone
does not identify a database bottleneck.

Runtime: Node v20.9.0, PHP 8.2.33, MySQL 8.0.46,
Compose 5.4.0; win32/x64, 11th Gen Intel(R) Core(TM) i7-1165G7 @ 2.80GHz.

Raw JSON is retained locally at
`test-results/gapi-test-24324-1790122010254/load-baseline.json`.
Each run saves its own ignored report, including resource snapshots and MySQL
counters. The command removed its disposable containers and networks.

Provisional local pass criteria: zero unexpected responses and p95 <= 2,000 ms
for every scenario/concurrency combination. Expected authorization denial (401)
and missing-record (404) are validated successes, not ignored failures.

This is a short, closed-loop baseline, not a production capacity estimate or
release performance gate. Resource snapshots are taken after scenarios and do
not establish peak CPU/memory use. Global MySQL counters include startup and
healthchecks; they are not per-request query counts. Write/upload load, sustained
saturation, browser work, disk-backed data and shared-hosting performance remain
unmeasured. See [test methodology](../tests/README.md#load-baseline).
