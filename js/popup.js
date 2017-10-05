function initialize_ui() {
  chrome.storage.sync.get({
    "domain": "",
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

  chrome.storage.local.get({"routes": ""}, function(items) {
    if (items.routes) {
      update_routes(items.routes);
    }
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

function update_routes(routes) {
  var table = document.getElementById("routes-table");
  while (table.firstChild) {
    table.removeChild(table.firstChild);
  }
  routes.forEach(function(route) {
    var tr = document.createElement("tr");
    ["alias", "forward"].forEach(function(key) {
      var td = document.createElement("td");
      td.innerHTML = route[key];
      tr.appendChild(td);
    });

    // Append the action field.
    var td = document.createElement("td");
    td.innerHTML = route.action;
    tr.appendChild(td);

    // Append a button to remove a route.
    var td = document.createElement("td");
    td.innerHTML = "x"
    tr.appendChild(td);

    // Append the row.
    table.appendChild(tr);
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
