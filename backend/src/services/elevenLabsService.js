const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ElevenLabsService {
  constructor() {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is required');
    }
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    
    // IDs de voces clonadas
    this.voiceIds = {
      'Bad Bunny': process.env.ELEVENLABS_VOICE_ID_BAD_BUNNY || null,
      'Olivia Rodrigo': process.env.ELEVENLABS_VOICE_ID_OLIVIA_RODRIGO || null,
      // Añadir más artistas aquí cuando tengas sus voces clonadas
    };
  }

  /**
   * Genera audio a partir de texto usando ElevenLabs TTS
   * @param {string} text - Texto a convertir en audio
   * @param {string} artistName - Nombre del artista (para seleccionar voz)
   * @returns {Promise<Buffer>} Audio en formato MP3
   */
  async generateAudio(text, artistName) {
    const voiceId = this.voiceIds[artistName];
    
    if (!voiceId) {
      const availableArtists = Object.keys(this.voiceIds).filter(key => this.voiceIds[key]);
      console.error(`❌ No hay voz clonada disponible para ${artistName}`);
      console.log(`✅ Artistas disponibles: ${availableArtists.join(', ')}`);
      throw new Error(`No hay voz clonada disponible para ${artistName}. Disponibles: ${availableArtists.join(', ')}`);
    }

    console.log(`🎤 Generando audio con voz de ${artistName}...`);
    console.log(`📝 Texto: ${text.substring(0, 100)}...`);

    try {
      const response = await axios({
        method: 'post',
        url: `${this.baseUrl}/text-to-speech/${voiceId}?optimize_streaming_latency=4`,
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        data: {
          text: text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            speed: 0.95,
            stability: 0.35, // Baja estabilidad = más fluido, sin trabas
            similarity_boost: 0.85, // Alta similitud para mantener la voz
            style: 0.15, // Bajo estilo = menos exageración, más natural
            use_speaker_boost: true
          }
        },
        responseType: 'arraybuffer'
      });

      console.log('✅ Audio generado exitosamente');
      return Buffer.from(response.data);
    } catch (error) {
      console.error('❌ Error generando audio con ElevenLabs:', error.response?.data || error.message);
      throw new Error(`ElevenLabs API error: ${error.message}`);
    }
  }

  /**
   * Guarda el audio en el sistema de archivos
   * @param {Buffer} audioBuffer - Buffer del audio
   * @param {string} filename - Nombre del archivo (sin extensión)
   * @returns {Promise<string>} Path del archivo guardado
   */
  async saveAudio(audioBuffer, filename) {
    const outputDir = path.join(__dirname, '../../generated-ads');
    
    // Crear directorio si no existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, `${filename}.mp3`);
    
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, audioBuffer, (err) => {
        if (err) {
          console.error('❌ Error guardando audio:', err);
          reject(err);
        } else {
          console.log(`✅ Audio guardado en: ${filePath}`);
          resolve(filePath);
        }
      });
    });
  }

  /**
   * Genera y guarda un anuncio completo
   * @param {string} script - Script del anuncio
   * @param {string} artistName - Nombre del artista
   * @param {string} adId - ID único del anuncio
   * @returns {Promise<Object>} { audioPath, audioBuffer }
   */
  async generateAndSaveAd(script, artistName, adId) {
    const audioBuffer = await this.generateAudio(script, artistName);
    const audioPath = await this.saveAudio(audioBuffer, adId);
    
    return {
      audioPath,
      audioBuffer
    };
  }
}

module.exports = new ElevenLabsService();
