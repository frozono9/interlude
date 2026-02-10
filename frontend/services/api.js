const API_URL = 'http://10.192.84.215:3000/api';

export const TransitionAPI = {
  async generateMixPlan(currentSongId, nextSongId, interlude = null) {
    try {
      const response = await fetch(`${API_URL}/transitions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSongId,
          nextSongId,
          interlude
        })
      });
      
      if (!response.ok) throw new Error('Failed to generate mix plan');
      
      const data = await response.json();
      return data.mixPlan;
    } catch (error) {
      console.error('API Error:', error);
      // Fallback: usar mixing simple si backend no está disponible
      return this.getSimpleFallbackPlan();
    }
  },

  async previewTransition(songAId, songBId) {
    try {
      const response = await fetch(`${API_URL}/transitions/preview/${songAId}/${songBId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Preview error:', error);
      return { compatible: true, score: 0.7 };
    }
  },

  // Plan simple si el backend no está corriendo
  getSimpleFallbackPlan() {
    const duration = 16000;
    const steps = 15;
    const timeline = [];
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      timeline.push({
        timeMs: Math.round(progress * duration),
        volumeA: Math.pow(1 - progress, 1.5),
        volumeB: Math.pow(progress, 1.5),
        volumeInterlude: (progress >= 0.2 && progress <= 0.8) ? 1.0 : 0
      });
    }
    
    return {
      transitionStartMs: -16000, // 16s antes del final
      transitionDurationMs: duration,
      volumeTimeline: timeline,
      interlude: null
    };
  }
};
