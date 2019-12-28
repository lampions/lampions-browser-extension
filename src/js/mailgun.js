import utils from "./utils.js";

const BASE_URL = "https://api.mailgun.net/v3";

class API {
  constructor(domain, apiKey) {
    this.domain = domain;
    this.apiKey_ = apiKey;
  }

  marshalData_(args) {
    if (args === undefined) {
      return;
    }
    const data = new FormData();
    for (const arg in args) {
      const value = args[arg];
      if (Array.isArray(value)) {
        value.forEach(v => data.append(arg, v));
      } else {
        data.append(arg, value);
      }
    }
    return data;
  }

  resolveRequest_(method, endpoint, data) {
    const xhr = new XMLHttpRequest();
    const url = BASE_URL + endpoint;
    xhr.open(method, url, true, "api", this.apiKey_);
    return new Promise((resolve, reject) => {
      xhr.onload = () => {
        let response = null;
        try {
          response = JSON.parse(xhr.responseText);
        } catch (exc) {
          reject("Server responded with status code: " +
                 xhr.status.toString());
          return;
        }
        if (xhr.status === 200) {
          resolve(response);
          return;
        } else {
          reject(response.error);
          return;
        }
      };
      xhr.onerror = () => {
        reject("AJAX call failed");
        return;
      };
      xhr.send(this.marshalData_(data));
    });
  }

  get(endpoint, data) {
    return this.resolveRequest_("GET", endpoint, data);
  }

  post(endpoint, data) {
    return this.resolveRequest_("POST", endpoint, data);
  }

  put(endpoint, data) {
    return this.resolveRequest_("PUT", endpoint, data);
  }

  delete(endpoint, data) {
    return this.resolveRequest_("DELETE", endpoint, data);
  }
}

function prepareApiCall() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get({"domain": "", "api_key": ""}, items => {
      if (items !== undefined && items.domain && items.api_key) {
        const api = new API(items.domain, items.api_key);
        resolve(api);
      } else {
        reject("Failed to obtain domain and API key from sync storage");
      }
    });
  });
}

function parseRouteDescription(data) {
  // Routes defined through this extension store metadata as json-encoded
  // description fields on mailgun. This way we can implement the "drop"
  // behavior of routes where we remove the "forward" action of a route while
  // retaining the information about the original forward in the description.
  let routeDescription = null;
  try {
    routeDescription = JSON.parse(data);
  } catch (exc) {
    return null;
  }

  const attributes = ["alias", "forward"];
  for (const attribute of attributes) {
    if (routeDescription[attribute] === undefined) {
      return null;
    }
  }
  return routeDescription;
}

function fetchRoutes() {
  return prepareApiCall().then(api => {
    return api.get("/routes", {"limit": 0}).then(response => {
      const routes = [];
      for (const route of response.items) {
        const routeDescription = parseRouteDescription(route.description);
        if (routeDescription) {
          route.description = routeDescription;
          routes.push(route);
        }
      }
      return routes;
    });
  });
}

function prepareRouteApiData(alias, forward, active, domain) {
  const description = JSON.stringify({
    "alias": alias,
    "forward": forward
  });
  const expression = "match_recipient(\"" + alias + "@" + domain + "\")";
  const action = ["stop()"];
  if (active) {
    action.unshift("forward(\"" + forward + "\")");
  }
  return {
    "description": description,
    "expression": expression,
    "action": action
  };
}

function isRouteActive(route) {
  // TODO: This could do with some error checking.
  const actions = route.actions;
  if (actions.length > 0 && actions[0] === "stop()") {
    return false;
  }
  return true;
}

function updateRoute(route, options) {
  const getWithDefault = (object, key, fallback) => {
    const value = object[key];
    if (value === undefined) {
      return fallback;
    }
    return value;
  };

  return prepareApiCall().then(api => {
    const newForward = getWithDefault(options, "forward",
                                      route.description.forward);
    const newActive = getWithDefault(options, "active",
                                     isRouteActive(route));
    const data = prepareRouteApiData(route.description.alias, newForward,
                                     newActive, api.domain);
    return api.put("/routes/" + route.id, data).then(newRoute => {
      const routeDescription = parseRouteDescription(newRoute.description);
      if (routeDescription) {
        newRoute.description = routeDescription;
      }
      return newRoute;
    });
  });
}

function addRoute(alias, forward) {
  return prepareApiCall().then(api => {
    const data = prepareRouteApiData(alias, forward, true, api.domain);
    return api.post("/routes", data).then(response => {
      const route = response.route;
      const routeDescription = parseRouteDescription(route.description);
      if (routeDescription) {
        route.description = routeDescription;
      }
      return route;
    });
  });
}

function removeRoute(route) {
  return prepareApiCall().then(api => {
    return api.delete("/routes/" + route.id);
  });
}

function synchronizeData() {
  return fetchRoutes().then(routes => {
    utils.storageLocalSet({"routes": routes});
  });
}

export default Object.freeze({
  addRoute: addRoute,
  updateRoute: updateRoute,
  removeRoute: removeRoute,
  synchronizeData: synchronizeData,
  isRouteActive: isRouteActive
});
