const config = require('./src/config');

// overriding platform api url with environment variable
config.apiURL = process.env.PLATFORM_API_URL || config.apiURL;

const apiRequest = require('./src/api-request');
const asyncCache = require('./src/async-cache');
const utils = require('./src/utils');

const entityService = require('./src/entity-service');
const sampleService = require('./src/sample-service');
const socketService = require('./src/socket-service');
const events = require('./src/events');

const entities = entityService;
const SampleCursor = sampleService.SampleCursor;
const hasSampleCache = sampleService.hasSampleCache;

function flushEnv(envId, cbk) {
  const acc = { entities: 0, samples: 0 };
  const pathPrefix = `/v1/environments/${envId}`;
  entities.cache.prune((key) => {
    if (key.startsWith(pathPrefix)) {
      acc.entities += 1;
      return true;
    }
  });
  acc.samples = sampleService.countSamples(envId);
  socketService.disconnect(envId);
  sampleService.removeSampleCache(envId, null, null);
  if (cbk) cbk(null, acc);
}

module.exports = {
  config,
  apiRequest,
  entities,
  sampleService,
  SampleCursor,
  hasSampleCache,
  flushEnv,
  events,
  // Helpers
  asyncCache,
  utils,
};
