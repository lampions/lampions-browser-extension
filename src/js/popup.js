import "core-js/stable";
import "regenerator-runtime/runtime";

import backend from "./aws.js";
import utils from "./utils.js";

import "../sass/main.scss";
import "../sass/dialog.scss";

async function addRoute() {
  const input = document.getElementById("alias");
  const alias = utils.stripString(input.value);
  if (!alias) {
    utils.pushFailureMessage("No alias given");
    return;
  }

  const promises = [
    utils.storageSyncGet({"domain": ""}),
    utils.storageLocalGet({"routes": []})
  ];
  const [domainItems, routesItems] = await Promise.all(promises);
  if (domainItems === undefined || !domainItems.domain) {
    utils.pushFailureMessage("No domain defined yet");
    return;
  }
  const { domain } = domainItems;
  const { routes } = routesItems;

  // Check if alias is already defined.
  for (const route of routes) {
    if (route.alias === alias) {
      utils.pushFailureMessage(`Route for alias '${alias}' already exists`);
      return;
    }
  }

  const button = document.getElementById("add");
  const elements = [input, button];
  elements.forEach(element => {
    utils.setElementSensitiveEx(element, false);
  });

  // TODO: Add error handling here, i.e., exit out if forwards is empty.
  const forwards = await determineAvailableForwardAddresses(routes);
  let route = null;
  try {
    route = await backend.addRoute(alias, forwards[0]);
  } catch {
    utils.pushFailureMessage("Failed to add route");
  }

  if (route) {
    const tr = createTableRow(route, domain, forwards);
    const table = document.getElementById("routes-table");
    table.insertBefore(tr, table.firstChild);

    input.value = "";
    utils.pushSuccessMessage("Route added");
    backend.synchronizeData();
  }

  elements.forEach(element => utils.setElementSensitiveEx(element, true));
}

function deactivateUiElements(tr, elements) {
  tr.className = "insensitive";
  elements.forEach(element => {
    utils.setElementSensitiveEx(element, false);
  });
}

function activateUiElements(tr, elements) {
  tr.className = "";
  elements.forEach(element => {
    utils.setElementSensitiveEx(element, true);
  });
}

function showConfirmDialog(question, callback) {
  const appendElements = (parent, elements) => {
    elements.forEach(element => parent.appendChild(element));
  };

  return () => {
    const dialog = document.getElementById("dialog");
    dialog.innerHTML = "";

    const onClickHandler = event => {
      dialog.classList.remove("visible");
      if (event.target.value === "yes") {
        callback();
      }
    };

    const label = document.createElement("span");
    label.className = "message";
    label.textContent = question;

    const yesButton = document.createElement("button");
    yesButton.textContent = "Yes";
    yesButton.value = "yes";

    const noButton = document.createElement("button");
    noButton.textContent = "No";
    noButton.value = "no";

    yesButton.onclick = noButton.onclick = onClickHandler;

    const buttons = document.createElement("div");
    buttons.className = "button-group";
    appendElements(buttons, [yesButton, noButton]);

    appendElements(dialog, [label, buttons]);

    dialog.classList.add("visible");
  };
}

function createTableRow(route, domain, forwards) {
  const routeId = route.id;
  const routeIsActive = route.active;

  const tr = document.createElement("tr");

  // Create alias address label.
  const aliasAddress = route.alias + "@" + domain;
  const aliasLabel = document.createElement("span");
  aliasLabel.textContent = aliasAddress;
  if (!routeIsActive) {
    aliasLabel.classList.add("insensitive");
  }
  let td = document.createElement("td");
  td.appendChild(aliasLabel);
  tr.appendChild(td);

  // Create a dropdown list of forwarding addresses.
  const select = document.createElement("select");
  forwards.forEach(forward => {
    utils.appendListElement(select, forward);
  });
  // Set the active option for the route.
  select.selectedIndex = forwards.indexOf(route.forward);
  td = document.createElement("td");
  td.appendChild(select);
  tr.appendChild(select);

  // Create a state checkbox to control the route activity.
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  if (routeIsActive) {
    checkbox.checked = true;
  }
  td = document.createElement("td");
  td.appendChild(checkbox);
  tr.appendChild(td);

  // Create a button to copy an alias address to the clipboard.
  const copyButton = document.createElement("button");
  copyButton.classList.add("button", "icon-copy");
  td = document.createElement("td");
  td.appendChild(copyButton);
  tr.appendChild(td);

  // Append a button to remove a route.
  const deleteButton = document.createElement("button");
  deleteButton.classList.add("button", "icon-delete");
  td = document.createElement("td");
  td.appendChild(deleteButton);
  tr.appendChild(td);

  const elements = [select, checkbox, copyButton, deleteButton];

  // Connect signal handler for changes to the route activity state.
  checkbox.onchange = async () => {
    deactivateUiElements(tr, elements);
    const checked = checkbox.checked;
    const route = await backend.updateRoute(await utils.getRouteById(routeId),
                                            {"active": checked});

    try {
      const routeIsActive = route.active;
      checkbox.checked = routeIsActive;
      if (routeIsActive) {
        aliasLabel.classList.remove("insensitive");
      } else {
        aliasLabel.classList.add("insensitive");
      }
      utils.pushSuccessMessage("Route updated");
      await backend.synchronizeData();
    } catch (exception) {
      // Restore the original checkbox state.
      checkbox.checked = checked;
      utils.pushFailureMessage("Failed to update route");
      console.log(exception.message);
    }
    activateUiElements(tr, elements);
  };

  // Connect signal handler for changes in the forward address.
  select.onchange = () => {
    const option = select.options[select.selectedIndex];
    if (!option) {
      console.log("TODO");
    }
    const newForward = option.value;

    deactivateUiElements(tr, elements);

    utils.getRouteById(routeId).then(route => {
      return backend.updateRoute(route, {"forward": newForward});
    }).then(() => {
      utils.pushSuccessMessage("Route updated");
      backend.synchronizeData();
    }).catch(message => {
      console.log("TODO", message);
      // Restore the original route.
      backend.getRouteById(routeId).then(route => {
        select.selectedIndex = forwards.indexOf(route.forward);
      });
      utils.pushFailureMessage("Failed to update route");
    }).then(() => activateUiElements(tr, elements));
  };

  // Connect signal handler for copying an address to the clipboard.
  copyButton.onclick = async () => {
    try {
      await navigator.clipboard.writeText(aliasAddress)
      utils.pushSuccessMessage("Address copied to clipboard");
    } catch {
      utils.pushFailureMessage("Failed to copy address to clipboard");
    }
  };

  // Connect signal handler for deleting a route.
  const message = `Delete route for alias '${route.alias}'?`;
  deleteButton.onclick = showConfirmDialog(message, () => {
    deactivateUiElements(tr, elements);
    utils.getRouteById(routeId).then(route => {
      return backend.removeRoute(route);
    }).then(() => {
      const table = document.getElementById("routes-table");
      table.removeChild(tr);
      utils.pushSuccessMessage("Route removed");
      backend.synchronizeData();
    }).catch((error) => {
      utils.pushFailureMessage(`Failed to remove route: ${error.message}`);
    }).then(() => {
      activateUiElements(tr, elements);
    });
  });

  return tr;
}

async function determineAvailableForwardAddresses(routes) {
  const forwards = [];

  routes.forEach(route => {
    const { forward } = route;
    if (!forwards.includes(forward)) {
      forwards.push(forward);
    }
  });

  const items = await utils.storageSyncGet({"forwards": []});
  if (items !== undefined && items.forwards) {
    items.forwards.forEach(forward => {
      if (!forwards.includes(forward)) {
        forwards.push(forward);
      }
    });
  }
  return forwards;
}

async function populateRoutesTable(routes) {
  const table = document.getElementById("routes-table");
  while (table.firstChild) {
    table.removeChild(table.firstChild);
  }
  const items = await utils.storageSyncGet({"domain": ""});
  if (items === undefined || !items.domain) {
    return;
  }
  const forwards = await determineAvailableForwardAddresses(routes);
  routes.forEach(route => {
    const tr = createTableRow(route, items.domain, forwards);
    table.appendChild(tr);
  });
}

async function initializeUi() {
  const submit = document.getElementById("add");
  submit.addEventListener("click", addRoute);

  const input = document.getElementById("alias");
  input.addEventListener("input", () => {
    const alias = utils.stripString(input.value);
    // Define dummy address to validate the input.
    const email = `${alias}@domain.tld`;
    utils.setElementSensitiveEx(submit, utils.validateEmail(email));
  });
  input.addEventListener("keypress", () => {
    // Check for enter key.
    if (event.key === "Enter") {
      addRoute();
    }
  });

  document.getElementById("settings").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  const items = await utils.storageLocalGet({"routes": ""});
  if (items !== undefined && items.routes) {
    populateRoutesTable(items.routes);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await backend.synchronizeData();
  } catch (error) {
    utils.pushFailureMessage(error);
  }
  initializeUi();
});
