const Utils = (function() {
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
    status.textContent = message;
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

  return Object.freeze({
    strip_string: strip_string,
    prepend_list_element: prepend_list_element,
    append_list_element: append_list_element,
    validate_email: validate_email,
    set_element_sensitive_ex: set_element_sensitive_ex,
    set_element_sensitive: set_element_sensitive,
    push_status_message: push_status_message
  });
})();
