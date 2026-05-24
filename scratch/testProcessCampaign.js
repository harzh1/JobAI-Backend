import dotenv from 'dotenv';
dotenv.config();

import { processCampaign } from '../src/services/campaignService.js';
import { db } from '../src/config/firebase.js';

async function run() {
  const userId = 'HdeKL0cnHrYn4hZyGxU8XFVWQXT2';
  const campaignId = 'LJdkCLe9Jp0yOXjy7eGC';
  
  // Set sent to 0 so it actually processes
  await db.collection('users').doc(userId).collection('campaigns').doc(campaignId).update({ sent: 0, status: 'Active' });

  console.log('Running processCampaign...');
  await processCampaign(userId, campaignId);
  console.log('Done!');
  process.exit(0);
}

run().catch(console.error);
