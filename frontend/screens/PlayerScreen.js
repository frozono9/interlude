import { StyleSheet, Text, View, Image, TouchableOpacity, Dimensions, ActivityIndicator, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect, useRef } from 'react';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import { TransitionAPI } from '../services/api';
import { DJMixEngine } from '../services/djMixEngine';

const { width } = Dimensions.get('window');

export default function PlayerScreen({ route, navigation }) {
  const { songList, initialIndex } = route.params;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const song = songList[currentIndex];
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const soundRef = useRef(null);
  const djEngineRef = useRef(new DJMixEngine());
  const transitionScheduledRef = useRef(false);
  const skipAudioReloadRef = useRef(false);
  
  // Animación para el crossfade mágico de UI
  const crossfadeAnim = useRef(new Animated.Value(0)).current;
  const [nextIndex, setNextIndex] = useState(null);

  // Callback de status reutilizable
  const setupStatusCallback = (sound) => {
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded) {
        setPosition(status.positionMillis);
        setDuration(status.durationMillis);
        if (!isScrubbing && status.durationMillis > 0) {
          const currentProgress = status.positionMillis / status.durationMillis;
          setProgress(status.positionMillis <= 0 ? 0 : currentProgress);
          
          // 🎵 MAGIA DJ: Detectar cuándo empezar transición
          const remainingMs = status.durationMillis - status.positionMillis;
          if (remainingMs <= 20000 && !transitionScheduledRef.current && !isTransitioning) {
            scheduleTransition();
          }
        }
        setIsPlaying(status.isPlaying);
        
        // Solo hacer handleNext si NO se programó una transición DJ
        if (status.didJustFinish && !transitionScheduledRef.current) {
          handleNext();
        }
      }
    });
  };

  useEffect(() => {
    // Si acabamos de completar una transición DJ, NO recargar el audio
    if (skipAudioReloadRef.current) {
      skipAudioReloadRef.current = false;
      console.log('🔄 UI updated to new track, audio continues playing');
      
      // Obtener el status actual del nuevo audio para actualizar la UI inmediatamente
      if (soundRef.current) {
        soundRef.current.getStatusAsync().then(status => {
          if (status.isLoaded) {
            setPosition(status.positionMillis);
            setDuration(status.durationMillis);
            setProgress(status.positionMillis / status.durationMillis);
            setIsPlaying(status.isPlaying);
          }
        });
      }
      
      return;
    }

    // Reset states IMMEDIATELY and SYNCHRONOUSLY cuando cargamos una nueva canción
    setProgress(0);
    setPosition(0);
    setDuration(0);
    setIsPlaying(false);

    async function setupAudio() {
      try {
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }

        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
        });
        
        const { sound } = await Audio.Sound.createAsync(
          song.audioFile,
          { shouldPlay: true, volume: 1.0 }
        );
        
        soundRef.current = sound;
        setupStatusCallback(sound);
      } catch (error) {
        console.log('Error loading sound', error);
      }
    }

    setupAudio();

    return () => {
      // SOLO descargar si NO estamos en medio de una transición DJ
      if (soundRef.current && !skipAudioReloadRef.current) {
        console.log('🧹 Normal cleanup: Unloading sound');
        soundRef.current.unloadAsync();
      } else {
        console.log('⏭️ Skipping cleanup: DJ Transition in progress');
      }
    };
  }, [currentIndex]);

  const scheduleTransition = async () => {
    if (transitionScheduledRef.current) return;
    transitionScheduledRef.current = true;
    
    // No esperes al backend si está fallando, vamos directo a la mezcla local
    const nextIndexTarget = currentIndex < songList.length - 1 ? currentIndex + 1 : 0;
    const nextSong = songList[nextIndexTarget];
    
    console.log(`🎧 DJ Mix Iniciado: ${song.title} → ${nextSong.title}`);
    
    try {
      // 1. Guardar referencia a la canción que suena ahora
      const prevSound = soundRef.current;
      
      // 2. DESACTIVAR el callback de la canción anterior para que la UI no rebote
      if (prevSound) {
        prevSound.setOnPlaybackStatusUpdate(null);
      }
      
      // 3. Cargar e Iniciar la siguiente YA MISMO en volumen 0
      console.log('📀 Cargando siguiente track...');
      const { sound: nextSound } = await Audio.Sound.createAsync(
        nextSong.audioFile,
        { shouldPlay: true, volume: 0 },
        null,
        true
      );
      
      await nextSound.playAsync();
      setupStatusCallback(nextSound);
      
      // 4. Preparar TRANSICIÓN MÁGICA de UI
      setNextIndex(nextIndexTarget);
      setIsTransitioning(true);
      
      // 🍎 APPLE-STYLE ELEGANT CROSSFADE
      Animated.timing(crossfadeAnim, {
        toValue: 1,
        duration: 3500, // Suave pero no lento
        easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Curva Standard de Apple
        useNativeDriver: true,
      }).start();

      // 5. Actualizar referencias para evitar recargas
      skipAudioReloadRef.current = true;
      soundRef.current = nextSound;

      // 6. Ejecutar Crossfade de Audio (16 segundos)
      const duration = 16000;
      const steps = 40;
      const interval = duration / steps;
      
      console.log('🎚️ Ejecutando crossfade en vivo...');
      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        
        try {
          if (nextSound) await nextSound.setVolumeAsync(progress);
          if (prevSound) await prevSound.setVolumeAsync(1 - progress);
        } catch (vErr) {}

        // Cuando el audio ya está avanzado, formalizamos el cambio de index
        if (i === 10) { // A los ~4 segundos, igual que el crossfadeAnim
          setCurrentIndex(nextIndexTarget);
        }
        
        if (i < steps) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      }
      
      console.log('✅ Mix completo');
      
      // 7. Limpiar
      if (prevSound) {
        try {
          await prevSound.stopAsync();
          await prevSound.unloadAsync();
        } catch (e) {}
      }
      
      setIsTransitioning(false);
      setNextIndex(null);
      crossfadeAnim.setValue(0);
      
      setTimeout(() => {
        transitionScheduledRef.current = false;
      }, 1000);
      
    } catch (error) {
      console.error('DJ Transition Error:', error);
      setIsTransitioning(false);
      transitionScheduledRef.current = false;
      // Fallback simple si falla la carga
      setCurrentIndex(nextIndex);
    }
  };

  const formatTime = (millis) => {
    if (!millis) return "0:00";
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const remainingTime = (total, current) => {
    const remaining = (total || 0) - (current || 0);
    return `-${formatTime(remaining)}`;
  };

  const handleNext = () => {
    if (currentIndex < songList.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // Loop back or stop
    }
  };

  const handlePrevious = async () => {
    if (position > 3000) {
      // If song played for more than 3 seconds, restart it
      await soundRef.current?.setPositionAsync(0);
    } else if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(songList.length - 1); // Loop to end
    }
  };

  const handlePlayPause = async () => {
    if (!soundRef.current) return;
    
    if (isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  };

  const handleValueChange = async (value) => {
    setProgress(value);
  };

  const handleSlidingStart = () => {
    setIsScrubbing(true);
  };

  const handleSlidingComplete = async (value) => {
    setIsScrubbing(false);
    if (soundRef.current) {
      const seekPosition = value * duration;
      await soundRef.current.setPositionAsync(seekPosition);
    }
  };

  const handleVolumeChange = async (value) => {
    setVolume(value);
    if (soundRef.current) {
      await soundRef.current.setVolumeAsync(value);
    }
  };

  const renderPlayerUI = (currentSong, songIndex, isLayerB = false) => {
    // � APPLE-STYLE ELEGANT CROSSFADE
    // Un fundido cruzado puro, suave y con un ligero cambio de profundidad
    const opacity = crossfadeAnim.interpolate({
      inputRange: [0, 1],
      outputRange: isLayerB ? [0, 1] : [1, 0]
    });

    // Ligero zoom-in para la que entra, sutil para que no sea "goofy"
    const scale = crossfadeAnim.interpolate({
      inputRange: [0, 1],
      outputRange: isLayerB ? [0.97, 1] : [1, 1]
    });

    const pointerEvents = (nextIndex === null && !isLayerB) || (nextIndex !== null && isLayerB) ? 'auto' : 'none';

    return (
      <Animated.View 
        pointerEvents={pointerEvents}
        style={[
          StyleSheet.absoluteFill, 
          { 
            opacity,
            backgroundColor: '#000', // Evita transparencias raras
            transform: [{ scale }]
          }
        ]}
      >
        <LinearGradient
          colors={[currentSong.color || '#4a5a6a', '#121212']}
          style={styles.container}
        >
          <View style={styles.safeArea}>
            <View style={styles.artworkWrapper}>
              <Image
                source={currentSong.artwork}
                style={styles.artwork}
                resizeMode="cover"
              />
            </View>

            <View style={styles.playerContent}>
              <View style={styles.metaRow}>
                <View style={styles.titleContainer}>
                  <Text style={styles.title} numberOfLines={1}>{currentSong.title}</Text>
                  <Text style={styles.artist} numberOfLines={1}>{currentSong.artist}</Text>
                </View>
                <View style={styles.metaActions}>
                  <TouchableOpacity style={styles.circleIconBtn}>
                    <Ionicons name="star" size={22} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.circleIconBtn}>
                    <Ionicons name="ellipsis-horizontal-circle-outline" size={26} color="white" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.progressSection}>
                <Slider
                  key={`slider-${songIndex}`}
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  value={progress}
                  onValueChange={handleValueChange}
                  onSlidingStart={handleSlidingStart}
                  onSlidingComplete={handleSlidingComplete}
                  minimumTrackTintColor="#FFFFFF"
                  maximumTrackTintColor="rgba(255,255,255,0.2)"
                  thumbTintColor={isScrubbing ? "#FFFFFF" : "transparent"}
                />
                <View style={styles.timeLabels}>
                  <Text style={styles.timeText}>{formatTime(position)}</Text>
                  <Text style={styles.timeText}>{remainingTime(duration, position)}</Text>
                </View>
              </View>

              <View style={styles.controlsRow}>
                <TouchableOpacity onPress={handlePrevious}>
                  <Ionicons name="play-back-sharp" size={48} color="white" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.playPauseBtn}
                  onPress={handlePlayPause}
                >
                  <Ionicons 
                    name={isPlaying ? "pause-sharp" : "play-sharp"} 
                    size={64} 
                    color="white" 
                  />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleNext}>
                  <Ionicons name="play-forward-sharp" size={48} color="white" />
                </TouchableOpacity>
              </View>

              <View style={styles.volumeRow}>
                <Ionicons name="volume-low" size={18} color="rgba(255,255,255,0.5)" />
                <Slider
                  style={styles.volumeSlider}
                  minimumValue={0}
                  maximumValue={1}
                  value={volume}
                  onValueChange={handleVolumeChange}
                  minimumTrackTintColor="#FFFFFF"
                  maximumTrackTintColor="rgba(255,255,255,0.2)"
                  thumbTintColor="#FFFFFF"
                />
                <Ionicons name="volume-high" size={18} color="rgba(255,255,255,0.5)" />
              </View>

              <View style={styles.footerNav}>
                <TouchableOpacity>
                  <Ionicons name="chatbubble-outline" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity>
                  <Ionicons name="radio-outline" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity>
                  <Ionicons name="infinite" size={28} color="white" />
                </TouchableOpacity>
                <TouchableOpacity>
                  <Ionicons name="list" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <View style={styles.outerContainer}>
      {/* Swipe Down Indicator */}
      <View style={styles.handleBar} />
      
      {/* Capa A: Canción actual o anterior */}
      {renderPlayerUI(song, currentIndex, false)}

      {/* Capa B: Siguiente canción (aparece durante el fade) */}
      {nextIndex !== null && renderPlayerUI(songList[nextIndex], nextIndex, true)}

      {/* Indicador de transición activa */}
      {isTransitioning && (
        <View style={styles.transitionBadge}>
          <ActivityIndicator size="small" color="#ff2d55" />
          <Text style={styles.transitionText}>Mixing...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
  },
  handleBar: {
    position: 'absolute',
    top: 8,
    width: 36,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    alignSelf: 'center',
    zIndex: 10,
  },
  transitionBadge: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
    gap: 8,
  },
  transitionText: {
    color: '#ff2d55',
    fontSize: 12,
    fontWeight: '600',
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 50,
  },
  artworkWrapper: {
    width: width * 0.85,
    height: width * 0.85,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
    backgroundColor: '#000',
    borderRadius: 12,
    marginVertical: 20,
  },
  artwork: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  playerContent: {
    width: '100%',
    paddingHorizontal: 30,
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  artist: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  metaActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleIconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  progressSection: {
    marginTop: 30,
  },
  slider: {
    width: '100%',
    height: 30,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -5,
  },
  timeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '500',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  playPauseBtn: {
    width: 80,
    alignItems: 'center',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 5,
  },
  volumeSlider: {
    flex: 1,
    height: 30,
    marginHorizontal: 10,
  },
  footerNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
  },
});
