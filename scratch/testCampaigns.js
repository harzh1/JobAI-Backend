import { db } from '../src/config/firebase.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkCampaigns() {
  const usersSnapshot = await db.collection('users').get();
  for (const userDoc of usersSnapshot.docs) {
    const campaignsSnapshot = await db.collection('users').doc(userDoc.id).collection('campaigns').get();
    for (const campDoc of campaignsSnapshot.docs) {
      const camp = campDoc.data();
      console.log(`User: ${userDoc.id}, Campaign: ${campDoc.id}`);
      console.log(`Title: ${camp.title || camp.name}`);
      console.log(`Status: ${camp.status}`);
      console.log(`History:`);
      (camp.history || []).forEach(h => console.log(`  - ${h.timestamp}: ${h.action}`));
      console.log(`Errors Array:`, camp.errors);
      console.log('-------------------------');
    }
  }
  process.exit(0);
}

checkCampaigns().catch(console.error);
