function get_forwards() {
  var forwards = [];
  var select = document.getElementById("forwards");
  var options = select.options;
  for (var i = 0; i < options.length; ++i) {
    var option = options[i];
    forwards.push(option.value);
  }
  return forwards;
}

function push_status_message(message, success) {
  var status = document.getElementById("status");
  // Show the status label but also schedule adding the fade-out class to the
  // element to hide the label again.
  status.innerHTML = message;
  if (success) {
    status.className = "success";
  } else {
    status.className = "failure";
  }
  status.style.opacity = 1;
  setTimeout(function(status) {
    status.className += " fade-out";
    status.style.opacity = 0;
  }, 1000, status);
}

// Saves options to chrome.storage.sync.
function save_options() {
  var forwards = get_forwards();
  var domain = document.getElementById("domain").value;
  var api_key = document.getElementById("api-key").value;
  chrome.storage.sync.set({
    "forwards": forwards,
    "domain": domain,
    "api_key": api_key
  }, function() {
    var message = null;
    var success = null;
    if (chrome.runtime.lastError) {
      message = "Failed to save options!";
      success = false;
    } else {
      message = "Options saved!";
      success = true;
    }
    push_status_message(message, success);
  });
}

function restore_options() {
  chrome.storage.sync.get({
    "forwards": [],
    "domain": "",
    "api_key": ""
  }, function(items) {
    var select = document.getElementById("forwards");
    select.setAttribute("disabled", true);
    items.forwards.forEach(function(item) {
      append_list_element(select, item);
      set_element_sensitive_ex(select, true);
    }.bind(select));
    document.getElementById("domain").value = items.domain;
    document.getElementById("api-key").value = items.api_key;
  });
}

function add_forward_address() {
  var forwards = get_forwards();
  var input = document.getElementById("forwards-input");
  var forward = strip_string(input.value);
  if (forward && validate_email(forward) && forwards.indexOf(forward) === -1) {
    var select = document.getElementById("forwards");
    prepend_list_element(select, forward);
    set_element_sensitive("forwards-submit", false);
    set_element_sensitive_ex(select, true);
    set_element_sensitive("remove-submit", true);
    input.value = "";
  }
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

function remove_forward_address() {
  var select = document.getElementById("forwards");
  select.remove(select.selectedIndex);
  if (select.options.length === 0) {
    set_element_sensitive_ex(select, false);
    set_element_sensitive("remove-submit", false);
  }
}

(function() {
  document.addEventListener("DOMContentLoaded", restore_options);

  var submit = document.getElementById("forwards-submit");
  submit.addEventListener("click", add_forward_address);

  var input = document.getElementById("forwards-input");
  input.addEventListener("keypress", function() {
    // Check for enter key.
    if (event.keyCode === 13) {
      add_forward_address();
    }
  });
  input.addEventListener("input", function() {
    var email = strip_string(input.value);
    set_element_sensitive_ex(submit, validate_email(email));
  });
  document.getElementById("remove-submit").addEventListener(
    "click", remove_forward_address);
  document.getElementById("save").addEventListener("click", save_options);
})();
