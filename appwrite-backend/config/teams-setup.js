'use strict';

const { Client, Teams } = require('node-appwrite');

async function ensureTeams() {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const teams = new Teams(client);

  const requiredTeams = [
    { id: 'admin-team', name: 'Admins' },
    { id: 'facility-managers', name: 'Facility Managers' },
    { id: 'healthcare-workers', name: 'Healthcare Workers' },
    { id: 'data-entry-clerks', name: 'Data Entry Clerks' }
  ];

  for (const t of requiredTeams) {
    try {
      await teams.get(t.id);
      console.log(`Team exists: ${t.id}`);
    } catch (err) {
      console.log(`Creating team: ${t.id}`);
      await teams.create(t.id, t.name);
    }
  }
}

if (require.main === module) {
  ensureTeams().then(() => {
    console.log('Team setup completed');
    process.exit(0);
  }).catch((e) => {
    console.error('Team setup failed:', e.message);
    process.exit(1);
  });
}

module.exports = { ensureTeams };