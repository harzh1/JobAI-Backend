import { db } from '../config/firebase.js';
import { google } from 'googleapis';
import axios from 'axios';

const MICROSOFT_REDIRECT_URI = 'http://localhost:5000/api/accounts/microsoft/callback';

const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:5000/api/accounts/google/callback'
  );
};

export const connectAccountController = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.uid;
    const { email, name, provider, dailyLimit } = req.body;

    if (!email || !provider) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const accountsRef = db.collection('users').doc(userId).collection('accounts');
    const newAccount = {
      email,
      name: name || '',
      provider,
      dailyLimit: dailyLimit || 500,
      usedToday: 0,
      status: 'Connected',
      createdAt: new Date().toISOString(),
    };

    const docRef = await accountsRef.add(newAccount);
    res.status(201).json({ success: true, id: docRef.id, ...newAccount });
  } catch (error) {
    console.error('[Account] Connect error:', error);
    res.status(500).json({ error: 'Failed to connect account', details: error.message });
  }
};

export const getAccountsController = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.uid;
    const snapshot = await db.collection('users').doc(userId).collection('accounts').get();
    
    const accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(accounts);
  } catch (error) {
    console.error('[Account] Get error:', error);
    res.status(500).json({ error: 'Failed to get accounts', details: error.message });
  }
};

export const deleteAccountController = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.uid;
    const { accountId } = req.params;

    await db.collection('users').doc(userId).collection('accounts').doc(accountId).delete();
    res.status(200).json({ success: true, message: 'Account deleted' });
  } catch (error) {
    console.error('[Account] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete account', details: error.message });
  }
};

export const updateAccountController = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.uid;
    const { accountId } = req.params;
    const updates = req.body;

    const accountRef = db.collection('users').doc(userId).collection('accounts').doc(accountId);
    
    // Validate account exists
    const doc = await accountRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await accountRef.update({
      ...updates,
      updatedAt: new Date().toISOString()
    });

    res.status(200).json({ success: true, id: accountId, ...updates });
  } catch (error) {
    console.error('[Account] Update error:', error);
    res.status(500).json({ error: 'Failed to update account', details: error.message });
  }
};

export const googleAuthUrlController = async (req, res) => {
  try {
    const userId = req.user.uid;
    const oauth2Client = getOAuth2Client();
    
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: userId
    });

    res.json({ url });
  } catch (error) {
    console.error('[Account] Error generating auth url', error);
    res.status(500).json({ error: 'Failed to generate auth url' });
  }
};

export const googleAuthCallbackController = async (req, res) => {
  try {
    const { code, state: userId } = req.query;
    if (!code || !userId) {
      return res.status(400).send('Missing code or state');
    }

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    const accountsRef = db.collection('users').doc(userId).collection('accounts');
    const newAccount = {
      email: userInfo.data.email,
      name: userInfo.data.name || '',
      provider: 'Google',
      dailyLimit: 500,
      usedToday: 0,
      status: 'Connected',
      createdAt: new Date().toISOString(),
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      }
    };
    
    await accountsRef.add(newAccount);
    
    res.redirect('http://localhost:5173/dashboard?view=campaigns');
  } catch (error) {
    console.error('[Account] Error in google auth callback', error);
    res.status(500).send('Authentication failed');
  }
};

export const microsoftAuthUrlController = (req, res) => {
  const userId = req.user.uid;
  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${process.env.MICROSOFT_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(MICROSOFT_REDIRECT_URI)}&response_mode=query&scope=${encodeURIComponent('offline_access User.Read Mail.Send')}&state=${userId}`;
  res.json({ url: authUrl });
};

export const microsoftAuthCallbackController = async (req, res) => {
  try {
    const { code, state: userId } = req.query;
    if (!code || !userId) {
      return res.status(400).send('Missing code or state');
    }

    const tokenResponse = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        scope: 'offline_access User.Read Mail.Send',
        code: code,
        redirect_uri: MICROSOFT_REDIRECT_URI,
        grant_type: 'authorization_code',
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const tokens = tokenResponse.data;

    // Get user info
    const userResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    
    const userInfo = userResponse.data;

    const accountsRef = db.collection('users').doc(userId).collection('accounts');
    const newAccount = {
      email: userInfo.userPrincipalName || userInfo.mail,
      name: userInfo.displayName || '',
      provider: 'Microsoft',
      dailyLimit: 500,
      usedToday: 0,
      status: 'Connected',
      createdAt: new Date().toISOString(),
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: Date.now() + tokens.expires_in * 1000
      }
    };
    
    await accountsRef.add(newAccount);
    
    res.redirect('http://localhost:5173/dashboard?view=campaigns');
  } catch (error) {
    console.error('[Account] Error in microsoft auth callback', error.response?.data || error.message);
    res.status(500).send('Authentication failed');
  }
};
