import "core-js/stable";
import "regenerator-runtime/runtime";

import backend from "./aws.js";
import utils from "./utils.js";

import "../sass/main.scss";
import "../sass/options.css";

function getForwards() {
  const forwards = [];
  const select = document.getElementById("forwards");
  Array.from(select.options).forEach(option => forwards.push(option.value));
  return forwards;
}

async function saveOptions() {
  const forwards = getForwards();
  const domain = document.getElementById("domain").value;
  const accessKeyId = document.getElementById("access-key-id").value;
  const secretAccessKey = document.getElementById("secret-access-key").value;

  try {
    await utils.storageSyncSet({
      forwards,
      domain,
      accessKeyId,
      secretAccessKey
    });
    await backend.synchronizeData();
    utils.pushSuccessMessage("Options saved!");
  } catch (exception) {
    utils.pushFailureMessage("Failed to save options: " + exception.message);
  }
}

async function restoreOptions() {
  const items = await utils.storageSyncGet({
    forwards: [],
    domain: "",
    accessKeyId: "",
    secretAccessKey: ""
  });
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
  document.getElementById("access-key-id").value = items.accessKeyId;
  document.getElementById("secret-access-key").value = items.secretAccessKey;
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
