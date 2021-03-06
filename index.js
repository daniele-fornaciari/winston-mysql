/**
 * This is a MySQL transport module for winston.
 * https://github.com/winstonjs/winston
 * Notice: User should create a log table in MySQL first,
 * the default table fields are 'level', 'meta', 'message', 'timestamp'. But you can
 * use your custom table fields by setting: options.fields.
 * Example: options.fields = { level: 'mylevel', meta: 'metadata', message: 'source', timestamp: 'addDate'}
 * Two demo tables:
 *
 CREATE TABLE `logtest`.`sys_logs_default` (
 `id` INT NOT NULL AUTO_INCREMENT,
 `level` VARCHAR(16) NOT NULL,
 `message` VARCHAR(512) NOT NULL,
 `meta` VARCHAR(1024) NOT NULL,
 `timestamp` DATETIME NOT NULL,
 PRIMARY KEY (`id`));
 *
 CREATE TABLE `logtest`.`sys_logs_custom` (
 `id` INT NOT NULL AUTO_INCREMENT,
 `mylevel` VARCHAR(16) NOT NULL,
 `source` VARCHAR(512) NOT NULL,
 `metadata` VARCHAR(512) NOT NULL,
 `addDate` DATETIME NOT NULL,
 PRIMARY KEY (`id`));
 */


var util = require('util'),
    winston = require('winston'),
    MySql = require('mysql2'),
    Transport = winston.Transport;

/**
 * @constructor
 * @param {Object} options      Options for the MySQL
 * @param {String} options.user Database username
 * @param {String} options.database Database name
 * @param {String} options.table  Database table for the logs
 * @param {Object} **Optional** options.fields Log object, set custom fields for the log table
 * @param {Object} **Optional** options.level Log level flag
 */
var mysql = function (options) {
    "use strict";
    Transport.call(this, options);

    this.options = options || {};

    if (!options.user) {
        throw new Error('The database username is required');
    }

    if (!options.database) {
        throw new Error('The database name is required');
    }

    if (!options.table) {
        throw new Error('The database table is required');
    }

    //check custom table fields
    if (!options.fields) {

        this.options.fields = {};
        //use default names
        this.fields = {
            level: 'level',
            meta: 'meta',
            message: 'message',
            timestamp: 'timestamp'
        }

    } else {

        //use custom table field names
        this.fields = {
            level: this.options.fields.level,
            meta: this.options.fields.meta,
            message: this.options.fields.message,
            timestamp: this.options.fields.timestamp
        }

    }

    //Create a connection poll
    this.pool = MySql.createPool(this.options);

};

//logger name in winston
mysql.prototype.name = 'mysql';
//getter
winston.transports.Mysql = mysql;

/**
 * @method log called by winston when to log somethings
 * @param level {string} Level in winston
 * @param message {string} Message in winston
 * @param meta  {Object} JSON object in winston
 * @param callback {function} callback when finished
 */
mysql.prototype.log = function (level, message, meta, callback) {
    "use strict";
    if (this.options.silent) {
        return callback(null, true);
    }

    //save this
    var self = this;
    //run it in nextTick
    process.nextTick(function () {

        var pool = self.pool;

        pool.getConnection(function (err, connection) {

            if (err) {
                return callback(err, null);
            }
            //connected
            //set log object
            var log = {};
            log[self.fields.level] = level;
            log[self.fields.message] = message;
            log[self.fields.meta] = JSON.stringify(meta);
            log[self.fields.timestamp] = new Date();

            //Save the log
            connection.query('INSERT INTO ' + self.options.table + ' SET ?', log, function (err, rows, fields) {
                if (err) {
                    return callback(err, null);
                }
                //finished
                connection.release();
                callback(null, true);
            });

        });

    });

};

module.exports = mysql;
