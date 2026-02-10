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
    'levitating': 'levitating.mp3',
    'monaco': 'monaco.mp3',
    'vampire': 'vampire.mp3',
    'tití me preguntó': 'titi.mp3',
    'baile inolvidable': 'baile.mp3',
    'cruel summer': 'cruel.mp3',
    'as it was': 'harry.mp3',
    'flowers': 'flowers.mp3',
    'paint the town red': 'paint.mp3',
    'drivers license': 'vampire.mp3',
    'bad idea right?': 'vampire.mp3',
    'blinding lights': 'blinding.mp3',
    'don\'t start now': 'dontstartnow.mp3'
  };

  const filename = songMapping[title.toLowerCase()];
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
  const startTime = Date.now();
  try {
    const { currentSong, nextSong, userLocation = 'Barcelona', songsSinceLastAd = 0, userName = 'Alex' } = req.body;

    if (!currentSong || !nextSong) {
      return res.status(400).json({
        error: 'currentSong y nextSong son requeridos',
        example: {
          currentSong: { title: 'Monaco', artist: 'Bad Bunny' },
          nextSong: { title: 'vampire', artist: 'Olivia Rodrigo' }
        }
      });
    }

    const hour = new Date().getHours();
    let timeContext = 'día';
    if (hour >= 6 && hour < 12) timeContext = 'mañana';
    else if (hour >= 12 && hour < 20) timeContext = 'tarde';
    else timeContext = 'noche';

    console.log('\n🎵 === ANÁLISIS DE ANUNCIO ===');
    console.log(`Usuario: ${userName} | Ubicación: ${userLocation} | Contexto: ${timeContext}`);
    console.log(`Canción actual: "${currentSong.title}" - ${currentSong.artist}`);
    console.log(`Siguiente: "${nextSong.title}" - ${nextSong.artist}`);
    console.log(`Canciones desde último anuncio: ${songsSinceLastAd}`);

    // Verificar que el artista tenga voz clonada disponible
    const supportedArtists = ['Bad Bunny', 'Olivia Rodrigo'];
    if (!supportedArtists.includes(currentSong.artist)) {
      console.log(`⚠️ Solo ${supportedArtists.join(' y ')} tienen voces clonadas disponibles`);
      return res.json({
        showAd: false,
        reason: `No hay voz clonada disponible para ${currentSong.artist}. Disponibles: ${supportedArtists.join(', ')}`
      });
    }

    // LÓGICA SIMPLE: Poner anuncio si han pasado 3+ canciones sin anuncio
    // y el artista actual está soportado
    if (songsSinceLastAd < 3) {
      console.log(`❌ No se mostrará anuncio: Solo han pasado ${songsSinceLastAd} canciones (mínimo 3)`);
      return res.json({
        showAd: false,
        reason: `Solo han pasado ${songsSinceLastAd} canciones desde el último anuncio. Mínimo: 3`,
        confidence: 1.0
      });
    }

    console.log(`✅ Se mostrará anuncio: ${currentSong.artist} y han pasado 3+ canciones`);

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

    // 3. Seleccionar el content apropiado según el idioma del artista
    const artistNameLower = (currentSong.artist || '').trim().toLowerCase();
    const latinArtists = ['bad bunny']; // Artistas que hablan español
    
    const isLatinArtist = latinArtists.includes(artistNameLower);
    const adContent = isLatinArtist 
      ? selectedAd.content 
      : (selectedAd.contentEn || selectedAd.content); // Usar inglés si está disponible

    console.log(`🌍 Idioma del anuncio: ${isLatinArtist ? 'Español' : 'English'} (Artista: ${currentSong.artist})`);

    // 4. Generar script con Gemini (con fallback interno)
    const geminiStart = Date.now();
    console.log('🤖 Generando script...');
    const script = await geminiService.generateAdScript({
      artistName: currentSong.artist,
      currentSong: currentSong.title,
      nextSong: nextSong.title,
      nextArtist: nextSong.artist,
      adContent: adContent,
      userName,
      userLocation,
      timeContext
    });
    const geminiTime = ((Date.now() - geminiStart) / 1000).toFixed(2);

    // 5. Generar audio con ElevenLabs
    const adId = `ad_${selectedAd.id}_${crypto.randomBytes(8).toString('hex')}`;
    const rawSpeechId = `raw_${adId}`;
    
    const elevenStart = Date.now();
    console.log('🎤 Generando audio...');
    const { audioPath: rawSpeechPath } = await elevenLabsService.generateAndSaveAd(
      script,
      currentSong.artist,
      rawSpeechId
    );
    const elevenTime = ((Date.now() - elevenStart) / 1000).toFixed(2);

    // 6. Mezclar con música de fondo
    const mixStart = Date.now();
    console.log('🎚️ Mezclando audio...');
    const finalAudioPath = path.join(path.dirname(rawSpeechPath), `${adId}.mp3`);
    const bgPath = getBackgroundPath(currentSong.title);
    
    await audioMixerService.mixAd(rawSpeechPath, bgPath, finalAudioPath, 2000);
    const mixTime = ((Date.now() - mixStart) / 1000).toFixed(2);

    // Opcional: Eliminar el audio raw de ElevenLabs para no llenar el disco
    try {
      require('fs').unlinkSync(rawSpeechPath);
    } catch (e) {
      console.warn('⚠️ No se pudo eliminar el archivo raw:', rawSpeechPath);
    }

    // 7. Retornar metadata del anuncio
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Anuncio generado exitosamente en ${totalTime}s`);
    console.log(`   └─ Gemini: ${geminiTime}s | ElevenLabs: ${elevenTime}s | FFmpeg: ${mixTime}s\n`);

    const response = {
      showAd: true,
      adData: {
        id: adId,
        type: selectedAd.type,
        title: adContent.product,
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
      },
      timing: {
        total: totalTime
      }
    };

    res.json(response);

  } catch (error) {
    const totalTime = startTime ? ((Date.now() - startTime) / 1000).toFixed(2) : 'unknown';
    console.error(`⚠️ Error en generación (${totalTime}s). Saltando anuncio de forma segura.`);
    console.error(`   Motivo: ${error.message}`);
    
    // En lugar de 500, respondemos con showAd: false para que la app no se bloquee
    res.json({
      showAd: false,
      reason: `Error interno: ${error.message}`,
      timing: { total: totalTime }
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
