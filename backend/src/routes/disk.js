const express = require('express');
const {
  getDiskUsage,
  remainingQuota,
  DISK_SIZE_MULTIPLIER,
  DISK_HEADROOM_BYTES,
} = require('../utils/storage');

// Storage state for the format screen: the SERVER's disk (global housekeeping)
// plus THIS USER's quota. The frontend renders a banner from both and reads the
// fit knobs (sizeMultiplier/headroomBytes) plus the quota block so its "won't
// fit" disable-check matches the backend's pre-download hard-blocks exactly.
function createDiskRouter({ store }) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const { total, free, used } = await getDiskUsage();
      const max = Number(req.user.max_storage_bytes);
      const quotaUsed = await store.usageForUser(req.user.user_id);

      res.json({
        success: true,
        data: {
          total,
          free,
          used,
          sizeMultiplier: DISK_SIZE_MULTIPLIER,
          headroomBytes: DISK_HEADROOM_BYTES,
          // Per-user allowance. `max`/`remaining` of -1 means unlimited.
          quota: {
            used: quotaUsed,
            max,
            remaining: remainingQuota(quotaUsed, max),
          },
        },
      });
    } catch (error) {
      console.error('❌ Disk usage error:', error);
      res.status(500).json({ success: false, error: 'Failed to read storage usage' });
    }
  });

  return router;
}

module.exports = { createDiskRouter };
