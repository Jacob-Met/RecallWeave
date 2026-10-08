# Actual merge and live delivery

[PR #89](https://github.com/Jacob-Met/RecallWeave/pull/89) merged normally at `81363271da63c5428fcb4cafba39fc89c3557b82`, with actual first parent `61751d74475b61ca1e0388c808b9fc81ce9b9ed3` and qualified source head `198573bbce7199e1f3d46af9bd76eea329dc4bf5`. The actual merge tree is `bae6038f3f48a13ebe55abffdaf3e0d378516dd7`.

Every one of the five owned leaves and modes is exact. All 1,733 unrelated actual-parent leaves remain, with no unexpected addition or deletion. The merged tree has 1,738 leaves. The three modified product files are the manifest, generated catalog and maintained receiver; the other two are source receipts.

## Automatic actual-merge gates

- [Node run 37809290417](https://github.com/Jacob-Met/RecallWeave/actions/runs/37809290417), job 113421652297: **376/376** tests passed with no failures or skips; standalone learner parity passed.
- [Chrome run 37809290610](https://github.com/Jacob-Met/RecallWeave/actions/runs/37809290610), job 113421653152: all **11 groups and 25 physical downloads** passed on the actual merge checkout. All 24 runtime source hashes match the qualified PR. Every physical download again matches the corresponding original course bytes and Git blob. Chrome closed with code 0 and profile cleanup succeeded.
- [Pages run 37809288856](https://github.com/Jacob-Met/RecallWeave/actions/runs/37809288856) completed successfully through the repository's existing deployment.

These workflows ran automatically after integration; no optional repeat suite or native browser build was started. The earlier PR receiving and its complete packet remain separately preserved.

## Live byte verification

At **2026-10-08 16:35:26 UTC**, normal system curl with TLS verification received:

| Page | HTTP | Bytes | Git blob |
|---|---:|---:|---|
| [Eleven-course catalog](https://jacobmetoyer.com/RecallWeave/catalog.html) | 200 | 176,964 | `5374564001035b6fc12f5f4443592a01f6a9ab59` |
| [Existing learner](https://jacobmetoyer.com/RecallWeave/demo.html) | 200 | 97,565 | `cf7eea3792deacc3eb98a22aef539b920fb66746` |

Both body hashes exactly match the qualified sources. The first Python HTTPS client failed before a response because its local issuer store was unavailable; its complete error and command remain in `live-python-tls-failure.json`. No certificate/configuration changes or verification bypass were used. `live-https.json` retains the successful command, original result, completion and exit code 0.

## Exact custody

All 30 original actual-merge browser packet files are here, together with both complete job logs. The raw log retains 331 ordered chunks of a 1,016,639-byte decoded packet, SHA256 `56aab3a739d467f0b5af2f075cc77042f6978a2806830fa1356aacdb5fe6209b`. Original file bytes total 758,888. All lengths, SHA256 values and Git blob identities were checked. The three catalog/preview captures match the previously inspected PR bytes; only the started learner's ordinary randomized option presentation differs.

`merge-and-delivery.json` records actual parents, source preservation, workflow IDs, packet pins and live results. The course owners' original qualification limits and failures stay intact. This increment registers the agreed seven additions only; no new course content, all-course learner completion, efficacy result or #76 feedback change is claimed.
