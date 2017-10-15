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
          var response = JSON.parse(xhr.responseText);
          if (xhr.status === 200) {
            resolve(response);
          } else {
            reject(response.error);
          }
        };
        xhr.onerror = function() {
          reject("AJAX call failed");
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

  function prepare_api_call() {
    return new Promise(function(resolve, reject) {
      chrome.storage.sync.get({"domain": "", "api_key": ""}, function(items) {
        if (items.domain && items.api_key) {
          var api = new API(items.domain, items.api_key);
          resolve(api);
        } else {
          reject("Failed to obtain domain and API key from sync storage");
        }
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

  function fetch_routes() {
    return prepare_api_call().then(function(api) {
      return api.get("/routes", {"limit": 0}).then(function(response) {
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

  function prepare_route_api_data(alias, forward, active, domain) {
    var description = construct_metadata(alias, forward, active);
    var expression = "match_recipient('" + alias + "@" + domain + "')";
    var action = ["stop()"];
    if (active) {
      action.unshift("forward('" + forward + "')");
    }
    return {
      "description": description,
      "expression": expression,
      "action": action
    };
  }

  function update_route(route, active) {
    return prepare_api_call().then(function(api) {
      var data = prepare_route_api_data(
        route.alias, route.forward, active, api.domain);
      return api.put("/routes/" + route.id, data).then(function(response) {
        var updated_route = parse_metadata(response.description);
        updated_route.id = route.id;
        return updated_route;
      });
    });
  }

  function add_route(alias, forward) {
    return prepare_api_call().then(function(api) {
      var data = prepare_route_api_data(alias, forward, true, api.domain);
      return api.post("/routes", data).then(function(response) {
        var route = parse_metadata(response.route.description);
        route.id = response.route.id;
        return route;
      });
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
    }).catch(function() {});
  }

  return Object.freeze({
    fetch_routes: fetch_routes,
    add_route: add_route,
    update_route: update_route,
    remove_route: remove_route,
    synchronize_data: synchronize_data
  });
})();
