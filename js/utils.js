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
