# Interlude Backend

Backend API para gestionar transiciones musicales inteligentes tipo DJ.

## Arquitectura

```
backend/
├── src/
│   ├── index.js              # Entry point
│   ├── services/
│   │   ├── audioAnalysis.js  # Análisis de BPM, key, energy
│   │   └── transitionEngine.js # Generador de mix plans
│   ├── routes/
│   │   ├── audio.js          # Endpoints de análisis
│   │   └── transitions.js    # Endpoints de mixing
│   └── controllers/
└── package.json
```

## Instalación

```bash
cd backend
npm install
cp .env.example .env
```

## Ejecutar

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## API Endpoints

### Análisis de Audio
- `GET /api/audio/analyze/:songId` - Obtiene BPM, key, cue points
- `POST /api/audio/batch-analyze` - Analiza múltiples canciones

### Transiciones
- `POST /api/transitions/generate` - Genera plan de mixing
  ```json
  {
    "currentSongId": 1,
    "nextSongId": 3,
    "interlude": {
      "duration": 30000,
      "audioUrl": "..."
    }
  }
  ```
  
  Respuesta:
  ```json
  {
    "mixPlan": {
      "transitionStartMs": 164000,
      "volumeTimeline": [...],
      "bpmSync": { "needsSync": true },
      "eqCurve": {...}
    }
  }
  ```

- `GET /api/transitions/preview/:songAId/:songBId` - Preview de compatibilidad

## Próximos pasos

1. Integrar librería real de análisis de audio (Essentia, librosa via Python bridge)
2. Implementar cache de análisis en base de datos
3. Añadir generación de voz con OpenAI TTS para interludes
4. WebSocket para streaming de transiciones en tiempo real
