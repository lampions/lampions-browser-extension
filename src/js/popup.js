import "../sass/main.scss";

import mailgun from "./mailgun.js";
import utils from "./utils.js";

function addRoute() {
  const input = document.getElementById("alias");
  const alias = utils.stripString(input.value);
  if (!alias) {
    utils.pushFailureMessage("No alias given");
    return;
  }

  const domainPromise = utils.storageSyncGet({"domain": ""});
  const routesPromise = utils.storageLocalGet({"routes": []});

  Promise.all([domainPromise, routesPromise]).then(values => {
    const [domainItems, routesItems] = values;
    if (domainItems === undefined || !domainItems.domain) {
      utils.pushFailureMessage("No domain defined yet");
      return;
    }
    const domain = domainItems.domain;
    const routes = routesItems.routes;

    // Check if alias is already defined.
    for (const route of routes) {
      if (route.description.alias === alias) {
        utils.pushFailureMessage("Route already defined");
        return;
      }
    }

    const button = document.getElementById("add");
    const elements = [input, button];
    elements.forEach(element => {
      utils.setElementSensitiveEx(element, false);
    });

    determineAvailableForwardAddresses(routes).then(forwards => {
      // TODO: Add error handling here, i.e., exit out if forwards is empty.
      return mailgun.addRoute(alias, forwards[0]).then(route => {
        const tr = createTableRow(route, domain, forwards);
        const table = document.getElementById("routes-table");
        table.insertBefore(tr, table.firstChild);

        input.value = "";
        utils.pushSuccessMessage("Route added");
        mailgun.synchronizeData();
      });
    }).catch(() => {
      utils.pushFailureMessage("Failed to add route");
    }).then(() => {
      elements.forEach(element => {
        utils.setElementSensitiveEx(element, true);
      });
    });
  });
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

function createTableRow(route, domain, forwards) {
  const routeId = route.id;
  const routeIsActive = mailgun.isRouteActive(route);

  const tr = document.createElement("tr");

  // Create alias address label.
  const aliasAddress = route.description["alias"] + "@" + domain;
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
  select.selectedIndex = forwards.indexOf(route.description.forward);
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
  checkbox.onmousedown = utils.leftClickHandler(() => {
    deactivateUiElements(tr, elements);
    const checked = checkbox.checked;
    utils.getRouteById(routeId).then(route => {
      return mailgun.updateRoute(route, {"active": !checked});
    }).then(route => {
      const routeIsActive = mailgun.isRouteActive(route);
      checkbox.checked = routeIsActive;
      if (!routeIsActive) {
        aliasLabel.classList.add("insensitive");
      }
      utils.pushSuccessMessage("Route updated");
      mailgun.synchronizeData();
    }).catch(msg => {
      // Restore the original checkbox state.
      checkbox.checked = checked;
      utils.pushFailureMessage("Failed to update route");
      console.log(msg);
    }).then(() => activateUiElements(tr, elements));
  });

  // Connect signal handler for changes in the forward address.
  select.onchange = event => {
    const option = select.options[select.selectedIndex];
    if (!option) {
      console.log("TODO");
    }
    const newForward = option.value;

    deactivateUiElements(tr, elements);

    utils.getRouteById(routeId).then(route => {
      return mailgun.updateRoute(route, {"forward": newForward});
    }).then(route => {
      utils.pushSuccessMessage("Route updated");
      mailgun.synchronizeData();
    }).catch(message => {
      console.log("TODO", message);
      // Restore the original route.
      mailgun.getRouteById(routeId).then(route => {
        select.selectedIndex = forwards.indexOf(route.description.forward);
      });
      utils.pushFailureMessage("Failed to update route");
    }).then(() => activateUiElements(tr, elements));
  };

  // Connect signal handler for copying an address to the clipboard.
  copyButton.onmousedown = utils.leftClickHandler(() => {
    navigator.clipboard.writeText(aliasAddress).then(() => {
      utils.pushSuccessMessage("Address copied to clipboard");
    }).catch(() => {
      utils.pushFailureMessage("Failed to copy address to clipboard");
    });
  });

  // Connect signal handler for deleting a route.
  deleteButton.onmousedown = utils.leftClickHandler(() => {
    deactivateUiElements(tr, elements);
    utils.getRouteById(routeId).then(route => {
      return mailgun.removeRoute(route);
    }).then(() => {
      const table = document.getElementById("routes-table");
      table.removeChild(tr);
      utils.pushSuccessMessage("Route removed");
      mailgun.synchronizeData();
    }).catch(() => {
      utils.pushFailureMessage("Failed to remove route");
    }).then(() => {
      activateUiElements(tr, elements);
    });
  });

  return tr;
}

function determineAvailableForwardAddresses(routes) {
  const forwards = [];

  routes.forEach(route => {
    const forward = route.description.forward;
    if (!forwards.includes(forward)) {
      forwards.push(forward);
    }
  });

  return utils.storageSyncGet({"forwards": []}).then(items => {
    if (items !== undefined && items.forwards) {
      items.forwards.forEach(forward => {
        if (!forwards.includes(forward)) {
          forwards.push(forward);
        }
      });
    }
    return forwards;
  });
}

function populateRoutesTable(routes) {
  const table = document.getElementById("routes-table");
  while (table.firstChild) {
    table.removeChild(table.firstChild);
  }
  utils.storageSyncGet({"domain": ""}).then(items => {
    if (items === undefined || !items.domain) {
      return;
    }

    determineAvailableForwardAddresses(routes).then(forwards => {
      routes.forEach(route => {
        const tr = createTableRow(route, items.domain, forwards);
        table.appendChild(tr);
      });
    });
  });
}

function initializeUi() {
  const submit = document.getElementById("add");
  submit.addEventListener("click", addRoute);

  const input = document.getElementById("alias");
  input.addEventListener("input", () => {
    const alias = utils.stripString(input.value);
    // Define dummy address to validate the input.
    const email = alias + "@domain.tld";
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

  utils.storageLocalGet({"routes": ""}).then(items => {
    if (items !== undefined && items.routes) {
      populateRoutesTable(items.routes);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  mailgun.synchronizeData().then(initializeUi);
});
