const defaults = {
  timeout: null,
  errorTimeout: 4 * 1000,
};

class Cache {
  constructor(options) {
    this.data = {};
    Object.assign(this, defaults, options);
  }
  get(key, cbk, update) {
    const now = Date.now();
    if (!this.data.hasOwnProperty(key)) {
      this.data[key] = {
        created: now,
        frequency: 0,
        expires: -Infinity,
      };
    }
    const entry = this.data[key];
    entry.accessed = now;
    entry.frequency += 1;
    if (entry.expires > now) {
      cbk(entry.error, entry.value);
    } else if (entry.hasOwnProperty('waiting')) {
      entry.waiting.push(cbk);
    } else {
      entry.waiting = [cbk];
      this._request(entry, update);
    }
  }
  _request(entry, update) {
    update(entry, (err, value, options) => {
      const now = Date.now();
      entry.updated = now;
      const waiting = entry.waiting;
      delete entry.waiting;
      const opt = {timeout: this.timeout, errorTimeout: this.errorTimeout};
      Object.assign(opt, options);
      if (err) {
        entry.error = err;
        delete entry.value;
        entry.expires = now + this.errorTimeout;
      } else {
        entry.value = value;
        delete entry.error;
        entry.expires = opt.timeout === null ? Infinity : now + opt.timeout;
      }
      waiting.forEach((cbk) => cbk(entry.error, entry.value));
    });
  }
  info(key) {
    return this.data[key];
  }
  expire(key) {
    const entry = this.data[key];
    if (!entry) return;
    entry.expires = -Infinity;
  }
  delete(key) {
    delete this.data[key];
  }
  prune(cbk) {
    for (const key in this.data) {
      const entry = this.data[key];
      if (cbk(key, entry)) {
        delete this.data[key];
      }
    }
  }
}

module.exports = {
  Cache,
  defaults,
};
