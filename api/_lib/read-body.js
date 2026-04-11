'use strict';

/**
 * @param {import('http').IncomingMessage} req
 * @param {number} maxBytes
 * @returns {Promise<Buffer>}
 */
function readRawBody(req, maxBytes) {
  var max = maxBytes || 1024 * 1024;
  return new Promise(function (resolve, reject) {
    var chunks = [];
    var total = 0;
    req.on('data', function (chunk) {
      total += chunk.length;
      if (total > max) {
        reject(new Error('body_too_large'));
        try {
          req.destroy();
        } catch (e) {}
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', function () {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {number} maxBytes
 * @returns {Promise<object>}
 */
function readJsonBody(req, maxBytes) {
  return readRawBody(req, maxBytes).then(function (buf) {
    var s = buf.toString('utf8').trim();
    if (!s) return {};
    return JSON.parse(s);
  });
}

module.exports = { readRawBody, readJsonBody };
