const path = require('path');
const fs = require('fs');

const downloadsDir = path.join(__dirname, '../../downloads');
const METADATA_FILE = 'metadata.json';

function getMetadataPath(downloadId) {
  return path.join(downloadsDir, downloadId, METADATA_FILE);
}

function saveDownloadMetadata(downloadId, metadata) {
  const metadataPath = getMetadataPath(downloadId);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
}

function getDownloadMetadata(downloadId) {
  const metadataPath = getMetadataPath(downloadId);
  if (fs.existsSync(metadataPath)) {
    return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  }
  return null;
}

function listDownloads() {
  if (!fs.existsSync(downloadsDir)) {
    return [];
  }

  const downloads = [];
  const dirs = fs.readdirSync(downloadsDir);

  for (const dir of dirs) {
    const dirPath = path.join(downloadsDir, dir);
    if (fs.statSync(dirPath).isDirectory()) {
      const metadata = getDownloadMetadata(dir);
      const files = fs.readdirSync(dirPath).filter(f => f !== METADATA_FILE);
      
      if (files.length > 0) {
        downloads.push({
          downloadId: dir,
          ...metadata,
          files,
          path: dirPath
        });
      }
    }
  }

  return downloads.sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
}

function getDownloadFilePath(downloadId, filename) {
  const filePath = path.join(downloadsDir, downloadId, filename);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}

function deleteDownload(downloadId) {
  const downloadPath = path.join(downloadsDir, downloadId);
  if (fs.existsSync(downloadPath)) {
    fs.rmSync(downloadPath, { recursive: true, force: true });
    return true;
  }
  return false;
}

function cleanupOldDownloads(maxAgeHours = 24) {
  if (!fs.existsSync(downloadsDir)) {
    return { deleted: 0, errors: [] };
  }

  const now = Date.now();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  const deleted = [];
  const errors = [];

  const dirs = fs.readdirSync(downloadsDir);
  
  for (const dir of dirs) {
    const dirPath = path.join(downloadsDir, dir);
    
    try {
      const stats = fs.statSync(dirPath);
      const age = now - stats.mtimeMs;
      
      if (age > maxAgeMs) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        deleted.push(dir);
      }
    } catch (err) {
      errors.push({ dir, error: err.message });
    }
  }

  return { deleted: deleted.length, deletedIds: deleted, errors };
}

module.exports = {
  downloadsDir,
  saveDownloadMetadata,
  getDownloadMetadata,
  listDownloads,
  getDownloadFilePath,
  deleteDownload,
  cleanupOldDownloads
};
