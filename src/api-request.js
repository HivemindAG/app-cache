const request = require('request');

const config = require('./config');
const utils = require('./utils');

function mkOptions(session, args) {
  const options = {
    method: 'GET',
  };
  if (typeof args === 'string') {
    args = { path: args };
  }
  Object.assign(options, args);
  options.headers = Object.assign({}, args.headers);
  if (session.apiKey) {
    options.headers['API-Key'] = session.apiKey;
  }
  if (typeof options.path === 'string') {
    options.url = config.apiURL + options.path;
    delete options.path;
  }
  return options;
}

function call(session, args, cbk) {
  const options = mkOptions(session, args);
  callQueue.push({ options, cbk });
  dispatch();
}

const callQueue = [];
let nInFlight = 0;

function dispatch() {
  if (config.concurrentRequests && nInFlight >= config.concurrentRequests) return;
  const args = callQueue.shift();
  if (!args) return;
  nInFlight += 1;
  request(args.options, (err, res, body) => {
    nInFlight -= 1;
    dispatch();
    const cbk = args.cbk;
    if (err) console.error(`CACHE ERROR: Platform api request has failed: ${JSON.stringify({ req: args.options, err })}`);
    if (err) return cbk(err, res);
    const ans = utils.optParse(body, undefined);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      err = ans;
      err.status = res.statusCode;
    }
    if (err) return cbk(err, res);
    cbk(null, res, ans);
  });
}

module.exports = {
  call,
};
