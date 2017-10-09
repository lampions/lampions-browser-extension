const BASE_URL = "https://api.mailgun.net/v3";

// TODO: Rename this.
function API(domain, api_key) {
  this.domain = domain;
  this._api_key = api_key;
}

API.prototype = {
  // TODO: Add a method to marshal an object into FormData.

  _resolve_request: function(method, endpoint, data) {
    var xhr = new XMLHttpRequest();
    var url = BASE_URL + endpoint;
    xhr.open(method, url, true, "api", this._api_key);
    return new Promise(function(resolve, reject) {
      xhr.onload = function() {
        var response = JSON.parse(xhr.responseText);
        if (xhr.status === 200) {
          resolve(response);
        } else {
          reject(response);
        }
      };
      xhr.onerror = function() {
        reject();
      };
      xhr.send(data);
    });
  },

  get: function(endpoint, data) {
    return this._resolve_request("GET", endpoint, data);
  },

  post: function(endpoint, data) {
    return this._resolve_request("POST", endpoint, data);
  },

  put: function(endpoint, data) {
    return this._resolve_request("PUT", endpoint, data);
  },

  delete: function(endpoint, data) {
    return this._resolve_request("DELETE", endpoint, data);
  }
}

function prepare_api_call() {
  return new Promise(function(resolve, reject) {
    chrome.storage.sync.get({"domain": "", "api_key": ""}, function(items) {
      if (items.domain && items.api_key) {
        var api = new API(items.domain, items.api_key);
        resolve(api);
      } else {
        reject();
      }
    });
  });
}

function fetch_routes() {
  return prepare_api_call().then(function(api) {
    var data = new FormData();
    data.append("limit", 0);

    return api.get("/routes", data).then(function(response) {
      var routes = [];
      for (var i = 0; i < response.total_count; ++i) {
        var route = response.items[i];
        var route_description = parse_metadata(route.description);
        if (route_description) {
          route_description.id = route.id;
          routes.push(route_description);
        }
      }
      return routes;
    });
  });
}

function parse_metadata(data) {
  // Routes defined through this extension store metadata as json-encoded
  // description fields on mailgun. This way we can implement the "drop"
  // behavior of routes where we remove the "forward" action of a route while
  // retaining the information about the original forward in the description.
  try {
    var route_description = JSON.parse(data);
  } catch (exc) {
    return null;
  }

  var attributes = ["alias", "forward", "active"];
  for (var key in attributes) {
    var attribute = attributes[key];
    if (route_description[attribute] === undefined) {
      return null;
    }
  }
  return route_description;
}

function construct_metadata(alias, forward, active) {
  return JSON.stringify({
    "alias": alias,
    "forward": forward,
    "active": active
  });
}

function update_route(id, alias, active) {
  return prepare_api_call().then(function(api) {
    // XXX:
    var up = new Error("NotImplemented");
    throw up;

    var action = ["stop()"];
    // TODO: Update the metadata.
    if (active) {
      action.unshift("");
    }
    var data = new FormData();
    data.append("action", action);

    return api.put("/routes", data);
  });
}

// TODO: Rename this.
function set_route(alias, forward) {
  return prepare_api_call().then(function(api) {
    // TODO: Factor this out so we can re-use it in "update_route".
    var description = construct_metadata(alias, forward, true);
    var expression = "match_recipient('" + alias + "@" + api.domain + "')";
    var actions = ["forward('" + forward + "')", "stop()"];

    var data = new FormData();
    data.append("description", description);
    data.append("expression", expression);
    actions.forEach(function(action) {
      data.append("action", action);
    });

    return api.post("/routes", data);
  });
}

function remove_route(id) {
  return prepare_api_call().then(function(api) {
    return api.delete("/routes/" + id);
  });
}

function synchronize_data() {
  fetch_routes().then(function(routes) {
    chrome.storage.local.set({"routes": routes});
  });
}
