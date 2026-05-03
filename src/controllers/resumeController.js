import cloudinary from '../config/cloudinary.js';
import { db } from '../config/firebase.js';

const PDF_MIME_TYPE = 'application/pdf';
const WORD_MIME_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const getResumeDisplayName = (fileName = 'Resume') =>
  fileName.replace(/\.[^.]+$/, '') || fileName;

const getFileExtension = (fileName = '') => {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

const getCloudinaryResourceType = (fileType = '', fileName = '') => {
  const normalizedType = fileType.toLowerCase();
  const extension = getFileExtension(fileName);

  if (normalizedType === PDF_MIME_TYPE || extension === 'pdf') {
    return 'image';
  }

  if (
    WORD_MIME_TYPES.has(normalizedType) ||
    extension === 'doc' ||
    extension === 'docx'
  ) {
    return 'raw';
  }

  return 'raw';
};

const getCloudinaryUploadOptions = (userId, fileName, fileType) => {
  const resourceType = getCloudinaryResourceType(fileType, fileName);
  const publicId = getResumeDisplayName(fileName);
  const options = {
    resource_type: resourceType,
    folder: `jobai/resumes/${userId}`,
    public_id: publicId,
    overwrite: true,
    invalidate: true,
  };

  if (resourceType === 'image') {
    options.format = 'pdf';
  }

  return options;
};

const normalizeUploadedAt = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const destroyCloudinaryAsset = async (publicId, resourceType = 'raw') => {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
  } catch (destroyError) {
    console.warn(
      `[Resume] ${resourceType} asset deletion fallback:`,
      destroyError.message
    );
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType === 'image' ? 'raw' : 'image',
      invalidate: true,
    });
  }
};

/**
 * Upload resume to Cloudinary and save metadata to Firestore
 */
export const uploadResumeController = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      console.error('[Resume] Missing user or uid in request');
      return res.status(401).json({ error: 'Unauthorized: User not found in request' });
    }

    const userId = req.user.uid;
    const { fileBuffer, fileName, fileType } = req.body;

    if (!fileBuffer || !fileName) {
      return res.status(400).json({ error: 'Missing file or fileName' });
    }

    const uploadOptions = getCloudinaryUploadOptions(userId, fileName, fileType);

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('[Resume] Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      // Convert base64 or buffer to stream
      if (typeof fileBuffer === 'string') {
        stream.write(Buffer.from(fileBuffer, 'base64'));
      } else {
        stream.write(fileBuffer);
      }
      stream.end();
    });

    // Save metadata to Firestore using Firebase Admin SDK
    const uploadedAt = new Date();
    const resumeRef = db.collection('resumes').doc();
    const userResumeRef = db
      .collection('users')
      .doc(userId)
      .collection('resumes')
      .doc(resumeRef.id);
    const displayName = getResumeDisplayName(fileName);
    const existingUserResumes = await db
      .collection('users')
      .doc(userId)
      .collection('resumes')
      .limit(1)
      .get();
    const isPrimary = existingUserResumes.empty;

    const resumeMetadata = {
      userId,
      fileName,
      name: displayName,
      displayName,
      downloadUrl: uploadResult.secure_url,
      fileUrl: uploadResult.secure_url,
      cloudinaryUrl: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      cloudinaryResourceType: uploadResult.resource_type || uploadOptions.resource_type,
      cloudinaryFormat: uploadResult.format || getFileExtension(fileName) || null,
      fileSize: uploadResult.bytes,
      fileType: fileType || null,
      mimeType: fileType || null,
      storagePath: `cloudinary:${uploadResult.resource_type || uploadOptions.resource_type}:${uploadResult.public_id}`,
      isPrimary,
      uploadedAt,
      createdAt: uploadedAt,
      updatedAt: uploadedAt,
    };

    const batch = db.batch();
    batch.set(resumeRef, resumeMetadata);
    batch.set(userResumeRef, resumeMetadata);
    const userDocUpdate = {
      stats: {
        resumeCount: existingUserResumes.size + 1,
      },
      updatedAt: uploadedAt,
    };

    if (isPrimary) {
      userDocUpdate.stats.primaryResumeId = resumeRef.id;
    }

    batch.set(db.collection('users').doc(userId), userDocUpdate, {
      merge: true,
    });
    await batch.commit();

    res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully',
      id: resumeRef.id,
      resumeId: resumeRef.id,
      ...resumeMetadata,
    });
  } catch (error) {
    console.error('[Resume] Upload error:', error);
    res.status(500).json({ error: 'Failed to upload resume', details: error.message });
  }
};

/**
 * Get all resumes for a user
 */
export const getUserResumesController = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      console.error('[Resume] Missing user or uid in request');
      return res.status(401).json({ error: 'Unauthorized: User not found in request' });
    }

    const userId = req.user.uid;

    const resumesSnapshot = await db
      .collection('resumes')
      .where('userId', '==', userId)
      .get();

    const resumes = resumesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        uploadedAt: normalizeUploadedAt(data.uploadedAt),
        createdAt: normalizeUploadedAt(data.createdAt),
        updatedAt: normalizeUploadedAt(data.updatedAt),
      };
    });

    res.status(200).json(resumes);
  } catch (error) {
    console.error('[Resume] Get resumes error:', error);
    res.status(500).json({ error: 'Failed to fetch resumes', details: error.message });
  }
};

/**
 * Delete a resume from Cloudinary and Firestore
 */
export const deleteResumeController = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      console.error('[Resume] Missing user or uid in request');
      return res.status(401).json({ error: 'Unauthorized: User not found in request' });
    }

    const userId = req.user.uid;
    const { resumeId } = req.params;

    // Get resume metadata
    const resumeRef = db.collection('resumes').doc(resumeId);
    const resumeDoc = await resumeRef.get();

    if (!resumeDoc.exists) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const resumeData = resumeDoc.data();

    // Verify ownership
    if (resumeData.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this resume' });
    }

    // Delete from Cloudinary
    await destroyCloudinaryAsset(
      resumeData.cloudinaryPublicId,
      resumeData.cloudinaryResourceType ||
        getCloudinaryResourceType(resumeData.fileType, resumeData.fileName)
    );

    // Delete from Firestore
    const userResumeRef = db
      .collection('users')
      .doc(userId)
      .collection('resumes')
      .doc(resumeId);
    const remainingUserResumes = await db
      .collection('users')
      .doc(userId)
      .collection('resumes')
      .get();
    const otherResumeDocs = remainingUserResumes.docs.filter(
      (doc) => doc.id !== resumeId
    );
    const existingPrimary =
      otherResumeDocs.find((doc) => doc.data()?.isPrimary) || null;
    const nextPrimary = resumeData.isPrimary
      ? existingPrimary || otherResumeDocs[0] || null
      : existingPrimary;

    const batch = db.batch();
    batch.delete(resumeRef);
    batch.delete(userResumeRef);
    batch.set(
      db.collection('users').doc(userId),
      {
        stats: {
          resumeCount: Math.max(remainingUserResumes.size - 1, 0),
          primaryResumeId: nextPrimary ? nextPrimary.id : null,
        },
        updatedAt: new Date(),
      },
      { merge: true }
    );

    if (resumeData.isPrimary && nextPrimary) {
      batch.set(
        nextPrimary.ref,
        {
          isPrimary: true,
          updatedAt: new Date(),
        },
        { merge: true }
      );
      batch.set(
        db.collection('resumes').doc(nextPrimary.id),
        {
          isPrimary: true,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    }

    await batch.commit();

    res.status(200).json({ success: true, message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({ error: 'Failed to delete resume', details: error.message });
  }
};
