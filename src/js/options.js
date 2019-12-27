import "../sass/main.scss";
import "../sass/options.css";

import Mailgun from "./mailgun.js";
import Utils from "./utils.js";

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
    if (chrome.runtime.lastError) {
      Utils.push_failure_message("Failed to save options!");
    } else {
      Utils.push_success_message("Options saved!");
      Mailgun.synchronize_data();
    }
  });
}

function restore_options() {
  chrome.storage.sync.get({
    "forwards": [],
    "domain": "",
    "api_key": ""
  }, function(items) {
    if (items === undefined) {
      return;
    }
    var select = document.getElementById("forwards");
    select.setAttribute("disabled", true);
    items.forwards.forEach(function(item) {
      Utils.append_list_element(select, item);
      Utils.set_element_sensitive_ex(select, true);
    }.bind(select));
    document.getElementById("domain").value = items.domain;
    document.getElementById("api-key").value = items.api_key;
  });
}

function add_forward_address() {
  var forwards = get_forwards();
  var input = document.getElementById("forwards-input");
  var forward = Utils.strip_string(input.value);
  if (forward &&
      Utils.validate_email(forward) &&
      forwards.indexOf(forward) === -1) {
    var select = document.getElementById("forwards");
    Utils.prepend_list_element(select, forward);
    Utils.set_element_sensitive("forwards-submit", false);
    Utils.set_element_sensitive_ex(select, true);
    Utils.set_element_sensitive("remove-submit", true);
    input.value = "";
    save_options();
  }
}

function remove_forward_address() {
  var select = document.getElementById("forwards");
  select.remove(select.selectedIndex);
  if (select.options.length === 0) {
    Utils.set_element_sensitive_ex(select, false);
    Utils.set_element_sensitive("remove-submit", false);
  }
  save_options();
}

(function() {
  document.addEventListener("DOMContentLoaded", restore_options);

  var submit = document.getElementById("forwards-submit");
  submit.addEventListener("click", add_forward_address);

  var input = document.getElementById("forwards-input");
  input.addEventListener("input", function() {
    var email = Utils.strip_string(input.value);
    Utils.set_element_sensitive_ex(submit, Utils.validate_email(email));
  });
  input.addEventListener("keypress", function() {
    // Check for enter key.
    if (event.key === "Enter") {
      add_forward_address();
    }
  });

  document.getElementById("remove-submit").addEventListener(
    "click", remove_forward_address);
  document.getElementById("save").addEventListener("click", save_options);
})();
