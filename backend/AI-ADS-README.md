# Interlude Backend - AI-Powered Ads

Sistema de anuncios con inteligencia artificial que genera scripts personalizados y los convierte en audio usando las voces clonadas de los artistas.

## 🚀 Características

- **Análisis Inteligente**: Usa Gemini AI para decidir si es apropiado mostrar un anuncio entre canciones
- **Scripts Personalizados**: Genera guiones únicos donde el artista actual habla sobre el producto/evento
- **Text-to-Speech**: Convierte los guiones en audio usando voces clonadas con ElevenLabs
- **Transiciones Naturales**: Los artistas hacen la transición a la siguiente canción
- **Banco de Anuncios**: Gestiona múltiples tipos de anuncios (conciertos, productos, patrocinadores)

⚠️ **Actualmente solo funciona con canciones de Bad Bunny** (única voz clonada disponible)

## 📋 Requisitos

- Node.js 16+
- Cuenta de Google AI (Gemini API)
- Cuenta de ElevenLabs (con voces clonadas)

## 🔧 Instalación

1. **Instalar dependencias**:
```bash
cd backend
npm install
```

2. **Configurar variables de entorno**:
```bash
cp .env.example .env
```

Edita el archivo `.env` y añade tus claves:
```env
# API Keys
GEMINI_API_KEY=tu_clave_gemini_aqui
ELEVENLABS_API_KEY=tu_clave_elevenlabs_aqui

# ElevenLabs Voice IDs
ELEVENLABS_VOICE_ID_BAD_BUNNY=voice_id_de_bad_bunny_aqui
```

### Cómo obtener las API Keys:

#### Gemini API Key:
1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en "Get API Key"
4. Copia la clave generada

#### ElevenLabs API Key:
1. Ve a [ElevenLabs](https://elevenlabs.io/)
2. Regístrate o inicia sesión
3. Ve a tu perfil → API Keys
4. Copia tu API key

#### Voice IDs (Voces Clonadas):
1. En ElevenLabs, ve a "Voice Library"
2. Clona la voz del artista deseado
3. Una vez clonada, copia el Voice ID que aparece en los detalles de la voz

## 🎯 Uso

### Iniciar el servidor

```bash
npm run dev
```

El backend estará corriendo en `http://localhost:3000`

### Endpoints

#### Health Check
```bash
GET /health
```

#### Analizar y Generar Anuncio
```bash
POST /api/ads/analyze
Content-Type: application/json

{
  "currentSong": {
    "title": "Monaco",
    "artist": "Bad Bunny"
  },
  "nextSong": {
    "title": "vampire",
    "artist": "Olivia Rodrigo"
  },
  "userLocation": "Barcelona"
}
```

**Respuesta exitosa**:
```json
{
  "showAd": true,
  "adData": {
    "id": "ad_concert-barcelona-badbunny_a1b2c3d4",
    "type": "concert",
    "title": "Concierto en Barcelona",
    "artist": "Bad Bunny",
    "script": "Ey ey, Bad Bunny aquí...",
    "audioPath": "/path/to/generated/audio.mp3",
    "audioUrl": "/api/ads/audio/ad_concert-barcelona-badbunny_a1b2c3d4.mp3",
    "artwork": "concert-barcelona.jpg",
    "color": "#FF6B6B",
    "sponsorLink": "https://www.ticketmaster.es"
  },
  "analysis": {
    "reason": "Good transition point between artists",
    "confidence": 0.85
  }
}
```

**Respuesta sin anuncio**:
```json
{
  "showAd": false,
  "reason": "Similar energy, good flow - no interruption needed",
  "confidence": 0.92
}
```

#### Descargar Audio Generado
```bash
GET /api/ads/audio/:filename.mp3
```

## 🏦 Banco de Anuncios

Los anuncios están definidos en `src/services/adBank.js`:

### Tipos de Anuncios:

1. **Conciertos**: Eventos en vivo del artista
2. **Productos**: Recomendaciones de productos (auriculares, etc.)
3. **Patrocinadores**: Menciones de marcas patrocinadoras

### Añadir un Nuevo Anuncio:

```javascript
{
  id: 'unique-ad-id',
  type: 'product', // 'concert', 'product', o 'sponsor'
  name: 'Nombre del Anuncio',
  eligibleArtists: ['Bad Bunny', 'Olivia Rodrigo'],
  content: {
    product: 'Nombre del Producto',
    details: 'Detalles específicos que el artista mencionará'
  },
  artwork: 'imagen.jpg',
  color: '#FF6B6B',
  sponsorLink: 'https://link.com',
  priority: 5 // Mayor número = mayor prioridad
}
```

## 🎤 Clonar Voces en ElevenLabs

Para añadir nuevos artistas:

1. **Obtener muestras de audio**: Necesitas 3-5 minutos de audio limpio del artista
2. **Ir a Voice Lab** en ElevenLabs
3. **Instant Voice Cloning**:
   - Sube las muestras de audio
   - Dale un nombre descriptivo
   - Espera el proceso de clonado (~5 minutos)
4. **Copiar Voice ID**
5. **Actualizar en adBank.js**:
```javascript
eligibleArtists: ['Bad Bunny', 'Nuevo Artista']
```
6. **Añadir en elevenLabsService.js**:
```javascript
this.voiceIds = {
  'Bad Bunny': process.env.ELEVENLABS_VOICE_ID_BAD_BUNNY,
  'Nuevo Artista': process.env.ELEVENLABS_VOICE_ID_NUEVO_ARTISTA,
};
```
7. **Actualizar .env**:
```env
ELEVENLABS_VOICE_ID_NUEVO_ARTISTA=voice_id_aqui
```

## 🔍 Flujo de Trabajo

1. **Frontend reproduce una canción**
2. **Al 40% de la canción**, el frontend llama a `/api/ads/analyze`
3. **Backend analiza** si es apropiado mostrar un anuncio (usando Gemini)
4. **Si es apropiado**:
   - Selecciona un anuncio del banco
   - Genera el script personalizado (Gemini)
   - Convierte el script a audio (ElevenLabs)
   - Guarda el audio en `generated-ads/`
   - Retorna la metadata al frontend
5. **Cuando termina la canción**, el frontend reproduce el anuncio generado
6. **Después del anuncio**, continúa con la siguiente canción

## 📁 Estructura de Archivos

```
backend/
├── src/
│   ├── controllers/
│   │   └── adController.js      # Lógica de endpoints
│   ├── routes/
│   │   └── ads.js               # Rutas de la API
│   ├── services/
│   │   ├── geminiService.js     # Integración con Gemini AI
│   │   ├── elevenLabsService.js # Integración con ElevenLabs
│   │   └── adBank.js            # Banco de anuncios
│   └── index.js                 # Servidor Express
├── generated-ads/               # Audios generados (creado automáticamente)
├── .env                         # Variables de entorno (gitignored)
├── .env.example                 # Template de variables
└── package.json
```

## 🐛 Troubleshooting

### Error: "GEMINI_API_KEY is required"
- Asegúrate de haber copiado `.env.example` a `.env`
- Verifica que la clave de Gemini esté correctamente copiada

### Error: "ELEVENLABS_API_KEY is required"
- Verifica que la clave de ElevenLabs esté en el `.env`
- Asegúrate de tener créditos en tu cuenta de ElevenLabs

### Error: "No hay voz clonada disponible para [Artista]"
- El artista no tiene una voz clonada en ElevenLabs
- Verifica que el Voice ID esté en el `.env`
- Actualiza `elevenLabsService.js` con el nuevo artista

### El audio no se genera
- Revisa los logs del backend para ver errores específicos
- Verifica que tengas créditos suficientes en ElevenLabs
- Asegúrate de que el Voice ID sea correcto

## 📊 Monitoreo

El backend imprime logs detallados:
```
🎵 === ANÁLISIS DE ANUNCIO ===
Canción actual: "Monaco" - Bad Bunny
Siguiente: "vampire" - Olivia Rodrigo
✅ Se mostrará anuncio: Good transition point
📣 Anuncio seleccionado: Concierto Bad Bunny Barcelona
✅ Script generado por Gemini: [script]
🎤 Generando audio con voz de Bad Bunny...
✅ Audio generado exitosamente
✅ Audio guardado en: /path/to/audio.mp3
✅ Anuncio generado exitosamente
```

## 🚦 Próximos Pasos

1. **Añadir más artistas**: Clona más voces en ElevenLabs
2. **Más anuncios**: Expande el banco de anuncios en `adBank.js`
3. **Caché**: Implementar caché para scripts ya generados
4. **Analytics**: Track qué anuncios funcionan mejor
5. **A/B Testing**: Probar diferentes scripts para el mismo anuncio

## 📝 Notas

- Los audios generados se guardan en `generated-ads/` y pueden ser reutilizados
- Gemini analiza el contexto para decidir si mostrar un anuncio (no es aleatorio)
- Los scripts son únicos cada vez (puedes regenerar para obtener variaciones)
- ElevenLabs tiene límites de caracteres según tu plan (revisa tu cuota)

## 🆘 Support

Para problemas o preguntas, revisa los logs del backend que incluyen información detallada de cada paso del proceso.
