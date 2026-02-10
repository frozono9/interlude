const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Cambiamos a gemini-1.5-flash que es más estable y rápido
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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
      prompt = `Actúa como Bad Bunny. Hablas con tu colega ${shortName}.
FORMATO OBLIGATORIO (4 LÍNEAS):
1. Saludo: "Ey ey, Bad Bunny aquí"
2. Conexión: Menciona "${currentSong}" y "${adContent.product}" (${adContent.details})
3. Call to action: "Consíguelo ya" o "Actívate"
4. Transición: "Y ahora, te dejo con ${nextArtist} y su hit: ${nextSong}!"

Reglas: Usa jerga "puñeta", "diablo". Máximo 45 palabras. Solo texto para hablar.`;
    } else {
      const bestieAlt = artistName === 'Olivia Rodrigo' ? 'literally bestie' : 'friend';
      prompt = `Act as ${artistName}. Talk to your friend ${shortName}.
MANDATORY 4-LINE FORMAT:
1. Greeting: "Hey hey, ${artistName} here"
2. Connection: Mention "${currentSong}" and "${adContent.product}" (${adContent.details})
3. Call to action: "Check it out" or "Get yours now"
4. Transition: "And now, here is ${nextArtist} with ${nextSong}!"

Rules: ${artistName === 'Olivia Rodrigo' ? 'Use teenage aesthetic.' : 'Natural tone.'} Max 45 words. ONLY spoken text. ALL ENGLISH.`;
    }

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const script = response.text().trim();
      
      console.log('✅ Script generado por Gemini:', script);
      return script;
    } catch (error) {
      console.warn('⚠️ Gemini falló (Quota/Error), usando script de fallback:', error.message);
      
      // Fallback inteligente según el artista y contenido
      if (artistName === 'Bad Bunny') {
        const adInfo = adContent.details || 'algo muy duro';
        return `Ey ey, Bad Bunny aquí. Escúchate esto, si te gustó "${currentSong}", tienes que chequear ${adContent.product}. Realmente está muy duro, ${adInfo}. Y ahora, te dejo con ${nextArtist} y su hit: ${nextSong}!`;
      } else {
        return `Hey hey, it's ${artistName}. Just vibe with "${currentSong}"? You'll love ${adContent.product}. ${adContent.details}. Check it out bestie! And now, more music with ${nextArtist} and their track "${nextSong}".`;
      }
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
