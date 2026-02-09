/**
 * TransitionService
 * Genera transiciones inteligentes tipo DJ entre canciones
 */

const audioAnalysis = require('./audioAnalysis');

class TransitionService {
  /**
   * Genera un plan de transición entre dos canciones
   * @param {number} songAId - ID de la canción actual
   * @param {number} songBId - ID de la siguiente canción
   * @param {object} interlude - Info del interludio (voz del artista)
   * @returns {object} Plan de mixing con timings y volúmenes
   */
  async generateTransition(songAId, songBId, interlude = null) {
    const metadataA = await audioAnalysis.getSongMetadata(songAId);
    const metadataB = await audioAnalysis.getSongMetadata(songBId);
    
    const transitionDuration = interlude ? interlude.duration : 16000; // ms
    
    // Calcular el punto de inicio de la transición
    const startTransitionAt = this.calculateTransitionStartPoint(
      metadataA,
      transitionDuration
    );
    
    // Generar el mix plan
    const mixPlan = {
      transitionStartMs: startTransitionAt * 1000,
      transitionDurationMs: transitionDuration,
      
      // Timeline de volúmenes (keyframes cada 2 segundos)
      volumeTimeline: this.generateVolumeTimeline(transitionDuration, interlude),
      
      // Si hay interludio
      interlude: interlude ? {
        startAtMs: startTransitionAt * 1000,
        durationMs: interlude.duration,
        fadeInMs: 1000,
        fadeOutMs: 2000
      } : null,
      
      // Ajustes de BPM si son muy diferentes
      bpmSync: this.calculateBPMSync(metadataA.bpm, metadataB.bpm),
      
      // Puntos de cue
      cuePoints: {
        songAOut: metadataA.cueOutPoint,
        songBIn: metadataB.cueInPoint
      },
      
      // Compatibilidad armónica
      harmonicScore: audioAnalysis.calculateHarmonicCompatibility(
        metadataA.key,
        metadataB.key
      ),
      
      // Recomendaciones de EQ
      eqCurve: this.generateEQCurve(metadataA, metadataB)
    };
    
    return mixPlan;
  }

  calculateTransitionStartPoint(metadata, transitionDuration) {
    // Empezar la transición X segundos antes del final
    const bufferSeconds = transitionDuration / 1000;
    return Math.abs(metadata.cueOutPoint) + bufferSeconds;
  }

  /**
   * Genera timeline de volúmenes para crossfade suave
   * Con curva logarítmica para sonar más natural
   */
  generateVolumeTimeline(durationMs, interlude) {
    const steps = 15; // keyframes
    const timeline = [];
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const timeMs = progress * durationMs;
      
      // Curva de fade out para canción A (logarítmica)
      const volumeA = Math.pow(1 - progress, 1.5);
      
      // Curva de fade in para canción B (logarítmica inversa)
      const volumeB = Math.pow(progress, 1.5);
      
      // Si hay interludio, ajustar volúmenes
      let volumeInterlude = 0;
      if (interlude && progress >= 0.2 && progress <= 0.8) {
        volumeInterlude = 1.0;
      }
      
      timeline.push({
        timeMs: Math.round(timeMs),
        volumeA: Math.max(0, volumeA),
        volumeB: Math.min(1, volumeB),
        volumeInterlude
      });
    }
    
    return timeline;
  }

  /**
   * Calcula si necesitamos ajustar BPM (tempo sync)
   */
  calculateBPMSync(bpmA, bpmB) {
    const difference = Math.abs(bpmA - bpmB);
    
    if (difference < 3) {
      return { needsSync: false, method: 'none' };
    } else if (difference < 10) {
      return { 
        needsSync: true, 
        method: 'stretch',
        targetBPM: (bpmA + bpmB) / 2
      };
    } else {
      return {
        needsSync: true,
        method: 'beatmatch',
        syncPoint: 'downbeat'
      };
    }
  }

  /**
   * Genera curva de EQ para intercambiar bajos suavemente
   * (Bass swap technique)
   */
  generateEQCurve(metadataA, metadataB) {
    return {
      lowCutA: {
        startHz: 20,
        endHz: 250,
        curve: 'gradual' // Ir quitando bajos a A
      },
      lowBoostB: {
        startHz: 20,
        endHz: 250,
        curve: 'gradual' // Ir metiendo bajos de B
      }
    };
  }
}

module.exports = new TransitionService();
