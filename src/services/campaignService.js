import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { sendEmailViaGmail, sendEmailViaMicrosoft } from './emailService.js';
import axios from 'axios';

/**
 * Process a campaign: resolve templates, personalize content, and send emails.
 * This runs asynchronously after the campaign is created.
 */
export const processCampaign = async (userId, campaignId) => {
  const campaignRef = db.collection('users').doc(userId).collection('campaigns').doc(campaignId);

  try {
    const campaignDoc = await campaignRef.get();
    if (!campaignDoc.exists) {
      console.error(`[CampaignSender] Campaign ${campaignId} not found`);
      return;
    }

    const campaign = campaignDoc.data();
    const recipients = campaign.recipientsList || [];
    const sequence = campaign.sequence || [];
    const accountId = campaign.accountId;

    if (!recipients.length) {
      console.warn('[CampaignSender] No recipients found');
      await campaignRef.update({ status: 'Completed', updatedAt: new Date().toISOString() });
      return;
    }

    if (!accountId) {
      console.error('[CampaignSender] No sender account specified');
      await campaignRef.update({ status: 'Failed', error: 'No sender account specified', updatedAt: new Date().toISOString() });
      return;
    }

    // Get the sender account to check its provider
    const accountDoc = await db.collection('users').doc(userId).collection('accounts').doc(accountId).get();
    if (!accountDoc.exists) {
      await campaignRef.update({ status: 'Failed', error: 'Sender account not found', updatedAt: new Date().toISOString() });
      return;
    }
    const account = accountDoc.data();

    // Fetch all templates referenced in the sequence
    const templateIds = [...new Set(sequence.map(s => s.templateId).filter(Boolean))];
    const templateDocs = await Promise.all(
      templateIds.map(id => db.collection('users').doc(userId).collection('templates').doc(id).get())
    );
    const templatesMap = {};
    templateDocs.forEach(doc => {
      if (doc.exists) templatesMap[doc.id] = doc.data();
    });

    // Process only the first step of the sequence immediately
    // Follow-up steps would be handled by a scheduled job (future enhancement)
    const firstStep = sequence[0];
    if (!firstStep || !firstStep.templateId) {
      await campaignRef.update({ status: 'Failed', error: 'No template in sequence', updatedAt: new Date().toISOString() });
      return;
    }

    const template = templatesMap[firstStep.templateId];
    if (!template) {
      await campaignRef.update({ status: 'Failed', error: 'Template not found', updatedAt: new Date().toISOString() });
      return;
    }

    const resumeId = template.resumeId || campaign.resumeId;
    let attachment = null;

    if (resumeId) {
      try {
        const resumeDoc = await db.collection('resumes').doc(resumeId).get();
        if (resumeDoc.exists) {
          const resume = resumeDoc.data();
          if (resume.fileUrl) {
            const response = await axios.get(resume.fileUrl, { responseType: 'arraybuffer' });
            const base64Content = Buffer.from(response.data).toString('base64');
            attachment = {
              filename: resume.fileName || resume.name || 'resume.pdf',
              content: base64Content,
              mimeType: resume.mimeType || 'application/pdf',
            };
          }
        }
      } catch (e) {
        console.error('[CampaignSender] Failed to download resume for attachment:', e);
      }
    }

    let sentCount = 0;
    let failedCount = 0;
    const dailyLimit = campaign.dailyLimit || 50;
    const errors = [];

    for (const recipient of recipients) {
      if (sentCount >= dailyLimit) {
        console.log(`[CampaignSender] Daily limit of ${dailyLimit} reached, pausing.`);
        break;
      }

      await campaignRef.update({ currentRecipient: recipient.email, updatedAt: new Date().toISOString() });

      // Personalize template with recipient data
      const personalizedSubject = personalizeContent(template.subject, recipient);
      let personalizedBody = personalizeContent(template.body, recipient);

      // Inject tracking pixel
      const trackingUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/track/open?u=${userId}&c=${campaignId}&e=${encodeURIComponent(recipient.email)}`;
      const pixelHtml = `<img src="${trackingUrl}" width="1" height="1" style="display:none;" />`;
      if (personalizedBody.includes('</body>')) {
        personalizedBody = personalizedBody.replace('</body>', `${pixelHtml}</body>`);
      } else {
        personalizedBody += pixelHtml;
      }

      try {
        if (account.provider === 'Google') {
          await sendEmailViaGmail(userId, accountId, recipient.email, personalizedSubject, personalizedBody, attachment);
        } else if (account.provider === 'Microsoft') {
          await sendEmailViaMicrosoft(userId, accountId, recipient.email, personalizedSubject, personalizedBody, attachment);
        } else {
          // For unsupported providers, skip
          console.warn(`[CampaignSender] Unsupported provider: ${account.provider}`);
          failedCount++;
          continue;
        }

        sentCount++;

        // Update progress in Firestore
        await campaignRef.update({
          sent: sentCount,
          updatedAt: new Date().toISOString()
        });

        // Add a small delay between emails to avoid rate limiting (2-5 seconds)
        await delay(2000 + Math.random() * 3000);

      } catch (emailError) {
        console.error(`[CampaignSender] Failed to send to ${recipient.email}:`, emailError.message);
        failedCount++;
        errors.push({ email: recipient.email, error: emailError.message });
      }
    }

    // Determine final status
    const allSent = sentCount >= recipients.length;
    const finalStatus = allSent ? 'Completed' : (sentCount > 0 ? 'Active' : 'Failed');

    await campaignRef.update({
      sent: sentCount,
      status: finalStatus,
      currentRecipient: null,
      ...(errors.length > 0 && { errors: errors.slice(0, 10) }),
      updatedAt: new Date().toISOString(),
      ...(finalStatus === 'Completed' && {
        history: FieldValue.arrayUnion({ action: 'Campaign Completed', timestamp: new Date().toISOString() })
      })
    });

    console.log(`[CampaignSender] Campaign ${campaignId} processed: ${sentCount} sent, ${failedCount} failed`);

  } catch (error) {
    console.error(`[CampaignSender] Fatal error processing campaign ${campaignId}:`, error);
    await campaignRef.update({
      status: 'Failed',
      error: error.message,
      updatedAt: new Date().toISOString(),
      history: FieldValue.arrayUnion({ action: `Campaign Failed: ${error.message}`, timestamp: new Date().toISOString() })
    });
  }
};

/**
 * Replace {{placeholders}} in template content with recipient data.
 */
function personalizeContent(content, recipient) {
  if (!content) return '';

  return content
    .replace(/\{\{name\}\}/gi, recipient.name || '')
    .replace(/\{\{email\}\}/gi, recipient.email || '')
    .replace(/\{\{company\}\}/gi, recipient.company || '')
    .replace(/\{\{first_name\}\}/gi, (recipient.name || '').split(' ')[0] || '')
    .replace(/\{\{last_name\}\}/gi, (recipient.name || '').split(' ').slice(1).join(' ') || '');
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
