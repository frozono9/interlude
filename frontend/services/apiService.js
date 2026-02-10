// API service for communicating with the backend
// Usa tu IP local en lugar de localhost para que funcione en dispositivos físicos
const API_BASE_URL = 'http://192.168.1.51:3000/api';

/**
 * Analiza y genera un anuncio con IA
 * @param {Object} currentSong - Canción actual
 * @param {Object} nextSong - Siguiente canción
 * @param {string} userLocation - Ubicación del usuario
 * @param {number} songsSinceLastAd - Canciones desde el último anuncio
 * @param {string} userName - Nombre del usuario para personalización
 * @returns {Promise<Object>} Respuesta del backend
 */
export async function analyzeAndGenerateAd(currentSong, nextSong, userLocation = 'Barcelona', songsSinceLastAd = 0, userName = '') {
  try {
    console.log('📡 Llamando al backend para analizar anuncio...');
    
    const response = await fetch(`${API_BASE_URL}/ads/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentSong,
        nextSong,
        userLocation,
        songsSinceLastAd,
        userName
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Respuesta del backend:', data);
    
    return data;
  } catch (error) {
    console.error('❌ Error llamando al backend:', error);
    throw error;
  }
}

/**
 * Obtiene la URL completa del audio generado
 * @param {string} audioUrl - URL relativa del audio
 * @returns {string} URL completa
 */
export function getFullAudioUrl(audioUrl) {
  if (audioUrl.startsWith('http')) {
    return audioUrl;
  }
  return `${API_BASE_URL.replace('/api', '')}${audioUrl}`;
}

/**
 * Health check del backend
 * @returns {Promise<Object>} Estado del backend
 */
export async function healthCheck() {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
    return await response.json();
  } catch (error) {
    console.error('Backend no disponible:', error);
    return { status: 'error', message: error.message };
  }
}
