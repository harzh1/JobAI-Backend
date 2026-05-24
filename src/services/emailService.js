import { google } from 'googleapis';
import { db } from '../config/firebase.js';
import axios from 'axios';

const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:5000/api/accounts/google/callback'
  );
};

export const sendEmailViaGmail = async (userId, accountId, to, subject, htmlBody, attachment = null) => {
  try {
    const accountDoc = await db.collection('users').doc(userId).collection('accounts').doc(accountId).get();
    if (!accountDoc.exists) {
      throw new Error('Sender account not found');
    }
    
    const account = accountDoc.data();
    if (!account.tokens || !account.tokens.access_token) {
      throw new Error('Account missing OAuth tokens');
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: account.tokens.access_token,
      refresh_token: account.tokens.refresh_token,
      expiry_date: account.tokens.expiry_date
    });

    // When the oauth2Client is used, it will automatically refresh the access token if needed
    // However, we should listen for token refresh events to update our database
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.refresh_token) {
        await accountDoc.ref.update({
          'tokens.refresh_token': tokens.refresh_token
        });
      }
      if (tokens.access_token) {
        await accountDoc.ref.update({
          'tokens.access_token': tokens.access_token,
          'tokens.expiry_date': tokens.expiry_date
        });
      }
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Construct raw MIME email
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    
    let messageParts = [];
    if (attachment) {
      const boundary = `====boundary_${Date.now()}====`;
      messageParts = [
        `From: ${account.name || account.email} <${account.email}>`,
        `To: ${to}`,
        `Subject: ${utf8Subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        htmlBody,
        '',
        `--${boundary}`,
        `Content-Type: ${attachment.mimeType || 'application/octet-stream'}; name="${attachment.filename}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
        '',
        attachment.content,
        '',
        `--${boundary}--`
      ];
    } else {
      messageParts = [
        `From: ${account.name || account.email} <${account.email}>`,
        `To: ${to}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${utf8Subject}`,
        '',
        htmlBody
      ];
    }
    const message = messageParts.join('\r\n');

    // The body needs to be base64url encoded
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    // Update usedToday count (simple approach, should ideally reset daily)
    await accountDoc.ref.update({
      usedToday: (account.usedToday || 0) + 1
    });

    return { success: true, messageId: res.data.id };
  } catch (error) {
    console.error('[EmailService] Failed to send email via Gmail API:', error);
    throw error;
  }
};

const refreshMicrosoftToken = async (accountDoc, account) => {
  if (Date.now() < account.tokens.expiry_date - 5 * 60 * 1000) {
    return account.tokens.access_token;
  }

  const tokenResponse = await axios.post(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: account.tokens.refresh_token,
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const tokens = tokenResponse.data;
  const newTokens = {
    ...account.tokens,
    access_token: tokens.access_token,
    expiry_date: Date.now() + tokens.expires_in * 1000
  };
  
  if (tokens.refresh_token) {
    newTokens.refresh_token = tokens.refresh_token;
  }

  await accountDoc.ref.update({ tokens: newTokens });
  return tokens.access_token;
};

export const sendEmailViaMicrosoft = async (userId, accountId, to, subject, htmlBody, attachment = null) => {
  try {
    const accountDoc = await db.collection('users').doc(userId).collection('accounts').doc(accountId).get();
    if (!accountDoc.exists) throw new Error('Sender account not found');
    
    const account = accountDoc.data();
    if (!account.tokens || !account.tokens.refresh_token) {
      throw new Error('Account missing Microsoft OAuth tokens');
    }

    const accessToken = await refreshMicrosoftToken(accountDoc, account);

    await axios.post(
      'https://graph.microsoft.com/v1.0/me/sendMail',
      {
        message: {
          subject: subject,
          body: {
            contentType: 'HTML',
            content: htmlBody
          },
          toRecipients: [
            { emailAddress: { address: to } }
          ],
          attachments: attachment ? [
            {
              "@odata.type": "#microsoft.graph.fileAttachment",
              name: attachment.filename,
              contentType: attachment.mimeType || 'application/octet-stream',
              contentBytes: attachment.content
            }
          ] : undefined
        },
        saveToSentItems: 'true'
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    await accountDoc.ref.update({
      usedToday: (account.usedToday || 0) + 1
    });

    return { success: true };
  } catch (error) {
    console.error('[EmailService] Failed to send email via Microsoft Graph:', error.response?.data || error.message);
    throw error;
  }
};
