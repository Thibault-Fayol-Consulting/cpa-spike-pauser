/**
 * --------------------------------------------------------------------------
 * CPA Spike Pauser — Google Ads Script
 * --------------------------------------------------------------------------
 * Monitors campaign CPA in real time and pauses campaigns that exceed the
 * maximum CPA threshold. Labels paused campaigns for automatic re-enabling
 * and sends an email alert when campaigns are paused.
 *
 * Author : Thibault Fayol — Thibault Fayol Consulting
 * Website: https://thibaultfayol.com
 * License: MIT
 * --------------------------------------------------------------------------
 */

var CONFIG = {
  TEST_MODE: true,
  NOTIFICATION_EMAIL: 'you@example.com',
  MAX_CPA_THRESHOLD: 50.0,
  MIN_CONVERSIONS: 1,
  LABEL_NAME: 'CPA_Spike_Paused',
  AUTO_RE_ENABLE_HOURS: 6
};

function main() {
  try {
    Logger.log('CPA Spike Pauser — start');

    var tz = AdsApp.currentAccount().getTimeZone();
    var now = new Date();
    var today = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
    var accountName = AdsApp.currentAccount().getName();

    if (!CONFIG.TEST_MODE) {
      createLabelIfNeeded(CONFIG.LABEL_NAME);
    }

    // Re-enable previously paused campaigns
    var reEnabled = reEnableCampaigns();

    // Check for CPA spikes via GAQL
    var query =
      'SELECT campaign.name, campaign.id, ' +
      'metrics.cost_micros, metrics.conversions ' +
      'FROM campaign ' +
      'WHERE campaign.status = "ENABLED" ' +
      'AND segments.date = "' + today + '"';

    var rows = AdsApp.search(query);
    var paused = [];

    while (rows.hasNext()) {
      var row = rows.next();
      var cost = row.metrics.costMicros / 1000000;
      var conv = row.metrics.conversions;

      if (conv >= CONFIG.MIN_CONVERSIONS) {
        var cpa = cost / conv;
        if (cpa > CONFIG.MAX_CPA_THRESHOLD) {
          Logger.log('CPA spike: ' + row.campaign.name + ' — CPA $' + cpa.toFixed(2));

          if (!CONFIG.TEST_MODE) {
            var campIter = AdsApp.campaigns()
              .withCondition('Status = ENABLED')
              .withIds([row.campaign.id])
              .get();

            if (campIter.hasNext()) {
              var camp = campIter.next();
              camp.pause();
              camp.applyLabel(CONFIG.LABEL_NAME);
            }
          }

          paused.push({ name: row.campaign.name, cpa: cpa, cost: cost, conv: conv });
        }
      }
    }

    // Email alert
    if (paused.length > 0 || reEnabled.length > 0) {
      var subject = '[CPA Spike Alert] ' + accountName + ' — ' + paused.length + ' paused';
      var body = 'CPA Spike Pauser Report\nDate: ' + today +
        '\nCPA threshold: $' + CONFIG.MAX_CPA_THRESHOLD + '\n\n';

      if (paused.length > 0) {
        body += 'PAUSED (' + paused.length + '):\n';
        for (var i = 0; i < paused.length; i++) {
          body += '  ' + paused[i].name + ' — CPA: $' + paused[i].cpa.toFixed(2) + '\n';
        }
      }

      if (reEnabled.length > 0) {
        body += '\nRE-ENABLED (' + reEnabled.length + '):\n';
        for (var j = 0; j < reEnabled.length; j++) {
          body += '  ' + reEnabled[j] + '\n';
        }
      }

      body += '\n' + (CONFIG.TEST_MODE ? '(TEST MODE)\n' : '');
      MailApp.sendEmail(CONFIG.NOTIFICATION_EMAIL, subject, body);
    }

    Logger.log('Done. Paused: ' + paused.length + ', Re-enabled: ' + reEnabled.length);

  } catch (e) {
    Logger.log('ERROR: ' + e.message);
    MailApp.sendEmail(CONFIG.NOTIFICATION_EMAIL,
      '[CPA Spike Pauser] Error', e.message + '\n' + e.stack);
  }
}

function reEnableCampaigns() {
  var reEnabled = [];
  if (CONFIG.TEST_MODE || CONFIG.AUTO_RE_ENABLE_HOURS <= 0) { return reEnabled; }

  var labelIter = AdsApp.labels()
    .withCondition("Name = '" + CONFIG.LABEL_NAME + "'").get();
  if (!labelIter.hasNext()) { return reEnabled; }

  var campIter = AdsApp.campaigns()
    .withCondition('Status = PAUSED')
    .withCondition("LabelNames CONTAINS_ANY ['" + CONFIG.LABEL_NAME + "']")
    .get();

  while (campIter.hasNext()) {
    var camp = campIter.next();
    camp.enable();
    camp.removeLabel(CONFIG.LABEL_NAME);
    reEnabled.push(camp.getName());
  }

  return reEnabled;
}

function createLabelIfNeeded(name) {
  if (!AdsApp.labels().withCondition("Name = '" + name + "'").get().hasNext()) {
    AdsApp.createLabel(name);
  }
}
