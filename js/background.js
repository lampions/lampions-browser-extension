function initialize_data() {
  chrome.alarms.create("pollChannelStates", {"periodInMinutes": 1});
  Mailgun.synchronize_data();
}

(function() {
  chrome.runtime.onInstalled.addListener(initialize_data);
  chrome.runtime.onStartup.addListener(initialize_data);
  chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name === "pollChannelStates") {
      Mailgun.synchronize_data();
    }
  });
})();
