function initialize_ui() {
  Utils.storage_local_get({"routes": ""}).then(function(items) {
    if (items !== undefined && items.routes) {
      populate_routes_table(items.routes);
    }
  });
}

function add_route() {
  var input = document.getElementById("alias");
  var alias = Utils.strip_string(input.value);
  if (!alias) {
    Utils.push_failure_message("No alias given");
    return;
  }

  var domain_promise = Utils.storage_sync_get({"domain": ""});
  var routes_promise = Utils.storage_local_get({"routes": []});

  Promise.all([domain_promise, routes_promise]).then(function(values) {
    var [domain_items, routes_items] = values;
    if (domain_items === undefined || !domain_items.domain) {
      Utils.push_failure_message("No domain defined yet");
      return;
    }
    var domain = domain_items.domain;
    var routes = routes_items.routes;

    // Check if alias is already defined.
    for (var i = 0; i < routes.length; ++i) {
      var route = routes[i];
      if (route.description.alias === alias) {
        Utils.push_failure_message("Route already defined");
        return;
      }
    }

    var button = document.getElementById("add");
    var elements = [input, button];
    elements.forEach(function(element) {
      Utils.set_element_sensitive_ex(element, false);
    });

    _determine_available_forwards(routes).then(function(forwards) {
      // TODO: Add error handling here, i.e., exit out if forwards is empty.
      return Mailgun.add_route(alias, forwards[0]).then(function(route) {
        var tr = _create_table_row(route, domain, forwards);
        var table = document.getElementById("routes-table");
        table.insertBefore(tr, table.firstChild);

        input.value = "";
        Utils.push_success_message("Route added");
        Mailgun.synchronize_data();
      });
    })
    .catch(function() {
      Utils.push_failure_message("Failed to add route");
    })
    .then(function() {
      elements.forEach(function(element) {
        Utils.set_element_sensitive_ex(element, true);
      });
    });
  });
}

function _deactivate_ui_elements(tr, elements) {
  tr.className = "insensitive";
  elements.forEach(function(element) {
    Utils.set_element_sensitive_ex(element, false);
  });
}

function _activate_ui_elements(tr, elements) {
  tr.className = "";
  elements.forEach(function(element) {
    Utils.set_element_sensitive_ex(element, true);
  });
}

function _create_table_row(route, domain, forwards) {
  var route_id = route.id;
  var route_is_active = Mailgun.is_route_active(route);

  var tr = document.createElement("tr");

  // Create alias address label.
  var alias_address = route.description["alias"] + "@" + domain;
  var alias_label = document.createElement("span");
  alias_label.textContent = alias_address;
  alias_label.className = route_is_active ? "" : "insensitive";
  var td = document.createElement("td");
  td.appendChild(alias_label);
  tr.appendChild(td);

  // Create a dropdown list of forwarding addresses.
  var select = document.createElement("select");
  forwards.forEach(function(forward) {
    Utils.append_list_element(select, forward);
  });
  // Set the active option for the route.
  select.selectedIndex = forwards.indexOf(route.description.forward);
  var td = document.createElement("td");
  td.appendChild(select);
  tr.appendChild(select);

  // Create a state checkbox to control the route activity.
  var checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  if (route_is_active) {
    checkbox.checked = true;
  }
  var td = document.createElement("td");
  td.appendChild(checkbox);
  tr.appendChild(td);

  // Create a button to copy an alias address to the clipboard.
  var copy_button = document.createElement("button");
  copy_button.className = "button icon-copy";
  var td = document.createElement("td");
  td.appendChild(copy_button);
  tr.appendChild(td);

  // Append a button to remove a route.
  var delete_button = document.createElement("button");
  delete_button.className = "button icon-delete";
  var td = document.createElement("td");
  td.appendChild(delete_button);
  tr.appendChild(td);

  var elements = [select, checkbox, copy_button, delete_button];

  // Connect signal handler for changes to the route activity state.
  checkbox.onmousedown = Utils.left_click_handler(function(event) {
    _deactivate_ui_elements(tr, elements);
    var checked = checkbox.checked;
    Utils.get_route_by_id(route_id).then(function(route) {
      return Mailgun.update_route(route, {"active": !checked});
    }).then(function(route) {
      var route_is_active = Mailgun.is_route_active(route);
      checkbox.checked = route_is_active;
      alias_label.className = route_is_active ? "" : "insensitive";
      Utils.push_success_message("Route updated");
      Mailgun.synchronize_data();
    }).catch(function(msg) {
      // Restore the original checkbox state.
      checkbox.checked = checked;
      Utils.push_failure_message("Failed to update route");
      console.log(msg);
    }).then(function() {
      _activate_ui_elements(tr, elements);
    });
  });

  // Connect signal handler for changes in the forward address.
  select.onchange = function(event) {
    var option = select.options[select.selectedIndex];
    if (!option) {
      console.log("TODO");
    }
    var new_forward = option.value;

    _deactivate_ui_elements(tr, elements);

    Utils.get_route_by_id(route_id).then(function(route) {
      return Mailgun.update_route(route, {"forward": new_forward});
    }).then(function(route) {
      Utils.push_success_message("Route updated");
      Mailgun.synchronize_data();
    }).catch(function(message) {
      console.log(message);
      // Restore the original route.
      Mailgun.get_route_by_id(route_id).then(function(route) {
        select.selectedIndex = forwards.indexOf(route.description.forward);
      });
      Utils.push_failure_message("Failed to update route");
    }).then(function() {
      _activate_ui_elements(tr, elements);
    });
  };

  // Connect signal handler for copying an address to the clipboard.
  copy_button.onmousedown = Utils.left_click_handler(function() {
    navigator.clipboard.writeText(alias_address).then(function() {
      Utils.push_success_message("Address copied to clipboard");
    }).catch(function() {
      Utils.push_failure_message("Failed to copy address to clipboard");
    });
  });

  // Connect signal handler for deleting a route.
  delete_button.onmousedown = Utils.left_click_handler(function() {
    _deactivate_ui_elements(tr, elements);
    Utils.get_route_by_id(route_id).then(function(route) {
      return Mailgun.remove_route(route);
    }).then(function() {
      var table = document.getElementById("routes-table");
      table.removeChild(tr);
      Utils.push_success_message("Route removed");
      Mailgun.synchronize_data();
    }).catch(function() {
      Utils.push_failure_message("Failed to remove route");
    }).then(function() {
      _activate_ui_elements(tr, elements);
    });
  });

  return tr;
}

function _determine_available_forwards(routes) {
  var forwards = [];

  routes.forEach(function(route) {
    var forward = route.description.forward;
    if (!forwards.includes(forward)) {
      forwards.push(forward);
    }
  });

  return Utils.storage_sync_get({"forwards": []}).then(function(items) {
    if (items !== undefined && items.forwards) {
      var _forwards = items.forwards;
      _forwards.forEach(function(forward) {
        if (!forwards.includes(forward)) {
          forwards.push(forward);
        }
      });
    }
    return forwards;
  });
}

function populate_routes_table(routes) {
  var table = document.getElementById("routes-table");
  while (table.firstChild) {
    table.removeChild(table.firstChild);
  }
  Utils.storage_sync_get({"domain": ""}).then(function(items) {
    if (items === undefined || !items.domain) {
      return;
    }

    _determine_available_forwards(routes).then(function(forwards) {
      routes.forEach(function(route) {
        var tr = _create_table_row(route, items.domain, forwards);
        table.appendChild(tr);
      });
    });
  });
}

(function() {
  document.addEventListener("DOMContentLoaded", function() {
    initialize_ui();
  });

  var submit = document.getElementById("add");
  submit.addEventListener("click", add_route);

  var input = document.getElementById("alias");
  input.addEventListener("input", function() {
    var alias = Utils.strip_string(input.value);
    // Define dummy address to validate the input.
    var email = alias + "@domain.tld";
    Utils.set_element_sensitive_ex(submit, Utils.validate_email(email));
  });
  input.addEventListener("keypress", function() {
    // Check for enter key.
    if (event.key === "Enter") {
      add_route();
    }
  });

  document.getElementById("settings").addEventListener("click", function() {
    chrome.runtime.openOptionsPage();
    window.close();
  });
})();
