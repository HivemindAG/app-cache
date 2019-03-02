const config = require('./config');
const utils = require('./utils');
const apiRequest = require('./api-request');
const events = require('./events');

const socketService = require('./socket-service');

const sampleCache = {};

function getSampleCache(envId, devId, topic) {
  return utils.pathGetOrSet(sampleCache, [envId, devId, topic], {
    samples: [],
    maxRequested: 0,
    hasMore: true,
    needsSub: true,
  });
}

function hasSampleCache(envId, devId, topic) {
  return utils.pathExists(sampleCache, [envId, devId, topic]);
}

function removeSampleCache(envId, devId = null, topic = null) {
  const path = [envId, devId, topic].filter(k => k !== null);
  if (!utils.pathExists(sampleCache, path)) return;
  utils.pathDelete(sampleCache, path);
  const event = {envId, devId, topic};
  events.emit('sampleInvalidate', event);
}

function loadMore(session, devId, topic, limit, cbk) {
  const entry = getSampleCache(session.envId, devId, topic);
  if (entry.hasOwnProperty('errorTime')) {
    // Return cached error for n milliseconds
    if (entry.errorTime < Date.now() - config.errorTimeout) {
      delete entry.errorTime;
      delete entry.error;
    }
  }
  if (entry.hasOwnProperty('error')) {
    return cbk(entry.error);
  }
  if (entry.hasOwnProperty('waiting')) {
    entry.waiting.push(cbk);
    return;
  }
  entry.waiting = [cbk];
  _loadMore(entry, session, devId, topic, limit, (err) => {
    if (err) {
      entry.errorTime = Date.now();
      entry.error = err;
    }
    const callbacks = entry.waiting;
    delete entry.waiting;
    if (err) removeSampleCache(session.envId, devId, topic);
    callbacks.forEach((cbk) => cbk(err));
  });
}

function _loadMore(entry, session, devId, topic, limit, cbk) {
  const samples = entry.samples;
  const query = {
    limit: limit,
    keys: ['id', 'topic', 'timestamp', 'data'],
    topic: topic,
  };
  const req = {
    method: 'POST',
    url: `${config.apiURL}/v1/environments/${session.envId}/devices/${devId}/data/query`,
    json: query,
  };
  if (samples.length > 0) {
    query.before = samples[samples.length - 1].id;
  }
  entry.maxRequested += limit;
  apiRequest.call(session, req, (err, res, ans) => {
    if (config.debug) console.info(`CACHE: load samples ${session.envId}:${devId}:${topic} (has ${samples.length}; add ${limit})`);
    if (err) return cbk(err);
    entry.hasMore = ans.data.length === limit;
    samples.push.apply(samples, ans.data.map(utils.makeSample));
    if (entry.needsSub) {
      socketService.addSub(session, devId, topic);
      delete entry.needsSub;
    }
    cbk(null);
  });
}

function addSample(envId, devId, topic, sample) {
  // Ignore samples from subscriptions after 'invalidate'; use cursor first
  if (!hasSampleCache(envId, devId, topic)) return;
  const entry = getSampleCache(envId, devId, topic);
  let i = 0;
  for (; i < entry.samples.length - 1; i += 1) {
    const s1 = entry.samples[i];
    const cmp = utils.sampleCompare(s1, sample);
    if (cmp === 0) return; // Sample already present
    if (cmp > 0) continue; // Existing sample is newer
    break; // Insert sample in right place
  }
  entry.samples.splice(i, 0, sample);
  // Keep cache size constant by removing unrequested samples
  while (entry.samples.length > entry.maxRequested) {
    entry.samples.pop();
  }
  // Inform about new sample
  const event = {envId: envId, devId: devId, topic: topic, sample: sample};
  events.emit('sampleInsert', event);
}

class SampleCursor {
  constructor(session, devId, topic) {
    this.lastId = null;
    this.chunkMin = 200;
    this.chunkMax = 2000;
    this.limit = config.sampleLimit;
    Object.assign(this, {session, devId, topic});
  }
  forEach(cbk, done) {
    const entry = getSampleCache(this.session.envId, this.devId, this.topic);
    const values = entry.samples.values();
    // Fast forward after 'loadMore'
    if (this.lastId) {
      for (const sample of values) {
        if (sample.id === this.lastId) break;
      }
    }
    let wantsMore = true;
    for (const sample of values) {
      this.lastId = sample.id;
      wantsMore =  cbk(sample);
      if (!wantsMore) break;
    }
    const limit = Math.min(entry.maxRequested * 2 || this.chunkMin, this.chunkMax, this.limit - entry.samples.length);
    if (wantsMore && entry.hasMore && limit > 0) {
      loadMore(this.session, this.devId, this.topic, limit, (err) => {
        if (err) return done(err);
        this.forEach(cbk, done);
      });
      return;
    } 
    done(null);
  }
}

// Circumvent problems caused by cyclic dependency with socket-service
Object.assign(exports, {
  SampleCursor,
  addSample,
  hasSampleCache,
  removeSampleCache,
});
