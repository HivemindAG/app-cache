function optParse(body, def) {
  if (typeof body !== 'string') return body;
  try {
    return JSON.parse(body);
  } catch (e) {
    return def;
  }
}

function pathGetOrSet(obj, path, def) {
  const lastInd = path.length - 1;
  path.forEach((key, ind) => {
    if (!obj.hasOwnProperty(key)) {
      obj[key] = ind == lastInd ? def : {};
    }
    obj = obj[key];
  });
  return obj;
}

function pathExists(obj, path) {
  for (const key of path) {
    obj = obj[key];
    if (obj === undefined) return false;
  }
  return true;
}

function pathDelete(obj, path) {
  path = path.slice(0);
  const lastKey = path.pop();
  path.forEach((key) => {
    obj = obj[key] || {};
  });
  delete obj[lastKey];
}

function makeSample(obj) {
  return {
    id: obj.id,
    // topic: obj.topic,
    timestamp: new Date(obj.timestamp),
    data: obj.data,
  };
}

function sampleCompare(s1, s2) {
  if (ensureItsDate(s1.timestamp) < ensureItsDate(s2.timestamp)) return -1;
  if (ensureItsDate(s1.timestamp) > ensureItsDate(s2.timestamp)) return 1;
  if (s1.id < s2.id) return -1;
  if (s1.id > s2.id) return 1;
  return 0;
}

// For avoiding bug with string timestamps. Remove when fixed.
function ensureItsDate(timestamp) {
  if (!(timestamp instanceof Date)) {
    timestamp = new Date(timestamp);
  }
  return timestamp;
}

module.exports = {
  optParse,
  pathGetOrSet,
  pathExists,
  pathDelete,
  makeSample,
  sampleCompare,
};
