const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * Genera un script para un anuncio leído por un artista
   * @param {Object} params - Parámetros del anuncio
   * @param {string} params.artistName - Nombre del artista
   * @param {string} params.currentSong - Canción actual
   * @param {string} params.nextSong - Siguiente canción
   * @param {string} params.nextArtist - Artista de la siguiente canción
   * @param {Object} params.adContent - Contenido del anuncio
   * @param {string} params.adContent.type - Tipo: 'concert', 'product', 'sponsor'
   * @param {string} params.adContent.product - Nombre del producto/evento
   * @param {string} params.adContent.details - Detalles específicos
   * @returns {Promise<string>} Script generado
   */
  async generateAdScript(params) {
    const { artistName, currentSong, nextSong, nextArtist, adContent } = params;
    
    let adExample = '';
    
    switch (adContent.type) {
      case 'concert':
        adExample = `EJEMPLO CORTO:
"Uff, ${currentSong}... ¡Qué vibra!
Oye, ${adContent.details}
Ahora, ${nextSong} de ${nextArtist}."`;
        break;
      case 'product':
        adExample = `EJEMPLO CORTO:
"¡Eso fue ${currentSong}!
Miren, uso ${adContent.product}. ${adContent.details}
Ahora, ${nextSong} de ${nextArtist}."`;
        break;
      case 'sponsor':
        adExample = `EJEMPLO CORTO:
"${currentSong}... ¡Brutal!
Shout out a ${adContent.product}. ${adContent.details}
Siguiente: ${nextSong} de ${nextArtist}."`;
        break;
    }

    const prompt = `Eres ${artistName}. Acabas de tocar "${currentSong}".

🎯 MISIÓN: Anunciar "${adContent.product}" en MENOS DE 10 segundos.

📋 INFO DEL ANUNCIO:
${adContent.product} - ${adContent.details}

Siguiente canción: "${nextSong}" de ${nextArtist}

🚨 CRÍTICO - DURACIÓN:
- MÁXIMO 20-25 palabras (8-10 segundos al leer)
- Sé EXTREMADAMENTE BREVE. Solo una idea rápida.
- Sin introducciones largas.

📝 FORMATO (2-3 LÍNEAS):
Línea 1: Comentario flash sobre "${currentSong}"
Línea 2: El anuncio en UNA frase rápida.
Línea 3: "Seguimos con ${nextSong}"

${adExample}

⚠️ REGLAS:
- NO superes las 25 palabras.
- Estilo de ${artistName}.
- NO asteriscos ni [acotaciones].
- SÉ BREVE Y NATURAL.

Script:`;

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
