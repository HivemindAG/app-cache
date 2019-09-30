// this is default config. can be overriden with environment variables in index.js
module.exports = {
  appCacheDebug: false,
  apiURL: 'https://api.core.akenza.io',
  concurrentRequests: 8,
  sampleLimit: 50000,
  errorTimeout: 4 * 1000,
  entityCacheTimeout: 4 * 60 * 1000,
};
