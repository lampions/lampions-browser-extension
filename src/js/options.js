import "../sass/main.scss";
import "../sass/options.css";

import backend from "./mailgun.js";
import utils from "./utils.js";

function getForwards() {
  const forwards = [];
  const select = document.getElementById("forwards");
  const options = select.options;
  Array.from(select.options).forEach(option => forwards.push(option.value));
  return forwards;
}

function saveOptions() {
  const forwards = getForwards();
  const domain = document.getElementById("domain").value;
  const api_key = document.getElementById("api-key").value;
  utils.storageSyncSet({forwards, domain, api_key}).then(() => {
    utils.pushSuccessMessage("Options saved!");
    backend.synchronizeData();
  }).catch(() => {
    utils.pushFailureMessage("Failed to save options!");
  });
}

function restoreOptions() {
  utils.storageSyncGet({
    "forwards": [],
    "domain": "",
    "api_key": ""
  }).then(items => {
    if (items === undefined) {
      return;
    }
    const select = document.getElementById("forwards");
    select.setAttribute("disabled", true);
    items.forwards.forEach(item => {
      utils.appendListElement(select, item);
      utils.setElementSensitiveEx(select, true);
    });
    document.getElementById("domain").value = items.domain;
    document.getElementById("api-key").value = items.api_key;
  });
}

function addForwardAddress() {
  const forwards = getForwards();
  const input = document.getElementById("forwards-input");
  const forward = utils.stripString(input.value);
  if (forward &&
      utils.validateEmail(forward) &&
      forwards.indexOf(forward) === -1) {
    const select = document.getElementById("forwards");
    utils.prependListElement(select, forward);
    utils.setElementSensitive("forwards-submit", false);
    utils.setElementSensitiveEx(select, true);
    utils.setElementSensitive("remove-submit", true);
    input.value = "";
    saveOptions();
  }
}

function removeForwardAddress() {
  const select = document.getElementById("forwards");
  select.remove(select.selectedIndex);
  if (select.options.length === 0) {
    utils.setElementSensitiveEx(select, false);
    utils.setElementSensitive("remove-submit", false);
  }
  saveOptions();
}

(function() {
  document.addEventListener("DOMContentLoaded", restoreOptions);

  const submit = document.getElementById("forwards-submit");
  submit.addEventListener("click", addForwardAddress);

  const input = document.getElementById("forwards-input");
  input.addEventListener("input", () => {
    const email = utils.stripString(input.value);
    utils.setElementSensitiveEx(submit, utils.validateEmail(email));
  });
  input.addEventListener("keypress", () => {
    // Check for enter key.
    if (event.key === "Enter") {
      addForwardAddress();
    }
  });

  document.getElementById("remove-submit").addEventListener(
    "click", removeForwardAddress);
  document.getElementById("save").addEventListener("click", saveOptions);
})();
