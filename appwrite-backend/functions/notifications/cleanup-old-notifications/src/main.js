const { Client, Databases, Query } = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    // Calculate cleanup dates
    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    const ninetyDaysAgo = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000));

    // Archive old completed notifications (30+ days)
    const oldCompleted = await databases.listDocuments(
      'immune-me-db',
      'notifications',
      [
        Query.equal('status', 'completed'),
        Query.lessThan('updatedAt', thirtyDaysAgo.toISOString()),
        Query.limit(100)
      ]
    );

    let archivedCount = 0;
    for (const notification of oldCompleted.documents) {
      await databases.updateDocument(
        'immune-me-db',
        'notifications',
        notification.$id,
        {
          status: 'archived',
          archivedAt: new Date().toISOString()
        }
      );
      archivedCount++;
    }

    // Delete very old archived notifications (90+ days)
    const veryOldArchived = await databases.listDocuments(
      'immune-me-db',
      'notifications',
      [
        Query.equal('status', 'archived'),
        Query.lessThan('archivedAt', ninetyDaysAgo.toISOString()),
        Query.limit(50)
      ]
    );

    let deletedCount = 0;
    for (const notification of veryOldArchived.documents) {
      await databases.deleteDocument(
        'immune-me-db',
        'notifications',
        notification.$id
      );
      deletedCount++;
    }

    log(`Cleanup completed: ${archivedCount} archived, ${deletedCount} deleted`);

    return res.json({
      success: true,
      archived: archivedCount,
      deleted: deletedCount
    });

  } catch (err) {
    error('Notification cleanup failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};