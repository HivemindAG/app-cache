const WebSocket = require('ws');

const config = require('./config');
const utils = require('./utils');
const apiRequest = require('./api-request');
const Cache = require('./async-cache').Cache;

const sampleService = require('./sample-service');

function addSub(session, devId, topic) {
  const cmd = { cmd: 'sub', arg: { deviceId: devId, topic: topic } };
  socketSend(session, devId, cmd);
}

const socketCache = {};

function socketSend(session, devId, cmd) {
  const envId = session.envId;
  if (!socketCache.hasOwnProperty(envId)) {
    const entry = { waiting: [cmd] };
    socketCache[envId] = entry;
    const url = `${config.apiURL}/v1/environments/${envId}/data-stream`;
    const ws = new WebSocket(url, { headers: { 'API-Key': session.apiKey } });
    ws.on('open', () => {
      if (config.debug) console.info(`WS: connection opened (${envId})`);
      entry.ws = ws;
      const waiting = entry.waiting;
      delete entry.waiting;
      waiting.forEach((cmd) => ws.send(JSON.stringify(cmd)));
    });
    ws.on('message', (data) => {
      if (config.debug) console.info(`> (${envId}) ${data}`);
      const msg = utils.optParse(data);
      if (!msg) {
        console.error(`WS: invalid JSON: ${data}`);
        ws.close();
        return;
      }
      if (msg.cmd !== 'change') return;
      const change = msg.arg;
      change.environmentId = envId;
      handleChange(change);
    });
    // TODO: Test if this is called in all possible situations
    ws.on('close', (err) => {
      handleClose(envId);
      if (err.code !== 1000 && err !== 1000) { // Not a normal close (CLOSE_NORMAL)
        console.error(`WS: connection closed (${envId}): ${err}. Reconnecting...`);
        socketSend(session, devId, cmd);
      }
    });
    ws.on('error', (err) => {
      handleClose(envId);
      console.error(`WS: connection error (${envId}): ${err}. Reconnecting...`);
      socketSend(session, devId, cmd);
    });
    return;
  }
  const entry = socketCache[envId];
  if (entry.hasOwnProperty('waiting')) {
    entry.waiting.push(cmd);
    return;
  }
  entry.ws.send(JSON.stringify(cmd));
}

function handleChange(change) {
  const type = change.type;
  if (type === 'insert') {
    const sample = utils.makeSample(change);
    sampleService.addSample(change.environmentId, change.deviceId, change.topic, sample);
  }
  if (type === 'invalidate') {
    sampleService.removeSampleCache(change.environmentId, change.deviceId, null);
  }
}

function handleClose(envId) {
  delete socketCache[envId];
  sampleService.removeSampleCache(envId, null, null);
}

function disconnect(envId) {
  if (!socketCache.hasOwnProperty(envId)) return;
  const entry = socketCache[envId];
  if (!entry.ws) return;
  entry.ws.close();
}

module.exports = {
  addSub,
  disconnect,
};
