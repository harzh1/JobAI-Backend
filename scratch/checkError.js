import { db } from '../src/config/firebase.js';

async function check() {
  const usersSnapshot = await db.collection('users').limit(1).get();
  if (usersSnapshot.empty) {
    console.log("No users found");
    return process.exit(0);
  }
  const userId = usersSnapshot.docs[0].id;
  console.log("Checking user:", userId);

  const campaignsSnapshot = await db.collection('users').doc(userId).collection('campaigns').orderBy('createdAt', 'desc').limit(1).get();
  if (campaignsSnapshot.empty) {
    console.log("No campaigns found");
    return process.exit(0);
  }

  const campaign = campaignsSnapshot.docs[0].data();
  console.log("Latest Campaign:", campaign.name || campaign.title);
  console.log("Status:", campaign.status);
  console.log("Errors:", JSON.stringify(campaign.errors, null, 2));
  console.log("History:", JSON.stringify(campaign.history, null, 2));
  process.exit(0);
}

check().catch(console.error);
