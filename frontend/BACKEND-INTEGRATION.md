# Frontend - Integración con Backend de Anuncios AI

## 🔗 Conexión con el Backend

El frontend ahora se comunica con el backend para obtener anuncios generados con IA.

### Configuración

1. **Asegúrate de que el backend esté corriendo**:
```bash
cd backend
npm run dev
```

El backend debe estar en `http://localhost:3000`

2. **Configurar la URL del backend** (si es diferente):

Edita `frontend/services/apiService.js`:
```javascript
const API_BASE_URL = 'http://localhost:3000/api'; // Cambiar si usas otra URL
```

### Cómo Funciona

1. **Cuando una canción empieza a sonar**:
   - El PlayerScreen monitorea el progreso
   - Al llegar al 40% de la canción, llama automáticamente al backend

2. **El backend analiza y prepara el anuncio**:
   - Decide si mostrar un anuncio (usando IA)
   - Genera el script personalizado
   - Crea el audio con la voz del artista
   - Retorna todo al frontend

3. **Cuando la canción termina**:
   - Si hay un anuncio preparado, se reproduce
   - El usuario ve la UI del anuncio (título, botón Learn More, etc.)
   - Después del anuncio, continúa con la siguiente canción

### Logs del Frontend

El frontend imprime logs útiles:
```
🤖 Preparando anuncio con IA...
De: "Monaco" - Bad Bunny
A: "vampire" - Olivia Rodrigo
📡 Llamando al backend para analizar anuncio...
✅ Respuesta del backend: [datos]
✅ Anuncio preparado y listo para usar
```

O si no hay anuncio:
```
❌ No se mostrará anuncio: [razón]
```

### Fallback

Si el backend no está disponible o hay un error:
- El frontend usa el anuncio hardcoded anterior como fallback
- La app sigue funcionando normalmente
- Se muestra un warning en los logs

### Testing

Para probar el sistema:

1. **Inicia el backend**:
```bash
cd backend
npm run dev
```

2. **Inicia el frontend**:
```bash
cd frontend
npx expo start
```

3. **Reproduce una canción que tenga `interlude: true`** en el playlist
4. **Observa los logs** en ambos terminales
5. **Espera al 40% de la canción** para ver la llamada al backend
6. **Cuando termine la canción**, verás el anuncio generado

### Configuración del Playlist

Para que una canción tenga anuncio, debe cumplir dos condiciones:

1. Añadir `interlude: true`
2. El artista debe ser **"Bad Bunny"** (única voz clonada disponible actualmente)

```javascript
{
  id: 1,
  title: "Monaco",
  artist: "Bad Bunny",  // ← Solo funciona con "Bad Bunny"
  audioFile: require('./assets/monaco.mp3'),
  artwork: require('./assets/monaco.jpeg'),
  color: '#b8a28d',
  interlude: true  // ← Esto activa el sistema de anuncios
}
```

**Nota**: Canciones de otros artistas con `interlude: true` no activarán el sistema de IA hasta que se clonen sus voces en ElevenLabs.

### Network Requirements

- El dispositivo debe poder acceder a `http://localhost:3000`
- Si estás usando un dispositivo físico (no simulador), cambia `localhost` por la IP de tu computadora en `apiService.js`

## 🐛 Troubleshooting

### "Error llamando al backend"
- Verifica que el backend esté corriendo
- Verifica que la URL en `apiService.js` sea correcta
- Si usas un dispositivo físico, usa la IP local en lugar de localhost

### "Usando anuncio hardcoded (fallback)"
- El backend no respondió a tiempo
- No hay anuncios disponibles para ese artista
- Revisa los logs del backend para más detalles

### El anuncio no se reproduce
- Verifica que la canción tenga `interlude: true`
- Revisa los logs del frontend y backend
- Asegúrate de que el backend haya generado el audio correctamente
