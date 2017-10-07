const BASE_URL = "https://api.mailgun.net/v3";

function API(api_key) {
  this._api_key = api_key;
}

API.prototype = {
  api_call: function(method, endpoint) {
    var xhr = new XMLHttpRequest();
    var endpoint = "/routes";
    var url = BASE_URL + endpoint;
    xhr.open(method, url, true, "api", this._api_key);
    return xhr;
  }
}

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

function fetch_routes() {
  return get_api_data().then(function(items) {
    var domain = items.domain;
    var api_key = items.api_key;

    return new Promise(function(resolve, reject) {
      var api = new API(api_key);
      var xhr = api.api_call("GET", "/routes");
      xhr.onload = function() {
        var response = JSON.parse(xhr.responseText);
        var routes = [];
        for (var i = 0; i < response.total_count; ++i) {
          var route = response.items[i];
          var route_description = parse_metadata(route.description);
          if (route_description) {
            route_description.id = route.id;
            routes.push(route_description);
          }
        }
        resolve(routes);
      };
      xhr.onerror = function() {
        reject();
      };
      var data = new FormData();
      data.append("limit", 0);
      xhr.send(data);
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

  if (!route_description.alias ||
      !route_description.forward ||
      !route_description.action) {
    return null;
  }
  return route_description;
}

function construct_metadata(alias, forward, action) {
  return JSON.stringify({
    "alias": alias,
    "forward": forward,
    "action": action
  });
}

function update_route(id, active) {
  return get_api_data().then(function(domain, api_key) {
    var api = new API();
  });
}

function set_route(alias, forward, action) {
  return get_api_data().then(function(items) {
    var domain = items.domain;
    var api_key = items.api_key;

    var description = construct_metadata(alias, forward, action);
    var expression = "match_recipient('" + alias + "@" + domain + "')";
    var actions = ["stop()"];
    if (action === "accept") {
      actions.unshift("forward('" + forward + "')");
    }
    var data = new FormData();
    data.append("description", description);
    data.append("expression", expression);
    actions.forEach(function(action) {
      data.append("action", action);
    });

    var api = new API(api_key);

    return new Promise(function(resolve, reject) {
      var xhr = api.api_call("POST", "/routes", api_key);
      xhr.onload = function() {
        var response = JSON.parse(xhr.responseText);
        if (xhr.status === 200) {
          resolve();
        } else {
          reject();
        }
      };
      xhr.onerror = function() {
        reject(xhr);
      };
      xhr.send(data);
    });
  });
}
