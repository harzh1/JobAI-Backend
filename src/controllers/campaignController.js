import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { processCampaign } from '../services/campaignService.js';

export const createCampaignController = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.uid;
    const campaignData = req.body;

    if (!campaignData.name || !campaignData.sequence) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const campaignsRef = db.collection('users').doc(userId).collection('campaigns');
    const newCampaign = {
      ...campaignData,
      title: campaignData.title || campaignData.name,
      status: 'Active',
      sent: 0,
      opens: 0,
      replies: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [{ action: 'Campaign Created', timestamp: new Date().toISOString() }]
    };

    const docRef = await campaignsRef.add(newCampaign);
    
    // Fire-and-forget: start sending emails in the background
    processCampaign(userId, docRef.id).catch(err => {
      console.error('[Campaign] Background processing error:', err);
    });
    
    res.status(201).json({ success: true, id: docRef.id, ...newCampaign });
  } catch (error) {
    console.error('[Campaign] Create error:', error);
    res.status(500).json({ error: 'Failed to create campaign', details: error.message });
  }
};

export const getCampaignsController = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.uid;
    const snapshot = await db.collection('users').doc(userId).collection('campaigns').get();
    
    const campaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(campaigns);
  } catch (error) {
    console.error('[Campaign] Get error:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns', details: error.message });
  }
};

export const getCampaignController = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.uid;
    const doc = await db.collection('users').doc(userId).collection('campaigns').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('[Campaign] Get single error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign', details: error.message });
  }
};

export const updateCampaignStatusController = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.uid;
    const { campaignId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Missing status' });
    }

    const campaignRef = db.collection('users').doc(userId).collection('campaigns').doc(campaignId);
    await campaignRef.update({
      status,
      updatedAt: new Date().toISOString(),
      history: FieldValue.arrayUnion({ action: `Status changed to ${status}`, timestamp: new Date().toISOString() })
    });
    
    // If the campaign is being resumed, start the background process
    if (status === 'Active') {
      processCampaign(userId, campaignId)
        .catch(err => console.error("Background processing failed on resume:", err));
    }
    
    res.status(200).json({ success: true, id: campaignId, status });
  } catch (error) {
    console.error('[Campaign] Update status error:', error);
    res.status(500).json({ error: 'Failed to update campaign status', details: error.message });
  }
};

export const deleteCampaignController = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.uid;
    const { campaignId } = req.params;

    await db.collection('users').doc(userId).collection('campaigns').doc(campaignId).delete();
    res.status(200).json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    console.error('[Campaign] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete campaign', details: error.message });
  }
};

export const resendCampaignController = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.uid;
    const { campaignId } = req.params;
    const { accountId } = req.body || {};

    const campaignRef = db.collection('users').doc(userId).collection('campaigns').doc(campaignId);
    
    const doc = await campaignRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const updates = {
      status: 'Active',
      sent: 0,
      updatedAt: new Date().toISOString(),
      history: FieldValue.arrayUnion({ action: 'Resent Campaign', timestamp: new Date().toISOString() })
    };

    if (accountId) {
      const accountDoc = await db.collection('users').doc(userId).collection('accounts').doc(accountId).get();
      if (!accountDoc.exists) {
        return res.status(400).json({ error: 'Provided account not found' });
      }
      updates.accountId = accountId;
    }

    await campaignRef.update(updates);
    
    // Fire-and-forget: start sending emails in the background
    processCampaign(userId, campaignId).catch(err => {
      console.error('[Campaign] Background processing error during resend:', err);
    });
    
    res.status(200).json({ success: true, message: 'Campaign resend initiated' });
  } catch (error) {
    console.error('[Campaign] Resend error:', error);
    res.status(500).json({ error: 'Failed to resend campaign', details: error.message });
  }
};
