var connect = require('connect');
var express = require('express');

module.exports = {
  app: function() {
    var app = express();

    var StreamTable = require('../lib/stream_table');

    var streams = new StreamTable();

    app.use(connect.json());

    app.get('/state', function(request, response) {
      response.setHeader('Content-Type', 'application/json');

      response.end(JSON.stringify(streams));
    });

    app.get('/streams/:stream/active', function(request, response) {
      response.setHeader('Content-Type', 'application/json');

      response.end(JSON.stringify(streams.getActive(request.params.stream)));
    });

    app.get('/streams/:stream', function(request, response) {
      var best = streams.getBest(request.params.stream);

      if (best) {
        response.setHeader('Location', best);
        response.setHeader('Status', 302);

        response.end();
      }
      else
      {
        response.setHeader('Status', 404);

        response.end();
      }
    });

    app.post('/update', function(request, response) {
      var options = request.body;

      response.setHeader('Content-Type', 'application/json');

      if (options.stream && options.url) {
        streams.report(options.stream, options.url, options);

        response.end(JSON.stringify({
          stream: options.stream,
          status: "OK"
        }));
      } else {
        response.end(JSON.stringify({
          status: "NOPE"
        }));
      }
    });

    app.use(function(err, req, res, next){
      console.error(err.stack);

      res.setHeader("Content-Type", "application/json");
      res.send(500, { status: "ERROR", error: err });
    });

    return app;
  }
}
