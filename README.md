# respirator

Watch keys in redis.  Send a pubsub message when they expire or go away.

## Why?

Redis doesn't currently fire pub sub events when keys are deleted or expired.  
Hopefully it will in [Redis 2.8](https://github.com/antirez/redis/issues/594) but until then respirator can help.

This little guy just polls for the keys you're interested in and fires off a
`<key_name>_expired` message.  You can build really neat things with this.

## Usage

    // Setup respirator
    var respirator = require('respirator')();

    // Shorcut for getting a redis pubsub connection
    var pubsub = respirator.getRedis();

    // Subscribe to all expired events respirator will fire off
    pubsub.psubscribe('*_expired');

    // Actual listener for the expired event
    pubsub.on('pmessage', function(pattern, channel, message){
        // pattern => *_expired
        // channel => lucas:now_playing_expired
        // message => {"key": "lucas:now_playing"}
        console.log('Something expired! ', JSON.parse(message)['key']);
    });

    // Now let's actually do something with it.
    // Say we want to store what song I'm currently listening to
    // and then get notified when that expires.

    var nowPlaying = {
        artist: "Unknown Mortal Orchestra",
        title: "Ffunny Ffrends",
        id: "a9zcf",
        album: "SXSW Sampler",
        source: "http://soundcloud.com/austintownhall/sets/sxsw-sampler/"
    };

    var redis = respirator.getRedis();
    redis.set('lucas:now_playing', JSON.stringify(nowPlaying));
    redis.expire('lucas:now_playing', 600);

    // Tell respirator to actually watch it.
    // In 5 minutes we'll see the console.log pop up.
    respirator.watchKey('lucas:now_playing');

