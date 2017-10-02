function strip_string(s) {
  return s.replace(/^\s+|\s+$/g, "");
}

function array_contains(a, s) {
  return a.indexOf(s) >= 0;
}

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

function append_list_element(select, item) {
  var option = document.createElement("option");
  option.value = item;
  option.innerHTML = item;
  select.appendChild(option);
  select.removeAttribute("disabled");
}

function prepend_list_element(select, item) {
  var option = document.createElement("option");
  option.value = item;
  option.innerHTML = item;
  option.setAttribute("selected", true);
  select.insertBefore(option, select.firstChild);
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
    // TODO: We need to check here if we have any routes defined that still use
    //       a no longer defined forward address. Easiest solution would be to
    //       highlight a route as invalid to prompt user interaction.
    var status = document.getElementById("status");
    // Show the status label but also schedule adding the fade-out class to the
    // element to hide the label again.
    status.className = "";
    status.style.opacity = 1;
    setTimeout(function(status) {
      status.className = "fade-out";
      status.style.opacity = 0;
    }, 1000, status);
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
      select.removeAttribute("disabled");
    }.bind(select));
    document.getElementById("domain").value = items.domain;
    document.getElementById("api-key").value = items.api_key;
  });
}

function add_forward_address() {
  var forwards = get_forwards();
  var input = document.getElementById("forwards-input");
  var forward = strip_string(input.value);
  if (forward && forwards.indexOf(forward) === -1) {
    var select = document.getElementById("forwards");
    prepend_list_element(select, forward);
    select.removeAttribute("disabled");
    input.value = "";
  }
}

function remove_forward_address() {
  var select = document.getElementById("forwards");
  select.remove(select.selectedIndex);
  if (select.options.length === 0) {
    select.setAttribute("disabled", true);
  }
}

(function() {
  document.addEventListener("DOMContentLoaded", restore_options);

  document.getElementById("forwards-submit").addEventListener(
    "click", add_forward_address);
  document.getElementById("forwards-input").addEventListener(
    "keydown", function(element) {
      if (event.keyCode === 13) {
        add_forward_address();
      }
    }
  );
  document.getElementById("remove-submit").addEventListener(
    "click", remove_forward_address);
  document.getElementById("save").addEventListener("click", save_options);
})();
