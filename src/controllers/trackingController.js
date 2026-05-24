import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

export const trackOpenController = async (req, res) => {
  try {
    const { u: userId, c: campaignId, e: email } = req.query;
    
    if (userId && campaignId && email) {
      const campaignRef = db.collection('users').doc(userId).collection('campaigns').doc(campaignId);
      const doc = await campaignRef.get();
      
      if (doc.exists) {
        const campaign = doc.data();
        const recipientStatus = campaign.recipientStatus || {};
        const safeEmailKey = email.replace(/\./g, ',');
        
        // Only mark as opened if it hasn't been marked as Opened or Replied yet
        if (recipientStatus[safeEmailKey]?.status !== 'Opened' && recipientStatus[safeEmailKey]?.status !== 'Replied') {
          recipientStatus[safeEmailKey] = {
            status: 'Opened',
            time: new Date().toISOString()
          };
          
          await campaignRef.update({
            opens: FieldValue.increment(1),
            recipientStatus,
            history: FieldValue.arrayUnion({
              action: `Email opened by ${email}`,
              timestamp: new Date().toISOString()
            })
          });
          console.log(`[Tracking] Marked ${email} as Opened for campaign ${campaignId}`);
        }
      }
    }
  } catch (error) {
    console.error('[Tracking] Error tracking open:', error);
  }

  // Always return a 1x1 transparent GIF
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.end(pixel);
};
