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
  var input = document.getElementById("alias");
  var alias = strip_string(input.value);
  if (!alias) {
    push_status_message("No alias given!", false);
    return;
  }
  var select = document.getElementById("forwards");
  var forward = select.options[select.selectedIndex].value;
  if (!forward) {
    push_status_message("No forward address selected!", false);
    return;
  }

  // TODO: Check if a route exists!

  var button = document.getElementById("add");
  var elements = [input, select, button];
  elements.forEach(function(element) {
    set_element_sensitive_ex(element, false);
  });

  set_route(alias, forward, "accept").then(function() {
    input.value = "";
    // TODO: Add the new route to the table.
    push_status_message("Route added!", true);
  }).catch(function() {
    push_status_message("Failed to add route!", false);
  }).then(function() {
    elements.forEach(function(element) {
      set_element_sensitive_ex(element, true);
    });
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

    // Append the state checkbox.
    var td = document.createElement("td");
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.alias = route.id;
    checkbox.onmousedown = function() {
      set_element_sensitive_ex(checkbox, false);
      tr.className = "insensitive";
      // update_routes(checkbox.dataset.id, !checked)
      //   .then(function() {
      //     // TODO: Update the status string.
      //     checkbox.checked = !checked;
      //   })
      //   .catch(function() {
      //     // TODO: Update the status string.
      //     checkbox.checked = checked;
      //   })
      //   .then(function() {
      //     set_element_sensitive_ex(checkbox, true);
      //     tr.className = "";
      //   });
    };
    // TODO: Replace the "action" attribute with a boolean "active" flag.
    if (route.action === "accept") {
      checkbox.checked = true;
    }
    td.appendChild(checkbox);
    tr.appendChild(td);

    // Append a button to remove a route.
    // XXX: Run this in an anonymous function for now so we don't override td.
    (function() {
      var td = document.createElement("td");
      var button = document.createElement("button");
      button.className = "remove-button icon-remove";
      td.appendChild(button);
      tr.appendChild(td);
    })();

    // Append the row.
    table.appendChild(tr);
  });
}

(function() {
  document.addEventListener("DOMContentLoaded", function() {
    initialize_ui();
  });
  document.getElementById("add").addEventListener("click", add_route);
  document.getElementById("settings").addEventListener("click", function() {
    chrome.runtime.openOptionsPage();
  });
})();
