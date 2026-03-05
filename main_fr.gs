/**
 * --------------------------------------------------------------------------
 * cpa-spike-pauser - Google Ads Script for SMBs
 * --------------------------------------------------------------------------
 * Author: Thibault Fayol - Consultant SEA PME
 * Website: https://thibaultfayol.com
 * License: MIT
 * --------------------------------------------------------------------------
 */
var CONFIG = { TEST_MODE: true, MAX_CPA: 50.0, MIN_CONVERSIONS: 1 };
function main() {
    Logger.log("Recherche des pics de CPA pour aujourd'hui...");
    var campIter = AdsApp.campaigns().withCondition("Status = ENABLED").forDateRange("TODAY").get();
    while (campIter.hasNext()) {
        var camp = campIter.next();
        var stats = camp.getStatsFor("TODAY");
        var cost = stats.getCost();
        var conv = stats.getConversions();
        if (conv >= CONFIG.MIN_CONVERSIONS) {
            var cpa = cost / conv;
            if (cpa > CONFIG.MAX_CPA) {
                Logger.log("Pic de CPA détecté sur " + camp.getName() + ": " + cpa.toFixed(2) + "€");
                if (!CONFIG.TEST_MODE) camp.pause();
            }
        }
    }
}
