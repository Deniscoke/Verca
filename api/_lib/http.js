/**
 * Minimal HTTP helpers for Vercel Node serverless handlers.
 */
'use strict';

function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store');
}

function allowMethods(res, methods) {
  res.setHeader('Allow', methods.join(', '));
}

module.exports = { json, noStore, allowMethods };
