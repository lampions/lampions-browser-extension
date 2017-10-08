const BASE_URL = "https://api.mailgun.net/v3";

// TODO: Pull this into the API object as well.
function get_api_data() {
  return new Promise(function(resolve, reject) {
    chrome.storage.sync.get({"domain": "", "api_key": ""}, function(items) {
      if (items.domain && items.api_key) {
        resolve(items);
      } else {
        reject();
      }
    });
  });
}

// TODO: Rename this.
function API(api_key) {
  this._api_key = api_key;
}

API.prototype = {
  // TODO: Get rid of this.
  api_call: function(method, endpoint) {
    var xhr = new XMLHttpRequest();
    var url = BASE_URL + endpoint;
    xhr.open(method, url, true, "api", this._api_key);
    return xhr;
  },

  _build_xhr: function(method, endpoint) {
    return this.api_call(method, endpoint);
  },

  // TODO: Add a method to marshal an object into FormData.

  _resolve_request: function(xhr, data) {
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
    }.bind(this));
  },

  get: function(endpoint, data) {
    var xhr = this._build_xhr("GET", endpoint);
    return this._resolve_request(xhr, data);
  },

  post: function(endpoint, data) {
    var xhr = this._build_xhr("POST", endpoint);
    return this._resolve_request(xhr, data);
  },

  put: function(endpoint, data) {
    var xhr = this._build_xhr("PUT", endpoint);
    return this._resolve_request(xhr, data);
  },

  delete: function(endpoint, data) {
    var xhr = this._build_xhr("DELETE", endpoint);
    return this._resolve_request(xhr, data);
  }
}

function fetch_routes() {
  return get_api_data().then(function(items) {
    var domain = items.domain;
    var api_key = items.api_key;

    var data = new FormData();
    data.append("limit", 0);

    var api = new API(api_key);
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
  return get_api_data().then(function(items) {
    // XXX:
    var up = new Error("NotImplemented");
    throw up;

    var domain = items.domain;
    var api_key = items.api_key;

    var action = ["stop()"];
    // TODO: Update the metadata.
    if (active) {
      action.unshift("");
    }
    var data = new FormData();
    data.append("action", action);

    var api = new API(api_key);
    return api.put("/routes", data);
  });
}

// TODO: Rename this.
function set_route(alias, forward) {
  return get_api_data().then(function(items) {
    var domain = items.domain;
    var api_key = items.api_key;

    // TODO: Factor this out so we can re-use it in "update_route".
    var description = construct_metadata(alias, forward, true);
    var expression = "match_recipient('" + alias + "@" + domain + "')";
    var actions = ["forward('" + forward + "')", "stop()"];

    var data = new FormData();
    data.append("description", description);
    data.append("expression", expression);
    actions.forEach(function(action) {
      data.append("action", action);
    });

    var api = new API(api_key);
    return api.post("/routes", data);
  });
}

function remove_route(id) {
  return get_api_data().then(function(items) {
    var domain = items.domain;
    var api_key = items.api_key;
    var api = new API(api_key);
    return api.delete("/routes/" + id);
  });
}
