'use strict';

const { Client, Databases } = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const dbId = process.env.APPWRITE_DATABASE_ID || 'immune-me-db';

  try {
    const logData = JSON.parse(req.payload || '{}');
    if (!logData.userId || !logData.operation || !logData.collection) {
      return res.json({ success: false, error: 'Missing required log fields' }, 400);
    }

    await databases.createDocument(
      dbId,
      'access_audit_log',
      'unique()',
      {
        ...logData,
        timestamp: logData.timestamp || new Date().toISOString()
      }
    );

    return res.json({ success: true });
  } catch (err) {
    error('Audit log write failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};