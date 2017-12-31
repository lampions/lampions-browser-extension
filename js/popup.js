function initialize_ui() {
  chrome.storage.sync.get({
    "forwards": []
  }, function(items) {
    var select = document.getElementById("forwards");
    items.forwards.forEach(function(item) {
      Utils.append_list_element(select, item);
    });
  });

  chrome.storage.local.get({"routes": ""}, function(items) {
    if (items.routes) {
      populate_routes_table(items.routes);
    }
  });
}

function add_route() {
  var input = document.getElementById("alias");
  var alias = Utils.strip_string(input.value);
  if (!alias) {
    Utils.push_status_message("No alias given!", false);
    return;
  }
  var select = document.getElementById("forwards");
  var option = select.options[select.selectedIndex];
  if (!option) {
    Utils.push_status_message("No forward address selected!", false);
    return;
  }
  var forward = option.value;

  chrome.storage.local.get({"routes": []}, function(items) {
    var routes = items.routes;
    for (var i in routes) {
      var route = routes[i];
      if (route.alias === alias) {
        Utils.push_status_message("Route already defined!", false);
        return;
      }
    }

    var button = document.getElementById("add");
    var elements = [input, select, button];
    elements.forEach(function(element) {
      Utils.set_element_sensitive_ex(element, false);
    });

    Mailgun.add_route(alias, forward).then(function(route) {
      var tr = _create_table_row(route);
      var table = document.getElementById("routes-table");
      table.insertBefore(tr, table.firstChild);

      input.value = "";
      Utils.push_status_message("Route added!", true);
      Mailgun.synchronize_data();
    })
    .catch(function() {
      Utils.push_status_message("Failed to add route!", false);
    })
    .then(function() {
      elements.forEach(function(element) {
        Utils.set_element_sensitive_ex(element, true);
      });
    });
  });
}

function _create_table_row(route) {
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
  checkbox.dataset.id = route.id;
  if (route.active) {
    checkbox.checked = true;
  }
  td.appendChild(checkbox);
  tr.appendChild(td);

  // Append a button to remove a route.
  var td = document.createElement("td");
  var button = document.createElement("button");
  button.className = "remove-button icon-remove";
  td.appendChild(button);
  tr.appendChild(td);

  // Connect signal handlers.
  button.onmousedown = function() {
    Utils.set_element_sensitive_ex(checkbox, false);
    Utils.set_element_sensitive_ex(button, false);
    tr.className = "insensitive";
    Mailgun.remove_route(checkbox.dataset.id).then(function() {
      var table = document.getElementById("routes-table");
      table.removeChild(tr);
      Utils.push_status_message("Route removed!", true);
      Mailgun.synchronize_data();
    })
    .catch(function(msg) {
      Utils.set_element_sensitive_ex(checkbox, true);
      Utils.set_element_sensitive_ex(button, true);
      tr.className = "";
      Utils.push_status_message("Failed to remove route!", false);
    });
  };

  checkbox.onmousedown = function() {
    Utils.set_element_sensitive_ex(checkbox, false);
    Utils.set_element_sensitive_ex(button, false);
    tr.className = "insensitive";
    var checked = checkbox.checked;
    var id = checkbox.dataset.id;

    var promise = new Promise(function(resolve, reject) {
      chrome.storage.local.get({"routes": []}, function(items) {
        var route = null;
        for (var k in items.routes) {
          var entry = items.routes[k];
          if (entry.id === id) {
            route = entry;
            break;
          }
        }
        if (!route) {
          reject("No route information for route id '" + id + "'");
        } else {
          resolve(route);
        }
      });
    });
    promise.then(function(route) {
        return Mailgun.update_route(route, !checked);
    }).then(function() {
      checkbox.checked = !checked;
      Utils.push_status_message("Route updated!", true);
      Mailgun.synchronize_data();
    }).catch(function(message) {
      checkbox.checked = checked;
      console.log(message);
      Utils.push_status_message("Failed to update route!", false);
    }).then(function() {
      Utils.set_element_sensitive_ex(checkbox, true);
      Utils.set_element_sensitive_ex(button, true);
      tr.className = "";
    });
  };

  return tr;
}

function populate_routes_table(routes) {
  var table = document.getElementById("routes-table");
  while (table.firstChild) {
    table.removeChild(table.firstChild);
  }
  routes.forEach(function(route) {
    var tr = _create_table_row(route);
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
