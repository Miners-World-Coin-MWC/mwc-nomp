#!/usr/bin/env node
/**
 * Backfill blocksPendingConfirms from daemon gettransaction for pending blocks.
 * Fixes stats UI showing "maturing" with no confirmation count.
 *
 * Usage: node scripts/sync-pending-confirms.js [coin] [--dry-run]
 * Example: node scripts/sync-pending-confirms.js adventurecoin
 */

var redis = require('redis');
var http = require('http');

var coin = process.argv[2] || 'adventurecoin';
var dryRun = process.argv.includes('--dry-run');

var redisHost = process.env.REDIS_HOST || '127.0.0.1';
var redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

var poolConfigs = require('fs').readFileSync(require('path').join(__dirname, '../pool_configs/' + coin + '.json'), 'utf8');
var poolOptions = JSON.parse(poolConfigs.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1'));
var rpc = poolOptions.paymentProcessing.daemon;

function rpcCall(method, params) {
    return new Promise(function (resolve, reject) {
        var body = JSON.stringify({ method: method, params: params, id: 1 });
        var req = http.request({
            hostname: rpc.host,
            port: rpc.port,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'Authorization': 'Basic ' + Buffer.from(rpc.user + ':' + rpc.password).toString('base64')
            }
        }, function (res) {
            var data = '';
            res.on('data', function (c) { data += c; });
            res.on('end', function () {
                try {
                    var j = JSON.parse(data);
                    if (j.error) reject(j.error);
                    else resolve(j.result);
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

var client = redis.createClient(redisPort, redisHost);

client.on('ready', function () {
    client.smembers(coin + ':blocksPending', async function (err, pending) {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        if (!pending || pending.length === 0) {
            console.log('No pending blocks for', coin);
            client.quit();
            return;
        }
        console.log('Syncing confirms for', pending.length, 'pending block(s) on', coin);
        var multi = client.multi();
        var updated = 0;
        for (var i = 0; i < pending.length; i++) {
            var parts = pending[i].split(':');
            var blockHash = parts[0];
            var txHash = parts[1];
            var height = parts[2];
            try {
                var tx = await rpcCall('gettransaction', [txHash]);
                var confs = tx.confirmations || 0;
                var cat = (tx.details && tx.details[0]) ? tx.details[0].category : '?';
                console.log('  height', height, 'confs', confs, 'category', cat);
                if (!dryRun) {
                    multi.hset(coin + ':blocksPendingConfirms', blockHash, confs);
                }
                updated++;
            } catch (e) {
                console.error('  height', height, 'error', e.message || e);
            }
        }
        if (!dryRun && updated > 0) {
            multi.exec(function (e, r) {
                if (e) console.error('Redis error:', e);
                else console.log('Updated', updated, 'confirm entries');
                client.quit();
            });
        } else {
            if (dryRun) console.log('DRY RUN — would update', updated, 'entries');
            client.quit();
        }
    });
});
