function initialize_ui() {
  chrome.storage.sync.get({
    "domain": "",
    "routes": "",
    "forwards": []
  }, function(items) {
    if (items.domain) {
      var domain_label = document.getElementById("domain");
      domain_label.innerHTML = "@" + items.domain;
    }
    var select = document.getElementById("forwards");
    items.forwards.forEach(function(item) {
      append_list_element(select, item);
    });
  });
}

function add_route() {
  var alias = strip_string(document.getElementById("alias").value);
  // TODO: Indicate an error in the UI.
  if (!alias) {
    return;
  }
  var select = document.getElementById("forwards");
  var forward = select.options[select.selectedIndex].value;
  // TODO: Indicate an error in the UI.
  if (!forward) {
    return;
  }
  chrome.storage.sync.get({
    "domain": "",
    "api_key": "",
  }, function(items) {
    if (items.domain && items.api_key) {
      set_route(items.domain, items.api_key, alias, forward, "accept").then(
      function(result) {
        if (result.status === 400) {
          console.log("Failure");
        } else {
          console.log("Success: " + result.status);
        }
        console.log(result.response.message);
      });
    }
  });
}

(function() {
  document.getElementById("settings").addEventListener("click", function() {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById("add").addEventListener("click", add_route);

  document.addEventListener("DOMContentLoaded", function() {
    initialize_ui();
  });
})();
