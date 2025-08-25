'use strict';

const { Client, Databases } = require('node-appwrite');
const { parseJSONSafe, isNonEmptyString, sanitizeDocumentData } = require('../../../../utils/sync-utilities');
const SYNC_CONFIG = require('../../../../config/sync-configuration.json');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    const payload = parseJSONSafe(req.payload, {});
    const { collection, documents, mode = 'validate' } = payload;

    if (!isNonEmptyString(collection) || !Array.isArray(documents)) {
      return res.json({ success: false, error: 'collection and documents[] required' }, 400);
    }

    const rulesCfg = (SYNC_CONFIG.validation && SYNC_CONFIG.validation[collection]) || null;
    if (!rulesCfg) {
      return res.json({ success: false, error: `No validation rules configured for ${collection}` }, 400);
    }

    const results = [];
    let validCount = 0;
    let invalidCount = 0;

    for (const doc of documents) {
      const { $id, ...data } = doc || {};
      const sanitized = sanitizeDocumentData(data);
      const validation = validateDocument(rulesCfg, sanitized);

      if (validation.valid) {
        validCount++;
        if (mode === 'upsert' && $id) {
          try {
            // Try update, on 404 create
            const updated = await databases.updateDocument('immune-me-db', collection, $id, sanitized);
            results.push({ id: $id, valid: true, operation: 'update', updatedAt: updated.$updatedAt });
          } catch (e) {
            if (e.code === 404) {
              const created = await databases.createDocument('immune-me-db', collection, $id, sanitized);
              results.push({ id: created.$id, valid: true, operation: 'create', createdAt: created.$createdAt });
            } else {
              results.push({ id: $id, valid: false, errors: [`Upsert failed: ${e.message}`] });
              invalidCount++;
            }
          }
        } else {
          results.push({ id: $id || null, valid: true });
        }
      } else {
        invalidCount++;
        results.push({ id: $id || null, valid: false, errors: validation.errors });
      }
    }

    return res.json({
      success: true,
      collection,
      mode,
      totals: { valid: validCount, invalid: invalidCount, processed: documents.length },
      results
    });
  } catch (err) {
    error('Data validation failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};

function validateDocument(rulesCfg, data) {
  const errors = [];

  // Required fields
  if (Array.isArray(rulesCfg.required)) {
    for (const field of rulesCfg.required) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        errors.push(`Field "${field}" is required`);
      }
    }
  }

  // Type checks
  if (rulesCfg.types && typeof rulesCfg.types === 'object') {
    for (const [field, type] of Object.entries(rulesCfg.types)) {
      if (data[field] !== undefined && data[field] !== null) {
        if (!typeMatches(data[field], type)) {
          errors.push(`Field "${field}" expected type ${type}`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function typeMatches(val, type) {
  switch (type) {
    case 'string': return typeof val === 'string';
    case 'number': return typeof val === 'number' && !isNaN(val);
    case 'boolean': return typeof val === 'boolean';
    case 'object': return typeof val === 'object' && !Array.isArray(val);
    case 'array': return Array.isArray(val);
    default: return true;
  }
}