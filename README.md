# Hivemind App Cache Module

This module caches requests to the Hivemind IoT Platform for faster response time and fewer API calls.

For an example of how to use this module, check out [Hivemind App Backend](https://github.com/HivemindAG/app-backend).

## Entities

The `entities` submodule caches `GET` requests to the API for `config.entityCacheTimeout` milliseconds (defaults to 4 minutes).

If the response produces a list, a `byId` map will be added which allows access to individual entities using their id.

### `platform.entities.getEnvId(session, cbk)`

Returns the ID of the (first) environment accessible using `session.apiKey`.

* `session` {Object}
  * `apiKey` {String} Key to access the platform API.
* `cbk(err, envId)` {Function}
  * `err` {Any}
  * `envId` {String}

### `platform.entities.getEntity(session, path, cbk)`

Returns the response to the API call `GET /v1/environments/{session.envId}{path}`.

* `session` {Object}
  * `apiKey` {String}
  * `envId` {String}
* `path` {String}
* `cbk(err, ans)` {Function}
  * `err` {Any}
  * `ans` {Object}

### `platform.entities.getList(session, path, cbk)`

Returns the `data` array from the response to the API call `GET /v1/environments/{session.envId}{path}`.

* `session` {Object}
  * `apiKey` {String}
  * `envId` {String}
* `path` {String}
* `cbk(err, ans)` {Function}
  * `err` {Any}
  * `ans` {Object}

### `platform.entities.getSingle(session, path, id, cbk)`

Returns the entity with the given `id` when `path` points to a list. This call can improve response time since it requests all entities at once instead of individually.

* `session` {Object}
  * `apiKey` {String}
  * `envId` {String}
* `path` {String}
* `id` {String}
* `cbk(err, ans)` {Function}
  * `err` {Any}
  * `ans` {Object}

## Samples

Samples are cached indefinitely. If a cursor tries to access older (not yet cached) samples, they are added to the cache transparently. New samples are added to the cache using WebSockets.

### `new platform.SampleCursor(session, devId, topic)`

Returns a cursor to iterate over samples.

* `session` {Object}
  * `apiKey` {String}
  * `envId` {String}
* `devId` {String}
* `topic` {String}

### `SampleCursor.forEach(cbk, done)`

Calls `cbk` for each sample, as long as the return value is `true` or there are no more samples available. And calls `done` after.

* `cbk(sample)` {Function}
  * `sample` {Object}
    * `id` {String}
    * `timestamp` {Date}
    * `data` {Object}
* `done(err)` {Function}
  * `err` {Any}

## Events

### `platform.events.on('sampleInsert', cbk)`

Emitted when a new sample is added to a sample cache.

* `cbk(event)` {Function}
  * `event` {Object}
    * `envId` {String}
    * `devId` {String}
    * `topic` {String}
    * `sample` {Object}
      * `id` {String}
      * `timestamp` {Date}
      * `data` {Object}

### `platform.events.on('sampleInvalidate', cbk)`

Emitted when sample caches are destroyed. This can happen when samples are deleted, or a communication error occurs.

If `topic` is `null`, the sample caches of all topics are invalidated. If both `devId` and `topic` are `null`, the sample caches of all devices in the environment are invalidated.

After a `sampleInvalidate` event, no more `sampleInsert` events will be emitted for the affected caches (since they no longer exist). Access samples over a cursor to create a new cache.

* `cbk(event)` {Function}
  * `event` {Object}
    * `envId` {String}
    * `devId` {String}
    * `topic` {String}
