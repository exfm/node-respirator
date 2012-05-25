# respirator

Watch keys in redis.  Send a pubsub message when they expire.

## Usage

    var respirator = require('respirator').createServer();
    respirator.watchKey('lucas:now_playing');
