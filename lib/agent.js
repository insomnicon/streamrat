"use strict";

var fs = require("fs");
var http = require("http");

// Format:
//
// Inter-|   Receive                                                |  Transmit
// face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed
//    lo:     828       8    0    0    0     0          0         0      828       8    0    0    0     0       0          0
// ens33: 18932705  141903    0    0    0     0          0         0   996489    5004    0    0    0     0       0          0

var agent = {
  interfaceProcFile: "/proc/net/dev",
  getStats: function(callback) {
    var metrics = { };

    agent.getInterfaceStats(metrics, function() {
      agent.getStreamMetrics(metrics, function() {
        callback(metrics);
      });
    });
  },
  getInterfaceStats: function (metrics, callback) {
    fs.readFile(agent.interfaceProcFile, function(err, buffer) {
      if (err || !buffer) {
        metrics.error = err;
        callback(metrics);
        return;
      }

      var lines = buffer.toString().split(/\n/);

      var bands = [ ];

      for (var i = 2; i < lines.length; ++i) {
        var line = lines[i].split(/\s+/);

        for (var k = 2; k < line.length; ++k)
        {
          bands[k] = bands[k] || 0;
          bands[k] += parseInt(line[k]);
        }
      }

      metrics.rx_bytes = bands[2];
      metrics.tx_bytes = bands[10];

      callback(metrics);
    });
  },
  getStreamMetrics: function(metrics, callback) {
    var use = { };
    var listening = { };

    fs.readFile("/proc/net/tcp", function(err, buffer) {
      if (err || !buffer) {
        metrics.error = err;
        callback(metrics);
        return;
      }

      var lines = buffer.toString().split(/\n/);

      for (var i = 1; i < lines.length; ++i) {
        var columns = lines[i].split(/\s+/);

        if (!columns[2])
          continue;

        var port = parseInt(columns[2].split(/:/)[1], 16);

        switch (columns[4]) {
          case "0A":
            listening[port] = true;
            use[port] = use[port] || 0;
            continue;
          case "01":
            use[port] = use[port] || 0;
            use[port]++;
        }
      }

      for (var p in listening) {
        metrics["tcp_" + p] = use[p];
      }

      callback(metrics);
    });
  },
  sendReport: function(report, options, callback) {
    var requestOptions = {
      hostname: options.report.hostname,
      port: options.report.port,
      path: options.report.path,
      headers: {
        "Content-type": "application/json"
      },
      method: "POST"
    };

    var req = http.request(requestOptions, function(res) {
      // ...
    });

    report.stream = options.stream;
    report.url = options.url;
    report.limit = options.limit;

    req.write(JSON.stringify(report));

    req.on("error", function(err) {
      console.log(err);
    })

    req.end();

    return req;
  }
};

module.exports = agent;
