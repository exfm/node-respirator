var util = require('util'),
    Set = require('set'),
    redis = require('redis'),
    winston = require('winston');

winston.loggers.add('Respirator', {
    console: {
        'level': 'info', 'timestamp': true, 'colorize': true
    }
});


function Respirator(opts){
    opts = opts || {};
    this.host = opts.host || 'localhost';
    this.port = opts.port || 6379;
    this.db = opts.db || 0;
    this.pollInterval = opts.pollInterval || 10000;
    this.log = winston.loggers.get(opts.loggerName || 'Respirator');
}

Respirator.prototype.toString = function(){
    return util.format("Respirator('%s', '%s', %s)", this.host,
        this.port, this.db);
};

Respirator.prototype.start = function(){
    this.watchedKeys = new Set();
    this.log.verbose("Starting interval");
    this.interval = setInterval(this.poll.bind(this), this.pollInterval);
};

Respirator.prototype.stop = function(){
    delete this.watchedKeys;
    this.log.verbose("Stopping...");
    clearInterval(this.interval);
};

Respirator.prototype.watchKey = function(key){
    if(!this.watchedKeys.contains(key)){
        this.log.verbose(util.format("Watching key: %s", key));
        this.watchedKeys.add(key);
    }
};

Respirator.prototype.unwatchKey = function(key){
    if(!this.watchedKeys.contains(key)){
        this.log.verbose(util.format("Unwatching key: %s", key));
        this.watchedKeys.remove(key);
    }
};

// Get a new redis connection
Respirator.prototype.getRedis = function(){
    var client = redis.createClient(this.port, this.host);
    client.on('error', function(err){
        this.log.error(util.format("Respirator Redis error: %s", err));
    }.bind(this));

    client.select(this.db);
    return client;
};

Respirator.prototype.poll = function(){
    this.log.verbose('Running poll...');
    if(this.watchedKeys.empty()){
        this.log.verbose("No keys to poll for right now.");
        return null;
    }

    var client = this.getRedis();

    var multi = client.multi();
    var keys = this.watchedKeys.get();

    keys.forEach(function(key){
        multi.exists(key);
    });

    multi.exec(function(err, replies){
        this.log.silly(util.format("Handling %d replies", replies.length));
        this.log.silly(replies);
        if(replies){
            replies.forEach(function(reply, i){
                var key = keys[i];
                if(reply === 0){
                    this.log.silly(util.format("Key %s is expired %s",
                        key, reply));

                    client.publish(util.format("%s_expired", key),
                        JSON.stringify({'key': key}));

                    this.unwatchKey(key);
                }
            }.bind(this));
        }
        client.quit();
        this.log.verbose("Poll complete.");
    }.bind(this));
};

function createServer(opts){
    var r = new Respirator(opts);
    r.start();
    return r;
}

module.exports = createServer;
module.exports.Respirator = Respirator;