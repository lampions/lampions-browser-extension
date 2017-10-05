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

function fetch_routes(domain, api_key) {
  var api = new API(api_key);

  return new Promise(function(resolve, reject) {
    var xhr = api.api_call("GET", "/routes");
    xhr.onload = function() {
      var response = JSON.parse(xhr.responseText);
      var routes = [];
      for (var i = 0; i < response.total_count; ++i) {
        var route = response.items[i];
        // Routes defined through this extension store metadata as json-encoded
        // description fields on mailgun. This way we can implement the "drop"
        // behavior of routes where we remove the "forward" action of a route
        // while retaining the information about the original forward in the
        // description.
        try {
          var route_description = JSON.parse(route.description);
        } catch (exc) {
          continue;
        }
        routes.push(route_description);
      }
      resolve(routes);
    };
    xhr.onerror = function() {
      reject(xhr);
    };
    var data = new FormData();
    data.append("limit", 0);
    xhr.send(data);
  });
}

function construct_metadata(alias, forward, action) {
  return JSON.stringify({
    "alias": alias,
    "forward": forward,
    "action": action
  });
}

function set_route(domain, api_key, alias, forward, action) {
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

  // TODO: Check that we don't already have a route in place for the
  //       combination of alias/forward. If we do, make a PUT request instead
  //       to update the route as per the mailgun API.

  var api = new API(api_key);

  return new Promise(function(resolve, reject) {
    var xhr = api.api_call("POST", "/routes", api_key);
    xhr.onload = function() {
      var response = JSON.parse(xhr.responseText);
      resolve({"status": xhr.status, "response": response});
    };
    xhr.onerror = function() {
      reject(xhr);
    };
    xhr.send(data);
  });
}
