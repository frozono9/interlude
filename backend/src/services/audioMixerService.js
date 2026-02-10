const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

class AudioMixerService {
  /**
   * Mix speech with background music
   * @param {string} speechPath - Path to the generated speech MP3
   * @param {string} bgPath - Path to the background music file
   * @param {string} outputPath - Path to save the mixed result
   * @param {number} delayMs - Delay before speech starts (default 2000)
   * @returns {Promise<string>} Path to the mixed file
   */
  async mixAd(speechPath, bgPath, outputPath, delayMs = 2000) {
    // Si no se provee bgPath o no existe, usar el default
    if (!bgPath || !fs.existsSync(bgPath)) {
      bgPath = path.join(__dirname, '../../assets/backgrounds/default.mp3');
    }

    try {
      // 1. Get duration of speech
      const speechDuration = await this.getDuration(speechPath);
      const delaySeconds = delayMs / 1000;
      const totalDuration = speechDuration + delaySeconds;

      console.log(`🎬 Mixing ad: Speech duration: ${speechDuration.toFixed(2)}s, Delay: ${delaySeconds}s, Total: ${totalDuration.toFixed(2)}s`);
      console.log(`🎵 Background music: ${bgPath}`);

      return new Promise((resolve, reject) => {
        ffmpeg()
          // Input 0: Background music
          .input(bgPath)
          // Input 1: Speech
          .input(speechPath)
          .complexFilter([
            // background: trim, fade in 2s, low volume, fade out last 2s
            {
              filter: 'atrim',
              options: { duration: totalDuration },
              inputs: '0:a',
              outputs: 'bg_trim'
            },
            {
              filter: 'afade',
              options: { type: 'in', start_time: 0, duration: 2 },
              inputs: 'bg_trim',
              outputs: 'bg_in'
            },
            {
              filter: 'volume',
              options: { volume: 0.15 },
              inputs: 'bg_in',
              outputs: 'bg_vol'
            },
            {
              filter: 'afade',
              options: { type: 'out', start_time: totalDuration - 2, duration: 2 },
              inputs: 'bg_vol',
              outputs: 'bg_out'
            },
            // speech: delay
            {
              filter: 'adelay',
              options: { delays: `${delayMs}|${delayMs}` },
              inputs: '1:a',
              outputs: 'speech_delayed'
            },
            // mix
            {
              filter: 'amix',
              options: { inputs: 2, duration: 'shortest', dropout_transition: 0 },
              inputs: ['bg_out', 'speech_delayed'],
              outputs: 'mixed'
            }
          ], 'mixed')
          .outputOptions([
            `-t ${totalDuration}`
          ])
          .on('error', (err) => {
            console.error('❌ FFmpeg mixing error:', err);
            reject(err);
          })
          .on('end', () => {
            console.log('✅ Audio mixing completed successfully');
            resolve(outputPath);
          })
          .save(outputPath);
      });
    } catch (error) {
      console.error('❌ Error initializing mix:', error);
      throw error;
    }
  }

  /**
   * Get duration of an audio file using ffprobe
   */
  getDuration(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(err);
        resolve(metadata.format.duration);
      });
    });
  }
}

module.exports = new AudioMixerService();
