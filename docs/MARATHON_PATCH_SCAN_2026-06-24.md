# Marathon Patch Scan - 2026-06-24

## Summary

Marathon official channels published fresh updates on 2026-06-23, with `Marathon Update 1.1.0.3` as the current hotfix note and `Marathon Key Dates` as the near-term roadmap note. The repo-side Marathon monitor state is stale: `data/marathon_hook_state.json` last succeeded on 2026-04-30, so the immediate work is watcher hygiene rather than gameplay API integration.

## 更新日/ソース

- Scan date: 2026-06-24 JST
- Official hub: https://marathonthegame.com/
- Patch note: https://www.bungie.net/7/en/News/Article/marathon_update_1_1_0_3
- Roadmap note: https://www.bungie.net/7/en/News/Article/season_2_key_dates
- Bungie.net API docs: https://bungie-net.github.io/
- Local monitor state: `data/marathon_hook_state.json`

## 要点

- `Marathon Update 1.1.0.3` is a focused hotfix: item economy fixes, KKV-9SD controller firing behavior, a Retro_Remix WSTR sticker display issue, Ranked Solo queue selection, Night Marsh Reverb spawns, Cryo Archive sponsored kit entry, and server stability.
- `Marathon Key Dates` says mid-season begins on 2026-07-21 with Vault Breaker, the first Cradle Evolution system iteration, player profile stats, and quality-of-life/tuning updates. Season 3 is planned for 2026-09-22.
- Bungie.net API documentation still exposes the general Platform root (`https://www.bungie.net/Platform`) with `X-API-Key` and OAuth flows. In the official sources checked here, no Marathon-specific public gameplay endpoint was confirmed.
- Local bot state shows `runs: 58`, `failures: 0`, `checked: 70`, `posted: 4`, and `updated_at: 2026-04-30T16:41:36.548312+00:00`. This is too old to be trusted as current monitoring health.

## 影響

- やる: Marathon news watcher should treat the Marathon homepage and Bungie Marathon news pages as current primary sources.
- やる: Add monitoring rules for titles matching `Marathon Update *`, `Marathon Key Dates`, and `Bungie Rewards` so product, patch, and account-linking updates do not land in the same bucket.
- やる: Alert when `data/marathon_hook_state.json.updated_at` is older than 24 hours while official Marathon sources have newer posts.
- やらない: Do not build an authenticated Marathon inventory/stats integration yet. Wait until Bungie documents Marathon-specific public endpoints.
- やらない: Do not repost the repo's older hardcoded 2026-05-01 Marathon setup snippets as current news; keep them as demo/archive material unless refreshed.

## 次アクション

- Issue: Refresh Marathon watcher source URLs and state freshness checks.
- PR: Mark static Marathon history/setup scripts as demo/archive content, or replace their seed data with source-driven fixtures.
- Monitor: Add a stale-state warning for `data/marathon_hook_state.json` when `updated_at` exceeds 24 hours.
- Watch date: Re-scan official sources around 2026-07-21 for Vault Breaker, player profile stats, and any new API/public telemetry signals.
