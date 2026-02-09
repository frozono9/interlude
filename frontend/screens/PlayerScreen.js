import { StyleSheet, Text, View, Image, TouchableOpacity, Dimensions } from 'react-native';
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
  
  const soundRef = useRef(null);

  useEffect(() => {
    // Reset states IMMEDIATELY and SYNCHRONOUSLY when currentIndex changes
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
        
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis);
            setDuration(status.durationMillis);
            if (!isScrubbing && status.durationMillis > 0) {
              const currentProgress = status.positionMillis / status.durationMillis;
              // If we are at 0, force it to exactly 0
              setProgress(status.positionMillis <= 0 ? 0 : currentProgress);
            }
            setIsPlaying(status.isPlaying);
            
            if (status.didJustFinish) {
              handleNext();
            }
          }
        });
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
  }, [currentIndex]); // Reload when index changes

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
        colors={['#4a5a6a', '#1e252b']}
        style={styles.container}
      >
        <View style={styles.safeArea}>
          <View style={styles.artworkWrapper}>
            <Image
              source={song.artwork}
              style={styles.artwork}
              resizeMode="cover"
            />
          </View>

          <View style={styles.playerContent}>
            <View style={styles.metaRow}>
              <View style={styles.titleContainer}>
                <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
                <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
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
                key={`slider-${currentIndex}`}
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
