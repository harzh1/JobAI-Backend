import { db } from '../config/firebase.js';

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
