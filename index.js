const config = require('./src/config');
const apiRequest = require('./src/api-request');
const asyncCache = require('./src/async-cache');
const utils = require('./src/utils');

const entityService = require('./src/entity-service');
const sampleService = require('./src/sample-service');
const socketService = require('./src/socket-service');
const events = require('./src/events');

const entities = entityService;
const SampleCursor = sampleService.SampleCursor;

function flushEnv(envId) {
  entities.cache.prune
  const pathPrefix = `/v1/environments/${envId}`;
  entities.cache.prune((key) => {
    return key.startsWith(pathPrefix);
  });
  socketService.disconnect(envId);
  samples.removeSampleCache(envId, null, null);
}

module.exports = {
  config,
  apiRequest,
  entities,
  SampleCursor,
  flushEnv,
  events,
  // Helpers
  asyncCache,
  utils,
};
