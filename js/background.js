function synchronize_data() {
  chrome.storage.sync.get({
    "domain": "",
    "api_key": ""
  }, function(items) {
    if (items.domain && items.api_key) {
      fetch_routes(items.domain, items.api_key).then(function(routes) {
        chrome.storage.local.set({"routes": routes});
      });
    }
  });
}

function init() {
  chrome.alarms.create("pollChannelStates", {"periodInMinutes": 1});
  synchronize_data();
}

(function() {
  chrome.runtime.onInstalled.addListener(init);
  chrome.runtime.onStartup.addListener(init);
  chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name == "pollChannelStates") {
      synchronize_data();
    }
  });
})();
