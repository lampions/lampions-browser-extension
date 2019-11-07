const Mailgun = (function() {
  const BASE_URL = "https://api.mailgun.net/v3";

  function API(domain, api_key) {
    this.domain = domain;
    this._api_key = api_key;
  }

  API.prototype = {
    _marshal_data: function(args) {
      if (args === undefined) {
        return;
      }
      var data = new FormData();
      for (var arg in args) {
        var value = args[arg];
        if (Array.isArray(value)) {
          value.forEach(function(v) {
            data.append(arg, v);
          });
        } else {
          data.append(arg, value);
        }
      }
      return data;
    },

    _resolve_request: function(method, endpoint, data) {
      var xhr = new XMLHttpRequest();
      var url = BASE_URL + endpoint;
      xhr.open(method, url, true, "api", this._api_key);
      return new Promise(function(resolve, reject) {
        xhr.onload = function() {
          var response;
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
        xhr.onerror = function() {
          reject("AJAX call failed");
          return;
        };
        xhr.send(this._marshal_data(data));
      }.bind(this));
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

  function _prepare_api_call() {
    return new Promise(function(resolve, reject) {
      chrome.storage.sync.get({"domain": "", "api_key": ""}, function(items) {
        if (items !== undefined && items.domain && items.api_key) {
          var api = new API(items.domain, items.api_key);
          resolve(api);
          return;
        } else {
          reject("Failed to obtain domain and API key from sync storage");
          return;
        }
      });
    });
  }

  function _parse_route_description(data) {
    // Routes defined through this extension store metadata as json-encoded
    // description fields on mailgun. This way we can implement the "drop"
    // behavior of routes where we remove the "forward" action of a route while
    // retaining the information about the original forward in the description.
    try {
      var route_description = JSON.parse(data);
    } catch (exc) {
      return null;
    }

    var attributes = ["alias", "forward"];
    for (var i = 0; i < attributes.length; ++i) {
      var attribute = attributes[i];
      if (route_description[attribute] === undefined) {
        return null;
      }
    }
    return route_description;
  }

  function fetch_routes() {
    return _prepare_api_call().then(function(api) {
      return api.get("/routes", {"limit": 0}).then(function(response) {
        var routes = [];
        for (var i = 0; i < response.total_count; ++i) {
          var route = response.items[i];
          var route_description = _parse_route_description(route.description);
          if (route_description) {
            route.description = route_description;
            routes.push(route);
          }
        }
        return routes;
      });
    });
  }

  function _prepare_route_api_data(alias, forward, active, domain) {
    var description = JSON.stringify({
      "alias": alias,
      "forward": forward
    });
    var expression = "match_recipient(\"" + alias + "@" + domain + "\")";
    var action = ["stop()"];
    if (active) {
      action.unshift("forward(\"" + forward + "\")");
    }
    return {
      "description": description,
      "expression": expression,
      "action": action
    };
  }

  function is_route_active(route) {
    // TODO: This could do with some error checking.
    var actions = route.actions;
    if (actions.length > 0 && actions[0] === "stop()") {
      return false;
    }
    return true;
  }

  function _get_with_default(object, key, fallback) {
    var value = object[key];
    if (value === undefined) {
      return fallback;
    }
    return value;
  }

  function update_route(route, options) {
    return _prepare_api_call().then(function(api) {
      var new_forward = _get_with_default(options, "forward",
                                          route.description.forward);
      var new_active = _get_with_default(options, "active",
                                         is_route_active(route));
      var data = _prepare_route_api_data(route.description.alias, new_forward,
                                         new_active, api.domain);
      return api.put("/routes/" + route.id, data).then(function(new_route) {
        var route_description = _parse_route_description(
          new_route.description);
        if (route_description) {
          new_route.description = route_description;
        }
        return new_route;
      });
    });
  }

  function add_route(alias, forward) {
    return _prepare_api_call().then(function(api) {
      var data = _prepare_route_api_data(alias, forward, true, api.domain);
      return api.post("/routes", data).then(function(response) {
        var route = response.route;
        var route_description = _parse_route_description(route.description);
        if (route_description) {
          route.description = route_description;
        }
        return route;
      });
    });
  }

  function remove_route(route) {
    return _prepare_api_call().then(function(api) {
      return api.delete("/routes/" + route.id);
    });
  }

  function synchronize_data() {
    fetch_routes().then(function(routes) {
      chrome.storage.local.set({"routes": routes});
    }).catch(function() {});
  }

  return Object.freeze({
    fetch_routes: fetch_routes,
    add_route: add_route,
    update_route: update_route,
    remove_route: remove_route,
    synchronize_data: synchronize_data,
    is_route_active: is_route_active
  });
})();
