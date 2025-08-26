'use strict';

const { Client, Databases } = require('node-appwrite');
const path = require('path');
const fs = require('fs');

async function setupCollectionPermissions() {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  const dbId = process.env.APPWRITE_DATABASE_ID || 'immune-me-db';

  const configPath = path.resolve(__dirname, '../config/collection-permissions.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  const collectionPermissions = JSON.parse(raw);

  for (const [collectionId, perms] of Object.entries(collectionPermissions)) {
    try {
      const permissionList = [
        ...(perms.read || []).map((p) => `${p}:read`),
        ...(perms.create || []).map((p) => `${p}:create`),
        ...(perms.update || []).map((p) => `${p}:update`),
        ...(perms.delete || []).map((p) => `${p}:delete`)
      ];

      // Update collection permissions
      // Depending on SDK version, additional params (like name) might be required.
      await databases.updateCollection(dbId, collectionId, collectionId, permissionList);

      console.log(`Updated permissions for collection: ${collectionId}`);
    } catch (err) {
      console.error(`Failed to update permissions for ${collectionId}: ${err.message}`);
    }
  }
}

if (require.main === module) {
  setupCollectionPermissions()
    .then(() => {
      console.log('Security rules update completed');
      process.exit(0);
    })
    .catch((e) => {
      console.error('Security rules update failed:', e);
      process.exit(1);
    });
}

module.exports = { setupCollectionPermissions };