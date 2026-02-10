const geminiService = require('../services/geminiService');
const elevenLabsService = require('../services/elevenLabsService');
const audioMixerService = require('../services/audioMixerService');
const { selectAd } = require('../services/adBank');
const crypto = require('crypto');
const path = require('path');

/**
 * Mapeo de títulos a archivos mp3 para música de fondo
 */
function getBackgroundPath(title) {
  const songMapping = {
    'Levitating': 'levitating.mp3',
    'MONACO': 'monaco.mp3',
    'Tití Me Preguntó': 'titi.mp3',
    'BAILE INoLVIDABLE': 'baile.mp3',
    'Cruel Summer': 'cruel.mp3',
    'As It Was': 'harry.mp3',
    'Flowers': 'flowers.mp3',
    'Paint The Town Red': 'paint.mp3',
    'vampire': 'vampire.mp3',
    'Blinding Lights': 'blinding.mp3',
    'Don\'t Start Now': 'dontstartnow.mp3'
  };

  const filename = songMapping[title];
  if (filename) {
    return path.join(__dirname, '../../../frontend/assets', filename);
  }
  return null;
}

/**
 * Analiza y genera un anuncio si es apropiado
 * POST /api/ads/analyze
 * Body: { currentSong, nextSong, userLocation, songsSinceLastAd }
 */
async function analyzeAndGenerateAd(req, res) {
  try {
    const { currentSong, nextSong, userLocation = 'Barcelona', songsSinceLastAd = 0 } = req.body;

    if (!currentSong || !nextSong) {
      return res.status(400).json({
        error: 'currentSong y nextSong son requeridos',
        example: {
          currentSong: { title: 'Monaco', artist: 'Bad Bunny' },
          nextSong: { title: 'vampire', artist: 'Olivia Rodrigo' }
        }
      });
    }

    console.log('\n🎵 === ANÁLISIS DE ANUNCIO ===');
    console.log(`Canción actual: "${currentSong.title}" - ${currentSong.artist}`);
    console.log(`Siguiente: "${nextSong.title}" - ${nextSong.artist}`);
    console.log(`Canciones desde último anuncio: ${songsSinceLastAd}`);

    // Verificar que el artista tenga voz clonada disponible
    if (currentSong.artist !== 'Bad Bunny') {
      console.log('⚠️ Solo Bad Bunny tiene voz clonada disponible');
      return res.json({
        showAd: false,
        reason: `No hay voz clonada disponible para ${currentSong.artist}. Solo disponible: Bad Bunny`
      });
    }

    // LÓGICA SIMPLE: Poner anuncio si han pasado 3+ canciones sin anuncio
    // y el artista actual es Bad Bunny
    if (songsSinceLastAd < 1) {
      console.log(`❌ No se mostrará anuncio: Solo han pasado ${songsSinceLastAd} canciones (mínimo 3)`);
      return res.json({
        showAd: false,
        reason: `Solo han pasado ${songsSinceLastAd} canciones desde el último anuncio. Mínimo: 3`,
        confidence: 1.0
      });
    }

    console.log('✅ Se mostrará anuncio: Bad Bunny y han pasado 3+ canciones');

    // 2. Seleccionar anuncio del banco
    const selectedAd = selectAd(currentSong.artist, userLocation);
    
    if (!selectedAd) {
      console.log('⚠️ No hay anuncios disponibles para este artista');
      return res.json({
        showAd: false,
        reason: 'No hay anuncios disponibles para este artista'
      });
    }

    console.log(`📣 Anuncio seleccionado: ${selectedAd.name}`);

    // 3. Generar script con Gemini
    const script = await geminiService.generateAdScript({
      artistName: currentSong.artist,
      currentSong: currentSong.title,
      nextSong: nextSong.title,
      nextArtist: nextSong.artist,
      adContent: selectedAd.content
    });

    // 4. Generar audio con ElevenLabs
    const adId = `ad_${selectedAd.id}_${crypto.randomBytes(8).toString('hex')}`;
    const rawSpeechId = `raw_${adId}`;
    
    console.log('🎤 Generando audio con ElevenLabs...');
    const { audioPath: rawSpeechPath } = await elevenLabsService.generateAndSaveAd(
      script,
      currentSong.artist,
      rawSpeechId
    );

    // 5. Mezclar con música de fondo (2s intro, low volume, fade in/out)
    console.log('🎚️ Mezclando con música de fondo...');
    const finalAudioPath = path.join(path.dirname(rawSpeechPath), `${adId}.mp3`);
    const bgPath = getBackgroundPath(currentSong.title);
    
    await audioMixerService.mixAd(rawSpeechPath, bgPath, finalAudioPath, 2000);

    // Opcional: Eliminar el audio raw de ElevenLabs para no llenar el disco
    try {
      require('fs').unlinkSync(rawSpeechPath);
    } catch (e) {
      console.warn('⚠️ No se pudo eliminar el archivo raw:', rawSpeechPath);
    }

    // 6. Retornar metadata del anuncio
    const response = {
      showAd: true,
      adData: {
        id: adId,
        type: selectedAd.type,
        title: selectedAd.content.product,
        artist: currentSong.artist, // El artista que "habla"
        script: script,
        audioPath: finalAudioPath,
        audioUrl: `/api/ads/audio/${adId}.mp3`, // URL para descargar el audio
        artwork: selectedAd.artwork,
        color: selectedAd.color,
        sponsorLink: selectedAd.sponsorLink,
        duration: null // Se calculará cuando se cargue el audio
      },
      analysis: {
        reason: `Anuncio mostrado después de ${songsSinceLastAd} canciones (mínimo 3)`,
        confidence: 1.0
      }
    };

    console.log('✅ Anuncio generado exitosamente\n');
    res.json(response);

  } catch (error) {
    console.error('❌ Error en analyzeAndGenerateAd:', error);
    res.status(500).json({
      error: 'Error generando anuncio',
      message: error.message,
      showAd: false
    });
  }
}

/**
 * Sirve el archivo de audio generado
 * GET /api/ads/audio/:filename
 */
async function serveAdAudio(req, res) {
  try {
    const { filename } = req.params;
    const path = require('path');
    const fs = require('fs');
    
    const filePath = path.join(__dirname, '../../generated-ads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio no encontrado' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error sirviendo audio:', error);
    res.status(500).json({ error: 'Error sirviendo audio' });
  }
}

module.exports = {
  analyzeAndGenerateAd,
  serveAdAudio
};
