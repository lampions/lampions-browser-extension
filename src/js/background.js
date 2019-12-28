import mailgun from "./mailgun.js";

(function() {
  // chrome.runtime.onInstalled.addListener(mailgun.synchronizeData);
  // chrome.runtime.onStartup.addListener(mailgun.synchronizeData);
  mailgun.synchronizeData();

  // TODO: Can't we simply do this when the popup is opened?
  // Poll for route updates every minute.
  chrome.alarms.create("pollRoutes", {"periodInMinutes": 1});
  chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name === "pollRoutes") {
      mailgun.synchronizeData();
    }
  });
})();
