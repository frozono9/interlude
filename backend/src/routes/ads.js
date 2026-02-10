const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');

/**
 * POST /api/ads/analyze
 * Analiza si debe mostrarse un anuncio y lo genera
 */
router.post('/analyze', adController.analyzeAndGenerateAd);

/**
 * GET /api/ads/audio/:filename
 * Sirve el archivo de audio generado
 */
router.get('/audio/:filename', adController.serveAdAudio);

module.exports = router;
