import dotenv from 'dotenv';
dotenv.config();

import { db } from '../src/config/firebase.js';

async function checkSpecificAccount() {
  const userId = 'HdeKL0cnHrYn4hZyGxU8XFVWQXT2';
  const accountId = 'hAeZILMFx8RxNWyPc3u7';

  const accountDoc = await db.collection('users').doc(userId).collection('accounts').doc(accountId).get();
  console.log('Account exists?', accountDoc.exists);
  if (accountDoc.exists) {
    console.log('Account data:', accountDoc.data());
  }
  process.exit(0);
}

checkSpecificAccount().catch(console.error);
