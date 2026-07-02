const express = require('express');
const router = express.Router();
const { getVideoInfo } = require('../services/ytdlp');

router.get('/', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const info = await getVideoInfo(url);
    res.json({
      success: true,
      data: info,
    });
  } catch (error) {
    console.error('Error fetching video info:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
