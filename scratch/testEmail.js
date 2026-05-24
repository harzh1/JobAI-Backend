import { db } from '../src/config/firebase.js';
import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

async function testEmail() {
  const usersSnapshot = await db.collection('users').limit(1).get();
  const userId = usersSnapshot.docs[0].id;

  const accountsSnapshot = await db.collection('users').doc(userId).collection('accounts').where('provider', '==', 'Google').limit(1).get();
  if (accountsSnapshot.empty) {
    console.log("No Google accounts found");
    return process.exit(0);
  }
  
  const account = accountsSnapshot.docs[0].data();
  console.log("Using account:", account.email);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:5000/api/accounts/google/callback'
  );
  
  oauth2Client.setCredentials(account.tokens);

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const to = 'test@example.com';
  const subject = 'Test Subject';
  const htmlBody = '<p>Test Body</p>';
  
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    `From: ${account.name || account.email} <${account.email}>`,
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    htmlBody
  ];
  
  const message = messageParts.join('\r\n');
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  console.log("Encoded Message Length:", encodedMessage.length);

  try {
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      }
    });
    console.log("Success!", res.data);
  } catch (error) {
    console.error("GMAIL API ERROR:");
    if (error.response && error.response.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error);
    }
  }

  process.exit(0);
}

testEmail().catch(console.error);
