import { db } from '../src/config/firebase.js';

async function checkAccount() {
  const usersSnapshot = await db.collection('users').get();
  for (const userDoc of usersSnapshot.docs) {
    const accountsSnapshot = await db.collection('users').doc(userDoc.id).collection('accounts').get();
    for (const accDoc of accountsSnapshot.docs) {
      const acc = accDoc.data();
      console.log(`User: ${userDoc.id}, Account: ${accDoc.id}`);
      console.log(`Provider: ${acc.provider}`);
      console.log(`Has Access Token: ${!!acc.tokens?.access_token}`);
      console.log(`Has Refresh Token: ${!!acc.tokens?.refresh_token}`);
      console.log('-------------------------');
    }
  }
  process.exit(0);
}

checkAccount().catch(console.error);
