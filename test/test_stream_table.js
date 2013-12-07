var assert = require("./test");

var StreamTable = require("../lib/stream_table");
var megabytes = 1024 * 1024;

describe("StreamTable", function() {
  describe("new", function() {
    var table = new StreamTable();

    it("should produce a clean slate object", function() {
      assert.ok(table, "Table is not defined");
    });

    it("should have a defined granularity", function(){
      assert.equal(table.granularity, 5 * 60 * 1000);
    });
  });

  describe("report()", function() {
    var table = new StreamTable();
    var when = Date.now();

    it("should create an entry in the table when a report is received", function() {
      table.report("test", "http://localhost:8090/", {
        tx_bytes: 5000,
        rx_bytes: 500,
        tcp_8090: 1
      }, when);

      var found = table.getAll("test");

      assert.equal(1, found.length);
      assert.equal("http://localhost:8090/", found[0].url);

      var interval = table.interval(when);

      assert.ok(5000, found[0].metrics[interval]);
      assert.equal(5000, found[0].metrics[interval].tx_bytes);
    });
  });

  describe("getActive()", function() {
    var table = new StreamTable();
    var when = Date.now();
    var granularity = table.granularity;

    it("should produce an empty list when there is no data", function() {
      assert.equal(0, table.getActive("test").length);
    });

    it("should return an approximate bandwidth reading", function() {
      table.report("test", "http://localhost:8090/", {
        tx_bytes: 141557760,
        rx_bytes: 141557760 / 2,
        tcp_8090: 1
      }, when - (2 * granularity));

      table.report("test", "http://localhost:8090/", {
        tx_bytes: 613416960,
        rx_bytes: 613416960 / 2,
        tcp_8090: 1
      }, when - (1 * granularity));

      var found = table.getActive("test");

      assert.equal("http://localhost:8090/", found[0].url);
      assert.equal(18, found[0].rate);
    });

    it("should drop URLs from the list if they haven't reported in", function() {
      var found = table.getActive("test", when + granularity * 2);

      assert.equal(0, found.length);
    });
  });

  describe("getBest()", function() {
    var table = new StreamTable();
    var when = Date.now();
    var granularity = table.granularity;

    it("should return an empty list when there is no data", function() {
      assert.equal(0, table.getActive("test").length);
    });

    it("should exclude servers beyond their maximum load", function() {
      table.report("test", "http://localhost:8000/", {
        tx_bytes: 0,
        rx_bytes: 0,
        tcp_8090: 1
      }, when - (2 * granularity));

      table.report("test", "http://localhost:8000/", {
        tx_bytes: 3600 * megabytes,
        rx_bytes: 1200 * megabytes,
        tcp_8090: 1
      }, when - (1 * granularity));

      assert.isUndefined(table.getBest("test"));
    });

    it("should include servers that have just reported in", function() {
      table.report("test", "http://localhost:8091/", {
        tx_bytes: 141557760,
        rx_bytes: 141557760 / 2,
        tcp_8090: 1
      }, when - (1 * granularity));

      table.report("test", "http://localhost:8091/", {
        tx_bytes: 613416960,
        rx_bytes: 613416960 / 2,
        tcp_8090: 1
      }, when - granularity);

      var url = table.getBest("test");

      assert.equal("http://localhost:8091/", url);
    });

    it("should pick an active server based on load levels", function() {
      table.report("test", "http://localhost:8090/", {
        tx_bytes: 141557760,
        rx_bytes: 141557760 / 2,
        tcp_8090: 1
      }, when - (2 * granularity));

      table.report("test", "http://localhost:8090/", {
        tx_bytes: 613416960,
        rx_bytes: 613416960 / 2,
        tcp_8090: 1
      }, when - (1 * granularity));

      var url = table.getBest("test");
    });
  });
});
