var _ = require("underscore");

function StreamTable(granularity) {
  this.granularity = granularity || 5 * 60 * 1000;
  this.skew = this.granularity / 10;
  this.table = { };
}

// Metrics format: { tx_bytes: N, rx_bytes: N, tcp_NN: N }

StreamTable.prototype.interval = function(when) {
  var now = when || Date.now();

  return Math.floor(now / this.granularity);
}

StreamTable.prototype.report = function(stream, url, metrics, when) {
  if (!this.table[stream])
    this.table[stream] = { };

  var table = this.table[stream];

  if (!table[url])
    table[url] = { url: url, metrics: { } };

  var set = table[url];

  var interval = this.interval(when);

  set.metrics[interval] = metrics;
}

StreamTable.prototype.getAll = function(stream, when) {
  var streamTable = this.table[stream];

  if (!streamTable)
    return [ ];

  return _.values(streamTable);
}

StreamTable.prototype.getActive = function(stream, when) {
  var interval = this.interval(when);
  var granularity = this.granularity;

  var streamTable = this.table[stream];

  if (!streamTable)
    return [ ];

  var remotes = _.reject(_.keys(streamTable), function(key) {
    var metrics = streamTable[key].metrics;

    return !metrics[interval - 1] && !metrics[interval];
  });

  return _.map(remotes, function(key) {
    var remote = streamTable[key];
    var metrics = remote.metrics;

    var last = metrics[interval - 1] || metrics[interval];
    var lastBytes = last ? ((last.tx_bytes || 0) + (last.rx_bytes)) : 0;
    var prior = metrics[interval - 2];
    var priorBytes = prior ? ((prior.tx_bytes || 0) + (prior.rx_bytes)) : 0;
    var bytes = 0;

    // Account for the counter being wrapped around or reset
    if (lastBytes > priorBytes)
      bytes = lastBytes - priorBytes;
    else
      bytes = lastBytes;

    var limit = remote.limit || 100;

    return {
      url: remote.url,
      rate: Math.floor(bytes / (1024 * 1024 / 8) / (granularity / 1000)),
      limit: Math.floor(limit),
    };
  });
}

StreamTable.prototype.getBest = function(stream, when) {
  var active = this.getActive(stream, when);

  var capacity = _.map(active, function(remote) {
    var bandwidth = remote.limit - remote.rate;

    return {
      url: remote.url,
      index: total,
      bandwidth: bandwidth
    }
  });

  var total = 0;

  capacity = _.reject(capacity, function(entry) {
    entry.total = total += entry.bandwidth;

    return entry.bandwidth <= 0;
  });

  var random = Math.random() * total;

  var selected = _.find(capacity, function(entry) {
    return random <= entry.total;
  });

  return selected && selected.url;
}

module.exports = StreamTable;
