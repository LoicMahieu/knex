
var mysql = require('mysql');

var _ = require('underscore');
var util = require('util');
var genericPool = require('generic-pool');

var init, debug, pool, connection, connectionSettings;

// Initializes the mysql module with an options hash,
// containing the connection settings, as well as the
// pool config settings
exports.init = function (options) {

  // If there isn't a connection setting
  if (!options.connection) return;

  connectionSettings = options.connection;
  debug = options.debug;

  // If pooling is disabled, set the query getter to
  // something below and create a connection on the connection object
  if (options.pool === false) {
    pool = false;
    connection = this.getConnection();
    return;
  }

  // Extend the genericPool with the options
  // passed into the init under the "pool" option
  pool = genericPool.Pool(_.extend({
    name : 'mysql',
    create : function(callback) {
      callback(null, exports.getConnection());
    },
    destroy  : function(client) {
      client.end();
    },
    max : 10,
    min : 2,
    idleTimeoutMillis: 30000,
    log : false
  }, options.pool));
};

// Execute a query on the database.
// If the fourth parameter is set, this will be used as the connection
// to the database.
exports.query = function (querystring, params, callback, connection) {

  // If there is a connection, use it.
  if (connection) {
    return connection.query(querystring, params, callback);
  }

  // Acquire connection - callback function is called
  // once a resource becomes available.
  pool.acquire(function(err, client) {

    if (err) throw new Error(err);

    // Call the querystring and then release the client
    client.query(querystring, params, function () {
      pool.release(client);
      callback.apply(this, arguments);
    });

  });
};

// TODO: Return table prefix.
exports.getTablePrefix = function () {};

// Returns a mysql connection, with a __cid property uniquely
// identifying the connection.
exports.getConnection = function () {
  var connection = mysql.createConnection(connectionSettings);
      connection.connect();
      connection.__cid = _.uniqueId('__cid');
  return connection;
};

// Used to extend the standard sql grammar
exports.grammar = {
  wrapValue: function(value) {
    return (value !== '*' ? util.format('`%s`', value) : "*");
  }
};

// The schema grammar is specific to the Knex.Schema
exports.getSchemaGrammar = function () {
  return require('../schema/mysql');
};
