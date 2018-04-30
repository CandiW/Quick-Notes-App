/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 58);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var MongoError = __webpack_require__(1).MongoError,
  ReadPreference = __webpack_require__(5),
  CoreReadPreference = __webpack_require__(1).ReadPreference;

var shallowClone = function(obj) {
  var copy = {};
  for(var name in obj) copy[name] = obj[name];
  return copy;
}

// Figure out the read preference
var getReadPreference = function(options) {
  var r = null
  if(options.readPreference) {
    r = options.readPreference
  } else {
    return options;
  }

  if(r instanceof ReadPreference) {
    options.readPreference = new CoreReadPreference(r.mode, r.tags, {maxStalenessSeconds: r.maxStalenessSeconds});
  } else if(typeof r == 'string') {
    options.readPreference = new CoreReadPreference(r);
  } else if(r && !(r instanceof ReadPreference) && typeof r == 'object') {
    var mode = r.mode || r.preference;
    if (mode && typeof mode == 'string') {
      options.readPreference = new CoreReadPreference(mode, r.tags, {maxStalenessSeconds: r.maxStalenessSeconds});
    }
  }

  return options;
}

// Set simple property
var getSingleProperty = function(obj, name, value) {
  Object.defineProperty(obj, name, {
    enumerable:true,
    get: function() {
      return value
    }
  });
}

var formatSortValue = exports.formatSortValue = function(sortDirection) {
  var value = ("" + sortDirection).toLowerCase();

  switch (value) {
    case 'ascending':
    case 'asc':
    case '1':
      return 1;
    case 'descending':
    case 'desc':
    case '-1':
      return -1;
    default:
      throw new Error("Illegal sort clause, must be of the form "
                    + "[['field1', '(ascending|descending)'], "
                    + "['field2', '(ascending|descending)']]");
  }
};

var formattedOrderClause = exports.formattedOrderClause = function(sortValue) {
  var orderBy = {};
  if(sortValue == null) return null;
  if (Array.isArray(sortValue)) {
    if(sortValue.length === 0) {
      return null;
    }

    for(var i = 0; i < sortValue.length; i++) {
      if(sortValue[i].constructor == String) {
        orderBy[sortValue[i]] = 1;
      } else {
        orderBy[sortValue[i][0]] = formatSortValue(sortValue[i][1]);
      }
    }
  } else if(sortValue != null && typeof sortValue == 'object') {
    orderBy = sortValue;
  } else if (typeof sortValue == 'string') {
    orderBy[sortValue] = 1;
  } else {
    throw new Error("Illegal sort clause, must be of the form " +
      "[['field1', '(ascending|descending)'], ['field2', '(ascending|descending)']]");
  }

  return orderBy;
};

var checkCollectionName = function checkCollectionName (collectionName) {
  if('string' !== typeof collectionName) {
    throw new MongoError("collection name must be a String");
  }

  if(!collectionName || collectionName.indexOf('..') != -1) {
    throw new MongoError("collection names cannot be empty");
  }

  if(collectionName.indexOf('$') != -1 &&
      collectionName.match(/((^\$cmd)|(oplog\.\$main))/) == null) {
    throw new MongoError("collection names must not contain '$'");
  }

  if(collectionName.match(/^\.|\.$/) != null) {
    throw new MongoError("collection names must not start or end with '.'");
  }

  // Validate that we are not passing 0x00 in the collection name
  if(!!~collectionName.indexOf("\x00")) {
    throw new MongoError("collection names cannot contain a null character");
  }
};

var handleCallback = function(callback, err, value1, value2) {
  try {
    if(callback == null) return;
    if(callback) {
      return value2 ? callback(err, value1, value2) :  callback(err, value1);
    }
  } catch(err) {
    process.nextTick(function() { throw err; });
    return false;
  }

  return true;
}

/**
 * Wrap a Mongo error document in an Error instance
 * @ignore
 * @api private
 */
var toError = function(error) {
  if (error instanceof Error) return error;

  var msg = error.err || error.errmsg || error.errMessage || error;
  var e = MongoError.create({message: msg, driver:true});

  // Get all object keys
  var keys = typeof error == 'object'
    ? Object.keys(error)
    : [];

  for(var i = 0; i < keys.length; i++) {
    try {
      e[keys[i]] = error[keys[i]];
    } catch(err) {
      // continue
    }
  }

  return e;
}

/**
 * @ignore
 */
var normalizeHintField = function normalizeHintField(hint) {
  var finalHint = null;

  if(typeof hint == 'string') {
    finalHint = hint;
  } else if(Array.isArray(hint)) {
    finalHint = {};

    hint.forEach(function(param) {
      finalHint[param] = 1;
    });
  } else if(hint != null && typeof hint == 'object') {
    finalHint = {};
    for (var name in hint) {
      finalHint[name] = hint[name];
    }
  }

  return finalHint;
};

/**
 * Create index name based on field spec
 *
 * @ignore
 * @api private
 */
var parseIndexOptions = function(fieldOrSpec) {
  var fieldHash = {};
  var indexes = [];
  var keys;

  // Get all the fields accordingly
  if('string' == typeof fieldOrSpec) {
    // 'type'
    indexes.push(fieldOrSpec + '_' + 1);
    fieldHash[fieldOrSpec] = 1;
  } else if(Array.isArray(fieldOrSpec)) {
    fieldOrSpec.forEach(function(f) {
      if('string' == typeof f) {
        // [{location:'2d'}, 'type']
        indexes.push(f + '_' + 1);
        fieldHash[f] = 1;
      } else if(Array.isArray(f)) {
        // [['location', '2d'],['type', 1]]
        indexes.push(f[0] + '_' + (f[1] || 1));
        fieldHash[f[0]] = f[1] || 1;
      } else if(isObject(f)) {
        // [{location:'2d'}, {type:1}]
        keys = Object.keys(f);
        keys.forEach(function(k) {
          indexes.push(k + '_' + f[k]);
          fieldHash[k] = f[k];
        });
      } else {
        // undefined (ignore)
      }
    });
  } else if(isObject(fieldOrSpec)) {
    // {location:'2d', type:1}
    keys = Object.keys(fieldOrSpec);
    keys.forEach(function(key) {
      indexes.push(key + '_' + fieldOrSpec[key]);
      fieldHash[key] = fieldOrSpec[key];
    });
  }

  return {
    name: indexes.join("_"), keys: keys, fieldHash: fieldHash
  }
}

var isObject = exports.isObject = function (arg) {
  return '[object Object]' == Object.prototype.toString.call(arg)
}

var debugOptions = function(debugFields, options) {
  var finaloptions = {};
  debugFields.forEach(function(n) {
    finaloptions[n] = options[n];
  });

  return finaloptions;
}

var decorateCommand = function(command, options, exclude) {
  for(var name in options) {
    if(exclude[name] == null) command[name] = options[name];
  }

  return command;
}

var mergeOptions = function(target, source) {
  for(var name in source) {
    target[name] = source[name];
  }

  return target;
}

// Merge options with translation
var translateOptions = function(target, source) {
  var translations = {
    // SSL translation options
    'sslCA': 'ca', 'sslCRL': 'crl', 'sslValidate': 'rejectUnauthorized', 'sslKey': 'key',
    'sslCert': 'cert', 'sslPass': 'passphrase',
    // SocketTimeout translation options
    'socketTimeoutMS': 'socketTimeout', 'connectTimeoutMS': 'connectionTimeout',
    // Replicaset options
    'replicaSet': 'setName', 'rs_name': 'setName', 'secondaryAcceptableLatencyMS': 'acceptableLatency',
    'connectWithNoPrimary': 'secondaryOnlyConnectionAllowed',
    // Mongos options
    'acceptableLatencyMS': 'localThresholdMS'
  }

  for(var name in source) {
    if(translations[name]) {
      target[translations[name]] = source[name];
    } else {
      target[name] = source[name];
    }
  }

  return target;
}

var filterOptions = function(options, names) {
  var filterOptions =  {};

  for(var name in options) {
    if(names.indexOf(name) != -1) filterOptions[name] = options[name];
  }

  // Filtered options
  return filterOptions;
}

// Object.assign method or polyfill
var assign = Object.assign ? Object.assign : function assign(target) {
  if (target === undefined || target === null) {
    throw new TypeError('Cannot convert first argument to object');
  }

  var to = Object(target);
  for (var i = 1; i < arguments.length; i++) {
    var nextSource = arguments[i];
    if (nextSource === undefined || nextSource === null) {
      continue;
    }

    var keysArray = Object.keys(Object(nextSource));
    for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
      var nextKey = keysArray[nextIndex];
      var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
      if (desc !== undefined && desc.enumerable) {
        to[nextKey] = nextSource[nextKey];
      }
    }
  }
  return to;
}

// Write concern keys
var writeConcernKeys = ['w', 'j', 'wtimeout', 'fsync'];

// Merge the write concern options
var mergeOptionsAndWriteConcern = function(targetOptions, sourceOptions, keys, mergeWriteConcern) {
  // Mix in any allowed options
  for(var i = 0; i < keys.length; i++) {
    if(!targetOptions[keys[i]] && sourceOptions[keys[i]] != undefined) {
      targetOptions[keys[i]] = sourceOptions[keys[i]];
    }
  }

  // No merging of write concern
  if(!mergeWriteConcern) return targetOptions;

  // Found no write Concern options
  var found = false;
  for(var i = 0; i < writeConcernKeys.length; i++) {
    if(targetOptions[writeConcernKeys[i]]) {
      found = true;
      break;
    }
  }

  if(!found) {
    for(var i = 0; i < writeConcernKeys.length; i++) {
      if(sourceOptions[writeConcernKeys[i]]) {
        targetOptions[writeConcernKeys[i]] = sourceOptions[writeConcernKeys[i]];
      }
    }
  }

  return targetOptions;
}

exports.filterOptions = filterOptions;
exports.mergeOptions = mergeOptions;
exports.translateOptions = translateOptions;
exports.shallowClone = shallowClone;
exports.getSingleProperty = getSingleProperty;
exports.checkCollectionName = checkCollectionName;
exports.toError = toError;
exports.formattedOrderClause = formattedOrderClause;
exports.parseIndexOptions = parseIndexOptions;
exports.normalizeHintField = normalizeHintField;
exports.handleCallback = handleCallback;
exports.decorateCommand = decorateCommand;
exports.isObject = isObject;
exports.debugOptions = debugOptions;
exports.MAX_JS_INT = 0x20000000000000;
exports.assign = assign;
exports.mergeOptionsAndWriteConcern = mergeOptionsAndWriteConcern;
exports.getReadPreference = getReadPreference;


/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = require("mongodb-core");

/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = require("util");

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = require("es6-promise");

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

var f = __webpack_require__(2).format;

var Define = function(name, object, stream) {
  this.name = name;
  this.object = object;
  this.stream = typeof stream == 'boolean' ? stream : false;
  this.instrumentations = {};
}

Define.prototype.classMethod = function(name, options) {
  var keys = Object.keys(options).sort();
  var key = generateKey(keys, options);

  // Add a list of instrumentations
  if(this.instrumentations[key] == null) {
    this.instrumentations[key] = {
      methods: [], options: options
    }
  }

  // Push to list of method for this instrumentation
  this.instrumentations[key].methods.push(name);
}

var generateKey = function(keys, options) {
  var parts = [];
  for(var i = 0; i < keys.length; i++) {
    parts.push(f('%s=%s', keys[i], options[keys[i]]));
  }

  return parts.join();
}

Define.prototype.staticMethod = function(name, options) {
  options.static = true;
  var keys = Object.keys(options).sort();
  var key = generateKey(keys, options);

  // Add a list of instrumentations
  if(this.instrumentations[key] == null) {
    this.instrumentations[key] = {
      methods: [], options: options
    }
  }

  // Push to list of method for this instrumentation
  this.instrumentations[key].methods.push(name);
}

Define.prototype.generate = function() {
  // Generate the return object
  var object = {
    name: this.name, obj: this.object, stream: this.stream,
    instrumentations: []
  }

  for(var name in this.instrumentations) {
    object.instrumentations.push(this.instrumentations[name]);
  }

  return object;
}

module.exports = Define;


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/**
 * @fileOverview The **ReadPreference** class is a class that represents a MongoDB ReadPreference and is
 * used to construct connections.
 *
 * @example
 * var Db = require('mongodb').Db,
 *   ReplSet = require('mongodb').ReplSet,
 *   Server = require('mongodb').Server,
 *   ReadPreference = require('mongodb').ReadPreference,
 *   test = require('assert');
 * // Connect using ReplSet
 * var server = new Server('localhost', 27017);
 * var db = new Db('test', new ReplSet([server]));
 * db.open(function(err, db) {
 *   test.equal(null, err);
 *   // Perform a read
 *   var cursor = db.collection('t').find({});
 *   cursor.setReadPreference(ReadPreference.PRIMARY);
 *   cursor.toArray(function(err, docs) {
 *     test.equal(null, err);
 *     db.close();
 *   });
 * });
 */

/**
 * Creates a new ReadPreference instance
 *
 * Read Preferences
 *  - **ReadPreference.PRIMARY**, Read from primary only. All operations produce an error (throw an exception where applicable) if primary is unavailable. Cannot be combined with tags (This is the default.).
 *  - **ReadPreference.PRIMARY_PREFERRED**, Read from primary if available, otherwise a secondary.
 *  - **ReadPreference.SECONDARY**, Read from secondary if available, otherwise error.
 *  - **ReadPreference.SECONDARY_PREFERRED**, Read from a secondary if available, otherwise read from the primary.
 *  - **ReadPreference.NEAREST**, All modes read from among the nearest candidates, but unlike other modes, NEAREST will include both the primary and all secondaries in the random selection.
 *
 * @class
 * @param {string} mode The ReadPreference mode as listed above.
 * @param {array|object} tags An object representing read preference tags.
 * @param {object} [options] Additional read preference options
 * @param {number} [options.maxStalenessSeconds] Max Secondary Read Staleness in Seconds
 * @return {ReadPreference} a ReadPreference instance.
 */
var ReadPreference = function(mode, tags, options) {
  if(!(this instanceof ReadPreference)) {
    return new ReadPreference(mode, tags, options);
  }

  this._type = 'ReadPreference';
  this.mode = mode;
  this.tags = tags;
  this.options =  options;

  // If no tags were passed in
  if(tags && typeof tags == 'object' && !Array.isArray(tags)) {
    if(tags.maxStalenessSeconds) {
      this.options = tags;
      this.tags = null;
    }
  }

  // Add the maxStalenessSeconds value to the read Preference
  if(this.options && this.options.maxStalenessSeconds) {
    this.maxStalenessSeconds = this.options.maxStalenessSeconds;
  }
}

/**
 * Validate if a mode is legal
 *
 * @method
 * @param {string} mode The string representing the read preference mode.
 * @return {boolean}
 */
ReadPreference.isValid = function(_mode) {
  return (_mode == ReadPreference.PRIMARY || _mode == ReadPreference.PRIMARY_PREFERRED
    || _mode == ReadPreference.SECONDARY || _mode == ReadPreference.SECONDARY_PREFERRED
    || _mode == ReadPreference.NEAREST
    || _mode == true || _mode == false || _mode == null);
}

/**
 * Validate if a mode is legal
 *
 * @method
 * @param {string} mode The string representing the read preference mode.
 * @return {boolean}
 */
ReadPreference.prototype.isValid = function(mode) {
  var _mode = typeof mode == 'string' ? mode : this.mode;
  return ReadPreference.isValid(_mode);
}

/**
 * @ignore
 */
ReadPreference.prototype.toObject = function() {
  var object = {mode:this.mode};

  if(this.tags != null) {
    object['tags'] = this.tags;
  }

  if(this.maxStalenessSeconds) {
    object['maxStalenessSeconds'] = this.maxStalenessSeconds;
  }

  return object;
}

/**
 * @ignore
 */
ReadPreference.prototype.toJSON = function() {
  return this.toObject();
}

/**
 * @ignore
 */
ReadPreference.PRIMARY = 'primary';
ReadPreference.PRIMARY_PREFERRED = 'primaryPreferred';
ReadPreference.SECONDARY = 'secondary';
ReadPreference.SECONDARY_PREFERRED = 'secondaryPreferred';
ReadPreference.NEAREST = 'nearest'

/**
 * @ignore
 */
module.exports = ReadPreference;


/***/ }),
/* 6 */
/***/ (function(module, exports) {

module.exports = require("debug");

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var inherits = __webpack_require__(2).inherits
  , f = __webpack_require__(2).format
  , formattedOrderClause = __webpack_require__(0).formattedOrderClause
  , handleCallback = __webpack_require__(0).handleCallback
  , ReadPreference = __webpack_require__(5)
  , MongoError = __webpack_require__(1).MongoError
  , Readable = __webpack_require__(13).Readable || __webpack_require__(22).Readable
  , Define = __webpack_require__(4)
  , CoreCursor = __webpack_require__(1).Cursor
  , Map = __webpack_require__(1).BSON.Map
  , CoreReadPreference = __webpack_require__(1).ReadPreference;

/**
 * @fileOverview The **Cursor** class is an internal class that embodies a cursor on MongoDB
 * allowing for iteration over the results returned from the underlying query. It supports
 * one by one document iteration, conversion to an array or can be iterated as a Node 0.10.X
 * or higher stream
 *
 * **CURSORS Cannot directly be instantiated**
 * @example
 * var MongoClient = require('mongodb').MongoClient,
 *   test = require('assert');
 * // Connection url
 * var url = 'mongodb://localhost:27017/test';
 * // Connect using MongoClient
 * MongoClient.connect(url, function(err, db) {
 *   // Create a collection we want to drop later
 *   var col = db.collection('createIndexExample1');
 *   // Insert a bunch of documents
 *   col.insert([{a:1, b:1}
 *     , {a:2, b:2}, {a:3, b:3}
 *     , {a:4, b:4}], {w:1}, function(err, result) {
 *     test.equal(null, err);
 *
 *     // Show that duplicate records got dropped
 *     col.find({}).toArray(function(err, items) {
 *       test.equal(null, err);
 *       test.equal(4, items.length);
 *       db.close();
 *     });
 *   });
 * });
 */

/**
 * Namespace provided by the mongodb-core and node.js
 * @external CoreCursor
 * @external Readable
 */

// Flags allowed for cursor
var flags = ['tailable', 'oplogReplay', 'noCursorTimeout', 'awaitData', 'exhaust', 'partial'];
var fields = ['numberOfRetries', 'tailableRetryInterval'];
var push = Array.prototype.push;

/**
 * Creates a new Cursor instance (INTERNAL TYPE, do not instantiate directly)
 * @class Cursor
 * @extends external:CoreCursor
 * @extends external:Readable
 * @property {string} sortValue Cursor query sort setting.
 * @property {boolean} timeout Is Cursor able to time out.
 * @property {ReadPreference} readPreference Get cursor ReadPreference.
 * @fires Cursor#data
 * @fires Cursor#end
 * @fires Cursor#close
 * @fires Cursor#readable
 * @return {Cursor} a Cursor instance.
 * @example
 * Cursor cursor options.
 *
 * collection.find({}).project({a:1})                             // Create a projection of field a
 * collection.find({}).skip(1).limit(10)                          // Skip 1 and limit 10
 * collection.find({}).batchSize(5)                               // Set batchSize on cursor to 5
 * collection.find({}).filter({a:1})                              // Set query on the cursor
 * collection.find({}).comment('add a comment')                   // Add a comment to the query, allowing to correlate queries
 * collection.find({}).addCursorFlag('tailable', true)            // Set cursor as tailable
 * collection.find({}).addCursorFlag('oplogReplay', true)         // Set cursor as oplogReplay
 * collection.find({}).addCursorFlag('noCursorTimeout', true)     // Set cursor as noCursorTimeout
 * collection.find({}).addCursorFlag('awaitData', true)           // Set cursor as awaitData
 * collection.find({}).addCursorFlag('partial', true)             // Set cursor as partial
 * collection.find({}).addQueryModifier('$orderby', {a:1})        // Set $orderby {a:1}
 * collection.find({}).max(10)                                    // Set the cursor maxScan
 * collection.find({}).maxScan(10)                                // Set the cursor maxScan
 * collection.find({}).maxTimeMS(1000)                            // Set the cursor maxTimeMS
 * collection.find({}).min(100)                                   // Set the cursor min
 * collection.find({}).returnKey(10)                              // Set the cursor returnKey
 * collection.find({}).setReadPreference(ReadPreference.PRIMARY)  // Set the cursor readPreference
 * collection.find({}).showRecordId(true)                         // Set the cursor showRecordId
 * collection.find({}).snapshot(true)                             // Set the cursor snapshot
 * collection.find({}).sort([['a', 1]])                           // Sets the sort order of the cursor query
 * collection.find({}).hint('a_1')                                // Set the cursor hint
 *
 * All options are chainable, so one can do the following.
 *
 * collection.find({}).maxTimeMS(1000).maxScan(100).skip(1).toArray(..)
 */
var Cursor = function(bson, ns, cmd, options, topology, topologyOptions) {
  CoreCursor.apply(this, Array.prototype.slice.call(arguments, 0));
  var self = this;
  var state = Cursor.INIT;
  var streamOptions = {};

  // Tailable cursor options
  var numberOfRetries = options.numberOfRetries || 5;
  var tailableRetryInterval = options.tailableRetryInterval || 500;
  var currentNumberOfRetries = numberOfRetries;

  // Get the promiseLibrary
  var promiseLibrary = options.promiseLibrary;

  // No promise library selected fall back
  if(!promiseLibrary) {
    promiseLibrary = typeof global.Promise == 'function' ?
      global.Promise : __webpack_require__(3).Promise;
  }

  // Set up
  Readable.call(this, {objectMode: true});

  // Internal cursor state
  this.s = {
    // Tailable cursor options
      numberOfRetries: numberOfRetries
    , tailableRetryInterval: tailableRetryInterval
    , currentNumberOfRetries: currentNumberOfRetries
    // State
    , state: state
    // Stream options
    , streamOptions: streamOptions
    // BSON
    , bson: bson
    // Namespace
    , ns: ns
    // Command
    , cmd: cmd
    // Options
    , options: options
    // Topology
    , topology: topology
    // Topology options
    , topologyOptions: topologyOptions
    // Promise library
    , promiseLibrary: promiseLibrary
    // Current doc
    , currentDoc: null
  }

  // Translate correctly
  if(self.s.options.noCursorTimeout == true) {
    self.addCursorFlag('noCursorTimeout', true);
  }

  // Set the sort value
  this.sortValue = self.s.cmd.sort;

  // Get the batchSize
  var batchSize = cmd.cursor && cmd.cursor.batchSize
    ? cmd.cursor && cmd.cursor.batchSize
    : (options.cursor && options.cursor.batchSize ? options.cursor.batchSize : 1000);

  // Set the batchSize
  this.setCursorBatchSize(batchSize);
}

/**
 * Cursor stream data event, fired for each document in the cursor.
 *
 * @event Cursor#data
 * @type {object}
 */

/**
 * Cursor stream end event
 *
 * @event Cursor#end
 * @type {null}
 */

/**
 * Cursor stream close event
 *
 * @event Cursor#close
 * @type {null}
 */

/**
 * Cursor stream readable event
 *
 * @event Cursor#readable
 * @type {null}
 */

// Inherit from Readable
inherits(Cursor, Readable);

// Map core cursor _next method so we can apply mapping
CoreCursor.prototype._next = CoreCursor.prototype.next;

for(var name in CoreCursor.prototype) {
  Cursor.prototype[name] = CoreCursor.prototype[name];
}

var define = Cursor.define = new Define('Cursor', Cursor, true);

/**
 * Check if there is any document still available in the cursor
 * @method
 * @param {Cursor~resultCallback} [callback] The result callback.
 * @throws {MongoError}
 * @return {Promise} returns Promise if no callback passed
 */
Cursor.prototype.hasNext = function(callback) {
  var self = this;

  // Execute using callback
  if(typeof callback == 'function') {
    if(self.s.currentDoc){
      return callback(null, true);
    } else {
      return nextObject(self, function(err, doc) {
        if (err) return callback(err, null);
        if (!doc) return callback(null, false);
        self.s.currentDoc = doc;
        callback(null, true);
      });
    }
  }

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    if(self.s.currentDoc){
      resolve(true);
    } else {
      nextObject(self, function(err, doc) {
        if(self.s.state == Cursor.CLOSED || self.isDead()) return resolve(false);
        if(err) return reject(err);
        if(!doc) return resolve(false);
        self.s.currentDoc = doc;
        resolve(true);
      });
    }
  });
}

define.classMethod('hasNext', {callback: true, promise:true});

/**
 * Get the next available document from the cursor, returns null if no more documents are available.
 * @method
 * @param {Cursor~resultCallback} [callback] The result callback.
 * @throws {MongoError}
 * @return {Promise} returns Promise if no callback passed
 */
Cursor.prototype.next = function(callback) {
  var self = this;

  // Execute using callback
  if(typeof callback == 'function') {
    // Return the currentDoc if someone called hasNext first
    if(self.s.currentDoc) {
      var doc = self.s.currentDoc;
      self.s.currentDoc = null;
      return callback(null, doc);
    }

    // Return the next object
    return nextObject(self, callback)
  }

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    // Return the currentDoc if someone called hasNext first
    if(self.s.currentDoc) {
      var doc = self.s.currentDoc;
      self.s.currentDoc = null;
      return resolve(doc);
    }

    nextObject(self, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

define.classMethod('next', {callback: true, promise:true});

/**
 * Set the cursor query
 * @method
 * @param {object} filter The filter object used for the cursor.
 * @return {Cursor}
 */
Cursor.prototype.filter = function(filter) {
  if(this.s.state == Cursor.CLOSED || this.s.state == Cursor.OPEN || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true});
  this.s.cmd.query = filter;
  return this;
}

define.classMethod('filter', {callback: false, promise:false, returns: [Cursor]});

/**
 * Set the cursor maxScan
 * @method
 * @param {object} maxScan Constrains the query to only scan the specified number of documents when fulfilling the query
 * @return {Cursor}
 */
Cursor.prototype.maxScan = function(maxScan) {
  if(this.s.state == Cursor.CLOSED || this.s.state == Cursor.OPEN || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true});
  this.s.cmd.maxScan = maxScan;
  return this;
}

define.classMethod('maxScan', {callback: false, promise:false, returns: [Cursor]});

/**
 * Set the cursor hint
 * @method
 * @param {object} hint If specified, then the query system will only consider plans using the hinted index.
 * @return {Cursor}
 */
Cursor.prototype.hint = function(hint) {
  if(this.s.state == Cursor.CLOSED || this.s.state == Cursor.OPEN || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true});
  this.s.cmd.hint = hint;
  return this;
}

define.classMethod('hint', {callback: false, promise:false, returns: [Cursor]});

/**
 * Set the cursor min
 * @method
 * @param {object} min Specify a $min value to specify the inclusive lower bound for a specific index in order to constrain the results of find(). The $min specifies the lower bound for all keys of a specific index in order.
 * @return {Cursor}
 */
Cursor.prototype.min = function(min) {
  if(this.s.state == Cursor.CLOSED || this.s.state == Cursor.OPEN || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true});
  this.s.cmd.min = min;
  return this;
}

define.classMethod('min', {callback: false, promise:false, returns: [Cursor]});

/**
 * Set the cursor max
 * @method
 * @param {object} max Specify a $max value to specify the exclusive upper bound for a specific index in order to constrain the results of find(). The $max specifies the upper bound for all keys of a specific index in order.
 * @return {Cursor}
 */
Cursor.prototype.max = function(max) {
  if(this.s.state == Cursor.CLOSED || this.s.state == Cursor.OPEN || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true});
  this.s.cmd.max = max;
  return this;
}

define.classMethod('max', {callback: false, promise:false, returns: [Cursor]});

/**
 * Set the cursor returnKey
 * @method
 * @param {object} returnKey Only return the index field or fields for the results of the query. If $returnKey is set to true and the query does not use an index to perform the read operation, the returned documents will not contain any fields. Use one of the following forms:
 * @return {Cursor}
 */
Cursor.prototype.returnKey = function(value) {
  if(this.s.state == Cursor.CLOSED || this.s.state == Cursor.OPEN || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true});
  this.s.cmd.returnKey = value;
  return this;
}

define.classMethod('returnKey', {callback: false, promise:false, returns: [Cursor]});

/**
 * Set the cursor showRecordId
 * @method
 * @param {object} showRecordId The $showDiskLoc option has now been deprecated and replaced with the showRecordId field. $showDiskLoc will still be accepted for OP_QUERY stye find.
 * @return {Cursor}
 */
Cursor.prototype.showRecordId = function(value) {
  if(this.s.state == Cursor.CLOSED || this.s.state == Cursor.OPEN || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true});
  this.s.cmd.showDiskLoc = value;
  return this;
}

define.classMethod('showRecordId', {callback: false, promise:false, returns: [Cursor]});

/**
 * Set the cursor snapshot
 * @method
 * @param {object} snapshot The $snapshot operator prevents the cursor from returning a document more than once because an intervening write operation results in a move of the document.
 * @return {Cursor}
 */
Cursor.prototype.snapshot = function(value) {
  if(this.s.state == Cursor.CLOSED || this.s.state == Cursor.OPEN || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true});
  this.s.cmd.snapshot = value;
  return this;
}

define.classMethod('snapshot', {callback: false, promise:false, returns: [Cursor]});

/**
 * Set a node.js specific cursor option
 * @method
 * @param {string} field The cursor option to set ['numberOfRetries', 'tailableRetryInterval'].
 * @param {object} value The field value.
 * @throws {MongoError}
 * @return {Cursor}
 */
Cursor.prototype.setCursorOption = function(field, value) {
  if(this.s.state == Cursor.CLOSED || this.s.state == Cursor.OPEN || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true});
  if(fields.indexOf(field) == -1) throw MongoError.create({message: f("option %s not a supported option %s", field, fields), driver:true });
  this.s[field] = value;
  if(field == 'numberOfRetries')
    this.s.currentNumberOfRetries = value;
  return this;
}

define.classMethod('setCursorOption', {callback: false, promise:false, returns: [Cursor]});

/**
 * Add a cursor flag to the cursor
 * @method
 * @param {string} flag The flag to set, must be one of following ['tailable', 'oplogReplay', 'noCursorTimeout', 'awaitData', 'partial'].
 * @param {boolean} value The flag boolean value.
 * @throws {MongoError}
 * @return {Cursor}
 */
Cursor.prototype.addCursorFlag = function(flag, value) {
  if(this.s.state == Cursor.CLOSED || this.s.state == Cursor.OPEN || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true});
  if(flags.indexOf(flag) == -1) throw MongoError.create({message: f("flag %s not a supported flag %s", flag, flags), driver:true });
  if(typeof value != 'boolean') throw MongoError.create({message: f("flag %s must be a boolean value", flag), driver:true});
  this.s.cmd[flag] = value;
  return this;
}

define.classMethod('addCursorFlag', {callback: false, promise:false, returns: [Cursor]});

/**
 * Add a query modifier to the cursor query
 * @method
 * @param {string} name The query modifier (must start with $, such as $orderby etc)
 * @param {boolean} value The flag boolean value.
 * @throws {MongoError}
 * @return {Cursor}
 */
Cursor.prototype.addQueryModifier = function(name, value) {
  if(this.s.state == Cursor.CLOSED || this.s.state == Cursor.OPEN || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true});
  if(name[0] != '$') throw MongoError.create({message: f("%s is not a valid query modifier"), driver:true});
  // Strip of the $
  var field = name.substr(1);
  // Set on the command
  this.s.cmd[field] = value;
  // Deal with the special case for sort
  if(field == 'orderby') this.s.cmd.sort = this.s.cmd[field];
  return this;
}

define.classMethod('addQueryModifier', {callback: false, promise:false, returns: [Cursor]});

/**
 * Add a comment to the cursor query allowing for tracking the comment in the log.
 * @method
 * @param {string} value The comment attached to this query.
 * @throws {MongoError}
 * @return {Cursor}
 */
Cursor.prototype.comment = function(value) {
  if(this.s.state == Cursor.CLOSED || this.s.state == Cursor.OPEN || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true});
  this.s.cmd.comment = value;
  return this;
}

define.classMethod('comment', {callback: false, promise:false, returns: [Cursor]});

/**
 * Set a maxAwaitTimeMS on a tailing cursor query to allow to customize the timeout value for the option awaitData (Only supported on MongoDB 3.2 or higher, ignored otherwise)
 * @method
 * @param {number} value Number of milliseconds to wait before aborting the tailed query.
 * @throws {MongoError}
 * @return {Cursor}
 */
Cursor.prototype.maxAwaitTimeMS = function(value) {
  if(typeof value != 'number') throw MongoError.create({message: "maxAwaitTimeMS must be a number", driver:true});
  if(this.s.state == Cursor.CLOSED || this.s.state == Cursor.OPEN || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true});
  this.s.cmd.maxAwaitTimeMS = value;
  return this;
}

define.classMethod('maxAwaitTimeMS', {callback: false, promise:false, returns: [Cursor]});

/**
 * Set a maxTimeMS on the cursor query, allowing for hard timeout limits on queries (Only supported on MongoDB 2.6 or higher)
 * @method
 * @param {number} value Number of milliseconds to wait before aborting the query.
 * @throws {MongoError}
 * @return {Cursor}
 */
Cursor.prototype.maxTimeMS = function(value) {
  if(typeof value != 'number') throw MongoError.create({message: "maxTimeMS must be a number", driver:true});
  if(this.s.state == Cursor.CLOSED || this.s.state == Cursor.OPEN || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true});
  this.s.cmd.maxTimeMS = value;
  return this;
}

define.classMethod('maxTimeMS', {callback: false, promise:false, returns: [Cursor]});

Cursor.prototype.maxTimeMs = Cursor.prototype.maxTimeMS;

define.classMethod('maxTimeMs', {callback: false, promise:false, returns: [Cursor]});

/**
 * Sets a field projection for the query.
 * @method
 * @param {object} value The field projection object.
 * @throws {MongoError}
 * @return {Cursor}
 */
Cursor.prototype.project = function(value) {
  if(this.s.state == Cursor.CLOSED || this.s.state == Cursor.OPEN || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true});
  this.s.cmd.fields = value;
  return this;
}

define.classMethod('project', {callback: false, promise:false, returns: [Cursor]});

/**
 * Sets the sort order of the cursor query.
 * @method
 * @param {(string|array|object)} keyOrList The key or keys set for the sort.
 * @param {number} [direction] The direction of the sorting (1 or -1).
 * @throws {MongoError}
 * @return {Cursor}
 */
Cursor.prototype.sort = function(keyOrList, direction) {
  if(this.s.options.tailable) throw MongoError.create({message: "Tailable cursor doesn't support sorting", driver:true});
  if(this.s.state == Cursor.CLOSED || this.s.state == Cursor.OPEN || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true});
  var order = keyOrList;

  // We have an array of arrays, we need to preserve the order of the sort
  // so we will us a Map
  if(Array.isArray(order) && Array.isArray(order[0])) {
    order = new Map(order.map(function(x) {
      var value = [x[0], null];
      if(x[1] == 'asc') {
        value[1] = 1;
      } else if(x[1] == 'desc') {
        value[1] = -1;
      } else if(x[1] == 1 || x[1] == -1) {
        value[1] = x[1];
      } else {
        throw new MongoError("Illegal sort clause, must be of the form [['field1', '(ascending|descending)'], ['field2', '(ascending|descending)']]");
      }

      return value;
    }));
  }

  if(direction != null) {
    order = [[keyOrList, direction]];
  }

  this.s.cmd.sort = order;
  this.sortValue = order;
  return this;
}

define.classMethod('sort', {callback: false, promise:false, returns: [Cursor]});

/**
 * Set the batch size for the cursor.
 * @method
 * @param {number} value The batchSize for the cursor.
 * @throws {MongoError}
 * @return {Cursor}
 */
Cursor.prototype.batchSize = function(value) {
  if(this.s.options.tailable) throw MongoError.create({message: "Tailable cursor doesn't support batchSize", driver:true});
  if(this.s.state == Cursor.CLOSED || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true});
  if(typeof value != 'number') throw MongoError.create({message: "batchSize requires an integer", driver:true});
  this.s.cmd.batchSize = value;
  this.setCursorBatchSize(value);
  return this;
}

define.classMethod('batchSize', {callback: false, promise:false, returns: [Cursor]});

/**
 * Set the collation options for the cursor.
 * @method
 * @param {object} value The cursor collation options (MongoDB 3.4 or higher) settings for update operation (see 3.4 documentation for available fields).
 * @throws {MongoError}
 * @return {Cursor}
 */
Cursor.prototype.collation = function(value) {
  this.s.cmd.collation = value;
  return this;
}

define.classMethod('collation', {callback: false, promise:false, returns: [Cursor]});

/**
 * Set the limit for the cursor.
 * @method
 * @param {number} value The limit for the cursor query.
 * @throws {MongoError}
 * @return {Cursor}
 */
Cursor.prototype.limit = function(value) {
  if(this.s.options.tailable) throw MongoError.create({message: "Tailable cursor doesn't support limit", driver:true});
  if(this.s.state == Cursor.OPEN || this.s.state == Cursor.CLOSED || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true});
  if(typeof value != 'number') throw MongoError.create({message: "limit requires an integer", driver:true});
  this.s.cmd.limit = value;
  // this.cursorLimit = value;
  this.setCursorLimit(value);
  return this;
}

define.classMethod('limit', {callback: false, promise:false, returns: [Cursor]});

/**
 * Set the skip for the cursor.
 * @method
 * @param {number} value The skip for the cursor query.
 * @throws {MongoError}
 * @return {Cursor}
 */
Cursor.prototype.skip = function(value) {
  if(this.s.options.tailable) throw MongoError.create({message: "Tailable cursor doesn't support skip", driver:true});
  if(this.s.state == Cursor.OPEN || this.s.state == Cursor.CLOSED || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true});
  if(typeof value != 'number') throw MongoError.create({message: "skip requires an integer", driver:true});
  this.s.cmd.skip = value;
  this.setCursorSkip(value);
  return this;
}

define.classMethod('skip', {callback: false, promise:false, returns: [Cursor]});

/**
 * The callback format for results
 * @callback Cursor~resultCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {(object|null|boolean)} result The result object if the command was executed successfully.
 */

/**
 * Clone the cursor
 * @function external:CoreCursor#clone
 * @return {Cursor}
 */

/**
 * Resets the cursor
 * @function external:CoreCursor#rewind
 * @return {null}
 */

/**
 * Get the next available document from the cursor, returns null if no more documents are available.
 * @method
 * @param {Cursor~resultCallback} [callback] The result callback.
 * @throws {MongoError}
 * @deprecated
 * @return {Promise} returns Promise if no callback passed
 */
Cursor.prototype.nextObject = Cursor.prototype.next;

var nextObject = function(self, callback) {
  if(self.s.state == Cursor.CLOSED || self.isDead && self.isDead()) return handleCallback(callback, MongoError.create({message: "Cursor is closed", driver:true}));
  if(self.s.state == Cursor.INIT && self.s.cmd.sort) {
    try {
      self.s.cmd.sort = formattedOrderClause(self.s.cmd.sort);
    } catch(err) {
      return handleCallback(callback, err);
    }
  }

  // Get the next object
  self._next(function(err, doc) {
    self.s.state = Cursor.OPEN;
    if(err) return handleCallback(callback, err);
    handleCallback(callback, null, doc);
  });
}

define.classMethod('nextObject', {callback: true, promise:true});

// Trampoline emptying the number of retrieved items
// without incurring a nextTick operation
var loop = function(self, callback) {
  // No more items we are done
  if(self.bufferedCount() == 0) return;
  // Get the next document
  self._next(callback);
  // Loop
  return loop;
}

Cursor.prototype.next = Cursor.prototype.nextObject;

define.classMethod('next', {callback: true, promise:true});

/**
 * Iterates over all the documents for this cursor. As with **{cursor.toArray}**,
 * not all of the elements will be iterated if this cursor had been previously accessed.
 * In that case, **{cursor.rewind}** can be used to reset the cursor. However, unlike
 * **{cursor.toArray}**, the cursor will only hold a maximum of batch size elements
 * at any given time if batch size is specified. Otherwise, the caller is responsible
 * for making sure that the entire result can fit the memory.
 * @method
 * @deprecated
 * @param {Cursor~resultCallback} callback The result callback.
 * @throws {MongoError}
 * @return {null}
 */
Cursor.prototype.each = function(callback) {
  // Rewind cursor state
  this.rewind();
  // Set current cursor to INIT
  this.s.state = Cursor.INIT;
  // Run the query
  _each(this, callback);
};

define.classMethod('each', {callback: true, promise:false});

// Run the each loop
var _each = function(self, callback) {
  if(!callback) throw MongoError.create({message: 'callback is mandatory', driver:true});
  if(self.isNotified()) return;
  if(self.s.state == Cursor.CLOSED || self.isDead()) {
    return handleCallback(callback, MongoError.create({message: "Cursor is closed", driver:true}));
  }

  if(self.s.state == Cursor.INIT) self.s.state = Cursor.OPEN;

  // Define function to avoid global scope escape
  var fn = null;
  // Trampoline all the entries
  if(self.bufferedCount() > 0) {
    while(fn = loop(self, callback)) fn(self, callback);
    _each(self, callback);
  } else {
    self.next(function(err, item) {
      if(err) return handleCallback(callback, err);
      if(item == null) {
        self.s.state = Cursor.CLOSED;
        return handleCallback(callback, null, null);
      }

      if(handleCallback(callback, null, item) == false) return;
      _each(self, callback);
    })
  }
}

/**
 * The callback format for the forEach iterator method
 * @callback Cursor~iteratorCallback
 * @param {Object} doc An emitted document for the iterator
 */

/**
 * The callback error format for the forEach iterator method
 * @callback Cursor~endCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 */

/**
 * Iterates over all the documents for this cursor using the iterator, callback pattern.
 * @method
 * @param {Cursor~iteratorCallback} iterator The iteration callback.
 * @param {Cursor~endCallback} callback The end callback.
 * @throws {MongoError}
 * @return {null}
 */
Cursor.prototype.forEach = function(iterator, callback) {
  this.each(function(err, doc){
    if(err) { callback(err); return false; }
    if(doc != null) { iterator(doc); return true; }
    if(doc == null && callback) {
      var internalCallback = callback;
      callback = null;
      internalCallback(null);
      return false;
    }
  });
}

define.classMethod('forEach', {callback: true, promise:false});

/**
 * Set the ReadPreference for the cursor.
 * @method
 * @param {(string|ReadPreference)} readPreference The new read preference for the cursor.
 * @throws {MongoError}
 * @return {Cursor}
 */
Cursor.prototype.setReadPreference = function(r) {
  if(this.s.state != Cursor.INIT) throw MongoError.create({message: 'cannot change cursor readPreference after cursor has been accessed', driver:true});
  if(r instanceof ReadPreference) {
    this.s.options.readPreference = new CoreReadPreference(r.mode, r.tags, {maxStalenessSeconds: r.maxStalenessSeconds});
  } else if(typeof r == 'string'){
    this.s.options.readPreference = new CoreReadPreference(r);
  } else if(r instanceof CoreReadPreference) {
    this.s.options.readPreference = r;
  }

  return this;
}

define.classMethod('setReadPreference', {callback: false, promise:false, returns: [Cursor]});

/**
 * The callback format for results
 * @callback Cursor~toArrayResultCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {object[]} documents All the documents the satisfy the cursor.
 */

/**
 * Returns an array of documents. The caller is responsible for making sure that there
 * is enough memory to store the results. Note that the array only contain partial
 * results when this cursor had been previously accessed. In that case,
 * cursor.rewind() can be used to reset the cursor.
 * @method
 * @param {Cursor~toArrayResultCallback} [callback] The result callback.
 * @throws {MongoError}
 * @return {Promise} returns Promise if no callback passed
 */
Cursor.prototype.toArray = function(callback) {
  var self = this;
  if(self.s.options.tailable) throw MongoError.create({message: 'Tailable cursor cannot be converted to array', driver:true});

  // Execute using callback
  if(typeof callback == 'function') return toArray(self, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    toArray(self, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var toArray = function(self, callback) {
  var items = [];

  // Reset cursor
  self.rewind();
  self.s.state = Cursor.INIT;

  // Fetch all the documents
  var fetchDocs = function() {
    self._next(function(err, doc) {
      if(err) return handleCallback(callback, err);
      if(doc == null) {
        self.s.state = Cursor.CLOSED;
        return handleCallback(callback, null, items);
      }

      // Add doc to items
      items.push(doc)

      // Get all buffered objects
      if(self.bufferedCount() > 0) {
        var docs = self.readBufferedDocuments(self.bufferedCount())

        // Transform the doc if transform method added
        if(self.s.transforms && typeof self.s.transforms.doc == 'function') {
          docs = docs.map(self.s.transforms.doc);
        }

        push.apply(items, docs);
      }

      // Attempt a fetch
      fetchDocs();
    })
  }

  fetchDocs();
}

define.classMethod('toArray', {callback: true, promise:true});

/**
 * The callback format for results
 * @callback Cursor~countResultCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {number} count The count of documents.
 */

/**
 * Get the count of documents for this cursor
 * @method
 * @param {boolean} [applySkipLimit=true] Should the count command apply limit and skip settings on the cursor or in the passed in options.
 * @param {object} [options=null] Optional settings.
 * @param {number} [options.skip=null] The number of documents to skip.
 * @param {number} [options.limit=null] The maximum amounts to count before aborting.
 * @param {number} [options.maxTimeMS=null] Number of milliseconds to wait before aborting the query.
 * @param {string} [options.hint=null] An index name hint for the query.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {Cursor~countResultCallback} [callback] The result callback.
 * @return {Promise} returns Promise if no callback passed
 */
Cursor.prototype.count = function(applySkipLimit, opts, callback) {
  var self = this;
  if(self.s.cmd.query == null) throw MongoError.create({message: "count can only be used with find command", driver:true});
  if(typeof opts == 'function') callback = opts, opts = {};
  opts = opts || {};

  // Execute using callback
  if(typeof callback == 'function') return count(self, applySkipLimit, opts, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    count(self, applySkipLimit, opts, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
};

var count = function(self, applySkipLimit, opts, callback) {
  if(typeof applySkipLimit == 'function') {
    callback = applySkipLimit;
    applySkipLimit = true;
  }

  if(applySkipLimit) {
    if(typeof self.cursorSkip() == 'number') opts.skip = self.cursorSkip();
    if(typeof self.cursorLimit() == 'number') opts.limit = self.cursorLimit();
  }

  // Command
  var delimiter = self.s.ns.indexOf('.');

  var command = {
    'count': self.s.ns.substr(delimiter+1), 'query': self.s.cmd.query
  }

  // Apply a readConcern if set
  if(self.s.cmd.readConcern) {
    command.readConcern = self.s.cmd.readConcern;
  }

  // Apply a hint if set
  if(self.s.cmd.hint) {
    command.hint = self.s.cmd.hint;
  }

  if(typeof opts.maxTimeMS == 'number') {
    command.maxTimeMS = opts.maxTimeMS;
  } else if(self.s.cmd && typeof self.s.cmd.maxTimeMS == 'number') {
    command.maxTimeMS = self.s.cmd.maxTimeMS;
  }

  // Merge in any options
  if(opts.skip) command.skip = opts.skip;
  if(opts.limit) command.limit = opts.limit;
  if(self.s.options.hint) command.hint = self.s.options.hint;

  // Set cursor server to the same as the topology
  self.server = self.topology;

  // Execute the command
  self.topology.command(f("%s.$cmd", self.s.ns.substr(0, delimiter))
    , command, function(err, result) {
      callback(err, result ? result.result.n : null)
    }, self.options);
}

define.classMethod('count', {callback: true, promise:true});

/**
 * Close the cursor, sending a KillCursor command and emitting close.
 * @method
 * @param {Cursor~resultCallback} [callback] The result callback.
 * @return {Promise} returns Promise if no callback passed
 */
Cursor.prototype.close = function(callback) {
  this.s.state = Cursor.CLOSED;
  // Kill the cursor
  this.kill();
  // Emit the close event for the cursor
  this.emit('close');
  // Callback if provided
  if(typeof callback == 'function') return handleCallback(callback, null, this);
  // Return a Promise
  return new this.s.promiseLibrary(function(resolve) {
    resolve();
  });
}

define.classMethod('close', {callback: true, promise:true});

/**
 * Map all documents using the provided function
 * @method
 * @param {function} [transform] The mapping transformation method.
 * @return {Cursor}
 */
Cursor.prototype.map = function(transform) {
  if(this.cursorState.transforms && this.cursorState.transforms.doc) {
    var oldTransform = this.cursorState.transforms.doc;
    this.cursorState.transforms.doc = function (doc) { return transform(oldTransform(doc)); };
  } else {
    this.cursorState.transforms = { doc: transform };
  }
  return this;
}

define.classMethod('map', {callback: false, promise:false, returns: [Cursor]});

/**
 * Is the cursor closed
 * @method
 * @return {boolean}
 */
Cursor.prototype.isClosed = function() {
  return this.isDead();
}

define.classMethod('isClosed', {callback: false, promise:false, returns: [Boolean]});

Cursor.prototype.destroy = function(err) {
  if(err) this.emit('error', err);
  this.pause();
  this.close();
}

define.classMethod('destroy', {callback: false, promise:false});

/**
 * Return a modified Readable stream including a possible transform method.
 * @method
 * @param {object} [options=null] Optional settings.
 * @param {function} [options.transform=null] A transformation method applied to each document emitted by the stream.
 * @return {Cursor}
 */
Cursor.prototype.stream = function(options) {
  this.s.streamOptions = options || {};
  return this;
}

define.classMethod('stream', {callback: false, promise:false, returns: [Cursor]});

/**
 * Execute the explain for the cursor
 * @method
 * @param {Cursor~resultCallback} [callback] The result callback.
 * @return {Promise} returns Promise if no callback passed
 */
Cursor.prototype.explain = function(callback) {
  var self = this;
  this.s.cmd.explain = true;

  // Do we have a readConcern
  if(this.s.cmd.readConcern) {
    delete this.s.cmd['readConcern'];
  }

  // Execute using callback
  if(typeof callback == 'function') return this._next(callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    self._next(function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

define.classMethod('explain', {callback: true, promise:true});

Cursor.prototype._read = function() {
  var self = this;
  if(self.s.state == Cursor.CLOSED || self.isDead()) {
    return self.push(null);
  }

  // Get the next item
  self.nextObject(function(err, result) {
    if(err) {
      if(self.listeners('error') && self.listeners('error').length > 0) {
        self.emit('error', err);
      }
      if(!self.isDead()) self.close();

      // Emit end event
      self.emit('end');
      return self.emit('finish');
    }

    // If we provided a transformation method
    if(typeof self.s.streamOptions.transform == 'function' && result != null) {
      return self.push(self.s.streamOptions.transform(result));
    }

    // If we provided a map function
    if(self.cursorState.transforms && typeof self.cursorState.transforms.doc == 'function' && result != null) {
      return self.push(self.cursorState.transforms.doc(result));
    }

    // Return the result
    self.push(result);
  });
}

Object.defineProperty(Cursor.prototype, 'readPreference', {
  enumerable:true,
  get: function() {
    if (!this || !this.s) {
      return null;
    }

    return this.s.options.readPreference;
  }
});

Object.defineProperty(Cursor.prototype, 'namespace', {
  enumerable: true,
  get: function() {
    if (!this || !this.s) {
      return null;
    }

    // TODO: refactor this logic into core
    var ns = this.s.ns || '';
    var firstDot = ns.indexOf('.');
    if (firstDot < 0) {
      return {
        database: this.s.ns,
        collection: ''
      };
    }
    return {
      database: ns.substr(0, firstDot),
      collection: ns.substr(firstDot + 1)
    };
  }
});

/**
 * The read() method pulls some data out of the internal buffer and returns it. If there is no data available, then it will return null.
 * @function external:Readable#read
 * @param {number} size Optional argument to specify how much data to read.
 * @return {(String | Buffer | null)}
 */

/**
 * Call this function to cause the stream to return strings of the specified encoding instead of Buffer objects.
 * @function external:Readable#setEncoding
 * @param {string} encoding The encoding to use.
 * @return {null}
 */

/**
 * This method will cause the readable stream to resume emitting data events.
 * @function external:Readable#resume
 * @return {null}
 */

/**
 * This method will cause a stream in flowing-mode to stop emitting data events. Any data that becomes available will remain in the internal buffer.
 * @function external:Readable#pause
 * @return {null}
 */

/**
 * This method pulls all the data out of a readable stream, and writes it to the supplied destination, automatically managing the flow so that the destination is not overwhelmed by a fast readable stream.
 * @function external:Readable#pipe
 * @param {Writable} destination The destination for writing data
 * @param {object} [options] Pipe options
 * @return {null}
 */

/**
 * This method will remove the hooks set up for a previous pipe() call.
 * @function external:Readable#unpipe
 * @param {Writable} [destination] The destination for writing data
 * @return {null}
 */

/**
 * This is useful in certain cases where a stream is being consumed by a parser, which needs to "un-consume" some data that it has optimistically pulled out of the source, so that the stream can be passed on to some other party.
 * @function external:Readable#unshift
 * @param {(Buffer|string)} chunk Chunk of data to unshift onto the read queue.
 * @return {null}
 */

/**
 * Versions of Node prior to v0.10 had streams that did not implement the entire Streams API as it is today. (See "Compatibility" below for more information.)
 * @function external:Readable#wrap
 * @param {Stream} stream An "old style" readable stream.
 * @return {null}
 */

Cursor.INIT = 0;
Cursor.OPEN = 1;
Cursor.CLOSED = 2;
Cursor.GET_MORE = 3;

module.exports = Cursor;


/***/ }),
/* 8 */
/***/ (function(module, exports) {

module.exports = require("events");

/***/ }),
/* 9 */
/***/ (function(module, exports) {

module.exports = require("depd");

/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module dependencies.
 * @api private
 */

var Buffer = __webpack_require__(46).Buffer
var contentDisposition = __webpack_require__(47);
var contentType = __webpack_require__(17);
var deprecate = __webpack_require__(9)('express');
var flatten = __webpack_require__(19);
var mime = __webpack_require__(48).mime;
var etag = __webpack_require__(75);
var proxyaddr = __webpack_require__(49);
var qs = __webpack_require__(26);
var querystring = __webpack_require__(40);

/**
 * Return strong ETag for `body`.
 *
 * @param {String|Buffer} body
 * @param {String} [encoding]
 * @return {String}
 * @api private
 */

exports.etag = createETagGenerator({ weak: false })

/**
 * Return weak ETag for `body`.
 *
 * @param {String|Buffer} body
 * @param {String} [encoding]
 * @return {String}
 * @api private
 */

exports.wetag = createETagGenerator({ weak: true })

/**
 * Check if `path` looks absolute.
 *
 * @param {String} path
 * @return {Boolean}
 * @api private
 */

exports.isAbsolute = function(path){
  if ('/' === path[0]) return true;
  if (':' === path[1] && ('\\' === path[2] || '/' === path[2])) return true; // Windows device path
  if ('\\\\' === path.substring(0, 2)) return true; // Microsoft Azure absolute path
};

/**
 * Flatten the given `arr`.
 *
 * @param {Array} arr
 * @return {Array}
 * @api private
 */

exports.flatten = deprecate.function(flatten,
  'utils.flatten: use array-flatten npm module instead');

/**
 * Normalize the given `type`, for example "html" becomes "text/html".
 *
 * @param {String} type
 * @return {Object}
 * @api private
 */

exports.normalizeType = function(type){
  return ~type.indexOf('/')
    ? acceptParams(type)
    : { value: mime.lookup(type), params: {} };
};

/**
 * Normalize `types`, for example "html" becomes "text/html".
 *
 * @param {Array} types
 * @return {Array}
 * @api private
 */

exports.normalizeTypes = function(types){
  var ret = [];

  for (var i = 0; i < types.length; ++i) {
    ret.push(exports.normalizeType(types[i]));
  }

  return ret;
};

/**
 * Generate Content-Disposition header appropriate for the filename.
 * non-ascii filenames are urlencoded and a filename* parameter is added
 *
 * @param {String} filename
 * @return {String}
 * @api private
 */

exports.contentDisposition = deprecate.function(contentDisposition,
  'utils.contentDisposition: use content-disposition npm module instead');

/**
 * Parse accept params `str` returning an
 * object with `.value`, `.quality` and `.params`.
 * also includes `.originalIndex` for stable sorting
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function acceptParams(str, index) {
  var parts = str.split(/ *; */);
  var ret = { value: parts[0], quality: 1, params: {}, originalIndex: index };

  for (var i = 1; i < parts.length; ++i) {
    var pms = parts[i].split(/ *= */);
    if ('q' === pms[0]) {
      ret.quality = parseFloat(pms[1]);
    } else {
      ret.params[pms[0]] = pms[1];
    }
  }

  return ret;
}

/**
 * Compile "etag" value to function.
 *
 * @param  {Boolean|String|Function} val
 * @return {Function}
 * @api private
 */

exports.compileETag = function(val) {
  var fn;

  if (typeof val === 'function') {
    return val;
  }

  switch (val) {
    case true:
      fn = exports.wetag;
      break;
    case false:
      break;
    case 'strong':
      fn = exports.etag;
      break;
    case 'weak':
      fn = exports.wetag;
      break;
    default:
      throw new TypeError('unknown value for etag function: ' + val);
  }

  return fn;
}

/**
 * Compile "query parser" value to function.
 *
 * @param  {String|Function} val
 * @return {Function}
 * @api private
 */

exports.compileQueryParser = function compileQueryParser(val) {
  var fn;

  if (typeof val === 'function') {
    return val;
  }

  switch (val) {
    case true:
      fn = querystring.parse;
      break;
    case false:
      fn = newObject;
      break;
    case 'extended':
      fn = parseExtendedQueryString;
      break;
    case 'simple':
      fn = querystring.parse;
      break;
    default:
      throw new TypeError('unknown value for query parser function: ' + val);
  }

  return fn;
}

/**
 * Compile "proxy trust" value to function.
 *
 * @param  {Boolean|String|Number|Array|Function} val
 * @return {Function}
 * @api private
 */

exports.compileTrust = function(val) {
  if (typeof val === 'function') return val;

  if (val === true) {
    // Support plain true/false
    return function(){ return true };
  }

  if (typeof val === 'number') {
    // Support trusting hop count
    return function(a, i){ return i < val };
  }

  if (typeof val === 'string') {
    // Support comma-separated values
    val = val.split(/ *, */);
  }

  return proxyaddr.compile(val || []);
}

/**
 * Set the charset in a given Content-Type string.
 *
 * @param {String} type
 * @param {String} charset
 * @return {String}
 * @api private
 */

exports.setCharset = function setCharset(type, charset) {
  if (!type || !charset) {
    return type;
  }

  // parse type
  var parsed = contentType.parse(type);

  // set charset
  parsed.parameters.charset = charset;

  // format type
  return contentType.format(parsed);
};

/**
 * Create an ETag generator function, generating ETags with
 * the given options.
 *
 * @param {object} options
 * @return {function}
 * @private
 */

function createETagGenerator (options) {
  return function generateETag (body, encoding) {
    var buf = !Buffer.isBuffer(body)
      ? Buffer.from(body, encoding)
      : body

    return etag(buf, options)
  }
}

/**
 * Parse an extended query string with qs.
 *
 * @return {Object}
 * @private
 */

function parseExtendedQueryString(str) {
  return qs.parse(str, {
    allowPrototypes: true
  });
}

/**
 * Return new empty object.
 *
 * @return {Object}
 * @api private
 */

function newObject() {
  return {};
}


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var inherits = __webpack_require__(2).inherits
  , ReadPreference = __webpack_require__(5)
  , MongoError = __webpack_require__(1).MongoError
  , Readable = __webpack_require__(13).Readable || __webpack_require__(22).Readable
  , Define = __webpack_require__(4)
  , CoreCursor = __webpack_require__(7)
  , CoreReadPreference = __webpack_require__(1).ReadPreference;

/**
 * @fileOverview The **CommandCursor** class is an internal class that embodies a
 * generalized cursor based on a MongoDB command allowing for iteration over the
 * results returned. It supports one by one document iteration, conversion to an
 * array or can be iterated as a Node 0.10.X or higher stream
 *
 * **CommandCursor Cannot directly be instantiated**
 * @example
 * var MongoClient = require('mongodb').MongoClient,
 *   test = require('assert');
 * // Connection url
 * var url = 'mongodb://localhost:27017/test';
 * // Connect using MongoClient
 * MongoClient.connect(url, function(err, db) {
 *   // Create a collection we want to drop later
 *   var col = db.collection('listCollectionsExample1');
 *   // Insert a bunch of documents
 *   col.insert([{a:1, b:1}
 *     , {a:2, b:2}, {a:3, b:3}
 *     , {a:4, b:4}], {w:1}, function(err, result) {
 *     test.equal(null, err);
 *
 *     // List the database collections available
 *     db.listCollections().toArray(function(err, items) {
 *       test.equal(null, err);
 *       db.close();
 *     });
 *   });
 * });
 */

/**
 * Namespace provided by the browser.
 * @external Readable
 */

/**
 * Creates a new Command Cursor instance (INTERNAL TYPE, do not instantiate directly)
 * @class CommandCursor
 * @extends external:Readable
 * @fires CommandCursor#data
 * @fires CommandCursor#end
 * @fires CommandCursor#close
 * @fires CommandCursor#readable
 * @return {CommandCursor} an CommandCursor instance.
 */
var CommandCursor = function(bson, ns, cmd, options, topology, topologyOptions) {
  CoreCursor.apply(this, Array.prototype.slice.call(arguments, 0));
  var state = CommandCursor.INIT;
  var streamOptions = {};

  // MaxTimeMS
  var maxTimeMS = null;

  // Get the promiseLibrary
  var promiseLibrary = options.promiseLibrary;

  // No promise library selected fall back
  if(!promiseLibrary) {
    promiseLibrary = typeof global.Promise == 'function' ?
      global.Promise : __webpack_require__(3).Promise;
  }

  // Set up
  Readable.call(this, {objectMode: true});

  // Internal state
  this.s = {
    // MaxTimeMS
      maxTimeMS: maxTimeMS
    // State
    , state: state
    // Stream options
    , streamOptions: streamOptions
    // BSON
    , bson: bson
    // Namespace
    , ns: ns
    // Command
    , cmd: cmd
    // Options
    , options: options
    // Topology
    , topology: topology
    // Topology Options
    , topologyOptions: topologyOptions
    // Promise library
    , promiseLibrary: promiseLibrary
  }
}

/**
 * CommandCursor stream data event, fired for each document in the cursor.
 *
 * @event CommandCursor#data
 * @type {object}
 */

/**
 * CommandCursor stream end event
 *
 * @event CommandCursor#end
 * @type {null}
 */

/**
 * CommandCursor stream close event
 *
 * @event CommandCursor#close
 * @type {null}
 */

/**
 * CommandCursor stream readable event
 *
 * @event CommandCursor#readable
 * @type {null}
 */

// Inherit from Readable
inherits(CommandCursor, Readable);

// Set the methods to inherit from prototype
var methodsToInherit = ['_next', 'next', 'hasNext', 'each', 'forEach', 'toArray'
  , 'rewind', 'bufferedCount', 'readBufferedDocuments', 'close', 'isClosed', 'kill', 'setCursorBatchSize'
  , '_find', '_getmore', '_killcursor', 'isDead', 'explain', 'isNotified', 'isKilled'];

// Only inherit the types we need
for(var i = 0; i < methodsToInherit.length; i++) {
  CommandCursor.prototype[methodsToInherit[i]] = CoreCursor.prototype[methodsToInherit[i]];
}

var define = CommandCursor.define = new Define('CommandCursor', CommandCursor, true);

/**
 * Set the ReadPreference for the cursor.
 * @method
 * @param {(string|ReadPreference)} readPreference The new read preference for the cursor.
 * @throws {MongoError}
 * @return {Cursor}
 */
CommandCursor.prototype.setReadPreference = function(r) {
  if(this.s.state == CommandCursor.CLOSED || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true});
  if(this.s.state != CommandCursor.INIT) throw MongoError.create({message: 'cannot change cursor readPreference after cursor has been accessed', driver:true});

  if(r instanceof ReadPreference) {
    this.s.options.readPreference = new CoreReadPreference(r.mode, r.tags, {maxStalenessSeconds: r.maxStalenessSeconds});
  } else if(typeof r == 'string') {
    this.s.options.readPreference = new CoreReadPreference(r);
  } else if(r instanceof CoreReadPreference) {
    this.s.options.readPreference = r;
  }

  return this;
}

define.classMethod('setReadPreference', {callback: false, promise:false, returns: [CommandCursor]});

/**
 * Set the batch size for the cursor.
 * @method
 * @param {number} value The batchSize for the cursor.
 * @throws {MongoError}
 * @return {CommandCursor}
 */
CommandCursor.prototype.batchSize = function(value) {
  if(this.s.state == CommandCursor.CLOSED || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true});
  if(typeof value != 'number') throw MongoError.create({message: "batchSize requires an integer", driver:true});
  if(this.s.cmd.cursor) this.s.cmd.cursor.batchSize = value;
  this.setCursorBatchSize(value);
  return this;
}

define.classMethod('batchSize', {callback: false, promise:false, returns: [CommandCursor]});

/**
 * Add a maxTimeMS stage to the aggregation pipeline
 * @method
 * @param {number} value The state maxTimeMS value.
 * @return {CommandCursor}
 */
CommandCursor.prototype.maxTimeMS = function(value) {
  if(this.s.topology.lastIsMaster().minWireVersion > 2) {
    this.s.cmd.maxTimeMS = value;
  }
  return this;
}

define.classMethod('maxTimeMS', {callback: false, promise:false, returns: [CommandCursor]});

CommandCursor.prototype.get = CommandCursor.prototype.toArray;

define.classMethod('get', {callback: true, promise:false});

// Inherited methods
define.classMethod('toArray', {callback: true, promise:true});
define.classMethod('each', {callback: true, promise:false});
define.classMethod('forEach', {callback: true, promise:false});
define.classMethod('next', {callback: true, promise:true});
define.classMethod('hasNext', {callback: true, promise:true});
define.classMethod('close', {callback: true, promise:true});
define.classMethod('isClosed', {callback: false, promise:false, returns: [Boolean]});
define.classMethod('rewind', {callback: false, promise:false});
define.classMethod('bufferedCount', {callback: false, promise:false, returns: [Number]});
define.classMethod('readBufferedDocuments', {callback: false, promise:false, returns: [Array]});

/**
 * Get the next available document from the cursor, returns null if no more documents are available.
 * @function CommandCursor.prototype.next
 * @param {CommandCursor~resultCallback} [callback] The result callback.
 * @throws {MongoError}
 * @return {Promise} returns Promise if no callback passed
 */

/**
 * Check if there is any document still available in the cursor
 * @function CommandCursor.prototype.hasNext
 * @param {CommandCursor~resultCallback} [callback] The result callback.
 * @throws {MongoError}
 * @return {Promise} returns Promise if no callback passed
 */

/**
 * The callback format for results
 * @callback CommandCursor~toArrayResultCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {object[]} documents All the documents the satisfy the cursor.
 */

/**
 * Returns an array of documents. The caller is responsible for making sure that there
 * is enough memory to store the results. Note that the array only contain partial
 * results when this cursor had been previously accessed.
 * @method CommandCursor.prototype.toArray
 * @param {CommandCursor~toArrayResultCallback} [callback] The result callback.
 * @throws {MongoError}
 * @return {Promise} returns Promise if no callback passed
 */

/**
 * The callback format for results
 * @callback CommandCursor~resultCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {(object|null)} result The result object if the command was executed successfully.
 */

/**
 * Iterates over all the documents for this cursor. As with **{cursor.toArray}**,
 * not all of the elements will be iterated if this cursor had been previously accessed.
 * In that case, **{cursor.rewind}** can be used to reset the cursor. However, unlike
 * **{cursor.toArray}**, the cursor will only hold a maximum of batch size elements
 * at any given time if batch size is specified. Otherwise, the caller is responsible
 * for making sure that the entire result can fit the memory.
 * @method CommandCursor.prototype.each
 * @param {CommandCursor~resultCallback} callback The result callback.
 * @throws {MongoError}
 * @return {null}
 */

/**
 * Close the cursor, sending a KillCursor command and emitting close.
 * @method CommandCursor.prototype.close
 * @param {CommandCursor~resultCallback} [callback] The result callback.
 * @return {Promise} returns Promise if no callback passed
 */

/**
 * Is the cursor closed
 * @method CommandCursor.prototype.isClosed
 * @return {boolean}
 */

/**
 * Clone the cursor
 * @function CommandCursor.prototype.clone
 * @return {CommandCursor}
 */

/**
 * Resets the cursor
 * @function CommandCursor.prototype.rewind
 * @return {CommandCursor}
 */

/**
 * The callback format for the forEach iterator method
 * @callback CommandCursor~iteratorCallback
 * @param {Object} doc An emitted document for the iterator
 */

/**
 * The callback error format for the forEach iterator method
 * @callback CommandCursor~endCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 */

/*
 * Iterates over all the documents for this cursor using the iterator, callback pattern.
 * @method CommandCursor.prototype.forEach
 * @param {CommandCursor~iteratorCallback} iterator The iteration callback.
 * @param {CommandCursor~endCallback} callback The end callback.
 * @throws {MongoError}
 * @return {null}
 */

CommandCursor.INIT = 0;
CommandCursor.OPEN = 1;
CommandCursor.CLOSED = 2;

module.exports = CommandCursor;


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var inherits = __webpack_require__(2).inherits
  , MongoError = __webpack_require__(1).MongoError
  , Readable = __webpack_require__(13).Readable || __webpack_require__(22).Readable
  , Define = __webpack_require__(4)
  , CoreCursor = __webpack_require__(7);

/**
 * @fileOverview The **AggregationCursor** class is an internal class that embodies an aggregation cursor on MongoDB
 * allowing for iteration over the results returned from the underlying query. It supports
 * one by one document iteration, conversion to an array or can be iterated as a Node 0.10.X
 * or higher stream
 *
 * **AGGREGATIONCURSOR Cannot directly be instantiated**
 * @example
 * var MongoClient = require('mongodb').MongoClient,
 *   test = require('assert');
 * // Connection url
 * var url = 'mongodb://localhost:27017/test';
 * // Connect using MongoClient
 * MongoClient.connect(url, function(err, db) {
 *   // Create a collection we want to drop later
 *   var col = db.collection('createIndexExample1');
 *   // Insert a bunch of documents
 *   col.insert([{a:1, b:1}
 *     , {a:2, b:2}, {a:3, b:3}
 *     , {a:4, b:4}], {w:1}, function(err, result) {
 *     test.equal(null, err);
 *     // Show that duplicate records got dropped
 *     col.aggregation({}, {cursor: {}}).toArray(function(err, items) {
 *       test.equal(null, err);
 *       test.equal(4, items.length);
 *       db.close();
 *     });
 *   });
 * });
 */

/**
 * Namespace provided by the browser.
 * @external Readable
 */

/**
 * Creates a new Aggregation Cursor instance (INTERNAL TYPE, do not instantiate directly)
 * @class AggregationCursor
 * @extends external:Readable
 * @fires AggregationCursor#data
 * @fires AggregationCursor#end
 * @fires AggregationCursor#close
 * @fires AggregationCursor#readable
 * @return {AggregationCursor} an AggregationCursor instance.
 */
var AggregationCursor = function(bson, ns, cmd, options, topology, topologyOptions) {
  CoreCursor.apply(this, Array.prototype.slice.call(arguments, 0));
  var state = AggregationCursor.INIT;
  var streamOptions = {};

  // MaxTimeMS
  var maxTimeMS = null;

  // Get the promiseLibrary
  var promiseLibrary = options.promiseLibrary;

  // No promise library selected fall back
  if(!promiseLibrary) {
    promiseLibrary = typeof global.Promise == 'function' ?
      global.Promise : __webpack_require__(3).Promise;
  }

  // Set up
  Readable.call(this, {objectMode: true});

  // Internal state
  this.s = {
    // MaxTimeMS
      maxTimeMS: maxTimeMS
    // State
    , state: state
    // Stream options
    , streamOptions: streamOptions
    // BSON
    , bson: bson
    // Namespace
    , ns: ns
    // Command
    , cmd: cmd
    // Options
    , options: options
    // Topology
    , topology: topology
    // Topology Options
    , topologyOptions: topologyOptions
    // Promise library
    , promiseLibrary: promiseLibrary
  }
}

/**
 * AggregationCursor stream data event, fired for each document in the cursor.
 *
 * @event AggregationCursor#data
 * @type {object}
 */

/**
 * AggregationCursor stream end event
 *
 * @event AggregationCursor#end
 * @type {null}
 */

/**
 * AggregationCursor stream close event
 *
 * @event AggregationCursor#close
 * @type {null}
 */

/**
 * AggregationCursor stream readable event
 *
 * @event AggregationCursor#readable
 * @type {null}
 */

// Inherit from Readable
inherits(AggregationCursor, Readable);

// Extend the Cursor
for(var name in CoreCursor.prototype) {
  AggregationCursor.prototype[name] = CoreCursor.prototype[name];
}

var define = AggregationCursor.define = new Define('AggregationCursor', AggregationCursor, true);

/**
 * Set the batch size for the cursor.
 * @method
 * @param {number} value The batchSize for the cursor.
 * @throws {MongoError}
 * @return {AggregationCursor}
 */
AggregationCursor.prototype.batchSize = function(value) {
  if(this.s.state == AggregationCursor.CLOSED || this.isDead()) throw MongoError.create({message: "Cursor is closed", driver:true });
  if(typeof value != 'number') throw MongoError.create({message: "batchSize requires an integer", driver:true });
  if(this.s.cmd.cursor) this.s.cmd.cursor.batchSize = value;
  this.setCursorBatchSize(value);
  return this;
}

define.classMethod('batchSize', {callback: false, promise:false, returns: [AggregationCursor]});

/**
 * Add a geoNear stage to the aggregation pipeline
 * @method
 * @param {object} document The geoNear stage document.
 * @return {AggregationCursor}
 */
AggregationCursor.prototype.geoNear = function(document) {
  this.s.cmd.pipeline.push({$geoNear: document});
  return this;
}

define.classMethod('geoNear', {callback: false, promise:false, returns: [AggregationCursor]});

/**
 * Add a group stage to the aggregation pipeline
 * @method
 * @param {object} document The group stage document.
 * @return {AggregationCursor}
 */
AggregationCursor.prototype.group = function(document) {
  this.s.cmd.pipeline.push({$group: document});
  return this;
}

define.classMethod('group', {callback: false, promise:false, returns: [AggregationCursor]});

/**
 * Add a limit stage to the aggregation pipeline
 * @method
 * @param {number} value The state limit value.
 * @return {AggregationCursor}
 */
AggregationCursor.prototype.limit = function(value) {
  this.s.cmd.pipeline.push({$limit: value});
  return this;
}

define.classMethod('limit', {callback: false, promise:false, returns: [AggregationCursor]});

/**
 * Add a match stage to the aggregation pipeline
 * @method
 * @param {object} document The match stage document.
 * @return {AggregationCursor}
 */
AggregationCursor.prototype.match = function(document) {
  this.s.cmd.pipeline.push({$match: document});
  return this;
}

define.classMethod('match', {callback: false, promise:false, returns: [AggregationCursor]});

/**
 * Add a maxTimeMS stage to the aggregation pipeline
 * @method
 * @param {number} value The state maxTimeMS value.
 * @return {AggregationCursor}
 */
AggregationCursor.prototype.maxTimeMS = function(value) {
  if(this.s.topology.lastIsMaster().minWireVersion > 2) {
    this.s.cmd.maxTimeMS = value;
  }
  return this;
}

define.classMethod('maxTimeMS', {callback: false, promise:false, returns: [AggregationCursor]});

/**
 * Add a out stage to the aggregation pipeline
 * @method
 * @param {number} destination The destination name.
 * @return {AggregationCursor}
 */
AggregationCursor.prototype.out = function(destination) {
  this.s.cmd.pipeline.push({$out: destination});
  return this;
}

define.classMethod('out', {callback: false, promise:false, returns: [AggregationCursor]});

/**
 * Add a project stage to the aggregation pipeline
 * @method
 * @param {object} document The project stage document.
 * @return {AggregationCursor}
 */
AggregationCursor.prototype.project = function(document) {
  this.s.cmd.pipeline.push({$project: document});
  return this;
}

define.classMethod('project', {callback: false, promise:false, returns: [AggregationCursor]});

/**
 * Add a lookup stage to the aggregation pipeline
 * @method
 * @param {object} document The lookup stage document.
 * @return {AggregationCursor}
 */
AggregationCursor.prototype.lookup = function(document) {
  this.s.cmd.pipeline.push({$lookup: document});
  return this;
}

define.classMethod('lookup', {callback: false, promise:false, returns: [AggregationCursor]});

/**
 * Add a redact stage to the aggregation pipeline
 * @method
 * @param {object} document The redact stage document.
 * @return {AggregationCursor}
 */
AggregationCursor.prototype.redact = function(document) {
  this.s.cmd.pipeline.push({$redact: document});
  return this;
}

define.classMethod('redact', {callback: false, promise:false, returns: [AggregationCursor]});

/**
 * Add a skip stage to the aggregation pipeline
 * @method
 * @param {number} value The state skip value.
 * @return {AggregationCursor}
 */
AggregationCursor.prototype.skip = function(value) {
  this.s.cmd.pipeline.push({$skip: value});
  return this;
}

define.classMethod('skip', {callback: false, promise:false, returns: [AggregationCursor]});

/**
 * Add a sort stage to the aggregation pipeline
 * @method
 * @param {object} document The sort stage document.
 * @return {AggregationCursor}
 */
AggregationCursor.prototype.sort = function(document) {
  this.s.cmd.pipeline.push({$sort: document});
  return this;
}

define.classMethod('sort', {callback: false, promise:false, returns: [AggregationCursor]});

/**
 * Add a unwind stage to the aggregation pipeline
 * @method
 * @param {number} field The unwind field name.
 * @return {AggregationCursor}
 */
AggregationCursor.prototype.unwind = function(field) {
  this.s.cmd.pipeline.push({$unwind: field});
  return this;
}

define.classMethod('unwind', {callback: false, promise:false, returns: [AggregationCursor]});

AggregationCursor.prototype.get = AggregationCursor.prototype.toArray;

// Inherited methods
define.classMethod('toArray', {callback: true, promise:true});
define.classMethod('each', {callback: true, promise:false});
define.classMethod('forEach', {callback: true, promise:false});
define.classMethod('hasNext', {callback: true, promise:true});
define.classMethod('next', {callback: true, promise:true});
define.classMethod('close', {callback: true, promise:true});
define.classMethod('isClosed', {callback: false, promise:false, returns: [Boolean]});
define.classMethod('rewind', {callback: false, promise:false});
define.classMethod('bufferedCount', {callback: false, promise:false, returns: [Number]});
define.classMethod('readBufferedDocuments', {callback: false, promise:false, returns: [Array]});

/**
 * Get the next available document from the cursor, returns null if no more documents are available.
 * @function AggregationCursor.prototype.next
 * @param {AggregationCursor~resultCallback} [callback] The result callback.
 * @throws {MongoError}
 * @return {Promise} returns Promise if no callback passed
 */

/**
 * Check if there is any document still available in the cursor
 * @function AggregationCursor.prototype.hasNext
 * @param {AggregationCursor~resultCallback} [callback] The result callback.
 * @throws {MongoError}
 * @return {Promise} returns Promise if no callback passed
 */

/**
 * The callback format for results
 * @callback AggregationCursor~toArrayResultCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {object[]} documents All the documents the satisfy the cursor.
 */

/**
 * Returns an array of documents. The caller is responsible for making sure that there
 * is enough memory to store the results. Note that the array only contain partial
 * results when this cursor had been previously accessed. In that case,
 * cursor.rewind() can be used to reset the cursor.
 * @method AggregationCursor.prototype.toArray
 * @param {AggregationCursor~toArrayResultCallback} [callback] The result callback.
 * @throws {MongoError}
 * @return {Promise} returns Promise if no callback passed
 */

/**
 * The callback format for results
 * @callback AggregationCursor~resultCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {(object|null)} result The result object if the command was executed successfully.
 */

/**
 * Iterates over all the documents for this cursor. As with **{cursor.toArray}**,
 * not all of the elements will be iterated if this cursor had been previously accessed.
 * In that case, **{cursor.rewind}** can be used to reset the cursor. However, unlike
 * **{cursor.toArray}**, the cursor will only hold a maximum of batch size elements
 * at any given time if batch size is specified. Otherwise, the caller is responsible
 * for making sure that the entire result can fit the memory.
 * @method AggregationCursor.prototype.each
 * @param {AggregationCursor~resultCallback} callback The result callback.
 * @throws {MongoError}
 * @return {null}
 */

/**
 * Close the cursor, sending a AggregationCursor command and emitting close.
 * @method AggregationCursor.prototype.close
 * @param {AggregationCursor~resultCallback} [callback] The result callback.
 * @return {Promise} returns Promise if no callback passed
 */

/**
 * Is the cursor closed
 * @method AggregationCursor.prototype.isClosed
 * @return {boolean}
 */

/**
 * Execute the explain for the cursor
 * @method AggregationCursor.prototype.explain
 * @param {AggregationCursor~resultCallback} [callback] The result callback.
 * @return {Promise} returns Promise if no callback passed
 */

/**
 * Clone the cursor
 * @function AggregationCursor.prototype.clone
 * @return {AggregationCursor}
 */

/**
 * Resets the cursor
 * @function AggregationCursor.prototype.rewind
 * @return {AggregationCursor}
 */

/**
 * The callback format for the forEach iterator method
 * @callback AggregationCursor~iteratorCallback
 * @param {Object} doc An emitted document for the iterator
 */

/**
 * The callback error format for the forEach iterator method
 * @callback AggregationCursor~endCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 */

/*
 * Iterates over all the documents for this cursor using the iterator, callback pattern.
 * @method AggregationCursor.prototype.forEach
 * @param {AggregationCursor~iteratorCallback} iterator The iteration callback.
 * @param {AggregationCursor~endCallback} callback The end callback.
 * @throws {MongoError}
 * @return {null}
 */

AggregationCursor.INIT = 0;
AggregationCursor.OPEN = 1;
AggregationCursor.CLOSED = 2;

module.exports = AggregationCursor;


/***/ }),
/* 13 */
/***/ (function(module, exports) {

module.exports = require("stream");

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var MongoError = __webpack_require__(1).MongoError
  , f = __webpack_require__(2).format;

// The store of ops
var Store = function(topology, storeOptions) {
  var self = this;
  var storedOps = [];
  storeOptions = storeOptions || {force:false, bufferMaxEntries: -1}

  // Internal state
  this.s = {
      storedOps: storedOps
    , storeOptions: storeOptions
    , topology: topology
  }

  Object.defineProperty(this, 'length', {
    enumerable:true, get: function() { return self.s.storedOps.length; }
  });
}

Store.prototype.add = function(opType, ns, ops, options, callback) {
  if(this.s.storeOptions.force) {
    return callback(MongoError.create({message: "db closed by application", driver:true}));
  }

  if(this.s.storeOptions.bufferMaxEntries == 0) {
    return callback(MongoError.create({message: f("no connection available for operation and number of stored operation > %s", this.s.storeOptions.bufferMaxEntries), driver:true }));
  }

  if(this.s.storeOptions.bufferMaxEntries > 0 && this.s.storedOps.length > this.s.storeOptions.bufferMaxEntries) {
    while(this.s.storedOps.length > 0) {
      var op = this.s.storedOps.shift();
      op.c(MongoError.create({message: f("no connection available for operation and number of stored operation > %s", this.s.storeOptions.bufferMaxEntries), driver:true }));
    }

    return;
  }

  this.s.storedOps.push({t: opType, n: ns, o: ops, op: options, c: callback})
}

Store.prototype.addObjectAndMethod = function(opType, object, method, params, callback) {
  if(this.s.storeOptions.force) {
    return callback(MongoError.create({message: "db closed by application", driver:true }));
  }

  if(this.s.storeOptions.bufferMaxEntries == 0) {
    return callback(MongoError.create({message: f("no connection available for operation and number of stored operation > %s", this.s.storeOptions.bufferMaxEntries), driver:true }));
  }

  if(this.s.storeOptions.bufferMaxEntries > 0 && this.s.storedOps.length > this.s.storeOptions.bufferMaxEntries) {
    while(this.s.storedOps.length > 0) {
      var op = this.s.storedOps.shift();
      op.c(MongoError.create({message: f("no connection available for operation and number of stored operation > %s", this.s.storeOptions.bufferMaxEntries), driver:true }));
    }

    return;
  }

  this.s.storedOps.push({t: opType, m: method, o: object, p: params, c: callback})
}

Store.prototype.flush = function(err) {
  while(this.s.storedOps.length > 0) {
    this.s.storedOps.shift().c(err || MongoError.create({message: f("no connection available for operation"), driver:true }));
  }
}

var primaryOptions = ['primary', 'primaryPreferred', 'nearest', 'secondaryPreferred'];
var secondaryOptions = ['secondary', 'secondaryPreferred'];

Store.prototype.execute = function(options) {
  options = options || {};
  // Get current ops
  var ops = this.s.storedOps;
  // Reset the ops
  this.s.storedOps = [];

  // Unpack options
  var executePrimary = typeof options.executePrimary === 'boolean'
    ? options.executePrimary : true;
  var executeSecondary = typeof options.executeSecondary === 'boolean'
    ? options.executeSecondary : true;

  // Execute all the stored ops
  while(ops.length > 0) {
    var op = ops.shift();

    if(op.t == 'cursor') {
      if(executePrimary && executeSecondary) {
        op.o[op.m].apply(op.o, op.p);
      } else if(executePrimary && op.o.options
        && op.o.options.readPreference
        && primaryOptions.indexOf(op.o.options.readPreference.mode) != -1) {
          op.o[op.m].apply(op.o, op.p);
      } else if(!executePrimary && executeSecondary && op.o.options
        && op.o.options.readPreference
        && secondaryOptions.indexOf(op.o.options.readPreference.mode) != -1) {
          op.o[op.m].apply(op.o, op.p);
      }
    } else if(op.t == 'auth') {
      this.s.topology[op.t].apply(this.s.topology, op.o);
    } else {
      if(executePrimary && executeSecondary) {
        this.s.topology[op.t](op.n, op.o, op.op, op.c);
      } else if(executePrimary && op.op && op.op.readPreference
        && primaryOptions.indexOf(op.op.readPreference.mode) != -1) {
          this.s.topology[op.t](op.n, op.o, op.op, op.c);
      } else if(!executePrimary && executeSecondary && op.op && op.op.readPreference
        && secondaryOptions.indexOf(op.op.readPreference.mode) != -1) {
          this.s.topology[op.t](op.n, op.o, op.op, op.c);
      }
    }
  }
}

Store.prototype.all = function() {
  return this.s.storedOps;
}

// Server capabilities
var ServerCapabilities = function(ismaster) {
  var setup_get_property = function(object, name, value) {
    Object.defineProperty(object, name, {
        enumerable: true
      , get: function () { return value; }
    });
  }

  // Capabilities
  var aggregationCursor = false;
  var writeCommands = false;
  var textSearch = false;
  var authCommands = false;
  var listCollections = false;
  var listIndexes = false;
  var maxNumberOfDocsInBatch = ismaster.maxWriteBatchSize || 1000;
  var commandsTakeWriteConcern = false;
  var commandsTakeCollation = false;

  if(ismaster.minWireVersion >= 0) {
    textSearch = true;
  }

  if(ismaster.maxWireVersion >= 1) {
    aggregationCursor = true;
    authCommands = true;
  }

  if(ismaster.maxWireVersion >= 2) {
    writeCommands = true;
  }

  if(ismaster.maxWireVersion >= 3) {
    listCollections = true;
    listIndexes = true;
  }

  if(ismaster.maxWireVersion >= 5) {
    commandsTakeWriteConcern = true;
    commandsTakeCollation = true;
  }

  // If no min or max wire version set to 0
  if(ismaster.minWireVersion == null) {
    ismaster.minWireVersion = 0;
  }

  if(ismaster.maxWireVersion == null) {
    ismaster.maxWireVersion = 0;
  }

  // Map up read only parameters
  setup_get_property(this, "hasAggregationCursor", aggregationCursor);
  setup_get_property(this, "hasWriteCommands", writeCommands);
  setup_get_property(this, "hasTextSearch", textSearch);
  setup_get_property(this, "hasAuthCommands", authCommands);
  setup_get_property(this, "hasListCollectionsCommand", listCollections);
  setup_get_property(this, "hasListIndexesCommand", listIndexes);
  setup_get_property(this, "minWireVersion", ismaster.minWireVersion);
  setup_get_property(this, "maxWireVersion", ismaster.maxWireVersion);
  setup_get_property(this, "maxNumberOfDocsInBatch", maxNumberOfDocsInBatch);
  setup_get_property(this, "commandsTakeWriteConcern", commandsTakeWriteConcern);
  setup_get_property(this, "commandsTakeCollation", commandsTakeCollation);
}

exports.Store = Store;
exports.ServerCapabilities = ServerCapabilities;


/***/ }),
/* 15 */
/***/ (function(module, exports) {

module.exports = require("type-is");

/***/ }),
/* 16 */
/***/ (function(module, exports) {

module.exports = require("bytes");

/***/ }),
/* 17 */
/***/ (function(module, exports) {

module.exports = require("content-type");

/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * body-parser
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module dependencies.
 * @private
 */

var createError = __webpack_require__(25)
var getBody = __webpack_require__(62)
var iconv = __webpack_require__(63)
var onFinished = __webpack_require__(39)
var zlib = __webpack_require__(64)

/**
 * Module exports.
 */

module.exports = read

/**
 * Read a request into a buffer and parse.
 *
 * @param {object} req
 * @param {object} res
 * @param {function} next
 * @param {function} parse
 * @param {function} debug
 * @param {object} options
 * @private
 */

function read (req, res, next, parse, debug, options) {
  var length
  var opts = options
  var stream

  // flag as parsed
  req._body = true

  // read options
  var encoding = opts.encoding !== null
    ? opts.encoding
    : null
  var verify = opts.verify

  try {
    // get the content stream
    stream = contentstream(req, debug, opts.inflate)
    length = stream.length
    stream.length = undefined
  } catch (err) {
    return next(err)
  }

  // set raw-body options
  opts.length = length
  opts.encoding = verify
    ? null
    : encoding

  // assert charset is supported
  if (opts.encoding === null && encoding !== null && !iconv.encodingExists(encoding)) {
    return next(createError(415, 'unsupported charset "' + encoding.toUpperCase() + '"', {
      charset: encoding.toLowerCase(),
      type: 'charset.unsupported'
    }))
  }

  // read body
  debug('read body')
  getBody(stream, opts, function (error, body) {
    if (error) {
      var _error

      if (error.type === 'encoding.unsupported') {
        // echo back charset
        _error = createError(415, 'unsupported charset "' + encoding.toUpperCase() + '"', {
          charset: encoding.toLowerCase(),
          type: 'charset.unsupported'
        })
      } else {
        // set status code on error
        _error = createError(400, error)
      }

      // read off entire request
      stream.resume()
      onFinished(req, function onfinished () {
        next(createError(400, _error))
      })
      return
    }

    // verify
    if (verify) {
      try {
        debug('verify body')
        verify(req, res, body, encoding)
      } catch (err) {
        next(createError(403, err, {
          body: body,
          type: err.type || 'entity.verify.failed'
        }))
        return
      }
    }

    // parse
    var str = body
    try {
      debug('parse body')
      str = typeof body !== 'string' && encoding !== null
        ? iconv.decode(body, encoding)
        : body
      req.body = parse(str)
    } catch (err) {
      next(createError(400, err, {
        body: str,
        type: err.type || 'entity.parse.failed'
      }))
      return
    }

    next()
  })
}

/**
 * Get the content stream of the request.
 *
 * @param {object} req
 * @param {function} debug
 * @param {boolean} [inflate=true]
 * @return {object}
 * @api private
 */

function contentstream (req, debug, inflate) {
  var encoding = (req.headers['content-encoding'] || 'identity').toLowerCase()
  var length = req.headers['content-length']
  var stream

  debug('content-encoding "%s"', encoding)

  if (inflate === false && encoding !== 'identity') {
    throw createError(415, 'content encoding unsupported', {
      encoding: encoding,
      type: 'encoding.unsupported'
    })
  }

  switch (encoding) {
    case 'deflate':
      stream = zlib.createInflate()
      debug('inflate body')
      req.pipe(stream)
      break
    case 'gzip':
      stream = zlib.createGunzip()
      debug('gunzip body')
      req.pipe(stream)
      break
    case 'identity':
      stream = req
      stream.length = length
      break
    default:
      throw createError(415, 'unsupported content encoding "' + encoding + '"', {
        encoding: encoding,
        type: 'encoding.unsupported'
      })
  }

  return stream
}


/***/ }),
/* 19 */
/***/ (function(module, exports) {

module.exports = require("array-flatten");

/***/ }),
/* 20 */
/***/ (function(module, exports) {

module.exports = require("utils-merge");

/***/ }),
/* 21 */
/***/ (function(module, exports) {

module.exports = require("path");

/***/ }),
/* 22 */
/***/ (function(module, exports) {

module.exports = require("readable-stream");

/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var checkCollectionName = __webpack_require__(0).checkCollectionName
  , ObjectID = __webpack_require__(1).BSON.ObjectID
  , Long = __webpack_require__(1).BSON.Long
  , Code = __webpack_require__(1).BSON.Code
  , f = __webpack_require__(2).format
  , AggregationCursor = __webpack_require__(12)
  , MongoError = __webpack_require__(1).MongoError
  , shallowClone = __webpack_require__(0).shallowClone
  , isObject = __webpack_require__(0).isObject
  , toError = __webpack_require__(0).toError
  , normalizeHintField = __webpack_require__(0).normalizeHintField
  , handleCallback = __webpack_require__(0).handleCallback
  , decorateCommand = __webpack_require__(0).decorateCommand
  , formattedOrderClause = __webpack_require__(0).formattedOrderClause
  , ReadPreference = __webpack_require__(5)
  , CoreReadPreference = __webpack_require__(1).ReadPreference
  , CommandCursor = __webpack_require__(11)
  , Define = __webpack_require__(4)
  , Cursor = __webpack_require__(7)
  , unordered = __webpack_require__(33)
  , ordered = __webpack_require__(32)
  , assign = __webpack_require__(0).assign;

/**
 * @fileOverview The **Collection** class is an internal class that embodies a MongoDB collection
 * allowing for insert/update/remove/find and other command operation on that MongoDB collection.
 *
 * **COLLECTION Cannot directly be instantiated**
 * @example
 * var MongoClient = require('mongodb').MongoClient,
 *   test = require('assert');
 * // Connection url
 * var url = 'mongodb://localhost:27017/test';
 * // Connect using MongoClient
 * MongoClient.connect(url, function(err, db) {
 *   // Create a collection we want to drop later
 *   var col = db.collection('createIndexExample1');
 *   // Show that duplicate records got dropped
 *   col.find({}).toArray(function(err, items) {
 *     test.equal(null, err);
 *     test.equal(4, items.length);
 *     db.close();
 *   });
 * });
 */

var mergeKeys = ['readPreference', 'ignoreUndefined'];

/**
 * Create a new Collection instance (INTERNAL TYPE, do not instantiate directly)
 * @class
 * @property {string} collectionName Get the collection name.
 * @property {string} namespace Get the full collection namespace.
 * @property {object} writeConcern The current write concern values.
 * @property {object} readConcern The current read concern values.
 * @property {object} hint Get current index hint for collection.
 * @return {Collection} a Collection instance.
 */
var Collection = function(db, topology, dbName, name, pkFactory, options) {
  checkCollectionName(name);

  // Unpack variables
  var internalHint = null;
  var slaveOk = options == null || options.slaveOk == null ? db.slaveOk : options.slaveOk;
  var serializeFunctions = options == null || options.serializeFunctions == null ? db.s.options.serializeFunctions : options.serializeFunctions;
  var raw = options == null || options.raw == null ? db.s.options.raw : options.raw;
  var promoteLongs = options == null || options.promoteLongs == null ? db.s.options.promoteLongs : options.promoteLongs;
  var promoteValues = options == null || options.promoteValues == null ? db.s.options.promoteValues : options.promoteValues;
  var promoteBuffers = options == null || options.promoteBuffers == null ? db.s.options.promoteBuffers : options.promoteBuffers;
  var readPreference = null;
  var collectionHint = null;
  var namespace = f("%s.%s", dbName, name);

  // Get the promiseLibrary
  var promiseLibrary = options.promiseLibrary;

  // No promise library selected fall back
  if(!promiseLibrary) {
    promiseLibrary = typeof global.Promise == 'function' ?
      global.Promise : __webpack_require__(3).Promise;
  }

  // Assign the right collection level readPreference
  if(options && options.readPreference) {
    readPreference = options.readPreference;
  } else if(db.options.readPreference) {
    readPreference = db.options.readPreference;
  }

  // Set custom primary key factory if provided
  pkFactory = pkFactory == null
    ? ObjectID
    : pkFactory;

  // Internal state
  this.s = {
    // Set custom primary key factory if provided
      pkFactory: pkFactory
    // Db
    , db: db
    // Topology
    , topology: topology
    // dbName
    , dbName: dbName
    // Options
    , options: options
    // Namespace
    , namespace: namespace
    // Read preference
    , readPreference: readPreference
    // SlaveOK
    , slaveOk: slaveOk
    // Serialize functions
    , serializeFunctions: serializeFunctions
    // Raw
    , raw: raw
    // promoteLongs
    , promoteLongs: promoteLongs
    // promoteValues
    , promoteValues: promoteValues
    // promoteBuffers
    , promoteBuffers: promoteBuffers
    // internalHint
    , internalHint: internalHint
    // collectionHint
    , collectionHint: collectionHint
    // Name
    , name: name
    // Promise library
    , promiseLibrary: promiseLibrary
    // Read Concern
    , readConcern: options.readConcern
  }
}

var define = Collection.define = new Define('Collection', Collection, false);

Object.defineProperty(Collection.prototype, 'collectionName', {
  enumerable: true, get: function() { return this.s.name; }
});

Object.defineProperty(Collection.prototype, 'namespace', {
  enumerable: true, get: function() { return this.s.namespace; }
});

Object.defineProperty(Collection.prototype, 'readConcern', {
  enumerable: true, get: function() { return this.s.readConcern || {level: 'local'}; }
});

Object.defineProperty(Collection.prototype, 'writeConcern', {
  enumerable:true,
  get: function() {
    var ops = {};
    if(this.s.options.w != null) ops.w = this.s.options.w;
    if(this.s.options.j != null) ops.j = this.s.options.j;
    if(this.s.options.fsync != null) ops.fsync = this.s.options.fsync;
    if(this.s.options.wtimeout != null) ops.wtimeout = this.s.options.wtimeout;
    return ops;
  }
});

/**
 * @ignore
 */
Object.defineProperty(Collection.prototype, "hint", {
    enumerable: true
  , get: function () { return this.s.collectionHint; }
  , set: function (v) { this.s.collectionHint = normalizeHintField(v); }
});

/**
 * Creates a cursor for a query that can be used to iterate over results from MongoDB
 * @method
 * @param {object} query The cursor query object.
 * @throws {MongoError}
 * @return {Cursor}
 */
Collection.prototype.find = function() {
  var options
    , args = Array.prototype.slice.call(arguments, 0)
    , has_callback = typeof args[args.length - 1] === 'function'
    , has_weird_callback = typeof args[0] === 'function'
    , callback = has_callback ? args.pop() : (has_weird_callback ? args.shift() : null)
    , len = args.length
    , selector = len >= 1 ? args[0] : {}
    , fields = len >= 2 ? args[1] : undefined;

  if(len === 1 && has_weird_callback) {
    // backwards compat for callback?, options case
    selector = {};
    options = args[0];
  }

  if(len === 2 && fields !== undefined && !Array.isArray(fields)) {
    var fieldKeys = Object.keys(fields);
    var is_option = false;

    for(var i = 0; i < fieldKeys.length; i++) {
      if(testForFields[fieldKeys[i]] != null) {
        is_option = true;
        break;
      }
    }

    if(is_option) {
      options = fields;
      fields = undefined;
    } else {
      options = {};
    }
  } else if(len === 2 && Array.isArray(fields) && !Array.isArray(fields[0])) {
    var newFields = {};
    // Rewrite the array
    for(i = 0; i < fields.length; i++) {
      newFields[fields[i]] = 1;
    }
    // Set the fields
    fields = newFields;
  }

  if(3 === len) {
    options = args[2];
  }

  // Ensure selector is not null
  selector = selector == null ? {} : selector;
  // Validate correctness off the selector
  var object = selector;
  if(Buffer.isBuffer(object)) {
    var object_size = object[0] | object[1] << 8 | object[2] << 16 | object[3] << 24;
    if(object_size != object.length)  {
      var error = new Error("query selector raw message size does not match message header size [" + object.length + "] != [" + object_size + "]");
      error.name = 'MongoError';
      throw error;
    }
  }

  // Validate correctness of the field selector
  object = fields;
  if(Buffer.isBuffer(object)) {
    object_size = object[0] | object[1] << 8 | object[2] << 16 | object[3] << 24;
    if(object_size != object.length)  {
      error = new Error("query fields raw message size does not match message header size [" + object.length + "] != [" + object_size + "]");
      error.name = 'MongoError';
      throw error;
    }
  }

  // Check special case where we are using an objectId
  if(selector != null && selector._bsontype == 'ObjectID') {
    selector = {_id:selector};
  }

  // If it's a serialized fields field we need to just let it through
  // user be warned it better be good
  if(options && options.fields && !(Buffer.isBuffer(options.fields))) {
    fields = {};

    if(Array.isArray(options.fields)) {
      if(!options.fields.length) {
        fields['_id'] = 1;
      } else {
        var l = options.fields.length;

        for (i = 0; i < l; i++) {
          fields[options.fields[i]] = 1;
        }
      }
    } else {
      fields = options.fields;
    }
  }

  if (!options) options = {};

  var newOptions = {};

  // Make a shallow copy of the collection options
  for(var key in this.s.options) {
    if(mergeKeys.indexOf(key) != -1) {
      newOptions[key] = this.s.options[key];
    }
  }

  // Make a shallow copy of options
  for (var key in options) {
    newOptions[key] = options[key];
  }

  // Unpack options
  newOptions.skip = len > 3 ? args[2] : options.skip ? options.skip : 0;
  newOptions.limit = len > 3 ? args[3] : options.limit ? options.limit : 0;
  newOptions.raw = options.raw != null && typeof options.raw === 'boolean' ? options.raw : this.s.raw;
  newOptions.hint = options.hint != null ? normalizeHintField(options.hint) : this.s.collectionHint;
  newOptions.timeout = len == 5 ? args[4] : typeof options.timeout === 'undefined' ? undefined : options.timeout;
  // // If we have overridden slaveOk otherwise use the default db setting
  newOptions.slaveOk = options.slaveOk != null ? options.slaveOk : this.s.db.slaveOk;

  // Add read preference if needed
  newOptions = getReadPreference(this, newOptions, this.s.db, this);

  // Set slave ok to true if read preference different from primary
  if(newOptions.readPreference != null
    && (newOptions.readPreference != 'primary' || newOptions.readPreference.mode != 'primary')) {
    newOptions.slaveOk = true;
  }

  // Ensure the query is an object
  if(selector != null && typeof selector != 'object') {
    throw MongoError.create({message: "query selector must be an object", driver:true });
  }

  // Build the find command
  var findCommand = {
      find: this.s.namespace
    , limit: newOptions.limit
    , skip: newOptions.skip
    , query: selector
  }

  // Ensure we use the right await data option
  if(typeof newOptions.awaitdata == 'boolean')  {
    newOptions.awaitData = newOptions.awaitdata
  }

  // Translate to new command option noCursorTimeout
  if(typeof newOptions.timeout == 'boolean') newOptions.noCursorTimeout = newOptions.timeout;

  // Merge in options to command
  for(var name in newOptions) {
    if(newOptions[name] != null) findCommand[name] = newOptions[name];
  }

  // Format the fields
  var formatFields = function(fields) {
    var object = {};
    if(Array.isArray(fields)) {
      for(var i = 0; i < fields.length; i++) {
        if(Array.isArray(fields[i])) {
          object[fields[i][0]] = fields[i][1];
        } else {
          object[fields[i][0]] = 1;
        }
      }
    } else {
      object = fields;
    }

    return object;
  }

  // Special treatment for the fields selector
  if(fields) findCommand.fields = formatFields(fields);

  // Add db object to the new options
  newOptions.db = this.s.db;

  // Add the promise library
  newOptions.promiseLibrary = this.s.promiseLibrary;

  // Set raw if available at collection level
  if(newOptions.raw == null && typeof this.s.raw == 'boolean') newOptions.raw = this.s.raw;
  // Set promoteLongs if available at collection level
  if(newOptions.promoteLongs == null && typeof this.s.promoteLongs == 'boolean') newOptions.promoteLongs = this.s.promoteLongs;
  if(newOptions.promoteValues == null && typeof this.s.promoteValues == 'boolean') newOptions.promoteValues = this.s.promoteValues;
  if(newOptions.promoteBuffers == null && typeof this.s.promoteBuffers == 'boolean') newOptions.promoteBuffers = this.s.promoteBuffers;

  // Sort options
  if(findCommand.sort) {
    findCommand.sort = formattedOrderClause(findCommand.sort);
  }

  // Set the readConcern
  if(this.s.readConcern) {
    findCommand.readConcern = this.s.readConcern;
  }

  // Decorate find command with collation options
  decorateWithCollation(findCommand, this, options);

  // Create the cursor
  if(typeof callback == 'function') return handleCallback(callback, null, this.s.topology.cursor(this.s.namespace, findCommand, newOptions));
  return this.s.topology.cursor(this.s.namespace, findCommand, newOptions);
}

define.classMethod('find', {callback: false, promise:false, returns: [Cursor]});

/**
 * Inserts a single document into MongoDB. If documents passed in do not contain the **_id** field,
 * one will be added to each of the documents missing it by the driver, mutating the document. This behavior
 * can be overridden by setting the **forceServerObjectId** flag.
 *
 * @method
 * @param {object} doc Document to insert.
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.serializeFunctions=false] Serialize functions on any object.
 * @param {boolean} [options.forceServerObjectId=false] Force server to assign _id values instead of driver.
 * @param {boolean} [options.bypassDocumentValidation=false] Allow driver to bypass schema validation in MongoDB 3.2 or higher.
 * @param {Collection~insertOneWriteOpCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.insertOne = function(doc, options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};
  if(Array.isArray(doc) && typeof callback == 'function') {
    return callback(MongoError.create({message: 'doc parameter must be an object', driver:true }));
  } else if(Array.isArray(doc)) {
    return new this.s.promiseLibrary(function(resolve, reject) {
      reject(MongoError.create({message: 'doc parameter must be an object', driver:true }));
    });
  }

  // Add ignoreUndefined
  if(this.s.options.ignoreUndefined) {
    options = shallowClone(options);
    options.ignoreUndefined = this.s.options.ignoreUndefined;
  }

  // Execute using callback
  if(typeof callback == 'function') return insertOne(self, doc, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    insertOne(self, doc, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var insertOne = function(self, doc, options, callback) {
  insertDocuments(self, [doc], options, function(err, r) {
    if(callback == null) return;
    if(err && callback) return callback(err);
    // Workaround for pre 2.6 servers
    if(r == null) return callback(null, {result: {ok:1}});
    // Add values to top level to ensure crud spec compatibility
    r.insertedCount = r.result.n;
    r.insertedId = doc._id;
    if(callback) callback(null, r);
  });
}

var mapInsertManyResults = function(docs, r) {
  var ids = r.getInsertedIds();
  var keys = Object.keys(ids);
  var finalIds = new Array(keys.length);

  for(var i = 0; i < keys.length; i++) {
    if(ids[keys[i]]._id) {
      finalIds[ids[keys[i]].index] = ids[keys[i]]._id;
    }
  }

  var finalResult = {
    result: {ok: 1, n: r.insertedCount},
    ops: docs,
    insertedCount: r.insertedCount,
    insertedIds: finalIds
  };

  if(r.getLastOp()) {
    finalResult.result.opTime = r.getLastOp();
  }

  return finalResult;
}

define.classMethod('insertOne', {callback: true, promise:true});

/**
 * Inserts an array of documents into MongoDB. If documents passed in do not contain the **_id** field,
 * one will be added to each of the documents missing it by the driver, mutating the document. This behavior
 * can be overridden by setting the **forceServerObjectId** flag.
 *
 * @method
 * @param {object[]} docs Documents to insert.
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.serializeFunctions=false] Serialize functions on any object.
 * @param {boolean} [options.forceServerObjectId=false] Force server to assign _id values instead of driver.
 * @param {boolean} [options.bypassDocumentValidation=false] Allow driver to bypass schema validation in MongoDB 3.2 or higher.
 * @param {boolean} [options.ordered=true] If true, when an insert fails, don't execute the remaining writes. If false, continue with remaining inserts when one fails.
 * @param {Collection~insertWriteOpCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.insertMany = function(docs, options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = options ? shallowClone(options) : {ordered:true};
  if(!Array.isArray(docs) && typeof callback == 'function') {
    return callback(MongoError.create({message: 'docs parameter must be an array of documents', driver:true }));
  } else if(!Array.isArray(docs)) {
    return new this.s.promiseLibrary(function(resolve, reject) {
      reject(MongoError.create({message: 'docs parameter must be an array of documents', driver:true }));
    });
  }

  // Get the write concern options
  if(typeof options.checkKeys != 'boolean') {
    options.checkKeys = true;
  }

  // If keep going set unordered
  options['serializeFunctions'] = options['serializeFunctions'] || self.s.serializeFunctions;

  // Set up the force server object id
  var forceServerObjectId = typeof options.forceServerObjectId == 'boolean'
    ? options.forceServerObjectId : self.s.db.options.forceServerObjectId;

  // Do we want to force the server to assign the _id key
  if(forceServerObjectId !== true) {
    // Add _id if not specified
    for(var i = 0; i < docs.length; i++) {
      if(docs[i]._id == null) docs[i]._id = self.s.pkFactory.createPk();
    }
  }

  // Generate the bulk write operations
  var operations = [{
    insertMany: docs
  }];

  // Execute using callback
  if(typeof callback == 'function') return bulkWrite(self, operations, options, function(err, r) {
    if(err) return callback(err, r);
    callback(null, mapInsertManyResults(docs, r));
  });

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    bulkWrite(self, operations, options, function(err, r) {
      if(err) return reject(err);
      resolve(mapInsertManyResults(docs, r));
    });
  });
}

define.classMethod('insertMany', {callback: true, promise:true});

/**
 * @typedef {Object} Collection~BulkWriteOpResult
 * @property {number} insertedCount Number of documents inserted.
 * @property {number} matchedCount Number of documents matched for update.
 * @property {number} modifiedCount Number of documents modified.
 * @property {number} deletedCount Number of documents deleted.
 * @property {number} upsertedCount Number of documents upserted.
 * @property {object} insertedIds Inserted document generated Id's, hash key is the index of the originating operation
 * @property {object} upsertedIds Upserted document generated Id's, hash key is the index of the originating operation
 * @property {object} result The command result object.
 */

/**
 * The callback format for inserts
 * @callback Collection~bulkWriteOpCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {Collection~BulkWriteOpResult} result The result object if the command was executed successfully.
 */

/**
 * Perform a bulkWrite operation without a fluent API
 *
 * Legal operation types are
 *
 *  { insertOne: { document: { a: 1 } } }
 *
 *  { updateOne: { filter: {a:2}, update: {$set: {a:2}}, upsert:true } }
 *
 *  { updateMany: { filter: {a:2}, update: {$set: {a:2}}, upsert:true } }
 *
 *  { deleteOne: { filter: {c:1} } }
 *
 *  { deleteMany: { filter: {c:1} } }
 *
 *  { replaceOne: { filter: {c:3}, replacement: {c:4}, upsert:true}}
 *
 * If documents passed in do not contain the **_id** field,
 * one will be added to each of the documents missing it by the driver, mutating the document. This behavior
 * can be overridden by setting the **forceServerObjectId** flag.
 *
 * @method
 * @param {object[]} operations Bulk operations to perform.
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.serializeFunctions=false] Serialize functions on any object.
 * @param {boolean} [options.ordered=true] Execute write operation in ordered or unordered fashion.
 * @param {boolean} [options.bypassDocumentValidation=false] Allow driver to bypass schema validation in MongoDB 3.2 or higher.
 * @param {Collection~bulkWriteOpCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.bulkWrite = function(operations, options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = options || {ordered:true};

  if(!Array.isArray(operations)) {
    throw MongoError.create({message: "operations must be an array of documents", driver:true });
  }

  // Execute using callback
  if(typeof callback == 'function') return bulkWrite(self, operations, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    bulkWrite(self, operations, options, function(err, r) {
      if(err && r == null) return reject(err);
      resolve(r);
    });
  });
}

var bulkWrite = function(self, operations, options, callback) {
  // Add ignoreUndefined
  if(self.s.options.ignoreUndefined) {
    options = shallowClone(options);
    options.ignoreUndefined = self.s.options.ignoreUndefined;
  }

  // Create the bulk operation
  var bulk = options.ordered == true || options.ordered == null ? self.initializeOrderedBulkOp(options) : self.initializeUnorderedBulkOp(options);

  // Do we have a collation
  var collation = false;

  // for each op go through and add to the bulk
  try {
    for(var i = 0; i < operations.length; i++) {
      // Get the operation type
      var key = Object.keys(operations[i])[0];
      // Check if we have a collation
      if(operations[i][key].collation) {
        collation = true;
      }

      // Pass to the raw bulk
      bulk.raw(operations[i]);
    }
  } catch(err) {
    return callback(err, null);
  }

  // Final options for write concern
  var finalOptions = writeConcern(shallowClone(options), self.s.db, self, options);
  var writeCon = finalOptions.writeConcern ? finalOptions.writeConcern : {};
  var capabilities = self.s.topology.capabilities();

  // Did the user pass in a collation, check if our write server supports it
  if(collation && capabilities && !capabilities.commandsTakeCollation) {
    return callback(new MongoError(f('server/primary/mongos does not support collation')));
  }

  // Execute the bulk
  bulk.execute(writeCon, function(err, r) {
    // We have connection level error
    if(!r && err) return callback(err, null);
    // We have single error
    if(r && r.hasWriteErrors() && r.getWriteErrorCount() == 1) {
      return callback(toError(r.getWriteErrorAt(0)), r);
    }

    r.insertedCount = r.nInserted;
    r.matchedCount = r.nMatched;
    r.modifiedCount = r.nModified || 0;
    r.deletedCount = r.nRemoved;
    r.upsertedCount = r.getUpsertedIds().length;
    r.upsertedIds = {};
    r.insertedIds = {};

    // Update the n
    r.n = r.insertedCount;

    // Inserted documents
    var inserted = r.getInsertedIds();
    // Map inserted ids
    for(var i = 0; i < inserted.length; i++) {
      r.insertedIds[inserted[i].index] = inserted[i]._id;
    }

    // Upserted documents
    var upserted = r.getUpsertedIds();
    // Map upserted ids
    for(i = 0; i < upserted.length; i++) {
      r.upsertedIds[upserted[i].index] = upserted[i]._id;
    }

    // Check if we have write errors
    if(r.hasWriteErrors()) {
      // Get all the errors
      var errors = r.getWriteErrors();
      // Return the MongoError object
      return callback(toError({
        message: 'write operation failed', code: errors[0].code, writeErrors: errors
      }), r);
    }

    // Check if we have a writeConcern error
    if(r.getWriteConcernError()) {
      // Return the MongoError object
      return callback(toError(r.getWriteConcernError()), r);
    }

    // Return the results
    callback(null, r);
  });
}

var insertDocuments = function(self, docs, options, callback) {
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};
  // Ensure we are operating on an array op docs
  docs = Array.isArray(docs) ? docs : [docs];

  // Get the write concern options
  var finalOptions = writeConcern(shallowClone(options), self.s.db, self, options);
  if(typeof finalOptions.checkKeys != 'boolean') finalOptions.checkKeys = true;

  // If keep going set unordered
  if(finalOptions.keepGoing == true) finalOptions.ordered = false;
  finalOptions['serializeFunctions'] = options['serializeFunctions'] || self.s.serializeFunctions;

  // Set up the force server object id
  var forceServerObjectId = typeof options.forceServerObjectId == 'boolean'
    ? options.forceServerObjectId : self.s.db.options.forceServerObjectId;

  // Add _id if not specified
  if(forceServerObjectId !== true){
    for(var i = 0; i < docs.length; i++) {
      if(docs[i]._id === void 0) docs[i]._id = self.s.pkFactory.createPk();
    }
  }

  // File inserts
  self.s.topology.insert(self.s.namespace, docs, finalOptions, function(err, result) {
    if(callback == null) return;
    if(err) return handleCallback(callback, err);
    if(result == null) return handleCallback(callback, null, null);
    if(result.result.code) return handleCallback(callback, toError(result.result));
    if(result.result.writeErrors) return handleCallback(callback, toError(result.result.writeErrors[0]));
    // Add docs to the list
    result.ops = docs;
    // Return the results
    handleCallback(callback, null, result);
  });
}

define.classMethod('bulkWrite', {callback: true, promise:true});

/**
 * @typedef {Object} Collection~WriteOpResult
 * @property {object[]} ops All the documents inserted using insertOne/insertMany/replaceOne. Documents contain the _id field if forceServerObjectId == false for insertOne/insertMany
 * @property {object} connection The connection object used for the operation.
 * @property {object} result The command result object.
 */

/**
 * The callback format for inserts
 * @callback Collection~writeOpCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {Collection~WriteOpResult} result The result object if the command was executed successfully.
 */

/**
 * @typedef {Object} Collection~insertWriteOpResult
 * @property {Number} insertedCount The total amount of documents inserted.
 * @property {object[]} ops All the documents inserted using insertOne/insertMany/replaceOne. Documents contain the _id field if forceServerObjectId == false for insertOne/insertMany
 * @property {ObjectId[]} insertedIds All the generated _id's for the inserted documents.
 * @property {object} connection The connection object used for the operation.
 * @property {object} result The raw command result object returned from MongoDB (content might vary by server version).
 * @property {Number} result.ok Is 1 if the command executed correctly.
 * @property {Number} result.n The total count of documents inserted.
 */

/**
 * @typedef {Object} Collection~insertOneWriteOpResult
 * @property {Number} insertedCount The total amount of documents inserted.
 * @property {object[]} ops All the documents inserted using insertOne/insertMany/replaceOne. Documents contain the _id field if forceServerObjectId == false for insertOne/insertMany
 * @property {ObjectId} insertedId The driver generated ObjectId for the insert operation.
 * @property {object} connection The connection object used for the operation.
 * @property {object} result The raw command result object returned from MongoDB (content might vary by server version).
 * @property {Number} result.ok Is 1 if the command executed correctly.
 * @property {Number} result.n The total count of documents inserted.
 */

/**
 * The callback format for inserts
 * @callback Collection~insertWriteOpCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {Collection~insertWriteOpResult} result The result object if the command was executed successfully.
 */

/**
 * The callback format for inserts
 * @callback Collection~insertOneWriteOpCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {Collection~insertOneWriteOpResult} result The result object if the command was executed successfully.
 */

/**
 * Inserts a single document or a an array of documents into MongoDB. If documents passed in do not contain the **_id** field,
 * one will be added to each of the documents missing it by the driver, mutating the document. This behavior
 * can be overridden by setting the **forceServerObjectId** flag.
 *
 * @method
 * @param {(object|object[])} docs Documents to insert.
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.serializeFunctions=false] Serialize functions on any object.
 * @param {boolean} [options.forceServerObjectId=false] Force server to assign _id values instead of driver.
 * @param {boolean} [options.bypassDocumentValidation=false] Allow driver to bypass schema validation in MongoDB 3.2 or higher.
 * @param {Collection~insertWriteOpCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 * @deprecated Use insertOne, insertMany or bulkWrite
 */
Collection.prototype.insert = function(docs, options, callback) {
  if(typeof options == 'function') callback = options, options = {};
  options = options || {ordered:false};
  docs = !Array.isArray(docs) ? [docs] : docs;

  if(options.keepGoing == true) {
    options.ordered = false;
  }

  return this.insertMany(docs, options, callback);
}

define.classMethod('insert', {callback: true, promise:true});

/**
 * @typedef {Object} Collection~updateWriteOpResult
 * @property {Object} result The raw result returned from MongoDB, field will vary depending on server version.
 * @property {Number} result.ok Is 1 if the command executed correctly.
 * @property {Number} result.n The total count of documents scanned.
 * @property {Number} result.nModified The total count of documents modified.
 * @property {Object} connection The connection object used for the operation.
 * @property {Number} matchedCount The number of documents that matched the filter.
 * @property {Number} modifiedCount The number of documents that were modified.
 * @property {Number} upsertedCount The number of documents upserted.
 * @property {Object} upsertedId The upserted id.
 * @property {ObjectId} upsertedId._id The upserted _id returned from the server.
 */

/**
 * The callback format for inserts
 * @callback Collection~updateWriteOpCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {Collection~updateWriteOpResult} result The result object if the command was executed successfully.
 */

/**
 * Update a single document on MongoDB
 * @method
 * @param {object} filter The Filter used to select the document to update
 * @param {object} update The update operations to be applied to the document
 * @param {object} [options=null] Optional settings.
 * @param {boolean} [options.upsert=false] Update operation is an upsert.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.bypassDocumentValidation=false] Allow driver to bypass schema validation in MongoDB 3.2 or higher.
 * @param {Collection~updateWriteOpCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.updateOne = function(filter, update, options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = shallowClone(options)

  // Add ignoreUndefined
  if(this.s.options.ignoreUndefined) {
    options = shallowClone(options);
    options.ignoreUndefined = this.s.options.ignoreUndefined;
  }

  // Execute using callback
  if(typeof callback == 'function') return updateOne(self, filter, update, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    updateOne(self, filter, update, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var updateOne = function(self, filter, update, options, callback) {
  // Set single document update
  options.multi = false;
  // Execute update
  updateDocuments(self, filter, update, options, function(err, r) {
    if(callback == null) return;
    if(err && callback) return callback(err);
    if(r == null) return callback(null, {result: {ok:1}});
    r.modifiedCount = r.result.nModified != null ? r.result.nModified : r.result.n;
    r.upsertedId = Array.isArray(r.result.upserted) && r.result.upserted.length > 0 ? r.result.upserted[0] : null;
    r.upsertedCount = Array.isArray(r.result.upserted) && r.result.upserted.length ? r.result.upserted.length : 0;
    r.matchedCount = Array.isArray(r.result.upserted) && r.result.upserted.length > 0 ? 0 : r.result.n;
    if(callback) callback(null, r);
  });
}

define.classMethod('updateOne', {callback: true, promise:true});

/**
 * Replace a document on MongoDB
 * @method
 * @param {object} filter The Filter used to select the document to update
 * @param {object} doc The Document that replaces the matching document
 * @param {object} [options=null] Optional settings.
 * @param {boolean} [options.upsert=false] Update operation is an upsert.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.bypassDocumentValidation=false] Allow driver to bypass schema validation in MongoDB 3.2 or higher.
 * @param {Collection~updateWriteOpCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.replaceOne = function(filter, doc, options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = shallowClone(options)

  // Add ignoreUndefined
  if(this.s.options.ignoreUndefined) {
    options = shallowClone(options);
    options.ignoreUndefined = this.s.options.ignoreUndefined;
  }

  // Execute using callback
  if(typeof callback == 'function') return replaceOne(self, filter, doc, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    replaceOne(self, filter, doc, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var replaceOne = function(self, filter, doc, options, callback) {
  // Set single document update
  options.multi = false;

  // Execute update
  updateDocuments(self, filter, doc, options, function(err, r) {
    if(callback == null) return;
    if(err && callback) return callback(err);
    if(r == null) return callback(null, {result: {ok:1}});

    r.modifiedCount = r.result.nModified != null ? r.result.nModified : r.result.n;
    r.upsertedId = Array.isArray(r.result.upserted) && r.result.upserted.length > 0 ? r.result.upserted[0] : null;
    r.upsertedCount = Array.isArray(r.result.upserted) && r.result.upserted.length ? r.result.upserted.length : 0;
    r.matchedCount = Array.isArray(r.result.upserted) && r.result.upserted.length > 0 ? 0 : r.result.n;
    r.ops = [doc];
    if(callback) callback(null, r);
  });
}

define.classMethod('replaceOne', {callback: true, promise:true});

/**
 * Update multiple documents on MongoDB
 * @method
 * @param {object} filter The Filter used to select the document to update
 * @param {object} update The update operations to be applied to the document
 * @param {object} [options=null] Optional settings.
 * @param {boolean} [options.upsert=false] Update operation is an upsert.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {Collection~updateWriteOpCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.updateMany = function(filter, update, options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = shallowClone(options)

  // Add ignoreUndefined
  if(this.s.options.ignoreUndefined) {
    options = shallowClone(options);
    options.ignoreUndefined = this.s.options.ignoreUndefined;
  }

  // Execute using callback
  if(typeof callback == 'function') return updateMany(self, filter, update, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    updateMany(self, filter, update, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var updateMany = function(self, filter, update, options, callback) {
  // Set single document update
  options.multi = true;
  // Execute update
  updateDocuments(self, filter, update, options, function(err, r) {
    if(callback == null) return;
    if(err && callback) return callback(err);
    if(r == null) return callback(null, {result: {ok:1}});
    r.modifiedCount = r.result.nModified != null ? r.result.nModified : r.result.n;
    r.upsertedId = Array.isArray(r.result.upserted) && r.result.upserted.length > 0 ? r.result.upserted[0] : null;
    r.upsertedCount = Array.isArray(r.result.upserted) && r.result.upserted.length ? r.result.upserted.length : 0;
    r.matchedCount = Array.isArray(r.result.upserted) && r.result.upserted.length > 0 ? 0 : r.result.n;
    if(callback) callback(null, r);
  });
}

define.classMethod('updateMany', {callback: true, promise:true});

var updateDocuments = function(self, selector, document, options, callback) {
  if('function' === typeof options) callback = options, options = null;
  if(options == null) options = {};
  if(!('function' === typeof callback)) callback = null;

  // If we are not providing a selector or document throw
  if(selector == null || typeof selector != 'object') return callback(toError("selector must be a valid JavaScript object"));
  if(document == null || typeof document != 'object') return callback(toError("document must be a valid JavaScript object"));

  // Get the write concern options
  var finalOptions = writeConcern(shallowClone(options), self.s.db, self, options);

  // Do we return the actual result document
  // Either use override on the function, or go back to default on either the collection
  // level or db
  finalOptions['serializeFunctions'] = options['serializeFunctions'] || self.s.serializeFunctions;

  // Execute the operation
  var op = {q: selector, u: document};
  op.upsert = options.upsert !== void 0 ? !!options.upsert : false;
  op.multi = options.multi !== void 0 ? !!options.multi : false;

  // Have we specified collation
  decorateWithCollation(finalOptions, self, options);

  // Update options
  self.s.topology.update(self.s.namespace, [op], finalOptions, function(err, result) {
    if(callback == null) return;
    if(err) return handleCallback(callback, err, null);
    if(result == null) return handleCallback(callback, null, null);
    if(result.result.code) return handleCallback(callback, toError(result.result));
    if(result.result.writeErrors) return handleCallback(callback, toError(result.result.writeErrors[0]));
    // Return the results
    handleCallback(callback, null, result);
  });
}

/**
 * Updates documents.
 * @method
 * @param {object} selector The selector for the update operation.
 * @param {object} document The update document.
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.upsert=false] Update operation is an upsert.
 * @param {boolean} [options.multi=false] Update one/all documents with operation.
 * @param {boolean} [options.bypassDocumentValidation=false] Allow driver to bypass schema validation in MongoDB 3.2 or higher.
 * @param {object} [options.collation=null] Specify collation (MongoDB 3.4 or higher) settings for update operation (see 3.4 documentation for available fields).
 * @param {Collection~writeOpCallback} [callback] The command result callback
 * @throws {MongoError}
 * @return {Promise} returns Promise if no callback passed
 * @deprecated use updateOne, updateMany or bulkWrite
 */
Collection.prototype.update = function(selector, document, options, callback) {
  var self = this;

  // Add ignoreUndefined
  if(this.s.options.ignoreUndefined) {
    options = shallowClone(options);
    options.ignoreUndefined = this.s.options.ignoreUndefined;
  }

  // Execute using callback
  if(typeof callback == 'function') return updateDocuments(self, selector, document, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    updateDocuments(self, selector, document, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

define.classMethod('update', {callback: true, promise:true});

/**
 * @typedef {Object} Collection~deleteWriteOpResult
 * @property {Object} result The raw result returned from MongoDB, field will vary depending on server version.
 * @property {Number} result.ok Is 1 if the command executed correctly.
 * @property {Number} result.n The total count of documents deleted.
 * @property {Object} connection The connection object used for the operation.
 * @property {Number} deletedCount The number of documents deleted.
 */

/**
 * The callback format for inserts
 * @callback Collection~deleteWriteOpCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {Collection~deleteWriteOpResult} result The result object if the command was executed successfully.
 */

/**
 * Delete a document on MongoDB
 * @method
 * @param {object} filter The Filter used to select the document to remove
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {Collection~deleteWriteOpCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.deleteOne = function(filter, options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = shallowClone(options);

  // Add ignoreUndefined
  if(this.s.options.ignoreUndefined) {
    options = shallowClone(options);
    options.ignoreUndefined = this.s.options.ignoreUndefined;
  }

  // Execute using callback
  if(typeof callback == 'function') return deleteOne(self, filter, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    deleteOne(self, filter, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var deleteOne = function(self, filter, options, callback) {
  options.single = true;
  removeDocuments(self, filter, options, function(err, r) {
    if(callback == null) return;
    if(err && callback) return callback(err);
    if(r == null) return callback(null, {result: {ok:1}});
    r.deletedCount = r.result.n;
    if(callback) callback(null, r);
  });
}

define.classMethod('deleteOne', {callback: true, promise:true});

Collection.prototype.removeOne = Collection.prototype.deleteOne;

define.classMethod('removeOne', {callback: true, promise:true});

/**
 * Delete multiple documents on MongoDB
 * @method
 * @param {object} filter The Filter used to select the documents to remove
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {Collection~deleteWriteOpCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.deleteMany = function(filter, options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = shallowClone(options);

  // Add ignoreUndefined
  if(this.s.options.ignoreUndefined) {
    options = shallowClone(options);
    options.ignoreUndefined = this.s.options.ignoreUndefined;
  }

  // Execute using callback
  if(typeof callback == 'function') return deleteMany(self, filter, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    deleteMany(self, filter, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var deleteMany = function(self, filter, options, callback) {
  options.single = false;

  removeDocuments(self, filter, options, function(err, r) {
    if(callback == null) return;
    if(err && callback) return callback(err);
    if(r == null) return callback(null, {result: {ok:1}});
    r.deletedCount = r.result.n;
    if(callback) callback(null, r);
  });
}

var removeDocuments = function(self, selector, options, callback) {
  if(typeof options == 'function') {
    callback = options, options = {};
  } else if (typeof selector === 'function') {
    callback = selector;
    options = {};
    selector = {};
  }

  // Create an empty options object if the provided one is null
  options = options || {};

  // Get the write concern options
  var finalOptions = writeConcern(shallowClone(options), self.s.db, self, options);

  // If selector is null set empty
  if(selector == null) selector = {};

  // Build the op
  var op = {q: selector, limit: 0};
  if(options.single) op.limit = 1;

  // Have we specified collation
  decorateWithCollation(finalOptions, self, options);

  // Execute the remove
  self.s.topology.remove(self.s.namespace, [op], finalOptions, function(err, result) {
    if(callback == null) return;
    if(err) return handleCallback(callback, err, null);
    if(result == null) return handleCallback(callback, null, null);
    if(result.result.code) return handleCallback(callback, toError(result.result));
    if(result.result.writeErrors) return handleCallback(callback, toError(result.result.writeErrors[0]));
    // Return the results
    handleCallback(callback, null, result);
  });
}

define.classMethod('deleteMany', {callback: true, promise:true});

Collection.prototype.removeMany = Collection.prototype.deleteMany;

define.classMethod('removeMany', {callback: true, promise:true});

/**
 * Remove documents.
 * @method
 * @param {object} selector The selector for the update operation.
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.single=false] Removes the first document found.
 * @param {Collection~writeOpCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 * @deprecated use deleteOne, deleteMany or bulkWrite
 */
Collection.prototype.remove = function(selector, options, callback) {
  var self = this;

  // Add ignoreUndefined
  if(this.s.options.ignoreUndefined) {
    options = shallowClone(options);
    options.ignoreUndefined = this.s.options.ignoreUndefined;
  }

  // Execute using callback
  if(typeof callback == 'function') return removeDocuments(self, selector, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    removeDocuments(self, selector, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

define.classMethod('remove', {callback: true, promise:true});

/**
 * Save a document. Simple full document replacement function. Not recommended for efficiency, use atomic
 * operators and update instead for more efficient operations.
 * @method
 * @param {object} doc Document to save
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {Collection~writeOpCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 * @deprecated use insertOne, insertMany, updateOne or updateMany
 */
Collection.prototype.save = function(doc, options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};

  // Add ignoreUndefined
  if(this.s.options.ignoreUndefined) {
    options = shallowClone(options);
    options.ignoreUndefined = this.s.options.ignoreUndefined;
  }

  // Execute using callback
  if(typeof callback == 'function') return save(self, doc, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    save(self, doc, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var save = function(self, doc, options, callback) {
  // Get the write concern options
  var finalOptions = writeConcern(shallowClone(options), self.s.db, self, options);
  // Establish if we need to perform an insert or update
  if(doc._id != null) {
    finalOptions.upsert = true;
    return updateDocuments(self, {_id: doc._id}, doc, finalOptions, callback);
  }

  // Insert the document
  insertDocuments(self, [doc], options, function(err, r) {
    if(callback == null) return;
    if(doc == null) return handleCallback(callback, null, null);
    if(err) return handleCallback(callback, err, null);
    handleCallback(callback, null, r);
  });
}

define.classMethod('save', {callback: true, promise:true});

/**
 * The callback format for results
 * @callback Collection~resultCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {object} result The result object if the command was executed successfully.
 */

/**
 * Fetches the first document that matches the query
 * @method
 * @param {object} query Query for find Operation
 * @param {object} [options=null] Optional settings.
 * @param {number} [options.limit=0] Sets the limit of documents returned in the query.
 * @param {(array|object)} [options.sort=null] Set to sort the documents coming back from the query. Array of indexes, [['a', 1]] etc.
 * @param {object} [options.fields=null] The fields to return in the query. Object of fields to include or exclude (not both), {'a':1}
 * @param {number} [options.skip=0] Set to skip N documents ahead in your query (useful for pagination).
 * @param {Object} [options.hint=null] Tell the query to use specific indexes in the query. Object of indexes to use, {'_id':1}
 * @param {boolean} [options.explain=false] Explain the query instead of returning the data.
 * @param {boolean} [options.snapshot=false] Snapshot query.
 * @param {boolean} [options.timeout=false] Specify if the cursor can timeout.
 * @param {boolean} [options.tailable=false] Specify if the cursor is tailable.
 * @param {number} [options.batchSize=0] Set the batchSize for the getMoreCommand when iterating over the query results.
 * @param {boolean} [options.returnKey=false] Only return the index key.
 * @param {number} [options.maxScan=null] Limit the number of items to scan.
 * @param {number} [options.min=null] Set index bounds.
 * @param {number} [options.max=null] Set index bounds.
 * @param {boolean} [options.showDiskLoc=false] Show disk location of results.
 * @param {string} [options.comment=null] You can put a $comment field on a query to make looking in the profiler logs simpler.
 * @param {boolean} [options.raw=false] Return document results as raw BSON buffers.
 * @param {boolean} [options.promoteLongs=true] Promotes Long values to number if they fit inside the 53 bits resolution.
 * @param {boolean} [options.promoteValues=true] Promotes BSON values to native types where possible, set to false to only receive wrapper types.
 * @param {boolean} [options.promoteBuffers=false] Promotes Binary BSON values to native Node Buffers.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {boolean} [options.partial=false] Specify if the cursor should return partial results when querying against a sharded system
 * @param {number} [options.maxTimeMS=null] Number of milliseconds to wait before aborting the query.
 * @param {object} [options.collation=null] Specify collation (MongoDB 3.4 or higher) settings for update operation (see 3.4 documentation for available fields).
 * @param {Collection~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.findOne = function() {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 0);
  var callback = args.pop();
  if(typeof callback != 'function') args.push(callback);

  // Execute using callback
  if(typeof callback == 'function') return findOne(self, args, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    findOne(self, args, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var findOne = function(self, args, callback) {
  var cursor = self.find.apply(self, args).limit(-1).batchSize(1);
  // Return the item
  cursor.next(function(err, item) {
    if(err != null) return handleCallback(callback, toError(err), null);
    handleCallback(callback, null, item);
  });
}

define.classMethod('findOne', {callback: true, promise:true});

/**
 * The callback format for the collection method, must be used if strict is specified
 * @callback Collection~collectionResultCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {Collection} collection The collection instance.
 */

/**
 * Rename the collection.
 *
 * @method
 * @param {string} newName New name of of the collection.
 * @param {object} [options=null] Optional settings.
 * @param {boolean} [options.dropTarget=false] Drop the target name collection if it previously exists.
 * @param {Collection~collectionResultCallback} [callback] The results callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.rename = function(newName, opt, callback) {
  var self = this;
  if(typeof opt == 'function') callback = opt, opt = {};
  opt = assign({}, opt, {readPreference: ReadPreference.PRIMARY});

  // Execute using callback
  if(typeof callback == 'function') return rename(self, newName, opt, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    rename(self, newName, opt, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var rename = function(self, newName, opt, callback) {
  // Check the collection name
  checkCollectionName(newName);
  // Build the command
  var renameCollection = f("%s.%s", self.s.dbName, self.s.name);
  var toCollection =  f("%s.%s", self.s.dbName, newName);
  var dropTarget = typeof opt.dropTarget == 'boolean' ? opt.dropTarget : false;
  var cmd = {'renameCollection':renameCollection, 'to':toCollection, 'dropTarget':dropTarget};

  // Decorate command with writeConcern if supported
  decorateWithWriteConcern(cmd, self, opt);

  // Execute against admin
  self.s.db.admin().command(cmd, opt, function(err, doc) {
    if(err) return handleCallback(callback, err, null);
    // We have an error
    if(doc.errmsg) return handleCallback(callback, toError(doc), null);
    try {
      return handleCallback(callback, null, new Collection(self.s.db, self.s.topology, self.s.dbName, newName, self.s.pkFactory, self.s.options));
    } catch(err) {
      return handleCallback(callback, toError(err), null);
    }
  });
}

define.classMethod('rename', {callback: true, promise:true});

/**
 * Drop the collection from the database, removing it permanently. New accesses will create a new collection.
 *
 * @method
 * @param {object} [options=null] Optional settings.
 * @param {Collection~resultCallback} [callback] The results callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.drop = function(options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};

  // Execute using callback
  if(typeof callback == 'function') return self.s.db.dropCollection(self.s.name, options, callback);
  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    self.s.db.dropCollection(self.s.name, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

define.classMethod('drop', {callback: true, promise:true});

/**
 * Returns the options of the collection.
 *
 * @method
 * @param {Collection~resultCallback} [callback] The results callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.options = function(callback) {
  var self = this;

  // Execute using callback
  if(typeof callback == 'function') return options(self, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    options(self, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var options = function(self, callback) {
  self.s.db.listCollections({name: self.s.name}).toArray(function(err, collections) {
    if(err) return handleCallback(callback, err);
    if(collections.length == 0) {
      return handleCallback(callback, MongoError.create({message: f("collection %s not found", self.s.namespace), driver:true }));
    }

    handleCallback(callback, err, collections[0].options || null);
  });
}

define.classMethod('options', {callback: true, promise:true});

/**
 * Returns if the collection is a capped collection
 *
 * @method
 * @param {Collection~resultCallback} [callback] The results callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.isCapped = function(callback) {
  var self = this;

  // Execute using callback
  if(typeof callback == 'function') return isCapped(self, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    isCapped(self, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var isCapped = function(self, callback) {
  self.options(function(err, document) {
    if(err) return handleCallback(callback, err);
    handleCallback(callback, null, document && document.capped);
  });
}

define.classMethod('isCapped', {callback: true, promise:true});

/**
 * Creates an index on the db and collection collection.
 * @method
 * @param {(string|object)} fieldOrSpec Defines the index.
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.unique=false] Creates an unique index.
 * @param {boolean} [options.sparse=false] Creates a sparse index.
 * @param {boolean} [options.background=false] Creates the index in the background, yielding whenever possible.
 * @param {boolean} [options.dropDups=false] A unique index cannot be created on a key that has pre-existing duplicate values. If you would like to create the index anyway, keeping the first document the database indexes and deleting all subsequent documents that have duplicate value
 * @param {number} [options.min=null] For geospatial indexes set the lower bound for the co-ordinates.
 * @param {number} [options.max=null] For geospatial indexes set the high bound for the co-ordinates.
 * @param {number} [options.v=null] Specify the format version of the indexes.
 * @param {number} [options.expireAfterSeconds=null] Allows you to expire data on indexes applied to a data (MongoDB 2.2 or higher)
 * @param {string} [options.name=null] Override the autogenerated index name (useful if the resulting name is larger than 128 bytes)
 * @param {object} [options.partialFilterExpression=null] Creates a partial index based on the given filter object (MongoDB 3.2 or higher)
 * @param {object} [options.collation=null] Specify collation (MongoDB 3.4 or higher) settings for update operation (see 3.4 documentation for available fields).
 * @param {Collection~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.createIndex = function(fieldOrSpec, options, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  options = args.length ? args.shift() || {} : {};
  options = typeof callback === 'function' ? options : callback;
  options = options == null ? {} : options;

  // Execute using callback
  if(typeof callback == 'function') return createIndex(self, fieldOrSpec, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    createIndex(self, fieldOrSpec, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var createIndex = function(self, fieldOrSpec, options, callback) {
  self.s.db.createIndex(self.s.name, fieldOrSpec, options, callback);
}

define.classMethod('createIndex', {callback: true, promise:true});

/**
 * Creates multiple indexes in the collection, this method is only supported for
 * MongoDB 2.6 or higher. Earlier version of MongoDB will throw a command not supported
 * error. Index specifications are defined at http://docs.mongodb.org/manual/reference/command/createIndexes/.
 * @method
 * @param {array} indexSpecs An array of index specifications to be created
 * @param {Collection~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.createIndexes = function(indexSpecs, callback) {
  var self = this;

  // Execute using callback
  if(typeof callback == 'function') return createIndexes(self, indexSpecs, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    createIndexes(self, indexSpecs, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var createIndexes = function(self, indexSpecs, callback) {
  var capabilities = self.s.topology.capabilities();

  // Ensure we generate the correct name if the parameter is not set
  for(var i = 0; i < indexSpecs.length; i++) {
    if(indexSpecs[i].name == null) {
      var keys = [];

      // Did the user pass in a collation, check if our write server supports it
      if(indexSpecs[i].collation && capabilities && !capabilities.commandsTakeCollation) {
        return callback(new MongoError(f('server/primary/mongos does not support collation')));
      }

      for(var name in indexSpecs[i].key) {
        keys.push(f('%s_%s', name, indexSpecs[i].key[name]));
      }

      // Set the name
      indexSpecs[i].name = keys.join('_');
    }
  }

  // Execute the index
  self.s.db.command({
    createIndexes: self.s.name, indexes: indexSpecs
  }, { readPreference: ReadPreference.PRIMARY }, callback);
}

define.classMethod('createIndexes', {callback: true, promise:true});

/**
 * Drops an index from this collection.
 * @method
 * @param {string} indexName Name of the index to drop.
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {Collection~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.dropIndex = function(indexName, options, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  options = args.length ? args.shift() || {} : {};
  // Run only against primary
  options.readPreference = ReadPreference.PRIMARY;

  // Execute using callback
  if(typeof callback == 'function') return dropIndex(self, indexName, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    dropIndex(self, indexName, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var dropIndex = function(self, indexName, options, callback) {
  // Delete index command
  var cmd = {'dropIndexes':self.s.name, 'index':indexName};

  // Decorate command with writeConcern if supported
  decorateWithWriteConcern(cmd, self, options);

  // Execute command
  self.s.db.command(cmd, options, function(err, result) {
    if(typeof callback != 'function') return;
    if(err) return handleCallback(callback, err, null);
    handleCallback(callback, null, result);
  });
}

define.classMethod('dropIndex', {callback: true, promise:true});

/**
 * Drops all indexes from this collection.
 * @method
 * @param {Collection~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.dropIndexes = function(options, callback) {
  var self = this;

  // Do we have options
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};

  // Execute using callback
  if(typeof callback == 'function') return dropIndexes(self, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    dropIndexes(self, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var dropIndexes = function(self, options, callback) {
  self.dropIndex('*', options, function(err) {
    if(err) return handleCallback(callback, err, false);
    handleCallback(callback, null, true);
  });
}

define.classMethod('dropIndexes', {callback: true, promise:true});

/**
 * Drops all indexes from this collection.
 * @method
 * @deprecated use dropIndexes
 * @param {Collection~resultCallback} callback The command result callback
 * @return {Promise} returns Promise if no [callback] passed
 */
Collection.prototype.dropAllIndexes = Collection.prototype.dropIndexes;

define.classMethod('dropAllIndexes', {callback: true, promise:true});

/**
 * Reindex all indexes on the collection
 * Warning: reIndex is a blocking operation (indexes are rebuilt in the foreground) and will be slow for large collections.
 * @method
 * @param {Collection~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.reIndex = function(options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};

  // Execute using callback
  if(typeof callback == 'function') return reIndex(self, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    reIndex(self, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var reIndex = function(self, options, callback) {
  // Reindex
  var cmd = {'reIndex':self.s.name};

  // Execute the command
  self.s.db.command(cmd, options, function(err, result) {
    if(callback == null) return;
    if(err) return handleCallback(callback, err, null);
    handleCallback(callback, null, result.ok ? true : false);
  });
}

define.classMethod('reIndex', {callback: true, promise:true});

/**
 * Get the list of all indexes information for the collection.
 *
 * @method
 * @param {object} [options=null] Optional settings.
 * @param {number} [options.batchSize=null] The batchSize for the returned command cursor or if pre 2.8 the systems batch collection
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @return {CommandCursor}
 */
Collection.prototype.listIndexes = function(options) {
  options = options || {};
  // Clone the options
  options = shallowClone(options);
  // Determine the read preference in the options.
  options = getReadPreference(this, options, this.s.db, this);
  // Set the CommandCursor constructor
  options.cursorFactory = CommandCursor;
  // Set the promiseLibrary
  options.promiseLibrary = this.s.promiseLibrary;

  if(!this.s.topology.capabilities()) {
    throw new MongoError('cannot connect to server');
  }

  // We have a list collections command
  if(this.s.topology.capabilities().hasListIndexesCommand) {
    // Cursor options
    var cursor = options.batchSize ? {batchSize: options.batchSize} : {}
    // Build the command
    var command = { listIndexes: this.s.name, cursor: cursor };
    // Execute the cursor
    cursor = this.s.topology.cursor(f('%s.$cmd', this.s.dbName), command, options);
    // Do we have a readPreference, apply it
    if(options.readPreference) cursor.setReadPreference(options.readPreference);
    // Return the cursor
    return cursor;
  }

  // Get the namespace
  var ns = f('%s.system.indexes', this.s.dbName);
  // Get the query
  cursor = this.s.topology.cursor(ns, {find: ns, query: {ns: this.s.namespace}}, options);
  // Do we have a readPreference, apply it
  if(options.readPreference) cursor.setReadPreference(options.readPreference);
  // Set the passed in batch size if one was provided
  if(options.batchSize) cursor = cursor.batchSize(options.batchSize);
  // Return the cursor
  return cursor;
};

define.classMethod('listIndexes', {callback: false, promise:false, returns: [CommandCursor]});

/**
 * Ensures that an index exists, if it does not it creates it
 * @method
 * @deprecated use createIndexes instead
 * @param {(string|object)} fieldOrSpec Defines the index.
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.unique=false] Creates an unique index.
 * @param {boolean} [options.sparse=false] Creates a sparse index.
 * @param {boolean} [options.background=false] Creates the index in the background, yielding whenever possible.
 * @param {boolean} [options.dropDups=false] A unique index cannot be created on a key that has pre-existing duplicate values. If you would like to create the index anyway, keeping the first document the database indexes and deleting all subsequent documents that have duplicate value
 * @param {number} [options.min=null] For geospatial indexes set the lower bound for the co-ordinates.
 * @param {number} [options.max=null] For geospatial indexes set the high bound for the co-ordinates.
 * @param {number} [options.v=null] Specify the format version of the indexes.
 * @param {number} [options.expireAfterSeconds=null] Allows you to expire data on indexes applied to a data (MongoDB 2.2 or higher)
 * @param {number} [options.name=null] Override the autogenerated index name (useful if the resulting name is larger than 128 bytes)
 * @param {object} [options.collation=null] Specify collation (MongoDB 3.4 or higher) settings for update operation (see 3.4 documentation for available fields).
 * @param {Collection~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.ensureIndex = function(fieldOrSpec, options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};

  // Execute using callback
  if(typeof callback == 'function') return ensureIndex(self, fieldOrSpec, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    ensureIndex(self, fieldOrSpec, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var ensureIndex = function(self, fieldOrSpec, options, callback) {
  self.s.db.ensureIndex(self.s.name, fieldOrSpec, options, callback);
}

define.classMethod('ensureIndex', {callback: true, promise:true});

/**
 * Checks if one or more indexes exist on the collection, fails on first non-existing index
 * @method
 * @param {(string|array)} indexes One or more index names to check.
 * @param {Collection~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.indexExists = function(indexes, callback) {
  var self = this;

  // Execute using callback
  if(typeof callback == 'function') return indexExists(self, indexes, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    indexExists(self, indexes, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var indexExists = function(self, indexes, callback) {
  self.indexInformation(function(err, indexInformation) {
    // If we have an error return
    if(err != null) return handleCallback(callback, err, null);
    // Let's check for the index names
    if(!Array.isArray(indexes)) return handleCallback(callback, null, indexInformation[indexes] != null);
    // Check in list of indexes
    for(var i = 0; i < indexes.length; i++) {
      if(indexInformation[indexes[i]] == null) {
        return handleCallback(callback, null, false);
      }
    }

    // All keys found return true
    return handleCallback(callback, null, true);
  });
}

define.classMethod('indexExists', {callback: true, promise:true});

/**
 * Retrieves this collections index info.
 * @method
 * @param {object} [options=null] Optional settings.
 * @param {boolean} [options.full=false] Returns the full raw index information.
 * @param {Collection~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.indexInformation = function(options, callback) {
  var self = this;
  // Unpack calls
  var args = Array.prototype.slice.call(arguments, 0);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  options = args.length ? args.shift() || {} : {};

  // Execute using callback
  if(typeof callback == 'function') return indexInformation(self, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    indexInformation(self, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var indexInformation = function(self, options, callback) {
  self.s.db.indexInformation(self.s.name, options, callback);
}

define.classMethod('indexInformation', {callback: true, promise:true});

/**
 * The callback format for results
 * @callback Collection~countCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {number} result The count of documents that matched the query.
 */

/**
 * Count number of matching documents in the db to a query.
 * @method
 * @param {object} query The query for the count.
 * @param {object} [options=null] Optional settings.
 * @param {boolean} [options.limit=null] The limit of documents to count.
 * @param {boolean} [options.skip=null] The number of documents to skip for the count.
 * @param {string} [options.hint=null] An index name hint for the query.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {number} [options.maxTimeMS=null] Number of milliseconds to wait before aborting the query.
 * @param {Collection~countCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.count = function(query, options, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 0);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  var queryOption = args.length ? args.shift() || {} : {};
  var optionsOption = args.length ? args.shift() || {} : {};

  // Execute using callback
  if(typeof callback == 'function') return count(self, queryOption, optionsOption, callback);

  // Check if query is empty
  query = query || {};
  options = options || {};

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    count(self, query, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
};

var count = function(self, query, options, callback) {
  var skip = options.skip;
  var limit = options.limit;
  var hint = options.hint;
  var maxTimeMS = options.maxTimeMS;

  // Final query
  var cmd = {
    'count': self.s.name, 'query': query
  };

  // Add limit, skip and maxTimeMS if defined
  if(typeof skip == 'number') cmd.skip = skip;
  if(typeof limit == 'number') cmd.limit = limit;
  if(typeof maxTimeMS == 'number') cmd.maxTimeMS = maxTimeMS;
  if(hint) cmd.hint = hint;

  options = shallowClone(options);
  // Ensure we have the right read preference inheritance
  options = getReadPreference(self, options, self.s.db, self);

  // Do we have a readConcern specified
  if(self.s.readConcern) {
    cmd.readConcern = self.s.readConcern;
  }

  // Have we specified collation
  decorateWithCollation(cmd, self, options);

  // Execute command
  self.s.db.command(cmd, options, function(err, result) {
    if(err) return handleCallback(callback, err);
    handleCallback(callback, null, result.n);
  });
}

define.classMethod('count', {callback: true, promise:true});

/**
 * The distinct command returns returns a list of distinct values for the given key across a collection.
 * @method
 * @param {string} key Field of the document to find distinct values for.
 * @param {object} query The query for filtering the set of documents to which we apply the distinct filter.
 * @param {object} [options=null] Optional settings.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {number} [options.maxTimeMS=null] Number of milliseconds to wait before aborting the query.
 * @param {Collection~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.distinct = function(key, query, options, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  var queryOption = args.length ? args.shift() || {} : {};
  var optionsOption = args.length ? args.shift() || {} : {};

  // Execute using callback
  if(typeof callback == 'function') return distinct(self, key, queryOption, optionsOption, callback);

  // Ensure the query and options are set
  query = query || {};
  options = options || {};

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    distinct(self, key, query, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
};

var distinct = function(self, key, query, options, callback) {
  // maxTimeMS option
  var maxTimeMS = options.maxTimeMS;

  // Distinct command
  var cmd = {
    'distinct': self.s.name, 'key': key, 'query': query
  };

  options = shallowClone(options);
  // Ensure we have the right read preference inheritance
  options = getReadPreference(self, options, self.s.db, self);

  // Add maxTimeMS if defined
  if(typeof maxTimeMS == 'number')
    cmd.maxTimeMS = maxTimeMS;

  // Do we have a readConcern specified
  if(self.s.readConcern) {
    cmd.readConcern = self.s.readConcern;
  }

  // Have we specified collation
  decorateWithCollation(cmd, self, options);

  // Execute the command
  self.s.db.command(cmd, options, function(err, result) {
    if(err) return handleCallback(callback, err);
    handleCallback(callback, null, result.values);
  });
}

define.classMethod('distinct', {callback: true, promise:true});

/**
 * Retrieve all the indexes on the collection.
 * @method
 * @param {Collection~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.indexes = function(callback) {
  var self = this;
  // Execute using callback
  if(typeof callback == 'function') return indexes(self, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    indexes(self, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var indexes = function(self, callback) {
  self.s.db.indexInformation(self.s.name, {full:true}, callback);
}

define.classMethod('indexes', {callback: true, promise:true});

/**
 * Get all the collection statistics.
 *
 * @method
 * @param {object} [options=null] Optional settings.
 * @param {number} [options.scale=null] Divide the returned sizes by scale value.
 * @param {Collection~resultCallback} [callback] The collection result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.stats = function(options, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 0);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  // Fetch all commands
  options = args.length ? args.shift() || {} : {};

  // Execute using callback
  if(typeof callback == 'function') return stats(self, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    stats(self, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var stats = function(self, options, callback) {
  // Build command object
  var commandObject = {
    collStats:self.s.name
  }

  // Check if we have the scale value
  if(options['scale'] != null) commandObject['scale'] = options['scale'];

  options = shallowClone(options);
  // Ensure we have the right read preference inheritance
  options = getReadPreference(self, options, self.s.db, self);

  // Execute the command
  self.s.db.command(commandObject, options, callback);
}

define.classMethod('stats', {callback: true, promise:true});

/**
 * @typedef {Object} Collection~findAndModifyWriteOpResult
 * @property {object} value Document returned from findAndModify command.
 * @property {object} lastErrorObject The raw lastErrorObject returned from the command.
 * @property {Number} ok Is 1 if the command executed correctly.
 */

/**
 * The callback format for inserts
 * @callback Collection~findAndModifyCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {Collection~findAndModifyWriteOpResult} result The result object if the command was executed successfully.
 */

/**
 * Find a document and delete it in one atomic operation, requires a write lock for the duration of the operation.
 *
 * @method
 * @param {object} filter Document selection filter.
 * @param {object} [options=null] Optional settings.
 * @param {object} [options.projection=null] Limits the fields to return for all matching documents.
 * @param {object} [options.sort=null] Determines which document the operation modifies if the query selects multiple documents.
 * @param {number} [options.maxTimeMS=null] The maximum amount of time to allow the query to run.
 * @param {Collection~findAndModifyCallback} [callback] The collection result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.findOneAndDelete = function(filter, options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};

  // Basic validation
  if(filter == null || typeof filter != 'object') throw toError('filter parameter must be an object');

  // Execute using callback
  if(typeof callback == 'function') return findOneAndDelete(self, filter, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    options = options || {};

    findOneAndDelete(self, filter, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var findOneAndDelete = function(self, filter, options, callback) {
  // Final options
  var finalOptions = shallowClone(options);
  finalOptions['fields'] = options.projection;
  finalOptions['remove'] = true;
  // Execute find and Modify
  self.findAndModify(
      filter
    , options.sort
    , null
    , finalOptions
    , callback
  );
}

define.classMethod('findOneAndDelete', {callback: true, promise:true});

/**
 * Find a document and replace it in one atomic operation, requires a write lock for the duration of the operation.
 *
 * @method
 * @param {object} filter Document selection filter.
 * @param {object} replacement Document replacing the matching document.
 * @param {object} [options=null] Optional settings.
 * @param {object} [options.projection=null] Limits the fields to return for all matching documents.
 * @param {object} [options.sort=null] Determines which document the operation modifies if the query selects multiple documents.
 * @param {number} [options.maxTimeMS=null] The maximum amount of time to allow the query to run.
 * @param {boolean} [options.upsert=false] Upsert the document if it does not exist.
 * @param {boolean} [options.returnOriginal=true] When false, returns the updated document rather than the original. The default is true.
 * @param {Collection~findAndModifyCallback} [callback] The collection result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.findOneAndReplace = function(filter, replacement, options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};

  // Basic validation
  if(filter == null || typeof filter != 'object') throw toError('filter parameter must be an object');
  if(replacement == null || typeof replacement != 'object') throw toError('replacement parameter must be an object');

  // Execute using callback
  if(typeof callback == 'function') return findOneAndReplace(self, filter, replacement, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    options = options || {};

    findOneAndReplace(self, filter, replacement, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var findOneAndReplace = function(self, filter, replacement, options, callback) {
  // Final options
  var finalOptions = shallowClone(options);
  finalOptions['fields'] = options.projection;
  finalOptions['update'] = true;
  finalOptions['new'] = typeof options.returnOriginal == 'boolean' ? !options.returnOriginal : false;
  finalOptions['upsert'] = typeof options.upsert == 'boolean' ? options.upsert : false;

  // Execute findAndModify
  self.findAndModify(
      filter
    , options.sort
    , replacement
    , finalOptions
    , callback
  );
}

define.classMethod('findOneAndReplace', {callback: true, promise:true});

/**
 * Find a document and update it in one atomic operation, requires a write lock for the duration of the operation.
 *
 * @method
 * @param {object} filter Document selection filter.
 * @param {object} update Update operations to be performed on the document
 * @param {object} [options=null] Optional settings.
 * @param {object} [options.projection=null] Limits the fields to return for all matching documents.
 * @param {object} [options.sort=null] Determines which document the operation modifies if the query selects multiple documents.
 * @param {number} [options.maxTimeMS=null] The maximum amount of time to allow the query to run.
 * @param {boolean} [options.upsert=false] Upsert the document if it does not exist.
 * @param {boolean} [options.returnOriginal=true] When false, returns the updated document rather than the original. The default is true.
 * @param {Collection~findAndModifyCallback} [callback] The collection result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.findOneAndUpdate = function(filter, update, options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};

  // Basic validation
  if(filter == null || typeof filter != 'object') throw toError('filter parameter must be an object');
  if(update == null || typeof update != 'object') throw toError('update parameter must be an object');

  // Execute using callback
  if(typeof callback == 'function') return findOneAndUpdate(self, filter, update, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    options = options || {};

    findOneAndUpdate(self, filter, update, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var findOneAndUpdate = function(self, filter, update, options, callback) {
  // Final options
  var finalOptions = shallowClone(options);
  finalOptions['fields'] = options.projection;
  finalOptions['update'] = true;
  finalOptions['new'] = options.returnOriginal !== void 0 ? !options.returnOriginal : false;
  finalOptions['upsert'] = options.upsert !== void 0 ? !!options.upsert : false;

  // Execute findAndModify
  self.findAndModify(
      filter
    , options.sort
    , update
    , finalOptions
    , callback
  );
}

define.classMethod('findOneAndUpdate', {callback: true, promise:true});

/**
 * Find and update a document.
 * @method
 * @param {object} query Query object to locate the object to modify.
 * @param {array} sort If multiple docs match, choose the first one in the specified sort order as the object to manipulate.
 * @param {object} doc The fields/vals to be updated.
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.remove=false] Set to true to remove the object before returning.
 * @param {boolean} [options.upsert=false] Perform an upsert operation.
 * @param {boolean} [options.new=false] Set to true if you want to return the modified object rather than the original. Ignored for remove.
 * @param {object} [options.fields=null] Object containing the field projection for the result returned from the operation.
 * @param {Collection~findAndModifyCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 * @deprecated use findOneAndUpdate, findOneAndReplace or findOneAndDelete instead
 */
Collection.prototype.findAndModify = function(query, sort, doc, options, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  sort = args.length ? args.shift() || [] : [];
  doc = args.length ? args.shift() : null;
  options = args.length ? args.shift() || {} : {};

  // Clone options
  options = shallowClone(options);
  // Force read preference primary
  options.readPreference = ReadPreference.PRIMARY;

  // Execute using callback
  if(typeof callback == 'function') return findAndModify(self, query, sort, doc, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    options = options || {};

    findAndModify(self, query, sort, doc, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var findAndModify = function(self, query, sort, doc, options, callback) {
  // Create findAndModify command object
  var queryObject = {
     'findandmodify': self.s.name
   , 'query': query
  };

  sort = formattedOrderClause(sort);
  if(sort) {
    queryObject.sort = sort;
  }

  queryObject.new = options.new ? true : false;
  queryObject.remove = options.remove ? true : false;
  queryObject.upsert = options.upsert ? true : false;

  if(options.fields) {
    queryObject.fields = options.fields;
  }

  if(doc && !options.remove) {
    queryObject.update = doc;
  }

  if(options.maxTimeMS)
    queryObject.maxTimeMS = options.maxTimeMS;

  // Either use override on the function, or go back to default on either the collection
  // level or db
  if(options['serializeFunctions'] != null) {
    options['serializeFunctions'] = options['serializeFunctions'];
  } else {
    options['serializeFunctions'] = self.s.serializeFunctions;
  }

  // No check on the documents
  options.checkKeys = false;

  // Get the write concern settings
  var finalOptions = writeConcern(options, self.s.db, self, options);

  // Decorate the findAndModify command with the write Concern
  if(finalOptions.writeConcern) {
    queryObject.writeConcern = finalOptions.writeConcern;
  }

  // Have we specified bypassDocumentValidation
  if(typeof finalOptions.bypassDocumentValidation == 'boolean') {
    queryObject.bypassDocumentValidation = finalOptions.bypassDocumentValidation;
  }

  // Have we specified collation
  decorateWithCollation(queryObject, self, options);

  // Execute the command
  self.s.db.command(queryObject
    , options, function(err, result) {
      if(err) return handleCallback(callback, err, null);
      return handleCallback(callback, null, result);
  });
}

define.classMethod('findAndModify', {callback: true, promise:true});

/**
 * Find and remove a document.
 * @method
 * @param {object} query Query object to locate the object to modify.
 * @param {array} sort If multiple docs match, choose the first one in the specified sort order as the object to manipulate.
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {Collection~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 * @deprecated use findOneAndDelete instead
 */
Collection.prototype.findAndRemove = function(query, sort, options, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  sort = args.length ? args.shift() || [] : [];
  options = args.length ? args.shift() || {} : {};

  // Execute using callback
  if(typeof callback == 'function') return findAndRemove(self, query, sort, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    findAndRemove(self, query, sort, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var findAndRemove = function(self, query, sort, options, callback) {
  // Add the remove option
  options['remove'] = true;
  // Execute the callback
  self.findAndModify(query, sort, null, options, callback);
}

define.classMethod('findAndRemove', {callback: true, promise:true});

function decorateWithWriteConcern(command, self, options) {
  // Do we support collation 3.4 and higher
  var capabilities = self.s.topology.capabilities();
  // Do we support write concerns 3.4 and higher
  if(capabilities && capabilities.commandsTakeWriteConcern) {
    // Get the write concern settings
    var finalOptions = writeConcern(shallowClone(options), self.s.db, self, options);
    // Add the write concern to the command
    if(finalOptions.writeConcern) {
      command.writeConcern = finalOptions.writeConcern;
    }
  }
}

function decorateWithCollation(command, self, options) {
  // Do we support collation 3.4 and higher
  var capabilities = self.s.topology.capabilities();
  // Do we support write concerns 3.4 and higher
  if(capabilities && capabilities.commandsTakeCollation) {
    if(options.collation && typeof options.collation == 'object') {
      command.collation = options.collation;
    }
  }
}

/**
 * Execute an aggregation framework pipeline against the collection, needs MongoDB >= 2.2
 * @method
 * @param {object} pipeline Array containing all the aggregation framework commands for the execution.
 * @param {object} [options=null] Optional settings.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {object} [options.cursor=null] Return the query as cursor, on 2.6 > it returns as a real cursor on pre 2.6 it returns as an emulated cursor.
 * @param {number} [options.cursor.batchSize=null] The batchSize for the cursor
 * @param {boolean} [options.explain=false] Explain returns the aggregation execution plan (requires mongodb 2.6 >).
 * @param {boolean} [options.allowDiskUse=false] allowDiskUse lets the server know if it can use disk to store temporary results for the aggregation (requires mongodb 2.6 >).
 * @param {number} [options.maxTimeMS=null] maxTimeMS specifies a cumulative time limit in milliseconds for processing operations on the cursor. MongoDB interrupts the operation at the earliest following interrupt point.
 * @param {boolean} [options.bypassDocumentValidation=false] Allow driver to bypass schema validation in MongoDB 3.2 or higher.
 * @param {boolean} [options.raw=false] Return document results as raw BSON buffers.
 * @param {boolean} [options.promoteLongs=true] Promotes Long values to number if they fit inside the 53 bits resolution.
 * @param {boolean} [options.promoteValues=true] Promotes BSON values to native types where possible, set to false to only receive wrapper types.
 * @param {boolean} [options.promoteBuffers=false] Promotes Binary BSON values to native Node Buffers.
 * @param {object} [options.collation=null] Specify collation (MongoDB 3.4 or higher) settings for update operation (see 3.4 documentation for available fields).
 * @param {Collection~resultCallback} callback The command result callback
 * @return {(null|AggregationCursor)}
 */
Collection.prototype.aggregate = function(pipeline, options, callback) {
  var self = this;

  if(Array.isArray(pipeline)) {
    // Set up callback if one is provided
    if(typeof options == 'function') {
      callback = options;
      options = {};
    }

    // If we have no options or callback we are doing
    // a cursor based aggregation
    if(options == null && callback == null) {
      options = {};
    }
  } else {
    // Aggregation pipeline passed as arguments on the method
    var args = Array.prototype.slice.call(arguments, 0);
    // Get the callback
    callback = args.pop();
    // Get the possible options object
    var opts = args[args.length - 1];
    // If it contains any of the admissible options pop it of the args
    options = opts && (opts.readPreference
      || opts.explain || opts.cursor || opts.out
      || opts.maxTimeMS || opts.allowDiskUse) ? args.pop() : {};
      // Left over arguments is the pipeline
    pipeline = args;
  }

  // Ignore readConcern option
  var ignoreReadConcern = false;

  // Build the command
  var command = { aggregate : this.s.name, pipeline : pipeline};

  // If out was specified
  if(typeof options.out == 'string') {
    pipeline.push({$out: options.out});
    // Ignore read concern
    ignoreReadConcern = true;
  } else if(pipeline.length > 0 && pipeline[pipeline.length - 1]['$out']) {
    ignoreReadConcern = true;
  }

  // Decorate command with writeConcern if out has been specified
  if(pipeline.length > 0 && pipeline[pipeline.length - 1]['$out']) {
    decorateWithWriteConcern(command, self, options);
  }

  // Have we specified collation
  decorateWithCollation(command, self, options);

  // If we have bypassDocumentValidation set
  if(typeof options.bypassDocumentValidation == 'boolean') {
    command.bypassDocumentValidation = options.bypassDocumentValidation;
  }

  // Do we have a readConcern specified
  if(!ignoreReadConcern && this.s.readConcern) {
    command.readConcern = this.s.readConcern;
  }

  // If we have allowDiskUse defined
  if(options.allowDiskUse) command.allowDiskUse = options.allowDiskUse;
  if(typeof options.maxTimeMS == 'number') command.maxTimeMS = options.maxTimeMS;

  options = shallowClone(options);
  // Ensure we have the right read preference inheritance
  options = getReadPreference(this, options, this.s.db, this);

  // If explain has been specified add it
  if (options.explain) command.explain = options.explain;

  // Validate that cursor options is valid
  if(options.cursor != null && typeof options.cursor != 'object') {
    throw toError('cursor options must be an object');
  }

  if (this.s.topology.capabilities().hasAggregationCursor) {
    options.cursor = options.cursor || { batchSize : 1000 };
    command.cursor = options.cursor;
  }

  // promiseLibrary
  options.promiseLibrary = this.s.promiseLibrary;

  // Set the AggregationCursor constructor
  options.cursorFactory = AggregationCursor;
  if(typeof callback != 'function') {
    if(!this.s.topology.capabilities()) {
      throw new MongoError('cannot connect to server');
    }

    // Allow disk usage command
    if(typeof options.allowDiskUse == 'boolean') command.allowDiskUse = options.allowDiskUse;
    if(typeof options.maxTimeMS == 'number') command.maxTimeMS = options.maxTimeMS;

    // Execute the cursor
    return this.s.topology.cursor(this.s.namespace, command, options);
  }

  if (options.cursor) {
    var cursor = this.s.topology.cursor(this.s.namespace, command, options);
    return cursor.toArray(function(err, result) {
      if (err) {
        return handleCallback(callback, err);
      }

      handleCallback(callback, null, result);
    });
  }

  // For legacy server versions, we execute the command and format the result
  this.s.db.command(command, options, function(err, result) {
    if(err) {
      handleCallback(callback, err);
    } else if(result['err'] || result['errmsg']) {
      handleCallback(callback, toError(result));
    } else if(typeof result == 'object' && result['serverPipeline']) {
      handleCallback(callback, null, result['serverPipeline']);
    } else if(typeof result == 'object' && result['stages']) {
      handleCallback(callback, null, result['stages']);
    } else {
      handleCallback(callback, null, result.result);
    }
  });
}

define.classMethod('aggregate', {callback: true, promise:false});

/**
 * The callback format for results
 * @callback Collection~parallelCollectionScanCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {Cursor[]} cursors A list of cursors returned allowing for parallel reading of collection.
 */

/**
 * Return N number of parallel cursors for a collection allowing parallel reading of entire collection. There are
 * no ordering guarantees for returned results.
 * @method
 * @param {object} [options=null] Optional settings.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {number} [options.batchSize=null] Set the batchSize for the getMoreCommand when iterating over the query results.
 * @param {number} [options.numCursors=1] The maximum number of parallel command cursors to return (the number of returned cursors will be in the range 1:numCursors)
 * @param {boolean} [options.raw=false] Return all BSON documents as Raw Buffer documents.
 * @param {Collection~parallelCollectionScanCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.parallelCollectionScan = function(options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {numCursors: 1};
  // Set number of cursors to 1
  options.numCursors = options.numCursors || 1;
  options.batchSize = options.batchSize || 1000;

  options = shallowClone(options);
  // Ensure we have the right read preference inheritance
  options = getReadPreference(this, options, this.s.db, this);

  // Add a promiseLibrary
  options.promiseLibrary = this.s.promiseLibrary;

  // Execute using callback
  if(typeof callback == 'function') return parallelCollectionScan(self, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    parallelCollectionScan(self, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var parallelCollectionScan = function(self, options, callback) {
  // Create command object
  var commandObject = {
      parallelCollectionScan: self.s.name
    , numCursors: options.numCursors
  }

  // Do we have a readConcern specified
  if(self.s.readConcern) {
    commandObject.readConcern = self.s.readConcern;
  }

  // Store the raw value
  var raw = options.raw;
  delete options['raw'];

  // Execute the command
  self.s.db.command(commandObject, options, function(err, result) {
    if(err) return handleCallback(callback, err, null);
    if(result == null) return handleCallback(callback, new Error("no result returned for parallelCollectionScan"), null);

    var cursors = [];
    // Add the raw back to the option
    if(raw) options.raw = raw;
    // Create command cursors for each item
    for(var i = 0; i < result.cursors.length; i++) {
      var rawId = result.cursors[i].cursor.id
      // Convert cursorId to Long if needed
      var cursorId = typeof rawId == 'number' ? Long.fromNumber(rawId) : rawId;
      // Add a command cursor
      cursors.push(self.s.topology.cursor(self.s.namespace, cursorId, options));
    }

    handleCallback(callback, null, cursors);
  });
}

define.classMethod('parallelCollectionScan', {callback: true, promise:true});

/**
 * Execute the geoNear command to search for items in the collection
 *
 * @method
 * @param {number} x Point to search on the x axis, ensure the indexes are ordered in the same order.
 * @param {number} y Point to search on the y axis, ensure the indexes are ordered in the same order.
 * @param {object} [options=null] Optional settings.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {number} [options.num=null] Max number of results to return.
 * @param {number} [options.minDistance=null] Include results starting at minDistance from a point (2.6 or higher)
 * @param {number} [options.maxDistance=null] Include results up to maxDistance from the point.
 * @param {number} [options.distanceMultiplier=null] Include a value to multiply the distances with allowing for range conversions.
 * @param {object} [options.query=null] Filter the results by a query.
 * @param {boolean} [options.spherical=false] Perform query using a spherical model.
 * @param {boolean} [options.uniqueDocs=false] The closest location in a document to the center of the search region will always be returned MongoDB > 2.X.
 * @param {boolean} [options.includeLocs=false] Include the location data fields in the top level of the results MongoDB > 2.X.
 * @param {Collection~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.geoNear = function(x, y, options, callback) {
  var self = this;
  var point = typeof(x) == 'object' && x
    , args = Array.prototype.slice.call(arguments, point?1:2);

  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  // Fetch all commands
  options = args.length ? args.shift() || {} : {};

  // Execute using callback
  if(typeof callback == 'function') return geoNear(self, x, y, point, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    geoNear(self, x, y, point, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var geoNear = function(self, x, y, point, options, callback) {
  // Build command object
  var commandObject = {
    geoNear:self.s.name,
    near: point || [x, y]
  }

  options = shallowClone(options);
  // Ensure we have the right read preference inheritance
  options = getReadPreference(self, options, self.s.db, self);

  // Exclude readPreference and existing options to prevent user from
  // shooting themselves in the foot
  var exclude = {
    readPreference: true,
    geoNear: true,
    near: true
  };

  // Filter out any excluded objects
  commandObject = decorateCommand(commandObject, options, exclude);

  // Do we have a readConcern specified
  if(self.s.readConcern) {
    commandObject.readConcern = self.s.readConcern;
  }

  // Have we specified collation
  decorateWithCollation(commandObject, self, options);

  // Execute the command
  self.s.db.command(commandObject, options, function (err, res) {
    if(err) return handleCallback(callback, err);
    if(res.err || res.errmsg) return handleCallback(callback, toError(res));
    // should we only be returning res.results here? Not sure if the user
    // should see the other return information
    handleCallback(callback, null, res);
  });
}

define.classMethod('geoNear', {callback: true, promise:true});

/**
 * Execute a geo search using a geo haystack index on a collection.
 *
 * @method
 * @param {number} x Point to search on the x axis, ensure the indexes are ordered in the same order.
 * @param {number} y Point to search on the y axis, ensure the indexes are ordered in the same order.
 * @param {object} [options=null] Optional settings.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {number} [options.maxDistance=null] Include results up to maxDistance from the point.
 * @param {object} [options.search=null] Filter the results by a query.
 * @param {number} [options.limit=false] Max number of results to return.
 * @param {Collection~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.geoHaystackSearch = function(x, y, options, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 2);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  // Fetch all commands
  options = args.length ? args.shift() || {} : {};

  // Execute using callback
  if(typeof callback == 'function') return geoHaystackSearch(self, x, y, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    geoHaystackSearch(self, x, y, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var geoHaystackSearch = function(self, x, y, options, callback) {
  // Build command object
  var commandObject = {
    geoSearch: self.s.name,
    near: [x, y]
  }

  // Remove read preference from hash if it exists
  commandObject = decorateCommand(commandObject, options, {readPreference: true});

  options = shallowClone(options);
  // Ensure we have the right read preference inheritance
  options = getReadPreference(self, options, self.s.db, self);

  // Do we have a readConcern specified
  if(self.s.readConcern) {
    commandObject.readConcern = self.s.readConcern;
  }

  // Execute the command
  self.s.db.command(commandObject, options, function (err, res) {
    if(err) return handleCallback(callback, err);
    if(res.err || res.errmsg) handleCallback(callback, toError(res));
    // should we only be returning res.results here? Not sure if the user
    // should see the other return information
    handleCallback(callback, null, res);
  });
}

define.classMethod('geoHaystackSearch', {callback: true, promise:true});

/**
 * Group function helper
 * @ignore
 */
// var groupFunction = function () {
//   var c = db[ns].find(condition);
//   var map = new Map();
//   var reduce_function = reduce;
//
//   while (c.hasNext()) {
//     var obj = c.next();
//     var key = {};
//
//     for (var i = 0, len = keys.length; i < len; ++i) {
//       var k = keys[i];
//       key[k] = obj[k];
//     }
//
//     var aggObj = map.get(key);
//
//     if (aggObj == null) {
//       var newObj = Object.extend({}, key);
//       aggObj = Object.extend(newObj, initial);
//       map.put(key, aggObj);
//     }
//
//     reduce_function(obj, aggObj);
//   }
//
//   return { "result": map.values() };
// }.toString();
var groupFunction = 'function () {\nvar c = db[ns].find(condition);\nvar map = new Map();\nvar reduce_function = reduce;\n\nwhile (c.hasNext()) {\nvar obj = c.next();\nvar key = {};\n\nfor (var i = 0, len = keys.length; i < len; ++i) {\nvar k = keys[i];\nkey[k] = obj[k];\n}\n\nvar aggObj = map.get(key);\n\nif (aggObj == null) {\nvar newObj = Object.extend({}, key);\naggObj = Object.extend(newObj, initial);\nmap.put(key, aggObj);\n}\n\nreduce_function(obj, aggObj);\n}\n\nreturn { "result": map.values() };\n}';

/**
 * Run a group command across a collection
 *
 * @method
 * @param {(object|array|function|code)} keys An object, array or function expressing the keys to group by.
 * @param {object} condition An optional condition that must be true for a row to be considered.
 * @param {object} initial Initial value of the aggregation counter object.
 * @param {(function|Code)} reduce The reduce function aggregates (reduces) the objects iterated
 * @param {(function|Code)} finalize An optional function to be run on each item in the result set just before the item is returned.
 * @param {boolean} command Specify if you wish to run using the internal group command or using eval, default is true.
 * @param {object} [options=null] Optional settings.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {Collection~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 * @deprecated MongoDB 3.6 or higher will no longer support the group command. We recommend rewriting using the aggregation framework.
 */
Collection.prototype.group = function(keys, condition, initial, reduce, finalize, command, options, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 3);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  // Fetch all commands
  reduce = args.length ? args.shift() : null;
  finalize = args.length ? args.shift() : null;
  command = args.length ? args.shift() : null;
  options = args.length ? args.shift() || {} : {};

  // Make sure we are backward compatible
  if(!(typeof finalize == 'function')) {
    command = finalize;
    finalize = null;
  }

  if (!Array.isArray(keys) && keys instanceof Object && typeof(keys) !== 'function' && !(keys._bsontype == 'Code')) {
    keys = Object.keys(keys);
  }

  if(typeof reduce === 'function') {
    reduce = reduce.toString();
  }

  if(typeof finalize === 'function') {
    finalize = finalize.toString();
  }

  // Set up the command as default
  command = command == null ? true : command;

  // Execute using callback
  if(typeof callback == 'function') return group(self, keys, condition, initial, reduce, finalize, command, options, callback);
  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    group(self, keys, condition, initial, reduce, finalize, command, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

var group = function(self, keys, condition, initial, reduce, finalize, command, options, callback) {
  // Execute using the command
  if(command) {
    var reduceFunction = reduce && reduce._bsontype == 'Code'
        ? reduce
        : new Code(reduce);

    var selector = {
      group: {
          'ns': self.s.name
        , '$reduce': reduceFunction
        , 'cond': condition
        , 'initial': initial
        , 'out': "inline"
      }
    };

    // if finalize is defined
    if(finalize != null) selector.group['finalize'] = finalize;
    // Set up group selector
    if ('function' === typeof keys || (keys && keys._bsontype == 'Code')) {
      selector.group.$keyf = keys && keys._bsontype == 'Code'
        ? keys
        : new Code(keys);
    } else {
      var hash = {};
      keys.forEach(function (key) {
        hash[key] = 1;
      });
      selector.group.key = hash;
    }

    options = shallowClone(options);
    // Ensure we have the right read preference inheritance
    options = getReadPreference(self, options, self.s.db, self);

    // Do we have a readConcern specified
    if(self.s.readConcern) {
      selector.readConcern = self.s.readConcern;
    }

    // Have we specified collation
    decorateWithCollation(selector, self, options);

    // Execute command
    self.s.db.command(selector, options, function(err, result) {
      if(err) return handleCallback(callback, err, null);
      handleCallback(callback, null, result.retval);
    });
  } else {
    // Create execution scope
    var scope = reduce != null && reduce._bsontype == 'Code'
      ? reduce.scope
      : {};

    scope.ns = self.s.name;
    scope.keys = keys;
    scope.condition = condition;
    scope.initial = initial;

    // Pass in the function text to execute within mongodb.
    var groupfn = groupFunction.replace(/ reduce;/, reduce.toString() + ';');

    self.s.db.eval(new Code(groupfn, scope), function (err, results) {
      if (err) return handleCallback(callback, err, null);
      handleCallback(callback, null, results.result || results);
    });
  }
}

define.classMethod('group', {callback: true, promise:true});

/**
 * Functions that are passed as scope args must
 * be converted to Code instances.
 * @ignore
 */
function processScope (scope) {
  if(!isObject(scope) || scope._bsontype == 'ObjectID') {
    return scope;
  }

  var keys = Object.keys(scope);
  var i = keys.length;
  var key;
  var new_scope = {};

  while (i--) {
    key = keys[i];
    if ('function' == typeof scope[key]) {
      new_scope[key] = new Code(String(scope[key]));
    } else {
      new_scope[key] = processScope(scope[key]);
    }
  }

  return new_scope;
}

/**
 * Run Map Reduce across a collection. Be aware that the inline option for out will return an array of results not a collection.
 *
 * @method
 * @param {(function|string)} map The mapping function.
 * @param {(function|string)} reduce The reduce function.
 * @param {object} [options=null] Optional settings.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {object} [options.out=null] Sets the output target for the map reduce job. *{inline:1} | {replace:'collectionName'} | {merge:'collectionName'} | {reduce:'collectionName'}*
 * @param {object} [options.query=null] Query filter object.
 * @param {object} [options.sort=null] Sorts the input objects using this key. Useful for optimization, like sorting by the emit key for fewer reduces.
 * @param {number} [options.limit=null] Number of objects to return from collection.
 * @param {boolean} [options.keeptemp=false] Keep temporary data.
 * @param {(function|string)} [options.finalize=null] Finalize function.
 * @param {object} [options.scope=null] Can pass in variables that can be access from map/reduce/finalize.
 * @param {boolean} [options.jsMode=false] It is possible to make the execution stay in JS. Provided in MongoDB > 2.0.X.
 * @param {boolean} [options.verbose=false] Provide statistics on job execution time.
 * @param {boolean} [options.bypassDocumentValidation=false] Allow driver to bypass schema validation in MongoDB 3.2 or higher.
 * @param {Collection~resultCallback} [callback] The command result callback
 * @throws {MongoError}
 * @return {Promise} returns Promise if no callback passed
 */
Collection.prototype.mapReduce = function(map, reduce, options, callback) {
  var self = this;
  if('function' === typeof options) callback = options, options = {};
  // Out must allways be defined (make sure we don't break weirdly on pre 1.8+ servers)
  if(null == options.out) {
    throw new Error("the out option parameter must be defined, see mongodb docs for possible values");
  }

  if('function' === typeof map) {
    map = map.toString();
  }

  if('function' === typeof reduce) {
    reduce = reduce.toString();
  }

  if('function' === typeof options.finalize) {
    options.finalize = options.finalize.toString();
  }

  // Execute using callback
  if(typeof callback == 'function') return mapReduce(self, map, reduce, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    mapReduce(self, map, reduce, options, function(err, r, r1) {
      if(err) return reject(err);
      if(!r1) return resolve(r);
      resolve({results: r, stats: r1});
    });
  });
}

var mapReduce = function(self, map, reduce, options, callback) {
  var mapCommandHash = {
      mapreduce: self.s.name
    , map: map
    , reduce: reduce
  };

  // Exclusion list
  var exclusionList = ['readPreference'];

  // Add any other options passed in
  for(var n in options) {
    if('scope' == n) {
      mapCommandHash[n] = processScope(options[n]);
    } else {
      // Only include if not in exclusion list
      if(exclusionList.indexOf(n) == -1) {
        mapCommandHash[n] = options[n];
      }
    }
  }

  options = shallowClone(options);

  // Ensure we have the right read preference inheritance
  options = getReadPreference(self, options, self.s.db, self);

  // If we have a read preference and inline is not set as output fail hard
  if((options.readPreference != false && options.readPreference != 'primary')
    && options['out'] && (options['out'].inline != 1 && options['out'] != 'inline')) {
      // Force readPreference to primary
      options.readPreference = 'primary';
      // Decorate command with writeConcern if supported
      decorateWithWriteConcern(mapCommandHash, self, options);
  } else if(self.s.readConcern) {
    mapCommandHash.readConcern = self.s.readConcern;
  }

  // Is bypassDocumentValidation specified
  if(typeof options.bypassDocumentValidation == 'boolean') {
    mapCommandHash.bypassDocumentValidation = options.bypassDocumentValidation;
  }

  // Have we specified collation
  decorateWithCollation(mapCommandHash, self, options);

  // Execute command
  self.s.db.command(mapCommandHash, {readPreference:options.readPreference}, function (err, result) {
    if(err) return handleCallback(callback, err);
    // Check if we have an error
    if(1 != result.ok || result.err || result.errmsg) {
      return handleCallback(callback, toError(result));
    }

    // Create statistics value
    var stats = {};
    if(result.timeMillis) stats['processtime'] = result.timeMillis;
    if(result.counts) stats['counts'] = result.counts;
    if(result.timing) stats['timing'] = result.timing;

    // invoked with inline?
    if(result.results) {
      // If we wish for no verbosity
      if(options['verbose'] == null || !options['verbose']) {
        return handleCallback(callback, null, result.results);
      }

      return handleCallback(callback, null, result.results, stats);
    }

    // The returned collection
    var collection = null;

    // If we have an object it's a different db
    if(result.result != null && typeof result.result == 'object') {
      var doc = result.result;
      collection = self.s.db.db(doc.db).collection(doc.collection);
    } else {
      // Create a collection object that wraps the result collection
      collection = self.s.db.collection(result.result)
    }

    // If we wish for no verbosity
    if(options['verbose'] == null || !options['verbose']) {
      return handleCallback(callback, err, collection);
    }

    // Return stats as third set of values
    handleCallback(callback, err, collection, stats);
  });
}

define.classMethod('mapReduce', {callback: true, promise:true});

/**
 * Initiate a Out of order batch write operation. All operations will be buffered into insert/update/remove commands executed out of order.
 *
 * @method
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @return {UnorderedBulkOperation}
 */
Collection.prototype.initializeUnorderedBulkOp = function(options) {
  options = options || {};
  options.promiseLibrary = this.s.promiseLibrary;
  return unordered(this.s.topology, this, options);
}

define.classMethod('initializeUnorderedBulkOp', {callback: false, promise:false, returns: [ordered.UnorderedBulkOperation]});

/**
 * Initiate an In order bulk write operation, operations will be serially executed in the order they are added, creating a new operation for each switch in types.
 *
 * @method
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {OrderedBulkOperation} callback The command result callback
 * @return {null}
 */
Collection.prototype.initializeOrderedBulkOp = function(options) {
  options = options || {};
  options.promiseLibrary = this.s.promiseLibrary;
  return ordered(this.s.topology, this, options);
}

define.classMethod('initializeOrderedBulkOp', {callback: false, promise:false, returns: [ordered.OrderedBulkOperation]});

// Get write concern
var writeConcern = function(target, db, col, options) {
  if(options.w != null || options.j != null || options.fsync != null) {
    var opts = {};
    if(options.w != null) opts.w = options.w;
    if(options.wtimeout != null) opts.wtimeout = options.wtimeout;
    if(options.j != null) opts.j = options.j;
    if(options.fsync != null) opts.fsync = options.fsync;
    target.writeConcern = opts;
  } else if(col.writeConcern.w != null || col.writeConcern.j != null || col.writeConcern.fsync != null) {
    target.writeConcern = col.writeConcern;
  } else if(db.writeConcern.w != null || db.writeConcern.j != null || db.writeConcern.fsync != null) {
    target.writeConcern = db.writeConcern;
  }

  return target
}

// Figure out the read preference
var getReadPreference = function(self, options, db) {
  var r = null
  if(options.readPreference) {
    r = options.readPreference
  } else if(self.s.readPreference) {
    r = self.s.readPreference
  } else if(db.s.readPreference) {
    r = db.s.readPreference;
  }

  if(r instanceof ReadPreference) {
    options.readPreference = new CoreReadPreference(r.mode, r.tags, {maxStalenessSeconds: r.maxStalenessSeconds});
  } else if(typeof r == 'string') {
    options.readPreference = new CoreReadPreference(r);
  } else if(r && !(r instanceof ReadPreference) && typeof r == 'object') {
    var mode = r.mode || r.preference;
    if (mode && typeof mode == 'string') {
      options.readPreference = new CoreReadPreference(mode, r.tags, {maxStalenessSeconds: r.maxStalenessSeconds});
    }
  }

  return options;
}

var testForFields = {
    limit: 1, sort: 1, fields:1, skip: 1, hint: 1, explain: 1, snapshot: 1, timeout: 1, tailable: 1, tailableRetryInterval: 1
  , numberOfRetries: 1, awaitdata: 1, awaitData: 1, exhaust: 1, batchSize: 1, returnKey: 1, maxScan: 1, min: 1, max: 1, showDiskLoc: 1
  , comment: 1, raw: 1, readPreference: 1, partial: 1, read: 1, dbName: 1, oplogReplay: 1, connection: 1, maxTimeMS: 1, transforms: 1
  , collation: 1
  , noCursorTimeout: 1
}

module.exports = Collection;


/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var EventEmitter = __webpack_require__(8).EventEmitter
  , inherits = __webpack_require__(2).inherits
  , CServer = __webpack_require__(1).Server
  , Cursor = __webpack_require__(7)
  , AggregationCursor = __webpack_require__(12)
  , CommandCursor = __webpack_require__(11)
  , f = __webpack_require__(2).format
  , ServerCapabilities = __webpack_require__(14).ServerCapabilities
  , Store = __webpack_require__(14).Store
  , Define = __webpack_require__(4)
  , MongoError = __webpack_require__(1).MongoError
  , MAX_JS_INT = __webpack_require__(0).MAX_JS_INT
  , translateOptions = __webpack_require__(0).translateOptions
  , filterOptions = __webpack_require__(0).filterOptions
  , mergeOptions = __webpack_require__(0).mergeOptions
  , getReadPreference = __webpack_require__(0).getReadPreference
  , os = __webpack_require__(36);

// Get package.json variable
var driverVersion = __webpack_require__(37).version;
var nodejsversion = f('Node.js %s, %s', process.version, os.endianness());
var type = os.type();
var name = process.platform;
var architecture = process.arch;
var release = os.release();

/**
 * @fileOverview The **Server** class is a class that represents a single server topology and is
 * used to construct connections.
 *
 * **Server Should not be used, use MongoClient.connect**
 * @example
 * var Db = require('mongodb').Db,
 *   Server = require('mongodb').Server,
 *   test = require('assert');
 * // Connect using single Server
 * var db = new Db('test', new Server('localhost', 27017););
 * db.open(function(err, db) {
 *   // Get an additional db
 *   db.close();
 * });
 */

 // Allowed parameters
 var legalOptionNames = ['ha', 'haInterval', 'acceptableLatencyMS'
   , 'poolSize', 'ssl', 'checkServerIdentity', 'sslValidate', 'ciphers', 'ecdhCurve'
   , 'sslCA', 'sslCRL', 'sslCert', 'sslKey', 'sslPass', 'socketOptions', 'bufferMaxEntries'
   , 'store', 'auto_reconnect', 'autoReconnect', 'emitError'
   , 'keepAlive', 'noDelay', 'connectTimeoutMS', 'socketTimeoutMS', 'family'
   , 'loggerLevel', 'logger', 'reconnectTries', 'reconnectInterval', 'monitoring'
   , 'appname', 'domainsEnabled'
   , 'servername', 'promoteLongs', 'promoteValues', 'promoteBuffers'];

/**
 * Creates a new Server instance
 * @class
 * @deprecated
 * @param {string} host The host for the server, can be either an IP4, IP6 or domain socket style host.
 * @param {number} [port] The server port if IP4.
 * @param {object} [options=null] Optional settings.
 * @param {number} [options.poolSize=5] Number of connections in the connection pool for each server instance, set to 5 as default for legacy reasons.
 * @param {boolean} [options.ssl=false] Use ssl connection (needs to have a mongod server with ssl support)
 * @param {object} [options.sslValidate=true] Validate mongod server certificate against ca (needs to have a mongod server with ssl support, 2.4 or higher)
 * @param {boolean|function} [options.checkServerIdentity=true] Ensure we check server identify during SSL, set to false to disable checking. Only works for Node 0.12.x or higher. You can pass in a boolean or your own checkServerIdentity override function.
 * @param {array} [options.sslCA=null] Array of valid certificates either as Buffers or Strings (needs to have a mongod server with ssl support, 2.4 or higher)
 * @param {array} [options.sslCRL=null] Array of revocation certificates either as Buffers or Strings (needs to have a mongod server with ssl support, 2.4 or higher)
 * @param {(Buffer|string)} [options.sslCert=null] String or buffer containing the certificate we wish to present (needs to have a mongod server with ssl support, 2.4 or higher)
 * @param {(Buffer|string)} [options.sslKey=null] String or buffer containing the certificate private key we wish to present (needs to have a mongod server with ssl support, 2.4 or higher)
 * @param {(Buffer|string)} [options.sslPass=null] String or buffer containing the certificate password (needs to have a mongod server with ssl support, 2.4 or higher)
 * @param {string} [options.servername=null] String containing the server name requested via TLS SNI.
 * @param {boolean} [options.autoReconnect=true] Reconnect on error or timeout.
 * @param {object} [options.socketOptions=null] Socket options
 * @param {boolean} [options.socketOptions.noDelay=true] TCP Socket NoDelay option.
 * @param {number} [options.socketOptions.keepAlive=0] TCP KeepAlive on the socket with a X ms delay before start.
 * @param {number} [options.socketOptions.connectTimeoutMS=0] TCP Connection timeout setting
 * @param {number} [options.socketOptions.socketTimeoutMS=0] TCP Socket timeout setting
 * @param {number} [options.reconnectTries=30] Server attempt to reconnect #times
 * @param {number} [options.reconnectInterval=1000] Server will wait # milliseconds between retries
 * @param {number} [options.monitoring=true] Triggers the server instance to call ismaster
 * @param {number} [options.haInterval=10000] The interval of calling ismaster when monitoring is enabled.
 * @param {boolean} [options.domainsEnabled=false] Enable the wrapping of the callback in the current domain, disabled by default to avoid perf hit.
 * @fires Server#connect
 * @fires Server#close
 * @fires Server#error
 * @fires Server#timeout
 * @fires Server#parseError
 * @fires Server#reconnect
 * @property {string} parserType the parser type used (c++ or js).
 * @return {Server} a Server instance.
 */
var Server = function(host, port, options) {
  options = options || {};
  if(!(this instanceof Server)) return new Server(host, port, options);
  EventEmitter.call(this);
  var self = this;

  // Filter the options
  options = filterOptions(options, legalOptionNames);

  // Stored options
  var storeOptions = {
      force: false
    , bufferMaxEntries: typeof options.bufferMaxEntries == 'number' ? options.bufferMaxEntries : MAX_JS_INT
  }

  // Shared global store
  var store = options.store || new Store(self, storeOptions);

  // Detect if we have a socket connection
  if(host.indexOf('\/') != -1) {
    if(port != null && typeof port == 'object') {
      options = port;
      port = null;
    }
  } else if(port == null) {
    throw MongoError.create({message: 'port must be specified', driver:true});
  }

  // Get the reconnect option
  var reconnect = typeof options.auto_reconnect == 'boolean' ? options.auto_reconnect : true;
  reconnect = typeof options.autoReconnect == 'boolean' ? options.autoReconnect : reconnect;

  // Clone options
  var clonedOptions = mergeOptions({}, {
    host: host, port: port, disconnectHandler: store,
    cursorFactory: Cursor,
    reconnect: reconnect,
    emitError: typeof options.emitError == 'boolean' ? options.emitError : true,
    size: typeof options.poolSize == 'number' ? options.poolSize : 5
  });

  // Translate any SSL options and other connectivity options
  clonedOptions = translateOptions(clonedOptions, options);

  // Socket options
  var socketOptions = options.socketOptions && Object.keys(options.socketOptions).length > 0
    ? options.socketOptions : options;

  // Translate all the options to the mongodb-core ones
  clonedOptions = translateOptions(clonedOptions, socketOptions);
  if(typeof clonedOptions.keepAlive == 'number') {
    clonedOptions.keepAliveInitialDelay = clonedOptions.keepAlive;
    clonedOptions.keepAlive = clonedOptions.keepAlive > 0;
  }

  // Build default client information
  this.clientInfo = {
    driver: {
      name: "nodejs",
      version: driverVersion
    },
    os: {
      type: type,
      name: name,
      architecture: architecture,
      version: release
    },
    platform: nodejsversion
  }

  // Build default client information
  clonedOptions.clientInfo = this.clientInfo;
  // Do we have an application specific string
  if(options.appname) {
    clonedOptions.clientInfo.application = { name: options.appname };
  }

  // Create an instance of a server instance from mongodb-core
  var server = new CServer(clonedOptions);

  // Define the internal properties
  this.s = {
    // Create an instance of a server instance from mongodb-core
      server: server
    // Server capabilities
    , sCapabilities: null
    // Cloned options
    , clonedOptions: clonedOptions
    // Reconnect
    , reconnect: clonedOptions.reconnect
    // Emit error
    , emitError: clonedOptions.emitError
    // Pool size
    , poolSize: clonedOptions.size
    // Store Options
    , storeOptions: storeOptions
    // Store
    , store: store
    // Host
    , host: host
    // Port
    , port: port
    // Options
    , options: options
  }
}

inherits(Server, EventEmitter);

var define = Server.define = new Define('Server', Server, false);

// BSON property
Object.defineProperty(Server.prototype, 'bson', {
  enumerable: true, get: function() {
    return this.s.server.s.bson;
  }
});

// Last ismaster
Object.defineProperty(Server.prototype, 'isMasterDoc', {
  enumerable:true, get: function() {
    return this.s.server.lastIsMaster();
  }
});

Object.defineProperty(Server.prototype, 'parserType', {
  enumerable:true, get: function() {
    return this.s.server.parserType;
  }
});

// Last ismaster
Object.defineProperty(Server.prototype, 'poolSize', {
  enumerable:true, get: function() { return this.s.server.connections().length; }
});

Object.defineProperty(Server.prototype, 'autoReconnect', {
  enumerable:true, get: function() { return this.s.reconnect; }
});

Object.defineProperty(Server.prototype, 'host', {
  enumerable:true, get: function() { return this.s.host; }
});

Object.defineProperty(Server.prototype, 'port', {
  enumerable:true, get: function() { return this.s.port; }
});

// Connect
Server.prototype.connect = function(db, _options, callback) {
  var self = this;
  if('function' === typeof _options) callback = _options, _options = {};
  if(_options == null) _options = {};
  if(!('function' === typeof callback)) callback = null;
  self.s.options = _options;

  // Update bufferMaxEntries
  self.s.storeOptions.bufferMaxEntries = db.bufferMaxEntries;

  // Error handler
  var connectErrorHandler = function() {
    return function(err) {
      // Remove all event handlers
      var events = ['timeout', 'error', 'close'];
      events.forEach(function(e) {
        self.s.server.removeListener(e, connectHandlers[e]);
      });

      self.s.server.removeListener('connect', connectErrorHandler);

      // Try to callback
      try {
        callback(err);
      } catch(err) {
        process.nextTick(function() { throw err; })
      }
    }
  }

  // Actual handler
  var errorHandler = function(event) {
    return function(err) {
      if(event != 'error') {
        self.emit(event, err);
      }
    }
  }

  // Error handler
  var reconnectHandler = function() {
    self.emit('reconnect', self);
    self.s.store.execute();
  }

  // Reconnect failed
  var reconnectFailedHandler = function(err) {
    self.emit('reconnectFailed', err);
    self.s.store.flush(err);
  }

  // Destroy called on topology, perform cleanup
  var destroyHandler = function() {
    self.s.store.flush();
  }

  // relay the event
  var relay = function(event) {
    return function(t, server) {
      self.emit(event, t, server);
    }
  }

  // Connect handler
  var connectHandler = function() {
    // Clear out all the current handlers left over
    ["timeout", "error", "close", 'destroy'].forEach(function(e) {
      self.s.server.removeAllListeners(e);
    });

    // Set up listeners
    self.s.server.on('timeout', errorHandler('timeout'));
    self.s.server.once('error', errorHandler('error'));
    self.s.server.on('close', errorHandler('close'));
    // Only called on destroy
    self.s.server.on('destroy', destroyHandler);

    // Emit open event
    self.emit('open', null, self);

    // Return correctly
    try {
      callback(null, self);
    } catch(err) {
      console.log(err.stack)
      process.nextTick(function() { throw err; })
    }
  }

  // Set up listeners
  var connectHandlers = {
    timeout: connectErrorHandler('timeout'),
    error: connectErrorHandler('error'),
    close: connectErrorHandler('close')
  };

  // Clear out all the current handlers left over
  ["timeout", "error", "close", 'serverOpening', 'serverDescriptionChanged', 'serverHeartbeatStarted',
    'serverHeartbeatSucceeded', 'serverHeartbeatFailed', 'serverClosed', 'topologyOpening',
    'topologyClosed', 'topologyDescriptionChanged'].forEach(function(e) {
    self.s.server.removeAllListeners(e);
  });

  // Add the event handlers
  self.s.server.once('timeout', connectHandlers.timeout);
  self.s.server.once('error', connectHandlers.error);
  self.s.server.once('close', connectHandlers.close);
  self.s.server.once('connect', connectHandler);
  // Reconnect server
  self.s.server.on('reconnect', reconnectHandler);
  self.s.server.on('reconnectFailed', reconnectFailedHandler);

  // Set up SDAM listeners
  self.s.server.on('serverDescriptionChanged', relay('serverDescriptionChanged'));
  self.s.server.on('serverHeartbeatStarted', relay('serverHeartbeatStarted'));
  self.s.server.on('serverHeartbeatSucceeded', relay('serverHeartbeatSucceeded'));
  self.s.server.on('serverHeartbeatFailed', relay('serverHeartbeatFailed'));
  self.s.server.on('serverOpening', relay('serverOpening'));
  self.s.server.on('serverClosed', relay('serverClosed'));
  self.s.server.on('topologyOpening', relay('topologyOpening'));
  self.s.server.on('topologyClosed', relay('topologyClosed'));
  self.s.server.on('topologyDescriptionChanged', relay('topologyDescriptionChanged'));
  self.s.server.on('attemptReconnect', relay('attemptReconnect'));
  self.s.server.on('monitoring', relay('monitoring'));

  // Start connection
  self.s.server.connect(_options);
}

// Server capabilities
Server.prototype.capabilities = function() {
  if(this.s.sCapabilities) return this.s.sCapabilities;
  if(this.s.server.lastIsMaster() == null) return null;
  this.s.sCapabilities = new ServerCapabilities(this.s.server.lastIsMaster());
  return this.s.sCapabilities;
}

define.classMethod('capabilities', {callback: false, promise:false, returns: [ServerCapabilities]});

// Command
Server.prototype.command = function(ns, cmd, options, callback) {
  this.s.server.command(ns, cmd, getReadPreference(options), callback);
}

define.classMethod('command', {callback: true, promise:false});

// Insert
Server.prototype.insert = function(ns, ops, options, callback) {
  this.s.server.insert(ns, ops, options, callback);
}

define.classMethod('insert', {callback: true, promise:false});

// Update
Server.prototype.update = function(ns, ops, options, callback) {
  this.s.server.update(ns, ops, options, callback);
}

define.classMethod('update', {callback: true, promise:false});

// Remove
Server.prototype.remove = function(ns, ops, options, callback) {
  this.s.server.remove(ns, ops, options, callback);
}

define.classMethod('remove', {callback: true, promise:false});

// IsConnected
Server.prototype.isConnected = function() {
  return this.s.server.isConnected();
}

Server.prototype.isDestroyed = function() {
  return this.s.server.isDestroyed();
}

define.classMethod('isConnected', {callback: false, promise:false, returns: [Boolean]});

// Insert
Server.prototype.cursor = function(ns, cmd, options) {
  options.disconnectHandler = this.s.store;
  return this.s.server.cursor(ns, cmd, options);
}

define.classMethod('cursor', {callback: false, promise:false, returns: [Cursor, AggregationCursor, CommandCursor]});

Server.prototype.lastIsMaster = function() {
  return this.s.server.lastIsMaster();
}

/**
 * Unref all sockets
 * @method
 */
Server.prototype.unref = function() {
  this.s.server.unref();
}

Server.prototype.close = function(forceClosed) {
  this.s.server.destroy();
  // We need to wash out all stored processes
  if(forceClosed == true) {
    this.s.storeOptions.force = forceClosed;
    this.s.store.flush();
  }
}

define.classMethod('close', {callback: false, promise:false});

Server.prototype.auth = function() {
  var args = Array.prototype.slice.call(arguments, 0);
  this.s.server.auth.apply(this.s.server, args);
}

define.classMethod('auth', {callback: true, promise:false});

Server.prototype.logout = function() {
  var args = Array.prototype.slice.call(arguments, 0);
  this.s.server.logout.apply(this.s.server, args);
}

define.classMethod('logout', {callback: true, promise:false});

/**
 * All raw connections
 * @method
 * @return {array}
 */
Server.prototype.connections = function() {
  return this.s.server.connections();
}

define.classMethod('connections', {callback: false, promise:false, returns:[Array]});

/**
 * Server connect event
 *
 * @event Server#connect
 * @type {object}
 */

/**
 * Server close event
 *
 * @event Server#close
 * @type {object}
 */

/**
 * Server reconnect event
 *
 * @event Server#reconnect
 * @type {object}
 */

/**
 * Server error event
 *
 * @event Server#error
 * @type {MongoError}
 */

/**
 * Server timeout event
 *
 * @event Server#timeout
 * @type {object}
 */

/**
 * Server parseError event
 *
 * @event Server#parseError
 * @type {object}
 */

module.exports = Server;


/***/ }),
/* 25 */
/***/ (function(module, exports) {

module.exports = require("http-errors");

/***/ }),
/* 26 */
/***/ (function(module, exports) {

module.exports = require("qs");

/***/ }),
/* 27 */
/***/ (function(module, exports) {

module.exports = require("methods");

/***/ }),
/* 28 */
/***/ (function(module, exports) {

module.exports = require("parseurl");

/***/ }),
/* 29 */
/***/ (function(module, exports) {

module.exports = require("setprototypeof");

/***/ }),
/* 30 */
/***/ (function(module, exports) {

module.exports = require("http");

/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

// Core module
var core = __webpack_require__(1),
  Instrumentation = __webpack_require__(90);

// Set up the connect function
var connect = __webpack_require__(55).connect;

// Expose error class
connect.MongoError = core.MongoError;

// Actual driver classes exported
connect.Admin = __webpack_require__(53);
connect.MongoClient = __webpack_require__(55);
connect.Db = __webpack_require__(34);
connect.Collection = __webpack_require__(23);
connect.Server = __webpack_require__(24);
connect.ReplSet = __webpack_require__(57);
connect.Mongos = __webpack_require__(56);
connect.ReadPreference = __webpack_require__(5);
connect.GridStore = __webpack_require__(51);
connect.Chunk = __webpack_require__(52);
connect.Logger = core.Logger;
connect.Cursor = __webpack_require__(7);
connect.GridFSBucket = __webpack_require__(95);
// Exported to be used in tests not to be used anywhere else
connect.CoreServer = __webpack_require__(1).Server;
connect.CoreConnection = __webpack_require__(1).Connection;

// BSON types exported
connect.Binary = core.BSON.Binary;
connect.Code = core.BSON.Code;
connect.Map = core.BSON.Map;
connect.DBRef = core.BSON.DBRef;
connect.Double = core.BSON.Double;
connect.Int32 = core.BSON.Int32;
connect.Long = core.BSON.Long;
connect.MinKey = core.BSON.MinKey;
connect.MaxKey = core.BSON.MaxKey;
connect.ObjectID = core.BSON.ObjectID;
connect.ObjectId = core.BSON.ObjectID;
connect.Symbol = core.BSON.Symbol;
connect.Timestamp = core.BSON.Timestamp;
connect.BSONRegExp = core.BSON.BSONRegExp;
connect.Decimal128 = core.BSON.Decimal128;

// Add connect method
connect.connect = connect;

// Set up the instrumentation method
connect.instrument = function(options, callback) {
  if(typeof options == 'function') callback = options, options = {};
  return new Instrumentation(core, options, callback);
}

// Set our exports to be the connect function
module.exports = connect;


/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var common = __webpack_require__(50)
	, utils = __webpack_require__(0)
  , toError = __webpack_require__(0).toError
	, handleCallback = __webpack_require__(0).handleCallback
	, shallowClone = utils.shallowClone
  , BulkWriteResult = common.BulkWriteResult
  , ObjectID = __webpack_require__(1).BSON.ObjectID
  , Define = __webpack_require__(4)
	, BSON = __webpack_require__(1).BSON
  , Batch = common.Batch
  , mergeBatchResults = common.mergeBatchResults;

var bson = new BSON([BSON.Binary, BSON.Code, BSON.DBRef, BSON.Decimal128,
	BSON.Double, BSON.Int32, BSON.Long, BSON.Map, BSON.MaxKey, BSON.MinKey,
	BSON.ObjectId, BSON.BSONRegExp, BSON.Symbol, BSON.Timestamp]);

/**
 * Create a FindOperatorsOrdered instance (INTERNAL TYPE, do not instantiate directly)
 * @class
 * @return {FindOperatorsOrdered} a FindOperatorsOrdered instance.
 */
var FindOperatorsOrdered = function(self) {
  this.s = self.s;
}

/**
 * Add a single update document to the bulk operation
 *
 * @method
 * @param {object} doc update operations
 * @throws {MongoError}
 * @return {OrderedBulkOperation}
 */
FindOperatorsOrdered.prototype.update = function(updateDocument) {
  // Perform upsert
  var upsert = typeof this.s.currentOp.upsert == 'boolean' ? this.s.currentOp.upsert : false;

  // Establish the update command
  var document = {
      q: this.s.currentOp.selector
    , u: updateDocument
    , multi: true
    , upsert: upsert
  }

  // Clear out current Op
  this.s.currentOp = null;
  // Add the update document to the list
  return addToOperationsList(this, common.UPDATE, document);
}

/**
 * Add a single update one document to the bulk operation
 *
 * @method
 * @param {object} doc update operations
 * @throws {MongoError}
 * @return {OrderedBulkOperation}
 */
FindOperatorsOrdered.prototype.updateOne = function(updateDocument) {
  // Perform upsert
  var upsert = typeof this.s.currentOp.upsert == 'boolean' ? this.s.currentOp.upsert : false;

  // Establish the update command
  var document = {
      q: this.s.currentOp.selector
    , u: updateDocument
    , multi: false
    , upsert: upsert
  }

  // Clear out current Op
  this.s.currentOp = null;
  // Add the update document to the list
  return addToOperationsList(this, common.UPDATE, document);
}

/**
 * Add a replace one operation to the bulk operation
 *
 * @method
 * @param {object} doc the new document to replace the existing one with
 * @throws {MongoError}
 * @return {OrderedBulkOperation}
 */
FindOperatorsOrdered.prototype.replaceOne = function(updateDocument) {
  this.updateOne(updateDocument);
}

/**
 * Upsert modifier for update bulk operation
 *
 * @method
 * @throws {MongoError}
 * @return {FindOperatorsOrdered}
 */
FindOperatorsOrdered.prototype.upsert = function() {
  this.s.currentOp.upsert = true;
  return this;
}

/**
 * Add a remove one operation to the bulk operation
 *
 * @method
 * @throws {MongoError}
 * @return {OrderedBulkOperation}
 */
FindOperatorsOrdered.prototype.deleteOne = function() {
  // Establish the update command
  var document = {
      q: this.s.currentOp.selector
    , limit: 1
  }

  // Clear out current Op
  this.s.currentOp = null;
  // Add the remove document to the list
  return addToOperationsList(this, common.REMOVE, document);
}

// Backward compatibility
FindOperatorsOrdered.prototype.removeOne = FindOperatorsOrdered.prototype.deleteOne;

/**
 * Add a remove operation to the bulk operation
 *
 * @method
 * @throws {MongoError}
 * @return {OrderedBulkOperation}
 */
FindOperatorsOrdered.prototype.delete = function() {
  // Establish the update command
  var document = {
      q: this.s.currentOp.selector
    , limit: 0
  }

  // Clear out current Op
  this.s.currentOp = null;
  // Add the remove document to the list
  return addToOperationsList(this, common.REMOVE, document);
}

// Backward compatibility
FindOperatorsOrdered.prototype.remove = FindOperatorsOrdered.prototype.delete;

// Add to internal list of documents
var addToOperationsList = function(_self, docType, document) {
  // Get the bsonSize
  var bsonSize = bson.calculateObjectSize(document, {
		checkKeys: false,
	});

  // Throw error if the doc is bigger than the max BSON size
  if(bsonSize >= _self.s.maxBatchSizeBytes) {
		throw toError("document is larger than the maximum size " + _self.s.maxBatchSizeBytes);
	}

  // Create a new batch object if we don't have a current one
  if(_self.s.currentBatch == null) _self.s.currentBatch = new Batch(docType, _self.s.currentIndex);

  // Check if we need to create a new batch
  if(((_self.s.currentBatchSize + 1) >= _self.s.maxWriteBatchSize)
    || ((_self.s.currentBatchSizeBytes +  _self.s.currentBatchSizeBytes) >= _self.s.maxBatchSizeBytes)
    || (_self.s.currentBatch.batchType != docType)) {
    // Save the batch to the execution stack
    _self.s.batches.push(_self.s.currentBatch);

    // Create a new batch
    _self.s.currentBatch = new Batch(docType, _self.s.currentIndex);

    // Reset the current size trackers
    _self.s.currentBatchSize = 0;
    _self.s.currentBatchSizeBytes = 0;
  } else {
    // Update current batch size
    _self.s.currentBatchSize = _self.s.currentBatchSize + 1;
    _self.s.currentBatchSizeBytes = _self.s.currentBatchSizeBytes + bsonSize;
  }

  if(docType == common.INSERT) {
    _self.s.bulkResult.insertedIds.push({index: _self.s.currentIndex, _id: document._id});
  }

  // We have an array of documents
  if(Array.isArray(document)) {
    throw toError("operation passed in cannot be an Array");
  } else {
    _self.s.currentBatch.originalIndexes.push(_self.s.currentIndex);
    _self.s.currentBatch.operations.push(document)
		_self.s.currentBatchSizeBytes = _self.s.currentBatchSizeBytes + bsonSize;
    _self.s.currentIndex = _self.s.currentIndex + 1;
  }

  // Return self
  return _self;
}

/**
 * Create a new OrderedBulkOperation instance (INTERNAL TYPE, do not instantiate directly)
 * @class
 * @property {number} length Get the number of operations in the bulk.
 * @return {OrderedBulkOperation} a OrderedBulkOperation instance.
 */
function OrderedBulkOperation(topology, collection, options) {
	options = options == null ? {} : options;
	// TODO Bring from driver information in isMaster
	var executed = false;

	// Current item
	var currentOp = null;

	// Handle to the bson serializer, used to calculate running sizes
	var bson = topology.bson;

	// Namespace for the operation
  var namespace = collection.collectionName;

  // Set max byte size
	var maxBatchSizeBytes = topology.isMasterDoc && topology.isMasterDoc.maxBsonObjectSize
    ? topology.isMasterDoc.maxBsonObjectSize : (1024*1025*16);
	var maxWriteBatchSize = topology.isMasterDoc && topology.isMasterDoc.maxWriteBatchSize
    ? topology.isMasterDoc.maxWriteBatchSize : 1000;

  // Get the write concern
  var writeConcern = common.writeConcern(shallowClone(options), collection, options);

  // Get the promiseLibrary
  var promiseLibrary = options.promiseLibrary;

  // No promise library selected fall back
  if(!promiseLibrary) {
    promiseLibrary = typeof global.Promise == 'function' ?
      global.Promise : __webpack_require__(3).Promise;
  }

  // Final results
  var bulkResult = {
      ok: 1
    , writeErrors: []
    , writeConcernErrors: []
    , insertedIds: []
    , nInserted: 0
    , nUpserted: 0
    , nMatched: 0
    , nModified: 0
    , nRemoved: 0
    , upserted: []
  };

  // Internal state
  this.s = {
    // Final result
      bulkResult: bulkResult
    // Current batch state
    , currentBatch: null
    , currentIndex: 0
    , currentBatchSize: 0
    , currentBatchSizeBytes: 0
    , batches: []
    // Write concern
    , writeConcern: writeConcern
    // Max batch size options
    , maxBatchSizeBytes: maxBatchSizeBytes
    , maxWriteBatchSize: maxWriteBatchSize
    // Namespace
    , namespace: namespace
    // BSON
    , bson: bson
    // Topology
    , topology: topology
    // Options
    , options: options
    // Current operation
    , currentOp: currentOp
    // Executed
    , executed: executed
    // Collection
    , collection: collection
    // Promise Library
    , promiseLibrary: promiseLibrary
		// Fundamental error
		, err: null
    // Bypass validation
    , bypassDocumentValidation: typeof options.bypassDocumentValidation == 'boolean' ? options.bypassDocumentValidation : false
  }
}

var define = OrderedBulkOperation.define = new Define('OrderedBulkOperation', OrderedBulkOperation, false);

OrderedBulkOperation.prototype.raw = function(op) {
  var key = Object.keys(op)[0];

  // Set up the force server object id
  var forceServerObjectId = typeof this.s.options.forceServerObjectId == 'boolean'
    ? this.s.options.forceServerObjectId : this.s.collection.s.db.options.forceServerObjectId;

  // Update operations
  if((op.updateOne && op.updateOne.q)
    || (op.updateMany && op.updateMany.q)
    || (op.replaceOne && op.replaceOne.q)) {
    op[key].multi = op.updateOne || op.replaceOne ? false : true;
    return addToOperationsList(this, common.UPDATE, op[key]);
  }

  // Crud spec update format
  if(op.updateOne || op.updateMany || op.replaceOne) {
    var multi = op.updateOne || op.replaceOne ? false : true;
    var operation = {q: op[key].filter, u: op[key].update || op[key].replacement, multi: multi}
    operation.upsert = op[key].upsert ? true: false;
		if(op.collation) operation.collation = op.collation;
    return addToOperationsList(this, common.UPDATE, operation);
  }

  // Remove operations
  if(op.removeOne || op.removeMany || (op.deleteOne && op.deleteOne.q) || op.deleteMany && op.deleteMany.q) {
    op[key].limit = op.removeOne ? 1 : 0;
    return addToOperationsList(this, common.REMOVE, op[key]);
  }

  // Crud spec delete operations, less efficient
  if(op.deleteOne || op.deleteMany) {
    var limit = op.deleteOne ? 1 : 0;
    operation = {q: op[key].filter, limit: limit}
		if(op.collation) operation.collation = op.collation;
    return addToOperationsList(this, common.REMOVE, operation);
  }

  // Insert operations
  if(op.insertOne && op.insertOne.document == null) {
    if(forceServerObjectId !== true && op.insertOne._id == null) op.insertOne._id = new ObjectID();
    return addToOperationsList(this, common.INSERT, op.insertOne);
  } else if(op.insertOne && op.insertOne.document) {
    if(forceServerObjectId !== true && op.insertOne.document._id == null) op.insertOne.document._id = new ObjectID();
    return addToOperationsList(this, common.INSERT, op.insertOne.document);
  }

  if(op.insertMany) {
    for(var i = 0; i < op.insertMany.length; i++) {
      if(forceServerObjectId !== true && op.insertMany[i]._id == null) op.insertMany[i]._id = new ObjectID();
      addToOperationsList(this, common.INSERT, op.insertMany[i]);
    }

    return;
  }

  // No valid type of operation
  throw toError("bulkWrite only supports insertOne, insertMany, updateOne, updateMany, removeOne, removeMany, deleteOne, deleteMany");
}

/**
 * Add a single insert document to the bulk operation
 *
 * @param {object} doc the document to insert
 * @throws {MongoError}
 * @return {OrderedBulkOperation}
 */
OrderedBulkOperation.prototype.insert = function(document) {
  if(this.s.collection.s.db.options.forceServerObjectId !== true && document._id == null) document._id = new ObjectID();
  return addToOperationsList(this, common.INSERT, document);
}

/**
 * Initiate a find operation for an update/updateOne/remove/removeOne/replaceOne
 *
 * @method
 * @param {object} selector The selector for the bulk operation.
 * @throws {MongoError}
 * @return {FindOperatorsOrdered}
 */
OrderedBulkOperation.prototype.find = function(selector) {
  if (!selector) {
    throw toError("Bulk find operation must specify a selector");
  }

  // Save a current selector
  this.s.currentOp = {
    selector: selector
  }

  return new FindOperatorsOrdered(this);
}

Object.defineProperty(OrderedBulkOperation.prototype, 'length', {
  enumerable: true,
  get: function() {
    return this.s.currentIndex;
  }
});

//
// Execute next write command in a chain
var executeCommands = function(self, callback) {
  if(self.s.batches.length == 0) {
    return handleCallback(callback, null, new BulkWriteResult(self.s.bulkResult));
  }

  // Ordered execution of the command
  var batch = self.s.batches.shift();

  var resultHandler = function(err, result) {
		// Error is a driver related error not a bulk op error, terminate
		if(err && err.driver || err && err.message) {
			return handleCallback(callback, err);
		}

    // If we have and error
    if(err) err.ok = 0;
    // Merge the results together
    var mergeResult = mergeBatchResults(true, batch, self.s.bulkResult, err, result);
    if(mergeResult != null) {
      return handleCallback(callback, null, new BulkWriteResult(self.s.bulkResult));
    }

    // If we are ordered and have errors and they are
    // not all replication errors terminate the operation
    if(self.s.bulkResult.writeErrors.length > 0) {
      return handleCallback(callback, toError(self.s.bulkResult.writeErrors[0]), new BulkWriteResult(self.s.bulkResult));
    }

    // Execute the next command in line
    executeCommands(self, callback);
  }

  var finalOptions = {ordered: true}
  if(self.s.writeConcern != null) {
    finalOptions.writeConcern = self.s.writeConcern;
  }

	// Set an operationIf if provided
	if(self.operationId) {
		resultHandler.operationId = self.operationId;
	}

	// Serialize functions
	if(self.s.options.serializeFunctions) {
		finalOptions.serializeFunctions = true
	}

  // Serialize functions
  if(self.s.options.ignoreUndefined) {
    finalOptions.ignoreUndefined = true
  }

  // Is the bypassDocumentValidation options specific
  if(self.s.bypassDocumentValidation == true) {
    finalOptions.bypassDocumentValidation = true;
  }

  try {
    if(batch.batchType == common.INSERT) {
      self.s.topology.insert(self.s.collection.namespace, batch.operations, finalOptions, resultHandler);
    } else if(batch.batchType == common.UPDATE) {
      self.s.topology.update(self.s.collection.namespace, batch.operations, finalOptions, resultHandler);
    } else if(batch.batchType == common.REMOVE) {
      self.s.topology.remove(self.s.collection.namespace, batch.operations, finalOptions, resultHandler);
    }
  } catch(err) {
    // Force top level error
    err.ok = 0;
    // Merge top level error and return
    handleCallback(callback, null, mergeBatchResults(false, batch, self.s.bulkResult, err, null));
  }
}

/**
 * The callback format for results
 * @callback OrderedBulkOperation~resultCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {BulkWriteResult} result The bulk write result.
 */

/**
 * Execute the ordered bulk operation
 *
 * @method
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.fsync=false] Specify a file sync write concern.
 * @param {OrderedBulkOperation~resultCallback} [callback] The result callback
 * @throws {MongoError}
 * @return {Promise} returns Promise if no callback passed
 */
OrderedBulkOperation.prototype.execute = function(_writeConcern, callback) {
  var self = this;
  if (this.s.executed) {
    var executedError = toError('batch cannot be re-executed');
    return (typeof callback === 'function') ?
      callback(executedError, null) : this.s.promiseLibrary.reject(executedError);
  }

  if (typeof _writeConcern === 'function') {
    callback = _writeConcern;
  } else if (_writeConcern && typeof _writeConcern === 'object') {
    this.s.writeConcern = _writeConcern;
  }

  // If we have current batch
  if (this.s.currentBatch) this.s.batches.push(this.s.currentBatch)

  // If we have no operations in the bulk raise an error
  if (this.s.batches.length == 0) {
    var emptyBatchError = toError('Invalid Operation, no operations specified');
    return (typeof callback === 'function') ?
      callback(emptyBatchError, null) : this.s.promiseLibrary.reject(emptyBatchError);
  }

  // Execute using callback
  if (typeof callback === 'function') {
    return executeCommands(this, callback);
  }

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    executeCommands(self, function(err, r) {
      if (err) return reject(err);
      resolve(r);
    });
  });
}

define.classMethod('execute', {callback: true, promise:false});

/**
 * Returns an unordered batch object
 * @ignore
 */
var initializeOrderedBulkOp = function(topology, collection, options) {
	return new OrderedBulkOperation(topology, collection, options);
}

initializeOrderedBulkOp.OrderedBulkOperation = OrderedBulkOperation;
module.exports = initializeOrderedBulkOp;
module.exports.Bulk = OrderedBulkOperation;


/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var common = __webpack_require__(50)
	, utils = __webpack_require__(0)
  , toError = __webpack_require__(0).toError
	, handleCallback = __webpack_require__(0).handleCallback
  , shallowClone = utils.shallowClone
  , BulkWriteResult = common.BulkWriteResult
  , ObjectID = __webpack_require__(1).BSON.ObjectID
	, BSON = __webpack_require__(1).BSON
  , Define = __webpack_require__(4)
  , Batch = common.Batch
  , mergeBatchResults = common.mergeBatchResults;

var bson = new BSON([BSON.Binary, BSON.Code, BSON.DBRef, BSON.Decimal128,
	BSON.Double, BSON.Int32, BSON.Long, BSON.Map, BSON.MaxKey, BSON.MinKey,
	BSON.ObjectId, BSON.BSONRegExp, BSON.Symbol, BSON.Timestamp]);

/**
 * Create a FindOperatorsUnordered instance (INTERNAL TYPE, do not instantiate directly)
 * @class
 * @property {number} length Get the number of operations in the bulk.
 * @return {FindOperatorsUnordered} a FindOperatorsUnordered instance.
 */
var FindOperatorsUnordered = function(self) {
  this.s = self.s;
}

/**
 * Add a single update document to the bulk operation
 *
 * @method
 * @param {object} doc update operations
 * @throws {MongoError}
 * @return {UnorderedBulkOperation}
 */
FindOperatorsUnordered.prototype.update = function(updateDocument) {
  // Perform upsert
  var upsert = typeof this.s.currentOp.upsert == 'boolean' ? this.s.currentOp.upsert : false;

  // Establish the update command
  var document = {
      q: this.s.currentOp.selector
    , u: updateDocument
    , multi: true
    , upsert: upsert
  }

  // Clear out current Op
  this.s.currentOp = null;
  // Add the update document to the list
  return addToOperationsList(this, common.UPDATE, document);
}

/**
 * Add a single update one document to the bulk operation
 *
 * @method
 * @param {object} doc update operations
 * @throws {MongoError}
 * @return {UnorderedBulkOperation}
 */
FindOperatorsUnordered.prototype.updateOne = function(updateDocument) {
  // Perform upsert
  var upsert = typeof this.s.currentOp.upsert == 'boolean' ? this.s.currentOp.upsert : false;

  // Establish the update command
  var document = {
      q: this.s.currentOp.selector
    , u: updateDocument
    , multi: false
    , upsert: upsert
  }

  // Clear out current Op
  this.s.currentOp = null;
  // Add the update document to the list
  return addToOperationsList(this, common.UPDATE, document);
}

/**
 * Add a replace one operation to the bulk operation
 *
 * @method
 * @param {object} doc the new document to replace the existing one with
 * @throws {MongoError}
 * @return {UnorderedBulkOperation}
 */
FindOperatorsUnordered.prototype.replaceOne = function(updateDocument) {
  this.updateOne(updateDocument);
}

/**
 * Upsert modifier for update bulk operation
 *
 * @method
 * @throws {MongoError}
 * @return {FindOperatorsUnordered}
 */
FindOperatorsUnordered.prototype.upsert = function() {
  this.s.currentOp.upsert = true;
  return this;
}

/**
 * Add a remove one operation to the bulk operation
 *
 * @method
 * @throws {MongoError}
 * @return {UnorderedBulkOperation}
 */
FindOperatorsUnordered.prototype.removeOne = function() {
  // Establish the update command
  var document = {
      q: this.s.currentOp.selector
    , limit: 1
  }

  // Clear out current Op
  this.s.currentOp = null;
  // Add the remove document to the list
  return addToOperationsList(this, common.REMOVE, document);
}

/**
 * Add a remove operation to the bulk operation
 *
 * @method
 * @throws {MongoError}
 * @return {UnorderedBulkOperation}
 */
FindOperatorsUnordered.prototype.remove = function() {
  // Establish the update command
  var document = {
      q: this.s.currentOp.selector
    , limit: 0
  }

  // Clear out current Op
  this.s.currentOp = null;
  // Add the remove document to the list
  return addToOperationsList(this, common.REMOVE, document);
}

//
// Add to the operations list
//
var addToOperationsList = function(_self, docType, document) {
  // Get the bsonSize
  var bsonSize = bson.calculateObjectSize(document, {
		checkKeys: false,
	});
  // Throw error if the doc is bigger than the max BSON size
  if(bsonSize >= _self.s.maxBatchSizeBytes) throw toError("document is larger than the maximum size " + _self.s.maxBatchSizeBytes);
  // Holds the current batch
  _self.s.currentBatch = null;
  // Get the right type of batch
  if(docType == common.INSERT) {
    _self.s.currentBatch = _self.s.currentInsertBatch;
  } else if(docType == common.UPDATE) {
    _self.s.currentBatch = _self.s.currentUpdateBatch;
  } else if(docType == common.REMOVE) {
    _self.s.currentBatch = _self.s.currentRemoveBatch;
  }

  // Create a new batch object if we don't have a current one
  if(_self.s.currentBatch == null) _self.s.currentBatch = new Batch(docType, _self.s.currentIndex);

  // Check if we need to create a new batch
  if(((_self.s.currentBatch.size + 1) >= _self.s.maxWriteBatchSize)
    || ((_self.s.currentBatch.sizeBytes + bsonSize) >= _self.s.maxBatchSizeBytes)
    || (_self.s.currentBatch.batchType != docType)) {
    // Save the batch to the execution stack
    _self.s.batches.push(_self.s.currentBatch);

    // Create a new batch
    _self.s.currentBatch = new Batch(docType, _self.s.currentIndex);
  }

  // We have an array of documents
  if(Array.isArray(document)) {
    throw toError("operation passed in cannot be an Array");
  } else {
    _self.s.currentBatch.operations.push(document);
    _self.s.currentBatch.originalIndexes.push(_self.s.currentIndex);
    _self.s.currentIndex = _self.s.currentIndex + 1;
  }

  // Save back the current Batch to the right type
  if(docType == common.INSERT) {
    _self.s.currentInsertBatch = _self.s.currentBatch;
    _self.s.bulkResult.insertedIds.push({index: _self.s.bulkResult.insertedIds.length, _id: document._id});
  } else if(docType == common.UPDATE) {
    _self.s.currentUpdateBatch = _self.s.currentBatch;
  } else if(docType == common.REMOVE) {
    _self.s.currentRemoveBatch = _self.s.currentBatch;
  }

  // Update current batch size
  _self.s.currentBatch.size = _self.s.currentBatch.size + 1;
  _self.s.currentBatch.sizeBytes = _self.s.currentBatch.sizeBytes + bsonSize;

  // Return self
  return _self;
}

/**
 * Create a new UnorderedBulkOperation instance (INTERNAL TYPE, do not instantiate directly)
 * @class
 * @property {number} length Get the number of operations in the bulk.
 * @return {UnorderedBulkOperation} a UnorderedBulkOperation instance.
 */
var UnorderedBulkOperation = function(topology, collection, options) {
	options = options == null ? {} : options;

	// Get the namespace for the write operations
  var namespace = collection.collectionName;
  // Used to mark operation as executed
  var executed = false;

	// Current item
  // var currentBatch = null;
	var currentOp = null;

	// Handle to the bson serializer, used to calculate running sizes
	var bson = topology.bson;

  // Set max byte size
  var maxBatchSizeBytes = topology.isMasterDoc && topology.isMasterDoc.maxBsonObjectSize
    ? topology.isMasterDoc.maxBsonObjectSize : (1024*1025*16);
  var maxWriteBatchSize = topology.isMasterDoc && topology.isMasterDoc.maxWriteBatchSize
    ? topology.isMasterDoc.maxWriteBatchSize : 1000;

  // Get the write concern
  var writeConcern = common.writeConcern(shallowClone(options), collection, options);

  // Get the promiseLibrary
  var promiseLibrary = options.promiseLibrary;

  // No promise library selected fall back
  if(!promiseLibrary) {
    promiseLibrary = typeof global.Promise == 'function' ?
      global.Promise : __webpack_require__(3).Promise;
  }

  // Final results
  var bulkResult = {
      ok: 1
    , writeErrors: []
    , writeConcernErrors: []
    , insertedIds: []
    , nInserted: 0
    , nUpserted: 0
    , nMatched: 0
    , nModified: 0
    , nRemoved: 0
    , upserted: []
  };

  // Internal state
  this.s = {
    // Final result
      bulkResult: bulkResult
    // Current batch state
    , currentInsertBatch: null
    , currentUpdateBatch: null
    , currentRemoveBatch: null
    , currentBatch: null
    , currentIndex: 0
    , batches: []
    // Write concern
    , writeConcern: writeConcern
    // Max batch size options
    , maxBatchSizeBytes: maxBatchSizeBytes
    , maxWriteBatchSize: maxWriteBatchSize
    // Namespace
    , namespace: namespace
    // BSON
    , bson: bson
    // Topology
    , topology: topology
    // Options
    , options: options
    // Current operation
    , currentOp: currentOp
    // Executed
    , executed: executed
    // Collection
    , collection: collection
    // Promise Library
    , promiseLibrary: promiseLibrary
    // Bypass validation
    , bypassDocumentValidation: typeof options.bypassDocumentValidation == 'boolean' ? options.bypassDocumentValidation : false
  }
}

var define = UnorderedBulkOperation.define = new Define('UnorderedBulkOperation', UnorderedBulkOperation, false);

/**
 * Add a single insert document to the bulk operation
 *
 * @param {object} doc the document to insert
 * @throws {MongoError}
 * @return {UnorderedBulkOperation}
 */
UnorderedBulkOperation.prototype.insert = function(document) {
  if(this.s.collection.s.db.options.forceServerObjectId !== true && document._id == null) document._id = new ObjectID();
  return addToOperationsList(this, common.INSERT, document);
}

/**
 * Initiate a find operation for an update/updateOne/remove/removeOne/replaceOne
 *
 * @method
 * @param {object} selector The selector for the bulk operation.
 * @throws {MongoError}
 * @return {FindOperatorsUnordered}
 */
UnorderedBulkOperation.prototype.find = function(selector) {
  if (!selector) {
    throw toError("Bulk find operation must specify a selector");
  }

  // Save a current selector
  this.s.currentOp = {
    selector: selector
  }

  return new FindOperatorsUnordered(this);
}

Object.defineProperty(UnorderedBulkOperation.prototype, 'length', {
  enumerable: true,
  get: function() {
    return this.s.currentIndex;
  }
});

UnorderedBulkOperation.prototype.raw = function(op) {
  var key = Object.keys(op)[0];

  // Set up the force server object id
  var forceServerObjectId = typeof this.s.options.forceServerObjectId == 'boolean'
    ? this.s.options.forceServerObjectId : this.s.collection.s.db.options.forceServerObjectId;

  // Update operations
  if((op.updateOne && op.updateOne.q)
    || (op.updateMany && op.updateMany.q)
    || (op.replaceOne && op.replaceOne.q)) {
    op[key].multi = op.updateOne || op.replaceOne ? false : true;
    return addToOperationsList(this, common.UPDATE, op[key]);
  }

  // Crud spec update format
  if(op.updateOne || op.updateMany || op.replaceOne) {
    var multi = op.updateOne || op.replaceOne ? false : true;
    var operation = {q: op[key].filter, u: op[key].update || op[key].replacement, multi: multi}
    if(op[key].upsert) operation.upsert = true;
    return addToOperationsList(this, common.UPDATE, operation);
  }

  // Remove operations
  if(op.removeOne || op.removeMany || (op.deleteOne && op.deleteOne.q) || op.deleteMany && op.deleteMany.q) {
    op[key].limit = op.removeOne ? 1 : 0;
    return addToOperationsList(this, common.REMOVE, op[key]);
  }

  // Crud spec delete operations, less efficient
  if(op.deleteOne || op.deleteMany) {
    var limit = op.deleteOne ? 1 : 0;
    operation = {q: op[key].filter, limit: limit}
    return addToOperationsList(this, common.REMOVE, operation);
  }

  // Insert operations
  if(op.insertOne && op.insertOne.document == null) {
    if(forceServerObjectId !== true && op.insertOne._id == null) op.insertOne._id = new ObjectID();
    return addToOperationsList(this, common.INSERT, op.insertOne);
  } else if(op.insertOne && op.insertOne.document) {
    if(forceServerObjectId !== true && op.insertOne.document._id == null) op.insertOne.document._id = new ObjectID();
    return addToOperationsList(this, common.INSERT, op.insertOne.document);
  }

  if(op.insertMany) {
    for(var i = 0; i < op.insertMany.length; i++) {
      if(forceServerObjectId !== true && op.insertMany[i]._id == null) op.insertMany[i]._id = new ObjectID();
      addToOperationsList(this, common.INSERT, op.insertMany[i]);
    }

    return;
  }

  // No valid type of operation
  throw toError("bulkWrite only supports insertOne, insertMany, updateOne, updateMany, removeOne, removeMany, deleteOne, deleteMany");
}

//
// Execute the command
var executeBatch = function(self, batch, callback) {
  var finalOptions = {ordered: false}
  if(self.s.writeConcern != null) {
    finalOptions.writeConcern = self.s.writeConcern;
  }

  var resultHandler = function(err, result) {
		// Error is a driver related error not a bulk op error, terminate
		if(err && err.driver || err && err.message) {
			return handleCallback(callback, err);
		}

    // If we have and error
    if(err) err.ok = 0;
    handleCallback(callback, null, mergeBatchResults(false, batch, self.s.bulkResult, err, result));
  }

	// Set an operationIf if provided
	if(self.operationId) {
		resultHandler.operationId = self.operationId;
	}

	// Serialize functions
	if(self.s.options.serializeFunctions) {
		finalOptions.serializeFunctions = true
	}

  // Is the bypassDocumentValidation options specific
  if(self.s.bypassDocumentValidation == true) {
    finalOptions.bypassDocumentValidation = true;
  }

  try {
    if(batch.batchType == common.INSERT) {
      self.s.topology.insert(self.s.collection.namespace, batch.operations, finalOptions, resultHandler);
    } else if(batch.batchType == common.UPDATE) {
      self.s.topology.update(self.s.collection.namespace, batch.operations, finalOptions, resultHandler);
    } else if(batch.batchType == common.REMOVE) {
      self.s.topology.remove(self.s.collection.namespace, batch.operations, finalOptions, resultHandler);
    }
  } catch(err) {
    // Force top level error
    err.ok = 0;
    // Merge top level error and return
    handleCallback(callback, null, mergeBatchResults(false, batch, self.s.bulkResult, err, null));
  }
}

//
// Execute all the commands
var executeBatches = function(self, callback) {
  var numberOfCommandsToExecute = self.s.batches.length;
  // Execute over all the batches
  for(var i = 0; i < self.s.batches.length; i++) {
    executeBatch(self, self.s.batches[i], function(err) {
			// Driver layer error capture it
			if(err) error = err;
			// Count down the number of commands left to execute
      numberOfCommandsToExecute = numberOfCommandsToExecute - 1;

      // Execute
      if(numberOfCommandsToExecute == 0) {
				// Driver level error
				if(error) return handleCallback(callback, error);
				// Treat write errors
        var error = self.s.bulkResult.writeErrors.length > 0 ? toError(self.s.bulkResult.writeErrors[0]) : null;
        handleCallback(callback, error, new BulkWriteResult(self.s.bulkResult));
      }
    });
  }
}

/**
 * The callback format for results
 * @callback UnorderedBulkOperation~resultCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {BulkWriteResult} result The bulk write result.
 */

/**
 * Execute the ordered bulk operation
 *
 * @method
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.fsync=false] Specify a file sync write concern.
 * @param {UnorderedBulkOperation~resultCallback} [callback] The result callback
 * @throws {MongoError}
 * @return {Promise} returns Promise if no callback passed
 */
UnorderedBulkOperation.prototype.execute = function(_writeConcern, callback) {
  var self = this;
  if (this.s.executed) {
    var executedError = toError('batch cannot be re-executed');
    return (typeof callback === 'function') ?
      callback(executedError, null) : this.s.promiseLibrary.reject(executedError);
  }

  if (typeof _writeConcern === 'function') {
    callback = _writeConcern;
  } else if (_writeConcern && typeof _writeConcern === 'object') {
    this.s.writeConcern = _writeConcern;
  }

  // If we have current batch
  if (this.s.currentInsertBatch) this.s.batches.push(this.s.currentInsertBatch);
  if (this.s.currentUpdateBatch) this.s.batches.push(this.s.currentUpdateBatch);
  if (this.s.currentRemoveBatch) this.s.batches.push(this.s.currentRemoveBatch);

  // If we have no operations in the bulk raise an error
  if (this.s.batches.length == 0) {
    var emptyBatchError = toError('Invalid Operation, no operations specified');
    return (typeof callback === 'function') ?
      callback(emptyBatchError, null) : this.s.promiseLibrary.reject(emptyBatchError);
  }

  // Execute using callback
  if (typeof callback === 'function') return executeBatches(this, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    executeBatches(self, function(err, r) {
      if (err) return reject(err);
      resolve(r);
    });
  });
}

define.classMethod('execute', {callback: true, promise:false});

/**
 * Returns an unordered batch object
 * @ignore
 */
var initializeUnorderedBulkOp = function(topology, collection, options) {
	return new UnorderedBulkOperation(topology, collection, options);
}

initializeUnorderedBulkOp.UnorderedBulkOperation = UnorderedBulkOperation;
module.exports = initializeUnorderedBulkOp;
module.exports.Bulk = UnorderedBulkOperation;


/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var EventEmitter = __webpack_require__(8).EventEmitter
  , authenticate = __webpack_require__(35)
  , inherits = __webpack_require__(2).inherits
  , getSingleProperty = __webpack_require__(0).getSingleProperty
  , shallowClone = __webpack_require__(0).shallowClone
  , parseIndexOptions = __webpack_require__(0).parseIndexOptions
  , debugOptions = __webpack_require__(0).debugOptions
  , CommandCursor = __webpack_require__(11)
  , handleCallback = __webpack_require__(0).handleCallback
  , filterOptions = __webpack_require__(0).filterOptions
  , toError = __webpack_require__(0).toError
  , ReadPreference = __webpack_require__(5)
  , f = __webpack_require__(2).format
  , Admin = __webpack_require__(53)
  , Code = __webpack_require__(1).BSON.Code
  , CoreReadPreference = __webpack_require__(1).ReadPreference
  , MongoError = __webpack_require__(1).MongoError
  , ObjectID = __webpack_require__(1).ObjectID
  , Define = __webpack_require__(4)
  , Logger = __webpack_require__(1).Logger
  , Collection = __webpack_require__(23)
  , crypto = __webpack_require__(54)
  , mergeOptionsAndWriteConcern = __webpack_require__(0).mergeOptionsAndWriteConcern
  , assign = __webpack_require__(0).assign;

var debugFields = ['authSource', 'w', 'wtimeout', 'j', 'native_parser', 'forceServerObjectId'
  , 'serializeFunctions', 'raw', 'promoteLongs', 'promoteValues', 'promoteBuffers', 'bufferMaxEntries', 'numberOfRetries', 'retryMiliSeconds'
  , 'readPreference', 'pkFactory', 'parentDb', 'promiseLibrary', 'noListener'];

// Filter out any write concern options
var illegalCommandFields = ['w', 'wtimeout', 'j', 'fsync', 'autoIndexId'
  , 'strict', 'serializeFunctions', 'pkFactory', 'raw', 'readPreference'];

/**
 * @fileOverview The **Db** class is a class that represents a MongoDB Database.
 *
 * @example
 * var MongoClient = require('mongodb').MongoClient,
 *   test = require('assert');
 * // Connection url
 * var url = 'mongodb://localhost:27017/test';
 * // Connect using MongoClient
 * MongoClient.connect(url, function(err, db) {
 *   // Get an additional db
 *   var testDb = db.db('test');
 *   db.close();
 * });
 */

// Allowed parameters
var legalOptionNames = ['w', 'wtimeout', 'fsync', 'j', 'readPreference', 'readPreferenceTags', 'native_parser'
  , 'forceServerObjectId', 'pkFactory', 'serializeFunctions', 'raw', 'bufferMaxEntries', 'authSource'
  , 'ignoreUndefined', 'promoteLongs', 'promiseLibrary', 'readConcern', 'retryMiliSeconds', 'numberOfRetries'
  , 'parentDb', 'noListener', 'loggerLevel', 'logger', 'promoteBuffers', 'promoteLongs', 'promoteValues'];

/**
 * Creates a new Db instance
 * @class
 * @param {string} databaseName The name of the database this instance represents.
 * @param {(Server|ReplSet|Mongos)} topology The server topology for the database.
 * @param {object} [options=null] Optional settings.
 * @param {string} [options.authSource=null] If the database authentication is dependent on another databaseName.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.forceServerObjectId=false] Force server to assign _id values instead of driver.
 * @param {boolean} [options.serializeFunctions=false] Serialize functions on any object.
 * @param {Boolean} [options.ignoreUndefined=false] Specify if the BSON serializer should ignore undefined fields.
 * @param {boolean} [options.raw=false] Return document results as raw BSON buffers.
 * @param {boolean} [options.promoteLongs=true] Promotes Long values to number if they fit inside the 53 bits resolution.
 * @param {boolean} [options.promoteBuffers=false] Promotes Binary BSON values to native Node Buffers.
 * @param {boolean} [options.promoteValues=true] Promotes BSON values to native types where possible, set to false to only receive wrapper types.
 * @param {number} [options.bufferMaxEntries=-1] Sets a cap on how many operations the driver will buffer up before giving up on getting a working connection, default is -1 which is unlimited.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {object} [options.pkFactory=null] A primary key factory object for generation of custom _id keys.
 * @param {object} [options.promiseLibrary=null] A Promise library class the application wishes to use such as Bluebird, must be ES6 compatible
 * @param {object} [options.readConcern=null] Specify a read concern for the collection. (only MongoDB 3.2 or higher supported)
 * @param {object} [options.readConcern.level='local'] Specify a read concern level for the collection operations, one of [local|majority]. (only MongoDB 3.2 or higher supported)
 * @property {(Server|ReplSet|Mongos)} serverConfig Get the current db topology.
 * @property {number} bufferMaxEntries Current bufferMaxEntries value for the database
 * @property {string} databaseName The name of the database this instance represents.
 * @property {object} options The options associated with the db instance.
 * @property {boolean} native_parser The current value of the parameter native_parser.
 * @property {boolean} slaveOk The current slaveOk value for the db instance.
 * @property {object} writeConcern The current write concern values.
 * @property {object} topology Access the topology object (single server, replicaset or mongos).
 * @fires Db#close
 * @fires Db#authenticated
 * @fires Db#reconnect
 * @fires Db#error
 * @fires Db#timeout
 * @fires Db#parseError
 * @fires Db#fullsetup
 * @return {Db} a Db instance.
 */
var Db = function(databaseName, topology, options) {
  options = options || {};
  if(!(this instanceof Db)) return new Db(databaseName, topology, options);
  EventEmitter.call(this);
  var self = this;

  // Get the promiseLibrary
  var promiseLibrary = options.promiseLibrary;

  // No promise library selected fall back
  if(!promiseLibrary) {
    promiseLibrary = typeof global.Promise == 'function' ?
      global.Promise : __webpack_require__(3).Promise;
  }

  // Filter the options
  options = filterOptions(options, legalOptionNames);

  // Ensure we put the promiseLib in the options
  options.promiseLibrary = promiseLibrary;

  // var self = this;  // Internal state of the db object
  this.s = {
    // Database name
      databaseName: databaseName
    // DbCache
    , dbCache: {}
    // Children db's
    , children: []
    // Topology
    , topology: topology
    // Options
    , options: options
    // Logger instance
    , logger: Logger('Db', options)
    // Get the bson parser
    , bson: topology ? topology.bson : null
    // Authsource if any
    , authSource: options.authSource
    // Unpack read preference
    , readPreference: options.readPreference
    // Set buffermaxEntries
    , bufferMaxEntries: typeof options.bufferMaxEntries == 'number' ? options.bufferMaxEntries : -1
    // Parent db (if chained)
    , parentDb: options.parentDb || null
    // Set up the primary key factory or fallback to ObjectID
    , pkFactory: options.pkFactory || ObjectID
    // Get native parser
    , nativeParser: options.nativeParser || options.native_parser
    // Promise library
    , promiseLibrary: promiseLibrary
    // No listener
    , noListener: typeof options.noListener == 'boolean' ? options.noListener : false
    // ReadConcern
    , readConcern: options.readConcern
  }

  // Ensure we have a valid db name
  validateDatabaseName(self.s.databaseName);

  // Add a read Only property
  getSingleProperty(this, 'serverConfig', self.s.topology);
  getSingleProperty(this, 'bufferMaxEntries', self.s.bufferMaxEntries);
  getSingleProperty(this, 'databaseName', self.s.databaseName);

  // This is a child db, do not register any listeners
  if(options.parentDb) return;
  if(this.s.noListener) return;

  // Add listeners
  topology.on('error', createListener(self, 'error', self));
  topology.on('timeout', createListener(self, 'timeout', self));
  topology.on('close', createListener(self, 'close', self));
  topology.on('parseError', createListener(self, 'parseError', self));
  topology.once('open', createListener(self, 'open', self));
  topology.once('fullsetup', createListener(self, 'fullsetup', self));
  topology.once('all', createListener(self, 'all', self));
  topology.on('reconnect', createListener(self, 'reconnect', self));
  topology.on('reconnectFailed', createListener(self, 'reconnectFailed', self));
}

inherits(Db, EventEmitter);

var define = Db.define = new Define('Db', Db, false);

// Topology
Object.defineProperty(Db.prototype, 'topology', {
  enumerable:true,
  get: function() { return this.s.topology; }
});

// Options
Object.defineProperty(Db.prototype, 'options', {
  enumerable:true,
  get: function() { return this.s.options; }
});

// slaveOk specified
Object.defineProperty(Db.prototype, 'slaveOk', {
  enumerable:true,
  get: function() {
    if(this.s.options.readPreference != null
      && (this.s.options.readPreference != 'primary' || this.s.options.readPreference.mode != 'primary')) {
      return true;
    }
    return false;
  }
});

// get the write Concern
Object.defineProperty(Db.prototype, 'writeConcern', {
  enumerable:true,
  get: function() {
    var ops = {};
    if(this.s.options.w != null) ops.w = this.s.options.w;
    if(this.s.options.j != null) ops.j = this.s.options.j;
    if(this.s.options.fsync != null) ops.fsync = this.s.options.fsync;
    if(this.s.options.wtimeout != null) ops.wtimeout = this.s.options.wtimeout;
    return ops;
  }
});

/**
 * The callback format for the Db.open method
 * @callback Db~openCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {Db} db The Db instance if the open method was successful.
 */

// Internal method
var open = function(self, callback) {
  self.s.topology.connect(self, self.s.options, function(err) {
    if(callback == null) return;
    var internalCallback = callback;
    callback == null;

    if(err) {
      self.close();
      return internalCallback(err);
    }

    internalCallback(null, self);
  });
}

/**
 * Open the database
 * @method
 * @param {Db~openCallback} [callback] Callback
 * @return {Promise} returns Promise if no callback passed
 */
Db.prototype.open = function(callback) {
  var self = this;
  // We provided a callback leg
  if(typeof callback == 'function') return open(self, callback);
  // Return promise
  return new self.s.promiseLibrary(function(resolve, reject) {
    open(self, function(err, db) {
      if(err) return reject(err);
      resolve(db);
    })
  });
}

define.classMethod('open', {callback: true, promise:true});

/**
 * Converts provided read preference to CoreReadPreference
 * @param {(ReadPreference|string|object)} readPreference the user provided read preference
 * @return {CoreReadPreference}
 */
var convertReadPreference = function(readPreference) {
  if(readPreference && typeof readPreference == 'string') {
    return new CoreReadPreference(readPreference);
  } else if(readPreference instanceof ReadPreference) {
    return new CoreReadPreference(readPreference.mode, readPreference.tags, {maxStalenessSeconds: readPreference.maxStalenessSeconds});
  } else if(readPreference && typeof readPreference == 'object') {
    var mode = readPreference.mode || readPreference.preference;
    if (mode && typeof mode == 'string') {
      readPreference = new CoreReadPreference(mode, readPreference.tags, {maxStalenessSeconds: readPreference.maxStalenessSeconds});
    }
  }
  return readPreference;
}

/**
 * The callback format for results
 * @callback Db~resultCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {object} result The result object if the command was executed successfully.
 */

var executeCommand = function(self, command, options, callback) {
  // Did the user destroy the topology
  if(self.serverConfig && self.serverConfig.isDestroyed()) return callback(new MongoError('topology was destroyed'));
  // Get the db name we are executing against
  var dbName = options.dbName || options.authdb || self.s.databaseName;

  // If we have a readPreference set
  if(options.readPreference == null && self.s.readPreference) {
    options.readPreference = self.s.readPreference;
  }

  // Convert the readPreference if its not a write
  if(options.readPreference) {
    options.readPreference = convertReadPreference(options.readPreference);
  } else {
    options.readPreference = CoreReadPreference.primary;
  }

  // Debug information
  if(self.s.logger.isDebug()) self.s.logger.debug(f('executing command %s against %s with options [%s]'
    , JSON.stringify(command), f('%s.$cmd', dbName), JSON.stringify(debugOptions(debugFields, options))));

  // Execute command
  self.s.topology.command(f('%s.$cmd', dbName), command, options, function(err, result) {
    if(err) return handleCallback(callback, err);
    if(options.full) return handleCallback(callback, null, result);
    handleCallback(callback, null, result.result);
  });
}

/**
 * Execute a command
 * @method
 * @param {object} command The command hash
 * @param {object} [options=null] Optional settings.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {Db~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Db.prototype.command = function(command, options, callback) {
  var self = this;
  // Change the callback
  if(typeof options == 'function') callback = options, options = {};
  // Clone the options
  options = shallowClone(options);

  // Do we have a callback
  if(typeof callback == 'function') return executeCommand(self, command, options, callback);
  // Return a promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    executeCommand(self, command, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

define.classMethod('command', {callback: true, promise:true});

/**
 * The callback format for results
 * @callback Db~noResultCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {null} result Is not set to a value
 */

/**
 * Close the db and its underlying connections
 * @method
 * @param {boolean} force Force close, emitting no events
 * @param {Db~noResultCallback} [callback] The result callback
 * @return {Promise} returns Promise if no callback passed
 */
Db.prototype.close = function(force, callback) {
  if(typeof force == 'function') callback = force, force = false;
  this.s.topology.close(force);
  var self = this;

  // Fire close event if any listeners
  if(this.listeners('close').length > 0) {
    this.emit('close');

    // If it's the top level db emit close on all children
    if(this.parentDb == null) {
      // Fire close on all children
      for(var i = 0; i < this.s.children.length; i++) {
        this.s.children[i].emit('close');
      }
    }

    // Remove listeners after emit
    self.removeAllListeners('close');
  }

  // Close parent db if set
  if(this.s.parentDb) this.s.parentDb.close();
  // Callback after next event loop tick
  if(typeof callback == 'function') return process.nextTick(function() {
    handleCallback(callback, null);
  })

  // Return dummy promise
  return new this.s.promiseLibrary(function(resolve) {
    resolve();
  });
}

define.classMethod('close', {callback: true, promise:true});

/**
 * Return the Admin db instance
 * @method
 * @return {Admin} return the new Admin db instance
 */
Db.prototype.admin = function() {
  return new Admin(this, this.s.topology, this.s.promiseLibrary);
};

define.classMethod('admin', {callback: false, promise:false, returns: [Admin]});

/**
 * The callback format for the collection method, must be used if strict is specified
 * @callback Db~collectionResultCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {Collection} collection The collection instance.
 */

var collectionKeys = ['pkFactory', 'readPreference'
  , 'serializeFunctions', 'strict', 'readConcern', 'ignoreUndefined', 'promoteValues', 'promoteBuffers', 'promoteLongs'];

/**
 * Fetch a specific collection (containing the actual collection information). If the application does not use strict mode you can
 * can use it without a callback in the following way: `var collection = db.collection('mycollection');`
 *
 * @method
 * @param {string} name the collection name we wish to access.
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.raw=false] Return document results as raw BSON buffers.
 * @param {object} [options.pkFactory=null] A primary key factory object for generation of custom _id keys.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {boolean} [options.serializeFunctions=false] Serialize functions on any object.
 * @param {boolean} [options.strict=false] Returns an error if the collection does not exist
 * @param {object} [options.readConcern=null] Specify a read concern for the collection. (only MongoDB 3.2 or higher supported)
 * @param {object} [options.readConcern.level='local'] Specify a read concern level for the collection operations, one of [local|majority]. (only MongoDB 3.2 or higher supported)
 * @param {Db~collectionResultCallback} callback The collection result callback
 * @return {Collection} return the new Collection instance if not in strict mode
 */
Db.prototype.collection = function(name, options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};
  options = shallowClone(options);
  // Set the promise library
  options.promiseLibrary = this.s.promiseLibrary;

  // If we have not set a collection level readConcern set the db level one
  options.readConcern = options.readConcern || this.s.readConcern;

  // Do we have ignoreUndefined set
  if(this.s.options.ignoreUndefined) {
    options.ignoreUndefined = this.s.options.ignoreUndefined;
  }

  // Merge in all needed options and ensure correct writeConcern merging from db level
  options = mergeOptionsAndWriteConcern(options, this.s.options, collectionKeys, true);

  // Execute
  if(options == null || !options.strict) {
    try {
      var collection = new Collection(this, this.s.topology, this.s.databaseName, name, this.s.pkFactory, options);
      if(callback) callback(null, collection);
      return collection;
    } catch(err) {
      // if(err instanceof MongoError && callback) return callback(err);
      if(callback) return callback(err);
      throw err;
    }
  }

  // Strict mode
  if(typeof callback != 'function') {
    throw toError(f("A callback is required in strict mode. While getting collection %s.", name));
  }

  // Did the user destroy the topology
  if(self.serverConfig && self.serverConfig.isDestroyed()) {
    return callback(new MongoError('topology was destroyed'));
  }

  // Strict mode
  this.listCollections({name:name}, options).toArray(function(err, collections) {
    if(err != null) return handleCallback(callback, err, null);
    if(collections.length == 0) return handleCallback(callback, toError(f("Collection %s does not exist. Currently in strict mode.", name)), null);

    try {
      return handleCallback(callback, null, new Collection(self, self.s.topology, self.s.databaseName, name, self.s.pkFactory, options));
    } catch(err) {
      return handleCallback(callback, err, null);
    }
  });
}

define.classMethod('collection', {callback: true, promise:false, returns: [Collection]});

function decorateWithWriteConcern(command, self, options) {
  // Do we support write concerns 3.4 and higher
  if(self.s.topology.capabilities().commandsTakeWriteConcern) {
    // Get the write concern settings
    var finalOptions = writeConcern(shallowClone(options), self, options);
    // Add the write concern to the command
    if(finalOptions.writeConcern) {
      command.writeConcern = finalOptions.writeConcern;
    }
  }
}

var createCollection = function(self, name, options, callback) {
  // Get the write concern options
  var finalOptions = writeConcern(shallowClone(options), self, options);
  // Did the user destroy the topology
  if(self.serverConfig && self.serverConfig.isDestroyed()) return callback(new MongoError('topology was destroyed'));
  // Check if we have the name
  self.listCollections({name: name})
    .setReadPreference(ReadPreference.PRIMARY)
    .toArray(function(err, collections) {
      if(err != null) return handleCallback(callback, err, null);
      if(collections.length > 0 && finalOptions.strict) {
        return handleCallback(callback, MongoError.create({message: f("Collection %s already exists. Currently in strict mode.", name), driver:true}), null);
      } else if (collections.length > 0) {
        try { return handleCallback(callback, null, new Collection(self, self.s.topology, self.s.databaseName, name, self.s.pkFactory, options)); }
        catch(err) { return handleCallback(callback, err); }
      }

      // Create collection command
      var cmd = {'create':name};

      // Decorate command with writeConcern if supported
      decorateWithWriteConcern(cmd, self, options);
      // Add all optional parameters
      for(var n in options) {
        if(options[n] != null
          && typeof options[n] != 'function' && illegalCommandFields.indexOf(n) == -1) {
            cmd[n] = options[n];
        }
      }

      // Force a primary read Preference
      finalOptions.readPreference = ReadPreference.PRIMARY;

      // Execute command
      self.command(cmd, finalOptions, function(err) {
        if(err) return handleCallback(callback, err);
        handleCallback(callback, null, new Collection(self, self.s.topology, self.s.databaseName, name, self.s.pkFactory, options));
      });
  });
}

/**
 * Create a new collection on a server with the specified options. Use this to create capped collections.
 * More information about command options available at https://docs.mongodb.com/manual/reference/command/create/
 *
 * @method
 * @param {string} name the collection name we wish to access.
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.raw=false] Return document results as raw BSON buffers.
 * @param {object} [options.pkFactory=null] A primary key factory object for generation of custom _id keys.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {boolean} [options.serializeFunctions=false] Serialize functions on any object.
 * @param {boolean} [options.strict=false] Returns an error if the collection does not exist
 * @param {boolean} [options.capped=false] Create a capped collection.
 * @param {boolean} [options.autoIndexId=true] Create an index on the _id field of the document, True by default on MongoDB 2.2 or higher off for version < 2.2.
 * @param {number} [options.size=null] The size of the capped collection in bytes.
 * @param {number} [options.max=null] The maximum number of documents in the capped collection.
 * @param {number} [options.flags=null] Optional. Available for the MMAPv1 storage engine only to set the usePowerOf2Sizes and the noPadding flag.
 * @param {object} [options.storageEngine=null] Allows users to specify configuration to the storage engine on a per-collection basis when creating a collection on MongoDB 3.0 or higher.
 * @param {object} [options.validator=null] Allows users to specify validation rules or expressions for the collection. For more information, see Document Validation on MongoDB 3.2 or higher.
 * @param {string} [options.validationLevel=null] Determines how strictly MongoDB applies the validation rules to existing documents during an update on MongoDB 3.2 or higher.
 * @param {string} [options.validationAction=null] Determines whether to error on invalid documents or just warn about the violations but allow invalid documents to be inserted on MongoDB 3.2 or higher.
 * @param {object} [options.indexOptionDefaults=null] Allows users to specify a default configuration for indexes when creating a collection on MongoDB 3.2 or higher.
 * @param {string} [options.viewOn=null] The name of the source collection or view from which to create the view. The name is not the full namespace of the collection or view; i.e. does not include the database name and implies the same database as the view to create on MongoDB 3.4 or higher.
 * @param {array} [options.pipeline=null] An array that consists of the aggregation pipeline stage. create creates the view by applying the specified pipeline to the viewOn collection or view on MongoDB 3.4 or higher.
 * @param {object} [options.collation=null] Specify collation (MongoDB 3.4 or higher) settings for update operation (see 3.4 documentation for available fields).
 * @param {Db~collectionResultCallback} [callback] The results callback
 * @return {Promise} returns Promise if no callback passed
 */
Db.prototype.createCollection = function(name, options, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 0);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  name = args.length ? args.shift() : null;
  options = args.length ? args.shift() || {} : {};

  // Do we have a promisesLibrary
  options.promiseLibrary = options.promiseLibrary || this.s.promiseLibrary;

  // Check if the callback is in fact a string
  if(typeof callback == 'string') name = callback;

  // Execute the fallback callback
  if(typeof callback == 'function') return createCollection(self, name, options, callback);
  return new this.s.promiseLibrary(function(resolve, reject) {
    createCollection(self, name, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

define.classMethod('createCollection', {callback: true, promise:true});

/**
 * Get all the db statistics.
 *
 * @method
 * @param {object} [options=null] Optional settings.
 * @param {number} [options.scale=null] Divide the returned sizes by scale value.
 * @param {Db~resultCallback} [callback] The collection result callback
 * @return {Promise} returns Promise if no callback passed
 */
Db.prototype.stats = function(options, callback) {
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};
  // Build command object
  var commandObject = { dbStats:true };
  // Check if we have the scale value
  if(options['scale'] != null) commandObject['scale'] = options['scale'];

  // If we have a readPreference set
  if(options.readPreference == null && this.s.readPreference) {
    options.readPreference = this.s.readPreference;
  }

  // Execute the command
  return this.command(commandObject, options, callback);
}

define.classMethod('stats', {callback: true, promise:true});

// Transformation methods for cursor results
var listCollectionsTranforms = function(databaseName) {
  var matching = f('%s.', databaseName);

  return {
    doc: function(doc) {
      var index = doc.name.indexOf(matching);
      // Remove database name if available
      if(doc.name && index == 0) {
        doc.name = doc.name.substr(index + matching.length);
      }

      return doc;
    }
  }
}

/**
 * Get the list of all collection information for the specified db.
 *
 * @method
 * @param {object} [filter={}] Query to filter collections by
 * @param {object} [options=null] Optional settings.
 * @param {number} [options.batchSize=null] The batchSize for the returned command cursor or if pre 2.8 the systems batch collection
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @return {CommandCursor}
 */
Db.prototype.listCollections = function(filter, options) {
  filter = filter || {};
  options = options || {};

  // Shallow clone the object
  options = shallowClone(options);
  // Set the promise library
  options.promiseLibrary = this.s.promiseLibrary;

  // Ensure valid readPreference
  if(options.readPreference) {
    options.readPreference = convertReadPreference(options.readPreference);
  } else {
    options.readPreference = this.s.readPreference || CoreReadPreference.primary;
  }

  // We have a list collections command
  if(this.serverConfig.capabilities().hasListCollectionsCommand) {
    // Cursor options
    var cursor = options.batchSize ? {batchSize: options.batchSize} : {}
    // Build the command
    var command = { listCollections : true, filter: filter, cursor: cursor };
    // Set the AggregationCursor constructor
    options.cursorFactory = CommandCursor;
    // Create the cursor
    cursor = this.s.topology.cursor(f('%s.$cmd', this.s.databaseName), command, options);
    // Do we have a readPreference, apply it
    if(options.readPreference) {
      cursor.setReadPreference(options.readPreference);
    }
    // Return the cursor
    return cursor;
  }

  // We cannot use the listCollectionsCommand
  if(!this.serverConfig.capabilities().hasListCollectionsCommand) {
    // If we have legacy mode and have not provided a full db name filter it
    if(typeof filter.name == 'string' && !(new RegExp('^' + this.databaseName + '\\.').test(filter.name))) {
      filter = shallowClone(filter);
      filter.name = f('%s.%s', this.s.databaseName, filter.name);
    }
  }

  // No filter, filter by current database
  if(filter == null) {
    filter.name = f('/%s/', this.s.databaseName);
  }

  // Rewrite the filter to use $and to filter out indexes
  if(filter.name) {
    filter = {$and: [{name: filter.name}, {name:/^((?!\$).)*$/}]};
  } else {
    filter = {name:/^((?!\$).)*$/};
  }

  // Return options
  var _options = {transforms: listCollectionsTranforms(this.s.databaseName)}
  // Get the cursor
  cursor = this.collection(Db.SYSTEM_NAMESPACE_COLLECTION).find(filter, _options);
  // Do we have a readPreference, apply it
  if(options.readPreference) cursor.setReadPreference(options.readPreference);
  // Set the passed in batch size if one was provided
  if(options.batchSize) cursor = cursor.batchSize(options.batchSize);
  // We have a fallback mode using legacy systems collections
  return cursor;
};

define.classMethod('listCollections', {callback: false, promise:false, returns: [CommandCursor]});

var evaluate = function(self, code, parameters, options, callback) {
  var finalCode = code;
  var finalParameters = [];

  // Did the user destroy the topology
  if(self.serverConfig && self.serverConfig.isDestroyed()) return callback(new MongoError('topology was destroyed'));

  // If not a code object translate to one
  if(!(finalCode && finalCode._bsontype == 'Code')) finalCode = new Code(finalCode);
  // Ensure the parameters are correct
  if(parameters != null && !Array.isArray(parameters) && typeof parameters !== 'function') {
    finalParameters = [parameters];
  } else if(parameters != null && Array.isArray(parameters) && typeof parameters !== 'function') {
    finalParameters = parameters;
  }

  // Create execution selector
  var cmd = {'$eval':finalCode, 'args':finalParameters};
  // Check if the nolock parameter is passed in
  if(options['nolock']) {
    cmd['nolock'] = options['nolock'];
  }

  // Set primary read preference
  options.readPreference = new CoreReadPreference(ReadPreference.PRIMARY);

  // Execute the command
  self.command(cmd, options, function(err, result) {
    if(err) return handleCallback(callback, err, null);
    if(result && result.ok == 1) return handleCallback(callback, null, result.retval);
    if(result) return handleCallback(callback, MongoError.create({message: f("eval failed: %s", result.errmsg), driver:true}), null);
    handleCallback(callback, err, result);
  });
}

/**
 * Evaluate JavaScript on the server
 *
 * @method
 * @param {Code} code JavaScript to execute on server.
 * @param {(object|array)} parameters The parameters for the call.
 * @param {object} [options=null] Optional settings.
 * @param {boolean} [options.nolock=false] Tell MongoDB not to block on the evaluation of the javascript.
 * @param {Db~resultCallback} [callback] The results callback
 * @deprecated Eval is deprecated on MongoDB 3.2 and forward
 * @return {Promise} returns Promise if no callback passed
 */
Db.prototype.eval = function(code, parameters, options, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  parameters = args.length ? args.shift() : parameters;
  options = args.length ? args.shift() || {} : {};

  // Check if the callback is in fact a string
  if(typeof callback == 'function') return evaluate(self, code, parameters, options, callback);
  // Execute the command
  return new this.s.promiseLibrary(function(resolve, reject) {
    evaluate(self, code, parameters, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
};

define.classMethod('eval', {callback: true, promise:true});

/**
 * Rename a collection.
 *
 * @method
 * @param {string} fromCollection Name of current collection to rename.
 * @param {string} toCollection New name of of the collection.
 * @param {object} [options=null] Optional settings.
 * @param {boolean} [options.dropTarget=false] Drop the target name collection if it previously exists.
 * @param {Db~collectionResultCallback} [callback] The results callback
 * @return {Promise} returns Promise if no callback passed
 */
Db.prototype.renameCollection = function(fromCollection, toCollection, options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};
  // Add return new collection
  options.new_collection = true;

  // Check if the callback is in fact a string
  if(typeof callback == 'function') {
    return this.collection(fromCollection).rename(toCollection, options, callback);
  }

  // Return a promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    self.collection(fromCollection).rename(toCollection, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
};

define.classMethod('renameCollection', {callback: true, promise:true});

/**
 * Drop a collection from the database, removing it permanently. New accesses will create a new collection.
 *
 * @method
 * @param {string} name Name of collection to drop
 * @param {Db~resultCallback} [callback] The results callback
 * @return {Promise} returns Promise if no callback passed
 */
Db.prototype.dropCollection = function(name, options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};

  // Command to execute
  var cmd = {'drop':name}

  // Decorate with write concern
  decorateWithWriteConcern(cmd, self, options);

  // options
  options = assign({}, this.s.options, {readPreference: ReadPreference.PRIMARY});

  // Check if the callback is in fact a string
  if(typeof callback == 'function') return this.command(cmd, options, function(err, result) {
    // Did the user destroy the topology
    if(self.serverConfig && self.serverConfig.isDestroyed()) return callback(new MongoError('topology was destroyed'));
    if(err) return handleCallback(callback, err);
    if(result.ok) return handleCallback(callback, null, true);
    handleCallback(callback, null, false);
  });

  // Clone the options
  options = shallowClone(self.s.options);
  // Set readPreference PRIMARY
  options.readPreference = ReadPreference.PRIMARY;

  // Execute the command
  return new this.s.promiseLibrary(function(resolve, reject) {
    // Execute command
    self.command(cmd, options, function(err, result) {
      // Did the user destroy the topology
      if(self.serverConfig && self.serverConfig.isDestroyed()) return reject(new MongoError('topology was destroyed'));
      if(err) return reject(err);
      if(result.ok) return resolve(true);
      resolve(false);
    });
  });
};

define.classMethod('dropCollection', {callback: true, promise:true});

/**
 * Drop a database, removing it permanently from the server.
 *
 * @method
 * @param {Db~resultCallback} [callback] The results callback
 * @return {Promise} returns Promise if no callback passed
 */
Db.prototype.dropDatabase = function(options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};
  // Drop database command
  var cmd = {'dropDatabase':1};

  // Decorate with write concern
  decorateWithWriteConcern(cmd, self, options);

  // Ensure primary only
  options = assign({}, this.s.options, {readPreference: ReadPreference.PRIMARY});

  // Check if the callback is in fact a string
  if(typeof callback == 'function') return this.command(cmd, options, function(err, result) {
    // Did the user destroy the topology
    if(self.serverConfig && self.serverConfig.isDestroyed()) return callback(new MongoError('topology was destroyed'));
    if(callback == null) return;
    if(err) return handleCallback(callback, err, null);
    handleCallback(callback, null, result.ok ? true : false);
  });

  // Execute the command
  return new this.s.promiseLibrary(function(resolve, reject) {
    // Execute command
    self.command(cmd, options, function(err, result) {
      // Did the user destroy the topology
      if(self.serverConfig && self.serverConfig.isDestroyed()) return reject(new MongoError('topology was destroyed'));
      if(err) return reject(err);
      if(result.ok) return resolve(true);
      resolve(false);
    });
  });
}

define.classMethod('dropDatabase', {callback: true, promise:true});

/**
 * The callback format for the collections method.
 * @callback Db~collectionsResultCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {Collection[]} collections An array of all the collections objects for the db instance.
 */
var collections = function(self, callback) {
  // Let's get the collection names
  self.listCollections().toArray(function(err, documents) {
    if(err != null) return handleCallback(callback, err, null);
    // Filter collections removing any illegal ones
    documents = documents.filter(function(doc) {
      return doc.name.indexOf('$') == -1;
    });

    // Return the collection objects
    handleCallback(callback, null, documents.map(function(d) {
      return new Collection(self, self.s.topology, self.s.databaseName, d.name, self.s.pkFactory, self.s.options);
    }));
  });
}

/**
 * Fetch all collections for the current db.
 *
 * @method
 * @param {Db~collectionsResultCallback} [callback] The results callback
 * @return {Promise} returns Promise if no callback passed
 */
Db.prototype.collections = function(callback) {
  var self = this;

  // Return the callback
  if(typeof callback == 'function') return collections(self, callback);
  // Return the promise
  return new self.s.promiseLibrary(function(resolve, reject) {
    collections(self, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
};

define.classMethod('collections', {callback: true, promise:true});

/**
 * Runs a command on the database as admin.
 * @method
 * @param {object} command The command hash
 * @param {object} [options=null] Optional settings.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {Db~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Db.prototype.executeDbAdminCommand = function(selector, options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};

  // Return the callback
  if(typeof callback == 'function') {
    // Convert read preference
    if(options.readPreference) {
      options.readPreference = convertReadPreference(options.readPreference)
    }

    return self.s.topology.command('admin.$cmd', selector, options, function(err, result) {
      // Did the user destroy the topology
      if(self.serverConfig && self.serverConfig.isDestroyed()) return callback(new MongoError('topology was destroyed'));
      if(err) return handleCallback(callback, err);
      handleCallback(callback, null, result.result);
    });
  }

  // Return promise
  return new self.s.promiseLibrary(function(resolve, reject) {
    self.s.topology.command('admin.$cmd', selector, options, function(err, result) {
      // Did the user destroy the topology
      if(self.serverConfig && self.serverConfig.isDestroyed()) return reject(new MongoError('topology was destroyed'));
      if(err) return reject(err);
      resolve(result.result);
    });
  });
};

define.classMethod('executeDbAdminCommand', {callback: true, promise:true});

/**
 * Creates an index on the db and collection collection.
 * @method
 * @param {string} name Name of the collection to create the index on.
 * @param {(string|object)} fieldOrSpec Defines the index.
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.unique=false] Creates an unique index.
 * @param {boolean} [options.sparse=false] Creates a sparse index.
 * @param {boolean} [options.background=false] Creates the index in the background, yielding whenever possible.
 * @param {boolean} [options.dropDups=false] A unique index cannot be created on a key that has pre-existing duplicate values. If you would like to create the index anyway, keeping the first document the database indexes and deleting all subsequent documents that have duplicate value
 * @param {number} [options.min=null] For geospatial indexes set the lower bound for the co-ordinates.
 * @param {number} [options.max=null] For geospatial indexes set the high bound for the co-ordinates.
 * @param {number} [options.v=null] Specify the format version of the indexes.
 * @param {number} [options.expireAfterSeconds=null] Allows you to expire data on indexes applied to a data (MongoDB 2.2 or higher)
 * @param {number} [options.name=null] Override the autogenerated index name (useful if the resulting name is larger than 128 bytes)
 * @param {object} [options.partialFilterExpression=null] Creates a partial index based on the given filter object (MongoDB 3.2 or higher)
 * @param {Db~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Db.prototype.createIndex = function(name, fieldOrSpec, options, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 2);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  options = args.length ? args.shift() || {} : {};
  options = typeof callback === 'function' ? options : callback;
  options = options == null ? {} : options;
  // Shallow clone the options
  options = shallowClone(options);

  // If we have a callback fallback
  if(typeof callback == 'function') return createIndex(self, name, fieldOrSpec, options, callback);
  // Return a promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    createIndex(self, name, fieldOrSpec, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
};

var createIndex = function(self, name, fieldOrSpec, options, callback) {
  // Get the write concern options
  var finalOptions = writeConcern({}, self, options, { readPreference: ReadPreference.PRIMARY });
  // Ensure we have a callback
  if(finalOptions.writeConcern && typeof callback != 'function') {
    throw MongoError.create({message: "Cannot use a writeConcern without a provided callback", driver:true});
  }

  // Run only against primary
  options.readPreference = ReadPreference.PRIMARY;

  // Did the user destroy the topology
  if(self.serverConfig && self.serverConfig.isDestroyed()) return callback(new MongoError('topology was destroyed'));

  // Attempt to run using createIndexes command
  createIndexUsingCreateIndexes(self, name, fieldOrSpec, options, function(err, result) {
    if(err == null) return handleCallback(callback, err, result);

    // 67 = 'CannotCreateIndex' (malformed index options)
    // 85 = 'IndexOptionsConflict' (index already exists with different options)
    // 11000 = 'DuplicateKey' (couldn't build unique index because of dupes)
    // 11600 = 'InterruptedAtShutdown' (interrupted at shutdown)
    // These errors mean that the server recognized `createIndex` as a command
    // and so we don't need to fallback to an insert.
    if(err.code === 67 || err.code == 11000 || err.code === 85 || err.code == 11600) {
      return handleCallback(callback, err, result);
    }

    // Create command
    var doc = createCreateIndexCommand(self, name, fieldOrSpec, options);
    // Set no key checking
    finalOptions.checkKeys = false;
    // Insert document
    self.s.topology.insert(f("%s.%s", self.s.databaseName, Db.SYSTEM_INDEX_COLLECTION), doc, finalOptions, function(err, result) {
      if(callback == null) return;
      if(err) return handleCallback(callback, err);
      if(result == null) return handleCallback(callback, null, null);
      if(result.result.writeErrors) return handleCallback(callback, MongoError.create(result.result.writeErrors[0]), null);
      handleCallback(callback, null, doc.name);
    });
  });
}

define.classMethod('createIndex', {callback: true, promise:true});

/**
 * Ensures that an index exists, if it does not it creates it
 * @method
 * @deprecated since version 2.0
 * @param {string} name The index name
 * @param {(string|object)} fieldOrSpec Defines the index.
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.unique=false] Creates an unique index.
 * @param {boolean} [options.sparse=false] Creates a sparse index.
 * @param {boolean} [options.background=false] Creates the index in the background, yielding whenever possible.
 * @param {boolean} [options.dropDups=false] A unique index cannot be created on a key that has pre-existing duplicate values. If you would like to create the index anyway, keeping the first document the database indexes and deleting all subsequent documents that have duplicate value
 * @param {number} [options.min=null] For geospatial indexes set the lower bound for the co-ordinates.
 * @param {number} [options.max=null] For geospatial indexes set the high bound for the co-ordinates.
 * @param {number} [options.v=null] Specify the format version of the indexes.
 * @param {number} [options.expireAfterSeconds=null] Allows you to expire data on indexes applied to a data (MongoDB 2.2 or higher)
 * @param {number} [options.name=null] Override the autogenerated index name (useful if the resulting name is larger than 128 bytes)
 * @param {Db~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Db.prototype.ensureIndex = function(name, fieldOrSpec, options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};

  // If we have a callback fallback
  if(typeof callback == 'function') return ensureIndex(self, name, fieldOrSpec, options, callback);

  // Return a promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    ensureIndex(self, name, fieldOrSpec, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
};

var ensureIndex = function(self, name, fieldOrSpec, options, callback) {
  // Get the write concern options
  var finalOptions = writeConcern({}, self, options);
  // Create command
  var selector = createCreateIndexCommand(self, name, fieldOrSpec, options);
  var index_name = selector.name;

  // Did the user destroy the topology
  if(self.serverConfig && self.serverConfig.isDestroyed()) return callback(new MongoError('topology was destroyed'));

  // Merge primary readPreference
  finalOptions.readPreference = ReadPreference.PRIMARY

  // Check if the index already exists
  self.indexInformation(name, finalOptions, function(err, indexInformation) {
    if(err != null && err.code != 26) return handleCallback(callback, err, null);
    // If the index does not exist, create it
    if(indexInformation == null || !indexInformation[index_name])  {
      self.createIndex(name, fieldOrSpec, options, callback);
    } else {
      if(typeof callback === 'function') return handleCallback(callback, null, index_name);
    }
  });
}

define.classMethod('ensureIndex', {callback: true, promise:true});

Db.prototype.addChild = function(db) {
  if(this.s.parentDb) return this.s.parentDb.addChild(db);
  this.s.children.push(db);
}

/**
 * Create a new Db instance sharing the current socket connections. Be aware that the new db instances are
 * related in a parent-child relationship to the original instance so that events are correctly emitted on child
 * db instances. Child db instances are cached so performing db('db1') twice will return the same instance.
 * You can control these behaviors with the options noListener and returnNonCachedInstance.
 *
 * @method
 * @param {string} name The name of the database we want to use.
 * @param {object} [options=null] Optional settings.
 * @param {boolean} [options.noListener=false] Do not make the db an event listener to the original connection.
 * @param {boolean} [options.returnNonCachedInstance=false] Control if you want to return a cached instance or have a new one created
 * @return {Db}
 */
Db.prototype.db = function(dbName, options) {
  options = options || {};

  // Copy the options and add out internal override of the not shared flag
  var finalOptions = assign({}, this.options, options);

  // Do we have the db in the cache already
  if(this.s.dbCache[dbName] && finalOptions.returnNonCachedInstance !== true) {
    return this.s.dbCache[dbName];
  }

  // Add current db as parentDb
  if(finalOptions.noListener == null || finalOptions.noListener == false) {
    finalOptions.parentDb = this;
  }

  // Add promiseLibrary
  finalOptions.promiseLibrary = this.s.promiseLibrary;

  // Return the db object
  var db = new Db(dbName, this.s.topology, finalOptions)

  // Add as child
  if(finalOptions.noListener == null || finalOptions.noListener == false) {
    this.addChild(db);
  }

  // Add the db to the cache
  this.s.dbCache[dbName] = db;
  // Return the database
  return db;
};

define.classMethod('db', {callback: false, promise:false, returns: [Db]});

var _executeAuthCreateUserCommand = function(self, username, password, options, callback) {
  // Special case where there is no password ($external users)
  if(typeof username == 'string'
    && password != null && typeof password == 'object') {
    options = password;
    password = null;
  }

  // Unpack all options
  if(typeof options == 'function') {
    callback = options;
    options = {};
  }

  // Error out if we digestPassword set
  if(options.digestPassword != null) {
    throw toError("The digestPassword option is not supported via add_user. Please use db.command('createUser', ...) instead for this option.");
  }

  // Get additional values
  var customData = options.customData != null ? options.customData : {};
  var roles = Array.isArray(options.roles) ? options.roles : [];
  var maxTimeMS = typeof options.maxTimeMS == 'number' ? options.maxTimeMS : null;

  // If not roles defined print deprecated message
  if(roles.length == 0) {
    console.log("Creating a user without roles is deprecated in MongoDB >= 2.6");
  }

  // Get the error options
  var commandOptions = {writeCommand:true};
  if(options['dbName']) commandOptions.dbName = options['dbName'];

  // Add maxTimeMS to options if set
  if(maxTimeMS != null) commandOptions.maxTimeMS = maxTimeMS;

  // Check the db name and add roles if needed
  if((self.databaseName.toLowerCase() == 'admin' || options.dbName == 'admin') && !Array.isArray(options.roles)) {
    roles = ['root']
  } else if(!Array.isArray(options.roles)) {
    roles = ['dbOwner']
  }

  // Build the command to execute
  var command = {
      createUser: username
    , customData: customData
    , roles: roles
    , digestPassword:false
  }

  // Apply write concern to command
  command = writeConcern(command, self, options);

  // Use node md5 generator
  var md5 = crypto.createHash('md5');
  // Generate keys used for authentication
  md5.update(username + ":mongo:" + password);
  var userPassword = md5.digest('hex');

  // No password
  if(typeof password == 'string') {
    command.pwd = userPassword;
  }

  // Force write using primary
  commandOptions.readPreference = ReadPreference.primary;

  // Execute the command
  self.command(command, commandOptions, function(err, result) {
    if(err && err.ok == 0 && err.code == undefined) return handleCallback(callback, {code: -5000}, null);
    if(err) return handleCallback(callback, err, null);
    handleCallback(callback, !result.ok ? toError(result) : null
      , result.ok ? [{user: username, pwd: ''}] : null);
  })
}

var addUser = function(self, username, password, options, callback) {
  // Did the user destroy the topology
  if(self.serverConfig && self.serverConfig.isDestroyed()) return callback(new MongoError('topology was destroyed'));
  // Attempt to execute auth command
  _executeAuthCreateUserCommand(self, username, password, options, function(err, r) {
    // We need to perform the backward compatible insert operation
    if(err && err.code == -5000) {
      var finalOptions = writeConcern(shallowClone(options), self, options);
      // Use node md5 generator
      var md5 = crypto.createHash('md5');
      // Generate keys used for authentication
      md5.update(username + ":mongo:" + password);
      var userPassword = md5.digest('hex');

      // If we have another db set
      var db = options.dbName ? self.db(options.dbName) : self;

      // Fetch a user collection
      var collection = db.collection(Db.SYSTEM_USER_COLLECTION);

      // Check if we are inserting the first user
      collection.count({}, function(err, count) {
        // We got an error (f.ex not authorized)
        if(err != null) return handleCallback(callback, err, null);
        // Check if the user exists and update i
        collection.find({user: username}, {dbName: options['dbName']}).toArray(function(err) {
          // We got an error (f.ex not authorized)
          if(err != null) return handleCallback(callback, err, null);
          // Add command keys
          finalOptions.upsert = true;

          // We have a user, let's update the password or upsert if not
          collection.update({user: username},{$set: {user: username, pwd: userPassword}}, finalOptions, function(err) {
            if(count == 0 && err) return handleCallback(callback, null, [{user:username, pwd:userPassword}]);
            if(err) return handleCallback(callback, err, null)
            handleCallback(callback, null, [{user:username, pwd:userPassword}]);
          });
        });
      });

      return;
    }

    if(err) return handleCallback(callback, err);
    handleCallback(callback, err, r);
  });
}

/**
 * Add a user to the database.
 * @method
 * @param {string} username The username.
 * @param {string} password The password.
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {object} [options.customData=null] Custom data associated with the user (only Mongodb 2.6 or higher)
 * @param {object[]} [options.roles=null] Roles associated with the created user (only Mongodb 2.6 or higher)
 * @param {Db~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Db.prototype.addUser = function(username, password, options, callback) {
  // Unpack the parameters
  var self = this;
  var args = Array.prototype.slice.call(arguments, 2);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  options = args.length ? args.shift() || {} : {};

  // If we have a callback fallback
  if(typeof callback == 'function') return addUser(self, username, password, options, callback);

  // Return a promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    addUser(self, username, password, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
};

define.classMethod('addUser', {callback: true, promise:true});

var _executeAuthRemoveUserCommand = function(self, username, options, callback) {
  if(typeof options == 'function') callback = options, options = {};
  // Did the user destroy the topology
  if(self.serverConfig && self.serverConfig.isDestroyed()) return callback(new MongoError('topology was destroyed'));
  // Get the error options
  var commandOptions = {writeCommand:true};
  if(options['dbName']) commandOptions.dbName = options['dbName'];

  // Get additional values
  var maxTimeMS = typeof options.maxTimeMS == 'number' ? options.maxTimeMS : null;

  // Add maxTimeMS to options if set
  if(maxTimeMS != null) commandOptions.maxTimeMS = maxTimeMS;

  // Build the command to execute
  var command = {
    dropUser: username
  }

  // Apply write concern to command
  command = writeConcern(command, self, options);

  // Force write using primary
  commandOptions.readPreference = ReadPreference.primary;

  // Execute the command
  self.command(command, commandOptions, function(err, result) {
    if(err && !err.ok && err.code == undefined) return handleCallback(callback, {code: -5000});
    if(err) return handleCallback(callback, err, null);
    handleCallback(callback, null, result.ok ? true : false);
  })
}

var removeUser = function(self, username, options, callback) {
  // Attempt to execute command
  _executeAuthRemoveUserCommand(self, username, options, function(err, result) {
    if(err && err.code == -5000) {
      var finalOptions = writeConcern(shallowClone(options), self, options);
      // If we have another db set
      var db = options.dbName ? self.db(options.dbName) : self;

      // Fetch a user collection
      var collection = db.collection(Db.SYSTEM_USER_COLLECTION);

      // Locate the user
      collection.findOne({user: username}, {}, function(err, user) {
        if(user == null) return handleCallback(callback, err, false);
        collection.remove({user: username}, finalOptions, function(err) {
          handleCallback(callback, err, true);
        });
      });

      return;
    }

    if(err) return handleCallback(callback, err);
    handleCallback(callback, err, result);
  });
}

define.classMethod('removeUser', {callback: true, promise:true});

/**
 * Remove a user from a database
 * @method
 * @param {string} username The username.
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {Db~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Db.prototype.removeUser = function(username, options, callback) {
  // Unpack the parameters
  var self = this;
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  options = args.length ? args.shift() || {} : {};

  // If we have a callback fallback
  if(typeof callback == 'function') return removeUser(self, username, options, callback);

  // Return a promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    removeUser(self, username, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
};

/**
 * Authenticate a user against the server.
 * @method
 * @param {string} username The username.
 * @param {string} [password] The password.
 * @param {object} [options=null] Optional settings.
 * @param {string} [options.authMechanism=MONGODB-CR] The authentication mechanism to use, GSSAPI, MONGODB-CR, MONGODB-X509, PLAIN
 * @param {Db~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 * @deprecated This method will no longer be available in the next major release 3.x as MongoDB 3.6 will only allow auth against users in the admin db and will no longer allow multiple credentials on a socket. Please authenticate using MongoClient.connect with auth credentials.
 */
Db.prototype.authenticate = function(username, password, options, callback) {
  console.warn("Db.prototype.authenticate method will no longer be available in the next major release 3.x as MongoDB 3.6 will only allow auth against users in the admin db and will no longer allow multiple credentials on a socket. Please authenticate using MongoClient.connect with auth credentials.");
  return authenticate.apply(this, [this].concat(Array.prototype.slice.call(arguments)));
};

define.classMethod('authenticate', {callback: true, promise:true});

/**
 * Logout user from server, fire off on all connections and remove all auth info
 * @method
 * @param {object} [options=null] Optional settings.
 * @param {string} [options.dbName=null] Logout against different database than current.
 * @param {Db~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Db.prototype.logout = function(options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};

  // Establish the correct database name
  var dbName = this.s.authSource ? this.s.authSource : this.s.databaseName;
  dbName = options.dbName ? options.dbName : dbName;

  // If we have a callback
  if(typeof callback == 'function') {
    return self.s.topology.logout(dbName, function(err) {
      if(err) return callback(err);
      callback(null, true);
    });
  }

  // Return a promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    self.s.topology.logout(dbName, function(err) {
      if(err) return reject(err);
      resolve(true);
    });
  });
}

define.classMethod('logout', {callback: true, promise:true});

/**
 * Retrieves this collections index info.
 * @method
 * @param {string} name The name of the collection.
 * @param {object} [options=null] Optional settings.
 * @param {boolean} [options.full=false] Returns the full raw index information.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {Db~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Db.prototype.indexInformation = function(name, options, callback) {
  var self = this;
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};

  // If we have a callback fallback
  if(typeof callback == 'function') return indexInformation(self, name, options, callback);

  // Return a promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    indexInformation(self, name, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
};

var indexInformation = function(self, name, options, callback) {
    // If we specified full information
  var full = options['full'] == null ? false : options['full'];

  // Did the user destroy the topology
  if(self.serverConfig && self.serverConfig.isDestroyed()) return callback(new MongoError('topology was destroyed'));
  // Process all the results from the index command and collection
  var processResults = function(indexes) {
    // Contains all the information
    var info = {};
    // Process all the indexes
    for(var i = 0; i < indexes.length; i++) {
      var index = indexes[i];
      // Let's unpack the object
      info[index.name] = [];
      for(var name in index.key) {
        info[index.name].push([name, index.key[name]]);
      }
    }

    return info;
  }

  // Get the list of indexes of the specified collection
  self.collection(name).listIndexes(options).toArray(function(err, indexes) {
    if(err) return callback(toError(err));
    if(!Array.isArray(indexes)) return handleCallback(callback, null, []);
    if(full) return handleCallback(callback, null, indexes);
    handleCallback(callback, null, processResults(indexes));
  });
}

define.classMethod('indexInformation', {callback: true, promise:true});

var createCreateIndexCommand = function(db, name, fieldOrSpec, options) {
  var indexParameters = parseIndexOptions(fieldOrSpec);
  var fieldHash = indexParameters.fieldHash;

  // Generate the index name
  var indexName = typeof options.name == 'string' ? options.name : indexParameters.name;
  var selector = {
    'ns': db.databaseName + "." + name, 'key': fieldHash, 'name': indexName
  }

  // Ensure we have a correct finalUnique
  var finalUnique = options == null || 'object' === typeof options ? false : options;
  // Set up options
  options = options == null || typeof options == 'boolean' ? {} : options;

  // Add all the options
  var keysToOmit = Object.keys(selector);
  for(var optionName in options) {
    if(keysToOmit.indexOf(optionName) == -1) {
      selector[optionName] = options[optionName];
    }
  }

  if(selector['unique'] == null) selector['unique'] = finalUnique;

  // Remove any write concern operations
  var removeKeys = ['w', 'wtimeout', 'j', 'fsync', 'readPreference'];
  for(var i = 0; i < removeKeys.length; i++) {
    delete selector[removeKeys[i]];
  }

  // Return the command creation selector
  return selector;
}

var createIndexUsingCreateIndexes = function(self, name, fieldOrSpec, options, callback) {
  // Build the index
  var indexParameters = parseIndexOptions(fieldOrSpec);
  // Generate the index name
  var indexName = typeof options.name == 'string' ? options.name : indexParameters.name;
  // Set up the index
  var indexes = [{ name: indexName, key: indexParameters.fieldHash }];
  // merge all the options
  var keysToOmit = Object.keys(indexes[0]);
  for(var optionName in options) {
    if(keysToOmit.indexOf(optionName) == -1) {
      indexes[0][optionName] = options[optionName];
    }

    // Remove any write concern operations
    var removeKeys = ['w', 'wtimeout', 'j', 'fsync', 'readPreference'];
    for(var i = 0; i < removeKeys.length; i++) {
      delete indexes[0][removeKeys[i]];
    }
  }

  // Get capabilities
  var capabilities = self.s.topology.capabilities();

  // Did the user pass in a collation, check if our write server supports it
  if(indexes[0].collation && capabilities && !capabilities.commandsTakeCollation) {
    // Create a new error
    var error = new MongoError(f('server/primary/mongos does not support collation'));
    error.code = 67;
    // Return the error
    return callback(error);
  }

  // Create command, apply write concern to command
  var cmd = writeConcern({createIndexes: name, indexes: indexes}, self, options);

  // Decorate command with writeConcern if supported
  decorateWithWriteConcern(cmd, self, options);

  // ReadPreference primary
  options.readPreference = ReadPreference.PRIMARY;

  // Build the command
  self.command(cmd, options, function(err, result) {
    if(err) return handleCallback(callback, err, null);
    if(result.ok == 0) return handleCallback(callback, toError(result), null);
    // Return the indexName for backward compatibility
    handleCallback(callback, null, indexName);
  });
}

// Validate the database name
var validateDatabaseName = function(databaseName) {
  if(typeof databaseName !== 'string') throw MongoError.create({message: "database name must be a string", driver:true});
  if(databaseName.length === 0) throw MongoError.create({message: "database name cannot be the empty string", driver:true});
  if(databaseName == '$external') return;

  var invalidChars = [" ", ".", "$", "/", "\\"];
  for(var i = 0; i < invalidChars.length; i++) {
    if(databaseName.indexOf(invalidChars[i]) != -1) throw MongoError.create({message: "database names cannot contain the character '" + invalidChars[i] + "'", driver:true});
  }
}

// Get write concern
var writeConcern = function(target, db, options) {
  if(options.w != null || options.j != null || options.fsync != null) {
    var opts = {};
    if(options.w) opts.w = options.w;
    if(options.wtimeout) opts.wtimeout = options.wtimeout;
    if(options.j) opts.j = options.j;
    if(options.fsync) opts.fsync = options.fsync;
    target.writeConcern = opts;
  } else if(db.writeConcern.w != null || db.writeConcern.j != null || db.writeConcern.fsync != null) {
    target.writeConcern = db.writeConcern;
  }

  return target
}

// Add listeners to topology
var createListener = function(self, e, object) {
  var listener = function(err) {
    if(object.listeners(e).length > 0) {
      object.emit(e, err, self);

      // Emit on all associated db's if available
      for(var i = 0; i < self.s.children.length; i++) {
        self.s.children[i].emit(e, err, self.s.children[i]);
      }
    }
  }
  return listener;
}


/**
 * Unref all sockets
 * @method
 */
Db.prototype.unref = function() {
  this.s.topology.unref();
}

/**
 * Db close event
 *
 * Emitted after a socket closed against a single server or mongos proxy.
 *
 * @event Db#close
 * @type {MongoError}
 */

/**
 * Db authenticated event
 *
 * Emitted after all server members in the topology (single server, replicaset or mongos) have successfully authenticated.
 *
 * @event Db#authenticated
 * @type {object}
 */

/**
 * Db reconnect event
 *
 *  * Server: Emitted when the driver has reconnected and re-authenticated.
 *  * ReplicaSet: N/A
 *  * Mongos: Emitted when the driver reconnects and re-authenticates successfully against a Mongos.
 *
 * @event Db#reconnect
 * @type {object}
 */

/**
 * Db error event
 *
 * Emitted after an error occurred against a single server or mongos proxy.
 *
 * @event Db#error
 * @type {MongoError}
 */

/**
 * Db timeout event
 *
 * Emitted after a socket timeout occurred against a single server or mongos proxy.
 *
 * @event Db#timeout
 * @type {MongoError}
 */

/**
 * Db parseError event
 *
 * The parseError event is emitted if the driver detects illegal or corrupt BSON being received from the server.
 *
 * @event Db#parseError
 * @type {MongoError}
 */

/**
 * Db fullsetup event, emitted when all servers in the topology have been connected to at start up time.
 *
 * * Server: Emitted when the driver has connected to the single server and has authenticated.
 * * ReplSet: Emitted after the driver has attempted to connect to all replicaset members.
 * * Mongos: Emitted after the driver has attempted to connect to all mongos proxies.
 *
 * @event Db#fullsetup
 * @type {Db}
 */

// Constants
Db.SYSTEM_NAMESPACE_COLLECTION = "system.namespaces";
Db.SYSTEM_INDEX_COLLECTION = "system.indexes";
Db.SYSTEM_PROFILE_COLLECTION = "system.profile";
Db.SYSTEM_USER_COLLECTION = "system.users";
Db.SYSTEM_COMMAND_COLLECTION = "$cmd";
Db.SYSTEM_JS_COLLECTION = "system.js";

module.exports = Db;


/***/ }),
/* 35 */
/***/ (function(module, exports, __webpack_require__) {

var shallowClone = __webpack_require__(0).shallowClone
  , handleCallback = __webpack_require__(0).handleCallback
  , MongoError = __webpack_require__(1).MongoError
  , f = __webpack_require__(2).format;

var authenticate = function(self, username, password, options, callback) {
  // Did the user destroy the topology
  if(self.serverConfig && self.serverConfig.isDestroyed()) return callback(new MongoError('topology was destroyed'));

  // the default db to authenticate against is 'self'
  // if authenticate is called from a retry context, it may be another one, like admin
  var authdb = options.dbName ? options.dbName : self.databaseName;
  authdb = self.authSource ? self.authSource : authdb;
  authdb = options.authdb ? options.authdb : authdb;
  authdb = options.authSource ? options.authSource : authdb;

  // Callback
  var _callback = function(err, result) {
    if(self.listeners('authenticated').length > 0) {
      self.emit('authenticated', err, result);
    }

    // Return to caller
    handleCallback(callback, err, result);
  }

  // authMechanism
  var authMechanism = options.authMechanism || '';
  authMechanism = authMechanism.toUpperCase();

  // If classic auth delegate to auth command
  if(authMechanism == 'MONGODB-CR') {
    self.s.topology.auth('mongocr', authdb, username, password, function(err) {
      if(err) return handleCallback(callback, err, false);
      _callback(null, true);
    });
  } else if(authMechanism == 'PLAIN') {
    self.s.topology.auth('plain', authdb, username, password, function(err) {
      if(err) return handleCallback(callback, err, false);
      _callback(null, true);
    });
  } else if(authMechanism == 'MONGODB-X509') {
    self.s.topology.auth('x509', authdb, username, password, function(err) {
      if(err) return handleCallback(callback, err, false);
      _callback(null, true);
    });
  } else if(authMechanism == 'SCRAM-SHA-1') {
    self.s.topology.auth('scram-sha-1', authdb, username, password, function(err) {
      if(err) return handleCallback(callback, err, false);
      _callback(null, true);
    });
  } else if(authMechanism == 'GSSAPI') {
    if(process.platform == 'win32') {
      self.s.topology.auth('sspi', authdb, username, password, options, function(err) {
        if(err) return handleCallback(callback, err, false);
        _callback(null, true);
      });
    } else {
      self.s.topology.auth('gssapi', authdb, username, password, options, function(err) {
        if(err) return handleCallback(callback, err, false);
        _callback(null, true);
      });
    }
  } else if(authMechanism == 'DEFAULT') {
    self.s.topology.auth('default', authdb, username, password, function(err) {
      if(err) return handleCallback(callback, err, false);
      _callback(null, true);
    });
  } else {
    handleCallback(callback, MongoError.create({message: f("authentication mechanism %s not supported", options.authMechanism), driver:true}));
  }
}

module.exports = function(self, username, password, options, callback) {
  if(typeof options == 'function') callback = options, options = {};
  // Shallow copy the options
  options = shallowClone(options);

  // Set default mechanism
  if(!options.authMechanism) {
    options.authMechanism = 'DEFAULT';
  } else if(options.authMechanism != 'GSSAPI'
    && options.authMechanism != 'DEFAULT'
    && options.authMechanism != 'MONGODB-CR'
    && options.authMechanism != 'MONGODB-X509'
    && options.authMechanism != 'SCRAM-SHA-1'
    && options.authMechanism != 'PLAIN') {
      return handleCallback(callback, MongoError.create({message: "only DEFAULT, GSSAPI, PLAIN, MONGODB-X509, SCRAM-SHA-1 or MONGODB-CR is supported by authMechanism", driver:true}));
  }

  // If we have a callback fallback
  if(typeof callback == 'function') return authenticate(self, username, password, options, function(err, r) {
    // Support failed auth method
    if(err && err.message && err.message.indexOf('saslStart') != -1) err.code = 59;
    // Reject error
    if(err) return callback(err, r);
    callback(null, r);
  });

  // Return a promise
  return new self.s.promiseLibrary(function(resolve, reject) {
    authenticate(self, username, password, options, function(err, r) {
      // Support failed auth method
      if(err && err.message && err.message.indexOf('saslStart') != -1) err.code = 59;
      // Reject error
      if(err) return reject(err);
      resolve(r);
    });
  });
};


/***/ }),
/* 36 */
/***/ (function(module, exports) {

module.exports = require("os");

/***/ }),
/* 37 */
/***/ (function(module, exports) {

module.exports = {"_from":"mongodb@2.2.35","_id":"mongodb@2.2.35","_inBundle":false,"_integrity":"sha512-3HGLucDg/8EeYMin3k+nFWChTA85hcYDCw1lPsWR6yV9A6RgKb24BkLiZ9ySZR+S0nfBjWoIUS7cyV6ceGx5Gg==","_location":"/mongodb","_phantomChildren":{"buffer-shims":"1.0.0","core-util-is":"1.0.2","inherits":"2.0.3","isarray":"1.0.0","process-nextick-args":"1.0.7","string_decoder":"1.0.3","util-deprecate":"1.0.2"},"_requested":{"type":"version","registry":true,"raw":"mongodb@2.2.35","name":"mongodb","escapedName":"mongodb","rawSpec":"2.2.35","saveSpec":null,"fetchSpec":"2.2.35"},"_requiredBy":["#USER","/"],"_resolved":"https://registry.npmjs.org/mongodb/-/mongodb-2.2.35.tgz","_shasum":"cd1b5af8a9463e3f9a787fa5b3d05565579730f9","_spec":"mongodb@2.2.35","_where":"C:\\Users\\CandisW\\Documents\\GitHub\\quick-notes-app","author":{"name":"Christian Kvalheim"},"bugs":{"url":"https://github.com/mongodb/node-mongodb-native/issues"},"bundleDependencies":false,"dependencies":{"es6-promise":"3.2.1","mongodb-core":"2.1.19","readable-stream":"2.2.7"},"deprecated":false,"description":"The official MongoDB driver for Node.js","devDependencies":{"JSONStream":"^1.0.7","betterbenchmarks":"^0.1.0","bluebird":"3.4.6","bson":"latest","cli-table":"^0.3.1","co":"4.6.0","colors":"^1.1.2","conventional-changelog-cli":"^1.3.5","coveralls":"^2.11.6","eslint":"^3.8.1","event-stream":"^3.3.2","gleak":"0.5.0","integra":"0.1.8","jsdoc":"3.4.0","ldjson-stream":"^1.2.1","mongodb-extended-json":"1.7.1","mongodb-topology-manager":"1.0.x","mongodb-version-manager":"github:christkv/mongodb-version-manager#master","nyc":"^8.1.0","optimist":"0.6.1","rimraf":"2.5.4","semver":"5.3.0","worker-farm":"^1.3.1"},"engines":{"node":">=0.10.3"},"homepage":"https://github.com/mongodb/node-mongodb-native","keywords":["mongodb","driver","official"],"license":"Apache-2.0","main":"index.js","name":"mongodb","nyc":{"include":["lib/**/*.js"]},"repository":{"type":"git","url":"git+ssh://git@github.com/mongodb/node-mongodb-native.git"},"scripts":{"changelog":"conventional-changelog -p angular -i HISTORY.md -s","coverage":"nyc node test/runner.js -t functional && node_modules/.bin/nyc report --reporter=text-lcov | node_modules/.bin/coveralls","lint":"eslint lib","test":"node test/runner.js -t functional"},"version":"2.2.35"}

/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * body-parser
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module dependencies.
 * @private
 */

var deprecate = __webpack_require__(9)('body-parser')

/**
 * Cache of loaded parsers.
 * @private
 */

var parsers = Object.create(null)

/**
 * @typedef Parsers
 * @type {function}
 * @property {function} json
 * @property {function} raw
 * @property {function} text
 * @property {function} urlencoded
 */

/**
 * Module exports.
 * @type {Parsers}
 */

exports = module.exports = deprecate.function(bodyParser,
  'bodyParser: use individual json/urlencoded middlewares')

/**
 * JSON parser.
 * @public
 */

Object.defineProperty(exports, 'json', {
  configurable: true,
  enumerable: true,
  get: createParserGetter('json')
})

/**
 * Raw parser.
 * @public
 */

Object.defineProperty(exports, 'raw', {
  configurable: true,
  enumerable: true,
  get: createParserGetter('raw')
})

/**
 * Text parser.
 * @public
 */

Object.defineProperty(exports, 'text', {
  configurable: true,
  enumerable: true,
  get: createParserGetter('text')
})

/**
 * URL-encoded parser.
 * @public
 */

Object.defineProperty(exports, 'urlencoded', {
  configurable: true,
  enumerable: true,
  get: createParserGetter('urlencoded')
})

/**
 * Create a middleware to parse json and urlencoded bodies.
 *
 * @param {object} [options]
 * @return {function}
 * @deprecated
 * @public
 */

function bodyParser (options) {
  var opts = {}

  // exclude type option
  if (options) {
    for (var prop in options) {
      if (prop !== 'type') {
        opts[prop] = options[prop]
      }
    }
  }

  var _urlencoded = exports.urlencoded(opts)
  var _json = exports.json(opts)

  return function bodyParser (req, res, next) {
    _json(req, res, function (err) {
      if (err) return next(err)
      _urlencoded(req, res, next)
    })
  }
}

/**
 * Create a getter for loading a parser.
 * @private
 */

function createParserGetter (name) {
  return function get () {
    return loadParser(name)
  }
}

/**
 * Load a parser module.
 * @private
 */

function loadParser (parserName) {
  var parser = parsers[parserName]

  if (parser !== undefined) {
    return parser
  }

  // this uses a switch for static require analysis
  switch (parserName) {
    case 'json':
      parser = __webpack_require__(61)
      break
    case 'raw':
      parser = __webpack_require__(65)
      break
    case 'text':
      parser = __webpack_require__(66)
      break
    case 'urlencoded':
      parser = __webpack_require__(67)
      break
  }

  // store to prevent invoking require()
  return (parsers[parserName] = parser)
}


/***/ }),
/* 39 */
/***/ (function(module, exports) {

module.exports = require("on-finished");

/***/ }),
/* 40 */
/***/ (function(module, exports) {

module.exports = require("querystring");

/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module dependencies.
 * @private
 */

var Route = __webpack_require__(42);
var Layer = __webpack_require__(43);
var methods = __webpack_require__(27);
var mixin = __webpack_require__(20);
var debug = __webpack_require__(6)('express:router');
var deprecate = __webpack_require__(9)('express');
var flatten = __webpack_require__(19);
var parseUrl = __webpack_require__(28);
var setPrototypeOf = __webpack_require__(29)

/**
 * Module variables.
 * @private
 */

var objectRegExp = /^\[object (\S+)\]$/;
var slice = Array.prototype.slice;
var toString = Object.prototype.toString;

/**
 * Initialize a new `Router` with the given `options`.
 *
 * @param {Object} options
 * @return {Router} which is an callable function
 * @public
 */

var proto = module.exports = function(options) {
  var opts = options || {};

  function router(req, res, next) {
    router.handle(req, res, next);
  }

  // mixin Router class functions
  setPrototypeOf(router, proto)

  router.params = {};
  router._params = [];
  router.caseSensitive = opts.caseSensitive;
  router.mergeParams = opts.mergeParams;
  router.strict = opts.strict;
  router.stack = [];

  return router;
};

/**
 * Map the given param placeholder `name`(s) to the given callback.
 *
 * Parameter mapping is used to provide pre-conditions to routes
 * which use normalized placeholders. For example a _:user_id_ parameter
 * could automatically load a user's information from the database without
 * any additional code,
 *
 * The callback uses the same signature as middleware, the only difference
 * being that the value of the placeholder is passed, in this case the _id_
 * of the user. Once the `next()` function is invoked, just like middleware
 * it will continue on to execute the route, or subsequent parameter functions.
 *
 * Just like in middleware, you must either respond to the request or call next
 * to avoid stalling the request.
 *
 *  app.param('user_id', function(req, res, next, id){
 *    User.find(id, function(err, user){
 *      if (err) {
 *        return next(err);
 *      } else if (!user) {
 *        return next(new Error('failed to load user'));
 *      }
 *      req.user = user;
 *      next();
 *    });
 *  });
 *
 * @param {String} name
 * @param {Function} fn
 * @return {app} for chaining
 * @public
 */

proto.param = function param(name, fn) {
  // param logic
  if (typeof name === 'function') {
    deprecate('router.param(fn): Refactor to use path params');
    this._params.push(name);
    return;
  }

  // apply param functions
  var params = this._params;
  var len = params.length;
  var ret;

  if (name[0] === ':') {
    deprecate('router.param(' + JSON.stringify(name) + ', fn): Use router.param(' + JSON.stringify(name.substr(1)) + ', fn) instead');
    name = name.substr(1);
  }

  for (var i = 0; i < len; ++i) {
    if (ret = params[i](name, fn)) {
      fn = ret;
    }
  }

  // ensure we end up with a
  // middleware function
  if ('function' !== typeof fn) {
    throw new Error('invalid param() call for ' + name + ', got ' + fn);
  }

  (this.params[name] = this.params[name] || []).push(fn);
  return this;
};

/**
 * Dispatch a req, res into the router.
 * @private
 */

proto.handle = function handle(req, res, out) {
  var self = this;

  debug('dispatching %s %s', req.method, req.url);

  var idx = 0;
  var protohost = getProtohost(req.url) || ''
  var removed = '';
  var slashAdded = false;
  var paramcalled = {};

  // store options for OPTIONS request
  // only used if OPTIONS request
  var options = [];

  // middleware and routes
  var stack = self.stack;

  // manage inter-router variables
  var parentParams = req.params;
  var parentUrl = req.baseUrl || '';
  var done = restore(out, req, 'baseUrl', 'next', 'params');

  // setup next layer
  req.next = next;

  // for options requests, respond with a default if nothing else responds
  if (req.method === 'OPTIONS') {
    done = wrap(done, function(old, err) {
      if (err || options.length === 0) return old(err);
      sendOptionsResponse(res, options, old);
    });
  }

  // setup basic req values
  req.baseUrl = parentUrl;
  req.originalUrl = req.originalUrl || req.url;

  next();

  function next(err) {
    var layerError = err === 'route'
      ? null
      : err;

    // remove added slash
    if (slashAdded) {
      req.url = req.url.substr(1);
      slashAdded = false;
    }

    // restore altered req.url
    if (removed.length !== 0) {
      req.baseUrl = parentUrl;
      req.url = protohost + removed + req.url.substr(protohost.length);
      removed = '';
    }

    // signal to exit router
    if (layerError === 'router') {
      setImmediate(done, null)
      return
    }

    // no more matching layers
    if (idx >= stack.length) {
      setImmediate(done, layerError);
      return;
    }

    // get pathname of request
    var path = getPathname(req);

    if (path == null) {
      return done(layerError);
    }

    // find next matching layer
    var layer;
    var match;
    var route;

    while (match !== true && idx < stack.length) {
      layer = stack[idx++];
      match = matchLayer(layer, path);
      route = layer.route;

      if (typeof match !== 'boolean') {
        // hold on to layerError
        layerError = layerError || match;
      }

      if (match !== true) {
        continue;
      }

      if (!route) {
        // process non-route handlers normally
        continue;
      }

      if (layerError) {
        // routes do not match with a pending error
        match = false;
        continue;
      }

      var method = req.method;
      var has_method = route._handles_method(method);

      // build up automatic options response
      if (!has_method && method === 'OPTIONS') {
        appendMethods(options, route._options());
      }

      // don't even bother matching route
      if (!has_method && method !== 'HEAD') {
        match = false;
        continue;
      }
    }

    // no match
    if (match !== true) {
      return done(layerError);
    }

    // store route for dispatch on change
    if (route) {
      req.route = route;
    }

    // Capture one-time layer values
    req.params = self.mergeParams
      ? mergeParams(layer.params, parentParams)
      : layer.params;
    var layerPath = layer.path;

    // this should be done for the layer
    self.process_params(layer, paramcalled, req, res, function (err) {
      if (err) {
        return next(layerError || err);
      }

      if (route) {
        return layer.handle_request(req, res, next);
      }

      trim_prefix(layer, layerError, layerPath, path);
    });
  }

  function trim_prefix(layer, layerError, layerPath, path) {
    if (layerPath.length !== 0) {
      // Validate path breaks on a path separator
      var c = path[layerPath.length]
      if (c && c !== '/' && c !== '.') return next(layerError)

      // Trim off the part of the url that matches the route
      // middleware (.use stuff) needs to have the path stripped
      debug('trim prefix (%s) from url %s', layerPath, req.url);
      removed = layerPath;
      req.url = protohost + req.url.substr(protohost.length + removed.length);

      // Ensure leading slash
      if (!protohost && req.url[0] !== '/') {
        req.url = '/' + req.url;
        slashAdded = true;
      }

      // Setup base URL (no trailing slash)
      req.baseUrl = parentUrl + (removed[removed.length - 1] === '/'
        ? removed.substring(0, removed.length - 1)
        : removed);
    }

    debug('%s %s : %s', layer.name, layerPath, req.originalUrl);

    if (layerError) {
      layer.handle_error(layerError, req, res, next);
    } else {
      layer.handle_request(req, res, next);
    }
  }
};

/**
 * Process any parameters for the layer.
 * @private
 */

proto.process_params = function process_params(layer, called, req, res, done) {
  var params = this.params;

  // captured parameters from the layer, keys and values
  var keys = layer.keys;

  // fast track
  if (!keys || keys.length === 0) {
    return done();
  }

  var i = 0;
  var name;
  var paramIndex = 0;
  var key;
  var paramVal;
  var paramCallbacks;
  var paramCalled;

  // process params in order
  // param callbacks can be async
  function param(err) {
    if (err) {
      return done(err);
    }

    if (i >= keys.length ) {
      return done();
    }

    paramIndex = 0;
    key = keys[i++];
    name = key.name;
    paramVal = req.params[name];
    paramCallbacks = params[name];
    paramCalled = called[name];

    if (paramVal === undefined || !paramCallbacks) {
      return param();
    }

    // param previously called with same value or error occurred
    if (paramCalled && (paramCalled.match === paramVal
      || (paramCalled.error && paramCalled.error !== 'route'))) {
      // restore value
      req.params[name] = paramCalled.value;

      // next param
      return param(paramCalled.error);
    }

    called[name] = paramCalled = {
      error: null,
      match: paramVal,
      value: paramVal
    };

    paramCallback();
  }

  // single param callbacks
  function paramCallback(err) {
    var fn = paramCallbacks[paramIndex++];

    // store updated value
    paramCalled.value = req.params[key.name];

    if (err) {
      // store error
      paramCalled.error = err;
      param(err);
      return;
    }

    if (!fn) return param();

    try {
      fn(req, res, paramCallback, paramVal, key.name);
    } catch (e) {
      paramCallback(e);
    }
  }

  param();
};

/**
 * Use the given middleware function, with optional path, defaulting to "/".
 *
 * Use (like `.all`) will run for any http METHOD, but it will not add
 * handlers for those methods so OPTIONS requests will not consider `.use`
 * functions even if they could respond.
 *
 * The other difference is that _route_ path is stripped and not visible
 * to the handler function. The main effect of this feature is that mounted
 * handlers can operate without any code changes regardless of the "prefix"
 * pathname.
 *
 * @public
 */

proto.use = function use(fn) {
  var offset = 0;
  var path = '/';

  // default path to '/'
  // disambiguate router.use([fn])
  if (typeof fn !== 'function') {
    var arg = fn;

    while (Array.isArray(arg) && arg.length !== 0) {
      arg = arg[0];
    }

    // first arg is the path
    if (typeof arg !== 'function') {
      offset = 1;
      path = fn;
    }
  }

  var callbacks = flatten(slice.call(arguments, offset));

  if (callbacks.length === 0) {
    throw new TypeError('Router.use() requires a middleware function')
  }

  for (var i = 0; i < callbacks.length; i++) {
    var fn = callbacks[i];

    if (typeof fn !== 'function') {
      throw new TypeError('Router.use() requires a middleware function but got a ' + gettype(fn))
    }

    // add the middleware
    debug('use %o %s', path, fn.name || '<anonymous>')

    var layer = new Layer(path, {
      sensitive: this.caseSensitive,
      strict: false,
      end: false
    }, fn);

    layer.route = undefined;

    this.stack.push(layer);
  }

  return this;
};

/**
 * Create a new Route for the given path.
 *
 * Each route contains a separate middleware stack and VERB handlers.
 *
 * See the Route api documentation for details on adding handlers
 * and middleware to routes.
 *
 * @param {String} path
 * @return {Route}
 * @public
 */

proto.route = function route(path) {
  var route = new Route(path);

  var layer = new Layer(path, {
    sensitive: this.caseSensitive,
    strict: this.strict,
    end: true
  }, route.dispatch.bind(route));

  layer.route = route;

  this.stack.push(layer);
  return route;
};

// create Router#VERB functions
methods.concat('all').forEach(function(method){
  proto[method] = function(path){
    var route = this.route(path)
    route[method].apply(route, slice.call(arguments, 1));
    return this;
  };
});

// append methods to a list of methods
function appendMethods(list, addition) {
  for (var i = 0; i < addition.length; i++) {
    var method = addition[i];
    if (list.indexOf(method) === -1) {
      list.push(method);
    }
  }
}

// get pathname of request
function getPathname(req) {
  try {
    return parseUrl(req).pathname;
  } catch (err) {
    return undefined;
  }
}

// Get get protocol + host for a URL
function getProtohost(url) {
  if (typeof url !== 'string' || url.length === 0 || url[0] === '/') {
    return undefined
  }

  var searchIndex = url.indexOf('?')
  var pathLength = searchIndex !== -1
    ? searchIndex
    : url.length
  var fqdnIndex = url.substr(0, pathLength).indexOf('://')

  return fqdnIndex !== -1
    ? url.substr(0, url.indexOf('/', 3 + fqdnIndex))
    : undefined
}

// get type for error message
function gettype(obj) {
  var type = typeof obj;

  if (type !== 'object') {
    return type;
  }

  // inspect [[Class]] for objects
  return toString.call(obj)
    .replace(objectRegExp, '$1');
}

/**
 * Match path to a layer.
 *
 * @param {Layer} layer
 * @param {string} path
 * @private
 */

function matchLayer(layer, path) {
  try {
    return layer.match(path);
  } catch (err) {
    return err;
  }
}

// merge params with parent params
function mergeParams(params, parent) {
  if (typeof parent !== 'object' || !parent) {
    return params;
  }

  // make copy of parent for base
  var obj = mixin({}, parent);

  // simple non-numeric merging
  if (!(0 in params) || !(0 in parent)) {
    return mixin(obj, params);
  }

  var i = 0;
  var o = 0;

  // determine numeric gaps
  while (i in params) {
    i++;
  }

  while (o in parent) {
    o++;
  }

  // offset numeric indices in params before merge
  for (i--; i >= 0; i--) {
    params[i + o] = params[i];

    // create holes for the merge when necessary
    if (i < o) {
      delete params[i];
    }
  }

  return mixin(obj, params);
}

// restore obj props after function
function restore(fn, obj) {
  var props = new Array(arguments.length - 2);
  var vals = new Array(arguments.length - 2);

  for (var i = 0; i < props.length; i++) {
    props[i] = arguments[i + 2];
    vals[i] = obj[props[i]];
  }

  return function () {
    // restore vals
    for (var i = 0; i < props.length; i++) {
      obj[props[i]] = vals[i];
    }

    return fn.apply(this, arguments);
  };
}

// send an OPTIONS response
function sendOptionsResponse(res, options, next) {
  try {
    var body = options.join(',');
    res.set('Allow', body);
    res.send(body);
  } catch (err) {
    next(err);
  }
}

// wrap a function
function wrap(old, fn) {
  return function proxy() {
    var args = new Array(arguments.length + 1);

    args[0] = old;
    for (var i = 0, len = arguments.length; i < len; i++) {
      args[i + 1] = arguments[i];
    }

    fn.apply(this, args);
  };
}


/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module dependencies.
 * @private
 */

var debug = __webpack_require__(6)('express:router:route');
var flatten = __webpack_require__(19);
var Layer = __webpack_require__(43);
var methods = __webpack_require__(27);

/**
 * Module variables.
 * @private
 */

var slice = Array.prototype.slice;
var toString = Object.prototype.toString;

/**
 * Module exports.
 * @public
 */

module.exports = Route;

/**
 * Initialize `Route` with the given `path`,
 *
 * @param {String} path
 * @public
 */

function Route(path) {
  this.path = path;
  this.stack = [];

  debug('new %o', path)

  // route handlers for various http methods
  this.methods = {};
}

/**
 * Determine if the route handles a given method.
 * @private
 */

Route.prototype._handles_method = function _handles_method(method) {
  if (this.methods._all) {
    return true;
  }

  var name = method.toLowerCase();

  if (name === 'head' && !this.methods['head']) {
    name = 'get';
  }

  return Boolean(this.methods[name]);
};

/**
 * @return {Array} supported HTTP methods
 * @private
 */

Route.prototype._options = function _options() {
  var methods = Object.keys(this.methods);

  // append automatic head
  if (this.methods.get && !this.methods.head) {
    methods.push('head');
  }

  for (var i = 0; i < methods.length; i++) {
    // make upper case
    methods[i] = methods[i].toUpperCase();
  }

  return methods;
};

/**
 * dispatch req, res into this route
 * @private
 */

Route.prototype.dispatch = function dispatch(req, res, done) {
  var idx = 0;
  var stack = this.stack;
  if (stack.length === 0) {
    return done();
  }

  var method = req.method.toLowerCase();
  if (method === 'head' && !this.methods['head']) {
    method = 'get';
  }

  req.route = this;

  next();

  function next(err) {
    // signal to exit route
    if (err && err === 'route') {
      return done();
    }

    // signal to exit router
    if (err && err === 'router') {
      return done(err)
    }

    var layer = stack[idx++];
    if (!layer) {
      return done(err);
    }

    if (layer.method && layer.method !== method) {
      return next(err);
    }

    if (err) {
      layer.handle_error(err, req, res, next);
    } else {
      layer.handle_request(req, res, next);
    }
  }
};

/**
 * Add a handler for all HTTP verbs to this route.
 *
 * Behaves just like middleware and can respond or call `next`
 * to continue processing.
 *
 * You can use multiple `.all` call to add multiple handlers.
 *
 *   function check_something(req, res, next){
 *     next();
 *   };
 *
 *   function validate_user(req, res, next){
 *     next();
 *   };
 *
 *   route
 *   .all(validate_user)
 *   .all(check_something)
 *   .get(function(req, res, next){
 *     res.send('hello world');
 *   });
 *
 * @param {function} handler
 * @return {Route} for chaining
 * @api public
 */

Route.prototype.all = function all() {
  var handles = flatten(slice.call(arguments));

  for (var i = 0; i < handles.length; i++) {
    var handle = handles[i];

    if (typeof handle !== 'function') {
      var type = toString.call(handle);
      var msg = 'Route.all() requires a callback function but got a ' + type
      throw new TypeError(msg);
    }

    var layer = Layer('/', {}, handle);
    layer.method = undefined;

    this.methods._all = true;
    this.stack.push(layer);
  }

  return this;
};

methods.forEach(function(method){
  Route.prototype[method] = function(){
    var handles = flatten(slice.call(arguments));

    for (var i = 0; i < handles.length; i++) {
      var handle = handles[i];

      if (typeof handle !== 'function') {
        var type = toString.call(handle);
        var msg = 'Route.' + method + '() requires a callback function but got a ' + type
        throw new Error(msg);
      }

      debug('%s %o', method, this.path)

      var layer = Layer('/', {}, handle);
      layer.method = method;

      this.methods[method] = true;
      this.stack.push(layer);
    }

    return this;
  };
});


/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module dependencies.
 * @private
 */

var pathRegexp = __webpack_require__(71);
var debug = __webpack_require__(6)('express:router:layer');

/**
 * Module variables.
 * @private
 */

var hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Module exports.
 * @public
 */

module.exports = Layer;

function Layer(path, options, fn) {
  if (!(this instanceof Layer)) {
    return new Layer(path, options, fn);
  }

  debug('new %o', path)
  var opts = options || {};

  this.handle = fn;
  this.name = fn.name || '<anonymous>';
  this.params = undefined;
  this.path = undefined;
  this.regexp = pathRegexp(path, this.keys = [], opts);

  // set fast path flags
  this.regexp.fast_star = path === '*'
  this.regexp.fast_slash = path === '/' && opts.end === false
}

/**
 * Handle the error for the layer.
 *
 * @param {Error} error
 * @param {Request} req
 * @param {Response} res
 * @param {function} next
 * @api private
 */

Layer.prototype.handle_error = function handle_error(error, req, res, next) {
  var fn = this.handle;

  if (fn.length !== 4) {
    // not a standard error handler
    return next(error);
  }

  try {
    fn(error, req, res, next);
  } catch (err) {
    next(err);
  }
};

/**
 * Handle the request for the layer.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {function} next
 * @api private
 */

Layer.prototype.handle_request = function handle(req, res, next) {
  var fn = this.handle;

  if (fn.length > 3) {
    // not a standard request handler
    return next();
  }

  try {
    fn(req, res, next);
  } catch (err) {
    next(err);
  }
};

/**
 * Check if this route matches `path`, if so
 * populate `.params`.
 *
 * @param {String} path
 * @return {Boolean}
 * @api private
 */

Layer.prototype.match = function match(path) {
  var match

  if (path != null) {
    // fast path non-ending match for / (any path matches)
    if (this.regexp.fast_slash) {
      this.params = {}
      this.path = ''
      return true
    }

    // fast path for * (everything matched in a param)
    if (this.regexp.fast_star) {
      this.params = {'0': decode_param(path)}
      this.path = path
      return true
    }

    // match the path
    match = this.regexp.exec(path)
  }

  if (!match) {
    this.params = undefined;
    this.path = undefined;
    return false;
  }

  // store values
  this.params = {};
  this.path = match[0]

  var keys = this.keys;
  var params = this.params;

  for (var i = 1; i < match.length; i++) {
    var key = keys[i - 1];
    var prop = key.name;
    var val = decode_param(match[i])

    if (val !== undefined || !(hasOwnProperty.call(params, prop))) {
      params[prop] = val;
    }
  }

  return true;
};

/**
 * Decode param value.
 *
 * @param {string} val
 * @return {string}
 * @private
 */

function decode_param(val) {
  if (typeof val !== 'string' || val.length === 0) {
    return val;
  }

  try {
    return decodeURIComponent(val);
  } catch (err) {
    if (err instanceof URIError) {
      err.message = 'Failed to decode param \'' + val + '\'';
      err.status = err.statusCode = 400;
    }

    throw err;
  }
}


/***/ }),
/* 44 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module dependencies.
 */

var merge = __webpack_require__(20)
var parseUrl = __webpack_require__(28);
var qs = __webpack_require__(26);

/**
 * @param {Object} options
 * @return {Function}
 * @api public
 */

module.exports = function query(options) {
  var opts = merge({}, options)
  var queryparse = qs.parse;

  if (typeof options === 'function') {
    queryparse = options;
    opts = undefined;
  }

  if (opts !== undefined && opts.allowPrototypes === undefined) {
    // back-compat for qs module
    opts.allowPrototypes = true;
  }

  return function query(req, res, next){
    if (!req.query) {
      var val = parseUrl(req).query;
      req.query = queryparse(val, opts);
    }

    next();
  };
};


/***/ }),
/* 45 */
/***/ (function(module, exports) {

module.exports = require("fs");

/***/ }),
/* 46 */
/***/ (function(module, exports) {

module.exports = require("safe-buffer");

/***/ }),
/* 47 */
/***/ (function(module, exports) {

module.exports = require("content-disposition");

/***/ }),
/* 48 */
/***/ (function(module, exports) {

module.exports = require("send");

/***/ }),
/* 49 */
/***/ (function(module, exports) {

module.exports = require("proxy-addr");

/***/ }),
/* 50 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var Long = __webpack_require__(1).BSON.Long,
  Timestamp = __webpack_require__(1).BSON.Timestamp;

// Error codes
var UNKNOWN_ERROR = 8;
var INVALID_BSON_ERROR = 22;
var WRITE_CONCERN_ERROR = 64;
var MULTIPLE_ERROR = 65;

// Insert types
var INSERT = 1;
var UPDATE = 2;
var REMOVE = 3


// Get write concern
var writeConcern = function(target, col, options) {
  var writeConcern = {};

  // Collection level write concern
  if(col.writeConcern && col.writeConcern.w != null) writeConcern.w = col.writeConcern.w;
  if(col.writeConcern && col.writeConcern.j != null) writeConcern.j = col.writeConcern.j;
  if(col.writeConcern && col.writeConcern.fsync != null) writeConcern.fsync = col.writeConcern.fsync;
  if(col.writeConcern && col.writeConcern.wtimeout != null) writeConcern.wtimeout = col.writeConcern.wtimeout;

  // Options level write concern
  if(options && options.w != null) writeConcern.w = options.w;
  if(options && options.wtimeout != null) writeConcern.wtimeout = options.wtimeout;
  if(options && options.j != null) writeConcern.j = options.j;
  if(options && options.fsync != null) writeConcern.fsync = options.fsync;

  // Return write concern
  return writeConcern;
}

/**
 * Helper function to define properties
 * @ignore
 */
var defineReadOnlyProperty = function(self, name, value) {
  Object.defineProperty(self, name, {
      enumerable: true
    , get: function() {
      return value;
    }
  });
}

/**
 * Keeps the state of a unordered batch so we can rewrite the results
 * correctly after command execution
 * @ignore
 */
var Batch = function(batchType, originalZeroIndex) {
  this.originalZeroIndex = originalZeroIndex;
  this.currentIndex = 0;
  this.originalIndexes = [];
  this.batchType = batchType;
  this.operations = [];
  this.size = 0;
  this.sizeBytes = 0;
}

/**
 * Wraps a legacy operation so we can correctly rewrite it's error
 * @ignore
 */
var LegacyOp = function(batchType, operation, index) {
  this.batchType = batchType;
  this.index = index;
  this.operation = operation;
}

/**
 * Create a new BulkWriteResult instance (INTERNAL TYPE, do not instantiate directly)
 *
 * @class
 * @property {boolean} ok Did bulk operation correctly execute
 * @property {number} nInserted number of inserted documents
 * @property {number} nUpdated number of documents updated logically
 * @property {number} nUpserted Number of upserted documents
 * @property {number} nModified Number of documents updated physically on disk
 * @property {number} nRemoved Number of removed documents
 * @return {BulkWriteResult} a BulkWriteResult instance
 */
var BulkWriteResult = function(bulkResult) {
  defineReadOnlyProperty(this, "ok", bulkResult.ok);
  defineReadOnlyProperty(this, "nInserted", bulkResult.nInserted);
  defineReadOnlyProperty(this, "nUpserted", bulkResult.nUpserted);
  defineReadOnlyProperty(this, "nMatched", bulkResult.nMatched);
  defineReadOnlyProperty(this, "nModified", bulkResult.nModified);
  defineReadOnlyProperty(this, "nRemoved", bulkResult.nRemoved);

  /**
   * Return an array of inserted ids
   *
   * @return {object[]}
   */
  this.getInsertedIds = function() {
    return bulkResult.insertedIds;
  }

  /**
   * Return an array of upserted ids
   *
   * @return {object[]}
   */
  this.getUpsertedIds = function() {
    return bulkResult.upserted;
  }

  /**
   * Return the upserted id at position x
   *
   * @param {number} index the number of the upserted id to return, returns undefined if no result for passed in index
   * @return {object}
   */
  this.getUpsertedIdAt = function(index) {
    return bulkResult.upserted[index];
  }

  /**
   * Return raw internal result
   *
   * @return {object}
   */
  this.getRawResponse = function() {
    return bulkResult;
  }

  /**
   * Returns true if the bulk operation contains a write error
   *
   * @return {boolean}
   */
  this.hasWriteErrors = function() {
    return bulkResult.writeErrors.length > 0;
  }

  /**
   * Returns the number of write errors off the bulk operation
   *
   * @return {number}
   */
  this.getWriteErrorCount = function() {
    return bulkResult.writeErrors.length;
  }

  /**
   * Returns a specific write error object
   *
   * @param {number} index of the write error to return, returns null if there is no result for passed in index
   * @return {WriteError}
   */
  this.getWriteErrorAt = function(index) {
    if(index < bulkResult.writeErrors.length) {
      return bulkResult.writeErrors[index];
    }
    return null;
  }

  /**
   * Retrieve all write errors
   *
   * @return {object[]}
   */
  this.getWriteErrors = function() {
    return bulkResult.writeErrors;
  }

  /**
   * Retrieve lastOp if available
   *
   * @return {object}
   */
  this.getLastOp = function() {
    return bulkResult.lastOp;
  }

  /**
   * Retrieve the write concern error if any
   *
   * @return {WriteConcernError}
   */
  this.getWriteConcernError = function() {
    if(bulkResult.writeConcernErrors.length == 0) {
      return null;
    } else if(bulkResult.writeConcernErrors.length == 1) {
      // Return the error
      return bulkResult.writeConcernErrors[0];
    } else {

      // Combine the errors
      var errmsg = "";
      for(var i = 0; i < bulkResult.writeConcernErrors.length; i++) {
        var err = bulkResult.writeConcernErrors[i];
        errmsg = errmsg + err.errmsg;

        // TODO: Something better
        if(i == 0) errmsg = errmsg + " and ";
      }

      return new WriteConcernError({ errmsg : errmsg, code : WRITE_CONCERN_ERROR });
    }
  }

  this.toJSON = function() {
    return bulkResult;
  }

  this.toString = function() {
    return "BulkWriteResult(" + this.toJSON(bulkResult) + ")";
  }

  this.isOk = function() {
    return bulkResult.ok == 1;
  }
}

/**
 * Create a new WriteConcernError instance (INTERNAL TYPE, do not instantiate directly)
 *
 * @class
 * @property {number} code Write concern error code.
 * @property {string} errmsg Write concern error message.
 * @return {WriteConcernError} a WriteConcernError instance
 */
var WriteConcernError = function(err) {
  if(!(this instanceof WriteConcernError)) return new WriteConcernError(err);

  // Define properties
  defineReadOnlyProperty(this, "code", err.code);
  defineReadOnlyProperty(this, "errmsg", err.errmsg);

  this.toJSON = function() {
    return {code: err.code, errmsg: err.errmsg};
  }

  this.toString = function() {
    return "WriteConcernError(" + err.errmsg + ")";
  }
}

/**
 * Create a new WriteError instance (INTERNAL TYPE, do not instantiate directly)
 *
 * @class
 * @property {number} code Write concern error code.
 * @property {number} index Write concern error original bulk operation index.
 * @property {string} errmsg Write concern error message.
 * @return {WriteConcernError} a WriteConcernError instance
 */
var WriteError = function(err) {
  if(!(this instanceof WriteError)) return new WriteError(err);

  // Define properties
  defineReadOnlyProperty(this, "code", err.code);
  defineReadOnlyProperty(this, "index", err.index);
  defineReadOnlyProperty(this, "errmsg", err.errmsg);

  //
  // Define access methods
  this.getOperation = function() {
    return err.op;
  }

  this.toJSON = function() {
    return {code: err.code, index: err.index, errmsg: err.errmsg, op: err.op};
  }

  this.toString = function() {
    return "WriteError(" + JSON.stringify(this.toJSON()) + ")";
  }
}

/**
 * Merges results into shared data structure
 * @ignore
 */
var mergeBatchResults = function(ordered, batch, bulkResult, err, result) {
  // If we have an error set the result to be the err object
  if(err) {
    result = err;
  } else if(result && result.result) {
    result = result.result;
  } else if(result == null) {
    return;
  }

  // Do we have a top level error stop processing and return
  if(result.ok == 0 && bulkResult.ok == 1) {
    bulkResult.ok = 0;

    var writeError = {
        index: 0
      , code: result.code || 0
      , errmsg: result.message
      , op: batch.operations[0]
    };

    bulkResult.writeErrors.push(new WriteError(writeError));
    return;
  } else if(result.ok == 0 && bulkResult.ok == 0) {
    return;
  }

  // Deal with opTime if available
  if(result.opTime || result.lastOp) {
    var opTime = result.lastOp || result.opTime;
    var lastOpTS = null;
    var lastOpT = null;

    // We have a time stamp
    if(opTime && opTime._bsontype == 'Timestamp') {
      if(bulkResult.lastOp == null) {
        bulkResult.lastOp = opTime;
      } else if(opTime.greaterThan(bulkResult.lastOp)) {
        bulkResult.lastOp = opTime;
      }
    } else {
      // Existing TS
      if(bulkResult.lastOp) {
        lastOpTS = typeof bulkResult.lastOp.ts == 'number'
          ? Long.fromNumber(bulkResult.lastOp.ts) : bulkResult.lastOp.ts;
        lastOpT = typeof bulkResult.lastOp.t == 'number'
          ? Long.fromNumber(bulkResult.lastOp.t) : bulkResult.lastOp.t;
      }

      // Current OpTime TS
      var opTimeTS = typeof opTime.ts == 'number'
        ? Long.fromNumber(opTime.ts) : opTime.ts;
      var opTimeT = typeof opTime.t == 'number'
        ? Long.fromNumber(opTime.t) : opTime.t;

      // Compare the opTime's
      if(bulkResult.lastOp == null) {
        bulkResult.lastOp = opTime;
      } else if(opTimeTS.greaterThan(lastOpTS)) {
        bulkResult.lastOp = opTime;
      } else if(opTimeTS.equals(lastOpTS)) {
        if(opTimeT.greaterThan(lastOpT)) {
          bulkResult.lastOp = opTime;
        }
      }
    }
  }

  // If we have an insert Batch type
  if(batch.batchType == INSERT && result.n) {
    bulkResult.nInserted = bulkResult.nInserted + result.n;
  }

  // If we have an insert Batch type
  if(batch.batchType == REMOVE && result.n) {
    bulkResult.nRemoved = bulkResult.nRemoved + result.n;
  }

  var nUpserted = 0;

  // We have an array of upserted values, we need to rewrite the indexes
  if(Array.isArray(result.upserted)) {
    nUpserted = result.upserted.length;

    for(var i = 0; i < result.upserted.length; i++) {
      bulkResult.upserted.push({
          index: result.upserted[i].index + batch.originalZeroIndex
        , _id: result.upserted[i]._id
      });
    }
  } else if(result.upserted) {

    nUpserted = 1;

    bulkResult.upserted.push({
        index: batch.originalZeroIndex
      , _id: result.upserted
    });
  }

  // If we have an update Batch type
  if(batch.batchType == UPDATE && result.n) {
    var nModified = result.nModified;
    bulkResult.nUpserted = bulkResult.nUpserted + nUpserted;
    bulkResult.nMatched = bulkResult.nMatched + (result.n - nUpserted);

    if(typeof nModified == 'number') {
      bulkResult.nModified = bulkResult.nModified + nModified;
    } else {
      bulkResult.nModified = null;
    }
  }

  if(Array.isArray(result.writeErrors)) {
    for(i = 0; i < result.writeErrors.length; i++) {

      writeError = {
          index: batch.originalZeroIndex + result.writeErrors[i].index
        , code: result.writeErrors[i].code
        , errmsg: result.writeErrors[i].errmsg
        , op: batch.operations[result.writeErrors[i].index]
      };

      bulkResult.writeErrors.push(new WriteError(writeError));
    }
  }

  if(result.writeConcernError) {
    bulkResult.writeConcernErrors.push(new WriteConcernError(result.writeConcernError));
  }
}

//
// Clone the options
var cloneOptions = function(options) {
  var clone = {};
  var keys = Object.keys(options);
  for(var i = 0; i < keys.length; i++) {
    clone[keys[i]] = options[keys[i]];
  }

  return clone;
}

// Exports symbols
exports.BulkWriteResult = BulkWriteResult;
exports.WriteError = WriteError;
exports.Batch = Batch;
exports.LegacyOp = LegacyOp;
exports.mergeBatchResults = mergeBatchResults;
exports.cloneOptions = cloneOptions;
exports.writeConcern = writeConcern;
exports.INVALID_BSON_ERROR = INVALID_BSON_ERROR;
exports.WRITE_CONCERN_ERROR = WRITE_CONCERN_ERROR;
exports.MULTIPLE_ERROR = MULTIPLE_ERROR;
exports.UNKNOWN_ERROR = UNKNOWN_ERROR;
exports.INSERT = INSERT;
exports.UPDATE = UPDATE;
exports.REMOVE = REMOVE;


/***/ }),
/* 51 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/**
 * @fileOverview GridFS is a tool for MongoDB to store files to the database.
 * Because of the restrictions of the object size the database can hold, a
 * facility to split a file into several chunks is needed. The {@link GridStore}
 * class offers a simplified api to interact with files while managing the
 * chunks of split files behind the scenes. More information about GridFS can be
 * found <a href="http://www.mongodb.org/display/DOCS/GridFS">here</a>.
 *
 * @example
 * var MongoClient = require('mongodb').MongoClient,
 *   GridStore = require('mongodb').GridStore,
 *   ObjectID = require('mongodb').ObjectID,
 *   test = require('assert');
 *
 * // Connection url
 * var url = 'mongodb://localhost:27017/test';
 * // Connect using MongoClient
 * MongoClient.connect(url, function(err, db) {
 *   var gridStore = new GridStore(db, null, "w");
 *   gridStore.open(function(err, gridStore) {
 *     gridStore.write("hello world!", function(err, gridStore) {
 *       gridStore.close(function(err, result) {
 *
 *         // Let's read the file using object Id
 *         GridStore.read(db, result._id, function(err, data) {
 *           test.equal('hello world!', data);
 *           db.close();
 *           test.done();
 *         });
 *       });
 *     });
 *   });
 * });
 */
var Chunk = __webpack_require__(52),
  ObjectID = __webpack_require__(1).BSON.ObjectID,
  ReadPreference = __webpack_require__(5),
  Buffer = __webpack_require__(91).Buffer,
  Collection = __webpack_require__(23),
  fs = __webpack_require__(45),
  f = __webpack_require__(2).format,
  util = __webpack_require__(2),
  Define = __webpack_require__(4),
  MongoError = __webpack_require__(1).MongoError,
  inherits = util.inherits,
  Duplex = __webpack_require__(13).Duplex || __webpack_require__(22).Duplex,
  shallowClone = __webpack_require__(0).shallowClone;

var REFERENCE_BY_FILENAME = 0,
  REFERENCE_BY_ID = 1;

/**
 * Namespace provided by the mongodb-core and node.js
 * @external Duplex
 */

/**
 * Create a new GridStore instance
 *
 * Modes
 *  - **"r"** - read only. This is the default mode.
 *  - **"w"** - write in truncate mode. Existing data will be overwritten.
 *
 * @class
 * @param {Db} db A database instance to interact with.
 * @param {object} [id] optional unique id for this file
 * @param {string} [filename] optional filename for this file, no unique constrain on the field
 * @param {string} mode set the mode for this file.
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.fsync=false] Specify a file sync write concern.
 * @param {string} [options.root=null] Root collection to use. Defaults to **{GridStore.DEFAULT_ROOT_COLLECTION}**.
 * @param {string} [options.content_type=null] MIME type of the file. Defaults to **{GridStore.DEFAULT_CONTENT_TYPE}**.
 * @param {number} [options.chunk_size=261120] Size for the chunk. Defaults to **{Chunk.DEFAULT_CHUNK_SIZE}**.
 * @param {object} [options.metadata=null] Arbitrary data the user wants to store.
 * @param {object} [options.promiseLibrary=null] A Promise library class the application wishes to use such as Bluebird, must be ES6 compatible
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @property {number} chunkSize Get the gridstore chunk size.
 * @property {number} md5 The md5 checksum for this file.
 * @property {number} chunkNumber The current chunk number the gridstore has materialized into memory
 * @return {GridStore} a GridStore instance.
 * @deprecated Use GridFSBucket API instead
 */
var GridStore = function GridStore(db, id, filename, mode, options) {
  if(!(this instanceof GridStore)) return new GridStore(db, id, filename, mode, options);
  this.db = db;

  // Handle options
  if(typeof options === 'undefined') options = {};
  // Handle mode
  if(typeof mode === 'undefined') {
    mode = filename;
    filename = undefined;
  } else if(typeof mode == 'object') {
    options = mode;
    mode = filename;
    filename = undefined;
  }

  if(id && id._bsontype == 'ObjectID') {
    this.referenceBy = REFERENCE_BY_ID;
    this.fileId = id;
    this.filename = filename;
  } else if(typeof filename == 'undefined') {
    this.referenceBy = REFERENCE_BY_FILENAME;
    this.filename = id;
    if (mode.indexOf('w') != null) {
      this.fileId = new ObjectID();
    }
  } else {
    this.referenceBy = REFERENCE_BY_ID;
    this.fileId = id;
    this.filename = filename;
  }

  // Set up the rest
  this.mode = mode == null ? "r" : mode;
  this.options = options || {};

  // Opened
  this.isOpen = false;

  // Set the root if overridden
  this.root = this.options['root'] == null ? GridStore.DEFAULT_ROOT_COLLECTION : this.options['root'];
  this.position = 0;
  this.readPreference = this.options.readPreference || db.options.readPreference || ReadPreference.PRIMARY;
  this.writeConcern = _getWriteConcern(db, this.options);
  // Set default chunk size
  this.internalChunkSize = this.options['chunkSize'] == null ? Chunk.DEFAULT_CHUNK_SIZE : this.options['chunkSize'];

  // Get the promiseLibrary
  var promiseLibrary = this.options.promiseLibrary;

  // No promise library selected fall back
  if(!promiseLibrary) {
    promiseLibrary = typeof global.Promise == 'function' ?
      global.Promise : __webpack_require__(3).Promise;
  }

  // Set the promiseLibrary
  this.promiseLibrary = promiseLibrary;

  Object.defineProperty(this, "chunkSize", { enumerable: true
   , get: function () {
       return this.internalChunkSize;
     }
   , set: function(value) {
       if(!(this.mode[0] == "w" && this.position == 0 && this.uploadDate == null)) {
         this.internalChunkSize = this.internalChunkSize;
       } else {
         this.internalChunkSize = value;
       }
     }
  });

  Object.defineProperty(this, "md5", { enumerable: true
   , get: function () {
       return this.internalMd5;
     }
  });

  Object.defineProperty(this, "chunkNumber", { enumerable: true
   , get: function () {
       return this.currentChunk && this.currentChunk.chunkNumber ? this.currentChunk.chunkNumber : null;
     }
  });
}

var define = GridStore.define = new Define('Gridstore', GridStore, true);

/**
 * The callback format for the Gridstore.open method
 * @callback GridStore~openCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {GridStore} gridStore The GridStore instance if the open method was successful.
 */

/**
 * Opens the file from the database and initialize this object. Also creates a
 * new one if file does not exist.
 *
 * @method
 * @param {GridStore~openCallback} [callback] this will be called after executing this method
 * @return {Promise} returns Promise if no callback passed
 * @deprecated Use GridFSBucket API instead
 */
GridStore.prototype.open = function(callback) {
  var self = this;
  if( this.mode != "w" && this.mode != "w+" && this.mode != "r"){
    throw MongoError.create({message: "Illegal mode " + this.mode, driver:true});
  }

  // We provided a callback leg
  if(typeof callback == 'function') return open(self, callback);
  // Return promise
  return new self.promiseLibrary(function(resolve, reject) {
    open(self, function(err, store) {
      if(err) return reject(err);
      resolve(store);
    })
  });
};

var open = function(self, callback) {
  // Get the write concern
  var writeConcern = _getWriteConcern(self.db, self.options);

  // If we are writing we need to ensure we have the right indexes for md5's
  if((self.mode == "w" || self.mode == "w+")) {
    // Get files collection
    var collection = self.collection();
    // Put index on filename
    collection.ensureIndex([['filename', 1]], writeConcern, function() {
      // Get chunk collection
      var chunkCollection = self.chunkCollection();
      // Make an unique index for compatibility with mongo-cxx-driver:legacy
      var chunkIndexOptions = shallowClone(writeConcern);
      chunkIndexOptions.unique = true;
      // Ensure index on chunk collection
      chunkCollection.ensureIndex([['files_id', 1], ['n', 1]], chunkIndexOptions, function() {
        // Open the connection
        _open(self, writeConcern, function(err, r) {
          if(err) return callback(err);
          self.isOpen = true;
          callback(err, r);
        });
      });
    });
  } else {
    // Open the gridstore
    _open(self, writeConcern, function(err, r) {
      if(err) return callback(err);
      self.isOpen = true;
      callback(err, r);
    });
  }
}

// Push the definition for open
define.classMethod('open', {callback: true, promise:true});

/**
 * Verify if the file is at EOF.
 *
 * @method
 * @return {boolean} true if the read/write head is at the end of this file.
 * @deprecated Use GridFSBucket API instead
 */
GridStore.prototype.eof = function() {
  return this.position == this.length ? true : false;
}

define.classMethod('eof', {callback: false, promise:false, returns: [Boolean]});

/**
 * The callback result format.
 * @callback GridStore~resultCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {object} result The result from the callback.
 */

/**
 * Retrieves a single character from this file.
 *
 * @method
 * @param {GridStore~resultCallback} [callback] this gets called after this method is executed. Passes null to the first parameter and the character read to the second or null to the second if the read/write head is at the end of the file.
 * @return {Promise} returns Promise if no callback passed
 * @deprecated Use GridFSBucket API instead
 */
GridStore.prototype.getc = function(callback) {
  var self = this;
  // We provided a callback leg
  if(typeof callback == 'function') return eof(self, callback);
  // Return promise
  return new self.promiseLibrary(function(resolve, reject) {
    eof(self, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    })
  });
}

var eof = function(self, callback) {
  if(self.eof()) {
    callback(null, null);
  } else if(self.currentChunk.eof()) {
    nthChunk(self, self.currentChunk.chunkNumber + 1, function(err, chunk) {
      self.currentChunk = chunk;
      self.position = self.position + 1;
      callback(err, self.currentChunk.getc());
    });
  } else {
    self.position = self.position + 1;
    callback(null, self.currentChunk.getc());
  }
}

define.classMethod('getc', {callback: true, promise:true});

/**
 * Writes a string to the file with a newline character appended at the end if
 * the given string does not have one.
 *
 * @method
 * @param {string} string the string to write.
 * @param {GridStore~resultCallback} [callback] this will be called after executing this method. The first parameter will contain null and the second one will contain a reference to this object.
 * @return {Promise} returns Promise if no callback passed
 * @deprecated Use GridFSBucket API instead
 */
GridStore.prototype.puts = function(string, callback) {
  var self = this;
  var finalString = string.match(/\n$/) == null ? string + "\n" : string;
  // We provided a callback leg
  if(typeof callback == 'function') return this.write(finalString, callback);
  // Return promise
  return new self.promiseLibrary(function(resolve, reject) {
    self.write(finalString, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    })
  });
}

define.classMethod('puts', {callback: true, promise:true});

/**
 * Return a modified Readable stream including a possible transform method.
 *
 * @method
 * @return {GridStoreStream}
 * @deprecated Use GridFSBucket API instead
 */
GridStore.prototype.stream = function() {
  return new GridStoreStream(this);
}

define.classMethod('stream', {callback: false, promise:false, returns: [GridStoreStream]});

/**
 * Writes some data. This method will work properly only if initialized with mode "w" or "w+".
 *
 * @method
 * @param {(string|Buffer)} data the data to write.
 * @param {boolean} [close] closes this file after writing if set to true.
 * @param {GridStore~resultCallback} [callback] this will be called after executing this method. The first parameter will contain null and the second one will contain a reference to this object.
 * @return {Promise} returns Promise if no callback passed
 * @deprecated Use GridFSBucket API instead
 */
GridStore.prototype.write = function write(data, close, callback) {
  var self = this;
  // We provided a callback leg
  if(typeof callback == 'function') return _writeNormal(this, data, close, callback);
  // Return promise
  return new self.promiseLibrary(function(resolve, reject) {
    _writeNormal(self, data, close, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    })
  });
}

define.classMethod('write', {callback: true, promise:true});

/**
 * Handles the destroy part of a stream
 *
 * @method
 * @result {null}
 * @deprecated Use GridFSBucket API instead
 */
GridStore.prototype.destroy = function destroy() {
  // close and do not emit any more events. queued data is not sent.
  if(!this.writable) return;
  this.readable = false;
  if(this.writable) {
    this.writable = false;
    this._q.length = 0;
    this.emit('close');
  }
}

define.classMethod('destroy', {callback: false, promise:false});

/**
 * Stores a file from the file system to the GridFS database.
 *
 * @method
 * @param {(string|Buffer|FileHandle)} file the file to store.
 * @param {GridStore~resultCallback} [callback] this will be called after executing this method. The first parameter will contain null and the second one will contain a reference to this object.
 * @return {Promise} returns Promise if no callback passed
 * @deprecated Use GridFSBucket API instead
 */
GridStore.prototype.writeFile = function (file, callback) {
  var self = this;
  // We provided a callback leg
  if(typeof callback == 'function') return writeFile(self, file, callback);
  // Return promise
  return new self.promiseLibrary(function(resolve, reject) {
    writeFile(self, file, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    })
  });
};

var writeFile = function(self, file, callback) {
  if (typeof file === 'string') {
    fs.open(file, 'r', function (err, fd) {
      if(err) return callback(err);
      self.writeFile(fd, callback);
    });
    return;
  }

  self.open(function (err, self) {
    if(err) return callback(err, self);

    fs.fstat(file, function (err, stats) {
      if(err) return callback(err, self);

      var offset = 0;
      var index = 0;

      // Write a chunk
      var writeChunk = function() {
        // Allocate the buffer
        var _buffer = new Buffer(self.chunkSize);
        // Read the file
        fs.read(file, _buffer, 0, _buffer.length, offset, function(err, bytesRead, data) {
          if(err) return callback(err, self);

          offset = offset + bytesRead;

          // Create a new chunk for the data
          var chunk = new Chunk(self, {n:index++}, self.writeConcern);
          chunk.write(data.slice(0, bytesRead), function(err, chunk) {
            if(err) return callback(err, self);

            chunk.save({}, function(err) {
              if(err) return callback(err, self);

              self.position = self.position + bytesRead;

              // Point to current chunk
              self.currentChunk = chunk;

              if(offset >= stats.size) {
                fs.close(file);
                self.close(function(err) {
                  if(err) return callback(err, self);
                  return callback(null, self);
                });
              } else {
                return process.nextTick(writeChunk);
              }
            });
          });
        });
      }

      // Process the first write
      process.nextTick(writeChunk);
    });
  });
}

define.classMethod('writeFile', {callback: true, promise:true});

/**
 * Saves this file to the database. This will overwrite the old entry if it
 * already exists. This will work properly only if mode was initialized to
 * "w" or "w+".
 *
 * @method
 * @param {GridStore~resultCallback} [callback] this will be called after executing this method. The first parameter will contain null and the second one will contain a reference to this object.
 * @return {Promise} returns Promise if no callback passed
 * @deprecated Use GridFSBucket API instead
 */
GridStore.prototype.close = function(callback) {
  var self = this;
  // We provided a callback leg
  if(typeof callback == 'function') return close(self, callback);
  // Return promise
  return new self.promiseLibrary(function(resolve, reject) {
    close(self, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    })
  });
};

var close = function(self, callback) {
  if(self.mode[0] == "w") {
    // Set up options
    var options = self.writeConcern;

    if(self.currentChunk != null && self.currentChunk.position > 0) {
      self.currentChunk.save({}, function(err) {
        if(err && typeof callback == 'function') return callback(err);

        self.collection(function(err, files) {
          if(err && typeof callback == 'function') return callback(err);

          // Build the mongo object
          if(self.uploadDate != null) {
            buildMongoObject(self, function(err, mongoObject) {
              if(err) {
                if(typeof callback == 'function') return callback(err); else throw err;
              }

              files.save(mongoObject, options, function(err) {
                if(typeof callback == 'function')
                  callback(err, mongoObject);
              });
            });
          } else {
            self.uploadDate = new Date();
            buildMongoObject(self, function(err, mongoObject) {
              if(err) {
                if(typeof callback == 'function') return callback(err); else throw err;
              }

              files.save(mongoObject, options, function(err) {
                if(typeof callback == 'function')
                  callback(err, mongoObject);
              });
            });
          }
        });
      });
    } else {
      self.collection(function(err, files) {
        if(err && typeof callback == 'function') return callback(err);

        self.uploadDate = new Date();
        buildMongoObject(self, function(err, mongoObject) {
          if(err) {
            if(typeof callback == 'function') return callback(err); else throw err;
          }

          files.save(mongoObject, options, function(err) {
            if(typeof callback == 'function')
              callback(err, mongoObject);
          });
        });
      });
    }
  } else if(self.mode[0] == "r") {
    if(typeof callback == 'function')
      callback(null, null);
  } else {
    if(typeof callback == 'function')
      callback(MongoError.create({message: f("Illegal mode %s", self.mode), driver:true}));
  }
}

define.classMethod('close', {callback: true, promise:true});

/**
 * The collection callback format.
 * @callback GridStore~collectionCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {Collection} collection The collection from the command execution.
 */

/**
 * Retrieve this file's chunks collection.
 *
 * @method
 * @param {GridStore~collectionCallback} callback the command callback.
 * @return {Collection}
 * @deprecated Use GridFSBucket API instead
 */
GridStore.prototype.chunkCollection = function(callback) {
  if(typeof callback == 'function')
    return this.db.collection((this.root + ".chunks"), callback);
  return this.db.collection((this.root + ".chunks"));
};

define.classMethod('chunkCollection', {callback: true, promise:false, returns: [Collection]});

/**
 * Deletes all the chunks of this file in the database.
 *
 * @method
 * @param {GridStore~resultCallback} [callback] the command callback.
 * @return {Promise} returns Promise if no callback passed
 * @deprecated Use GridFSBucket API instead
 */
GridStore.prototype.unlink = function(callback) {
  var self = this;
  // We provided a callback leg
  if(typeof callback == 'function') return unlink(self, callback);
  // Return promise
  return new self.promiseLibrary(function(resolve, reject) {
    unlink(self, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    })
  });
};

var unlink = function(self, callback) {
  deleteChunks(self, function(err) {
    if(err!==null) {
      err.message = "at deleteChunks: " + err.message;
      return callback(err);
    }

    self.collection(function(err, collection) {
      if(err!==null) {
        err.message = "at collection: " + err.message;
        return callback(err);
      }

      collection.remove({'_id':self.fileId}, self.writeConcern, function(err) {
        callback(err, self);
      });
    });
  });
}

define.classMethod('unlink', {callback: true, promise:true});

/**
 * Retrieves the file collection associated with this object.
 *
 * @method
 * @param {GridStore~collectionCallback} callback the command callback.
 * @return {Collection}
 * @deprecated Use GridFSBucket API instead
 */
GridStore.prototype.collection = function(callback) {
  if(typeof callback == 'function')
    this.db.collection(this.root + ".files", callback);
  return this.db.collection(this.root + ".files");
};

define.classMethod('collection', {callback: true, promise:false, returns: [Collection]});

/**
 * The readlines callback format.
 * @callback GridStore~readlinesCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {string[]} strings The array of strings returned.
 */

/**
 * Read the entire file as a list of strings splitting by the provided separator.
 *
 * @method
 * @param {string} [separator] The character to be recognized as the newline separator.
 * @param {GridStore~readlinesCallback} [callback] the command callback.
 * @return {Promise} returns Promise if no callback passed
 * @deprecated Use GridFSBucket API instead
 */
GridStore.prototype.readlines = function(separator, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 0);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  separator = args.length ? args.shift() : "\n";
  separator = separator || "\n";

  // We provided a callback leg
  if(typeof callback == 'function') return readlines(self, separator, callback);

  // Return promise
  return new self.promiseLibrary(function(resolve, reject) {
    readlines(self, separator, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    })
  });
};

var readlines = function(self, separator, callback) {
  self.read(function(err, data) {
    if(err) return callback(err);

    var items = data.toString().split(separator);
    items = items.length > 0 ? items.splice(0, items.length - 1) : [];
    for(var i = 0; i < items.length; i++) {
      items[i] = items[i] + separator;
    }

    callback(null, items);
  });
}

define.classMethod('readlines', {callback: true, promise:true});

/**
 * Deletes all the chunks of this file in the database if mode was set to "w" or
 * "w+" and resets the read/write head to the initial position.
 *
 * @method
 * @param {GridStore~resultCallback} [callback] this will be called after executing this method. The first parameter will contain null and the second one will contain a reference to this object.
 * @return {Promise} returns Promise if no callback passed
 * @deprecated Use GridFSBucket API instead
 */
GridStore.prototype.rewind = function(callback) {
  var self = this;
  // We provided a callback leg
  if(typeof callback == 'function') return rewind(self, callback);
  // Return promise
  return new self.promiseLibrary(function(resolve, reject) {
    rewind(self, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    })
  });
};

var rewind = function(self, callback) {
  if(self.currentChunk.chunkNumber != 0) {
    if(self.mode[0] == "w") {
      deleteChunks(self, function(err) {
        if(err) return callback(err);
        self.currentChunk = new Chunk(self, {'n': 0}, self.writeConcern);
        self.position = 0;
        callback(null, self);
      });
    } else {
      self.currentChunk(0, function(err, chunk) {
        if(err) return callback(err);
        self.currentChunk = chunk;
        self.currentChunk.rewind();
        self.position = 0;
        callback(null, self);
      });
    }
  } else {
    self.currentChunk.rewind();
    self.position = 0;
    callback(null, self);
  }
}

define.classMethod('rewind', {callback: true, promise:true});

/**
 * The read callback format.
 * @callback GridStore~readCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {Buffer} data The data read from the GridStore object
 */

/**
 * Retrieves the contents of this file and advances the read/write head. Works with Buffers only.
 *
 * There are 3 signatures for this method:
 *
 * (callback)
 * (length, callback)
 * (length, buffer, callback)
 *
 * @method
 * @param {number} [length] the number of characters to read. Reads all the characters from the read/write head to the EOF if not specified.
 * @param {(string|Buffer)} [buffer] a string to hold temporary data. This is used for storing the string data read so far when recursively calling this method.
 * @param {GridStore~readCallback} [callback] the command callback.
 * @return {Promise} returns Promise if no callback passed
 * @deprecated Use GridFSBucket API instead
 */
GridStore.prototype.read = function(length, buffer, callback) {
  var self = this;

  var args = Array.prototype.slice.call(arguments, 0);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  length = args.length ? args.shift() : null;
  buffer = args.length ? args.shift() : null;
  // We provided a callback leg
  if(typeof callback == 'function') return read(self, length, buffer, callback);
  // Return promise
  return new self.promiseLibrary(function(resolve, reject) {
    read(self, length, buffer, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    })
  });
}

var read = function(self, length, buffer, callback) {
  // The data is a c-terminated string and thus the length - 1
  var finalLength = length == null ? self.length - self.position : length;
  var finalBuffer = buffer == null ? new Buffer(finalLength) : buffer;
  // Add a index to buffer to keep track of writing position or apply current index
  finalBuffer._index = buffer != null && buffer._index != null ? buffer._index : 0;

  if((self.currentChunk.length() - self.currentChunk.position + finalBuffer._index) >= finalLength) {
    var slice = self.currentChunk.readSlice(finalLength - finalBuffer._index);
    // Copy content to final buffer
    slice.copy(finalBuffer, finalBuffer._index);
    // Update internal position
    self.position = self.position + finalBuffer.length;
    // Check if we don't have a file at all
    if(finalLength == 0 && finalBuffer.length == 0) return callback(MongoError.create({message: "File does not exist", driver:true}), null);
    // Else return data
    return callback(null, finalBuffer);
  }

  // Read the next chunk
  slice = self.currentChunk.readSlice(self.currentChunk.length() - self.currentChunk.position);
  // Copy content to final buffer
  slice.copy(finalBuffer, finalBuffer._index);
  // Update index position
  finalBuffer._index += slice.length;

  // Load next chunk and read more
  nthChunk(self, self.currentChunk.chunkNumber + 1, function(err, chunk) {
    if(err) return callback(err);

    if(chunk.length() > 0) {
      self.currentChunk = chunk;
      self.read(length, finalBuffer, callback);
    } else {
      if(finalBuffer._index > 0) {
        callback(null, finalBuffer)
      } else {
        callback(MongoError.create({message: "no chunks found for file, possibly corrupt", driver:true}), null);
      }
    }
  });
}

define.classMethod('read', {callback: true, promise:true});

/**
 * The tell callback format.
 * @callback GridStore~tellCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {number} position The current read position in the GridStore.
 */

/**
 * Retrieves the position of the read/write head of this file.
 *
 * @method
 * @param {number} [length] the number of characters to read. Reads all the characters from the read/write head to the EOF if not specified.
 * @param {(string|Buffer)} [buffer] a string to hold temporary data. This is used for storing the string data read so far when recursively calling this method.
 * @param {GridStore~tellCallback} [callback] the command callback.
 * @return {Promise} returns Promise if no callback passed
 * @deprecated Use GridFSBucket API instead
 */
GridStore.prototype.tell = function(callback) {
  var self = this;
  // We provided a callback leg
  if(typeof callback == 'function') return callback(null, this.position);
  // Return promise
  return new self.promiseLibrary(function(resolve) {
    resolve(self.position);
  });
};

define.classMethod('tell', {callback: true, promise:true});

/**
 * The tell callback format.
 * @callback GridStore~gridStoreCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {GridStore} gridStore The gridStore.
 */

/**
 * Moves the read/write head to a new location.
 *
 * There are 3 signatures for this method
 *
 * Seek Location Modes
 *  - **GridStore.IO_SEEK_SET**, **(default)** set the position from the start of the file.
 *  - **GridStore.IO_SEEK_CUR**, set the position from the current position in the file.
 *  - **GridStore.IO_SEEK_END**, set the position from the end of the file.
 *
 * @method
 * @param {number} [position] the position to seek to
 * @param {number} [seekLocation] seek mode. Use one of the Seek Location modes.
 * @param {GridStore~gridStoreCallback} [callback] the command callback.
 * @return {Promise} returns Promise if no callback passed
 * @deprecated Use GridFSBucket API instead
 */
GridStore.prototype.seek = function(position, seekLocation, callback) {
  var self = this;

  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  seekLocation = args.length ? args.shift() : null;

  // We provided a callback leg
  if(typeof callback == 'function') return seek(self, position, seekLocation, callback);
  // Return promise
  return new self.promiseLibrary(function(resolve, reject) {
    seek(self, position, seekLocation, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    })
  });
}

var seek = function(self, position, seekLocation, callback) {
  // Seek only supports read mode
  if(self.mode != 'r') {
    return callback(MongoError.create({message: "seek is only supported for mode r", driver:true}))
  }

  var seekLocationFinal = seekLocation == null ? GridStore.IO_SEEK_SET : seekLocation;
  var finalPosition = position;
  var targetPosition = 0;

  // Calculate the position
  if(seekLocationFinal == GridStore.IO_SEEK_CUR) {
    targetPosition = self.position + finalPosition;
  } else if(seekLocationFinal == GridStore.IO_SEEK_END) {
    targetPosition = self.length + finalPosition;
  } else {
    targetPosition = finalPosition;
  }

  // Get the chunk
  var newChunkNumber = Math.floor(targetPosition/self.chunkSize);
  var seekChunk = function() {
    nthChunk(self, newChunkNumber, function(err, chunk) {
      if(err) return callback(err, null);
      if(chunk == null) return callback(new Error('no chunk found'));

      // Set the current chunk
      self.currentChunk = chunk;
      self.position = targetPosition;
      self.currentChunk.position = (self.position % self.chunkSize);
      callback(err, self);
    });
  };

  seekChunk();
}

define.classMethod('seek', {callback: true, promise:true});

/**
 * @ignore
 */
var _open = function(self, options, callback) {
  var collection = self.collection();
  // Create the query
  var query = self.referenceBy == REFERENCE_BY_ID ? {_id:self.fileId} : {filename:self.filename};
  query = null == self.fileId && self.filename == null ? null : query;
  options.readPreference = self.readPreference;

  // Fetch the chunks
  if(query != null) {
    collection.findOne(query, options, function(err, doc) {
      if(err) return error(err);

      // Check if the collection for the files exists otherwise prepare the new one
      if(doc != null) {
        self.fileId = doc._id;
        // Prefer a new filename over the existing one if this is a write
        self.filename = ((self.mode == 'r') || (self.filename == undefined)) ? doc.filename : self.filename;
        self.contentType = doc.contentType;
        self.internalChunkSize = doc.chunkSize;
        self.uploadDate = doc.uploadDate;
        self.aliases = doc.aliases;
        self.length = doc.length;
        self.metadata = doc.metadata;
        self.internalMd5 = doc.md5;
      } else if (self.mode != 'r') {
        self.fileId = self.fileId == null ? new ObjectID() : self.fileId;
        self.contentType = GridStore.DEFAULT_CONTENT_TYPE;
        self.internalChunkSize = self.internalChunkSize == null ? Chunk.DEFAULT_CHUNK_SIZE : self.internalChunkSize;
        self.length = 0;
      } else {
        self.length = 0;
        var txtId = self.fileId._bsontype == "ObjectID" ? self.fileId.toHexString() : self.fileId;
        return error(MongoError.create({message: f("file with id %s not opened for writing", (self.referenceBy == REFERENCE_BY_ID ? txtId : self.filename)), driver:true}), self);
      }

      // Process the mode of the object
      if(self.mode == "r") {
        nthChunk(self, 0, options, function(err, chunk) {
          if(err) return error(err);
          self.currentChunk = chunk;
          self.position = 0;
          callback(null, self);
        });
      } else if(self.mode == "w" && doc) {
        // Delete any existing chunks
        deleteChunks(self, options, function(err) {
          if(err) return error(err);
          self.currentChunk = new Chunk(self, {'n':0}, self.writeConcern);
          self.contentType = self.options['content_type'] == null ? self.contentType : self.options['content_type'];
          self.internalChunkSize = self.options['chunk_size'] == null ? self.internalChunkSize : self.options['chunk_size'];
          self.metadata = self.options['metadata'] == null ? self.metadata : self.options['metadata'];
          self.aliases = self.options['aliases'] == null ? self.aliases : self.options['aliases'];
          self.position = 0;
          callback(null, self);
        });
      } else if(self.mode == "w") {
        self.currentChunk = new Chunk(self, {'n':0}, self.writeConcern);
        self.contentType = self.options['content_type'] == null ? self.contentType : self.options['content_type'];
        self.internalChunkSize = self.options['chunk_size'] == null ? self.internalChunkSize : self.options['chunk_size'];
        self.metadata = self.options['metadata'] == null ? self.metadata : self.options['metadata'];
        self.aliases = self.options['aliases'] == null ? self.aliases : self.options['aliases'];
        self.position = 0;
        callback(null, self);
      } else if(self.mode == "w+") {
        nthChunk(self, lastChunkNumber(self), options, function(err, chunk) {
          if(err) return error(err);
          // Set the current chunk
          self.currentChunk = chunk == null ? new Chunk(self, {'n':0}, self.writeConcern) : chunk;
          self.currentChunk.position = self.currentChunk.data.length();
          self.metadata = self.options['metadata'] == null ? self.metadata : self.options['metadata'];
          self.aliases = self.options['aliases'] == null ? self.aliases : self.options['aliases'];
          self.position = self.length;
          callback(null, self);
        });
      }
    });
  } else {
    // Write only mode
    self.fileId = null == self.fileId ? new ObjectID() : self.fileId;
    self.contentType = GridStore.DEFAULT_CONTENT_TYPE;
    self.internalChunkSize = self.internalChunkSize == null ? Chunk.DEFAULT_CHUNK_SIZE : self.internalChunkSize;
    self.length = 0;

    // No file exists set up write mode
    if(self.mode == "w") {
      // Delete any existing chunks
      deleteChunks(self, options, function(err) {
        if(err) return error(err);
        self.currentChunk = new Chunk(self, {'n':0}, self.writeConcern);
        self.contentType = self.options['content_type'] == null ? self.contentType : self.options['content_type'];
        self.internalChunkSize = self.options['chunk_size'] == null ? self.internalChunkSize : self.options['chunk_size'];
        self.metadata = self.options['metadata'] == null ? self.metadata : self.options['metadata'];
        self.aliases = self.options['aliases'] == null ? self.aliases : self.options['aliases'];
        self.position = 0;
        callback(null, self);
      });
    } else if(self.mode == "w+") {
      nthChunk(self, lastChunkNumber(self), options, function(err, chunk) {
        if(err) return error(err);
        // Set the current chunk
        self.currentChunk = chunk == null ? new Chunk(self, {'n':0}, self.writeConcern) : chunk;
        self.currentChunk.position = self.currentChunk.data.length();
        self.metadata = self.options['metadata'] == null ? self.metadata : self.options['metadata'];
        self.aliases = self.options['aliases'] == null ? self.aliases : self.options['aliases'];
        self.position = self.length;
        callback(null, self);
      });
    }
  }

  // only pass error to callback once
  function error (err) {
    if(error.err) return;
    callback(error.err = err);
  }
};

/**
 * @ignore
 */
var writeBuffer = function(self, buffer, close, callback) {
  if(typeof close === "function") { callback = close; close = null; }
  var finalClose = typeof close == 'boolean' ? close : false;

  if(self.mode != "w") {
    callback(MongoError.create({message: f("file with id %s not opened for writing", (self.referenceBy == REFERENCE_BY_ID ? self.referenceBy : self.filename)), driver:true}), null);
  } else {
    if(self.currentChunk.position + buffer.length >= self.chunkSize) {
      // Write out the current Chunk and then keep writing until we have less data left than a chunkSize left
      // to a new chunk (recursively)
      var previousChunkNumber = self.currentChunk.chunkNumber;
      var leftOverDataSize = self.chunkSize - self.currentChunk.position;
      var firstChunkData = buffer.slice(0, leftOverDataSize);
      var leftOverData = buffer.slice(leftOverDataSize);
      // A list of chunks to write out
      var chunksToWrite = [self.currentChunk.write(firstChunkData)];
      // If we have more data left than the chunk size let's keep writing new chunks
      while(leftOverData.length >= self.chunkSize) {
        // Create a new chunk and write to it
        var newChunk = new Chunk(self, {'n': (previousChunkNumber + 1)}, self.writeConcern);
        firstChunkData = leftOverData.slice(0, self.chunkSize);
        leftOverData = leftOverData.slice(self.chunkSize);
        // Update chunk number
        previousChunkNumber = previousChunkNumber + 1;
        // Write data
        newChunk.write(firstChunkData);
        // Push chunk to save list
        chunksToWrite.push(newChunk);
      }

      // Set current chunk with remaining data
      self.currentChunk = new Chunk(self, {'n': (previousChunkNumber + 1)}, self.writeConcern);
      // If we have left over data write it
      if(leftOverData.length > 0) self.currentChunk.write(leftOverData);

      // Update the position for the gridstore
      self.position = self.position + buffer.length;
      // Total number of chunks to write
      var numberOfChunksToWrite = chunksToWrite.length;

      for(var i = 0; i < chunksToWrite.length; i++) {
        chunksToWrite[i].save({}, function(err) {
          if(err) return callback(err);

          numberOfChunksToWrite = numberOfChunksToWrite - 1;

          if(numberOfChunksToWrite <= 0) {
            // We care closing the file before returning
            if(finalClose) {
              return self.close(function(err) {
                callback(err, self);
              });
            }

            // Return normally
            return callback(null, self);
          }
        });
      }
    } else {
      // Update the position for the gridstore
      self.position = self.position + buffer.length;
      // We have less data than the chunk size just write it and callback
      self.currentChunk.write(buffer);
      // We care closing the file before returning
      if(finalClose) {
        return self.close(function(err) {
          callback(err, self);
        });
      }
      // Return normally
      return callback(null, self);
    }
  }
};

/**
 * Creates a mongoDB object representation of this object.
 *
 *        <pre><code>
 *        {
 *          '_id' : , // {number} id for this file
 *          'filename' : , // {string} name for this file
 *          'contentType' : , // {string} mime type for this file
 *          'length' : , // {number} size of this file?
 *          'chunksize' : , // {number} chunk size used by this file
 *          'uploadDate' : , // {Date}
 *          'aliases' : , // {array of string}
 *          'metadata' : , // {string}
 *        }
 *        </code></pre>
 *
 * @ignore
 */
var buildMongoObject = function(self, callback) {
  // Calcuate the length
  var mongoObject = {
    '_id': self.fileId,
    'filename': self.filename,
    'contentType': self.contentType,
    'length': self.position ? self.position : 0,
    'chunkSize': self.chunkSize,
    'uploadDate': self.uploadDate,
    'aliases': self.aliases,
    'metadata': self.metadata
  };

  var md5Command = {filemd5:self.fileId, root:self.root};
  self.db.command(md5Command, function(err, results) {
    if(err) return callback(err);

    mongoObject.md5 = results.md5;
    callback(null, mongoObject);
  });
};

/**
 * Gets the nth chunk of this file.
 * @ignore
 */
var nthChunk = function(self, chunkNumber, options, callback) {
  if(typeof options == 'function') {
    callback = options;
    options = {};
  }

  options = options || self.writeConcern;
  options.readPreference = self.readPreference;
  // Get the nth chunk
  self.chunkCollection().findOne({'files_id':self.fileId, 'n':chunkNumber}, options, function(err, chunk) {
    if(err) return callback(err);

    var finalChunk = chunk == null ? {} : chunk;
    callback(null, new Chunk(self, finalChunk, self.writeConcern));
  });
};

/**
 * @ignore
 */
var lastChunkNumber = function(self) {
  return Math.floor((self.length ? self.length - 1 : 0)/self.chunkSize);
};

/**
 * Deletes all the chunks of this file in the database.
 *
 * @ignore
 */
var deleteChunks = function(self, options, callback) {
  if(typeof options == 'function') {
    callback = options;
    options = {};
  }

  options = options || self.writeConcern;

  if(self.fileId != null) {
    self.chunkCollection().remove({'files_id':self.fileId}, options, function(err) {
      if(err) return callback(err, false);
      callback(null, true);
    });
  } else {
    callback(null, true);
  }
};

/**
* The collection to be used for holding the files and chunks collection.
*
* @classconstant DEFAULT_ROOT_COLLECTION
**/
GridStore.DEFAULT_ROOT_COLLECTION = 'fs';

/**
* Default file mime type
*
* @classconstant DEFAULT_CONTENT_TYPE
**/
GridStore.DEFAULT_CONTENT_TYPE = 'binary/octet-stream';

/**
* Seek mode where the given length is absolute.
*
* @classconstant IO_SEEK_SET
**/
GridStore.IO_SEEK_SET = 0;

/**
* Seek mode where the given length is an offset to the current read/write head.
*
* @classconstant IO_SEEK_CUR
**/
GridStore.IO_SEEK_CUR = 1;

/**
* Seek mode where the given length is an offset to the end of the file.
*
* @classconstant IO_SEEK_END
**/
GridStore.IO_SEEK_END = 2;

/**
 * Checks if a file exists in the database.
 *
 * @method
 * @static
 * @param {Db} db the database to query.
 * @param {string} name The name of the file to look for.
 * @param {string} [rootCollection] The root collection that holds the files and chunks collection. Defaults to **{GridStore.DEFAULT_ROOT_COLLECTION}**.
 * @param {object} [options=null] Optional settings.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {object} [options.promiseLibrary=null] A Promise library class the application wishes to use such as Bluebird, must be ES6 compatible
 * @param {GridStore~resultCallback} [callback] result from exists.
 * @return {Promise} returns Promise if no callback passed
 * @deprecated Use GridFSBucket API instead
 */
GridStore.exist = function(db, fileIdObject, rootCollection, options, callback) {
  var args = Array.prototype.slice.call(arguments, 2);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  rootCollection = args.length ? args.shift() : null;
  options = args.length ? args.shift() : {};
  options = options || {};

  // Get the promiseLibrary
  var promiseLibrary = options.promiseLibrary;

  // No promise library selected fall back
  if(!promiseLibrary) {
    promiseLibrary = typeof global.Promise == 'function' ?
      global.Promise : __webpack_require__(3).Promise;
  }

  // We provided a callback leg
  if(typeof callback == 'function') return exists(db, fileIdObject, rootCollection, options, callback);
  // Return promise
  return new promiseLibrary(function(resolve, reject) {
    exists(db, fileIdObject, rootCollection, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    })
  });
};

var exists = function(db, fileIdObject, rootCollection, options, callback) {
  // Establish read preference
  var readPreference = options.readPreference || ReadPreference.PRIMARY;
  // Fetch collection
  var rootCollectionFinal = rootCollection != null ? rootCollection : GridStore.DEFAULT_ROOT_COLLECTION;
  db.collection(rootCollectionFinal + ".files", function(err, collection) {
    if(err) return callback(err);

    // Build query
    var query = (typeof fileIdObject == 'string' || Object.prototype.toString.call(fileIdObject) == '[object RegExp]' )
      ? {'filename':fileIdObject}
      : {'_id':fileIdObject};    // Attempt to locate file

    // We have a specific query
    if(fileIdObject != null
      && typeof fileIdObject == 'object'
      && Object.prototype.toString.call(fileIdObject) != '[object RegExp]') {
      query = fileIdObject;
    }

    // Check if the entry exists
    collection.findOne(query, {readPreference:readPreference}, function(err, item) {
      if(err) return callback(err);
      callback(null, item == null ? false : true);
    });
  });
}

define.staticMethod('exist', {callback: true, promise:true});

/**
 * Gets the list of files stored in the GridFS.
 *
 * @method
 * @static
 * @param {Db} db the database to query.
 * @param {string} [rootCollection] The root collection that holds the files and chunks collection. Defaults to **{GridStore.DEFAULT_ROOT_COLLECTION}**.
 * @param {object} [options=null] Optional settings.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {object} [options.promiseLibrary=null] A Promise library class the application wishes to use such as Bluebird, must be ES6 compatible
 * @param {GridStore~resultCallback} [callback] result from exists.
 * @return {Promise} returns Promise if no callback passed
 * @deprecated Use GridFSBucket API instead
 */
GridStore.list = function(db, rootCollection, options, callback) {
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  rootCollection = args.length ? args.shift() : null;
  options = args.length ? args.shift() : {};
  options = options || {};

  // Get the promiseLibrary
  var promiseLibrary = options.promiseLibrary;

  // No promise library selected fall back
  if(!promiseLibrary) {
    promiseLibrary = typeof global.Promise == 'function' ?
      global.Promise : __webpack_require__(3).Promise;
  }

  // We provided a callback leg
  if(typeof callback == 'function') return list(db, rootCollection, options, callback);
  // Return promise
  return new promiseLibrary(function(resolve, reject) {
    list(db, rootCollection, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    })
  });
};

var list = function(db, rootCollection, options, callback) {
  // Ensure we have correct values
  if(rootCollection != null && typeof rootCollection == 'object') {
    options = rootCollection;
    rootCollection = null;
  }

  // Establish read preference
  var readPreference = options.readPreference || ReadPreference.PRIMARY;
  // Check if we are returning by id not filename
  var byId = options['id'] != null ? options['id'] : false;
  // Fetch item
  var rootCollectionFinal = rootCollection != null ? rootCollection : GridStore.DEFAULT_ROOT_COLLECTION;
  var items = [];
  db.collection((rootCollectionFinal + ".files"), function(err, collection) {
    if(err) return callback(err);

    collection.find({}, {readPreference:readPreference}, function(err, cursor) {
      if(err) return callback(err);

      cursor.each(function(err, item) {
        if(item != null) {
          items.push(byId ? item._id : item.filename);
        } else {
          callback(err, items);
        }
      });
    });
  });
}

define.staticMethod('list', {callback: true, promise:true});

/**
 * Reads the contents of a file.
 *
 * This method has the following signatures
 *
 * (db, name, callback)
 * (db, name, length, callback)
 * (db, name, length, offset, callback)
 * (db, name, length, offset, options, callback)
 *
 * @method
 * @static
 * @param {Db} db the database to query.
 * @param {string} name The name of the file.
 * @param {number} [length] The size of data to read.
 * @param {number} [offset] The offset from the head of the file of which to start reading from.
 * @param {object} [options=null] Optional settings.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {object} [options.promiseLibrary=null] A Promise library class the application wishes to use such as Bluebird, must be ES6 compatible
 * @param {GridStore~readCallback} [callback] the command callback.
 * @return {Promise} returns Promise if no callback passed
 * @deprecated Use GridFSBucket API instead
 */
GridStore.read = function(db, name, length, offset, options, callback) {
  var args = Array.prototype.slice.call(arguments, 2);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  length = args.length ? args.shift() : null;
  offset = args.length ? args.shift() : null;
  options = args.length ? args.shift() : null;
  options = options || {};

  // Get the promiseLibrary
  var promiseLibrary = options ? options.promiseLibrary : null;

  // No promise library selected fall back
  if(!promiseLibrary) {
    promiseLibrary = typeof global.Promise == 'function' ?
      global.Promise : __webpack_require__(3).Promise;
  }

  // We provided a callback leg
  if(typeof callback == 'function') return readStatic(db, name, length, offset, options, callback);
  // Return promise
  return new promiseLibrary(function(resolve, reject) {
    readStatic(db, name, length, offset, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    })
  });
};

var readStatic = function(db, name, length, offset, options, callback) {
  new GridStore(db, name, "r", options).open(function(err, gridStore) {
    if(err) return callback(err);
    // Make sure we are not reading out of bounds
    if(offset && offset >= gridStore.length) return callback("offset larger than size of file", null);
    if(length && length > gridStore.length) return callback("length is larger than the size of the file", null);
    if(offset && length && (offset + length) > gridStore.length) return callback("offset and length is larger than the size of the file", null);

    if(offset != null) {
      gridStore.seek(offset, function(err, gridStore) {
        if(err) return callback(err);
        gridStore.read(length, callback);
      });
    } else {
      gridStore.read(length, callback);
    }
  });
}

define.staticMethod('read', {callback: true, promise:true});

/**
 * Read the entire file as a list of strings splitting by the provided separator.
 *
 * @method
 * @static
 * @param {Db} db the database to query.
 * @param {(String|object)} name the name of the file.
 * @param {string} [separator] The character to be recognized as the newline separator.
 * @param {object} [options=null] Optional settings.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {object} [options.promiseLibrary=null] A Promise library class the application wishes to use such as Bluebird, must be ES6 compatible
 * @param {GridStore~readlinesCallback} [callback] the command callback.
 * @return {Promise} returns Promise if no callback passed
 * @deprecated Use GridFSBucket API instead
 */
GridStore.readlines = function(db, name, separator, options, callback) {
  var args = Array.prototype.slice.call(arguments, 2);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  separator = args.length ? args.shift() : null;
  options = args.length ? args.shift() : null;
  options = options || {};

  // Get the promiseLibrary
  var promiseLibrary = options ? options.promiseLibrary : null;

  // No promise library selected fall back
  if(!promiseLibrary) {
    promiseLibrary = typeof global.Promise == 'function' ?
      global.Promise : __webpack_require__(3).Promise;
  }

  // We provided a callback leg
  if(typeof callback == 'function') return readlinesStatic(db, name, separator, options, callback);
  // Return promise
  return new promiseLibrary(function(resolve, reject) {
    readlinesStatic(db, name, separator, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    })
  });
};

var readlinesStatic = function(db, name, separator, options, callback) {
  var finalSeperator = separator == null ? "\n" : separator;
  new GridStore(db, name, "r", options).open(function(err, gridStore) {
    if(err) return callback(err);
    gridStore.readlines(finalSeperator, callback);
  });
}

define.staticMethod('readlines', {callback: true, promise:true});

/**
 * Deletes the chunks and metadata information of a file from GridFS.
 *
 * @method
 * @static
 * @param {Db} db The database to query.
 * @param {(string|array)} names The name/names of the files to delete.
 * @param {object} [options=null] Optional settings.
 * @param {object} [options.promiseLibrary=null] A Promise library class the application wishes to use such as Bluebird, must be ES6 compatible
 * @param {GridStore~resultCallback} [callback] the command callback.
 * @return {Promise} returns Promise if no callback passed
 * @deprecated Use GridFSBucket API instead
 */
GridStore.unlink = function(db, names, options, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 2);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  options = args.length ? args.shift() : {};
  options = options || {};

  // Get the promiseLibrary
  var promiseLibrary = options.promiseLibrary;

  // No promise library selected fall back
  if(!promiseLibrary) {
    promiseLibrary = typeof global.Promise == 'function' ?
      global.Promise : __webpack_require__(3).Promise;
  }

  // We provided a callback leg
  if(typeof callback == 'function') return unlinkStatic(self, db, names, options, callback);

  // Return promise
  return new promiseLibrary(function(resolve, reject) {
    unlinkStatic(self, db, names, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    })
  });
};

var unlinkStatic = function(self, db, names, options, callback) {
  // Get the write concern
  var writeConcern = _getWriteConcern(db, options);

  // List of names
  if(names.constructor == Array) {
    var tc = 0;
    for(var i = 0; i < names.length; i++) {
      ++tc;
      GridStore.unlink(db, names[i], options, function() {
        if(--tc == 0) {
          callback(null, self);
        }
      });
    }
  } else {
    new GridStore(db, names, "w", options).open(function(err, gridStore) {
      if(err) return callback(err);
      deleteChunks(gridStore, function(err) {
        if(err) return callback(err);
        gridStore.collection(function(err, collection) {
          if(err) return callback(err);
          collection.remove({'_id':gridStore.fileId}, writeConcern, function(err) {
            callback(err, self);
          });
        });
      });
    });
  }
}

define.staticMethod('unlink', {callback: true, promise:true});

/**
 *  @ignore
 */
var _writeNormal = function(self, data, close, callback) {
  // If we have a buffer write it using the writeBuffer method
  if(Buffer.isBuffer(data)) {
    return writeBuffer(self, data, close, callback);
  } else {
    return writeBuffer(self, new Buffer(data, 'binary'), close, callback);
  }
}

/**
 * @ignore
 */
var _setWriteConcernHash = function(options) {
  var finalOptions = {};
  if(options.w != null) finalOptions.w = options.w;
  if(options.journal == true) finalOptions.j = options.journal;
  if(options.j == true) finalOptions.j = options.j;
  if(options.fsync == true) finalOptions.fsync = options.fsync;
  if(options.wtimeout != null) finalOptions.wtimeout = options.wtimeout;
  return finalOptions;
}

/**
 * @ignore
 */
var _getWriteConcern = function(self, options) {
  // Final options
  var finalOptions = {w:1};
  options = options || {};

  // Local options verification
  if(options.w != null || typeof options.j == 'boolean' || typeof options.journal == 'boolean' || typeof options.fsync == 'boolean') {
    finalOptions = _setWriteConcernHash(options);
  } else if(options.safe != null && typeof options.safe == 'object') {
    finalOptions = _setWriteConcernHash(options.safe);
  } else if(typeof options.safe == "boolean") {
    finalOptions = {w: (options.safe ? 1 : 0)};
  } else if(self.options.w != null || typeof self.options.j == 'boolean' || typeof self.options.journal == 'boolean' || typeof self.options.fsync == 'boolean') {
    finalOptions = _setWriteConcernHash(self.options);
  } else if(self.safe && (self.safe.w != null || typeof self.safe.j == 'boolean' || typeof self.safe.journal == 'boolean' || typeof self.safe.fsync == 'boolean')) {
    finalOptions = _setWriteConcernHash(self.safe);
  } else if(typeof self.safe == "boolean") {
    finalOptions = {w: (self.safe ? 1 : 0)};
  }

  // Ensure we don't have an invalid combination of write concerns
  if(finalOptions.w < 1
    && (finalOptions.journal == true || finalOptions.j == true || finalOptions.fsync == true)) throw MongoError.create({message: "No acknowledgement using w < 1 cannot be combined with journal:true or fsync:true", driver:true});

  // Return the options
  return finalOptions;
}

/**
 * Create a new GridStoreStream instance (INTERNAL TYPE, do not instantiate directly)
 *
 * @class
 * @extends external:Duplex
 * @return {GridStoreStream} a GridStoreStream instance.
 * @deprecated Use GridFSBucket API instead
 */
var GridStoreStream = function(gs) {
  // Initialize the duplex stream
  Duplex.call(this);

  // Get the gridstore
  this.gs = gs;

  // End called
  this.endCalled = false;

  // If we have a seek
  this.totalBytesToRead = this.gs.length - this.gs.position;
  this.seekPosition = this.gs.position;
}

//
// Inherit duplex
inherits(GridStoreStream, Duplex);

GridStoreStream.prototype._pipe = GridStoreStream.prototype.pipe;

// Set up override
GridStoreStream.prototype.pipe = function(destination) {
  var self = this;

  // Only open gridstore if not already open
  if(!self.gs.isOpen) {
    self.gs.open(function(err) {
      if(err) return self.emit('error', err);
      self.totalBytesToRead = self.gs.length - self.gs.position;
      self._pipe.apply(self, [destination]);
    });
  } else {
    self.totalBytesToRead = self.gs.length - self.gs.position;
    self._pipe.apply(self, [destination]);
  }

  return destination;
}

// Called by stream
GridStoreStream.prototype._read = function() {
  var self = this;

  var read = function() {
    // Read data
    self.gs.read(length, function(err, buffer) {
      if(err && !self.endCalled) return self.emit('error', err);

      // Stream is closed
      if(self.endCalled || buffer == null) return self.push(null);
      // Remove bytes read
      if(buffer.length <= self.totalBytesToRead) {
        self.totalBytesToRead = self.totalBytesToRead - buffer.length;
        self.push(buffer);
      } else if(buffer.length > self.totalBytesToRead) {
        self.totalBytesToRead = self.totalBytesToRead - buffer._index;
        self.push(buffer.slice(0, buffer._index));
      }

      // Finished reading
      if(self.totalBytesToRead <= 0) {
        self.endCalled = true;
      }
    });
  }

  // Set read length
  var length = self.gs.length < self.gs.chunkSize ? self.gs.length - self.seekPosition : self.gs.chunkSize;
  if(!self.gs.isOpen) {
    self.gs.open(function(err) {
      self.totalBytesToRead = self.gs.length - self.gs.position;
      if(err) return self.emit('error', err);
      read();
    });
  } else {
    read();
  }
}

GridStoreStream.prototype.destroy = function() {
  this.pause();
  this.endCalled = true;
  this.gs.close();
  this.emit('end');
}

GridStoreStream.prototype.write = function(chunk) {
  var self = this;
  if(self.endCalled) return self.emit('error', MongoError.create({message: 'attempting to write to stream after end called', driver:true}))
  // Do we have to open the gridstore
  if(!self.gs.isOpen) {
    self.gs.open(function() {
      self.gs.isOpen = true;
      self.gs.write(chunk, function() {
        process.nextTick(function() {
          self.emit('drain');
        });
      });
    });
    return false;
  } else {
    self.gs.write(chunk, function() {
      self.emit('drain');
    });
    return true;
  }
}

GridStoreStream.prototype.end = function(chunk, encoding, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 0);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  chunk = args.length ? args.shift() : null;
  encoding = args.length ? args.shift() : null;
  self.endCalled = true;

  if(chunk) {
    self.gs.write(chunk, function() {
      self.gs.close(function() {
        if(typeof callback == 'function') callback();
        self.emit('end')
      });
    });
  }

  self.gs.close(function() {
    if(typeof callback == 'function') callback();
    self.emit('end')
  });
}

/**
 * The read() method pulls some data out of the internal buffer and returns it. If there is no data available, then it will return null.
 * @function external:Duplex#read
 * @param {number} size Optional argument to specify how much data to read.
 * @return {(String | Buffer | null)}
 */

/**
 * Call this function to cause the stream to return strings of the specified encoding instead of Buffer objects.
 * @function external:Duplex#setEncoding
 * @param {string} encoding The encoding to use.
 * @return {null}
 */

/**
 * This method will cause the readable stream to resume emitting data events.
 * @function external:Duplex#resume
 * @return {null}
 */

/**
 * This method will cause a stream in flowing-mode to stop emitting data events. Any data that becomes available will remain in the internal buffer.
 * @function external:Duplex#pause
 * @return {null}
 */

/**
 * This method pulls all the data out of a readable stream, and writes it to the supplied destination, automatically managing the flow so that the destination is not overwhelmed by a fast readable stream.
 * @function external:Duplex#pipe
 * @param {Writable} destination The destination for writing data
 * @param {object} [options] Pipe options
 * @return {null}
 */

/**
 * This method will remove the hooks set up for a previous pipe() call.
 * @function external:Duplex#unpipe
 * @param {Writable} [destination] The destination for writing data
 * @return {null}
 */

/**
 * This is useful in certain cases where a stream is being consumed by a parser, which needs to "un-consume" some data that it has optimistically pulled out of the source, so that the stream can be passed on to some other party.
 * @function external:Duplex#unshift
 * @param {(Buffer|string)} chunk Chunk of data to unshift onto the read queue.
 * @return {null}
 */

/**
 * Versions of Node prior to v0.10 had streams that did not implement the entire Streams API as it is today. (See "Compatibility" below for more information.)
 * @function external:Duplex#wrap
 * @param {Stream} stream An "old style" readable stream.
 * @return {null}
 */

/**
 * This method writes some data to the underlying system, and calls the supplied callback once the data has been fully handled.
 * @function external:Duplex#write
 * @param {(string|Buffer)} chunk The data to write
 * @param {string} encoding The encoding, if chunk is a String
 * @param {function} callback Callback for when this chunk of data is flushed
 * @return {boolean}
 */

/**
 * Call this method when no more data will be written to the stream. If supplied, the callback is attached as a listener on the finish event.
 * @function external:Duplex#end
 * @param {(string|Buffer)} chunk The data to write
 * @param {string} encoding The encoding, if chunk is a String
 * @param {function} callback Callback for when this chunk of data is flushed
 * @return {null}
 */

/**
 * GridStoreStream stream data event, fired for each document in the cursor.
 *
 * @event GridStoreStream#data
 * @type {object}
 */

/**
 * GridStoreStream stream end event
 *
 * @event GridStoreStream#end
 * @type {null}
 */

/**
 * GridStoreStream stream close event
 *
 * @event GridStoreStream#close
 * @type {null}
 */

/**
 * GridStoreStream stream readable event
 *
 * @event GridStoreStream#readable
 * @type {null}
 */

/**
 * GridStoreStream stream drain event
 *
 * @event GridStoreStream#drain
 * @type {null}
 */

/**
 * GridStoreStream stream finish event
 *
 * @event GridStoreStream#finish
 * @type {null}
 */

/**
 * GridStoreStream stream pipe event
 *
 * @event GridStoreStream#pipe
 * @type {null}
 */

/**
 * GridStoreStream stream unpipe event
 *
 * @event GridStoreStream#unpipe
 * @type {null}
 */

/**
 * GridStoreStream stream error event
 *
 * @event GridStoreStream#error
 * @type {null}
 */

/**
 * @ignore
 */
module.exports = GridStore;


/***/ }),
/* 52 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var Binary = __webpack_require__(1).BSON.Binary,
  ObjectID = __webpack_require__(1).BSON.ObjectID;

/**
 * Class for representing a single chunk in GridFS.
 *
 * @class
 *
 * @param file {GridStore} The {@link GridStore} object holding this chunk.
 * @param mongoObject {object} The mongo object representation of this chunk.
 *
 * @throws Error when the type of data field for {@link mongoObject} is not
 *     supported. Currently supported types for data field are instances of
 *     {@link String}, {@link Array}, {@link Binary} and {@link Binary}
 *     from the bson module
 *
 * @see Chunk#buildMongoObject
 */
var Chunk = function(file, mongoObject, writeConcern) {
  if(!(this instanceof Chunk)) return new Chunk(file, mongoObject);

  this.file = file;
  var mongoObjectFinal = mongoObject == null ? {} : mongoObject;
  this.writeConcern = writeConcern || {w:1};
  this.objectId = mongoObjectFinal._id == null ? new ObjectID() : mongoObjectFinal._id;
  this.chunkNumber = mongoObjectFinal.n == null ? 0 : mongoObjectFinal.n;
  this.data = new Binary();

  if(typeof mongoObjectFinal.data == "string") {
    var buffer = new Buffer(mongoObjectFinal.data.length);
    buffer.write(mongoObjectFinal.data, 0, mongoObjectFinal.data.length, 'binary');
    this.data = new Binary(buffer);
  } else if(Array.isArray(mongoObjectFinal.data)) {
    buffer = new Buffer(mongoObjectFinal.data.length);
    var data = mongoObjectFinal.data.join('');
    buffer.write(data, 0, data.length, 'binary');
    this.data = new Binary(buffer);
  } else if(mongoObjectFinal.data && mongoObjectFinal.data._bsontype === 'Binary') {
    this.data = mongoObjectFinal.data;
  } else if(!Buffer.isBuffer(mongoObjectFinal.data) && !(mongoObjectFinal.data == null)){
    throw Error("Illegal chunk format");
  }

  // Update position
  this.internalPosition = 0;
};

/**
 * Writes a data to this object and advance the read/write head.
 *
 * @param data {string} the data to write
 * @param callback {function(*, GridStore)} This will be called after executing
 *     this method. The first parameter will contain null and the second one
 *     will contain a reference to this object.
 */
Chunk.prototype.write = function(data, callback) {
  this.data.write(data, this.internalPosition, data.length, 'binary');
  this.internalPosition = this.data.length();
  if(callback != null) return callback(null, this);
  return this;
};

/**
 * Reads data and advances the read/write head.
 *
 * @param length {number} The length of data to read.
 *
 * @return {string} The data read if the given length will not exceed the end of
 *     the chunk. Returns an empty String otherwise.
 */
Chunk.prototype.read = function(length) {
  // Default to full read if no index defined
  length = length == null || length == 0 ? this.length() : length;

  if(this.length() - this.internalPosition + 1 >= length) {
    var data = this.data.read(this.internalPosition, length);
    this.internalPosition = this.internalPosition + length;
    return data;
  } else {
    return '';
  }
};

Chunk.prototype.readSlice = function(length) {
  if ((this.length() - this.internalPosition) >= length) {
    var data = null;
    if (this.data.buffer != null) { //Pure BSON
      data = this.data.buffer.slice(this.internalPosition, this.internalPosition + length);
    } else { //Native BSON
      data = new Buffer(length);
      length = this.data.readInto(data, this.internalPosition);
    }
    this.internalPosition = this.internalPosition + length;
    return data;
  } else {
    return null;
  }
};

/**
 * Checks if the read/write head is at the end.
 *
 * @return {boolean} Whether the read/write head has reached the end of this
 *     chunk.
 */
Chunk.prototype.eof = function() {
  return this.internalPosition == this.length() ? true : false;
};

/**
 * Reads one character from the data of this chunk and advances the read/write
 * head.
 *
 * @return {string} a single character data read if the the read/write head is
 *     not at the end of the chunk. Returns an empty String otherwise.
 */
Chunk.prototype.getc = function() {
  return this.read(1);
};

/**
 * Clears the contents of the data in this chunk and resets the read/write head
 * to the initial position.
 */
Chunk.prototype.rewind = function() {
  this.internalPosition = 0;
  this.data = new Binary();
};

/**
 * Saves this chunk to the database. Also overwrites existing entries having the
 * same id as this chunk.
 *
 * @param callback {function(*, GridStore)} This will be called after executing
 *     this method. The first parameter will contain null and the second one
 *     will contain a reference to this object.
 */
Chunk.prototype.save = function(options, callback) {
  var self = this;
  if(typeof options == 'function') {
    callback = options;
    options = {};
  }

  self.file.chunkCollection(function(err, collection) {
    if(err) return callback(err);

    // Merge the options
    var writeOptions = { upsert: true };
    for(var name in options) writeOptions[name] = options[name];
    for(name in self.writeConcern) writeOptions[name] = self.writeConcern[name];

    if(self.data.length() > 0) {
      self.buildMongoObject(function(mongoObject) {
        var options = {forceServerObjectId:true};
        for(var name in self.writeConcern) {
          options[name] = self.writeConcern[name];
        }

        collection.replaceOne({'_id':self.objectId}, mongoObject, writeOptions, function(err) {
          callback(err, self);
        });
      });
    } else {
      callback(null, self);
    }
    // });
  });
};

/**
 * Creates a mongoDB object representation of this chunk.
 *
 * @param callback {function(Object)} This will be called after executing this
 *     method. The object will be passed to the first parameter and will have
 *     the structure:
 *
 *        <pre><code>
 *        {
 *          '_id' : , // {number} id for this chunk
 *          'files_id' : , // {number} foreign key to the file collection
 *          'n' : , // {number} chunk number
 *          'data' : , // {bson#Binary} the chunk data itself
 *        }
 *        </code></pre>
 *
 * @see <a href="http://www.mongodb.org/display/DOCS/GridFS+Specification#GridFSSpecification-{{chunks}}">MongoDB GridFS Chunk Object Structure</a>
 */
Chunk.prototype.buildMongoObject = function(callback) {
  var mongoObject = {
    'files_id': this.file.fileId,
    'n': this.chunkNumber,
    'data': this.data};
  // If we are saving using a specific ObjectId
  if(this.objectId != null) mongoObject._id = this.objectId;

  callback(mongoObject);
};

/**
 * @return {number} the length of the data
 */
Chunk.prototype.length = function() {
  return this.data.length();
};

/**
 * The position of the read/write head
 * @name position
 * @lends Chunk#
 * @field
 */
Object.defineProperty(Chunk.prototype, "position", { enumerable: true
  , get: function () {
      return this.internalPosition;
    }
  , set: function(value) {
      this.internalPosition = value;
    }
});

/**
 * The default chunk size
 * @constant
 */
Chunk.DEFAULT_CHUNK_SIZE = 1024 * 255;

module.exports = Chunk;


/***/ }),
/* 53 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var toError = __webpack_require__(0).toError,
  Define = __webpack_require__(4),
  shallowClone = __webpack_require__(0).shallowClone,
  assign = __webpack_require__(0).assign,
  authenticate = __webpack_require__(35);

/**
 * @fileOverview The **Admin** class is an internal class that allows convenient access to
 * the admin functionality and commands for MongoDB.
 *
 * **ADMIN Cannot directly be instantiated**
 * @example
 * var MongoClient = require('mongodb').MongoClient,
 *   test = require('assert');
 * // Connection url
 * var url = 'mongodb://localhost:27017/test';
 * // Connect using MongoClient
 * MongoClient.connect(url, function(err, db) {
 *   // Use the admin database for the operation
 *   var adminDb = db.admin();
 *
 *   // List all the available databases
 *   adminDb.listDatabases(function(err, dbs) {
 *     test.equal(null, err);
 *     test.ok(dbs.databases.length > 0);
 *     db.close();
 *   });
 * });
 */

/**
 * Create a new Admin instance (INTERNAL TYPE, do not instantiate directly)
 * @class
 * @return {Admin} a collection instance.
 */
var Admin = function(db, topology, promiseLibrary) {
  if(!(this instanceof Admin)) return new Admin(db, topology);

  // Internal state
  this.s = {
      db: db
    , topology: topology
    , promiseLibrary: promiseLibrary
  }
}

var define = Admin.define = new Define('Admin', Admin, false);

/**
 * The callback format for results
 * @callback Admin~resultCallback
 * @param {MongoError} error An error instance representing the error during the execution.
 * @param {object} result The result object if the command was executed successfully.
 */

/**
 * Execute a command
 * @method
 * @param {object} command The command hash
 * @param {object} [options=null] Optional settings.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {number} [options.maxTimeMS=null] Number of milliseconds to wait before aborting the query.
 * @param {Admin~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Admin.prototype.command = function(command, options, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  options = args.length ? args.shift() : {};

  // Execute using callback
  if(typeof callback == 'function') return this.s.db.executeDbAdminCommand(command, options, function(err, doc) {
    return callback != null ? callback(err, doc) : null;
  });

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    self.s.db.executeDbAdminCommand(command, options, function(err, doc) {
      if(err) return reject(err);
      resolve(doc);
    });
  });
}

define.classMethod('command', {callback: true, promise:true});

/**
 * Retrieve the server information for the current
 * instance of the db client
 *
 * @param {Admin~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Admin.prototype.buildInfo = function(callback) {
  var self = this;
  // Execute using callback
  if(typeof callback == 'function') return this.serverInfo(callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    self.serverInfo(function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

define.classMethod('buildInfo', {callback: true, promise:true});

/**
 * Retrieve the server information for the current
 * instance of the db client
 *
 * @param {Admin~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Admin.prototype.serverInfo = function(callback) {
  var self = this;
  // Execute using callback
  if(typeof callback == 'function') return this.s.db.executeDbAdminCommand({buildinfo:1}, function(err, doc) {
    if(err != null) return callback(err, null);
    callback(null, doc);
  });

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    self.s.db.executeDbAdminCommand({buildinfo:1}, function(err, doc) {
      if(err) return reject(err);
      resolve(doc);
    });
  });
}

define.classMethod('serverInfo', {callback: true, promise:true});

/**
 * Retrieve this db's server status.
 *
 * @param {Admin~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Admin.prototype.serverStatus = function(callback) {
  var self = this;

  // Execute using callback
  if(typeof callback == 'function') return serverStatus(self, callback)

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    serverStatus(self, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
};

var serverStatus = function(self, callback) {
  self.s.db.executeDbAdminCommand({serverStatus: 1}, function(err, doc) {
    if(err == null && doc.ok === 1) {
      callback(null, doc);
    } else {
      if(err) return callback(err, false);
      return callback(toError(doc), false);
    }
  });
}

define.classMethod('serverStatus', {callback: true, promise:true});

/**
 * Retrieve the current profiling Level for MongoDB
 *
 * @param {Admin~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Admin.prototype.profilingLevel = function(callback) {
  var self = this;

  // Execute using callback
  if(typeof callback == 'function') return profilingLevel(self, callback)

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    profilingLevel(self, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
};

var profilingLevel = function(self, callback) {
  self.s.db.executeDbAdminCommand({profile:-1}, function(err, doc) {
    if(err == null && doc.ok === 1) {
      var was = doc.was;
      if(was == 0) return callback(null, "off");
      if(was == 1) return callback(null, "slow_only");
      if(was == 2) return callback(null, "all");
        return callback(new Error("Error: illegal profiling level value " + was), null);
    } else {
      err != null ? callback(err, null) : callback(new Error("Error with profile command"), null);
    }
  });
}

define.classMethod('profilingLevel', {callback: true, promise:true});

/**
 * Ping the MongoDB server and retrieve results
 *
 * @param {Admin~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Admin.prototype.ping = function(options, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 0);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);

  // Execute using callback
  if(typeof callback == 'function') return this.s.db.executeDbAdminCommand({ping: 1}, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    self.s.db.executeDbAdminCommand({ping: 1}, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

define.classMethod('ping', {callback: true, promise:true});

/**
 * Authenticate a user against the server.
 * @method
 * @param {string} username The username.
 * @param {string} [password] The password.
 * @param {Admin~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 * @deprecated This method will no longer be available in the next major release 3.x as MongoDB 3.6 will only allow auth against users in the admin db and will no longer allow multiple credentials on a socket. Please authenticate using MongoClient.connect with auth credentials.
 */
Admin.prototype.authenticate = function(username, password, options, callback) {
  console.warn("Admin.prototype.authenticate method will no longer be available in the next major release 3.x as MongoDB 3.6 will only allow auth against users in the admin db and will no longer allow multiple credentials on a socket. Please authenticate using MongoClient.connect with auth credentials.");
  var finalArguments = [this.s.db];
  if(typeof username == 'string') finalArguments.push(username);
  if(typeof password == 'string') finalArguments.push(password);
  if(typeof options == 'function') {
    finalArguments.push({ authdb: 'admin' });
    finalArguments.push(options);
  } else {
    finalArguments.push(assign({}, options, { authdb: 'admin' }));
  }

  if(typeof callback == 'function') finalArguments.push(callback);
  // Execute authenticate method
  return authenticate.apply(this.s.db, finalArguments);
}

define.classMethod('authenticate', {callback: true, promise:true});

/**
 * Logout user from server, fire off on all connections and remove all auth info
 * @method
 * @param {Admin~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Admin.prototype.logout = function(callback) {
  var self = this;
  // Execute using callback
  if(typeof callback == 'function') return this.s.db.logout({dbName: 'admin'}, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    self.s.db.logout({dbName: 'admin'}, function(err) {
      if(err) return reject(err);
      resolve(true);
    });
  });
}

define.classMethod('logout', {callback: true, promise:true});

// Get write concern
var writeConcern = function(options, db) {
  options = shallowClone(options);

  // If options already contain write concerns return it
  if(options.w || options.wtimeout || options.j || options.fsync) {
    return options;
  }

  // Set db write concern if available
  if(db.writeConcern) {
    if(options.w) options.w = db.writeConcern.w;
    if(options.wtimeout) options.wtimeout = db.writeConcern.wtimeout;
    if(options.j) options.j = db.writeConcern.j;
    if(options.fsync) options.fsync = db.writeConcern.fsync;
  }

  // Return modified options
  return options;
}

/**
 * Add a user to the database.
 * @method
 * @param {string} username The username.
 * @param {string} password The password.
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.fsync=false] Specify a file sync write concern.
 * @param {object} [options.customData=null] Custom data associated with the user (only Mongodb 2.6 or higher)
 * @param {object[]} [options.roles=null] Roles associated with the created user (only Mongodb 2.6 or higher)
 * @param {Admin~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Admin.prototype.addUser = function(username, password, options, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 2);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  options = args.length ? args.shift() : {};
  options = options || {};
  // Get the options
  options = writeConcern(options, self.s.db)
  // Set the db name to admin
  options.dbName = 'admin';

  // Execute using callback
  if(typeof callback == 'function')
    return self.s.db.addUser(username, password, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    self.s.db.addUser(username, password, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

define.classMethod('addUser', {callback: true, promise:true});

/**
 * Remove a user from a database
 * @method
 * @param {string} username The username.
 * @param {object} [options=null] Optional settings.
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.fsync=false] Specify a file sync write concern.
 * @param {Admin~resultCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
Admin.prototype.removeUser = function(username, options, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  options = args.length ? args.shift() : {};
  options = options || {};
  // Get the options
  options = writeConcern(options, self.s.db)
  // Set the db name
  options.dbName = 'admin';

  // Execute using callback
  if(typeof callback == 'function')
    return self.s.db.removeUser(username, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    self.s.db.removeUser(username, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

define.classMethod('removeUser', {callback: true, promise:true});

/**
 * Set the current profiling level of MongoDB
 *
 * @param {string} level The new profiling level (off, slow_only, all).
 * @param {Admin~resultCallback} [callback] The command result callback.
 * @return {Promise} returns Promise if no callback passed
 */
Admin.prototype.setProfilingLevel = function(level, callback) {
  var self = this;

  // Execute using callback
  if(typeof callback == 'function') return setProfilingLevel(self, level, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    setProfilingLevel(self, level, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
};

var setProfilingLevel = function(self, level, callback) {
  var command = {};
  var profile = 0;

  if(level == "off") {
    profile = 0;
  } else if(level == "slow_only") {
    profile = 1;
  } else if(level == "all") {
    profile = 2;
  } else {
    return callback(new Error("Error: illegal profiling level value " + level));
  }

  // Set up the profile number
  command['profile'] = profile;

  self.s.db.executeDbAdminCommand(command, function(err, doc) {
    if(err == null && doc.ok === 1)
      return callback(null, level);
    return err != null ? callback(err, null) : callback(new Error("Error with profile command"), null);
  });
}

define.classMethod('setProfilingLevel', {callback: true, promise:true});

/**
 * Retrieve the current profiling information for MongoDB
 *
 * @param {Admin~resultCallback} [callback] The command result callback.
 * @return {Promise} returns Promise if no callback passed
 * @deprecated Query the system.profile collection directly.
 */
Admin.prototype.profilingInfo = function(callback) {
  var self = this;

  // Execute using callback
  if(typeof callback == 'function') return profilingInfo(self, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    profilingInfo(self, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
};

var profilingInfo = function(self, callback) {
  try {
    self.s.topology.cursor("admin.system.profile", { find: 'system.profile', query: {}}, {}).toArray(callback);
  } catch (err) {
    return callback(err, null);
  }
}

define.classMethod('profilingLevel', {callback: true, promise:true});

/**
 * Validate an existing collection
 *
 * @param {string} collectionName The name of the collection to validate.
 * @param {object} [options=null] Optional settings.
 * @param {Admin~resultCallback} [callback] The command result callback.
 * @return {Promise} returns Promise if no callback passed
 */
Admin.prototype.validateCollection = function(collectionName, options, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  if(typeof callback != 'function') args.push(callback);
  options = args.length ? args.shift() : {};
  options = options || {};

  // Execute using callback
  if(typeof callback == 'function')
    return validateCollection(self, collectionName, options, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    validateCollection(self, collectionName, options, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
};

var validateCollection = function(self, collectionName, options, callback) {
  var command = {validate: collectionName};
  var keys = Object.keys(options);

  // Decorate command with extra options
  for(var i = 0; i < keys.length; i++) {
    if(options.hasOwnProperty(keys[i])) {
      command[keys[i]] = options[keys[i]];
    }
  }

  self.s.db.command(command, function(err, doc) {
    if(err != null) return callback(err, null);

    if(doc.ok === 0)
      return callback(new Error("Error with validate command"), null);
    if(doc.result != null && doc.result.constructor != String)
      return callback(new Error("Error with validation data"), null);
    if(doc.result != null && doc.result.match(/exception|corrupt/) != null)
      return callback(new Error("Error: invalid collection " + collectionName), null);
    if(doc.valid != null && !doc.valid)
      return callback(new Error("Error: invalid collection " + collectionName), null);

    return callback(null, doc);
  });
}

define.classMethod('validateCollection', {callback: true, promise:true});

/**
 * List the available databases
 *
 * @param {Admin~resultCallback} [callback] The command result callback.
 * @return {Promise} returns Promise if no callback passed
 */
Admin.prototype.listDatabases = function(callback) {
  var self = this;
  // Execute using callback
  if(typeof callback == 'function') return self.s.db.executeDbAdminCommand({listDatabases:1}, {}, callback);

  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    self.s.db.executeDbAdminCommand({listDatabases:1}, {}, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
}

define.classMethod('listDatabases', {callback: true, promise:true});

/**
 * Get ReplicaSet status
 *
 * @param {Admin~resultCallback} [callback] The command result callback.
 * @return {Promise} returns Promise if no callback passed
 */
Admin.prototype.replSetGetStatus = function(callback) {
  var self = this;
  // Execute using callback
  if(typeof callback == 'function') return replSetGetStatus(self, callback);
  // Return a Promise
  return new this.s.promiseLibrary(function(resolve, reject) {
    replSetGetStatus(self, function(err, r) {
      if(err) return reject(err);
      resolve(r);
    });
  });
};

var replSetGetStatus = function(self, callback) {
  self.s.db.executeDbAdminCommand({replSetGetStatus:1}, function(err, doc) {
    if(err == null && doc.ok === 1)
      return callback(null, doc);
    if(err) return callback(err, false);
    callback(toError(doc), false);
  });
}

define.classMethod('replSetGetStatus', {callback: true, promise:true});

module.exports = Admin;


/***/ }),
/* 54 */
/***/ (function(module, exports) {

module.exports = require("crypto");

/***/ }),
/* 55 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var parse = __webpack_require__(92)
  , Server = __webpack_require__(24)
  , Mongos = __webpack_require__(56)
  , ReplSet = __webpack_require__(57)
  , EventEmitter = __webpack_require__(8).EventEmitter
  , inherits = __webpack_require__(2).inherits
  , Define = __webpack_require__(4)
  , ReadPreference = __webpack_require__(5)
  , Logger = __webpack_require__(1).Logger
  , MongoError = __webpack_require__(1).MongoError
  , Db = __webpack_require__(34)
  , f = __webpack_require__(2).format
  , assign = __webpack_require__(0).assign
  , shallowClone = __webpack_require__(0).shallowClone
  , authenticate = __webpack_require__(35);

/**
 * @fileOverview The **MongoClient** class is a class that allows for making Connections to MongoDB.
 *
 * @example
 * var MongoClient = require('mongodb').MongoClient,
 *   test = require('assert');
 * // Connection url
 * var url = 'mongodb://localhost:27017/test';
 * // Connect using MongoClient
 * MongoClient.connect(url, function(err, db) {
 *   // Get an additional db
 *   db.close();
 * });
 */
var validOptionNames = ['poolSize', 'ssl', 'sslValidate', 'sslCA', 'sslCert', 'ciphers', 'ecdhCurve',
  'sslKey', 'sslPass', 'sslCRL', 'autoReconnect', 'noDelay', 'keepAlive', 'connectTimeoutMS', 'family',
  'socketTimeoutMS', 'reconnectTries', 'reconnectInterval', 'ha', 'haInterval',
  'replicaSet', 'secondaryAcceptableLatencyMS', 'acceptableLatencyMS',
  'connectWithNoPrimary', 'authSource', 'w', 'wtimeout', 'j', 'forceServerObjectId',
  'serializeFunctions', 'ignoreUndefined', 'raw', 'bufferMaxEntries',
  'readPreference', 'pkFactory', 'promiseLibrary', 'readConcern', 'maxStalenessSeconds',
  'loggerLevel', 'logger', 'promoteValues', 'promoteBuffers', 'promoteLongs',
  'domainsEnabled', 'keepAliveInitialDelay', 'checkServerIdentity', 'validateOptions', 'appname', 'auth'];
var ignoreOptionNames = ['native_parser'];
var legacyOptionNames = ['server', 'replset', 'replSet', 'mongos', 'db'];

function validOptions(options) {
  var _validOptions = validOptionNames.concat(legacyOptionNames);

  for(var name in options) {
    if(ignoreOptionNames.indexOf(name) != -1) {
      continue;
    }

    if(_validOptions.indexOf(name) == -1 && options.validateOptions) {
      return new MongoError(f('option %s is not supported', name));
    } else if(_validOptions.indexOf(name) == -1) {
      console.warn(f('the options [%s] is not supported', name));
    }

    if(legacyOptionNames.indexOf(name) != -1) {
      console.warn(f('the server/replset/mongos options are deprecated, '
      + 'all their options are supported at the top level of the options object [%s]', validOptionNames));
    }
  }
}

/**
 * Creates a new MongoClient instance
 * @class
 * @return {MongoClient} a MongoClient instance.
 */
function MongoClient() {
  if(!(this instanceof MongoClient)) return new MongoClient();

  // Set up event emitter
  EventEmitter.call(this);

  /**
   * The callback format for results
   * @callback MongoClient~connectCallback
   * @param {MongoError} error An error instance representing the error during the execution.
   * @param {Db} db The connected database.
   */

  /**
   * Connect to MongoDB using a url as documented at
   *
   *  docs.mongodb.org/manual/reference/connection-string/
   *
   * Note that for replicasets the replicaSet query parameter is required in the 2.0 driver
   *
   * @method
   * @param {string} url The connection URI string
   * @param {object} [options] Optional settings.
   * @param {number} [options.poolSize=5] poolSize The maximum size of the individual server pool.
   * @param {boolean} [options.ssl=false] Enable SSL connection.
   * @param {Buffer} [options.sslCA=undefined] SSL Certificate store binary buffer
   * @param {Buffer} [options.sslCRL=undefined] SSL Certificate revocation list binary buffer
   * @param {Buffer} [options.sslCert=undefined] SSL Certificate binary buffer
   * @param {Buffer} [options.sslKey=undefined] SSL Key file binary buffer
   * @param {string} [options.sslPass=undefined] SSL Certificate pass phrase
   * @param {boolean|function} [options.checkServerIdentity=true] Ensure we check server identify during SSL, set to false to disable checking. Only works for Node 0.12.x or higher. You can pass in a boolean or your own checkServerIdentity override function.
   * @param {boolean} [options.autoReconnect=true] Enable autoReconnect for single server instances
   * @param {boolean} [options.noDelay=true] TCP Connection no delay
   * @param {number} [options.family=4] Version of IP stack. Defaults to 4.
   * @param {number} [options.keepAlive=30000] The number of milliseconds to wait before initiating keepAlive on the TCP socket.
   * @param {number} [options.connectTimeoutMS=30000] TCP Connection timeout setting
   * @param {number} [options.socketTimeoutMS=360000] TCP Socket timeout setting
   * @param {number} [options.reconnectTries=30] Server attempt to reconnect #times
   * @param {number} [options.reconnectInterval=1000] Server will wait # milliseconds between retries
   * @param {boolean} [options.ha=true] Control if high availability monitoring runs for Replicaset or Mongos proxies.
   * @param {number} [options.haInterval=10000] The High availability period for replicaset inquiry
   * @param {string} [options.replicaSet=undefined] The Replicaset set name
   * @param {number} [options.secondaryAcceptableLatencyMS=15] Cutoff latency point in MS for Replicaset member selection
   * @param {number} [options.acceptableLatencyMS=15] Cutoff latency point in MS for Mongos proxies selection.
   * @param {boolean} [options.connectWithNoPrimary=false] Sets if the driver should connect even if no primary is available
   * @param {string} [options.authSource=undefined] Define the database to authenticate against
   * @param {string} [options.auth.user=undefined] The username for auth
   * @param {string} [options.auth.password=undefined] The password for auth
   * @param {(number|string)} [options.w=null] The write concern.
   * @param {number} [options.wtimeout=null] The write concern timeout.
   * @param {boolean} [options.j=false] Specify a journal write concern.
   * @param {boolean} [options.forceServerObjectId=false] Force server to assign _id values instead of driver.
   * @param {boolean} [options.serializeFunctions=false] Serialize functions on any object.
   * @param {Boolean} [options.ignoreUndefined=false] Specify if the BSON serializer should ignore undefined fields.
   * @param {boolean} [options.raw=false] Return document results as raw BSON buffers.
   * @param {boolean} [options.promoteLongs=true] Promotes Long values to number if they fit inside the 53 bits resolution.
   * @param {boolean} [options.promoteBuffers=false] Promotes Binary BSON values to native Node Buffers.
   * @param {boolean} [options.promoteValues=true] Promotes BSON values to native types where possible, set to false to only receive wrapper types.
   * @param {number} [options.bufferMaxEntries=-1] Sets a cap on how many operations the driver will buffer up before giving up on getting a working connection, default is -1 which is unlimited.
   * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
   * @param {boolean} [options.domainsEnabled=false] Enable the wrapping of the callback in the current domain, disabled by default to avoid perf hit.
   * @param {object} [options.pkFactory=null] A primary key factory object for generation of custom _id keys.
   * @param {object} [options.promiseLibrary=null] A Promise library class the application wishes to use such as Bluebird, must be ES6 compatible
   * @param {object} [options.readConcern=null] Specify a read concern for the collection. (only MongoDB 3.2 or higher supported)
   * @param {string} [options.readConcern.level='local'] Specify a read concern level for the collection operations, one of [local|majority]. (only MongoDB 3.2 or higher supported)
   * @param {number} [options.maxStalenessSeconds=undefined] The max staleness to secondary reads (values under 10 seconds cannot be guaranteed);
   * @param {string} [options.appname=undefined] The name of the application that created this MongoClient instance. MongoDB 3.4 and newer will print this value in the server log upon establishing each connection. It is also recorded in the slow query log and profile collections.
   * @param {string} [options.loggerLevel=undefined] The logging level (error/warn/info/debug)
   * @param {object} [options.logger=undefined] Custom logger object
   * @param {object} [options.validateOptions=false] Validate MongoClient passed in options for correctness.
   * @param {MongoClient~connectCallback} [callback] The command result callback
   * @return {Promise} returns Promise if no callback passed
   */
  this.connect = MongoClient.connect;
}

/**
 * @ignore
 */
inherits(MongoClient, EventEmitter);

var define = MongoClient.define = new Define('MongoClient', MongoClient, false);

/**
 * Connect to MongoDB using a url as documented at
 *
 *  docs.mongodb.org/manual/reference/connection-string/
 *
 * Note that for replicasets the replicaSet query parameter is required in the 2.0 driver
 *
 * @method
 * @static
 * @param {string} url The connection URI string
 * @param {object} [options] Optional settings.
 * @param {number} [options.poolSize=5] poolSize The maximum size of the individual server pool.
 * @param {boolean} [options.ssl=false] Enable SSL connection.
 * @param {Buffer} [options.sslCA=undefined] SSL Certificate store binary buffer
 * @param {Buffer} [options.sslCRL=undefined] SSL Certificate revocation list binary buffer
 * @param {Buffer} [options.sslCert=undefined] SSL Certificate binary buffer
 * @param {Buffer} [options.sslKey=undefined] SSL Key file binary buffer
 * @param {string} [options.sslPass=undefined] SSL Certificate pass phrase
 * @param {boolean|function} [options.checkServerIdentity=true] Ensure we check server identify during SSL, set to false to disable checking. Only works for Node 0.12.x or higher. You can pass in a boolean or your own checkServerIdentity override function.
 * @param {boolean} [options.autoReconnect=true] Enable autoReconnect for single server instances
 * @param {boolean} [options.noDelay=true] TCP Connection no delay
 * @param {number} [options.family=4] Version of IP stack. Defaults to 4.
 * @param {boolean} [options.keepAlive=30000] The number of milliseconds to wait before initiating keepAlive on the TCP socket.
 * @param {number} [options.connectTimeoutMS=30000] TCP Connection timeout setting
 * @param {number} [options.socketTimeoutMS=360000] TCP Socket timeout setting
 * @param {number} [options.reconnectTries=30] Server attempt to reconnect #times
 * @param {number} [options.reconnectInterval=1000] Server will wait # milliseconds between retries
 * @param {boolean} [options.ha=true] Control if high availability monitoring runs for Replicaset or Mongos proxies.
 * @param {number} [options.haInterval=10000] The High availability period for replicaset inquiry
 * @param {string} [options.replicaSet=undefined] The Replicaset set name
 * @param {number} [options.secondaryAcceptableLatencyMS=15] Cutoff latency point in MS for Replicaset member selection
 * @param {number} [options.acceptableLatencyMS=15] Cutoff latency point in MS for Mongos proxies selection.
 * @param {boolean} [options.connectWithNoPrimary=false] Sets if the driver should connect even if no primary is available
 * @param {string} [options.authSource=undefined] Define the database to authenticate against
 * @param {string} [options.auth.user=undefined] The username for auth
 * @param {string} [options.auth.password=undefined] The password for auth
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.forceServerObjectId=false] Force server to assign _id values instead of driver.
 * @param {boolean} [options.serializeFunctions=false] Serialize functions on any object.
 * @param {Boolean} [options.ignoreUndefined=false] Specify if the BSON serializer should ignore undefined fields.
 * @param {boolean} [options.raw=false] Return document results as raw BSON buffers.
 * @param {boolean} [options.promoteLongs=true] Promotes Long values to number if they fit inside the 53 bits resolution.
 * @param {boolean} [options.promoteBuffers=false] Promotes Binary BSON values to native Node Buffers.
 * @param {boolean} [options.promoteValues=true] Promotes BSON values to native types where possible, set to false to only receive wrapper types.
 * @param {number} [options.bufferMaxEntries=-1] Sets a cap on how many operations the driver will buffer up before giving up on getting a working connection, default is -1 which is unlimited.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {boolean} [options.domainsEnabled=false] Enable the wrapping of the callback in the current domain, disabled by default to avoid perf hit.
 * @param {object} [options.pkFactory=null] A primary key factory object for generation of custom _id keys.
 * @param {object} [options.promiseLibrary=null] A Promise library class the application wishes to use such as Bluebird, must be ES6 compatible
 * @param {object} [options.readConcern=null] Specify a read concern for the collection. (only MongoDB 3.2 or higher supported)
 * @param {string} [options.readConcern.level='local'] Specify a read concern level for the collection operations, one of [local|majority]. (only MongoDB 3.2 or higher supported)
 * @param {number} [options.maxStalenessSeconds=undefined] The max staleness to secondary reads (values under 10 seconds cannot be guaranteed);
 * @param {string} [options.appname=undefined] The name of the application that created this MongoClient instance. MongoDB 3.4 and newer will print this value in the server log upon establishing each connection. It is also recorded in the slow query log and profile collections.
 * @param {string} [options.loggerLevel=undefined] The logging level (error/warn/info/debug)
 * @param {object} [options.logger=undefined] Custom logger object
 * @param {object} [options.validateOptions=false] Validate MongoClient passed in options for correctness.
 * @param {MongoClient~connectCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
MongoClient.connect = function(url, options, callback) {
  var args = Array.prototype.slice.call(arguments, 1);
  callback = typeof args[args.length - 1] == 'function' ? args.pop() : null;
  options = args.length ? args.shift() : null;
  options = options || {};
  var self = this;

  // Validate options object
  var err = validOptions(options);

  // Get the promiseLibrary
  var promiseLibrary = options.promiseLibrary;

  // No promise library selected fall back
  if(!promiseLibrary) {
    promiseLibrary = typeof global.Promise == 'function' ?
      global.Promise : __webpack_require__(3).Promise;
  }

  // Return a promise
  if(typeof callback != 'function') {
    return new promiseLibrary(function(resolve, reject) {
      // Did we have a validation error
      if(err) return reject(err);
      // Attempt to connect
      connect(self, url, options, function(err, db) {
        if(err) return reject(err);
        resolve(db);
      });
    });
  }

  // Did we have a validation error
  if(err) return callback(err);
  // Fallback to callback based connect
  connect(self, url, options, callback);
}

define.staticMethod('connect', {callback: true, promise:true});

var mergeOptions = function(target, source, flatten) {
  for(var name in source) {
    if(source[name] && typeof source[name] == 'object' && flatten) {
      target = mergeOptions(target, source[name], flatten);
    } else {
      target[name] = source[name];
    }
  }

  return target;
}

var createUnifiedOptions = function(finalOptions, options) {
  var childOptions = ['mongos', 'server', 'db'
    , 'replset', 'db_options', 'server_options', 'rs_options', 'mongos_options'];
  var noMerge = ['readconcern'];

  for(var name in options) {
    if(noMerge.indexOf(name.toLowerCase()) != -1) {
      finalOptions[name] = options[name];
    } else if(childOptions.indexOf(name.toLowerCase()) != -1) {
      finalOptions = mergeOptions(finalOptions, options[name], false);
    } else {
      if(options[name] && typeof options[name] == 'object' && !Buffer.isBuffer(options[name]) && !Array.isArray(options[name])) {
        finalOptions = mergeOptions(finalOptions, options[name], true);
      } else {
        finalOptions[name] = options[name];
      }
    }
  }

  return finalOptions;
}

function translateOptions(options) {
  // If we have a readPreference passed in by the db options
  if(typeof options.readPreference == 'string' || typeof options.read_preference == 'string') {
    options.readPreference = new ReadPreference(options.readPreference || options.read_preference);
  }

  // Do we have readPreference tags, add them
  if(options.readPreference && (options.readPreferenceTags || options.read_preference_tags)) {
    options.readPreference.tags = options.readPreferenceTags || options.read_preference_tags;
  }

  // Do we have maxStalenessSeconds
  if(options.maxStalenessSeconds) {
    options.readPreference.maxStalenessSeconds = options.maxStalenessSeconds;
  }

  // Set the socket and connection timeouts
  if(options.socketTimeoutMS == null) options.socketTimeoutMS = 360000;
  if(options.connectTimeoutMS == null) options.connectTimeoutMS = 30000;

  // Create server instances
  return options.servers.map(function(serverObj) {
    return serverObj.domain_socket ?
      new Server(serverObj.domain_socket, 27017, options)
    : new Server(serverObj.host, serverObj.port, options);
  });
}

//
// Collect all events in order from SDAM
//
function collectEvents(self, db) {
  var collectedEvents = [];

  if(self instanceof MongoClient) {
    var events = ["timeout", "close", 'serverOpening', 'serverDescriptionChanged', 'serverHeartbeatStarted',
      'serverHeartbeatSucceeded', 'serverHeartbeatFailed', 'serverClosed', 'topologyOpening',
      'topologyClosed', 'topologyDescriptionChanged', 'joined', 'left', 'ping', 'ha', 'all', 'fullsetup'];
    events.forEach(function(event) {
      db.serverConfig.on(event, function(object1, object2) {
        collectedEvents.push({
          event: event, object1: object1, object2: object2
        });
      });
    });
  }

  return collectedEvents;
}

//
// Replay any events due to single server connection switching to Mongos
//
function replayEvents(self, events) {
  for(var i = 0; i < events.length; i++) {
    self.emit(events[i].event, events[i].object1, events[i].object2);
  }
}

function relayEvents(self, db) {
  if(self instanceof MongoClient) {
    var events = ["timeout", "close", 'serverOpening', 'serverDescriptionChanged', 'serverHeartbeatStarted',
      'serverHeartbeatSucceeded', 'serverHeartbeatFailed', 'serverClosed', 'topologyOpening',
      'topologyClosed', 'topologyDescriptionChanged', 'joined', 'left', 'ping', 'ha', 'all', 'fullsetup'];
    events.forEach(function(event) {
      db.serverConfig.on(event, function(object1, object2) {
        self.emit(event, object1, object2);
      });
    });
  }
}

function createReplicaset(self, options, callback) {
  // Set default options
  var servers = translateOptions(options);
  // Create Db instance
  var db = new Db(options.dbName, new ReplSet(servers, options), options);
  // Propegate the events to the client
  relayEvents(self, db);
  // Open the connection
  db.open(callback);
}

function createMongos(self, options, callback) {
  // Set default options
  var servers = translateOptions(options);
  // Create Db instance
  var db = new Db(options.dbName, new Mongos(servers, options), options)
  // Propegate the events to the client
  relayEvents(self, db);
  // Open the connection
  db.open(callback);
}

function createServer(self, options, callback) {
  // Set default options
  var servers = translateOptions(options);
  // Create db instance
  var db = new Db(options.dbName, servers[0], options);
  // Propegate the events to the client
  var collectedEvents = collectEvents(self, db);
  // Create Db instance
  db.open(function(err, db) {
    if(err) return callback(err);
    // Check if we are really speaking to a mongos
    var ismaster = db.serverConfig.lastIsMaster();

    // Do we actually have a mongos
    if(ismaster && ismaster.msg == 'isdbgrid') {
      // Destroy the current connection
      db.close();
      // Create mongos connection instead
      return createMongos(self, options, callback);
    }

    // Fire all the events
    replayEvents(self, collectedEvents);
    // Propegate the events to the client
    relayEvents(self, db);
    // Otherwise callback
    callback(err, db);
  });
}

function connectHandler(options, callback) {
  return function (err, db) {
    if(err) {
      return process.nextTick(function() {
        try {
          callback(err, null);
        } catch (err) {
          if(db) db.close();
          throw err
        }
      });
    }

    // No authentication just reconnect
    if(!options.auth) {
      return process.nextTick(function() {
        try {
          callback(err, db);
        } catch (err) {
          if(db) db.close();
          throw err
        }
      })
    }

    // What db to authenticate against
    var authentication_db = db;
    if(options.authSource) {
      authentication_db = db.db(options.authSource);
    }

    // Authenticate
    authenticate(authentication_db, options.user, options.password, options, function(err, success) {
      if(success){
        process.nextTick(function() {
          try {
            callback(null, db);
          } catch (err) {
            if(db) db.close();
            throw err
          }
        });
      } else {
        if(db) db.close();
        process.nextTick(function() {
          try {
            callback(err ? err : new Error('Could not authenticate user ' + options.auth[0]), null);
          } catch (err) {
            if(db) db.close();
            throw err
          }
        });
      }
    });
  }
}

/*
 * Connect using MongoClient
 */
var connect = function(self, url, options, callback) {
  options = options || {};
  options = shallowClone(options);

  // If callback is null throw an exception
  if(callback == null) {
    throw new Error("no callback function provided");
  }

  // Get a logger for MongoClient
  var logger = Logger('MongoClient', options);

  parse(url, options, function(err, object) {
    if (err) return callback(err);

    // Parse the string
    var _finalOptions = createUnifiedOptions({}, object);
    _finalOptions = mergeOptions(_finalOptions, object, false);
    _finalOptions = createUnifiedOptions(_finalOptions, options);

    // Check if we have connection and socket timeout set
    if(_finalOptions.socketTimeoutMS == null) _finalOptions.socketTimeoutMS = 360000;
    if(_finalOptions.connectTimeoutMS == null) _finalOptions.connectTimeoutMS = 30000;

    if (_finalOptions.db_options && _finalOptions.db_options.auth) {
      delete _finalOptions.db_options.auth;
    }

    // Failure modes
    if(object.servers.length == 0) {
      throw new Error("connection string must contain at least one seed host");
    }

    // Do we have a replicaset then skip discovery and go straight to connectivity
    if(_finalOptions.replicaSet || _finalOptions.rs_name) {
      return createReplicaset(self, _finalOptions, connectHandler(_finalOptions, connectCallback));
    } else if(object.servers.length > 1) {
      return createMongos(self, _finalOptions, connectHandler(_finalOptions, connectCallback));
    } else {
      return createServer(self, _finalOptions, connectHandler(_finalOptions, connectCallback));
    }
  });

  function connectCallback(err, db) {
    if(err && err.message == 'no mongos proxies found in seed list') {
      if(logger.isWarn()) {
        logger.warn(f('seed list contains no mongos proxies, replicaset connections requires the parameter replicaSet to be supplied in the URI or options object, mongodb://server:port/db?replicaSet=name'));
      }

      // Return a more specific error message for MongoClient.connect
      return callback(new MongoError('seed list contains no mongos proxies, replicaset connections requires the parameter replicaSet to be supplied in the URI or options object, mongodb://server:port/db?replicaSet=name'));
    }

    // Return the error and db instance
    callback(err, db);
  }
}

module.exports = MongoClient


/***/ }),
/* 56 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var EventEmitter = __webpack_require__(8).EventEmitter
  , inherits = __webpack_require__(2).inherits
  , f = __webpack_require__(2).format
  , ServerCapabilities = __webpack_require__(14).ServerCapabilities
  , MongoError = __webpack_require__(1).MongoError
  , CMongos = __webpack_require__(1).Mongos
  , Cursor = __webpack_require__(7)
  , AggregationCursor = __webpack_require__(12)
  , CommandCursor = __webpack_require__(11)
  , Define = __webpack_require__(4)
  , Server = __webpack_require__(24)
  , Store = __webpack_require__(14).Store
  , MAX_JS_INT = __webpack_require__(0).MAX_JS_INT
  , translateOptions = __webpack_require__(0).translateOptions
  , filterOptions = __webpack_require__(0).filterOptions
  , mergeOptions = __webpack_require__(0).mergeOptions
  , getReadPreference = __webpack_require__(0).getReadPreference
  , os = __webpack_require__(36);

// Get package.json variable
var driverVersion = __webpack_require__(37).version;
var nodejsversion = f('Node.js %s, %s', process.version, os.endianness());
var type = os.type();
var name = process.platform;
var architecture = process.arch;
var release = os.release();

/**
 * @fileOverview The **Mongos** class is a class that represents a Mongos Proxy topology and is
 * used to construct connections.
 *
 * **Mongos Should not be used, use MongoClient.connect**
 * @example
 * var Db = require('mongodb').Db,
 *   Mongos = require('mongodb').Mongos,
 *   Server = require('mongodb').Server,
 *   test = require('assert');
 * // Connect using Mongos
 * var server = new Server('localhost', 27017);
 * var db = new Db('test', new Mongos([server]));
 * db.open(function(err, db) {
 *   // Get an additional db
 *   db.close();
 * });
 */

 // Allowed parameters
 var legalOptionNames = ['ha', 'haInterval', 'acceptableLatencyMS'
   , 'poolSize', 'ssl', 'checkServerIdentity', 'sslValidate', 'ciphers', 'ecdhCurve'
   , 'sslCA', 'sslCRL', 'sslCert', 'sslKey', 'sslPass', 'socketOptions', 'bufferMaxEntries'
   , 'store', 'auto_reconnect', 'autoReconnect', 'emitError'
   , 'keepAlive', 'noDelay', 'connectTimeoutMS', 'socketTimeoutMS'
   , 'loggerLevel', 'logger', 'reconnectTries', 'appname', 'domainsEnabled'
   , 'servername', 'promoteLongs', 'promoteValues', 'promoteBuffers'];

/**
 * Creates a new Mongos instance
 * @class
 * @deprecated
 * @param {Server[]} servers A seedlist of servers participating in the replicaset.
 * @param {object} [options=null] Optional settings.
 * @param {booelan} [options.ha=true] Turn on high availability monitoring.
 * @param {number} [options.haInterval=5000] Time between each replicaset status check.
 * @param {number} [options.poolSize=5] Number of connections in the connection pool for each server instance, set to 5 as default for legacy reasons.
 * @param {number} [options.acceptableLatencyMS=15] Cutoff latency point in MS for MongoS proxy selection
 * @param {boolean} [options.ssl=false] Use ssl connection (needs to have a mongod server with ssl support)
 * @param {boolean|function} [options.checkServerIdentity=true] Ensure we check server identify during SSL, set to false to disable checking. Only works for Node 0.12.x or higher. You can pass in a boolean or your own checkServerIdentity override function.
 * @param {object} [options.sslValidate=true] Validate mongod server certificate against ca (needs to have a mongod server with ssl support, 2.4 or higher)
 * @param {array} [options.sslCA=null] Array of valid certificates either as Buffers or Strings (needs to have a mongod server with ssl support, 2.4 or higher)
 * @param {array} [options.sslCRL=null] Array of revocation certificates either as Buffers or Strings (needs to have a mongod server with ssl support, 2.4 or higher)
 * @param {(Buffer|string)} [options.sslCert=null] String or buffer containing the certificate we wish to present (needs to have a mongod server with ssl support, 2.4 or higher)
 * @param {(Buffer|string)} [options.sslKey=null] String or buffer containing the certificate private key we wish to present (needs to have a mongod server with ssl support, 2.4 or higher)
 * @param {(Buffer|string)} [options.sslPass=null] String or buffer containing the certificate password (needs to have a mongod server with ssl support, 2.4 or higher)
 * @param {string} [options.servername=null] String containing the server name requested via TLS SNI.
 * @param {object} [options.socketOptions=null] Socket options
 * @param {boolean} [options.socketOptions.noDelay=true] TCP Socket NoDelay option.
 * @param {number} [options.socketOptions.keepAlive=0] TCP KeepAlive on the socket with a X ms delay before start.
 * @param {number} [options.socketOptions.connectTimeoutMS=0] TCP Connection timeout setting
 * @param {number} [options.socketOptions.socketTimeoutMS=0] TCP Socket timeout setting
 * @param {boolean} [options.domainsEnabled=false] Enable the wrapping of the callback in the current domain, disabled by default to avoid perf hit.
 * @fires Mongos#connect
 * @fires Mongos#ha
 * @fires Mongos#joined
 * @fires Mongos#left
 * @fires Mongos#fullsetup
 * @fires Mongos#open
 * @fires Mongos#close
 * @fires Mongos#error
 * @fires Mongos#timeout
 * @fires Mongos#parseError
 * @property {string} parserType the parser type used (c++ or js).
 * @return {Mongos} a Mongos instance.
 */
var Mongos = function(servers, options) {
  if(!(this instanceof Mongos)) return new Mongos(servers, options);
  options = options || {};
  var self = this;

  // Filter the options
  options = filterOptions(options, legalOptionNames);

  // Ensure all the instances are Server
  for(var i = 0; i < servers.length; i++) {
    if(!(servers[i] instanceof Server)) {
      throw MongoError.create({message: "all seed list instances must be of the Server type", driver:true});
    }
  }

  // Stored options
  var storeOptions = {
      force: false
    , bufferMaxEntries: typeof options.bufferMaxEntries == 'number' ? options.bufferMaxEntries : MAX_JS_INT
  }

  // Shared global store
  var store = options.store || new Store(self, storeOptions);

  // Set up event emitter
  EventEmitter.call(this);

  // Build seed list
  var seedlist = servers.map(function(x) {
    return {host: x.host, port: x.port}
  });

  // Get the reconnect option
  var reconnect = typeof options.auto_reconnect == 'boolean' ? options.auto_reconnect : true;
  reconnect = typeof options.autoReconnect == 'boolean' ? options.autoReconnect : reconnect;

  // Clone options
  var clonedOptions = mergeOptions({}, {
    disconnectHandler: store,
    cursorFactory: Cursor,
    reconnect: reconnect,
    emitError: typeof options.emitError == 'boolean' ? options.emitError : true,
    size: typeof options.poolSize == 'number' ? options.poolSize : 5
  });

  // Translate any SSL options and other connectivity options
  clonedOptions = translateOptions(clonedOptions, options);

  // Socket options
  var socketOptions = options.socketOptions && Object.keys(options.socketOptions).length > 0
    ? options.socketOptions : options;

  // Translate all the options to the mongodb-core ones
  clonedOptions = translateOptions(clonedOptions, socketOptions);
  if(typeof clonedOptions.keepAlive == 'number') {
    clonedOptions.keepAliveInitialDelay = clonedOptions.keepAlive;
    clonedOptions.keepAlive = clonedOptions.keepAlive > 0;
  }

  // Build default client information
  this.clientInfo = {
    driver: {
      name: "nodejs",
      version: driverVersion
    },
    os: {
      type: type,
      name: name,
      architecture: architecture,
      version: release
    },
    platform: nodejsversion
  }

  // Build default client information
  clonedOptions.clientInfo = this.clientInfo;
  // Do we have an application specific string
  if(options.appname) {
    clonedOptions.clientInfo.application = { name: options.appname };
  }

  // Create the Mongos
  var mongos = new CMongos(seedlist, clonedOptions)
  // Server capabilities
  var sCapabilities = null;

  // Internal state
  this.s = {
    // Create the Mongos
      mongos: mongos
    // Server capabilities
    , sCapabilities: sCapabilities
    // Debug turned on
    , debug: clonedOptions.debug
    // Store option defaults
    , storeOptions: storeOptions
    // Cloned options
    , clonedOptions: clonedOptions
    // Actual store of callbacks
    , store: store
    // Options
    , options: options
  }
}

var define = Mongos.define = new Define('Mongos', Mongos, false);

/**
 * @ignore
 */
inherits(Mongos, EventEmitter);

// Last ismaster
Object.defineProperty(Mongos.prototype, 'isMasterDoc', {
  enumerable:true, get: function() { return this.s.mongos.lastIsMaster(); }
});

Object.defineProperty(Mongos.prototype, 'parserType', {
  enumerable:true, get: function() {
    return this.s.mongos.parserType;
  }
});

// BSON property
Object.defineProperty(Mongos.prototype, 'bson', {
  enumerable: true, get: function() {
    return this.s.mongos.s.bson;
  }
});

Object.defineProperty(Mongos.prototype, 'haInterval', {
  enumerable:true, get: function() { return this.s.mongos.s.haInterval; }
});

// Connect
Mongos.prototype.connect = function(db, _options, callback) {
  var self = this;
  if('function' === typeof _options) callback = _options, _options = {};
  if(_options == null) _options = {};
  if(!('function' === typeof callback)) callback = null;
  self.s.options = _options;

  // Update bufferMaxEntries
  self.s.storeOptions.bufferMaxEntries = db.bufferMaxEntries;

  // Error handler
  var connectErrorHandler = function() {
    return function(err) {
      // Remove all event handlers
      var events = ['timeout', 'error', 'close'];
      events.forEach(function(e) {
        self.removeListener(e, connectErrorHandler);
      });

      self.s.mongos.removeListener('connect', connectErrorHandler);

      // Try to callback
      try {
        callback(err);
      } catch(err) {
        process.nextTick(function() { throw err; })
      }
    }
  }

  // Actual handler
  var errorHandler = function(event) {
    return function(err) {
      if(event != 'error') {
        self.emit(event, err);
      }
    }
  }

  // Error handler
  var reconnectHandler = function() {
    self.emit('reconnect');
    self.s.store.execute();
  }

  // relay the event
  var relay = function(event) {
    return function(t, server) {
      self.emit(event, t, server);
    }
  }

  // Connect handler
  var connectHandler = function() {
    // Clear out all the current handlers left over
    var events = ["timeout", "error", "close", 'fullsetup'];
    events.forEach(function(e) {
      self.s.mongos.removeAllListeners(e);
    });

    // Set up listeners
    self.s.mongos.once('timeout', errorHandler('timeout'));
    self.s.mongos.once('error', errorHandler('error'));
    self.s.mongos.once('close', errorHandler('close'));

    // Set up serverConfig listeners
    self.s.mongos.on('fullsetup', function() { self.emit('fullsetup', self); });

    // Emit open event
    self.emit('open', null, self);

    // Return correctly
    try {
      callback(null, self);
    } catch(err) {
      process.nextTick(function() { throw err; })
    }
  }

  // Clear out all the current handlers left over
  var events = ["timeout", "error", "close", 'serverOpening', 'serverDescriptionChanged', 'serverHeartbeatStarted',
    'serverHeartbeatSucceeded', 'serverHeartbeatFailed', 'serverClosed', 'topologyOpening',
    'topologyClosed', 'topologyDescriptionChanged'];
  events.forEach(function(e) {
    self.s.mongos.removeAllListeners(e);
  });

  // Set up SDAM listeners
  self.s.mongos.on('serverDescriptionChanged', relay('serverDescriptionChanged'));
  self.s.mongos.on('serverHeartbeatStarted', relay('serverHeartbeatStarted'));
  self.s.mongos.on('serverHeartbeatSucceeded', relay('serverHeartbeatSucceeded'));
  self.s.mongos.on('serverHeartbeatFailed', relay('serverHeartbeatFailed'));
  self.s.mongos.on('serverOpening', relay('serverOpening'));
  self.s.mongos.on('serverClosed', relay('serverClosed'));
  self.s.mongos.on('topologyOpening', relay('topologyOpening'));
  self.s.mongos.on('topologyClosed', relay('topologyClosed'));
  self.s.mongos.on('topologyDescriptionChanged', relay('topologyDescriptionChanged'));

  // Set up listeners
  self.s.mongos.once('timeout', connectErrorHandler('timeout'));
  self.s.mongos.once('error', connectErrorHandler('error'));
  self.s.mongos.once('close', connectErrorHandler('close'));
  self.s.mongos.once('connect', connectHandler);
  // Join and leave events
  self.s.mongos.on('joined', relay('joined'));
  self.s.mongos.on('left', relay('left'));

  // Reconnect server
  self.s.mongos.on('reconnect', reconnectHandler);

  // Start connection
  self.s.mongos.connect(_options);
}

// Server capabilities
Mongos.prototype.capabilities = function() {
  if(this.s.sCapabilities) return this.s.sCapabilities;
  if(this.s.mongos.lastIsMaster() == null) return null;
  this.s.sCapabilities = new ServerCapabilities(this.s.mongos.lastIsMaster());
  return this.s.sCapabilities;
}

define.classMethod('capabilities', {callback: false, promise:false, returns: [ServerCapabilities]});

// Command
Mongos.prototype.command = function(ns, cmd, options, callback) {
  this.s.mongos.command(ns, cmd, getReadPreference(options), callback);
}

define.classMethod('command', {callback: true, promise:false});

// Insert
Mongos.prototype.insert = function(ns, ops, options, callback) {
  this.s.mongos.insert(ns, ops, options, function(e, m) {
    callback(e, m)
  });
}

define.classMethod('insert', {callback: true, promise:false});

// Update
Mongos.prototype.update = function(ns, ops, options, callback) {
  this.s.mongos.update(ns, ops, options, callback);
}

define.classMethod('update', {callback: true, promise:false});

// Remove
Mongos.prototype.remove = function(ns, ops, options, callback) {
  this.s.mongos.remove(ns, ops, options, callback);
}

define.classMethod('remove', {callback: true, promise:false});

// Destroyed
Mongos.prototype.isDestroyed = function() {
  return this.s.mongos.isDestroyed();
}

// IsConnected
Mongos.prototype.isConnected = function() {
  return this.s.mongos.isConnected();
}

define.classMethod('isConnected', {callback: false, promise:false, returns: [Boolean]});

// Insert
Mongos.prototype.cursor = function(ns, cmd, options) {
  options.disconnectHandler = this.s.store;
  return this.s.mongos.cursor(ns, cmd, options);
}

define.classMethod('cursor', {callback: false, promise:false, returns: [Cursor, AggregationCursor, CommandCursor]});

Mongos.prototype.lastIsMaster = function() {
  return this.s.mongos.lastIsMaster();
}

/**
 * Unref all sockets
 * @method
 */
Mongos.prototype.unref = function () {
  return this.s.mongos.unref();
}

Mongos.prototype.close = function(forceClosed) {
  this.s.mongos.destroy({
    force: typeof forceClosed == 'boolean' ? forceClosed : false,
  });
  // We need to wash out all stored processes
  if(forceClosed == true) {
    this.s.storeOptions.force = forceClosed;
    this.s.store.flush();
  }
}

define.classMethod('close', {callback: false, promise:false});

Mongos.prototype.auth = function() {
  var args = Array.prototype.slice.call(arguments, 0);
  this.s.mongos.auth.apply(this.s.mongos, args);
}

define.classMethod('auth', {callback: true, promise:false});

Mongos.prototype.logout = function() {
  var args = Array.prototype.slice.call(arguments, 0);
  this.s.mongos.logout.apply(this.s.mongos, args);
}

define.classMethod('logout', {callback: true, promise:false});

/**
 * All raw connections
 * @method
 * @return {array}
 */
Mongos.prototype.connections = function() {
  return this.s.mongos.connections();
}

define.classMethod('connections', {callback: false, promise:false, returns:[Array]});

/**
 * A mongos connect event, used to verify that the connection is up and running
 *
 * @event Mongos#connect
 * @type {Mongos}
 */

/**
 * The mongos high availability event
 *
 * @event Mongos#ha
 * @type {function}
 * @param {string} type The stage in the high availability event (start|end)
 * @param {boolean} data.norepeat This is a repeating high availability process or a single execution only
 * @param {number} data.id The id for this high availability request
 * @param {object} data.state An object containing the information about the current replicaset
 */

/**
 * A server member left the mongos set
 *
 * @event Mongos#left
 * @type {function}
 * @param {string} type The type of member that left (primary|secondary|arbiter)
 * @param {Server} server The server object that left
 */

/**
 * A server member joined the mongos set
 *
 * @event Mongos#joined
 * @type {function}
 * @param {string} type The type of member that joined (primary|secondary|arbiter)
 * @param {Server} server The server object that joined
 */

/**
 * Mongos fullsetup event, emitted when all proxies in the topology have been connected to.
 *
 * @event Mongos#fullsetup
 * @type {Mongos}
 */

/**
 * Mongos open event, emitted when mongos can start processing commands.
 *
 * @event Mongos#open
 * @type {Mongos}
 */

/**
 * Mongos close event
 *
 * @event Mongos#close
 * @type {object}
 */

/**
 * Mongos error event, emitted if there is an error listener.
 *
 * @event Mongos#error
 * @type {MongoError}
 */

/**
 * Mongos timeout event
 *
 * @event Mongos#timeout
 * @type {object}
 */

/**
 * Mongos parseError event
 *
 * @event Mongos#parseError
 * @type {object}
 */

module.exports = Mongos;


/***/ }),
/* 57 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var EventEmitter = __webpack_require__(8).EventEmitter
  , inherits = __webpack_require__(2).inherits
  , f = __webpack_require__(2).format
  , Server = __webpack_require__(24)
  , Cursor = __webpack_require__(7)
  , AggregationCursor = __webpack_require__(12)
  , CommandCursor = __webpack_require__(11)
  , ReadPreference = __webpack_require__(5)
  , MongoError = __webpack_require__(1).MongoError
  , ServerCapabilities = __webpack_require__(14).ServerCapabilities
  , Store = __webpack_require__(14).Store
  , Define = __webpack_require__(4)
  , CReplSet = __webpack_require__(1).ReplSet
  , CoreReadPreference = __webpack_require__(1).ReadPreference
  , MAX_JS_INT = __webpack_require__(0).MAX_JS_INT
  , translateOptions = __webpack_require__(0).translateOptions
  , filterOptions = __webpack_require__(0).filterOptions
  , getReadPreference = __webpack_require__(0).getReadPreference
  , mergeOptions = __webpack_require__(0).mergeOptions
  , os = __webpack_require__(36);
/**
 * @fileOverview The **ReplSet** class is a class that represents a Replicaset topology and is
 * used to construct connections.
 *
 * **ReplSet Should not be used, use MongoClient.connect**
 * @example
 * var Db = require('mongodb').Db,
 *   ReplSet = require('mongodb').ReplSet,
 *   Server = require('mongodb').Server,
 *   test = require('assert');
 * // Connect using ReplSet
 * var server = new Server('localhost', 27017);
 * var db = new Db('test', new ReplSet([server]));
 * db.open(function(err, db) {
 *   // Get an additional db
 *   db.close();
 * });
 */

// Allowed parameters
var legalOptionNames = ['ha', 'haInterval', 'replicaSet', 'rs_name', 'secondaryAcceptableLatencyMS'
  , 'connectWithNoPrimary', 'poolSize', 'ssl', 'checkServerIdentity', 'sslValidate'
  , 'sslCA', 'sslCert', 'sslCRL', 'sslKey', 'sslPass', 'socketOptions', 'bufferMaxEntries'
  , 'store', 'auto_reconnect', 'autoReconnect', 'emitError'
  , 'keepAlive', 'noDelay', 'connectTimeoutMS', 'socketTimeoutMS', 'strategy', 'debug', 'family'
  , 'loggerLevel', 'logger', 'reconnectTries', 'appname', 'domainsEnabled'
  , 'servername', 'promoteLongs', 'promoteValues', 'promoteBuffers', 'maxStalenessSeconds'];

// Get package.json variable
var driverVersion = __webpack_require__(37).version;
var nodejsversion = f('Node.js %s, %s', process.version, os.endianness());
var type = os.type();
var name = process.platform;
var architecture = process.arch;
var release = os.release();

/**
 * Creates a new ReplSet instance
 * @class
 * @deprecated
 * @param {Server[]} servers A seedlist of servers participating in the replicaset.
 * @param {object} [options=null] Optional settings.
 * @param {boolean} [options.ha=true] Turn on high availability monitoring.
 * @param {number} [options.haInterval=10000] Time between each replicaset status check.
 * @param {string} [options.replicaSet] The name of the replicaset to connect to.
 * @param {number} [options.secondaryAcceptableLatencyMS=15] Sets the range of servers to pick when using NEAREST (lowest ping ms + the latency fence, ex: range of 1 to (1 + 15) ms)
 * @param {boolean} [options.connectWithNoPrimary=false] Sets if the driver should connect even if no primary is available
 * @param {number} [options.poolSize=5] Number of connections in the connection pool for each server instance, set to 5 as default for legacy reasons.
 * @param {boolean} [options.ssl=false] Use ssl connection (needs to have a mongod server with ssl support)
 * @param {boolean|function} [options.checkServerIdentity=true] Ensure we check server identify during SSL, set to false to disable checking. Only works for Node 0.12.x or higher. You can pass in a boolean or your own checkServerIdentity override function.
 * @param {object} [options.sslValidate=true] Validate mongod server certificate against ca (needs to have a mongod server with ssl support, 2.4 or higher)
 * @param {array} [options.sslCA=null] Array of valid certificates either as Buffers or Strings (needs to have a mongod server with ssl support, 2.4 or higher)
 * @param {array} [options.sslCRL=null] Array of revocation certificates either as Buffers or Strings (needs to have a mongod server with ssl support, 2.4 or higher)
 * @param {(Buffer|string)} [options.sslCert=null] String or buffer containing the certificate we wish to present (needs to have a mongod server with ssl support, 2.4 or higher)
 * @param {(Buffer|string)} [options.sslKey=null] String or buffer containing the certificate private key we wish to present (needs to have a mongod server with ssl support, 2.4 or higher)
 * @param {(Buffer|string)} [options.sslPass=null] String or buffer containing the certificate password (needs to have a mongod server with ssl support, 2.4 or higher)
 * @param {string} [options.servername=null] String containing the server name requested via TLS SNI.
 * @param {object} [options.socketOptions=null] Socket options
 * @param {boolean} [options.socketOptions.noDelay=true] TCP Socket NoDelay option.
 * @param {number} [options.socketOptions.keepAlive=0] TCP KeepAlive on the socket with a X ms delay before start.
 * @param {number} [options.socketOptions.connectTimeoutMS=10000] TCP Connection timeout setting
 * @param {number} [options.socketOptions.socketTimeoutMS=0] TCP Socket timeout setting
 * @param {boolean} [options.domainsEnabled=false] Enable the wrapping of the callback in the current domain, disabled by default to avoid perf hit.
 * @param {number} [options.maxStalenessSeconds=undefined] The max staleness to secondary reads (values under 10 seconds cannot be guaranteed);
 * @fires ReplSet#connect
 * @fires ReplSet#ha
 * @fires ReplSet#joined
 * @fires ReplSet#left
 * @fires ReplSet#fullsetup
 * @fires ReplSet#open
 * @fires ReplSet#close
 * @fires ReplSet#error
 * @fires ReplSet#timeout
 * @fires ReplSet#parseError
 * @property {string} parserType the parser type used (c++ or js).
 * @return {ReplSet} a ReplSet instance.
 */
var ReplSet = function(servers, options) {
  if(!(this instanceof ReplSet)) return new ReplSet(servers, options);
  options = options || {};
  var self = this;
  // Set up event emitter
  EventEmitter.call(this);

  // Filter the options
  options = filterOptions(options, legalOptionNames);

  // Ensure all the instances are Server
  for(var i = 0; i < servers.length; i++) {
    if(!(servers[i] instanceof Server)) {
      throw MongoError.create({message: "all seed list instances must be of the Server type", driver:true});
    }
  }

  // Stored options
  var storeOptions = {
      force: false
    , bufferMaxEntries: typeof options.bufferMaxEntries == 'number' ? options.bufferMaxEntries : MAX_JS_INT
  }

  // Shared global store
  var store = options.store || new Store(self, storeOptions);

  // Build seed list
  var seedlist = servers.map(function(x) {
    return {host: x.host, port: x.port}
  });

  // Clone options
  var clonedOptions = mergeOptions({}, {
    disconnectHandler: store,
    cursorFactory: Cursor,
    reconnect: false,
    emitError: typeof options.emitError == 'boolean' ? options.emitError : true,
    size: typeof options.poolSize == 'number' ? options.poolSize : 5
  });

  // Translate any SSL options and other connectivity options
  clonedOptions = translateOptions(clonedOptions, options);

  // Socket options
  var socketOptions = options.socketOptions && Object.keys(options.socketOptions).length > 0
    ? options.socketOptions : options;

  // Translate all the options to the mongodb-core ones
  clonedOptions = translateOptions(clonedOptions, socketOptions);
  if(typeof clonedOptions.keepAlive == 'number') {
    clonedOptions.keepAliveInitialDelay = clonedOptions.keepAlive;
    clonedOptions.keepAlive = clonedOptions.keepAlive > 0;
  }

  // Client info
  this.clientInfo = {
    driver: {
      name: "nodejs",
      version: driverVersion
    },
    os: {
      type: type,
      name: name,
      architecture: architecture,
      version: release
    },
    platform: nodejsversion
  }

  // Build default client information
  clonedOptions.clientInfo = this.clientInfo;
  // Do we have an application specific string
  if(options.appname) {
    clonedOptions.clientInfo.application = { name: options.appname };
  }

  // Create the ReplSet
  var replset = new CReplSet(seedlist, clonedOptions);

  // Listen to reconnect event
  replset.on('reconnect', function() {
    self.emit('reconnect');
    store.execute();
  });

  // Internal state
  this.s = {
    // Replicaset
    replset: replset
    // Server capabilities
    , sCapabilities: null
    // Debug tag
    , tag: options.tag
    // Store options
    , storeOptions: storeOptions
    // Cloned options
    , clonedOptions: clonedOptions
    // Store
    , store: store
    // Options
    , options: options
  }

  // Debug
  if(clonedOptions.debug) {
    // Last ismaster
    Object.defineProperty(this, 'replset', {
      enumerable:true, get: function() { return replset; }
    });
  }
}

/**
 * @ignore
 */
inherits(ReplSet, EventEmitter);

// Last ismaster
Object.defineProperty(ReplSet.prototype, 'isMasterDoc', {
  enumerable:true, get: function() { return this.s.replset.lastIsMaster(); }
});

Object.defineProperty(ReplSet.prototype, 'parserType', {
  enumerable:true, get: function() {
    return this.s.replset.parserType;
  }
});

// BSON property
Object.defineProperty(ReplSet.prototype, 'bson', {
  enumerable: true, get: function() {
    return this.s.replset.s.bson;
  }
});

Object.defineProperty(ReplSet.prototype, 'haInterval', {
  enumerable:true, get: function() { return this.s.replset.s.haInterval; }
});

var define = ReplSet.define = new Define('ReplSet', ReplSet, false);

// Ensure the right read Preference object
var translateReadPreference = function(options) {
  if(typeof options.readPreference == 'string') {
    options.readPreference = new CoreReadPreference(options.readPreference);
  } else if(options.readPreference instanceof ReadPreference) {
    options.readPreference = new CoreReadPreference(options.readPreference.mode
      , options.readPreference.tags, {maxStalenessSeconds: options.readPreference.maxStalenessSeconds});
  }

  return options;
}

// Connect method
ReplSet.prototype.connect = function(db, _options, callback) {
  var self = this;
  if('function' === typeof _options) callback = _options, _options = {};
  if(_options == null) _options = {};
  if(!('function' === typeof callback)) callback = null;
  self.s.options = _options;

  // Update bufferMaxEntries
  self.s.storeOptions.bufferMaxEntries = db.bufferMaxEntries;

  // Actual handler
  var errorHandler = function(event) {
    return function(err) {
      if(event != 'error') {
        self.emit(event, err);
      }
    }
  }

  // Clear out all the current handlers left over
  var events = ["timeout", "error", "close", 'serverOpening', 'serverDescriptionChanged', 'serverHeartbeatStarted',
    'serverHeartbeatSucceeded', 'serverHeartbeatFailed', 'serverClosed', 'topologyOpening',
    'topologyClosed', 'topologyDescriptionChanged', 'joined', 'left', 'ping', 'ha'];
  events.forEach(function(e) {
    self.s.replset.removeAllListeners(e);
  });

  // relay the event
  var relay = function(event) {
    return function(t, server) {
      self.emit(event, t, server);
    }
  }

  // Replset events relay
  var replsetRelay = function(event) {
    return function(t, server) {
      self.emit(event, t, server.lastIsMaster(), server);
    }
  }

  // Relay ha
  var relayHa = function(t, state) {
    self.emit('ha', t, state);

    if(t == 'start') {
      self.emit('ha_connect', t, state);
    } else if(t == 'end') {
      self.emit('ha_ismaster', t, state);
    }
  }

  // Set up serverConfig listeners
  self.s.replset.on('joined', replsetRelay('joined'));
  self.s.replset.on('left', relay('left'));
  self.s.replset.on('ping', relay('ping'));
  self.s.replset.on('ha', relayHa);

  // Set up SDAM listeners
  self.s.replset.on('serverDescriptionChanged', relay('serverDescriptionChanged'));
  self.s.replset.on('serverHeartbeatStarted', relay('serverHeartbeatStarted'));
  self.s.replset.on('serverHeartbeatSucceeded', relay('serverHeartbeatSucceeded'));
  self.s.replset.on('serverHeartbeatFailed', relay('serverHeartbeatFailed'));
  self.s.replset.on('serverOpening', relay('serverOpening'));
  self.s.replset.on('serverClosed', relay('serverClosed'));
  self.s.replset.on('topologyOpening', relay('topologyOpening'));
  self.s.replset.on('topologyClosed', relay('topologyClosed'));
  self.s.replset.on('topologyDescriptionChanged', relay('topologyDescriptionChanged'));

  self.s.replset.on('fullsetup', function() {
    self.emit('fullsetup', self, self);
  });

  self.s.replset.on('all', function() {
    self.emit('all', null, self);
  });

  // Connect handler
  var connectHandler = function() {
    // Set up listeners
    self.s.replset.once('timeout', errorHandler('timeout'));
    self.s.replset.once('error', errorHandler('error'));
    self.s.replset.once('close', errorHandler('close'));

    // Emit open event
    self.emit('open', null, self);

    // Return correctly
    try {
      callback(null, self);
    } catch(err) {
      process.nextTick(function() { throw err; })
    }
  }

  // Error handler
  var connectErrorHandler = function() {
    return function(err) {
      ['timeout', 'error', 'close'].forEach(function(e) {
        self.s.replset.removeListener(e, connectErrorHandler);
      });

      self.s.replset.removeListener('connect', connectErrorHandler);
      // Destroy the replset
      self.s.replset.destroy();

      // Try to callback
      try {
        callback(err);
      } catch(err) {
        if(!self.s.replset.isConnected())
          process.nextTick(function() { throw err; })
      }
    }
  }

  // Set up listeners
  self.s.replset.once('timeout', connectErrorHandler('timeout'));
  self.s.replset.once('error', connectErrorHandler('error'));
  self.s.replset.once('close', connectErrorHandler('close'));
  self.s.replset.once('connect', connectHandler);

  // Start connection
  self.s.replset.connect(_options);
}

// Server capabilities
ReplSet.prototype.capabilities = function() {
  if(this.s.sCapabilities) return this.s.sCapabilities;
  if(this.s.replset.lastIsMaster() == null) return null;
  this.s.sCapabilities = new ServerCapabilities(this.s.replset.lastIsMaster());
  return this.s.sCapabilities;
}

define.classMethod('capabilities', {callback: false, promise:false, returns: [ServerCapabilities]});

// Command
ReplSet.prototype.command = function(ns, cmd, options, callback) {
  this.s.replset.command(ns, cmd, getReadPreference(options), callback);
}

define.classMethod('command', {callback: true, promise:false});

// Insert
ReplSet.prototype.insert = function(ns, ops, options, callback) {
  this.s.replset.insert(ns, ops, options, callback);
}

define.classMethod('insert', {callback: true, promise:false});

// Update
ReplSet.prototype.update = function(ns, ops, options, callback) {
  this.s.replset.update(ns, ops, options, callback);
}

define.classMethod('update', {callback: true, promise:false});

// Remove
ReplSet.prototype.remove = function(ns, ops, options, callback) {
  this.s.replset.remove(ns, ops, options, callback);
}

define.classMethod('remove', {callback: true, promise:false});

// Destroyed
ReplSet.prototype.isDestroyed = function() {
  return this.s.replset.isDestroyed();
}

// IsConnected
ReplSet.prototype.isConnected = function(options) {
  options = options || {};

  // If we passed in a readPreference, translate to
  // a CoreReadPreference instance
  if(options.readPreference) {
    options.readPreference = translateReadPreference(options.readPreference);
  }

  return this.s.replset.isConnected(options);
}

define.classMethod('isConnected', {callback: false, promise:false, returns: [Boolean]});

// Insert
ReplSet.prototype.cursor = function(ns, cmd, options) {
  options = translateReadPreference(options);
  options.disconnectHandler = this.s.store;
  return this.s.replset.cursor(ns, cmd, options);
}

define.classMethod('cursor', {callback: false, promise:false, returns: [Cursor, AggregationCursor, CommandCursor]});

ReplSet.prototype.lastIsMaster = function() {
  return this.s.replset.lastIsMaster();
}

/**
 * Unref all sockets
 * @method
 */
ReplSet.prototype.unref = function() {
  return this.s.replset.unref();
}

ReplSet.prototype.close = function(forceClosed) {
  var self = this;
  // Call destroy on the topology
  this.s.replset.destroy({
    force: typeof forceClosed == 'boolean' ? forceClosed : false,
  });
  // We need to wash out all stored processes
  if(forceClosed == true) {
    this.s.storeOptions.force = forceClosed;
    this.s.store.flush();
  }

  var events = ['timeout', 'error', 'close', 'joined', 'left'];
  events.forEach(function(e) {
    self.removeAllListeners(e);
  });
}

define.classMethod('close', {callback: false, promise:false});

ReplSet.prototype.auth = function() {
  var args = Array.prototype.slice.call(arguments, 0);
  this.s.replset.auth.apply(this.s.replset, args);
}

define.classMethod('auth', {callback: true, promise:false});

ReplSet.prototype.logout = function() {
  var args = Array.prototype.slice.call(arguments, 0);
  this.s.replset.logout.apply(this.s.replset, args);
}

define.classMethod('logout', {callback: true, promise:false});

/**
 * All raw connections
 * @method
 * @return {array}
 */
ReplSet.prototype.connections = function() {
  return this.s.replset.connections();
}

define.classMethod('connections', {callback: false, promise:false, returns:[Array]});

/**
 * A replset connect event, used to verify that the connection is up and running
 *
 * @event ReplSet#connect
 * @type {ReplSet}
 */

/**
 * The replset high availability event
 *
 * @event ReplSet#ha
 * @type {function}
 * @param {string} type The stage in the high availability event (start|end)
 * @param {boolean} data.norepeat This is a repeating high availability process or a single execution only
 * @param {number} data.id The id for this high availability request
 * @param {object} data.state An object containing the information about the current replicaset
 */

/**
 * A server member left the replicaset
 *
 * @event ReplSet#left
 * @type {function}
 * @param {string} type The type of member that left (primary|secondary|arbiter)
 * @param {Server} server The server object that left
 */

/**
 * A server member joined the replicaset
 *
 * @event ReplSet#joined
 * @type {function}
 * @param {string} type The type of member that joined (primary|secondary|arbiter)
 * @param {Server} server The server object that joined
 */

/**
 * ReplSet open event, emitted when replicaset can start processing commands.
 *
 * @event ReplSet#open
 * @type {Replset}
 */

/**
 * ReplSet fullsetup event, emitted when all servers in the topology have been connected to.
 *
 * @event ReplSet#fullsetup
 * @type {Replset}
 */

/**
 * ReplSet close event
 *
 * @event ReplSet#close
 * @type {object}
 */

/**
 * ReplSet error event, emitted if there is an error listener.
 *
 * @event ReplSet#error
 * @type {MongoError}
 */

/**
 * ReplSet timeout event
 *
 * @event ReplSet#timeout
 * @type {object}
 */

/**
 * ReplSet parseError event
 *
 * @event ReplSet#parseError
 * @type {object}
 */

module.exports = ReplSet;


/***/ }),
/* 58 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var express = __webpack_require__(59);
var path = __webpack_require__(21);
var notes = __webpack_require__(89);
var myNotes = __webpack_require__(98);
var bodyparser = __webpack_require__(38);
var mongodb = __webpack_require__(31);
var MongoClient = mongodb.MongoClient;

var app = express();
var database = "mongodb://localhost:3000/";
app.use(bodyparser.urlencoded({ extended: true }));

function quickNotesApp(port) {
    // eslint-disable-next-line no-console
    console.log("listening on port " + port);
    app.use(express.static('public'));

    notes(app, database);
    myNotes(app, database);

    app.listen(port);
}

quickNotesApp(3000);

/***/ }),
/* 59 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */



module.exports = __webpack_require__(60);


/***/ }),
/* 60 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module dependencies.
 */

var bodyParser = __webpack_require__(38)
var EventEmitter = __webpack_require__(8).EventEmitter;
var mixin = __webpack_require__(68);
var proto = __webpack_require__(69);
var Route = __webpack_require__(42);
var Router = __webpack_require__(41);
var req = __webpack_require__(76);
var res = __webpack_require__(81);

/**
 * Expose `createApplication()`.
 */

exports = module.exports = createApplication;

/**
 * Create an express application.
 *
 * @return {Function}
 * @api public
 */

function createApplication() {
  var app = function(req, res, next) {
    app.handle(req, res, next);
  };

  mixin(app, EventEmitter.prototype, false);
  mixin(app, proto, false);

  // expose the prototype that will get set on requests
  app.request = Object.create(req, {
    app: { configurable: true, enumerable: true, writable: true, value: app }
  })

  // expose the prototype that will get set on responses
  app.response = Object.create(res, {
    app: { configurable: true, enumerable: true, writable: true, value: app }
  })

  app.init();
  return app;
}

/**
 * Expose the prototypes.
 */

exports.application = proto;
exports.request = req;
exports.response = res;

/**
 * Expose constructors.
 */

exports.Route = Route;
exports.Router = Router;

/**
 * Expose middleware
 */

exports.json = bodyParser.json
exports.query = __webpack_require__(44);
exports.static = __webpack_require__(88);
exports.urlencoded = bodyParser.urlencoded

/**
 * Replace removed middleware with an appropriate error message.
 */

;[
  'bodyParser',
  'compress',
  'cookieSession',
  'session',
  'logger',
  'cookieParser',
  'favicon',
  'responseTime',
  'errorHandler',
  'timeout',
  'methodOverride',
  'vhost',
  'csrf',
  'directory',
  'limit',
  'multipart',
  'staticCache',
].forEach(function (name) {
  Object.defineProperty(exports, name, {
    get: function () {
      throw new Error('Most middleware (like ' + name + ') is no longer bundled with Express and must be installed separately. Please see https://github.com/senchalabs/connect#middleware.');
    },
    configurable: true
  });
});


/***/ }),
/* 61 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * body-parser
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module dependencies.
 * @private
 */

var bytes = __webpack_require__(16)
var contentType = __webpack_require__(17)
var createError = __webpack_require__(25)
var debug = __webpack_require__(6)('body-parser:json')
var read = __webpack_require__(18)
var typeis = __webpack_require__(15)

/**
 * Module exports.
 */

module.exports = json

/**
 * RegExp to match the first non-space in a string.
 *
 * Allowed whitespace is defined in RFC 7159:
 *
 *    ws = *(
 *            %x20 /              ; Space
 *            %x09 /              ; Horizontal tab
 *            %x0A /              ; Line feed or New line
 *            %x0D )              ; Carriage return
 */

var FIRST_CHAR_REGEXP = /^[\x20\x09\x0a\x0d]*(.)/ // eslint-disable-line no-control-regex

/**
 * Create a middleware to parse JSON bodies.
 *
 * @param {object} [options]
 * @return {function}
 * @public
 */

function json (options) {
  var opts = options || {}

  var limit = typeof opts.limit !== 'number'
    ? bytes.parse(opts.limit || '100kb')
    : opts.limit
  var inflate = opts.inflate !== false
  var reviver = opts.reviver
  var strict = opts.strict !== false
  var type = opts.type || 'application/json'
  var verify = opts.verify || false

  if (verify !== false && typeof verify !== 'function') {
    throw new TypeError('option verify must be function')
  }

  // create the appropriate type checking function
  var shouldParse = typeof type !== 'function'
    ? typeChecker(type)
    : type

  function parse (body) {
    if (body.length === 0) {
      // special-case empty json body, as it's a common client-side mistake
      // TODO: maybe make this configurable or part of "strict" option
      return {}
    }

    if (strict) {
      var first = firstchar(body)

      if (first !== '{' && first !== '[') {
        debug('strict violation')
        throw createStrictSyntaxError(body, first)
      }
    }

    try {
      debug('parse json')
      return JSON.parse(body, reviver)
    } catch (e) {
      throw normalizeJsonSyntaxError(e, {
        stack: e.stack
      })
    }
  }

  return function jsonParser (req, res, next) {
    if (req._body) {
      debug('body already parsed')
      next()
      return
    }

    req.body = req.body || {}

    // skip requests without bodies
    if (!typeis.hasBody(req)) {
      debug('skip empty body')
      next()
      return
    }

    debug('content-type %j', req.headers['content-type'])

    // determine if request should be parsed
    if (!shouldParse(req)) {
      debug('skip parsing')
      next()
      return
    }

    // assert charset per RFC 7159 sec 8.1
    var charset = getCharset(req) || 'utf-8'
    if (charset.substr(0, 4) !== 'utf-') {
      debug('invalid charset')
      next(createError(415, 'unsupported charset "' + charset.toUpperCase() + '"', {
        charset: charset,
        type: 'charset.unsupported'
      }))
      return
    }

    // read
    read(req, res, next, parse, debug, {
      encoding: charset,
      inflate: inflate,
      limit: limit,
      verify: verify
    })
  }
}

/**
 * Create strict violation syntax error matching native error.
 *
 * @param {string} str
 * @param {string} char
 * @return {Error}
 * @private
 */

function createStrictSyntaxError (str, char) {
  var index = str.indexOf(char)
  var partial = str.substring(0, index) + '#'

  try {
    JSON.parse(partial); /* istanbul ignore next */ throw new SyntaxError('strict violation')
  } catch (e) {
    return normalizeJsonSyntaxError(e, {
      message: e.message.replace('#', char),
      stack: e.stack
    })
  }
}

/**
 * Get the first non-whitespace character in a string.
 *
 * @param {string} str
 * @return {function}
 * @private
 */

function firstchar (str) {
  return FIRST_CHAR_REGEXP.exec(str)[1]
}

/**
 * Get the charset of a request.
 *
 * @param {object} req
 * @api private
 */

function getCharset (req) {
  try {
    return (contentType.parse(req).parameters.charset || '').toLowerCase()
  } catch (e) {
    return undefined
  }
}

/**
 * Normalize a SyntaxError for JSON.parse.
 *
 * @param {SyntaxError} error
 * @param {object} obj
 * @return {SyntaxError}
 */

function normalizeJsonSyntaxError (error, obj) {
  var keys = Object.getOwnPropertyNames(error)

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i]
    if (key !== 'stack' && key !== 'message') {
      delete error[key]
    }
  }

  var props = Object.keys(obj)

  for (var j = 0; j < props.length; j++) {
    var prop = props[j]
    error[prop] = obj[prop]
  }

  return error
}

/**
 * Get the simple type checker.
 *
 * @param {string} type
 * @return {function}
 */

function typeChecker (type) {
  return function checkType (req) {
    return Boolean(typeis(req, type))
  }
}


/***/ }),
/* 62 */
/***/ (function(module, exports) {

module.exports = require("raw-body");

/***/ }),
/* 63 */
/***/ (function(module, exports) {

module.exports = require("iconv-lite");

/***/ }),
/* 64 */
/***/ (function(module, exports) {

module.exports = require("zlib");

/***/ }),
/* 65 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * body-parser
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module dependencies.
 */

var bytes = __webpack_require__(16)
var debug = __webpack_require__(6)('body-parser:raw')
var read = __webpack_require__(18)
var typeis = __webpack_require__(15)

/**
 * Module exports.
 */

module.exports = raw

/**
 * Create a middleware to parse raw bodies.
 *
 * @param {object} [options]
 * @return {function}
 * @api public
 */

function raw (options) {
  var opts = options || {}

  var inflate = opts.inflate !== false
  var limit = typeof opts.limit !== 'number'
    ? bytes.parse(opts.limit || '100kb')
    : opts.limit
  var type = opts.type || 'application/octet-stream'
  var verify = opts.verify || false

  if (verify !== false && typeof verify !== 'function') {
    throw new TypeError('option verify must be function')
  }

  // create the appropriate type checking function
  var shouldParse = typeof type !== 'function'
    ? typeChecker(type)
    : type

  function parse (buf) {
    return buf
  }

  return function rawParser (req, res, next) {
    if (req._body) {
      debug('body already parsed')
      next()
      return
    }

    req.body = req.body || {}

    // skip requests without bodies
    if (!typeis.hasBody(req)) {
      debug('skip empty body')
      next()
      return
    }

    debug('content-type %j', req.headers['content-type'])

    // determine if request should be parsed
    if (!shouldParse(req)) {
      debug('skip parsing')
      next()
      return
    }

    // read
    read(req, res, next, parse, debug, {
      encoding: null,
      inflate: inflate,
      limit: limit,
      verify: verify
    })
  }
}

/**
 * Get the simple type checker.
 *
 * @param {string} type
 * @return {function}
 */

function typeChecker (type) {
  return function checkType (req) {
    return Boolean(typeis(req, type))
  }
}


/***/ }),
/* 66 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * body-parser
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module dependencies.
 */

var bytes = __webpack_require__(16)
var contentType = __webpack_require__(17)
var debug = __webpack_require__(6)('body-parser:text')
var read = __webpack_require__(18)
var typeis = __webpack_require__(15)

/**
 * Module exports.
 */

module.exports = text

/**
 * Create a middleware to parse text bodies.
 *
 * @param {object} [options]
 * @return {function}
 * @api public
 */

function text (options) {
  var opts = options || {}

  var defaultCharset = opts.defaultCharset || 'utf-8'
  var inflate = opts.inflate !== false
  var limit = typeof opts.limit !== 'number'
    ? bytes.parse(opts.limit || '100kb')
    : opts.limit
  var type = opts.type || 'text/plain'
  var verify = opts.verify || false

  if (verify !== false && typeof verify !== 'function') {
    throw new TypeError('option verify must be function')
  }

  // create the appropriate type checking function
  var shouldParse = typeof type !== 'function'
    ? typeChecker(type)
    : type

  function parse (buf) {
    return buf
  }

  return function textParser (req, res, next) {
    if (req._body) {
      debug('body already parsed')
      next()
      return
    }

    req.body = req.body || {}

    // skip requests without bodies
    if (!typeis.hasBody(req)) {
      debug('skip empty body')
      next()
      return
    }

    debug('content-type %j', req.headers['content-type'])

    // determine if request should be parsed
    if (!shouldParse(req)) {
      debug('skip parsing')
      next()
      return
    }

    // get charset
    var charset = getCharset(req) || defaultCharset

    // read
    read(req, res, next, parse, debug, {
      encoding: charset,
      inflate: inflate,
      limit: limit,
      verify: verify
    })
  }
}

/**
 * Get the charset of a request.
 *
 * @param {object} req
 * @api private
 */

function getCharset (req) {
  try {
    return (contentType.parse(req).parameters.charset || '').toLowerCase()
  } catch (e) {
    return undefined
  }
}

/**
 * Get the simple type checker.
 *
 * @param {string} type
 * @return {function}
 */

function typeChecker (type) {
  return function checkType (req) {
    return Boolean(typeis(req, type))
  }
}


/***/ }),
/* 67 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * body-parser
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module dependencies.
 * @private
 */

var bytes = __webpack_require__(16)
var contentType = __webpack_require__(17)
var createError = __webpack_require__(25)
var debug = __webpack_require__(6)('body-parser:urlencoded')
var deprecate = __webpack_require__(9)('body-parser')
var read = __webpack_require__(18)
var typeis = __webpack_require__(15)

/**
 * Module exports.
 */

module.exports = urlencoded

/**
 * Cache of parser modules.
 */

var parsers = Object.create(null)

/**
 * Create a middleware to parse urlencoded bodies.
 *
 * @param {object} [options]
 * @return {function}
 * @public
 */

function urlencoded (options) {
  var opts = options || {}

  // notice because option default will flip in next major
  if (opts.extended === undefined) {
    deprecate('undefined extended: provide extended option')
  }

  var extended = opts.extended !== false
  var inflate = opts.inflate !== false
  var limit = typeof opts.limit !== 'number'
    ? bytes.parse(opts.limit || '100kb')
    : opts.limit
  var type = opts.type || 'application/x-www-form-urlencoded'
  var verify = opts.verify || false

  if (verify !== false && typeof verify !== 'function') {
    throw new TypeError('option verify must be function')
  }

  // create the appropriate query parser
  var queryparse = extended
    ? extendedparser(opts)
    : simpleparser(opts)

  // create the appropriate type checking function
  var shouldParse = typeof type !== 'function'
    ? typeChecker(type)
    : type

  function parse (body) {
    return body.length
      ? queryparse(body)
      : {}
  }

  return function urlencodedParser (req, res, next) {
    if (req._body) {
      debug('body already parsed')
      next()
      return
    }

    req.body = req.body || {}

    // skip requests without bodies
    if (!typeis.hasBody(req)) {
      debug('skip empty body')
      next()
      return
    }

    debug('content-type %j', req.headers['content-type'])

    // determine if request should be parsed
    if (!shouldParse(req)) {
      debug('skip parsing')
      next()
      return
    }

    // assert charset
    var charset = getCharset(req) || 'utf-8'
    if (charset !== 'utf-8') {
      debug('invalid charset')
      next(createError(415, 'unsupported charset "' + charset.toUpperCase() + '"', {
        charset: charset,
        type: 'charset.unsupported'
      }))
      return
    }

    // read
    read(req, res, next, parse, debug, {
      debug: debug,
      encoding: charset,
      inflate: inflate,
      limit: limit,
      verify: verify
    })
  }
}

/**
 * Get the extended query parser.
 *
 * @param {object} options
 */

function extendedparser (options) {
  var parameterLimit = options.parameterLimit !== undefined
    ? options.parameterLimit
    : 1000
  var parse = parser('qs')

  if (isNaN(parameterLimit) || parameterLimit < 1) {
    throw new TypeError('option parameterLimit must be a positive number')
  }

  if (isFinite(parameterLimit)) {
    parameterLimit = parameterLimit | 0
  }

  return function queryparse (body) {
    var paramCount = parameterCount(body, parameterLimit)

    if (paramCount === undefined) {
      debug('too many parameters')
      throw createError(413, 'too many parameters', {
        type: 'parameters.too.many'
      })
    }

    var arrayLimit = Math.max(100, paramCount)

    debug('parse extended urlencoding')
    return parse(body, {
      allowPrototypes: true,
      arrayLimit: arrayLimit,
      depth: Infinity,
      parameterLimit: parameterLimit
    })
  }
}

/**
 * Get the charset of a request.
 *
 * @param {object} req
 * @api private
 */

function getCharset (req) {
  try {
    return (contentType.parse(req).parameters.charset || '').toLowerCase()
  } catch (e) {
    return undefined
  }
}

/**
 * Count the number of parameters, stopping once limit reached
 *
 * @param {string} body
 * @param {number} limit
 * @api private
 */

function parameterCount (body, limit) {
  var count = 0
  var index = 0

  while ((index = body.indexOf('&', index)) !== -1) {
    count++
    index++

    if (count === limit) {
      return undefined
    }
  }

  return count
}

/**
 * Get parser for module name dynamically.
 *
 * @param {string} name
 * @return {function}
 * @api private
 */

function parser (name) {
  var mod = parsers[name]

  if (mod !== undefined) {
    return mod.parse
  }

  // this uses a switch for static require analysis
  switch (name) {
    case 'qs':
      mod = __webpack_require__(26)
      break
    case 'querystring':
      mod = __webpack_require__(40)
      break
  }

  // store to prevent invoking require()
  parsers[name] = mod

  return mod.parse
}

/**
 * Get the simple query parser.
 *
 * @param {object} options
 */

function simpleparser (options) {
  var parameterLimit = options.parameterLimit !== undefined
    ? options.parameterLimit
    : 1000
  var parse = parser('querystring')

  if (isNaN(parameterLimit) || parameterLimit < 1) {
    throw new TypeError('option parameterLimit must be a positive number')
  }

  if (isFinite(parameterLimit)) {
    parameterLimit = parameterLimit | 0
  }

  return function queryparse (body) {
    var paramCount = parameterCount(body, parameterLimit)

    if (paramCount === undefined) {
      debug('too many parameters')
      throw createError(413, 'too many parameters', {
        type: 'parameters.too.many'
      })
    }

    debug('parse urlencoding')
    return parse(body, undefined, undefined, {maxKeys: parameterLimit})
  }
}

/**
 * Get the simple type checker.
 *
 * @param {string} type
 * @return {function}
 */

function typeChecker (type) {
  return function checkType (req) {
    return Boolean(typeis(req, type))
  }
}


/***/ }),
/* 68 */
/***/ (function(module, exports) {

module.exports = require("merge-descriptors");

/***/ }),
/* 69 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module dependencies.
 * @private
 */

var finalhandler = __webpack_require__(70);
var Router = __webpack_require__(41);
var methods = __webpack_require__(27);
var middleware = __webpack_require__(72);
var query = __webpack_require__(44);
var debug = __webpack_require__(6)('express:application');
var View = __webpack_require__(73);
var http = __webpack_require__(30);
var compileETag = __webpack_require__(10).compileETag;
var compileQueryParser = __webpack_require__(10).compileQueryParser;
var compileTrust = __webpack_require__(10).compileTrust;
var deprecate = __webpack_require__(9)('express');
var flatten = __webpack_require__(19);
var merge = __webpack_require__(20);
var resolve = __webpack_require__(21).resolve;
var setPrototypeOf = __webpack_require__(29)
var slice = Array.prototype.slice;

/**
 * Application prototype.
 */

var app = exports = module.exports = {};

/**
 * Variable for trust proxy inheritance back-compat
 * @private
 */

var trustProxyDefaultSymbol = '@@symbol:trust_proxy_default';

/**
 * Initialize the server.
 *
 *   - setup default configuration
 *   - setup default middleware
 *   - setup route reflection methods
 *
 * @private
 */

app.init = function init() {
  this.cache = {};
  this.engines = {};
  this.settings = {};

  this.defaultConfiguration();
};

/**
 * Initialize application configuration.
 * @private
 */

app.defaultConfiguration = function defaultConfiguration() {
  var env = process.env.NODE_ENV || 'development';

  // default settings
  this.enable('x-powered-by');
  this.set('etag', 'weak');
  this.set('env', env);
  this.set('query parser', 'extended');
  this.set('subdomain offset', 2);
  this.set('trust proxy', false);

  // trust proxy inherit back-compat
  Object.defineProperty(this.settings, trustProxyDefaultSymbol, {
    configurable: true,
    value: true
  });

  debug('booting in %s mode', env);

  this.on('mount', function onmount(parent) {
    // inherit trust proxy
    if (this.settings[trustProxyDefaultSymbol] === true
      && typeof parent.settings['trust proxy fn'] === 'function') {
      delete this.settings['trust proxy'];
      delete this.settings['trust proxy fn'];
    }

    // inherit protos
    setPrototypeOf(this.request, parent.request)
    setPrototypeOf(this.response, parent.response)
    setPrototypeOf(this.engines, parent.engines)
    setPrototypeOf(this.settings, parent.settings)
  });

  // setup locals
  this.locals = Object.create(null);

  // top-most app is mounted at /
  this.mountpath = '/';

  // default locals
  this.locals.settings = this.settings;

  // default configuration
  this.set('view', View);
  this.set('views', resolve('views'));
  this.set('jsonp callback name', 'callback');

  if (env === 'production') {
    this.enable('view cache');
  }

  Object.defineProperty(this, 'router', {
    get: function() {
      throw new Error('\'app.router\' is deprecated!\nPlease see the 3.x to 4.x migration guide for details on how to update your app.');
    }
  });
};

/**
 * lazily adds the base router if it has not yet been added.
 *
 * We cannot add the base router in the defaultConfiguration because
 * it reads app settings which might be set after that has run.
 *
 * @private
 */
app.lazyrouter = function lazyrouter() {
  if (!this._router) {
    this._router = new Router({
      caseSensitive: this.enabled('case sensitive routing'),
      strict: this.enabled('strict routing')
    });

    this._router.use(query(this.get('query parser fn')));
    this._router.use(middleware.init(this));
  }
};

/**
 * Dispatch a req, res pair into the application. Starts pipeline processing.
 *
 * If no callback is provided, then default error handlers will respond
 * in the event of an error bubbling through the stack.
 *
 * @private
 */

app.handle = function handle(req, res, callback) {
  var router = this._router;

  // final handler
  var done = callback || finalhandler(req, res, {
    env: this.get('env'),
    onerror: logerror.bind(this)
  });

  // no routes
  if (!router) {
    debug('no routes defined on app');
    done();
    return;
  }

  router.handle(req, res, done);
};

/**
 * Proxy `Router#use()` to add middleware to the app router.
 * See Router#use() documentation for details.
 *
 * If the _fn_ parameter is an express app, then it will be
 * mounted at the _route_ specified.
 *
 * @public
 */

app.use = function use(fn) {
  var offset = 0;
  var path = '/';

  // default path to '/'
  // disambiguate app.use([fn])
  if (typeof fn !== 'function') {
    var arg = fn;

    while (Array.isArray(arg) && arg.length !== 0) {
      arg = arg[0];
    }

    // first arg is the path
    if (typeof arg !== 'function') {
      offset = 1;
      path = fn;
    }
  }

  var fns = flatten(slice.call(arguments, offset));

  if (fns.length === 0) {
    throw new TypeError('app.use() requires a middleware function')
  }

  // setup router
  this.lazyrouter();
  var router = this._router;

  fns.forEach(function (fn) {
    // non-express app
    if (!fn || !fn.handle || !fn.set) {
      return router.use(path, fn);
    }

    debug('.use app under %s', path);
    fn.mountpath = path;
    fn.parent = this;

    // restore .app property on req and res
    router.use(path, function mounted_app(req, res, next) {
      var orig = req.app;
      fn.handle(req, res, function (err) {
        setPrototypeOf(req, orig.request)
        setPrototypeOf(res, orig.response)
        next(err);
      });
    });

    // mounted an app
    fn.emit('mount', this);
  }, this);

  return this;
};

/**
 * Proxy to the app `Router#route()`
 * Returns a new `Route` instance for the _path_.
 *
 * Routes are isolated middleware stacks for specific paths.
 * See the Route api docs for details.
 *
 * @public
 */

app.route = function route(path) {
  this.lazyrouter();
  return this._router.route(path);
};

/**
 * Register the given template engine callback `fn`
 * as `ext`.
 *
 * By default will `require()` the engine based on the
 * file extension. For example if you try to render
 * a "foo.ejs" file Express will invoke the following internally:
 *
 *     app.engine('ejs', require('ejs').__express);
 *
 * For engines that do not provide `.__express` out of the box,
 * or if you wish to "map" a different extension to the template engine
 * you may use this method. For example mapping the EJS template engine to
 * ".html" files:
 *
 *     app.engine('html', require('ejs').renderFile);
 *
 * In this case EJS provides a `.renderFile()` method with
 * the same signature that Express expects: `(path, options, callback)`,
 * though note that it aliases this method as `ejs.__express` internally
 * so if you're using ".ejs" extensions you dont need to do anything.
 *
 * Some template engines do not follow this convention, the
 * [Consolidate.js](https://github.com/tj/consolidate.js)
 * library was created to map all of node's popular template
 * engines to follow this convention, thus allowing them to
 * work seamlessly within Express.
 *
 * @param {String} ext
 * @param {Function} fn
 * @return {app} for chaining
 * @public
 */

app.engine = function engine(ext, fn) {
  if (typeof fn !== 'function') {
    throw new Error('callback function required');
  }

  // get file extension
  var extension = ext[0] !== '.'
    ? '.' + ext
    : ext;

  // store engine
  this.engines[extension] = fn;

  return this;
};

/**
 * Proxy to `Router#param()` with one added api feature. The _name_ parameter
 * can be an array of names.
 *
 * See the Router#param() docs for more details.
 *
 * @param {String|Array} name
 * @param {Function} fn
 * @return {app} for chaining
 * @public
 */

app.param = function param(name, fn) {
  this.lazyrouter();

  if (Array.isArray(name)) {
    for (var i = 0; i < name.length; i++) {
      this.param(name[i], fn);
    }

    return this;
  }

  this._router.param(name, fn);

  return this;
};

/**
 * Assign `setting` to `val`, or return `setting`'s value.
 *
 *    app.set('foo', 'bar');
 *    app.set('foo');
 *    // => "bar"
 *
 * Mounted servers inherit their parent server's settings.
 *
 * @param {String} setting
 * @param {*} [val]
 * @return {Server} for chaining
 * @public
 */

app.set = function set(setting, val) {
  if (arguments.length === 1) {
    // app.get(setting)
    return this.settings[setting];
  }

  debug('set "%s" to %o', setting, val);

  // set value
  this.settings[setting] = val;

  // trigger matched settings
  switch (setting) {
    case 'etag':
      this.set('etag fn', compileETag(val));
      break;
    case 'query parser':
      this.set('query parser fn', compileQueryParser(val));
      break;
    case 'trust proxy':
      this.set('trust proxy fn', compileTrust(val));

      // trust proxy inherit back-compat
      Object.defineProperty(this.settings, trustProxyDefaultSymbol, {
        configurable: true,
        value: false
      });

      break;
  }

  return this;
};

/**
 * Return the app's absolute pathname
 * based on the parent(s) that have
 * mounted it.
 *
 * For example if the application was
 * mounted as "/admin", which itself
 * was mounted as "/blog" then the
 * return value would be "/blog/admin".
 *
 * @return {String}
 * @private
 */

app.path = function path() {
  return this.parent
    ? this.parent.path() + this.mountpath
    : '';
};

/**
 * Check if `setting` is enabled (truthy).
 *
 *    app.enabled('foo')
 *    // => false
 *
 *    app.enable('foo')
 *    app.enabled('foo')
 *    // => true
 *
 * @param {String} setting
 * @return {Boolean}
 * @public
 */

app.enabled = function enabled(setting) {
  return Boolean(this.set(setting));
};

/**
 * Check if `setting` is disabled.
 *
 *    app.disabled('foo')
 *    // => true
 *
 *    app.enable('foo')
 *    app.disabled('foo')
 *    // => false
 *
 * @param {String} setting
 * @return {Boolean}
 * @public
 */

app.disabled = function disabled(setting) {
  return !this.set(setting);
};

/**
 * Enable `setting`.
 *
 * @param {String} setting
 * @return {app} for chaining
 * @public
 */

app.enable = function enable(setting) {
  return this.set(setting, true);
};

/**
 * Disable `setting`.
 *
 * @param {String} setting
 * @return {app} for chaining
 * @public
 */

app.disable = function disable(setting) {
  return this.set(setting, false);
};

/**
 * Delegate `.VERB(...)` calls to `router.VERB(...)`.
 */

methods.forEach(function(method){
  app[method] = function(path){
    if (method === 'get' && arguments.length === 1) {
      // app.get(setting)
      return this.set(path);
    }

    this.lazyrouter();

    var route = this._router.route(path);
    route[method].apply(route, slice.call(arguments, 1));
    return this;
  };
});

/**
 * Special-cased "all" method, applying the given route `path`,
 * middleware, and callback to _every_ HTTP method.
 *
 * @param {String} path
 * @param {Function} ...
 * @return {app} for chaining
 * @public
 */

app.all = function all(path) {
  this.lazyrouter();

  var route = this._router.route(path);
  var args = slice.call(arguments, 1);

  for (var i = 0; i < methods.length; i++) {
    route[methods[i]].apply(route, args);
  }

  return this;
};

// del -> delete alias

app.del = deprecate.function(app.delete, 'app.del: Use app.delete instead');

/**
 * Render the given view `name` name with `options`
 * and a callback accepting an error and the
 * rendered template string.
 *
 * Example:
 *
 *    app.render('email', { name: 'Tobi' }, function(err, html){
 *      // ...
 *    })
 *
 * @param {String} name
 * @param {Object|Function} options or fn
 * @param {Function} callback
 * @public
 */

app.render = function render(name, options, callback) {
  var cache = this.cache;
  var done = callback;
  var engines = this.engines;
  var opts = options;
  var renderOptions = {};
  var view;

  // support callback function as second arg
  if (typeof options === 'function') {
    done = options;
    opts = {};
  }

  // merge app.locals
  merge(renderOptions, this.locals);

  // merge options._locals
  if (opts._locals) {
    merge(renderOptions, opts._locals);
  }

  // merge options
  merge(renderOptions, opts);

  // set .cache unless explicitly provided
  if (renderOptions.cache == null) {
    renderOptions.cache = this.enabled('view cache');
  }

  // primed cache
  if (renderOptions.cache) {
    view = cache[name];
  }

  // view
  if (!view) {
    var View = this.get('view');

    view = new View(name, {
      defaultEngine: this.get('view engine'),
      root: this.get('views'),
      engines: engines
    });

    if (!view.path) {
      var dirs = Array.isArray(view.root) && view.root.length > 1
        ? 'directories "' + view.root.slice(0, -1).join('", "') + '" or "' + view.root[view.root.length - 1] + '"'
        : 'directory "' + view.root + '"'
      var err = new Error('Failed to lookup view "' + name + '" in views ' + dirs);
      err.view = view;
      return done(err);
    }

    // prime the cache
    if (renderOptions.cache) {
      cache[name] = view;
    }
  }

  // render
  tryRender(view, renderOptions, done);
};

/**
 * Listen for connections.
 *
 * A node `http.Server` is returned, with this
 * application (which is a `Function`) as its
 * callback. If you wish to create both an HTTP
 * and HTTPS server you may do so with the "http"
 * and "https" modules as shown here:
 *
 *    var http = require('http')
 *      , https = require('https')
 *      , express = require('express')
 *      , app = express();
 *
 *    http.createServer(app).listen(80);
 *    https.createServer({ ... }, app).listen(443);
 *
 * @return {http.Server}
 * @public
 */

app.listen = function listen() {
  var server = http.createServer(this);
  return server.listen.apply(server, arguments);
};

/**
 * Log error using console.error.
 *
 * @param {Error} err
 * @private
 */

function logerror(err) {
  /* istanbul ignore next */
  if (this.get('env') !== 'test') console.error(err.stack || err.toString());
}

/**
 * Try rendering a view.
 * @private
 */

function tryRender(view, options, callback) {
  try {
    view.render(options, callback);
  } catch (err) {
    callback(err);
  }
}


/***/ }),
/* 70 */
/***/ (function(module, exports) {

module.exports = require("finalhandler");

/***/ }),
/* 71 */
/***/ (function(module, exports) {

module.exports = require("path-to-regexp");

/***/ }),
/* 72 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module dependencies.
 * @private
 */

var setPrototypeOf = __webpack_require__(29)

/**
 * Initialization middleware, exposing the
 * request and response to each other, as well
 * as defaulting the X-Powered-By header field.
 *
 * @param {Function} app
 * @return {Function}
 * @api private
 */

exports.init = function(app){
  return function expressInit(req, res, next){
    if (app.enabled('x-powered-by')) res.setHeader('X-Powered-By', 'Express');
    req.res = res;
    res.req = req;
    req.next = next;

    setPrototypeOf(req, app.request)
    setPrototypeOf(res, app.response)

    res.locals = res.locals || Object.create(null);

    next();
  };
};



/***/ }),
/* 73 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module dependencies.
 * @private
 */

var debug = __webpack_require__(6)('express:view');
var path = __webpack_require__(21);
var fs = __webpack_require__(45);

/**
 * Module variables.
 * @private
 */

var dirname = path.dirname;
var basename = path.basename;
var extname = path.extname;
var join = path.join;
var resolve = path.resolve;

/**
 * Module exports.
 * @public
 */

module.exports = View;

/**
 * Initialize a new `View` with the given `name`.
 *
 * Options:
 *
 *   - `defaultEngine` the default template engine name
 *   - `engines` template engine require() cache
 *   - `root` root path for view lookup
 *
 * @param {string} name
 * @param {object} options
 * @public
 */

function View(name, options) {
  var opts = options || {};

  this.defaultEngine = opts.defaultEngine;
  this.ext = extname(name);
  this.name = name;
  this.root = opts.root;

  if (!this.ext && !this.defaultEngine) {
    throw new Error('No default engine was specified and no extension was provided.');
  }

  var fileName = name;

  if (!this.ext) {
    // get extension from default engine name
    this.ext = this.defaultEngine[0] !== '.'
      ? '.' + this.defaultEngine
      : this.defaultEngine;

    fileName += this.ext;
  }

  if (!opts.engines[this.ext]) {
    // load engine
    var mod = this.ext.substr(1)
    debug('require "%s"', mod)

    // default engine export
    var fn = !(function webpackMissingModule() { var e = new Error("Cannot find module \".\""); e.code = 'MODULE_NOT_FOUND'; throw e; }()).__express

    if (typeof fn !== 'function') {
      throw new Error('Module "' + mod + '" does not provide a view engine.')
    }

    opts.engines[this.ext] = fn
  }

  // store loaded engine
  this.engine = opts.engines[this.ext];

  // lookup path
  this.path = this.lookup(fileName);
}

/**
 * Lookup view by the given `name`
 *
 * @param {string} name
 * @private
 */

View.prototype.lookup = function lookup(name) {
  var path;
  var roots = [].concat(this.root);

  debug('lookup "%s"', name);

  for (var i = 0; i < roots.length && !path; i++) {
    var root = roots[i];

    // resolve the path
    var loc = resolve(root, name);
    var dir = dirname(loc);
    var file = basename(loc);

    // resolve the file
    path = this.resolve(dir, file);
  }

  return path;
};

/**
 * Render with the given options.
 *
 * @param {object} options
 * @param {function} callback
 * @private
 */

View.prototype.render = function render(options, callback) {
  debug('render "%s"', this.path);
  this.engine(this.path, options, callback);
};

/**
 * Resolve the file within the given directory.
 *
 * @param {string} dir
 * @param {string} file
 * @private
 */

View.prototype.resolve = function resolve(dir, file) {
  var ext = this.ext;

  // <path>.<ext>
  var path = join(dir, file);
  var stat = tryStat(path);

  if (stat && stat.isFile()) {
    return path;
  }

  // <path>/index.<ext>
  path = join(dir, basename(file, ext), 'index' + ext);
  stat = tryStat(path);

  if (stat && stat.isFile()) {
    return path;
  }
};

/**
 * Return a stat, maybe.
 *
 * @param {string} path
 * @return {fs.Stats}
 * @private
 */

function tryStat(path) {
  debug('stat "%s"', path);

  try {
    return fs.statSync(path);
  } catch (e) {
    return undefined;
  }
}


/***/ }),
/* 74 */
/***/ (function(module, exports) {

function webpackEmptyContext(req) {
	throw new Error("Cannot find module '" + req + "'.");
}
webpackEmptyContext.keys = function() { return []; };
webpackEmptyContext.resolve = webpackEmptyContext;
module.exports = webpackEmptyContext;
webpackEmptyContext.id = 74;

/***/ }),
/* 75 */
/***/ (function(module, exports) {

module.exports = require("etag");

/***/ }),
/* 76 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module dependencies.
 * @private
 */

var accepts = __webpack_require__(77);
var deprecate = __webpack_require__(9)('express');
var isIP = __webpack_require__(78).isIP;
var typeis = __webpack_require__(15);
var http = __webpack_require__(30);
var fresh = __webpack_require__(79);
var parseRange = __webpack_require__(80);
var parse = __webpack_require__(28);
var proxyaddr = __webpack_require__(49);

/**
 * Request prototype.
 * @public
 */

var req = Object.create(http.IncomingMessage.prototype)

/**
 * Module exports.
 * @public
 */

module.exports = req

/**
 * Return request header.
 *
 * The `Referrer` header field is special-cased,
 * both `Referrer` and `Referer` are interchangeable.
 *
 * Examples:
 *
 *     req.get('Content-Type');
 *     // => "text/plain"
 *
 *     req.get('content-type');
 *     // => "text/plain"
 *
 *     req.get('Something');
 *     // => undefined
 *
 * Aliased as `req.header()`.
 *
 * @param {String} name
 * @return {String}
 * @public
 */

req.get =
req.header = function header(name) {
  if (!name) {
    throw new TypeError('name argument is required to req.get');
  }

  if (typeof name !== 'string') {
    throw new TypeError('name must be a string to req.get');
  }

  var lc = name.toLowerCase();

  switch (lc) {
    case 'referer':
    case 'referrer':
      return this.headers.referrer
        || this.headers.referer;
    default:
      return this.headers[lc];
  }
};

/**
 * To do: update docs.
 *
 * Check if the given `type(s)` is acceptable, returning
 * the best match when true, otherwise `undefined`, in which
 * case you should respond with 406 "Not Acceptable".
 *
 * The `type` value may be a single MIME type string
 * such as "application/json", an extension name
 * such as "json", a comma-delimited list such as "json, html, text/plain",
 * an argument list such as `"json", "html", "text/plain"`,
 * or an array `["json", "html", "text/plain"]`. When a list
 * or array is given, the _best_ match, if any is returned.
 *
 * Examples:
 *
 *     // Accept: text/html
 *     req.accepts('html');
 *     // => "html"
 *
 *     // Accept: text/*, application/json
 *     req.accepts('html');
 *     // => "html"
 *     req.accepts('text/html');
 *     // => "text/html"
 *     req.accepts('json, text');
 *     // => "json"
 *     req.accepts('application/json');
 *     // => "application/json"
 *
 *     // Accept: text/*, application/json
 *     req.accepts('image/png');
 *     req.accepts('png');
 *     // => undefined
 *
 *     // Accept: text/*;q=.5, application/json
 *     req.accepts(['html', 'json']);
 *     req.accepts('html', 'json');
 *     req.accepts('html, json');
 *     // => "json"
 *
 * @param {String|Array} type(s)
 * @return {String|Array|Boolean}
 * @public
 */

req.accepts = function(){
  var accept = accepts(this);
  return accept.types.apply(accept, arguments);
};

/**
 * Check if the given `encoding`s are accepted.
 *
 * @param {String} ...encoding
 * @return {String|Array}
 * @public
 */

req.acceptsEncodings = function(){
  var accept = accepts(this);
  return accept.encodings.apply(accept, arguments);
};

req.acceptsEncoding = deprecate.function(req.acceptsEncodings,
  'req.acceptsEncoding: Use acceptsEncodings instead');

/**
 * Check if the given `charset`s are acceptable,
 * otherwise you should respond with 406 "Not Acceptable".
 *
 * @param {String} ...charset
 * @return {String|Array}
 * @public
 */

req.acceptsCharsets = function(){
  var accept = accepts(this);
  return accept.charsets.apply(accept, arguments);
};

req.acceptsCharset = deprecate.function(req.acceptsCharsets,
  'req.acceptsCharset: Use acceptsCharsets instead');

/**
 * Check if the given `lang`s are acceptable,
 * otherwise you should respond with 406 "Not Acceptable".
 *
 * @param {String} ...lang
 * @return {String|Array}
 * @public
 */

req.acceptsLanguages = function(){
  var accept = accepts(this);
  return accept.languages.apply(accept, arguments);
};

req.acceptsLanguage = deprecate.function(req.acceptsLanguages,
  'req.acceptsLanguage: Use acceptsLanguages instead');

/**
 * Parse Range header field, capping to the given `size`.
 *
 * Unspecified ranges such as "0-" require knowledge of your resource length. In
 * the case of a byte range this is of course the total number of bytes. If the
 * Range header field is not given `undefined` is returned, `-1` when unsatisfiable,
 * and `-2` when syntactically invalid.
 *
 * When ranges are returned, the array has a "type" property which is the type of
 * range that is required (most commonly, "bytes"). Each array element is an object
 * with a "start" and "end" property for the portion of the range.
 *
 * The "combine" option can be set to `true` and overlapping & adjacent ranges
 * will be combined into a single range.
 *
 * NOTE: remember that ranges are inclusive, so for example "Range: users=0-3"
 * should respond with 4 users when available, not 3.
 *
 * @param {number} size
 * @param {object} [options]
 * @param {boolean} [options.combine=false]
 * @return {number|array}
 * @public
 */

req.range = function range(size, options) {
  var range = this.get('Range');
  if (!range) return;
  return parseRange(size, range, options);
};

/**
 * Return the value of param `name` when present or `defaultValue`.
 *
 *  - Checks route placeholders, ex: _/user/:id_
 *  - Checks body params, ex: id=12, {"id":12}
 *  - Checks query string params, ex: ?id=12
 *
 * To utilize request bodies, `req.body`
 * should be an object. This can be done by using
 * the `bodyParser()` middleware.
 *
 * @param {String} name
 * @param {Mixed} [defaultValue]
 * @return {String}
 * @public
 */

req.param = function param(name, defaultValue) {
  var params = this.params || {};
  var body = this.body || {};
  var query = this.query || {};

  var args = arguments.length === 1
    ? 'name'
    : 'name, default';
  deprecate('req.param(' + args + '): Use req.params, req.body, or req.query instead');

  if (null != params[name] && params.hasOwnProperty(name)) return params[name];
  if (null != body[name]) return body[name];
  if (null != query[name]) return query[name];

  return defaultValue;
};

/**
 * Check if the incoming request contains the "Content-Type"
 * header field, and it contains the give mime `type`.
 *
 * Examples:
 *
 *      // With Content-Type: text/html; charset=utf-8
 *      req.is('html');
 *      req.is('text/html');
 *      req.is('text/*');
 *      // => true
 *
 *      // When Content-Type is application/json
 *      req.is('json');
 *      req.is('application/json');
 *      req.is('application/*');
 *      // => true
 *
 *      req.is('html');
 *      // => false
 *
 * @param {String|Array} types...
 * @return {String|false|null}
 * @public
 */

req.is = function is(types) {
  var arr = types;

  // support flattened arguments
  if (!Array.isArray(types)) {
    arr = new Array(arguments.length);
    for (var i = 0; i < arr.length; i++) {
      arr[i] = arguments[i];
    }
  }

  return typeis(this, arr);
};

/**
 * Return the protocol string "http" or "https"
 * when requested with TLS. When the "trust proxy"
 * setting trusts the socket address, the
 * "X-Forwarded-Proto" header field will be trusted
 * and used if present.
 *
 * If you're running behind a reverse proxy that
 * supplies https for you this may be enabled.
 *
 * @return {String}
 * @public
 */

defineGetter(req, 'protocol', function protocol(){
  var proto = this.connection.encrypted
    ? 'https'
    : 'http';
  var trust = this.app.get('trust proxy fn');

  if (!trust(this.connection.remoteAddress, 0)) {
    return proto;
  }

  // Note: X-Forwarded-Proto is normally only ever a
  //       single value, but this is to be safe.
  var header = this.get('X-Forwarded-Proto') || proto
  var index = header.indexOf(',')

  return index !== -1
    ? header.substring(0, index).trim()
    : header.trim()
});

/**
 * Short-hand for:
 *
 *    req.protocol === 'https'
 *
 * @return {Boolean}
 * @public
 */

defineGetter(req, 'secure', function secure(){
  return this.protocol === 'https';
});

/**
 * Return the remote address from the trusted proxy.
 *
 * The is the remote address on the socket unless
 * "trust proxy" is set.
 *
 * @return {String}
 * @public
 */

defineGetter(req, 'ip', function ip(){
  var trust = this.app.get('trust proxy fn');
  return proxyaddr(this, trust);
});

/**
 * When "trust proxy" is set, trusted proxy addresses + client.
 *
 * For example if the value were "client, proxy1, proxy2"
 * you would receive the array `["client", "proxy1", "proxy2"]`
 * where "proxy2" is the furthest down-stream and "proxy1" and
 * "proxy2" were trusted.
 *
 * @return {Array}
 * @public
 */

defineGetter(req, 'ips', function ips() {
  var trust = this.app.get('trust proxy fn');
  var addrs = proxyaddr.all(this, trust);

  // reverse the order (to farthest -> closest)
  // and remove socket address
  addrs.reverse().pop()

  return addrs
});

/**
 * Return subdomains as an array.
 *
 * Subdomains are the dot-separated parts of the host before the main domain of
 * the app. By default, the domain of the app is assumed to be the last two
 * parts of the host. This can be changed by setting "subdomain offset".
 *
 * For example, if the domain is "tobi.ferrets.example.com":
 * If "subdomain offset" is not set, req.subdomains is `["ferrets", "tobi"]`.
 * If "subdomain offset" is 3, req.subdomains is `["tobi"]`.
 *
 * @return {Array}
 * @public
 */

defineGetter(req, 'subdomains', function subdomains() {
  var hostname = this.hostname;

  if (!hostname) return [];

  var offset = this.app.get('subdomain offset');
  var subdomains = !isIP(hostname)
    ? hostname.split('.').reverse()
    : [hostname];

  return subdomains.slice(offset);
});

/**
 * Short-hand for `url.parse(req.url).pathname`.
 *
 * @return {String}
 * @public
 */

defineGetter(req, 'path', function path() {
  return parse(this).pathname;
});

/**
 * Parse the "Host" header field to a hostname.
 *
 * When the "trust proxy" setting trusts the socket
 * address, the "X-Forwarded-Host" header field will
 * be trusted.
 *
 * @return {String}
 * @public
 */

defineGetter(req, 'hostname', function hostname(){
  var trust = this.app.get('trust proxy fn');
  var host = this.get('X-Forwarded-Host');

  if (!host || !trust(this.connection.remoteAddress, 0)) {
    host = this.get('Host');
  }

  if (!host) return;

  // IPv6 literal support
  var offset = host[0] === '['
    ? host.indexOf(']') + 1
    : 0;
  var index = host.indexOf(':', offset);

  return index !== -1
    ? host.substring(0, index)
    : host;
});

// TODO: change req.host to return host in next major

defineGetter(req, 'host', deprecate.function(function host(){
  return this.hostname;
}, 'req.host: Use req.hostname instead'));

/**
 * Check if the request is fresh, aka
 * Last-Modified and/or the ETag
 * still match.
 *
 * @return {Boolean}
 * @public
 */

defineGetter(req, 'fresh', function(){
  var method = this.method;
  var res = this.res
  var status = res.statusCode

  // GET or HEAD for weak freshness validation only
  if ('GET' !== method && 'HEAD' !== method) return false;

  // 2xx or 304 as per rfc2616 14.26
  if ((status >= 200 && status < 300) || 304 === status) {
    return fresh(this.headers, {
      'etag': res.get('ETag'),
      'last-modified': res.get('Last-Modified')
    })
  }

  return false;
});

/**
 * Check if the request is stale, aka
 * "Last-Modified" and / or the "ETag" for the
 * resource has changed.
 *
 * @return {Boolean}
 * @public
 */

defineGetter(req, 'stale', function stale(){
  return !this.fresh;
});

/**
 * Check if the request was an _XMLHttpRequest_.
 *
 * @return {Boolean}
 * @public
 */

defineGetter(req, 'xhr', function xhr(){
  var val = this.get('X-Requested-With') || '';
  return val.toLowerCase() === 'xmlhttprequest';
});

/**
 * Helper function for creating a getter on an object.
 *
 * @param {Object} obj
 * @param {String} name
 * @param {Function} getter
 * @private
 */
function defineGetter(obj, name, getter) {
  Object.defineProperty(obj, name, {
    configurable: true,
    enumerable: true,
    get: getter
  });
}


/***/ }),
/* 77 */
/***/ (function(module, exports) {

module.exports = require("accepts");

/***/ }),
/* 78 */
/***/ (function(module, exports) {

module.exports = require("net");

/***/ }),
/* 79 */
/***/ (function(module, exports) {

module.exports = require("fresh");

/***/ }),
/* 80 */
/***/ (function(module, exports) {

module.exports = require("range-parser");

/***/ }),
/* 81 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module dependencies.
 * @private
 */

var Buffer = __webpack_require__(46).Buffer
var contentDisposition = __webpack_require__(47);
var deprecate = __webpack_require__(9)('express');
var encodeUrl = __webpack_require__(82);
var escapeHtml = __webpack_require__(83);
var http = __webpack_require__(30);
var isAbsolute = __webpack_require__(10).isAbsolute;
var onFinished = __webpack_require__(39);
var path = __webpack_require__(21);
var statuses = __webpack_require__(84)
var merge = __webpack_require__(20);
var sign = __webpack_require__(85).sign;
var normalizeType = __webpack_require__(10).normalizeType;
var normalizeTypes = __webpack_require__(10).normalizeTypes;
var setCharset = __webpack_require__(10).setCharset;
var cookie = __webpack_require__(86);
var send = __webpack_require__(48);
var extname = path.extname;
var mime = send.mime;
var resolve = path.resolve;
var vary = __webpack_require__(87);

/**
 * Response prototype.
 * @public
 */

var res = Object.create(http.ServerResponse.prototype)

/**
 * Module exports.
 * @public
 */

module.exports = res

/**
 * Module variables.
 * @private
 */

var charsetRegExp = /;\s*charset\s*=/;

/**
 * Set status `code`.
 *
 * @param {Number} code
 * @return {ServerResponse}
 * @public
 */

res.status = function status(code) {
  this.statusCode = code;
  return this;
};

/**
 * Set Link header field with the given `links`.
 *
 * Examples:
 *
 *    res.links({
 *      next: 'http://api.example.com/users?page=2',
 *      last: 'http://api.example.com/users?page=5'
 *    });
 *
 * @param {Object} links
 * @return {ServerResponse}
 * @public
 */

res.links = function(links){
  var link = this.get('Link') || '';
  if (link) link += ', ';
  return this.set('Link', link + Object.keys(links).map(function(rel){
    return '<' + links[rel] + '>; rel="' + rel + '"';
  }).join(', '));
};

/**
 * Send a response.
 *
 * Examples:
 *
 *     res.send(Buffer.from('wahoo'));
 *     res.send({ some: 'json' });
 *     res.send('<p>some html</p>');
 *
 * @param {string|number|boolean|object|Buffer} body
 * @public
 */

res.send = function send(body) {
  var chunk = body;
  var encoding;
  var req = this.req;
  var type;

  // settings
  var app = this.app;

  // allow status / body
  if (arguments.length === 2) {
    // res.send(body, status) backwards compat
    if (typeof arguments[0] !== 'number' && typeof arguments[1] === 'number') {
      deprecate('res.send(body, status): Use res.status(status).send(body) instead');
      this.statusCode = arguments[1];
    } else {
      deprecate('res.send(status, body): Use res.status(status).send(body) instead');
      this.statusCode = arguments[0];
      chunk = arguments[1];
    }
  }

  // disambiguate res.send(status) and res.send(status, num)
  if (typeof chunk === 'number' && arguments.length === 1) {
    // res.send(status) will set status message as text string
    if (!this.get('Content-Type')) {
      this.type('txt');
    }

    deprecate('res.send(status): Use res.sendStatus(status) instead');
    this.statusCode = chunk;
    chunk = statuses[chunk]
  }

  switch (typeof chunk) {
    // string defaulting to html
    case 'string':
      if (!this.get('Content-Type')) {
        this.type('html');
      }
      break;
    case 'boolean':
    case 'number':
    case 'object':
      if (chunk === null) {
        chunk = '';
      } else if (Buffer.isBuffer(chunk)) {
        if (!this.get('Content-Type')) {
          this.type('bin');
        }
      } else {
        return this.json(chunk);
      }
      break;
  }

  // write strings in utf-8
  if (typeof chunk === 'string') {
    encoding = 'utf8';
    type = this.get('Content-Type');

    // reflect this in content-type
    if (typeof type === 'string') {
      this.set('Content-Type', setCharset(type, 'utf-8'));
    }
  }

  // determine if ETag should be generated
  var etagFn = app.get('etag fn')
  var generateETag = !this.get('ETag') && typeof etagFn === 'function'

  // populate Content-Length
  var len
  if (chunk !== undefined) {
    if (Buffer.isBuffer(chunk)) {
      // get length of Buffer
      len = chunk.length
    } else if (!generateETag && chunk.length < 1000) {
      // just calculate length when no ETag + small chunk
      len = Buffer.byteLength(chunk, encoding)
    } else {
      // convert chunk to Buffer and calculate
      chunk = Buffer.from(chunk, encoding)
      encoding = undefined;
      len = chunk.length
    }

    this.set('Content-Length', len);
  }

  // populate ETag
  var etag;
  if (generateETag && len !== undefined) {
    if ((etag = etagFn(chunk, encoding))) {
      this.set('ETag', etag);
    }
  }

  // freshness
  if (req.fresh) this.statusCode = 304;

  // strip irrelevant headers
  if (204 === this.statusCode || 304 === this.statusCode) {
    this.removeHeader('Content-Type');
    this.removeHeader('Content-Length');
    this.removeHeader('Transfer-Encoding');
    chunk = '';
  }

  if (req.method === 'HEAD') {
    // skip body for HEAD
    this.end();
  } else {
    // respond
    this.end(chunk, encoding);
  }

  return this;
};

/**
 * Send JSON response.
 *
 * Examples:
 *
 *     res.json(null);
 *     res.json({ user: 'tj' });
 *
 * @param {string|number|boolean|object} obj
 * @public
 */

res.json = function json(obj) {
  var val = obj;

  // allow status / body
  if (arguments.length === 2) {
    // res.json(body, status) backwards compat
    if (typeof arguments[1] === 'number') {
      deprecate('res.json(obj, status): Use res.status(status).json(obj) instead');
      this.statusCode = arguments[1];
    } else {
      deprecate('res.json(status, obj): Use res.status(status).json(obj) instead');
      this.statusCode = arguments[0];
      val = arguments[1];
    }
  }

  // settings
  var app = this.app;
  var escape = app.get('json escape')
  var replacer = app.get('json replacer');
  var spaces = app.get('json spaces');
  var body = stringify(val, replacer, spaces, escape)

  // content-type
  if (!this.get('Content-Type')) {
    this.set('Content-Type', 'application/json');
  }

  return this.send(body);
};

/**
 * Send JSON response with JSONP callback support.
 *
 * Examples:
 *
 *     res.jsonp(null);
 *     res.jsonp({ user: 'tj' });
 *
 * @param {string|number|boolean|object} obj
 * @public
 */

res.jsonp = function jsonp(obj) {
  var val = obj;

  // allow status / body
  if (arguments.length === 2) {
    // res.json(body, status) backwards compat
    if (typeof arguments[1] === 'number') {
      deprecate('res.jsonp(obj, status): Use res.status(status).json(obj) instead');
      this.statusCode = arguments[1];
    } else {
      deprecate('res.jsonp(status, obj): Use res.status(status).jsonp(obj) instead');
      this.statusCode = arguments[0];
      val = arguments[1];
    }
  }

  // settings
  var app = this.app;
  var escape = app.get('json escape')
  var replacer = app.get('json replacer');
  var spaces = app.get('json spaces');
  var body = stringify(val, replacer, spaces, escape)
  var callback = this.req.query[app.get('jsonp callback name')];

  // content-type
  if (!this.get('Content-Type')) {
    this.set('X-Content-Type-Options', 'nosniff');
    this.set('Content-Type', 'application/json');
  }

  // fixup callback
  if (Array.isArray(callback)) {
    callback = callback[0];
  }

  // jsonp
  if (typeof callback === 'string' && callback.length !== 0) {
    this.set('X-Content-Type-Options', 'nosniff');
    this.set('Content-Type', 'text/javascript');

    // restrict callback charset
    callback = callback.replace(/[^\[\]\w$.]/g, '');

    // replace chars not allowed in JavaScript that are in JSON
    body = body
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');

    // the /**/ is a specific security mitigation for "Rosetta Flash JSONP abuse"
    // the typeof check is just to reduce client error noise
    body = '/**/ typeof ' + callback + ' === \'function\' && ' + callback + '(' + body + ');';
  }

  return this.send(body);
};

/**
 * Send given HTTP status code.
 *
 * Sets the response status to `statusCode` and the body of the
 * response to the standard description from node's http.STATUS_CODES
 * or the statusCode number if no description.
 *
 * Examples:
 *
 *     res.sendStatus(200);
 *
 * @param {number} statusCode
 * @public
 */

res.sendStatus = function sendStatus(statusCode) {
  var body = statuses[statusCode] || String(statusCode)

  this.statusCode = statusCode;
  this.type('txt');

  return this.send(body);
};

/**
 * Transfer the file at the given `path`.
 *
 * Automatically sets the _Content-Type_ response header field.
 * The callback `callback(err)` is invoked when the transfer is complete
 * or when an error occurs. Be sure to check `res.sentHeader`
 * if you wish to attempt responding, as the header and some data
 * may have already been transferred.
 *
 * Options:
 *
 *   - `maxAge`   defaulting to 0 (can be string converted by `ms`)
 *   - `root`     root directory for relative filenames
 *   - `headers`  object of headers to serve with file
 *   - `dotfiles` serve dotfiles, defaulting to false; can be `"allow"` to send them
 *
 * Other options are passed along to `send`.
 *
 * Examples:
 *
 *  The following example illustrates how `res.sendFile()` may
 *  be used as an alternative for the `static()` middleware for
 *  dynamic situations. The code backing `res.sendFile()` is actually
 *  the same code, so HTTP cache support etc is identical.
 *
 *     app.get('/user/:uid/photos/:file', function(req, res){
 *       var uid = req.params.uid
 *         , file = req.params.file;
 *
 *       req.user.mayViewFilesFrom(uid, function(yes){
 *         if (yes) {
 *           res.sendFile('/uploads/' + uid + '/' + file);
 *         } else {
 *           res.send(403, 'Sorry! you cant see that.');
 *         }
 *       });
 *     });
 *
 * @public
 */

res.sendFile = function sendFile(path, options, callback) {
  var done = callback;
  var req = this.req;
  var res = this;
  var next = req.next;
  var opts = options || {};

  if (!path) {
    throw new TypeError('path argument is required to res.sendFile');
  }

  // support function as second arg
  if (typeof options === 'function') {
    done = options;
    opts = {};
  }

  if (!opts.root && !isAbsolute(path)) {
    throw new TypeError('path must be absolute or specify root to res.sendFile');
  }

  // create file stream
  var pathname = encodeURI(path);
  var file = send(req, pathname, opts);

  // transfer
  sendfile(res, file, opts, function (err) {
    if (done) return done(err);
    if (err && err.code === 'EISDIR') return next();

    // next() all but write errors
    if (err && err.code !== 'ECONNABORTED' && err.syscall !== 'write') {
      next(err);
    }
  });
};

/**
 * Transfer the file at the given `path`.
 *
 * Automatically sets the _Content-Type_ response header field.
 * The callback `callback(err)` is invoked when the transfer is complete
 * or when an error occurs. Be sure to check `res.sentHeader`
 * if you wish to attempt responding, as the header and some data
 * may have already been transferred.
 *
 * Options:
 *
 *   - `maxAge`   defaulting to 0 (can be string converted by `ms`)
 *   - `root`     root directory for relative filenames
 *   - `headers`  object of headers to serve with file
 *   - `dotfiles` serve dotfiles, defaulting to false; can be `"allow"` to send them
 *
 * Other options are passed along to `send`.
 *
 * Examples:
 *
 *  The following example illustrates how `res.sendfile()` may
 *  be used as an alternative for the `static()` middleware for
 *  dynamic situations. The code backing `res.sendfile()` is actually
 *  the same code, so HTTP cache support etc is identical.
 *
 *     app.get('/user/:uid/photos/:file', function(req, res){
 *       var uid = req.params.uid
 *         , file = req.params.file;
 *
 *       req.user.mayViewFilesFrom(uid, function(yes){
 *         if (yes) {
 *           res.sendfile('/uploads/' + uid + '/' + file);
 *         } else {
 *           res.send(403, 'Sorry! you cant see that.');
 *         }
 *       });
 *     });
 *
 * @public
 */

res.sendfile = function (path, options, callback) {
  var done = callback;
  var req = this.req;
  var res = this;
  var next = req.next;
  var opts = options || {};

  // support function as second arg
  if (typeof options === 'function') {
    done = options;
    opts = {};
  }

  // create file stream
  var file = send(req, path, opts);

  // transfer
  sendfile(res, file, opts, function (err) {
    if (done) return done(err);
    if (err && err.code === 'EISDIR') return next();

    // next() all but write errors
    if (err && err.code !== 'ECONNABORT' && err.syscall !== 'write') {
      next(err);
    }
  });
};

res.sendfile = deprecate.function(res.sendfile,
  'res.sendfile: Use res.sendFile instead');

/**
 * Transfer the file at the given `path` as an attachment.
 *
 * Optionally providing an alternate attachment `filename`,
 * and optional callback `callback(err)`. The callback is invoked
 * when the data transfer is complete, or when an error has
 * ocurred. Be sure to check `res.headersSent` if you plan to respond.
 *
 * Optionally providing an `options` object to use with `res.sendFile()`.
 * This function will set the `Content-Disposition` header, overriding
 * any `Content-Disposition` header passed as header options in order
 * to set the attachment and filename.
 *
 * This method uses `res.sendFile()`.
 *
 * @public
 */

res.download = function download (path, filename, options, callback) {
  var done = callback;
  var name = filename;
  var opts = options || null

  // support function as second or third arg
  if (typeof filename === 'function') {
    done = filename;
    name = null;
    opts = null
  } else if (typeof options === 'function') {
    done = options
    opts = null
  }

  // set Content-Disposition when file is sent
  var headers = {
    'Content-Disposition': contentDisposition(name || path)
  };

  // merge user-provided headers
  if (opts && opts.headers) {
    var keys = Object.keys(opts.headers)
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i]
      if (key.toLowerCase() !== 'content-disposition') {
        headers[key] = opts.headers[key]
      }
    }
  }

  // merge user-provided options
  opts = Object.create(opts)
  opts.headers = headers

  // Resolve the full path for sendFile
  var fullPath = resolve(path);

  // send file
  return this.sendFile(fullPath, opts, done)
};

/**
 * Set _Content-Type_ response header with `type` through `mime.lookup()`
 * when it does not contain "/", or set the Content-Type to `type` otherwise.
 *
 * Examples:
 *
 *     res.type('.html');
 *     res.type('html');
 *     res.type('json');
 *     res.type('application/json');
 *     res.type('png');
 *
 * @param {String} type
 * @return {ServerResponse} for chaining
 * @public
 */

res.contentType =
res.type = function contentType(type) {
  var ct = type.indexOf('/') === -1
    ? mime.lookup(type)
    : type;

  return this.set('Content-Type', ct);
};

/**
 * Respond to the Acceptable formats using an `obj`
 * of mime-type callbacks.
 *
 * This method uses `req.accepted`, an array of
 * acceptable types ordered by their quality values.
 * When "Accept" is not present the _first_ callback
 * is invoked, otherwise the first match is used. When
 * no match is performed the server responds with
 * 406 "Not Acceptable".
 *
 * Content-Type is set for you, however if you choose
 * you may alter this within the callback using `res.type()`
 * or `res.set('Content-Type', ...)`.
 *
 *    res.format({
 *      'text/plain': function(){
 *        res.send('hey');
 *      },
 *
 *      'text/html': function(){
 *        res.send('<p>hey</p>');
 *      },
 *
 *      'appliation/json': function(){
 *        res.send({ message: 'hey' });
 *      }
 *    });
 *
 * In addition to canonicalized MIME types you may
 * also use extnames mapped to these types:
 *
 *    res.format({
 *      text: function(){
 *        res.send('hey');
 *      },
 *
 *      html: function(){
 *        res.send('<p>hey</p>');
 *      },
 *
 *      json: function(){
 *        res.send({ message: 'hey' });
 *      }
 *    });
 *
 * By default Express passes an `Error`
 * with a `.status` of 406 to `next(err)`
 * if a match is not made. If you provide
 * a `.default` callback it will be invoked
 * instead.
 *
 * @param {Object} obj
 * @return {ServerResponse} for chaining
 * @public
 */

res.format = function(obj){
  var req = this.req;
  var next = req.next;

  var fn = obj.default;
  if (fn) delete obj.default;
  var keys = Object.keys(obj);

  var key = keys.length > 0
    ? req.accepts(keys)
    : false;

  this.vary("Accept");

  if (key) {
    this.set('Content-Type', normalizeType(key).value);
    obj[key](req, this, next);
  } else if (fn) {
    fn();
  } else {
    var err = new Error('Not Acceptable');
    err.status = err.statusCode = 406;
    err.types = normalizeTypes(keys).map(function(o){ return o.value });
    next(err);
  }

  return this;
};

/**
 * Set _Content-Disposition_ header to _attachment_ with optional `filename`.
 *
 * @param {String} filename
 * @return {ServerResponse}
 * @public
 */

res.attachment = function attachment(filename) {
  if (filename) {
    this.type(extname(filename));
  }

  this.set('Content-Disposition', contentDisposition(filename));

  return this;
};

/**
 * Append additional header `field` with value `val`.
 *
 * Example:
 *
 *    res.append('Link', ['<http://localhost/>', '<http://localhost:3000/>']);
 *    res.append('Set-Cookie', 'foo=bar; Path=/; HttpOnly');
 *    res.append('Warning', '199 Miscellaneous warning');
 *
 * @param {String} field
 * @param {String|Array} val
 * @return {ServerResponse} for chaining
 * @public
 */

res.append = function append(field, val) {
  var prev = this.get(field);
  var value = val;

  if (prev) {
    // concat the new and prev vals
    value = Array.isArray(prev) ? prev.concat(val)
      : Array.isArray(val) ? [prev].concat(val)
      : [prev, val];
  }

  return this.set(field, value);
};

/**
 * Set header `field` to `val`, or pass
 * an object of header fields.
 *
 * Examples:
 *
 *    res.set('Foo', ['bar', 'baz']);
 *    res.set('Accept', 'application/json');
 *    res.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
 *
 * Aliased as `res.header()`.
 *
 * @param {String|Object} field
 * @param {String|Array} val
 * @return {ServerResponse} for chaining
 * @public
 */

res.set =
res.header = function header(field, val) {
  if (arguments.length === 2) {
    var value = Array.isArray(val)
      ? val.map(String)
      : String(val);

    // add charset to content-type
    if (field.toLowerCase() === 'content-type') {
      if (Array.isArray(value)) {
        throw new TypeError('Content-Type cannot be set to an Array');
      }
      if (!charsetRegExp.test(value)) {
        var charset = mime.charsets.lookup(value.split(';')[0]);
        if (charset) value += '; charset=' + charset.toLowerCase();
      }
    }

    this.setHeader(field, value);
  } else {
    for (var key in field) {
      this.set(key, field[key]);
    }
  }
  return this;
};

/**
 * Get value for header `field`.
 *
 * @param {String} field
 * @return {String}
 * @public
 */

res.get = function(field){
  return this.getHeader(field);
};

/**
 * Clear cookie `name`.
 *
 * @param {String} name
 * @param {Object} [options]
 * @return {ServerResponse} for chaining
 * @public
 */

res.clearCookie = function clearCookie(name, options) {
  var opts = merge({ expires: new Date(1), path: '/' }, options);

  return this.cookie(name, '', opts);
};

/**
 * Set cookie `name` to `value`, with the given `options`.
 *
 * Options:
 *
 *    - `maxAge`   max-age in milliseconds, converted to `expires`
 *    - `signed`   sign the cookie
 *    - `path`     defaults to "/"
 *
 * Examples:
 *
 *    // "Remember Me" for 15 minutes
 *    res.cookie('rememberme', '1', { expires: new Date(Date.now() + 900000), httpOnly: true });
 *
 *    // save as above
 *    res.cookie('rememberme', '1', { maxAge: 900000, httpOnly: true })
 *
 * @param {String} name
 * @param {String|Object} value
 * @param {Object} [options]
 * @return {ServerResponse} for chaining
 * @public
 */

res.cookie = function (name, value, options) {
  var opts = merge({}, options);
  var secret = this.req.secret;
  var signed = opts.signed;

  if (signed && !secret) {
    throw new Error('cookieParser("secret") required for signed cookies');
  }

  var val = typeof value === 'object'
    ? 'j:' + JSON.stringify(value)
    : String(value);

  if (signed) {
    val = 's:' + sign(val, secret);
  }

  if ('maxAge' in opts) {
    opts.expires = new Date(Date.now() + opts.maxAge);
    opts.maxAge /= 1000;
  }

  if (opts.path == null) {
    opts.path = '/';
  }

  this.append('Set-Cookie', cookie.serialize(name, String(val), opts));

  return this;
};

/**
 * Set the location header to `url`.
 *
 * The given `url` can also be "back", which redirects
 * to the _Referrer_ or _Referer_ headers or "/".
 *
 * Examples:
 *
 *    res.location('/foo/bar').;
 *    res.location('http://example.com');
 *    res.location('../login');
 *
 * @param {String} url
 * @return {ServerResponse} for chaining
 * @public
 */

res.location = function location(url) {
  var loc = url;

  // "back" is an alias for the referrer
  if (url === 'back') {
    loc = this.req.get('Referrer') || '/';
  }

  // set location
  return this.set('Location', encodeUrl(loc));
};

/**
 * Redirect to the given `url` with optional response `status`
 * defaulting to 302.
 *
 * The resulting `url` is determined by `res.location()`, so
 * it will play nicely with mounted apps, relative paths,
 * `"back"` etc.
 *
 * Examples:
 *
 *    res.redirect('/foo/bar');
 *    res.redirect('http://example.com');
 *    res.redirect(301, 'http://example.com');
 *    res.redirect('../login'); // /blog/post/1 -> /blog/login
 *
 * @public
 */

res.redirect = function redirect(url) {
  var address = url;
  var body;
  var status = 302;

  // allow status / url
  if (arguments.length === 2) {
    if (typeof arguments[0] === 'number') {
      status = arguments[0];
      address = arguments[1];
    } else {
      deprecate('res.redirect(url, status): Use res.redirect(status, url) instead');
      status = arguments[1];
    }
  }

  // Set location header
  address = this.location(address).get('Location');

  // Support text/{plain,html} by default
  this.format({
    text: function(){
      body = statuses[status] + '. Redirecting to ' + address
    },

    html: function(){
      var u = escapeHtml(address);
      body = '<p>' + statuses[status] + '. Redirecting to <a href="' + u + '">' + u + '</a></p>'
    },

    default: function(){
      body = '';
    }
  });

  // Respond
  this.statusCode = status;
  this.set('Content-Length', Buffer.byteLength(body));

  if (this.req.method === 'HEAD') {
    this.end();
  } else {
    this.end(body);
  }
};

/**
 * Add `field` to Vary. If already present in the Vary set, then
 * this call is simply ignored.
 *
 * @param {Array|String} field
 * @return {ServerResponse} for chaining
 * @public
 */

res.vary = function(field){
  // checks for back-compat
  if (!field || (Array.isArray(field) && !field.length)) {
    deprecate('res.vary(): Provide a field name');
    return this;
  }

  vary(this, field);

  return this;
};

/**
 * Render `view` with the given `options` and optional callback `fn`.
 * When a callback function is given a response will _not_ be made
 * automatically, otherwise a response of _200_ and _text/html_ is given.
 *
 * Options:
 *
 *  - `cache`     boolean hinting to the engine it should cache
 *  - `filename`  filename of the view being rendered
 *
 * @public
 */

res.render = function render(view, options, callback) {
  var app = this.req.app;
  var done = callback;
  var opts = options || {};
  var req = this.req;
  var self = this;

  // support callback function as second arg
  if (typeof options === 'function') {
    done = options;
    opts = {};
  }

  // merge res.locals
  opts._locals = self.locals;

  // default callback to respond
  done = done || function (err, str) {
    if (err) return req.next(err);
    self.send(str);
  };

  // render
  app.render(view, opts, done);
};

// pipe the send file stream
function sendfile(res, file, options, callback) {
  var done = false;
  var streaming;

  // request aborted
  function onaborted() {
    if (done) return;
    done = true;

    var err = new Error('Request aborted');
    err.code = 'ECONNABORTED';
    callback(err);
  }

  // directory
  function ondirectory() {
    if (done) return;
    done = true;

    var err = new Error('EISDIR, read');
    err.code = 'EISDIR';
    callback(err);
  }

  // errors
  function onerror(err) {
    if (done) return;
    done = true;
    callback(err);
  }

  // ended
  function onend() {
    if (done) return;
    done = true;
    callback();
  }

  // file
  function onfile() {
    streaming = false;
  }

  // finished
  function onfinish(err) {
    if (err && err.code === 'ECONNRESET') return onaborted();
    if (err) return onerror(err);
    if (done) return;

    setImmediate(function () {
      if (streaming !== false && !done) {
        onaborted();
        return;
      }

      if (done) return;
      done = true;
      callback();
    });
  }

  // streaming
  function onstream() {
    streaming = true;
  }

  file.on('directory', ondirectory);
  file.on('end', onend);
  file.on('error', onerror);
  file.on('file', onfile);
  file.on('stream', onstream);
  onFinished(res, onfinish);

  if (options.headers) {
    // set headers on successful transfer
    file.on('headers', function headers(res) {
      var obj = options.headers;
      var keys = Object.keys(obj);

      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        res.setHeader(k, obj[k]);
      }
    });
  }

  // pipe
  file.pipe(res);
}

/**
 * Stringify JSON, like JSON.stringify, but v8 optimized, with the
 * ability to escape characters that can trigger HTML sniffing.
 *
 * @param {*} value
 * @param {function} replaces
 * @param {number} spaces
 * @param {boolean} escape
 * @returns {string}
 * @private
 */

function stringify (value, replacer, spaces, escape) {
  // v8 checks arguments.length for optimizing simple call
  // https://bugs.chromium.org/p/v8/issues/detail?id=4730
  var json = replacer || spaces
    ? JSON.stringify(value, replacer, spaces)
    : JSON.stringify(value);

  if (escape) {
    json = json.replace(/[<>&]/g, function (c) {
      switch (c.charCodeAt(0)) {
        case 0x3c:
          return '\\u003c'
        case 0x3e:
          return '\\u003e'
        case 0x26:
          return '\\u0026'
        default:
          return c
      }
    })
  }

  return json
}


/***/ }),
/* 82 */
/***/ (function(module, exports) {

module.exports = require("encodeurl");

/***/ }),
/* 83 */
/***/ (function(module, exports) {

module.exports = require("escape-html");

/***/ }),
/* 84 */
/***/ (function(module, exports) {

module.exports = require("statuses");

/***/ }),
/* 85 */
/***/ (function(module, exports) {

module.exports = require("cookie-signature");

/***/ }),
/* 86 */
/***/ (function(module, exports) {

module.exports = require("cookie");

/***/ }),
/* 87 */
/***/ (function(module, exports) {

module.exports = require("vary");

/***/ }),
/* 88 */
/***/ (function(module, exports) {

module.exports = require("serve-static");

/***/ }),
/* 89 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


//posting notes to backend and storing in db
module.exports = function (app, mongoUrl) {

    var MongoDB = __webpack_require__(31).MongoClient;

    app.post('/notes', function (req, res) {
        //posting the note just fine, just not receiving the note text (says undefined)
        //not getting note text for some reason?? only returning the date...

        //send response to append note to page
        //store note data in db

        var noteData = {
            text: req.body.name,
            date: new Date().toDateString()
        };

        MongoDB.connect(mongoUrl, function (err, db) {

            var notesCollection = db.collection('notes');
            notesCollection.insert(noteData);
            db.close();
        });

        res.status(201).send(noteData);
    });
};

//C:\Program Files\MongoDB\Server\3.4\bin

/***/ }),
/* 90 */
/***/ (function(module, exports, __webpack_require__) {

var EventEmitter = __webpack_require__(8).EventEmitter,
  inherits = __webpack_require__(2).inherits;

// Get prototypes
var AggregationCursor = __webpack_require__(12),
  CommandCursor = __webpack_require__(11),
  OrderedBulkOperation = __webpack_require__(32).OrderedBulkOperation,
  UnorderedBulkOperation = __webpack_require__(33).UnorderedBulkOperation,
  GridStore = __webpack_require__(51),
  Cursor = __webpack_require__(7),
  Collection = __webpack_require__(23),
  Db = __webpack_require__(34);

var basicOperationIdGenerator = {
  operationId: 1,

  next: function() {
    return this.operationId++;
  }
}

var basicTimestampGenerator = {
  current: function() {
    return new Date().getTime();
  },

  duration: function(start, end) {
    return end - start;
  }
}

var senstiveCommands = ['authenticate', 'saslStart', 'saslContinue', 'getnonce',
  'createUser', 'updateUser', 'copydbgetnonce', 'copydbsaslstart', 'copydb'];

var Instrumentation = function(core, options, callback) {
  options = options || {};

  // Optional id generators
  var operationIdGenerator = options.operationIdGenerator || basicOperationIdGenerator;
  // Optional timestamp generator
  var timestampGenerator = options.timestampGenerator || basicTimestampGenerator;
  // Extend with event emitter functionality
  EventEmitter.call(this);

  // Contains all the instrumentation overloads
  this.overloads = [];

  // ---------------------------------------------------------
  //
  // Instrument prototype
  //
  // ---------------------------------------------------------

  var instrumentPrototype = function(callback) {
    var instrumentations = []

    // Classes to support
    var classes = [GridStore, OrderedBulkOperation, UnorderedBulkOperation,
      CommandCursor, AggregationCursor, Cursor, Collection, Db];

    // Add instrumentations to the available list
    for(var i = 0; i < classes.length; i++) {
      if(classes[i].define) {
        instrumentations.push(classes[i].define.generate());
      }
    }

    // Return the list of instrumentation points
    callback(null, instrumentations);
  }

  // Did the user want to instrument the prototype
  if(typeof callback == 'function') {
    instrumentPrototype(callback);
  }

  // ---------------------------------------------------------
  //
  // Server
  //
  // ---------------------------------------------------------

  // Reference
  var self = this;
  // Names of methods we need to wrap
  var methods = ['command', 'insert', 'update', 'remove'];
  // Prototype
  var proto = core.Server.prototype;
  // Core server method we are going to wrap
  methods.forEach(function(x) {
    var func = proto[x];

    // Add to overloaded methods
    self.overloads.push({proto: proto, name:x, func:func});

    // The actual prototype
    proto[x] = function() {
      var requestId = core.Query.nextRequestId();
      // Get the arguments
      var args = Array.prototype.slice.call(arguments, 0);
      var ns = args[0];
      var commandObj = args[1];
      var options = args[2] || {};
      var keys = Object.keys(commandObj);
      var commandName = keys[0];
      var db = ns.split('.')[0];

      // Get the collection
      var col = ns.split('.');
      col.shift();
      col = col.join('.');

      // Do we have a legacy insert/update/remove command
      if(x == 'insert') { //} && !this.lastIsMaster().maxWireVersion) {
        commandName = 'insert';

        // Re-write the command
        commandObj = {
          insert: col, documents: commandObj
        }

        if(options.writeConcern && Object.keys(options.writeConcern).length > 0)  {
          commandObj.writeConcern = options.writeConcern;
        }

        commandObj.ordered = options.ordered != undefined ? options.ordered : true;
      } else if(x == 'update') { // && !this.lastIsMaster().maxWireVersion) {
        commandName = 'update';

        // Re-write the command
        commandObj = {
          update: col, updates: commandObj
        }

        if(options.writeConcern && Object.keys(options.writeConcern).length > 0) {
          commandObj.writeConcern = options.writeConcern;
        }

        commandObj.ordered = options.ordered != undefined ? options.ordered : true;
      } else if(x == 'remove') { //&& !this.lastIsMaster().maxWireVersion) {
        commandName = 'delete';

        // Re-write the command
        commandObj = {
          delete: col, deletes: commandObj
        }

        if(options.writeConcern && Object.keys(options.writeConcern).length > 0) {
          commandObj.writeConcern = options.writeConcern;
        }

        commandObj.ordered = options.ordered != undefined ? options.ordered : true;
      }

      // Get the callback
      var callback = args.pop();
      // Set current callback operation id from the current context or create
      // a new one
      var ourOpId = callback.operationId || operationIdGenerator.next();

      // Get a connection reference for this server instance
      var connection = this.s.pool.get()

      // Emit the start event for the command
      var command = {
        // Returns the command.
        command: commandObj,
        // Returns the database name.
        databaseName: db,
        // Returns the command name.
        commandName: commandName,
        // Returns the driver generated request id.
        requestId: requestId,
        // Returns the driver generated operation id.
        // This is used to link events together such as bulk write operations. OPTIONAL.
        operationId: ourOpId,
        // Returns the connection id for the command. For languages that do not have this,
        // this MUST return the driver equivalent which MUST include the server address and port.
        // The name of this field is flexible to match the object that is returned from the driver.
        connectionId: connection
      };

      // Filter out any sensitive commands
      if(senstiveCommands.indexOf(commandName.toLowerCase()) != -1) {
        command.commandObj = {};
        command.commandObj[commandName] = true;
      }

      // Emit the started event
      self.emit('started', command)

      // Start time
      var startTime = timestampGenerator.current();

      // Push our handler callback
      args.push(function(err, r) {
        var endTime = timestampGenerator.current();
        var command = {
          duration: timestampGenerator.duration(startTime, endTime),
          commandName: commandName,
          requestId: requestId,
          operationId: ourOpId,
          connectionId: connection
        };

        // If we have an error
        if(err || (r && r.result && r.result.ok == 0)) {
          command.failure = err || r.result.writeErrors || r.result;

          // Filter out any sensitive commands
          if(senstiveCommands.indexOf(commandName.toLowerCase()) != -1) {
            command.failure = {};
          }

          self.emit('failed', command);
        } else if(commandObj && commandObj.writeConcern
          && commandObj.writeConcern.w == 0) {
          // If we have write concern 0
          command.reply = {ok:1};
          self.emit('succeeded', command);
        } else {
          command.reply = r && r.result ? r.result : r;

          // Filter out any sensitive commands
          if(senstiveCommands.indexOf(commandName.toLowerCase()) != -1) {
            command.reply = {};
          }

          self.emit('succeeded', command);
        }

        // Return to caller
        callback(err, r);
      });

      // Apply the call
      func.apply(this, args);
    }
  });

  // ---------------------------------------------------------
  //
  // Bulk Operations
  //
  // ---------------------------------------------------------

  // Inject ourselves into the Bulk methods
  methods = ['execute'];
  var prototypes = [
    __webpack_require__(32).Bulk.prototype,
    __webpack_require__(33).Bulk.prototype
  ]

  prototypes.forEach(function(proto) {
    // Core server method we are going to wrap
    methods.forEach(function(x) {
      var func = proto[x];

      // Add to overloaded methods
      self.overloads.push({proto: proto, name:x, func:func});

      // The actual prototype
      proto[x] = function() {
        // Get the arguments
        var args = Array.prototype.slice.call(arguments, 0);
        // Set an operation Id on the bulk object
        this.operationId = operationIdGenerator.next();

        // Get the callback
        var callback = args.pop();
        // If we have a callback use this
        if(typeof callback == 'function') {
          args.push(function(err, r) {
            // Return to caller
            callback(err, r);
          });

          // Apply the call
          func.apply(this, args);
        } else {
          return func.apply(this, args);
        }
      }
    });
  });

  // ---------------------------------------------------------
  //
  // Cursor
  //
  // ---------------------------------------------------------

  // Inject ourselves into the Cursor methods
  methods = ['_find', '_getmore', '_killcursor'];
  prototypes = [
    __webpack_require__(7).prototype,
    __webpack_require__(11).prototype,
    __webpack_require__(12).prototype
  ]

  // Command name translation
  var commandTranslation = {
    '_find': 'find', '_getmore': 'getMore', '_killcursor': 'killCursors', '_explain': 'explain'
  }

  prototypes.forEach(function(proto) {

    // Core server method we are going to wrap
    methods.forEach(function(x) {
      var func = proto[x];

      // Add to overloaded methods
      self.overloads.push({proto: proto, name:x, func:func});

      // The actual prototype
      proto[x] = function() {
        var cursor = this;
        var requestId = core.Query.nextRequestId();
        var ourOpId = operationIdGenerator.next();
        var parts = this.ns.split('.');
        var db = parts[0];

        // Get the collection
        parts.shift();
        var collection = parts.join('.');

        // Set the command
        var command = this.query;
        var cmd = this.s.cmd;

        // If we have a find method, set the operationId on the cursor
        if(x == '_find') {
          cursor.operationId = ourOpId;
        }

        // Do we have a find command rewrite it
        if(x == '_getmore') {
          command = {
            getMore: this.cursorState.cursorId,
            collection: collection,
            batchSize: cmd.batchSize
          }

          if(cmd.maxTimeMS) command.maxTimeMS = cmd.maxTimeMS;
        } else if(x == '_killcursor') {
          command = {
            killCursors: collection,
            cursors: [this.cursorState.cursorId]
          }
        } else if(cmd.find) {
          command = {
            find: collection, filter: cmd.query
          }

          if(cmd.sort) command.sort = cmd.sort;
          if(cmd.fields) command.projection = cmd.fields;
          if(cmd.limit && cmd.limit < 0) {
            command.limit = Math.abs(cmd.limit);
            command.singleBatch = true;
          } else if(cmd.limit) {
            command.limit = Math.abs(cmd.limit);
          }

          // Options
          if(cmd.skip) command.skip = cmd.skip;
          if(cmd.hint) command.hint = cmd.hint;
          if(cmd.batchSize) command.batchSize = cmd.batchSize;
          if(typeof cmd.returnKey == 'boolean') command.returnKey = cmd.returnKey;
          if(cmd.comment) command.comment = cmd.comment;
          if(cmd.min) command.min = cmd.min;
          if(cmd.max) command.max = cmd.max;
          if(cmd.maxScan) command.maxScan = cmd.maxScan;
          if(cmd.maxTimeMS) command.maxTimeMS = cmd.maxTimeMS;

          // Flags
          if(typeof cmd.awaitData == 'boolean') command.awaitData = cmd.awaitData;
          if(typeof cmd.snapshot == 'boolean') command.snapshot = cmd.snapshot;
          if(typeof cmd.tailable == 'boolean') command.tailable = cmd.tailable;
          if(typeof cmd.oplogReplay == 'boolean') command.oplogReplay = cmd.oplogReplay;
          if(typeof cmd.noCursorTimeout == 'boolean') command.noCursorTimeout = cmd.noCursorTimeout;
          if(typeof cmd.partial == 'boolean') command.partial = cmd.partial;
          if(typeof cmd.showDiskLoc == 'boolean') command.showRecordId = cmd.showDiskLoc;

          // Read Concern
          if(cmd.readConcern) command.readConcern = cmd.readConcern;

          // Override method
          if(cmd.explain) command.explain = cmd.explain;
          if(cmd.exhaust) command.exhaust = cmd.exhaust;

          // If we have a explain flag
          if(cmd.explain) {
            // Create fake explain command
            command = {
              explain: command,
              verbosity: 'allPlansExecution'
            }

            // Set readConcern on the command if available
            if(cmd.readConcern) command.readConcern = cmd.readConcern

            // Set up the _explain name for the command
            x = '_explain';
          }
        } else {
          command = cmd;
        }

        // Set up the connection
        var connectionId = null;

        // Set local connection
        if(this.connection) connectionId = this.connection;
        if(!connectionId && this.server && this.server.getConnection) connectionId = this.server.getConnection();

        // Get the command Name
        var commandName = x == '_find' ? Object.keys(command)[0] : commandTranslation[x];

        // Emit the start event for the command
        command = {
          // Returns the command.
          command: command,
          // Returns the database name.
          databaseName: db,
          // Returns the command name.
          commandName: commandName,
          // Returns the driver generated request id.
          requestId: requestId,
          // Returns the driver generated operation id.
          // This is used to link events together such as bulk write operations. OPTIONAL.
          operationId: this.operationId,
          // Returns the connection id for the command. For languages that do not have this,
          // this MUST return the driver equivalent which MUST include the server address and port.
          // The name of this field is flexible to match the object that is returned from the driver.
          connectionId: connectionId
        };

        // Get the arguments
        var args = Array.prototype.slice.call(arguments, 0);

        // Get the callback
        var callback = args.pop();

        // We do not have a callback but a Promise
        if(typeof callback == 'function' || command.commandName == 'killCursors') {
          var startTime = timestampGenerator.current();
          // Emit the started event
          self.emit('started', command)

          // Emit succeeded event with killcursor if we have a legacy protocol
          if(command.commandName == 'killCursors'
            && this.server.lastIsMaster()
            && this.server.lastIsMaster().maxWireVersion < 4) {
            // Emit the succeeded command
            command = {
              duration: timestampGenerator.duration(startTime, timestampGenerator.current()),
              commandName: commandName,
              requestId: requestId,
              operationId: cursor.operationId,
              connectionId: cursor.server.getConnection(),
              reply: [{ok:1}]
            };

            // Apply callback to the list of args
            args.push(callback);
            // Apply the call
            func.apply(this, args);
            // Emit the command
            return self.emit('succeeded', command)
          }

          // Add our callback handler
          args.push(function(err, r) {
            if(err) {
              // Command
              var command = {
                duration: timestampGenerator.duration(startTime, timestampGenerator.current()),
                commandName: commandName,
                requestId: requestId,
                operationId: ourOpId,
                connectionId: cursor.server.getConnection(),
                failure: err };

              // Emit the command
              self.emit('failed', command)
            } else {
              // Do we have a getMore
              if(commandName.toLowerCase() == 'getmore' && r == null) {
                r = {
                  cursor: {
                    id: cursor.cursorState.cursorId,
                    ns: cursor.ns,
                    nextBatch: cursor.cursorState.documents
                  }, ok:1
                }
              } else if((commandName.toLowerCase() == 'find'
                || commandName.toLowerCase() == 'aggregate'
                || commandName.toLowerCase() == 'listcollections') && r == null) {
                r = {
                  cursor: {
                    id: cursor.cursorState.cursorId,
                    ns: cursor.ns,
                    firstBatch: cursor.cursorState.documents
                  }, ok:1
                }
              } else if(commandName.toLowerCase() == 'killcursors' && r == null) {
                r = {
                  cursorsUnknown:[cursor.cursorState.lastCursorId],
                  ok:1
                }
              }

              // cursor id is zero, we can issue success command
              command = {
                duration: timestampGenerator.duration(startTime, timestampGenerator.current()),
                commandName: commandName,
                requestId: requestId,
                operationId: cursor.operationId,
                connectionId: cursor.server.getConnection(),
                reply: r && r.result ? r.result : r
              };

              // Emit the command
              self.emit('succeeded', command)
            }

            // Return
            if(!callback) return;

            // Return to caller
            callback(err, r);
          });

          // Apply the call
          func.apply(this, args);
        } else {
          // Assume promise, push back the missing value
          args.push(callback);
          // Get the promise
          var promise = func.apply(this, args);
          // Return a new promise
          return new cursor.s.promiseLibrary(function(resolve, reject) {
            var startTime = timestampGenerator.current();
            // Emit the started event
            self.emit('started', command)
            // Execute the function
            promise.then(function() {
              // cursor id is zero, we can issue success command
              var command = {
                duration: timestampGenerator.duration(startTime, timestampGenerator.current()),
                commandName: commandName,
                requestId: requestId,
                operationId: cursor.operationId,
                connectionId: cursor.server.getConnection(),
                reply: cursor.cursorState.documents
              };

              // Emit the command
              self.emit('succeeded', command)
            }).catch(function(err) {
              // Command
              var command = {
                duration: timestampGenerator.duration(startTime, timestampGenerator.current()),
                commandName: commandName,
                requestId: requestId,
                operationId: ourOpId,
                connectionId: cursor.server.getConnection(),
                failure: err };

              // Emit the command
              self.emit('failed', command)
              // reject the promise
              reject(err);
            });
          });
        }
      }
    });
  });
}

inherits(Instrumentation, EventEmitter);

Instrumentation.prototype.uninstrument = function() {
  for(var i = 0; i < this.overloads.length; i++) {
    var obj = this.overloads[i];
    obj.proto[obj.name] = obj.func;
  }

  // Remove all listeners
  this.removeAllListeners('started');
  this.removeAllListeners('succeeded');
  this.removeAllListeners('failed');
}

module.exports = Instrumentation;


/***/ }),
/* 91 */
/***/ (function(module, exports) {

module.exports = require("buffer");

/***/ }),
/* 92 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var ReadPreference = __webpack_require__(5),
  parser = __webpack_require__(93),
  f = __webpack_require__(2).format,
  assign = __webpack_require__(0).assign,
  dns = __webpack_require__(94);

module.exports = function(url, options, callback) {
  if (typeof options === 'function') (callback = options), (options = {});
  options = options || {};

  var result = parser.parse(url, true);
  if (result.protocol !== 'mongodb:' && result.protocol !== 'mongodb+srv:') {
    return callback(new Error('invalid schema, expected mongodb or mongodb+srv'));
  }

  if (result.protocol === 'mongodb+srv:') {

    if (result.hostname.split('.').length < 3) {
      return callback(new Error('uri does not have hostname, domainname and tld'));
    }

    result.domainLength = result.hostname.split('.').length;

    if (result.pathname && result.pathname.match(',')) {
      return callback(new Error('invalid uri, cannot contain multiple hostnames'));
    }

    if (result.port) {
      return callback(new Error('Ports not accepted with mongodb+srv'));
    }

    var srvAddress = '_mongodb._tcp.' + result.host;
    dns.resolveSrv(srvAddress, function(err, addresses) {
      if (err) return callback(err);

      if (addresses.length === 0) {
        return callback(new Error('No addresses found at host'));
      }

      for (var i = 0; i < addresses.length; i++) {
        if (!matchesParentDomain(addresses[i].name, result.hostname, result.domainLength)) {
          return callback(new Error('srv record does not share hostname with parent uri'));
        }
      }

      var base = result.auth ? 'mongodb://' + result.auth + '@' : 'mongodb://';
      var connectionStrings = addresses.map(function(address, i) {
        if (i === 0) return base + address.name + ':' + address.port;
        else return address.name + ':' + address.port;
      });

      var connectionString = connectionStrings.join(',') + '/';
      var connectionStringOptions = [];

      // Default to SSL true
      if (!options.ssl && !result.search) {
        connectionStringOptions.push('ssl=true');
      } else if (!options.ssl && result.search && !result.search.match('ssl')) {
        connectionStringOptions.push('ssl=true');
      }

      // Keep original uri options
      if (result.search) {
        connectionStringOptions.push(result.search.replace('?', ''));
      }

      dns.resolveTxt(result.host, function(err, record) {
        if (err && err.code !== 'ENODATA') return callback(err);
        if (err && err.code === 'ENODATA') record = null;

        if (record) {
          if (record.length > 1) {
            return callback(new Error('multiple text records not allowed'));
          }

          record = record[0];
          if (record.length > 1) record = record.join('');
          else record = record[0];

          if (!record.includes('authSource') && !record.includes('replicaSet')) {
            return callback(new Error('text record must only set `authSource` or `replicaSet`'));
          }

          connectionStringOptions.push(record);
        }

        // Add any options to the connection string
        if (connectionStringOptions.length) {
          connectionString += '?' + connectionStringOptions.join('&');
        }

        parseHandler(connectionString, options, callback);
      });
    });
  } else {
    parseHandler(url, options, callback);
  }
};

function matchesParentDomain(srvAddress, parentDomain) {
  var regex = /^.*?\./;
  var srv = '.' + srvAddress.replace(regex, '');
  var parent = '.' + parentDomain.replace(regex, '');
  if (srv.endsWith(parent)) return true;
  else return false;
}

function parseHandler(address, options, callback) {
  var result, err;
  try {
    result = parseConnectionString(address, options);
  } catch (e) {
    err = e;
  }

  return err ? callback(err, null) : callback(null, result);
}

function parseConnectionString(url, options) {
  // Variables
  var connection_part = '';
  var auth_part = '';
  var query_string_part = '';
  var dbName = 'admin';

  // Url parser result
  var result = parser.parse(url, true);

  if((result.hostname == null || result.hostname == '') && url.indexOf('.sock') == -1) {
    throw new Error('no hostname or hostnames provided in connection string');
  }

  if(result.port == '0') {
    throw new Error('invalid port (zero) with hostname');
  }

  if(!isNaN(parseInt(result.port, 10)) && parseInt(result.port, 10) > 65535) {
    throw new Error('invalid port (larger than 65535) with hostname');
  }

  if(result.path
    && result.path.length > 0
    && result.path[0] != '/'
    && url.indexOf('.sock') == -1) {
    throw new Error('missing delimiting slash between hosts and options');
  }

  if(result.query) {
    for(var name in result.query) {
      if(name.indexOf('::') != -1) {
        throw new Error('double colon in host identifier');
      }

      if(result.query[name] == '') {
        throw new Error('query parameter ' + name + ' is an incomplete value pair');
      }
    }
  }

  if(result.auth) {
    var parts = result.auth.split(':');
    if(url.indexOf(result.auth) != -1 && parts.length > 2) {
      throw new Error('Username with password containing an unescaped colon');
    }

    if(url.indexOf(result.auth) != -1 && result.auth.indexOf('@') != -1) {
      throw new Error('Username containing an unescaped at-sign');
    }
  }

  // Remove query
  var clean = url.split('?').shift();

  // Extract the list of hosts
  var strings = clean.split(',');
  var hosts = [];

  for(var i = 0; i < strings.length; i++) {
    var hostString = strings[i];

    if(hostString.indexOf('mongodb') != -1) {
      if(hostString.indexOf('@') != -1) {
        hosts.push(hostString.split('@').pop())
      } else {
        hosts.push(hostString.substr('mongodb://'.length));
      }
    } else if(hostString.indexOf('/') != -1) {
      hosts.push(hostString.split('/').shift());
    } else if(hostString.indexOf('/') == -1) {
      hosts.push(hostString.trim());
    }
  }

  for(i = 0; i < hosts.length; i++) {
    var r = parser.parse(f('mongodb://%s', hosts[i].trim()));
    if(r.path && r.path.indexOf(':') != -1) {
      // Not connecting to a socket so check for an extra slash in the hostname.
      // Using String#split as perf is better than match.
      if (r.path.split('/').length > 1) {
        throw new Error('slash in host identifier');
      } else {
        throw new Error('double colon in host identifier');
      }
    }
  }

  // If we have a ? mark cut the query elements off
  if(url.indexOf("?") != -1) {
    query_string_part = url.substr(url.indexOf("?") + 1);
    connection_part = url.substring("mongodb://".length, url.indexOf("?"))
  } else {
    connection_part = url.substring("mongodb://".length);
  }

  // Check if we have auth params
  if(connection_part.indexOf("@") != -1) {
    auth_part = connection_part.split("@")[0];
    connection_part = connection_part.split("@")[1];
  }

  // Check if the connection string has a db
  if(connection_part.indexOf(".sock") != -1) {
    if(connection_part.indexOf(".sock/") != -1) {
      dbName = connection_part.split(".sock/")[1];
      // Check if multiple database names provided, or just an illegal trailing backslash
      if (dbName.indexOf("/") != -1) {
        if (dbName.split("/").length == 2 && dbName.split("/")[1].length == 0) {
          throw new Error('Illegal trailing backslash after database name');
        }
        throw new Error('More than 1 database name in URL');
      }
      connection_part = connection_part.split("/", connection_part.indexOf(".sock") + ".sock".length);
    }
  } else if(connection_part.indexOf("/") != -1) {
    // Check if multiple database names provided, or just an illegal trailing backslash
    if (connection_part.split("/").length > 2) {
      if (connection_part.split("/")[2].length == 0) {
        throw new Error('Illegal trailing backslash after database name');
      }
      throw new Error('More than 1 database name in URL');
    }
    dbName = connection_part.split("/")[1];
    connection_part = connection_part.split("/")[0];
  }

  // Result object
  var object = {};

  // Pick apart the authentication part of the string
  var authPart = auth_part || '';
  var auth = authPart.split(':', 2);

  // Decode the URI components
  auth[0] = decodeURIComponent(auth[0]);
  if(auth[1]){
    auth[1] = decodeURIComponent(auth[1]);
  }

  // Add auth to final object if we have 2 elements
  if(auth.length == 2) object.auth = {user: auth[0], password: auth[1]};
  // if user provided auth options, use that
  if(options && options.auth != null) object.auth = options.auth;

  // Variables used for temporary storage
  var hostPart;
  var urlOptions;
  var servers;
  var serverOptions = {socketOptions: {}};
  var dbOptions = {read_preference_tags: []};
  var replSetServersOptions = {socketOptions: {}};
  var mongosOptions = {socketOptions: {}};
  // Add server options to final object
  object.server_options = serverOptions;
  object.db_options = dbOptions;
  object.rs_options = replSetServersOptions;
  object.mongos_options = mongosOptions;

  // Let's check if we are using a domain socket
  if(url.match(/\.sock/)) {
    // Split out the socket part
    var domainSocket = url.substring(
        url.indexOf("mongodb://") + "mongodb://".length
      , url.lastIndexOf(".sock") + ".sock".length);
    // Clean out any auth stuff if any
    if(domainSocket.indexOf("@") != -1) domainSocket = domainSocket.split("@")[1];
    servers = [{domain_socket: domainSocket}];
  } else {
    // Split up the db
    hostPart = connection_part;
    // Deduplicate servers
    var deduplicatedServers = {};

    // Parse all server results
    servers = hostPart.split(',').map(function(h) {
      var _host, _port, ipv6match;
      //check if it matches [IPv6]:port, where the port number is optional
      if ((ipv6match = /\[([^\]]+)\](?:\:(.+))?/.exec(h))) {
        _host = ipv6match[1];
        _port = parseInt(ipv6match[2], 10) || 27017;
      } else {
        //otherwise assume it's IPv4, or plain hostname
        var hostPort = h.split(':', 2);
        _host = hostPort[0] || 'localhost';
        _port = hostPort[1] != null ? parseInt(hostPort[1], 10) : 27017;
        // Check for localhost?safe=true style case
        if(_host.indexOf("?") != -1) _host = _host.split(/\?/)[0];
      }

      // No entry returned for duplicate server
      if(deduplicatedServers[_host + "_" + _port]) return null;
      deduplicatedServers[_host + "_" + _port] = 1;

      // Return the mapped object
      return {host: _host, port: _port};
    }).filter(function(x) {
      return x != null;
    });
  }

  // Get the db name
  object.dbName = dbName || 'admin';
  // Split up all the options
  urlOptions = (query_string_part || '').split(/[&;]/);
  // Ugh, we have to figure out which options go to which constructor manually.
  urlOptions.forEach(function(opt) {
    if(!opt) return;
    var splitOpt = opt.split('='), name = splitOpt[0], value = splitOpt[1];
    // Options implementations
    switch(name) {
      case 'slaveOk':
      case 'slave_ok':
        serverOptions.slave_ok = (value == 'true');
        dbOptions.slaveOk = (value == 'true');
        break;
      case 'maxPoolSize':
      case 'poolSize':
        serverOptions.poolSize = parseInt(value, 10);
        replSetServersOptions.poolSize = parseInt(value, 10);
        break;
      case 'appname':
        object.appname = decodeURIComponent(value);
        break;
      case 'autoReconnect':
      case 'auto_reconnect':
        serverOptions.auto_reconnect = (value == 'true');
        break;
      case 'minPoolSize':
        throw new Error("minPoolSize not supported");
      case 'maxIdleTimeMS':
        throw new Error("maxIdleTimeMS not supported");
      case 'waitQueueMultiple':
        throw new Error("waitQueueMultiple not supported");
      case 'waitQueueTimeoutMS':
        throw new Error("waitQueueTimeoutMS not supported");
      case 'uuidRepresentation':
        throw new Error("uuidRepresentation not supported");
      case 'ssl':
        if(value == 'prefer') {
          serverOptions.ssl = value;
          replSetServersOptions.ssl = value;
          mongosOptions.ssl = value;
          break;
        }
        serverOptions.ssl = (value == 'true');
        replSetServersOptions.ssl = (value == 'true');
        mongosOptions.ssl = (value == 'true');
        break;
      case 'sslValidate':
        serverOptions.sslValidate = (value == 'true');
        replSetServersOptions.sslValidate = (value == 'true');
        mongosOptions.sslValidate = (value == 'true');
        break;
      case 'replicaSet':
      case 'rs_name':
        replSetServersOptions.rs_name = value;
        break;
      case 'reconnectWait':
        replSetServersOptions.reconnectWait = parseInt(value, 10);
        break;
      case 'retries':
        replSetServersOptions.retries = parseInt(value, 10);
        break;
      case 'readSecondary':
      case 'read_secondary':
        replSetServersOptions.read_secondary = (value == 'true');
        break;
      case 'fsync':
        dbOptions.fsync = (value == 'true');
        break;
      case 'journal':
        dbOptions.j = (value == 'true');
        break;
      case 'safe':
        dbOptions.safe = (value == 'true');
        break;
      case 'nativeParser':
      case 'native_parser':
        dbOptions.native_parser = (value == 'true');
        break;
      case 'readConcernLevel':
        dbOptions.readConcern = {level: value};
        break;
      case 'connectTimeoutMS':
        serverOptions.socketOptions.connectTimeoutMS = parseInt(value, 10);
        replSetServersOptions.socketOptions.connectTimeoutMS = parseInt(value, 10);
        mongosOptions.socketOptions.connectTimeoutMS = parseInt(value, 10);
        break;
      case 'socketTimeoutMS':
        serverOptions.socketOptions.socketTimeoutMS = parseInt(value, 10);
        replSetServersOptions.socketOptions.socketTimeoutMS = parseInt(value, 10);
        mongosOptions.socketOptions.socketTimeoutMS = parseInt(value, 10);
        break;
      case 'w':
        dbOptions.w = parseInt(value, 10);
        if(isNaN(dbOptions.w)) dbOptions.w = value;
        break;
      case 'authSource':
        dbOptions.authSource = value;
        break;
      case 'gssapiServiceName':
        dbOptions.gssapiServiceName = value;
        break;
      case 'authMechanism':
        if(value == 'GSSAPI') {
          // If no password provided decode only the principal
          if(object.auth == null) {
            var urlDecodeAuthPart = decodeURIComponent(authPart);
            if(urlDecodeAuthPart.indexOf("@") == -1) throw new Error("GSSAPI requires a provided principal");
            object.auth = {user: urlDecodeAuthPart, password: null};
          } else {
            object.auth.user = decodeURIComponent(object.auth.user);
          }
        } else if(value == 'MONGODB-X509') {
          object.auth = {user: decodeURIComponent(authPart)};
        }

        // Only support GSSAPI or MONGODB-CR for now
        if(value != 'GSSAPI'
          && value != 'MONGODB-X509'
          && value != 'MONGODB-CR'
          && value != 'DEFAULT'
          && value != 'SCRAM-SHA-1'
          && value != 'PLAIN')
            throw new Error("only DEFAULT, GSSAPI, PLAIN, MONGODB-X509, SCRAM-SHA-1 or MONGODB-CR is supported by authMechanism");

        // Authentication mechanism
        dbOptions.authMechanism = value;
        break;
      case 'authMechanismProperties':
        // Split up into key, value pairs
        var values = value.split(',');
        var o = {};
        // For each value split into key, value
        values.forEach(function(x) {
          var v = x.split(':');
          o[v[0]] = v[1];
        });

        // Set all authMechanismProperties
        dbOptions.authMechanismProperties = o;
        // Set the service name value
        if(typeof o.SERVICE_NAME == 'string') dbOptions.gssapiServiceName = o.SERVICE_NAME;
        if(typeof o.SERVICE_REALM == 'string') dbOptions.gssapiServiceRealm = o.SERVICE_REALM;
        if(typeof o.CANONICALIZE_HOST_NAME == 'string') dbOptions.gssapiCanonicalizeHostName = o.CANONICALIZE_HOST_NAME == 'true' ? true : false;
        break;
      case 'wtimeoutMS':
        dbOptions.wtimeout = parseInt(value, 10);
        break;
      case 'readPreference':
        if(!ReadPreference.isValid(value)) throw new Error("readPreference must be either primary/primaryPreferred/secondary/secondaryPreferred/nearest");
        dbOptions.readPreference = value;
        break;
      case 'maxStalenessSeconds':
        dbOptions.maxStalenessSeconds = parseInt(value, 10);
        break;
      case 'readPreferenceTags':
        // Decode the value
        value = decodeURIComponent(value);
        // Contains the tag object
        var tagObject = {};
        if(value == null || value == '') {
          dbOptions.read_preference_tags.push(tagObject);
          break;
        }

        // Split up the tags
        var tags = value.split(/\,/);
        for(var i = 0; i < tags.length; i++) {
          var parts = tags[i].trim().split(/\:/);
          tagObject[parts[0]] = parts[1];
        }

        // Set the preferences tags
        dbOptions.read_preference_tags.push(tagObject);
        break;
      default:
        break;
    }
  });

  // No tags: should be null (not [])
  if(dbOptions.read_preference_tags.length === 0) {
    dbOptions.read_preference_tags = null;
  }

  // Validate if there are an invalid write concern combinations
  if((dbOptions.w == -1 || dbOptions.w == 0) && (
      dbOptions.journal == true
      || dbOptions.fsync == true
      || dbOptions.safe == true)) throw new Error("w set to -1 or 0 cannot be combined with safe/w/journal/fsync")

  // If no read preference set it to primary
  if(!dbOptions.readPreference) {
    dbOptions.readPreference = 'primary';
  }

  // make sure that user-provided options are applied with priority
  dbOptions = assign(dbOptions, options);

  // Add servers to result
  object.servers = servers;

  // Returned parsed object
  return object;
}


/***/ }),
/* 93 */
/***/ (function(module, exports) {

module.exports = require("url");

/***/ }),
/* 94 */
/***/ (function(module, exports) {

module.exports = require("dns");

/***/ }),
/* 95 */
/***/ (function(module, exports, __webpack_require__) {

var Emitter = __webpack_require__(8).EventEmitter;
var GridFSBucketReadStream = __webpack_require__(96);
var GridFSBucketWriteStream = __webpack_require__(97);
var shallowClone = __webpack_require__(0).shallowClone;
var toError = __webpack_require__(0).toError;
var util = __webpack_require__(2);

var DEFAULT_GRIDFS_BUCKET_OPTIONS = {
  bucketName: 'fs',
  chunkSizeBytes: 255 * 1024
};

module.exports = GridFSBucket;

/**
 * Constructor for a streaming GridFS interface
 * @class
 * @param {Db} db A db handle
 * @param {object} [options=null] Optional settings.
 * @param {string} [options.bucketName="fs"] The 'files' and 'chunks' collections will be prefixed with the bucket name followed by a dot.
 * @param {number} [options.chunkSizeBytes=255 * 1024] Number of bytes stored in each chunk. Defaults to 255KB
 * @param {object} [options.writeConcern=null] Optional write concern to be passed to write operations, for instance `{ w: 1 }`
 * @param {object} [options.readPreference=null] Optional read preference to be passed to read operations
 * @fires GridFSBucketWriteStream#index
 * @return {GridFSBucket}
 */

function GridFSBucket(db, options) {
  Emitter.apply(this);
  this.setMaxListeners(0);

  if (options && typeof options === 'object') {
    options = shallowClone(options);
    var keys = Object.keys(DEFAULT_GRIDFS_BUCKET_OPTIONS);
    for (var i = 0; i < keys.length; ++i) {
      if (!options[keys[i]]) {
        options[keys[i]] = DEFAULT_GRIDFS_BUCKET_OPTIONS[keys[i]];
      }
    }
  } else {
    options = DEFAULT_GRIDFS_BUCKET_OPTIONS;
  }

  this.s = {
    db: db,
    options: options,
    _chunksCollection: db.collection(options.bucketName + '.chunks'),
    _filesCollection: db.collection(options.bucketName + '.files'),
    checkedIndexes: false,
    calledOpenUploadStream: false,
    promiseLibrary: db.s.promiseLibrary ||
      (typeof global.Promise == 'function' ? global.Promise : __webpack_require__(3).Promise)
  };
}

util.inherits(GridFSBucket, Emitter);

/**
 * When the first call to openUploadStream is made, the upload stream will
 * check to see if it needs to create the proper indexes on the chunks and
 * files collections. This event is fired either when 1) it determines that
 * no index creation is necessary, 2) when it successfully creates the
 * necessary indexes.
 *
 * @event GridFSBucket#index
 * @type {Error}
 */

/**
 * Returns a writable stream (GridFSBucketWriteStream) for writing
 * buffers to GridFS. The stream's 'id' property contains the resulting
 * file's id.
 * @method
 * @param {string} filename The value of the 'filename' key in the files doc
 * @param {object} [options=null] Optional settings.
 * @param {number} [options.chunkSizeBytes=null] Optional overwrite this bucket's chunkSizeBytes for this file
 * @param {object} [options.metadata=null] Optional object to store in the file document's `metadata` field
 * @param {string} [options.contentType=null] Optional string to store in the file document's `contentType` field
 * @param {array} [options.aliases=null] Optional array of strings to store in the file document's `aliases` field
 * @return {GridFSBucketWriteStream}
 */

GridFSBucket.prototype.openUploadStream = function(filename, options) {
  if (options) {
    options = shallowClone(options);
  } else {
    options = {};
  }
  if (!options.chunkSizeBytes) {
    options.chunkSizeBytes = this.s.options.chunkSizeBytes;
  }
  return new GridFSBucketWriteStream(this, filename, options);
};

/**
 * Returns a writable stream (GridFSBucketWriteStream) for writing
 * buffers to GridFS for a custom file id. The stream's 'id' property contains the resulting
 * file's id.
 * @method
 * @param {string|number|object} id A custom id used to identify the file
 * @param {string} filename The value of the 'filename' key in the files doc
 * @param {object} [options=null] Optional settings.
 * @param {number} [options.chunkSizeBytes=null] Optional overwrite this bucket's chunkSizeBytes for this file
 * @param {object} [options.metadata=null] Optional object to store in the file document's `metadata` field
 * @param {string} [options.contentType=null] Optional string to store in the file document's `contentType` field
 * @param {array} [options.aliases=null] Optional array of strings to store in the file document's `aliases` field
 * @return {GridFSBucketWriteStream}
 */

GridFSBucket.prototype.openUploadStreamWithId = function(id, filename, options) {
  if (options) {
    options = shallowClone(options);
  } else {
    options = {};
  }

  if (!options.chunkSizeBytes) {
    options.chunkSizeBytes = this.s.options.chunkSizeBytes;
  }

  options.id = id;

  return new GridFSBucketWriteStream(this, filename, options);
};

/**
 * Returns a readable stream (GridFSBucketReadStream) for streaming file
 * data from GridFS.
 * @method
 * @param {ObjectId} id The id of the file doc
 * @param {Object} [options=null] Optional settings.
 * @param {Number} [options.start=null] Optional 0-based offset in bytes to start streaming from
 * @param {Number} [options.end=null] Optional 0-based offset in bytes to stop streaming before
 * @return {GridFSBucketReadStream}
 */

GridFSBucket.prototype.openDownloadStream = function(id, options) {
  var filter = { _id: id };
  options = {
    start: options && options.start,
    end: options && options.end
  };

  return new GridFSBucketReadStream(this.s._chunksCollection,
    this.s._filesCollection, this.s.options.readPreference, filter, options);
};

/**
 * Deletes a file with the given id
 * @method
 * @param {ObjectId} id The id of the file doc
 * @param {GridFSBucket~errorCallback} [callback]
 */

GridFSBucket.prototype.delete = function(id, callback) {
  if (typeof callback === 'function') {
    return _delete(this, id, callback);
  }

  var _this = this;
  return new this.s.promiseLibrary(function(resolve, reject) {
    _delete(_this, id, function(error, res) {
      if (error) {
        reject(error);
      } else {
        resolve(res);
      }
    });
  });
};

/**
 * @ignore
 */

function _delete(_this, id, callback) {
  _this.s._filesCollection.deleteOne({ _id: id }, function(error, res) {
    if (error) {
      return callback(error);
    }

    _this.s._chunksCollection.deleteMany({ files_id: id }, function(error) {
      if (error) {
        return callback(error);
      }

      // Delete orphaned chunks before returning FileNotFound
      if (!res.result.n) {
        var errmsg = 'FileNotFound: no file with id ' + id + ' found';
        return callback(new Error(errmsg));
      }

      callback();
    });
  });
}

/**
 * Convenience wrapper around find on the files collection
 * @method
 * @param {Object} filter
 * @param {Object} [options=null] Optional settings for cursor
 * @param {number} [options.batchSize=null] Optional batch size for cursor
 * @param {number} [options.limit=null] Optional limit for cursor
 * @param {number} [options.maxTimeMS=null] Optional maxTimeMS for cursor
 * @param {boolean} [options.noCursorTimeout=null] Optionally set cursor's `noCursorTimeout` flag
 * @param {number} [options.skip=null] Optional skip for cursor
 * @param {object} [options.sort=null] Optional sort for cursor
 * @return {Cursor}
 */

GridFSBucket.prototype.find = function(filter, options) {
  filter = filter || {};
  options = options || {};

  var cursor = this.s._filesCollection.find(filter);

  if (options.batchSize != null) {
    cursor.batchSize(options.batchSize);
  }
  if (options.limit != null) {
    cursor.limit(options.limit);
  }
  if (options.maxTimeMS != null) {
    cursor.maxTimeMS(options.maxTimeMS);
  }
  if (options.noCursorTimeout != null) {
    cursor.addCursorFlag('noCursorTimeout', options.noCursorTimeout);
  }
  if (options.skip != null) {
    cursor.skip(options.skip);
  }
  if (options.sort != null) {
    cursor.sort(options.sort);
  }

  return cursor;
};

/**
 * Returns a readable stream (GridFSBucketReadStream) for streaming the
 * file with the given name from GridFS. If there are multiple files with
 * the same name, this will stream the most recent file with the given name
 * (as determined by the `uploadDate` field). You can set the `revision`
 * option to change this behavior.
 * @method
 * @param {String} filename The name of the file to stream
 * @param {Object} [options=null] Optional settings
 * @param {number} [options.revision=-1] The revision number relative to the oldest file with the given filename. 0 gets you the oldest file, 1 gets you the 2nd oldest, -1 gets you the newest.
 * @param {Number} [options.start=null] Optional 0-based offset in bytes to start streaming from
 * @param {Number} [options.end=null] Optional 0-based offset in bytes to stop streaming before
 * @return {GridFSBucketReadStream}
 */

GridFSBucket.prototype.openDownloadStreamByName = function(filename, options) {
  var sort = { uploadDate: -1 };
  var skip = null;
  if (options && options.revision != null) {
    if (options.revision >= 0) {
      sort = { uploadDate: 1 };
      skip = options.revision;
    } else {
      skip = -options.revision - 1;
    }
  }

  var filter = { filename: filename };
  options = {
    sort: sort,
    skip: skip,
    start: options && options.start,
    end: options && options.end
  };
  return new GridFSBucketReadStream(this.s._chunksCollection,
    this.s._filesCollection, this.s.options.readPreference, filter, options);
};

/**
 * Renames the file with the given _id to the given string
 * @method
 * @param {ObjectId} id the id of the file to rename
 * @param {String} filename new name for the file
 * @param {GridFSBucket~errorCallback} [callback]
 */

GridFSBucket.prototype.rename = function(id, filename, callback) {
  if (typeof callback === 'function') {
    return _rename(this, id, filename, callback);
  }

  var _this = this;
  return new this.s.promiseLibrary(function(resolve, reject) {
    _rename(_this, id, filename, function(error, res) {
      if (error) {
        reject(error);
      } else {
        resolve(res);
      }
    });
  });
};

/**
 * @ignore
 */

function _rename(_this, id, filename, callback) {
  var filter = { _id: id };
  var update = { $set: { filename: filename } };
  _this.s._filesCollection.updateOne(filter, update, function(error, res) {
    if (error) {
      return callback(error);
    }
    if (!res.result.n) {
      return callback(toError('File with id ' + id + ' not found'));
    }
    callback();
  });
}

/**
 * Removes this bucket's files collection, followed by its chunks collection.
 * @method
 * @param {GridFSBucket~errorCallback} [callback]
 */

GridFSBucket.prototype.drop = function(callback) {
  if (typeof callback === 'function') {
    return _drop(this, callback);
  }

  var _this = this;
  return new this.s.promiseLibrary(function(resolve, reject) {
    _drop(_this, function(error, res) {
      if (error) {
        reject(error);
      } else {
        resolve(res);
      }
    });
  });
};

/**
 * @ignore
 */

function _drop(_this, callback) {
  _this.s._filesCollection.drop(function(error) {
    if (error) {
      return callback(error);
    }
    _this.s._chunksCollection.drop(function(error) {
      if (error) {
        return callback(error);
      }

      return callback();
    });
  });
}

/**
 * Callback format for all GridFSBucket methods that can accept a callback.
 * @callback GridFSBucket~errorCallback
 * @param {MongoError} error An error instance representing any errors that occurred
 */


/***/ }),
/* 96 */
/***/ (function(module, exports, __webpack_require__) {

var stream = __webpack_require__(13),
  util = __webpack_require__(2);

module.exports = GridFSBucketReadStream;

/**
 * A readable stream that enables you to read buffers from GridFS.
 *
 * Do not instantiate this class directly. Use `openDownloadStream()` instead.
 *
 * @class
 * @param {Collection} chunks Handle for chunks collection
 * @param {Collection} files Handle for files collection
 * @param {Object} readPreference The read preference to use
 * @param {Object} filter The query to use to find the file document
 * @param {Object} [options=null] Optional settings.
 * @param {Number} [options.sort=null] Optional sort for the file find query
 * @param {Number} [options.skip=null] Optional skip for the file find query
 * @param {Number} [options.start=null] Optional 0-based offset in bytes to start streaming from
 * @param {Number} [options.end=null] Optional 0-based offset in bytes to stop streaming before
 * @fires GridFSBucketReadStream#error
 * @fires GridFSBucketReadStream#file
 * @return {GridFSBucketReadStream} a GridFSBucketReadStream instance.
 */

function GridFSBucketReadStream(chunks, files, readPreference, filter, options) {
  this.s = {
    bytesRead: 0,
    chunks: chunks,
    cursor: null,
    expected: 0,
    files: files,
    filter: filter,
    init: false,
    expectedEnd: 0,
    file: null,
    options: options,
    readPreference: readPreference
  };

  stream.Readable.call(this);
}

util.inherits(GridFSBucketReadStream, stream.Readable);

/**
 * An error occurred
 *
 * @event GridFSBucketReadStream#error
 * @type {Error}
 */

/**
 * Fires when the stream loaded the file document corresponding to the
 * provided id.
 *
 * @event GridFSBucketReadStream#file
 * @type {object}
 */

/**
 * Emitted when a chunk of data is available to be consumed.
 *
 * @event GridFSBucketReadStream#data
 * @type {object}
 */

/**
 * Fired when the stream is exhausted (no more data events).
 *
 * @event GridFSBucketReadStream#end
 * @type {object}
 */

/**
 * Fired when the stream is exhausted and the underlying cursor is killed
 *
 * @event GridFSBucketReadStream#close
 * @type {object}
 */

/**
 * Reads from the cursor and pushes to the stream.
 * @method
 */

GridFSBucketReadStream.prototype._read = function() {
  var _this = this;
  if (this.destroyed) {
    return;
  }

  waitForFile(_this, function() {
    doRead(_this);
  });
};

/**
 * Sets the 0-based offset in bytes to start streaming from. Throws
 * an error if this stream has entered flowing mode
 * (e.g. if you've already called `on('data')`)
 * @method
 * @param {Number} start Offset in bytes to start reading at
 * @return {GridFSBucketReadStream}
 */

GridFSBucketReadStream.prototype.start = function(start) {
  throwIfInitialized(this);
  this.s.options.start = start;
  return this;
};

/**
 * Sets the 0-based offset in bytes to start streaming from. Throws
 * an error if this stream has entered flowing mode
 * (e.g. if you've already called `on('data')`)
 * @method
 * @param {Number} end Offset in bytes to stop reading at
 * @return {GridFSBucketReadStream}
 */

GridFSBucketReadStream.prototype.end = function(end) {
  throwIfInitialized(this);
  this.s.options.end = end;
  return this;
};

/**
 * Marks this stream as aborted (will never push another `data` event)
 * and kills the underlying cursor. Will emit the 'end' event, and then
 * the 'close' event once the cursor is successfully killed.
 *
 * @method
 * @param {GridFSBucket~errorCallback} [callback] called when the cursor is successfully closed or an error occurred.
 * @fires GridFSBucketWriteStream#close
 * @fires GridFSBucketWriteStream#end
 */

GridFSBucketReadStream.prototype.abort = function(callback) {
  var _this = this;
  this.push(null);
  this.destroyed = true;
  if (this.s.cursor) {
    this.s.cursor.close(function(error) {
      _this.emit('close');
      callback && callback(error);
    });
  } else {
    if (!this.s.init) {
      // If not initialized, fire close event because we will never
      // get a cursor
      _this.emit('close');
    }
    callback && callback();
  }
};

/**
 * @ignore
 */

function throwIfInitialized(self) {
  if (self.s.init) {
    throw new Error('You cannot change options after the stream has entered' +
      'flowing mode!');
  }
}

/**
 * @ignore
 */

function doRead(_this) {
  if (_this.destroyed) {
    return;
  }

  _this.s.cursor.next(function(error, doc) {
    if (_this.destroyed) {
      return;
    }
    if (error) {
      return __handleError(_this, error);
    }
    if (!doc) {
      _this.push(null);
      return _this.s.cursor.close(function(error) {
        if (error) {
          return __handleError(_this, error);
        }
        _this.emit('close');
      });
    }

    var bytesRemaining = _this.s.file.length - _this.s.bytesRead;
    var expectedN = _this.s.expected++;
    var expectedLength = Math.min(_this.s.file.chunkSize,
      bytesRemaining);

    if (doc.n > expectedN) {
      var errmsg = 'ChunkIsMissing: Got unexpected n: ' + doc.n +
        ', expected: ' + expectedN;
      return __handleError(_this, new Error(errmsg));
    }

    if (doc.n < expectedN) {
      errmsg = 'ExtraChunk: Got unexpected n: ' + doc.n +
        ', expected: ' + expectedN;
      return __handleError(_this, new Error(errmsg));
    }

    var buf = Buffer.isBuffer(doc.data) ? doc.data : doc.data.buffer;

    if (buf.length !== expectedLength) {
      if (bytesRemaining <= 0) {
        errmsg = 'ExtraChunk: Got unexpected n: ' + doc.n;
        return __handleError(_this, new Error(errmsg));
      }

      errmsg = 'ChunkIsWrongSize: Got unexpected length: ' +
        buf.length + ', expected: ' + expectedLength;
      return __handleError(_this, new Error(errmsg));
    }

    _this.s.bytesRead += buf.length;

    if (buf.length === 0) {
      return _this.push(null);
    }

    var sliceStart = null;
    var sliceEnd = null;

    if (_this.s.bytesToSkip != null) {
      sliceStart = _this.s.bytesToSkip;
      _this.s.bytesToSkip = 0;
    }

    if (expectedN === _this.s.expectedEnd && _this.s.bytesToTrim != null) {
      sliceEnd = _this.s.bytesToTrim;
    }

    // If the remaining amount of data left is < chunkSize read the right amount of data
    if (_this.s.options.end && (
      (_this.s.options.end - _this.s.bytesToSkip) < buf.length
    )) {
      sliceEnd = (_this.s.options.end - _this.s.bytesToSkip);
    }

    if (sliceStart != null || sliceEnd != null) {
      buf = buf.slice(sliceStart || 0, sliceEnd || buf.length);
    }

    _this.push(buf);
  })
}

/**
 * @ignore
 */

function init(self) {
  var findOneOptions = {};
  if (self.s.readPreference) {
    findOneOptions.readPreference = self.s.readPreference;
  }
  if (self.s.options && self.s.options.sort) {
    findOneOptions.sort = self.s.options.sort;
  }
  if (self.s.options && self.s.options.skip) {
    findOneOptions.skip = self.s.options.skip;
  }

  self.s.files.findOne(self.s.filter, findOneOptions, function(error, doc) {
    if (error) {
      return __handleError(self, error);
    }
    if (!doc) {
      var identifier = self.s.filter._id ?
        self.s.filter._id.toString() : self.s.filter.filename;
      var errmsg = 'FileNotFound: file ' + identifier + ' was not found';
      var err = new Error(errmsg);
      err.code = 'ENOENT';
      return __handleError(self, err);
    }

    // If document is empty, kill the stream immediately and don't
    // execute any reads
    if (doc.length <= 0) {
      self.push(null);
      return;
    }

    if (self.destroyed) {
      // If user destroys the stream before we have a cursor, wait
      // until the query is done to say we're 'closed' because we can't
      // cancel a query.
      self.emit('close');
      return;
    }

    self.s.bytesToSkip = handleStartOption(self, doc, self.s.options);

    var filter = { files_id: doc._id };

    // Currently (MongoDB 3.4.4) skip function does not support the index,
    // it needs to retrieve all the documents first and then skip them. (CS-25811)
    // As work around we use $gte on the "n" field.
    if (self.s.options && self.s.options.start != null){
      var skip = Math.floor(self.s.options.start / doc.chunkSize);
      if (skip > 0){
        filter["n"] = {"$gte": skip};
      }
    }
    self.s.cursor = self.s.chunks.find(filter).sort({ n: 1 });

    if (self.s.readPreference) {
      self.s.cursor.setReadPreference(self.s.readPreference);
    }

    self.s.expectedEnd = Math.ceil(doc.length / doc.chunkSize);
    self.s.file = doc;
    self.s.bytesToTrim = handleEndOption(self, doc, self.s.cursor,
      self.s.options);
    self.emit('file', doc);
  });
}

/**
 * @ignore
 */

function waitForFile(_this, callback) {
  if (_this.s.file) {
    return callback();
  }

  if (!_this.s.init) {
    init(_this);
    _this.s.init = true;
  }

  _this.once('file', function() {
    callback();
  })
}

/**
 * @ignore
 */

function handleStartOption(stream, doc, options) {
  if (options && options.start != null) {
    if (options.start > doc.length) {
      throw new Error('Stream start (' + options.start + ') must not be ' +
        'more than the length of the file (' + doc.length +')');
    }
    if (options.start < 0) {
      throw new Error('Stream start (' + options.start + ') must not be ' +
        'negative');
    }
    if (options.end != null && options.end < options.start) {
      throw new Error('Stream start (' + options.start + ') must not be ' +
        'greater than stream end (' + options.end + ')');
    }

    stream.s.bytesRead = Math.floor(options.start / doc.chunkSize) *
      doc.chunkSize;
    stream.s.expected = Math.floor(options.start / doc.chunkSize);

    return options.start - stream.s.bytesRead;
  }
}

/**
 * @ignore
 */

function handleEndOption(stream, doc, cursor, options) {
  if (options && options.end != null) {
    if (options.end > doc.length) {
      throw new Error('Stream end (' + options.end + ') must not be ' +
        'more than the length of the file (' + doc.length +')')
    }
    if (options.start < 0) {
      throw new Error('Stream end (' + options.end + ') must not be ' +
        'negative');
    }

    var start = options.start != null ?
      Math.floor(options.start / doc.chunkSize) :
      0;

    cursor.limit(Math.ceil(options.end / doc.chunkSize) - start);

    stream.s.expectedEnd = Math.ceil(options.end / doc.chunkSize);

    return (Math.ceil(options.end / doc.chunkSize) * doc.chunkSize) -
      options.end;
  }
}

/**
 * @ignore
 */

function __handleError(_this, error) {
  _this.emit('error', error);
}


/***/ }),
/* 97 */
/***/ (function(module, exports, __webpack_require__) {

var core = __webpack_require__(1);
var crypto = __webpack_require__(54);
var stream = __webpack_require__(13);
var util = __webpack_require__(2);

var ERROR_NAMESPACE_NOT_FOUND = 26;

module.exports = GridFSBucketWriteStream;

/**
 * A writable stream that enables you to write buffers to GridFS.
 *
 * Do not instantiate this class directly. Use `openUploadStream()` instead.
 *
 * @class
 * @param {GridFSBucket} bucket Handle for this stream's corresponding bucket
 * @param {string} filename The value of the 'filename' key in the files doc
 * @param {object} [options=null] Optional settings.
 * @param {string|number|object} [options.id=null] Custom file id for the GridFS file.
 * @param {number} [options.chunkSizeBytes=null] The chunk size to use, in bytes
 * @param {number} [options.w=null] The write concern
 * @param {number} [options.wtimeout=null] The write concern timeout
 * @param {number} [options.j=null] The journal write concern
 * @fires GridFSBucketWriteStream#error
 * @fires GridFSBucketWriteStream#finish
 * @return {GridFSBucketWriteStream} a GridFSBucketWriteStream instance.
 */

function GridFSBucketWriteStream(bucket, filename, options) {
  options = options || {};
  this.bucket = bucket;
  this.chunks = bucket.s._chunksCollection;
  this.filename = filename;
  this.files = bucket.s._filesCollection;
  this.options = options;
  // Signals the write is all done
  this.done = false;

  this.id = options.id ? options.id : core.BSON.ObjectId();
  this.chunkSizeBytes = this.options.chunkSizeBytes;
  this.bufToStore = new Buffer(this.chunkSizeBytes);
  this.length = 0;
  this.md5 = crypto.createHash('md5');
  this.n = 0;
  this.pos = 0;
  this.state = {
    streamEnd: false,
    outstandingRequests: 0,
    errored: false,
    aborted: false,
    promiseLibrary: this.bucket.s.promiseLibrary
  };

  if (!this.bucket.s.calledOpenUploadStream) {
    this.bucket.s.calledOpenUploadStream = true;

    var _this = this;
    checkIndexes(this, function() {
      _this.bucket.s.checkedIndexes = true;
      _this.bucket.emit('index');
    });
  }
}

util.inherits(GridFSBucketWriteStream, stream.Writable);

/**
 * An error occurred
 *
 * @event GridFSBucketWriteStream#error
 * @type {Error}
 */

/**
 * `end()` was called and the write stream successfully wrote the file
 * metadata and all the chunks to MongoDB.
 *
 * @event GridFSBucketWriteStream#finish
 * @type {object}
 */

/**
 * Write a buffer to the stream.
 *
 * @method
 * @param {Buffer} chunk Buffer to write
 * @param {String} encoding Optional encoding for the buffer
 * @param {Function} callback Function to call when the chunk was added to the buffer, or if the entire chunk was persisted to MongoDB if this chunk caused a flush.
 * @return {Boolean} False if this write required flushing a chunk to MongoDB. True otherwise.
 */

GridFSBucketWriteStream.prototype.write = function(chunk, encoding, callback) {
  var _this = this;
  return waitForIndexes(this, function() {
    return doWrite(_this, chunk, encoding, callback);
  });
};

/**
 * Places this write stream into an aborted state (all future writes fail)
 * and deletes all chunks that have already been written.
 *
 * @method
 * @param {GridFSBucket~errorCallback} callback called when chunks are successfully removed or error occurred
 * @return {Promise} if no callback specified
 */

GridFSBucketWriteStream.prototype.abort = function(callback) {
  if (this.state.streamEnd) {
    var error = new Error('Cannot abort a stream that has already completed');
    if (typeof callback == 'function') {
      return callback(error);
    }
    return this.state.promiseLibrary.reject(error);
  }
  if (this.state.aborted) {
    error = new Error('Cannot call abort() on a stream twice');
    if (typeof callback == 'function') {
      return callback(error);
    }
    return this.state.promiseLibrary.reject(error);
  }
  this.state.aborted = true;
  this.chunks.deleteMany({ files_id: this.id }, function(error) {
    if(typeof callback == 'function') callback(error);
  });
};

/**
 * Tells the stream that no more data will be coming in. The stream will
 * persist the remaining data to MongoDB, write the files document, and
 * then emit a 'finish' event.
 *
 * @method
 * @param {Buffer} chunk Buffer to write
 * @param {String} encoding Optional encoding for the buffer
 * @param {Function} callback Function to call when all files and chunks have been persisted to MongoDB
 */

GridFSBucketWriteStream.prototype.end = function(chunk, encoding, callback) {
  var _this = this;
  if(typeof chunk == 'function') {
    callback = chunk, chunk = null, encoding = null;
  } else if(typeof encoding == 'function') {
    callback = encoding, encoding = null;
  }

  if (checkAborted(this, callback)) {
    return;
  }
  this.state.streamEnd = true;

  if (callback) {
    this.once('finish', function(result) {
      callback(null, result);
    });
  }

  if (!chunk) {
    waitForIndexes(this, function() {
      writeRemnant(_this);
    });
    return;
  }

  this.write(chunk, encoding, function() {
    writeRemnant(_this);
  });
};

/**
 * @ignore
 */

function __handleError(_this, error, callback) {
  if (_this.state.errored) {
    return;
  }
  _this.state.errored = true;
  if (callback) {
    return callback(error);
  }
  _this.emit('error', error);
}

/**
 * @ignore
 */

function createChunkDoc(filesId, n, data) {
  return {
    _id: core.BSON.ObjectId(),
    files_id: filesId,
    n: n,
    data: data
  };
}

/**
 * @ignore
 */

function checkChunksIndex(_this, callback) {
  _this.chunks.listIndexes().toArray(function(error, indexes) {
    if (error) {
      // Collection doesn't exist so create index
      if (error.code === ERROR_NAMESPACE_NOT_FOUND) {
        var index = { files_id: 1, n: 1 };
        _this.chunks.createIndex(index, { background: false, unique: true }, function(error) {
          if (error) {
            return callback(error);
          }

          callback();
        });
        return;
      }
      return callback(error);
    }

    var hasChunksIndex = false;
    indexes.forEach(function(index) {
      if (index.key) {
        var keys = Object.keys(index.key);
        if (keys.length === 2 && index.key.files_id === 1 &&
            index.key.n === 1) {
          hasChunksIndex = true;
        }
      }
    });

    if (hasChunksIndex) {
      callback();
    } else {
      index = { files_id: 1, n: 1 };
      var indexOptions = getWriteOptions(_this);

      indexOptions.background = false;
      indexOptions.unique = true;

      _this.chunks.createIndex(index, indexOptions, function(error) {
        if (error) {
          return callback(error);
        }

        callback();
      });
    }
  });
}

/**
 * @ignore
 */

function checkDone(_this, callback) {
  if(_this.done) return true;
  if (_this.state.streamEnd &&
      _this.state.outstandingRequests === 0 &&
      !_this.state.errored) {
    // Set done so we dont' trigger duplicate createFilesDoc
    _this.done = true;
    // Create a new files doc
    var filesDoc = createFilesDoc(_this.id, _this.length, _this.chunkSizeBytes,
      _this.md5.digest('hex'), _this.filename, _this.options.contentType,
      _this.options.aliases, _this.options.metadata);

    if (checkAborted(_this, callback)) {
      return false;
    }

    _this.files.insert(filesDoc, getWriteOptions(_this), function(error) {
      if (error) {
        return __handleError(_this, error, callback);
      }
      _this.emit('finish', filesDoc);
    });

    return true;
  }

  return false;
}

/**
 * @ignore
 */

function checkIndexes(_this, callback) {
  _this.files.findOne({}, { _id: 1 }, function(error, doc) {
    if (error) {
      return callback(error);
    }
    if (doc) {
      return callback();
    }

    _this.files.listIndexes().toArray(function(error, indexes) {
      if (error) {
        // Collection doesn't exist so create index
        if (error.code === ERROR_NAMESPACE_NOT_FOUND) {
          var index = { filename: 1, uploadDate: 1 };
          _this.files.createIndex(index, { background: false }, function(error) {
            if (error) {
              return callback(error);
            }

            checkChunksIndex(_this, callback);
          });
          return;
        }
        return callback(error);
      }

      var hasFileIndex = false;
      indexes.forEach(function(index) {
        var keys = Object.keys(index.key);
        if (keys.length === 2 && index.key.filename === 1 &&
            index.key.uploadDate === 1) {
          hasFileIndex = true;
        }
      });

      if (hasFileIndex) {
        checkChunksIndex(_this, callback);
      } else {
        index = { filename: 1, uploadDate: 1 };

        var indexOptions = getWriteOptions(_this);

        indexOptions.background = false;

        _this.files.createIndex(index, indexOptions, function(error) {
          if (error) {
            return callback(error);
          }

          checkChunksIndex(_this, callback);
        });
      }
    });
  });
}

/**
 * @ignore
 */

function createFilesDoc(_id, length, chunkSize, md5, filename, contentType,
  aliases, metadata) {
  var ret = {
    _id: _id,
    length: length,
    chunkSize: chunkSize,
    uploadDate: new Date(),
    md5: md5,
    filename: filename
  };

  if (contentType) {
    ret.contentType = contentType;
  }

  if (aliases) {
    ret.aliases = aliases;
  }

  if (metadata) {
    ret.metadata = metadata;
  }

  return ret;
}

/**
 * @ignore
 */

function doWrite(_this, chunk, encoding, callback) {
  if (checkAborted(_this, callback)) {
    return false;
  }

  var inputBuf = (Buffer.isBuffer(chunk)) ?
    chunk : new Buffer(chunk, encoding);

  _this.length += inputBuf.length;

  // Input is small enough to fit in our buffer
  if (_this.pos + inputBuf.length < _this.chunkSizeBytes) {
    inputBuf.copy(_this.bufToStore, _this.pos);
    _this.pos += inputBuf.length;

    callback && callback();

    // Note that we reverse the typical semantics of write's return value
    // to be compatible with node's `.pipe()` function.
    // True means client can keep writing.
    return true;
  }

  // Otherwise, buffer is too big for current chunk, so we need to flush
  // to MongoDB.
  var inputBufRemaining = inputBuf.length;
  var spaceRemaining = _this.chunkSizeBytes - _this.pos;
  var numToCopy = Math.min(spaceRemaining, inputBuf.length);
  var outstandingRequests = 0;
  while (inputBufRemaining > 0) {
    var inputBufPos = inputBuf.length - inputBufRemaining;
    inputBuf.copy(_this.bufToStore, _this.pos,
      inputBufPos, inputBufPos + numToCopy);
    _this.pos += numToCopy;
    spaceRemaining -= numToCopy;
    if (spaceRemaining === 0) {
      _this.md5.update(_this.bufToStore);
      var doc = createChunkDoc(_this.id, _this.n, _this.bufToStore);
      ++_this.state.outstandingRequests;
      ++outstandingRequests;

      if (checkAborted(_this, callback)) {
        return false;
      }

      _this.chunks.insert(doc, getWriteOptions(_this), function(error) {
        if (error) {
          return __handleError(_this, error);
        }
        --_this.state.outstandingRequests;
        --outstandingRequests;
        
        if (!outstandingRequests) {
          _this.emit('drain', doc);
          callback && callback();
          checkDone(_this);
        }
      });

      spaceRemaining = _this.chunkSizeBytes;
      _this.pos = 0;
      ++_this.n;
    }
    inputBufRemaining -= numToCopy;
    numToCopy = Math.min(spaceRemaining, inputBufRemaining);
  }

  // Note that we reverse the typical semantics of write's return value
  // to be compatible with node's `.pipe()` function.
  // False means the client should wait for the 'drain' event.
  return false;
}

/**
 * @ignore
 */

function getWriteOptions(_this) {
  var obj = {};
  if (_this.options.writeConcern) {
    obj.w = _this.options.writeConcern.w;
    obj.wtimeout = _this.options.writeConcern.wtimeout;
    obj.j = _this.options.writeConcern.j;
  }
  return obj;
}

/**
 * @ignore
 */

function waitForIndexes(_this, callback) {
  if (_this.bucket.s.checkedIndexes) {
    return callback(false);
  }

  _this.bucket.once('index', function() {
    callback(true);
  });

  return true;
}

/**
 * @ignore
 */

function writeRemnant(_this, callback) {
  // Buffer is empty, so don't bother to insert
  if (_this.pos === 0) {
    return checkDone(_this, callback);
  }

  ++_this.state.outstandingRequests;

  // Create a new buffer to make sure the buffer isn't bigger than it needs
  // to be.
  var remnant = new Buffer(_this.pos);
  _this.bufToStore.copy(remnant, 0, 0, _this.pos);
  _this.md5.update(remnant);
  var doc = createChunkDoc(_this.id, _this.n, remnant);

  // If the stream was aborted, do not write remnant
  if (checkAborted(_this, callback)) {
    return false;
  }

  _this.chunks.insert(doc, getWriteOptions(_this), function(error) {
    if (error) {
      return __handleError(_this, error);
    }
    --_this.state.outstandingRequests;
    checkDone(_this);
  });
}

/**
 * @ignore
 */

function checkAborted(_this, callback) {
  if (_this.state.aborted) {
    if(typeof callback == 'function') {
      callback(new Error('this stream has been aborted'));
    }
    return true;
  }
  return false;
}


/***/ }),
/* 98 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


//for getting notes from db
module.exports = function (app, mongoUrl) {

    var MongoDB = __webpack_require__(31).MongoClient;

    app.get('/mynotes', function (req, res) {

        MongoDB.connect(mongoUrl, function (err, db) {

            db.collection('notes').find({}).toArray(function (err, docs) {
                res.status(200);
                res.send(docs);
            });
        });
    });
};

/***/ })
/******/ ]);