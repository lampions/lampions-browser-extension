function strip_string(s) {
  return s.replace(/^\s+|\s+$/g, "");
}

function prepend_list_element(select, item) {
  var option = document.createElement("option");
  option.value = item;
  option.textContent = item;
  option.setAttribute("selected", true);
  select.insertBefore(option, select.firstChild);
}

function append_list_element(select, item) {
  var option = document.createElement("option");
  option.value = item;
  option.textContent = item;
  select.appendChild(option);
  select.removeAttribute("disabled");
}

function validate_email(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function _push_status_message(message, success) {
  var status = document.getElementById("status");
  // Show the status label but also schedule adding the fade-out class to the
  // element to hide the label again.
  status.textContent = message;
  if (success) {
    status.className = "success";
  } else {
    status.className = "failure";
  }
  status.style.opacity = 1;
  setTimeout(function(status) {
    status.classList.add("fade-out");
    status.style.opacity = 0;
  }, 1000, status);
}

function push_success_message(message) {
  _push_status_message(message, true);
}

function push_failure_message(message) {
  _push_status_message(message, false);
}

function set_element_sensitive_ex(element, status) {
  if (status) {
    element.removeAttribute("disabled");
  } else {
    element.setAttribute("disabled", true);
  }
}

function set_element_sensitive(id, status) {
  var element = document.getElementById(id);
  set_element_sensitive_ex(element, status);
}

function left_click_handler(callback) {
  function _handler(event) {
    if (event.which !== 1) {
      return;
    }
    return callback(event);
  }
  return _handler;
}

function storage_local_get(data) {
  return new Promise(function(resolve, reject) {
    chrome.storage.local.get(data, function(items) {
      resolve(items);
      return;
    });
  });
}

function storage_sync_get(data) {
  return new Promise(function(resolve, reject) {
    chrome.storage.sync.get(data, function(items) {
      resolve(items);
      return;
    });
  });
}

function get_route_by_id(id) {
  return new Promise(function(resolve, reject) {
    storage_local_get({"routes": []}).then(function(items) {
      if (items === undefined) {
        reject("Failed to retrieve routes!");
        return;
      }
      var route = null;
      var routes = items.routes;
      for (var i = 0; i < routes.length; ++i) {
        var _route = routes[i];
        if (_route.id === id) {
          route = _route;
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
}

export default Object.freeze({
  strip_string: strip_string,
  prepend_list_element: prepend_list_element,
  append_list_element: append_list_element,
  validate_email: validate_email,
  push_success_message: push_success_message,
  push_failure_message: push_failure_message,
  set_element_sensitive_ex: set_element_sensitive_ex,
  set_element_sensitive: set_element_sensitive,
  left_click_handler: left_click_handler,
  storage_local_get: storage_local_get,
  storage_sync_get: storage_sync_get,
  get_route_by_id: get_route_by_id
});
