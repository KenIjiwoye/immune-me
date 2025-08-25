'use strict';
const zlib = require('zlib');

const SYSTEM_FIELDS = [
  '$id',
  '$createdAt',
  '$updatedAt',
  '$permissions',
  '$databaseId',
  '$collectionId'
];

function nowIso() {
  return new Date().toISOString();
}

function isNonEmptyString(x) {
  return typeof x === 'string' && x.trim().length > 0;
}

function parseJSONSafe(str, fallback = null) {
  try {
    if (typeof str === 'string') {
      return JSON.parse(str);
    }
    return typeof str === 'object' ? str : fallback;
  } catch {
    return fallback;
  }
}

function sanitizeDocumentData(data) {
  if (!data || typeof data !== 'object') return {};
  const result = {};
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith('$')) continue;
    if (v === undefined) continue;
    result[k] = v;
  }
  return result;
}

function isRetryableError(err) {
  const retryableCodes = new Set([500, 502, 503, 504, 408, 429]);
  const msg = (err && err.message) ? err.message.toLowerCase() : '';
  const code = err && (err.code || err.statusCode);
  return retryableCodes.has(code) ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('temporar') || // temporary
    msg.includes('rate limit') ||
    msg.includes('too many');
}

function chunkArray(arr, size) {
  if (!Array.isArray(arr) || size <= 0) return [];
  const res = [];
  for (let i = 0; i < arr.length; i += size) {
    res.push(arr.slice(i, i + size));
  }
  return res;
}

function gzipCompressBase64(obj) {
  try {
    const json = typeof obj === 'string' ? obj : JSON.stringify(obj);
    const buf = zlib.gzipSync(Buffer.from(json));
    return buf.toString('base64');
  } catch {
    return null;
  }
}

function buildFacilityFilter(Query, permissions) {
  const filters = [];
  if (permissions && !permissions.canAccessAllFacilities && permissions.facilityId) {
    filters.push(Query.equal('facility_id', permissions.facilityId));
  }
  return filters;
}

function buildUpdatedSinceFilter(Query, sinceIso) {
  const since = isNonEmptyString(sinceIso) ? sinceIso : '1970-01-01T00:00:00.000Z';
  return [Query.greaterThan('$updatedAt', since)];
}

function buildPaginationFilter(Query, limit = 100, cursor = null) {
  const filters = [Query.limit(limit)];
  if (cursor) filters.push(Query.cursorAfter(cursor));
  return filters;
}

module.exports = {
  SYSTEM_FIELDS,
  nowIso,
  isNonEmptyString,
  parseJSONSafe,
  sanitizeDocumentData,
  isRetryableError,
  chunkArray,
  gzipCompressBase64,
  buildFacilityFilter,
  buildUpdatedSinceFilter,
  buildPaginationFilter
};