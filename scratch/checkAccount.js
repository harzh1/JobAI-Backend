import { db } from '../src/config/firebase.js';

async function check() {
  const usersSnapshot = await db.collection('users').limit(1).get();
  if (usersSnapshot.empty) {
    console.log("No users found");
    return process.exit(0);
  }
  const userId = usersSnapshot.docs[0].id;
  console.log("Checking user:", userId);

  const accountsSnapshot = await db.collection('users').doc(userId).collection('accounts').get();
  if (accountsSnapshot.empty) {
    console.log("No accounts found");
    return process.exit(0);
  }

  accountsSnapshot.forEach(doc => {
    const acc = doc.data();
    console.log("Account:", acc.email, "Provider:", acc.provider);
    if (acc.tokens) {
      console.log("- Access Token:", acc.tokens.access_token ? "Exists" : "Missing");
      console.log("- Refresh Token:", acc.tokens.refresh_token ? "Exists" : "Missing");
      console.log("- Expiry Date:", acc.tokens.expiry_date);
      console.log("- Is Expired?", acc.tokens.expiry_date < Date.now());
    } else {
      console.log("- No tokens object!");
    }
  });

  process.exit(0);
}

check().catch(console.error);
