/**
 * --------------------------------------------------------------------------
 * Pauseur de Pics CPA — Script Google Ads
 * --------------------------------------------------------------------------
 * Surveille le CPA des campagnes en temps reel et met en pause celles qui
 * depassent le seuil maximum. Les campagnes pausees sont labelisees pour
 * reactivation automatique et une alerte email est envoyee.
 *
 * Auteur : Thibault Fayol — Thibault Fayol Consulting
 * Site   : https://thibaultfayol.com
 * Licence: MIT
 * --------------------------------------------------------------------------
 */

var CONFIG = {
  TEST_MODE: true,
  NOTIFICATION_EMAIL: 'vous@exemple.com',
  MAX_CPA_THRESHOLD: 50.0,
  MIN_CONVERSIONS: 1,
  LABEL_NAME: 'CPA_Pic_Pause',
  AUTO_RE_ENABLE_HOURS: 6
};

function main() {
  try {
    Logger.log('Pauseur de Pics CPA — demarrage');

    var tz = AdsApp.currentAccount().getTimeZone();
    var now = new Date();
    var today = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
    var accountName = AdsApp.currentAccount().getName();

    if (!CONFIG.TEST_MODE) { createLabelIfNeeded(CONFIG.LABEL_NAME); }

    var reEnabled = reEnableCampaigns();

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
          Logger.log('Pic CPA : ' + row.campaign.name + ' — ' + cpa.toFixed(2) + ' EUR');

          if (!CONFIG.TEST_MODE) {
            var campIter = AdsApp.campaigns()
              .withCondition('Status = ENABLED')
              .withIds([row.campaign.id]).get();
            if (campIter.hasNext()) {
              var camp = campIter.next();
              camp.pause();
              camp.applyLabel(CONFIG.LABEL_NAME);
            }
          }

          paused.push({ name: row.campaign.name, cpa: cpa });
        }
      }
    }

    if (paused.length > 0 || reEnabled.length > 0) {
      var subject = '[Alerte CPA] ' + accountName + ' — ' + paused.length + ' pausee(s)';
      var body = 'Rapport Pics CPA\nDate : ' + today +
        '\nSeuil : ' + CONFIG.MAX_CPA_THRESHOLD + ' EUR\n\n';

      if (paused.length > 0) {
        body += 'PAUSEES (' + paused.length + ') :\n';
        for (var i = 0; i < paused.length; i++) {
          body += '  ' + paused[i].name + ' — CPA : ' + paused[i].cpa.toFixed(2) + ' EUR\n';
        }
      }

      if (reEnabled.length > 0) {
        body += '\nREACTIVEES (' + reEnabled.length + ') :\n';
        for (var j = 0; j < reEnabled.length; j++) { body += '  ' + reEnabled[j] + '\n'; }
      }

      body += '\n' + (CONFIG.TEST_MODE ? '(MODE TEST)\n' : '');
      MailApp.sendEmail(CONFIG.NOTIFICATION_EMAIL, subject, body);
    }

    Logger.log('Termine.');

  } catch (e) {
    Logger.log('ERREUR : ' + e.message);
    MailApp.sendEmail(CONFIG.NOTIFICATION_EMAIL,
      '[Alerte CPA] Erreur', e.message + '\n' + e.stack);
  }
}

function reEnableCampaigns() {
  var reEnabled = [];
  if (CONFIG.TEST_MODE || CONFIG.AUTO_RE_ENABLE_HOURS <= 0) { return reEnabled; }
  var labelIter = AdsApp.labels().withCondition("Name = '" + CONFIG.LABEL_NAME + "'").get();
  if (!labelIter.hasNext()) { return reEnabled; }
  var campIter = AdsApp.campaigns().withCondition('Status = PAUSED')
    .withCondition("LabelNames CONTAINS_ANY ['" + CONFIG.LABEL_NAME + "']").get();
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
