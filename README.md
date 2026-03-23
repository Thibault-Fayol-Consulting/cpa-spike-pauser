# CPA Spike Pauser

A Google Ads Script that monitors campaign CPA in real time and automatically pauses campaigns exceeding your maximum CPA threshold. Sends email alerts and supports automatic re-enabling.

## What It Does

- Queries today's campaign performance via GAQL to calculate real-time CPA
- Pauses campaigns where CPA exceeds the threshold
- Labels paused campaigns for automatic re-enabling on the next run
- Sends an email alert listing all paused and re-enabled campaigns

## Setup

1. In Google Ads, go to **Tools & Settings > Bulk Actions > Scripts**
2. Paste the contents of `main_en.gs` (or `main_fr.gs` for French)
3. Update the `CONFIG` values
4. Set `TEST_MODE` to `false` when ready
5. Schedule the script to run **every hour**

## CONFIG Reference

| Parameter              | Type    | Default            | Description                                                |
|------------------------|---------|--------------------|------------------------------------------------------------|
| `TEST_MODE`            | Boolean | `true`             | When true, logs detections but does not pause campaigns    |
| `NOTIFICATION_EMAIL`   | String  | —                  | Email for alerts when campaigns are paused                 |
| `MAX_CPA_THRESHOLD`    | Number  | `50.0`             | Maximum acceptable CPA — campaigns above this get paused   |
| `MIN_CONVERSIONS`      | Number  | `1`                | Minimum conversions before CPA check applies               |
| `LABEL_NAME`           | String  | `CPA_Spike_Paused` | Label applied to paused campaigns for tracking             |
| `AUTO_RE_ENABLE_HOURS` | Number  | `6`                | Re-enable paused campaigns after this many hours           |

## How It Works

1. Checks for previously paused campaigns (labeled) and re-enables them
2. Runs a GAQL query for today's campaign metrics
3. Calculates CPA for campaigns with sufficient conversions
4. Pauses campaigns exceeding the threshold and applies a label
5. Sends an email alert

## Requirements

- Google Ads account with conversion tracking enabled
- Schedule to run hourly for effective protection
- Google Ads Scripts access

## License

MIT — Thibault Fayol Consulting
