import { db } from '../config/firebase.js';

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
    };

    const docRef = await campaignsRef.add(newCampaign);
    
    // In a real app, this is where you'd trigger a background job to start sending emails
    
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
    res.status(500).json({ error: 'Failed to get campaigns', details: error.message });
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
      updatedAt: new Date().toISOString()
    });
    
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
