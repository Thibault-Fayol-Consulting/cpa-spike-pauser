/**
 * cpa-spike-pauser - Google Ads Script for SMBs
 * Author: Thibault Fayol
 */
var CONFIG = { TEST_MODE: true, MAX_CPA: 50.0 };
function main(){
  var campIter = AdsApp.campaigns().withCondition("Status = ENABLED").get();
  while(campIter.hasNext()){
    var camp = campIter.next();
    var stats = camp.getStatsFor("TODAY");
    if(stats.getConversions() > 0 && (stats.getCost() / stats.getConversions()) > CONFIG.MAX_CPA){
      Logger.log("CPA too high for " + camp.getName());
      if(!CONFIG.TEST_MODE){ camp.pause(); }
    }
  }
}