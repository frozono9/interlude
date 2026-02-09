const express = require('express');
const router = express.Router();
const transitionService = require('../services/transitionEngine');

/**
 * POST /api/transitions/generate
 * Genera un plan de transición entre dos canciones
 * 
 * Body: {
 *   currentSongId: number,
 *   nextSongId: number,
 *   interlude?: { duration: number, audioUrl: string }
 * }
 */
router.post('/generate', async (req, res) => {
  try {
    const { currentSongId, nextSongId, interlude } = req.body;
    
    if (!currentSongId || !nextSongId) {
      return res.status(400).json({
        error: 'Missing required fields: currentSongId, nextSongId'
      });
    }
    
    const mixPlan = await transitionService.generateTransition(
      currentSongId,
      nextSongId,
      interlude
    );
    
    res.json({
      success: true,
      mixPlan
    });
    
  } catch (error) {
    console.error('Error generating transition:', error);
    res.status(500).json({
      error: 'Failed to generate transition',
      message: error.message
    });
  }
});

/**
 * GET /api/transitions/preview/:songAId/:songBId
 * Vista previa de cómo quedaría la transición
 */
router.get('/preview/:songAId/:songBId', async (req, res) => {
  try {
    const { songAId, songBId } = req.params;
    
    const mixPlan = await transitionService.generateTransition(
      parseInt(songAId),
      parseInt(songBId)
    );
    
    res.json({
      compatible: mixPlan.harmonicScore > 0.6,
      score: mixPlan.harmonicScore,
      recommendedDuration: mixPlan.transitionDurationMs,
      preview: {
        bpmSync: mixPlan.bpmSync,
        harmonicKey: mixPlan.harmonicScore
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
