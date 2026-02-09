import { Audio } from 'expo-av';

/**
 * DJMixEngine - Maneja transiciones profesionales entre canciones
 * Usa 3 canales de audio simultáneos
 */
export class DJMixEngine {
  constructor() {
    this.currentSound = null;
    this.nextSound = null;
    this.interludeSound = null;
    this.isTransitioning = false;
    this.transitionTimer = null;
  }

  /**
   * Inicia una transición profesional
   */
  async startTransition(currentSound, nextSongFile, mixPlan, interludeFile = null) {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    this.currentSound = currentSound;
    
    try {
      console.log('🎚️ Loading next track at volume 0...');
      
      // Cargar siguiente canción en segundo plano
      const { sound: nextSound } = await Audio.Sound.createAsync(
        nextSongFile,
        { shouldPlay: false, volume: 0 }
      );
      this.nextSound = nextSound;
      
      // Cargar interludio si existe
      if (interludeFile) {
        const { sound: interludeSound } = await Audio.Sound.createAsync(
          interludeFile,
          { shouldPlay: false, volume: 0 }
        );
        this.interludeSound = interludeSound;
      }
      
      console.log('▶️ Starting playback of all channels...');
      // La canción actual YA está sonando - NO la tocamos
      // Solo empezamos next e interludio en volumen 0
      await this.nextSound.playAsync();
      if (this.interludeSound) {
        await this.interludeSound.playAsync();
      }
      
      // Ejecutar la timeline de volúmenes
      await this.executeVolumeTimeline(mixPlan.volumeTimeline);
      
      console.log('✅ Crossfade complete, cleaning up old track...');
      
      // Asegurar que el nuevo track está a volumen 1.0 y sonando
      await this.nextSound.setVolumeAsync(1.0);
      const status = await this.nextSound.getStatusAsync();
      console.log('🎵 Next sound status:', { isPlaying: status.isPlaying, volume: status.volume });
      
      // Cleanup del track anterior
      if (this.currentSound) {
        try {
          await this.currentSound.stopAsync();
          await this.currentSound.unloadAsync();
        } catch (e) {
          console.warn('Error cleaning up current sound:', e);
        }
      }
      if (this.interludeSound) {
        try {
          await this.interludeSound.stopAsync();
          await this.interludeSound.unloadAsync();
        } catch (e) {
          console.warn('Error cleaning up interlude:', e);
        }
      }
      
      this.isTransitioning = false;
      console.log('🎉 Transition complete, returning new sound');
      return this.nextSound; // Esta será la nueva "current"
      
    } catch (error) {
      console.error('Transition error:', error);
      this.isTransitioning = false;
      throw error;
    }
  }

  /**
   * Ejecuta la timeline de volúmenes frame por frame
   */
  async executeVolumeTimeline(timeline) {
    console.log(`🎚️ Executing volume timeline (${timeline.length} keyframes)`);
    
    return new Promise((resolve) => {
      let currentFrame = 0;
      const startTime = Date.now();
      let lastLogTime = startTime;
      
      const updateVolumes = async () => {
        if (currentFrame >= timeline.length) {
          console.log('✅ Transition complete!');
          resolve();
          return;
        }
        
        const frame = timeline[currentFrame];
        const elapsed = Date.now() - startTime;
        
        // Si ya pasamos este keyframe, pasar al siguiente
        if (elapsed >= frame.timeMs) {
          try {
            // Log cada 2 segundos para debugging
            if (elapsed - lastLogTime >= 2000) {
              console.log(`🎚️ Frame ${currentFrame}: A=${frame.volumeA.toFixed(2)}, B=${frame.volumeB.toFixed(2)}`);
              lastLogTime = elapsed;
            }
            
            // Actualizar volúmenes
            if (this.currentSound) {
              await this.currentSound.setVolumeAsync(frame.volumeA);
            }
            if (this.nextSound) {
              await this.nextSound.setVolumeAsync(frame.volumeB);
            }
            if (this.interludeSound && frame.volumeInterlude > 0) {
              await this.interludeSound.setVolumeAsync(frame.volumeInterlude);
            }
          } catch (err) {
            console.warn('Volume update error:', err);
          }
          
          currentFrame++;
        }
        
        // Continuar en el siguiente frame (60fps)
        requestAnimationFrame(updateVolumes);
      };
      
      updateVolumes();
    });
  }

  /**
   * Cancela transición en curso
   */
  async cancelTransition() {
    this.isTransitioning = false;
    if (this.transitionTimer) {
      clearInterval(this.transitionTimer);
    }
    if (this.nextSound) {
      await this.nextSound.stopAsync();
      await this.nextSound.unloadAsync();
    }
    if (this.interludeSound) {
      await this.interludeSound.stopAsync();
      await this.interludeSound.unloadAsync();
    }
  }

  cleanup() {
    this.cancelTransition();
    this.currentSound = null;
    this.nextSound = null;
    this.interludeSound = null;
  }
}
