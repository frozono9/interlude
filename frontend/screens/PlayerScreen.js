import { StyleSheet, Text, View, Image, TouchableOpacity, Dimensions, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect, useRef } from 'react';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import * as apiService from '../services/apiService';

const { width } = Dimensions.get('window');

// MAPEO DE ANUNCIOS LOCALES (Fakes)
// He puesto demo-ad.mp3 como placeholder para que no falle al compilar.
// Cuando tengas los archivos reales en frontend/assets/, cambia los nombres aquí.
const LOCAL_ADS = {
  'bb_ticketmaster': require('../assets/ad_bb_ticketmaster.mp3'),
  'bb_beats': require('../assets/ad_bb_beats.mp3'),
  'bb_apple': require('../assets/ad_bb_apple.mp3'),
  'olivia_apple': require('../assets/ad_olivia_apple.mp3'),
  'olivia_beats': require('../assets/ad_olivia_beats.mp3'),
};

export default function PlayerScreen({ route, navigation }) {
  const { songList, initialIndex, isDemoMode } = route.params;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const song = songList[currentIndex];
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPreparingAd, setIsPreparingAd] = useState(false);
  const isPreparingRequestRef = useRef(false);
  
  const soundRef = useRef(null);
  const backgroundSoundRef = useRef(null);
  const adSoundRef = useRef(null);
  const [isShowingAd, setIsShowingAd] = useState(false);
  const [adMetadata, setAdMetadata] = useState(null);
  
  // Ref para guardar el anuncio preparado por el backend
  const preparedAdRef = useRef(null);
  const adPreparedForIndexRef = useRef(null);
  const lastAdIdRef = useRef(null);
  const forcedNextSongTitleRef = useRef(null);
  const isInterludeSequenceActiveRef = useRef(false);
  
  // Contador de canciones desde el último anuncio
  const [songsSinceLastAd, setSongsSinceLastAd] = useState(0);

  // Datos a mostrar: o la canción actual o el anuncio
  const displayData = isShowingAd && adMetadata ? adMetadata : song;

  // Callback de status reutilizable
  const setupStatusCallback = (sound) => {
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded) {
        setPosition(status.positionMillis);
        setDuration(status.durationMillis);
        if (!isScrubbing && status.durationMillis > 0) {
          const currentProgress = status.positionMillis / status.durationMillis;
          setProgress(status.positionMillis <= 0 ? 0 : currentProgress);
          
          const remainingMillis = status.durationMillis - status.positionMillis;
          const supportedArtists = ['Bad Bunny', 'Olivia Rodrigo'];
          
          // FASE 1: 5 segundos antes - Empezar análisis (Sticker sale DURANTE 5 segundos)
          if (remainingMillis <= 5000 && 
              song.interlude && 
              supportedArtists.includes(song.artist) &&
              adPreparedForIndexRef.current !== currentIndex &&
              !isPreparingRequestRef.current &&
              !isShowingAd) {
            prepareNextAd();
          }

          // FASE 2: 3 segundos antes - Empezar la secuencia de transición DJ
          if (remainingMillis <= 3000 && 
              !isInterludeSequenceActiveRef.current &&
              !isShowingAd &&
              song.interlude && 
              supportedArtists.includes(song.artist)) {
            playAd();
          }
        }
        setIsPlaying(status.isPlaying);
        
        // Cuando termina una canción (solo si no estamos en secuencia de Interlude)
        if (status.didJustFinish && !isInterludeSequenceActiveRef.current) {
          handleSongEnd();
        }
      }
    });
  };
  
  // Preparar el anuncio con anticipación (Simulación de 5 segundos)
  const prepareNextAd = async () => {
    if (isPreparingRequestRef.current) return;
    
    isPreparingRequestRef.current = true;
    setIsPreparingAd(true);
    adPreparedForIndexRef.current = currentIndex;
    
    try {
      const supportedArtists = ['Bad Bunny', 'Olivia Rodrigo'];
      if (!supportedArtists.includes(song.artist)) {
        setIsPreparingAd(false);
        isPreparingRequestRef.current = false;
        return;
      }

      console.log(`🤖 Simulando análisis de Interlude para ${song.artist}... (5s)`);
      
      // ESPERA ARTIFICIAL DE 5 SEGUNDOS
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Seleccionar un anuncio aleatorio localmente (sin repetir el anterior)
      const ads = song.artist === 'Bad Bunny' 
        ? ['bb_ticketmaster', 'bb_beats', 'bb_apple']
        : ['olivia_apple', 'olivia_beats'];
      
      let selectedId;
      if (ads.length > 1) {
        do {
          selectedId = ads[Math.floor(Math.random() * ads.length)];
        } while (selectedId === lastAdIdRef.current);
      } else {
        selectedId = ads[0];
      }
      
      lastAdIdRef.current = selectedId;
      
      // REGLAS DE TRANSICIÓN FORZADA
      if (selectedId === 'bb_ticketmaster') {
        forcedNextSongTitleRef.current = 'Blinding Lights';
      } else if (selectedId === 'olivia_apple') {
        forcedNextSongTitleRef.current = 'As It Was';
      } else {
        forcedNextSongTitleRef.current = null;
      }
      
      // Simular la metadata que vendría del backend
      preparedAdRef.current = {
        isLocal: true,
        localId: selectedId,
        artist: song.artist,
        title: selectedId.includes('ticketmaster') ? 'Concierto Barcelona' : 
               selectedId.includes('beats') ? 'Beats Studio Pro' : 'Apple Music Premium',
        artwork: selectedId.includes('apple') ? 'apple-ad.jpg' : 
                 selectedId.includes('beats') ? 'beats-ad.jpg' : 'concert-barcelona.jpg',
        color: selectedId.includes('apple') ? '#9b30ff' : 
               selectedId.includes('beats') ? '#241f1f' : '#FF6B6B',
        sponsorLink: selectedId.includes('ticketmaster') ? 'https://www.ticketmaster.es/artist/bad-bunny-entradas/979454' :
                    selectedId.includes('apple') ? 'https://www.apple.com/es/apple-music/' :
                    selectedId.includes('beats') ? 'https://www.beatsbydre.com/es/headphones/solo4-wireless' : 'https://interlude.fm'
      };

      console.log('✅ Anuncio local preparado:', selectedId);
    } catch (error) {
      console.error('Error simulando anuncio:', error);
      preparedAdRef.current = null;
    } finally {
      setIsPreparingAd(false);
      isPreparingRequestRef.current = false;
    }
  };

  const handleSongEnd = async () => {
    // Voces disponibles: Bad Bunny y Olivia Rodrigo
    const supportedArtists = ['Bad Bunny', 'Olivia Rodrigo'];
    
    // Si la canción tiene interlude Y el artista está soportado, mostrar anuncio
    if (song.interlude && supportedArtists.includes(song.artist)) {
      await playAd();
    } else {
      // Ir directo a siguiente canción
      handleNext();
    }
  };

  const playAd = async () => {
    try {
      if (isInterludeSequenceActiveRef.current) return;
      isInterludeSequenceActiveRef.current = true;
      setIsTransitioning(true);

      // Esperar al análisis si aún no ha terminado
      if (isPreparingRequestRef.current) {
        while (isPreparingRequestRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // PREPARACIÓN DE DATOS
      let adData;
      let audioSource;
      
      if (preparedAdRef.current) {
        const aiAd = preparedAdRef.current;
        const getArtworkSource = (filename) => {
          try {
            switch (filename) {
              case 'apple-ad.jpg': return require('../assets/apple-ad.jpg'); 
              case 'beats-ad.jpg': return require('../assets/beats-ad.jpg');
              default: return require('../assets/ad-cover.jpg');
            }
          } catch (e) { return require('../assets/ad-cover.jpg'); }
        };

        adData = {
          title: aiAd.title,
          artist: aiAd.artist,
          artwork: getArtworkSource(aiAd.artwork),
          color: aiAd.color,
          sponsorLink: aiAd.sponsorLink || 'https://interlude.fm'
        };
        audioSource = aiAd.isLocal ? LOCAL_ADS[aiAd.localId] : { uri: apiService.getFullAudioUrl(aiAd.audioUrl) };
      } else {
        adData = {
          title: "Interlude Sponsor",
          artist: "Publicidad",
          artwork: require('../assets/ad-cover.jpg'),
          color: '#333',
          sponsorLink: 'https://interlude.fm'
        };
        audioSource = require('../assets/demo-ad.mp3');
      }

      // PASO 1: Cambiar UI inmediatamente
      setAdMetadata(adData);
      setIsShowingAd(true);

      // PASO 2: CARGAR DE NUEVO la canción anterior como música de fondo
      console.log('🎧 Cargando música de fondo...');
      const { sound: bgSound } = await Audio.Sound.createAsync(
        song.audioFile,  // La canción que acaba de terminar
        { shouldPlay: true, volume: 1.0, isLooping: true }
      );
      backgroundSoundRef.current = bgSound;

      // Actualizar isPlaying con el fondo mientras no haya locución
      bgSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && !adSoundRef.current) {
          setIsPlaying(status.isPlaying);
        }
      });

      // PASO 3: Mantener 3 segundos con música de fondo a volumen normal
      console.log('🎧 3s de música de fondo a volumen normal...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // PASO 4: Bajar volumen PROGRESIVAMENTE (Fade out DJ)
      console.log('🎧 Fade out de la música de fondo...');
      const fadeSteps = 20;
      const fadeDuration = 1500; // 1.5 segundos para un fade suave
      const volumeStart = 1.0;
      const volumeEnd = 0.08;
      
      for (let i = 0; i <= fadeSteps; i++) {
        const v = volumeStart - (i * (volumeStart - volumeEnd) / fadeSteps);
        await bgSound.setVolumeAsync(v);
        await new Promise(resolve => setTimeout(resolve, fadeDuration / fadeSteps));
      }
      
      // PASO 5: Lanzar el anuncio (voz) ENCIMA
      console.log('🎤 Reproduciendo anuncio...');
      const { sound: adSound } = await Audio.Sound.createAsync(
        audioSource,
        { shouldPlay: true, volume: 1.0 }
      );
      adSoundRef.current = adSound;
      
      await new Promise((resolve) => {
        adSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) resolve();
          }
        });
      });
      
      // PASO 6: Limpiar todo
      await adSound.unloadAsync();
      adSoundRef.current = null;
      await bgSound.stopAsync();
      await bgSound.unloadAsync();
      backgroundSoundRef.current = null;

      setIsShowingAd(false);
      setAdMetadata(null);
      setIsTransitioning(false);
      preparedAdRef.current = null;
      isInterludeSequenceActiveRef.current = false;
      setSongsSinceLastAd(0);
      handleNext();
    } catch (error) {
      console.error('Error playing ad sequence:', error);
      if (backgroundSoundRef.current) {
        try {
          await backgroundSoundRef.current.stopAsync();
          await backgroundSoundRef.current.unloadAsync();
        } catch (e) {}
        backgroundSoundRef.current = null;
      }
      setIsShowingAd(false);
      setAdMetadata(null);
      setIsTransitioning(false);
      preparedAdRef.current = null;
      isInterludeSequenceActiveRef.current = false;
      handleNext();
    }
  };

  useEffect(() => {
    // No cargar audio si estamos mostrando un anuncio
    if (isShowingAd) return;

    // Reset states cuando cargamos una nueva canción
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
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [currentIndex, isShowingAd]);

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
    // Incrementar contador de canciones desde último anuncio
    setSongsSinceLastAd(prev => prev + 1);
    
    // REGLAS ESPECIALES DE TRANSICIÓN (Mix DJ)
    if (forcedNextSongTitleRef.current) {
      const forcedIndex = songList.findIndex(s => s.title === forcedNextSongTitleRef.current);
      if (forcedIndex !== -1) {
        console.log(`✨ Transición forzada activada: Saltando a ${forcedNextSongTitleRef.current}`);
        forcedNextSongTitleRef.current = null; // Reset de la regla
        setCurrentIndex(forcedIndex);
        return;
      }
    }

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
    // Controlar anuncio y música de fondo si estamos en un anuncio
    if (isShowingAd) {
      const activeSound = adSoundRef.current || backgroundSoundRef.current;
      if (activeSound) {
        if (isPlaying) {
          if (adSoundRef.current) await adSoundRef.current.pauseAsync();
          if (backgroundSoundRef.current) await backgroundSoundRef.current.pauseAsync();
        } else {
          if (adSoundRef.current) await adSoundRef.current.playAsync();
          if (backgroundSoundRef.current) await backgroundSoundRef.current.playAsync();
        }
      }
      return;
    }

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
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          const seekPosition = value * duration;
          await soundRef.current.setPositionAsync(seekPosition);
        }
      } catch (e) {
        console.log('Error seeking:', e);
      }
    }
  };

  const handleVolumeChange = async (value) => {
    setVolume(value);
    if (soundRef.current) {
      await soundRef.current.setVolumeAsync(value);
    }
  };

  return (
    <View style={styles.outerContainer}>
      {/* Swipe Down Indicator */}
      <View style={styles.handleBar} />
      
      <LinearGradient
        colors={[displayData.color || '#4a5a6a', '#121212']}
        style={styles.container}
      >
        <View style={styles.safeArea}>
          <View style={styles.artworkWrapper}>
            <Image
              source={displayData.artwork}
              style={styles.artwork}
              resizeMode="cover"
            />
            {/* Badge interlude - Solo visible durante anuncios */}
            {isShowingAd && (
              <View style={styles.interludeBadgeContainer}>
                <View style={styles.interludeBadge}>
                  <Text style={styles.interludeBadgeText}>powered by </Text>
                  <Text style={styles.interludeBadgeBrand}>interlude</Text>
                </View>
              </View>
            )}

            {/* Sticker de preparación AI - Diseño más limpio y consistente */}
            {isPreparingAd && (
              <View style={styles.preparingStickerContainer}>
                <View style={[styles.interludeBadge, { backgroundColor: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.3)' }]}>
                  <ActivityIndicator size="small" color="#FF00A8" style={{ marginRight: 8, transform: [{ scale: 0.8 }] }} />
                  <Text style={styles.interludeBadgeText}>Analysing with </Text>
                  <Text style={styles.interludeBadgeBrand}>interlude</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.playerContent}>
            <View style={styles.metaRow}>
              <View style={styles.titleContainer}>
                <Text style={styles.title} numberOfLines={1}>{displayData.title}</Text>
                {/* Botón de Sponsor - Solo visible durante anuncios */}
                {isShowingAd && adMetadata?.sponsorLink && (
                  <TouchableOpacity 
                    style={[styles.sponsorButton, { marginTop: 4 }]}
                    onPress={() => Linking.openURL(adMetadata.sponsorLink)}
                  >
                    <Text style={styles.sponsorButtonText}>Learn More</Text>
                    <Ionicons name="arrow-forward" size={14} color="white" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                )}
                {!isShowingAd && (
                  <Text style={styles.artist} numberOfLines={1}>{displayData.artist}</Text>
                )}
              </View>
              <View style={[styles.metaActions, isShowingAd && { opacity: 0 }]}>
                <TouchableOpacity style={styles.circleIconBtn} disabled={isShowingAd}>
                  <Ionicons 
                    name="star" 
                    size={22} 
                    color="white" 
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.circleIconBtn} disabled={isShowingAd}>
                  <Ionicons 
                    name="ellipsis-horizontal-circle-outline" 
                    size={26} 
                    color="white" 
                    />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.progressSection}>
              <Slider
                style={styles.progressSlider}
                minimumValue={0}
                maximumValue={1}
                value={progress}
                onValueChange={handleValueChange}
                onSlidingStart={handleSlidingStart}
                onSlidingComplete={handleSlidingComplete}
                disabled={isShowingAd}
                minimumTrackTintColor={isShowingAd ? "rgba(255,255,255,0.3)" : "#FFFFFF"}
                maximumTrackTintColor="rgba(255,255,255,0.2)"
                thumbTintColor={isScrubbing && !isShowingAd ? "#FFFFFF" : "transparent"}
              />
              <View style={styles.timeLabels}>
                <Text style={styles.timeText}>{formatTime(position)}</Text>
                <Text style={styles.timeText}>{remainingTime(duration, position)}</Text>
              </View>
            </View>

            <View style={styles.controlsRow}>
              <TouchableOpacity onPress={handlePrevious} disabled={isShowingAd || isPreparingAd}>
                <Ionicons 
                  name="play-back-sharp" 
                  size={48} 
                  color={(isShowingAd || isPreparingAd) ? "rgba(255,255,255,0.2)" : "white"} 
                />
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

              <TouchableOpacity onPress={handleNext} disabled={isShowingAd || isPreparingAd}>
                <Ionicons 
                  name="play-forward-sharp" 
                  size={48} 
                  color={(isShowingAd || isPreparingAd) ? "rgba(255,255,255,0.2)" : "white"} 
                />
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
              <TouchableOpacity disabled={isShowingAd}>
                <Ionicons 
                  name="chatbubble-outline" 
                  size={24} 
                  color={isShowingAd ? "rgba(255,255,255,0.2)" : "white"} 
                />
              </TouchableOpacity>
              <TouchableOpacity disabled={isShowingAd}>
                <Ionicons 
                  name="radio-outline" 
                  size={24} 
                  color={isShowingAd ? "rgba(255,255,255,0.2)" : "white"} 
                />
              </TouchableOpacity>
              <TouchableOpacity disabled={isShowingAd}>
                <Ionicons 
                  name="infinite" 
                  size={28} 
                  color={isShowingAd ? "rgba(255,255,255,0.2)" : "white"} 
                />
              </TouchableOpacity>
              <TouchableOpacity disabled={isShowingAd}>
                <Ionicons 
                  name="list" 
                  size={24} 
                  color={isShowingAd ? "rgba(255,255,255,0.2)" : "white"} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </LinearGradient>
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
  interludeBadge: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,45,85,0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  interludeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
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
    height: 40, // Altura fija absoluta para que NADA se mueva
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
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
  interludeBadgeContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  interludeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  interludeBadgeText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 9,
    fontWeight: '400',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  interludeBadgeBrand: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sponsorButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sponsorButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  preparingStickerContainer: {
    position: 'absolute',
    bottom: 20, // Posicionarlo justo encima del badge normal o en el mismo sitio
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
});
