import { StyleSheet, Text, View, Image, TouchableOpacity, Dimensions, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect, useRef } from 'react';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';

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
  const [isShowingAd, setIsShowingAd] = useState(false);
  const [adMetadata, setAdMetadata] = useState(null);

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
        }
        setIsPlaying(status.isPlaying);
        
        // Cuando termina una canción
        if (status.didJustFinish) {
          handleSongEnd();
        }
      }
    });
  };

  const handleSongEnd = async () => {
    // Si la canción tiene interlude, mostrar anuncio
    if (song.interlude) {
      await playAd();
    } else {
      // Ir directo a siguiente canción
      handleNext();
    }
  };

  const playAd = async () => {
    try {
      setIsTransitioning(true);
      
      // Configurar metadata del anuncio
      const adData = {
        title: "Coca-Cola Original",
        artist: "",
        artwork: require('../assets/ad-cover.jpg'),
        color: '#D4B896', // Color beige/marrón claro que combina con la imagen
        sponsorLink: 'https://www.coca-cola.com'
      };
      setAdMetadata(adData);
      setIsShowingAd(true);
      
      // Cargar y reproducir audio del anuncio
      const { sound: adSound } = await Audio.Sound.createAsync(
        require('../assets/demo-ad.mp3'),
        { shouldPlay: true, volume: 1.0 }
      );
      
      // Esperar a que termine el anuncio
      await new Promise((resolve) => {
        adSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            resolve();
          }
        });
      });
      
      // Limpiar
      await adSound.unloadAsync();
      setIsShowingAd(false);
      setAdMetadata(null);
      setIsTransitioning(false);
      
      // Pasar a siguiente canción
      handleNext();
    } catch (error) {
      console.error('Error playing ad:', error);
      setIsShowingAd(false);
      setAdMetadata(null);
      setIsTransitioning(false);
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
              <TouchableOpacity onPress={handlePrevious} disabled={isShowingAd}>
                <Ionicons 
                  name="play-back-sharp" 
                  size={48} 
                  color={isShowingAd ? "rgba(255,255,255,0.2)" : "white"} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.playPauseBtn}
                onPress={handlePlayPause}
                disabled={isShowingAd}
              >
                <Ionicons 
                  name={isPlaying ? "pause-sharp" : "play-sharp"} 
                  size={64} 
                  color={isShowingAd ? "rgba(255,255,255,0.2)" : "white"} 
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleNext} disabled={isShowingAd}>
                <Ionicons 
                  name="play-forward-sharp" 
                  size={48} 
                  color={isShowingAd ? "rgba(255,255,255,0.2)" : "white"} 
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
});
