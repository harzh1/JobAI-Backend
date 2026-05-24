import { db } from '../config/firebase.js';

export const createTemplateController = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.uid;
    const { name, subject, body, folder, resumeId } = req.body;

    if (!name || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const templatesRef = db.collection('users').doc(userId).collection('templates');
    const newTemplate = {
      name,
      subject,
      body,
      folder: folder || 'Uncategorized',
      resumeId: resumeId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await templatesRef.add(newTemplate);
    res.status(201).json({ success: true, id: docRef.id, ...newTemplate });
  } catch (error) {
    console.error('[Template] Create error:', error);
    res.status(500).json({ error: 'Failed to create template', details: error.message });
  }
};

export const getTemplatesController = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.uid;
    const snapshot = await db.collection('users').doc(userId).collection('templates').get();
    
    const templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(templates);
  } catch (error) {
    console.error('[Template] Get error:', error);
    res.status(500).json({ error: 'Failed to get templates', details: error.message });
  }
};

export const updateTemplateController = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.uid;
    const { templateId } = req.params;
    const updates = req.body;

    const templateRef = db.collection('users').doc(userId).collection('templates').doc(templateId);
    await templateRef.update({
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    const updatedDoc = await templateRef.get();
    res.status(200).json({ success: true, id: templateId, ...updatedDoc.data() });
  } catch (error) {
    console.error('[Template] Update error:', error);
    res.status(500).json({ error: 'Failed to update template', details: error.message });
  }
};

export const deleteTemplateController = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.uid;
    const { templateId } = req.params;

    await db.collection('users').doc(userId).collection('templates').doc(templateId).delete();
    res.status(200).json({ success: true, message: 'Template deleted' });
  } catch (error) {
    console.error('[Template] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete template', details: error.message });
  }
};
