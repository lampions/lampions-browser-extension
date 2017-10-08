function strip_string(s) {
  return s.replace(/^\s+|\s+$/g, "");
}

function array_contains(a, s) {
  return a.indexOf(s) >= 0;
}

function prepend_list_element(select, item) {
  var option = document.createElement("option");
  option.value = item;
  option.innerHTML = item;
  option.setAttribute("selected", true);
  select.insertBefore(option, select.firstChild);
}

function append_list_element(select, item) {
  var option = document.createElement("option");
  option.value = item;
  option.innerHTML = item;
  select.appendChild(option);
  select.removeAttribute("disabled");
}

function validate_email(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
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
