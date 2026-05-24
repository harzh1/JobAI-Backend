import dotenv from 'dotenv';
dotenv.config();

import { sendEmailViaGmail } from '../src/services/emailService.js';
import { db } from '../src/config/firebase.js';

async function testSend() {
  const userId = 'HdeKL0cnHrYn4hZyGxU8XFVWQXT2';
  const accountId = 'bwE0QsbPyrmsh1TMLaB4';
  const to = 'harshrishiravi@gmail.com';
  const subject = 'Test Subject';
  const htmlBody = '<p>Test Body</p>';

  try {
    const res = await sendEmailViaGmail(userId, accountId, to, subject, htmlBody);
    console.log('Success!', res);
  } catch (error) {
    console.error('Failed!', error);
  }
  process.exit(0);
}

testSend().catch(console.error);
