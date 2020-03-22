function stripString(s) {
  return s.replace(/^\s+|\s+$/g, "");
}

function prependListElement(select, item) {
  const option = document.createElement("option");
  option.value = item;
  option.textContent = item;
  option.setAttribute("selected", true);
  select.insertBefore(option, select.firstChild);
}

function appendListElement(select, item) {
  const option = document.createElement("option");
  option.value = item;
  option.textContent = item;
  select.appendChild(option);
  select.removeAttribute("disabled");
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function pushStatusMessage(message, success) {
  const status = document.getElementById("status");
  // Show the status label but also schedule adding the fade-out class to the
  // element to hide the label again.
  status.textContent = message;
  if (success) {
    status.className = "success";
  } else {
    status.className = "failure";
  }
  status.style.opacity = 1;
  setTimeout(status => {
    status.classList.add("fade-out");
    status.style.opacity = 0;
  }, 1000, status);
}

function pushSuccessMessage(message) {
  pushStatusMessage(message, true);
}

function pushFailureMessage(message) {
  pushStatusMessage(message, false);
}

function setElementSensitiveEx(element, status) {
  if (status) {
    element.removeAttribute("disabled");
  } else {
    element.setAttribute("disabled", true);
  }
}

function setElementSensitive(id, status) {
  const element = document.getElementById(id);
  setElementSensitiveEx(element, status);
}

function storageGet(method, data) {
  return new Promise((resolve, reject) => {
    method(data, items => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(error);
      } else {
        resolve(items);
      }
    });
  });
}

function storageLocalGet(data) {
  return storageGet(chrome.storage.local.get, data);
}

function storageSyncGet(data) {
  return storageGet(chrome.storage.sync.get, data);
}

function storageSet(method, data) {
  return new Promise((resolve, reject) => {
    method(data, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function storageLocalSet(data) {
  return storageSet(chrome.storage.local.set, data);
}

function storageSyncSet(data) {
  return storageSet(chrome.storage.sync.set, data);
}

async function getRouteById(id) {
  const items = await storageLocalGet({"routes": []});
  if (items === undefined) {
    throw "Failed to retrieve routes!";
  }
  let route = null;
  const routes = items.routes;
  for (const route_ of routes) {
    if (route_.id === id) {
      route = route_;
      break;
    }
  }
  if (!route) {
    throw "No route information for route id '" + id + "'";
  }
  return route;
}

export default {
  stripString,
  prependListElement,
  appendListElement,
  validateEmail,
  pushSuccessMessage,
  pushFailureMessage,
  setElementSensitiveEx,
  setElementSensitive,
  storageLocalGet,
  storageSyncGet,
  storageLocalSet,
  storageSyncSet,
  getRouteById
};
