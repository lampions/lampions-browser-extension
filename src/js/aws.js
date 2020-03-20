import createHash from "create-hash";
import AWS from "aws-sdk";

import utils from "./utils.js";

const ROUTES_KEY = "routes.json";

class RouteExistsError extends Error {
  constructor(message) {
    super(message);
    this.name = "RouteExistsError";
  }
}

class RouteDoesNotExistError extends Error {
  constructor(message) {
    super(message);
    this.name = "RouteDoesNotExistError";
  }
}

class Api {
  constructor({domain, accessKeyId, secretAccessKey}) {
    this.domain = domain;
    const bucket = `lampions.${domain}`;
    this.s3_ = new AWS.S3({
      accessKeyId,
      secretAccessKey,
      params: {
        Bucket: bucket
      }
    });
  }

  getRoutes() {
    return new Promise((resolve, reject) => {
      this.s3_.getObject({Key: ROUTES_KEY}, (error, data) => {
        if (error) {
          if (error.code === "NoSuchKey") {
            resolve([]);
          } else {
            reject(error.message);
          }
        } else {
          let routes = null;
          try {
            const result = JSON.parse(data.Body);
            routes = result.routes || [];
          } catch {
            routes = [];
          }
          resolve(routes);
        }
      });
    });
  }

  setRoutes(routes) {
    return new Promise((resolve, reject) => {
      this.s3_.putObject({
        Key: ROUTES_KEY,
        Body: JSON.stringify({routes}, null, 2)
      }, error => {
        if (error) {
          reject(error.message);
        } else {
          resolve();
        }
      });
    });
  }
}

function prepareApiCall() {
  return new Promise((resolve, reject) => {
    utils.storageSyncGet({
      domain: "",
      accessKeyId: "",
      secretAccessKey: ""
    }).then(items => {
      if (items !== undefined && items.domain && items.accessKeyId &&
          items.secretAccessKey) {
        resolve(new Api(items));
      } else {
        reject("Failed to obtain domain and AWS secrets from sync storage");
      }
    });
  });
}

async function fetchRoutes() {
  const api = await prepareApiCall();
  return await api.getRoutes();
}

function findRouteIndexById_(routes, id) {
  for (let i = 0; i < routes.length; ++i) {
    if (routes[i].id === id) {
      return i;
    }
  }
  return -1;
}

async function updateRoute(route, options) {
  const getWithDefault = (object, key, fallback) => {
    const value = object[key];
    if (value === undefined) {
      return fallback;
    }
    return value;
  };

  const api = await prepareApiCall();

  const routes = await api.getRoutes();
  const index = findRouteIndexById_(routes, route.id);
  if (index === -1) {
    throw `Route with id ${route.id} does not exist`;
  }
  const newRoute = {
    ...route,
    active: getWithDefault(options, "active", route.active),
    forward: getWithDefault(options, "forward", route.forward)
  };
  routes[index] = newRoute;
  await api.setRoutes(routes);
  return newRoute;
}

async function addRoute(alias, forward, meta = null) {
  const api = await prepareApiCall();

  const routes = await api.getRoutes();
  for (const route of routes) {
    if (route.alias === alias) {
      throw new RouteExistsError(alias);
    }
  }

  const createdAt = (new Date()).toUTCString();
  const routeString = `${alias}-${forward}-${createdAt}`;
  const id = createHash("sha224").update(routeString).digest("hex");
  const route = {
    id,
    active: true,
    alias,
    forward,
    createdAt,
    meta
  };
  routes.unshift(route);

  await api.setRoutes(routes);
  return route;
}

async function removeRoute(route) {
  const api = await prepareApiCall();

  const routes = await api.getRoutes();
  const index = findRouteIndexById_(routes, route.id);
  if (index === -1) {
    throw new RouteDoesNotExistError(route.id);
  }
  routes.splice(index, 1);

  await api.setRoutes(routes);
}

async function synchronizeData() {
  let routes = [];
  try {
    routes = await fetchRoutes();
  } finally {
    utils.storageLocalSet({routes});
  }
}

export default {
  addRoute,
  updateRoute,
  removeRoute,
  synchronizeData
};
