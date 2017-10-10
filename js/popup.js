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
      populate_routes_table(items.routes);
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

  // TODO: Wrap this in a promise so we can chain it in "add_route" and
  //       "update_route".
  chrome.storage.local.get({"routes": []}, function(items) {
    var routes = items.routes;
    for (var i in routes) {
      var route = routes[i];
      if (route.alias === alias) {
        push_status_message("Route already defined!", false);
        return;
      }
    }

    var button = document.getElementById("add");
    var elements = [input, select, button];
    elements.forEach(function(element) {
      set_element_sensitive_ex(element, false);
    });

    Mailgun.add_route(alias, forward).then(function(route) {
      var tr = _create_table_row(route);
      var table = document.getElementById("routes-table");
      table.insertBefore(tr, table.firstChild);

      input.value = "";
      push_status_message("Route added!", true);
      Mailgun.synchronize_data();
    })
    .catch(function() {
      push_status_message("Failed to add route!", false);
    })
    .then(function() {
      elements.forEach(function(element) {
        set_element_sensitive_ex(element, true);
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
  checkbox.dataset.alias = route.alias;
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
    set_element_sensitive_ex(checkbox, false);
    set_element_sensitive_ex(button, false);
    tr.className = "insensitive";
    // FIXME: Removing a route that was just added fails without reloading the.
    //        popup fails.
    Mailgun.remove_route(checkbox.dataset.id).then(function() {
      var table = document.getElementById("routes-table");
      table.removeChild(tr);
      push_status_message("Route removed!", true);
      Mailgun.synchronize_data();
    })
    .catch(function(msg) {
      set_element_sensitive_ex(checkbox, true);
      set_element_sensitive_ex(button, true);
      tr.className = "";
      push_status_message("Failed to remove route!", false);
    });
  };

  checkbox.onmousedown = function() {
    set_element_sensitive_ex(checkbox, false);
    set_element_sensitive_ex(button, false);
    tr.className = "insensitive";
    var checked = checkbox.checked;
    // TODO:
    Mailgun.update_route(checkbox.dataset.id, checkbox.dataset.alias, !checked)
      .then(function() {
        checkbox.checked = !checked;
        push_status_message("Route updated!", true);
        Mailgun.synchronize_data();
      })
      .catch(function() {
        checkbox.checked = checked;
        push_status_message("Failed to update route!", false);
      })
      .then(function() {
        set_element_sensitive_ex(checkbox, true);
        set_element_sensitive_ex(button, true);
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
