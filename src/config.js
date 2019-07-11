// this is default config. can be overriden with environment variables in index.js
module.exports = {
  debug: false,
  apiURL: 'https://api.hivemind.ch',
  concurrentRequests: 8,
  sampleLimit: 8000,
  errorTimeout: 4 * 1000,
  entityCacheTimeout: 4 * 60 * 1000,
};
