function initialize_ui() {
  chrome.storage.sync.get({
    "forwards": []
  }, function(items) {
    if (items === undefined) {
      return;
    }
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
      if (route.description.alias === alias) {
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

function _is_route_active(route) {
  var actions = route.actions;
  if (actions.length > 0 && actions[0] === "stop()") {
    return false;
  }
  return true;
}

function _create_table_row(route) {
  var tr = document.createElement("tr");

  // TODO:
  //   1. Replace the alias label by the full mail address.
  //   2. Replace the forward label by a dropdown box.
  //   3. Add a button to copy email address to clipboard.

  ["alias", "forward"].forEach(function(key) {
    var td = document.createElement("td");
    td.textContent = route.description[key];
    tr.appendChild(td);
  });

  // Append the state checkbox.
  var td = document.createElement("td");
  var checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.dataset.id = route.id;
  if (_is_route_active(route)) {
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
          return;
        } else {
          resolve(route);
          return;
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

  var submit = document.getElementById("add");
  submit.addEventListener("click", add_route);
  Utils.set_element_sensitive_ex(submit, false);

  var input = document.getElementById("alias");
  input.addEventListener("input", function() {
    var alias = Utils.strip_string(input.value);
    // Define dummy address to validate the input.
    var email = alias + "@domain.tld";
    Utils.set_element_sensitive_ex(submit, Utils.validate_email(email));
  });
  input.addEventListener("keypress", function() {
    // Check for enter key.
    if (event.keyCode === 13) {
      add_route();
    }
  });

  document.getElementById("settings").addEventListener("click", function() {
    chrome.runtime.openOptionsPage();
    window.close();
  });
})();
