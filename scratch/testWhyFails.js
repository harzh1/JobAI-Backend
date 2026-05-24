import dotenv from 'dotenv';
dotenv.config();

import { db } from '../src/config/firebase.js';

async function run() {
  const userId = 'HdeKL0cnHrYn4hZyGxU8XFVWQXT2';
  const campaignId = 'LJdkCLe9Jp0yOXjy7eGC';
  
  const doc = await db.collection('users').doc(userId).collection('campaigns').doc(campaignId).get();
  const data = doc.data();
  console.log('Sequence:', data.sequence);
  console.log('Account:', data.accountId);
  console.log('Recipients length:', data.recipientsList?.length);
  process.exit(0);
}

run().catch(console.error);
