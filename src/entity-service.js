const config = require('./config');
const apiRequest = require('./api-request');
const Cache = require('./async-cache').Cache;

const cache = new Cache();

function get(session, path, cbk, keySalt) {
  const key = keySalt ? `${path}:${keySalt}` : path;
  cache.get(key, cbk, (info, cbk) => {
    const req = {
      url: `${config.apiURL}${path}`,
      qs: { limit: 1000 },
    };
    apiRequest.call(session, req, (err, res, ans) => {
      if (config.debug) console.info(`CACHE: update ${path}`);
      if (!err && ans.hasOwnProperty('total') && Array.isArray(ans.data)) {
        const byId = {};
        ans.data.forEach((obj) => byId[obj.id] = obj);
        ans.byId = byId;
      }
      const opt = { timeout: config.entityCacheTimeout, errorTimeout: config.errorTimeout };
      cbk(err, ans, opt);
    });
  });
}

function getEnvId(session, cbk) {
  get(session, "/v1/environments", (err, envs) => {
    if (err) return cbk(err);
    if (!(envs.data.length > 0)) return cbk('Environment not found');
    cbk(null, envs.data[0].id);
  }, session.apiKey)
}

function getEntity(session, path, cbk) {
  get(session, `/v1/environments/${session.envId}${path}`, cbk);
}

function getList(session, path, cbk) {
  get(session, `/v1/environments/${session.envId}${path}`, (err, ans) => {
    if (err) return cbk(err);
    cbk(null, ans.data);
  });
}

function getSingle(session, path, id, cbk) {
  get(session, `/v1/environments/${session.envId}${path}`, (err, ans) => {
    if (err) return cbk(err);
    if (!ans.byId.hasOwnProperty(id)) {
      const error = new Error(`Invalid entity: '${id}'`);
      error.status = 404;
      return cbk(error);
    }
    cbk(null, ans.byId[id]);
  });
}

module.exports = {
  getEnvId,
  getEntity,
  getList,
  getSingle,
  cache,
}
