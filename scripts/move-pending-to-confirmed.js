#!/usr/bin/env node
/**
 * Move blocks from blocksPending to blocksConfirmed in Redis.
 * Use when blocks are confirmed on chain and paid but stuck showing as pending on website.
 *
 * Usage: node move-pending-to-confirmed.js [coin] [--dry-run]
 * Example: node move-pending-to-confirmed.js adventurecoin
 *          node move-pending-to-confirmed.js adventurecoin --dry-run
 */

var redis = require('redis');

var coin = process.argv[2] || 'adventurecoin';
var dryRun = process.argv.includes('--dry-run');

var redisHost = process.env.REDIS_HOST || '127.0.0.1';
var redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

var client = redis.createClient(redisPort, redisHost);

client.on('error', function (err) {
    console.error('Redis error:', err);
    process.exit(1);
});

client.on('ready', function () {
    client.smembers(coin + ':blocksPending', function (err, pending) {
        if (err) {
            console.error('Error getting pending blocks:', err);
            client.quit();
            process.exit(1);
        }
        if (!pending || pending.length === 0) {
            console.log('No pending blocks for', coin);
            client.quit();
            return;
        }
        console.log('Found', pending.length, 'pending block(s) for', coin);
        if (dryRun) {
            console.log('DRY RUN - would move:');
            pending.forEach(function (s) {
                var parts = s.split(':');
                console.log('  Height', parts[2], '| Block', parts[0].substring(0, 16) + '...');
            });
            client.quit();
            return;
        }
        var multi = client.multi();
        pending.forEach(function (serialized) {
            multi.smove(coin + ':blocksPending', coin + ':blocksConfirmed', serialized);
        });
        multi.exec(function (err, results) {
            if (err) {
                console.error('Error moving blocks:', err);
                client.quit();
                process.exit(1);
            }
            var moved = results.filter(function (r) { return r === 1; }).length;
            console.log('Moved', moved, 'block(s) from pending to confirmed');
            client.quit();
        });
    });
});
