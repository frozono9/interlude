const express = require('express');
const router = express.Router();
const audioAnalysis = require('../services/audioAnalysis');

/**
 * GET /api/audio/analyze/:songId
 * Obtiene análisis de audio de una canción
 */
router.get('/analyze/:songId', async (req, res) => {
  try {
    const { songId } = req.params;
    const metadata = await audioAnalysis.getSongMetadata(parseInt(songId));
    
    res.json({
      success: true,
      songId: parseInt(songId),
      analysis: metadata
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to analyze song',
      message: error.message
    });
  }
});

/**
 * GET /api/audio/batch-analyze
 * Analiza múltiples canciones de una vez
 */
router.post('/batch-analyze', async (req, res) => {
  try {
    const { songIds } = req.body;
    
    const results = await Promise.all(
      songIds.map(id => audioAnalysis.getSongMetadata(id))
    );
    
    res.json({
      success: true,
      analyses: results
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
