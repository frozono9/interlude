const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  }

  /**
   * Genera un script para un anuncio leído por un artista
   * @param {Object} params - Parámetros del anuncio
   * @param {string} params.artistName - Nombre del artista que habla
   * @param {string} params.currentSong - Canción que acaba de terminar
   * @param {string} params.nextSong - Siguiente canción
   * @param {string} params.nextArtist - Artista de la siguiente canción
   * @param {Object} params.adContent - Contenido del anuncio
   * @param {string} params.userName - Nombre del usuario a saludar
   * @param {string} params.userLocation - Ciudad del usuario
   * @param {string} params.timeContext - Contexto temporal (mañana/tarde/noche)
   * @returns {Promise<string>} Script generado
   */
  async generateAdScript(params) {
    const { artistName, currentSong, nextSong, nextArtist, adContent, userName, userLocation, timeContext } = params;
    
    // Usar solo el primer nombre para sonar más natural
    const shortName = userName.split(' ')[0] || 'Álex';

    // Personalizar el tono y el idioma según el artista
    let styleRules = '';
    let prompt = '';

    if (artistName === 'Bad Bunny') {
      styleRules = 'Usa tu jerga real de Puerto Rico ("puñeta", "diablo", "estamos activos", "mami/papi", "fuego").';
      prompt = `Eres ${artistName}. No eres un locutor ni estás leyendo un guion. Estás hablando por FaceTime con un buen colega.

CONTEXTO REAL:
- Estás hablando con: ${shortName}
- Lugar: ${userLocation}
- Momento: Es de ${timeContext}
- Acaba de sonar: "${currentSong}"
- Va a sonar ahora: "${nextSong}" de ${nextArtist}
- Info que tienes que mencionar (PERO A TU MANERA): ${adContent.product}. Detalles: ${adContent.details}

MISIÓN:
Sáltate las fórmulas típicas. Crea un momento de conexión real con ${shortName}. 
Imagínate qué podría estar haciendo ${shortName} en ${userLocation} a esta hora de la ${timeContext}. Inventa un detalle basado en el mood de "${currentSong}".

REGLAS DE ORO:
1. NO uses "mencionar Línea 1", ni formatos rígidos.
2. ${styleRules}
3. Que no parezca un anuncio. Que parezca que me estás recomendando algo porque nos conocemos.
4. EXTREMA BREVEDAD: Máximo 25 palabras. Aproximadamente 7-8 segundos al hablar.
5. NO uses asteriscos * ni [acotaciones]. Solo el texto que vas a decir.
6. El guion DEBE estar en ESPAÑOL.

Hazlo fluido, con pausas naturales.

Script:`;
    } else {
      // Por defecto para Olivia Rodrigo y otros internacionales
      styleRules = artistName === 'Olivia Rodrigo' 
        ? 'Use a vulnerable, authentic, and slightly teenage angst yet sophisticated tone. Use expressions like "so real", "literally", "it is what it is", "bestie", "I feel like".'
        : 'Use a natural, friendly tone as if talking to a close friend.';
      
      const timeContextEn = timeContext === 'mañana' ? 'morning' : (timeContext === 'tarde' ? 'afternoon' : 'night');
      
      prompt = `You are ${artistName}. You are NOT an announcer and you are not reading a script. You are on a FaceTime call with a close friend.

REAL CONTEXT:
- You are talking to: ${shortName}
- Location: ${userLocation}
- Time: It's ${timeContextEn}
- Just finished: "${currentSong}"
- Up next: "${nextSong}" by ${nextArtist}
- Info to mention (IN YOUR OWN WAY): ${adContent.product}. Details: ${adContent.details}

MISSION:
Skip typical ad formulas. Create a moment of real connection with ${shortName}.
Imagine what ${shortName} might be doing in ${userLocation} at this time of the ${timeContextEn}. Invent a detail based on the mood of "${currentSong}".

GOLDEN RULES:
1. DO NOT use "Line 1" or rigid formats.
2. ${styleRules}
3. Make it NOT sound like an ad. It should feel like a personal recommendation because you know each other.
4. EXTREME BREVITY: Maximum 25 words. Approximately 7-8 seconds of speech.
5. DO NOT use asterisks * or [stage directions]. Only the text you will say.
6. The entire response MUST be in ENGLISH.

Keep it fluid, with natural pauses.

Script:`;
    }

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const script = response.text().trim();
      
      console.log('✅ Script generado por Gemini:', script);
      return script;
    } catch (error) {
      console.error('❌ Error generando script con Gemini:', error);
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  /**
   * Analiza dos canciones y decide si es apropiado poner un anuncio
   * @param {Object} currentSong - Canción actual
   * @param {Object} nextSong - Siguiente canción
   * @returns {Promise<Object>} { shouldShowAd: boolean, reason: string }
   */
  async analyzeAdPlacement(currentSong, nextSong) {
    const prompt = `Eres un experto en experiencia de usuario en aplicaciones de música.

Canción actual: "${currentSong.title}" de ${currentSong.artist}
Siguiente canción: "${nextSong.title}" de ${nextSong.artist}

Analiza si es apropiado insertar un anuncio de 15-20 segundos entre estas dos canciones.

Considera:
- ¿Hay coherencia de energía/mood entre las canciones?
- ¿El cambio de artista justifica una pausa?
- ¿El anuncio mejoraría o rompería el flow?

Responde SOLO con un JSON válido en este formato exacto:
{
  "shouldShowAd": true o false,
  "reason": "explicación breve de 1 línea",
  "confidence": número entre 0 y 1
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      // Extraer JSON de la respuesta
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo extraer JSON de la respuesta');
      }
      
      const analysis = JSON.parse(jsonMatch[0]);
      console.log('✅ Análisis de placement:', analysis);
      return analysis;
    } catch (error) {
      console.error('❌ Error analizando placement:', error);
      // Fallback: mostrar anuncio 30% del tiempo
      return {
        shouldShowAd: Math.random() < 0.3,
        reason: 'Análisis fallado, decisión aleatoria',
        confidence: 0.5
      };
    }
  }
}

module.exports = new GeminiService();
