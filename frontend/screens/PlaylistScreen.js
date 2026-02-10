import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { songs } from '../data/songs';

const { width } = Dimensions.get('window');

export default function PlaylistScreen({ navigation }) {
  const playlistName = "Recently Added";
  const listenerName = "Alex Latorre";

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={30} color="#ff2d55" />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="arrow-down-circle" size={26} color="#ff2d55" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="ellipsis-horizontal-circle" size={26} color="#ff2d55" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Playlist Cover Grid */}
        <View style={styles.coverGrid}>
          <View style={styles.gridRow}>
            <Image source={songs[0]?.artwork} style={styles.gridImage} resizeMode="cover" />
            <Image source={songs[1]?.artwork} style={styles.gridImage} resizeMode="cover" />
          </View>
          <View style={styles.gridRow}>
            <Image source={songs[2]?.artwork} style={styles.gridImage} resizeMode="cover" />
            <Image source={songs[3]?.artwork} style={styles.gridImage} resizeMode="cover" />
          </View>
        </View>

        {/* Playlist Info */}
        <View style={styles.playlistInfo}>
          <Text style={styles.playlistTitle}>{playlistName}</Text>
          <Text style={styles.playlistSubtitle}>{listenerName}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.playButton}
            onPress={() => navigation.navigate('Player', { songList: songs, initialIndex: 0 })}
          >
            <Ionicons name="play-sharp" size={20} color="white" />
            <Text style={styles.playButtonText}>Play</Text>
          </TouchableOpacity>
        <TouchableOpacity 
          style={styles.shuffleButton}
          onPress={() => {
            // Orden específico para el Modo Demo
            const demoOrder = [
              "vampire",
              "MONACO",
              "Blinding Lights",
              "Tití Me Preguntó",
              "Diluvio"
            ];
            
            // Reordenar las canciones según el demoOrder
            const orderedSongs = [];
            const remainingSongs = [...songs];
            
            demoOrder.forEach(title => {
              const index = remainingSongs.findIndex(s => s.title.toLowerCase() === title.toLowerCase());
              if (index !== -1) {
                orderedSongs.push(remainingSongs[index]);
                remainingSongs.splice(index, 1);
              }
            });
            
            // Añadir el resto de canciones al final
            const finalSongList = [...orderedSongs, ...remainingSongs];
            
            navigation.navigate('Player', { 
              songList: finalSongList, 
              initialIndex: 0, 
              isDemoMode: true 
            });
          }}
        >
          <Ionicons name="shuffle" size={20} color="#ff2d55" />
          <Text style={styles.shuffleButtonText}>Shuffle</Text>
        </TouchableOpacity>
        </View>

        {/* Song List */}
        <View style={styles.songList}>
          <View style={styles.separator} />
          {songs.map((item, index) => (
            <View key={item.id}>
              <TouchableOpacity
                style={styles.songRow}
                onPress={() => navigation.navigate('Player', { songList: songs, initialIndex: index })}
              >
                <Image source={item.artwork} style={styles.songArtwork} resizeMode="cover" />
                <View style={styles.songInfo}>
                  <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
                </View>
                <TouchableOpacity style={styles.moreButton}>
                  <Ionicons name="ellipsis-horizontal" size={22} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </TouchableOpacity>
              {index < songs.length - 1 && <View style={styles.separator} />}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Tab Bar Footer */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="home" size={24} color="#8e8e93" />
          <Text style={styles.tabLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="grid-outline" size={24} color="#8e8e93" />
          <Text style={styles.tabLabel}>New</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="radio-outline" size={24} color="#8e8e93" />
          <Text style={styles.tabLabel}>Radio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="library" size={24} color="#ff2d55" />
          <Text style={[styles.tabLabel, { color: '#ff2d55' }]}>Library</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="search" size={24} color="#8e8e93" />
          <Text style={styles.tabLabel}>Search</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingTop: 40,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 0,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },
  coverGrid: {
    width: width * 0.60,
    height: width * 0.60,
    alignSelf: 'center',
    marginTop: 15,
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  gridRow: {
    flexDirection: 'row',
    flex: 1,
  },
  gridImage: {
    width: (width * 0.60) / 2,
    height: (width * 0.60) / 2,
  },
  playlistInfo: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  playlistTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  playlistSubtitle: {
    fontSize: 15,
    color: '#ff2d55',
    fontWeight: '400',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    gap: 16,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff2d55',
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 12,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(120,120,128,0.16)',
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 12,
  },
  shuffleButtonText: {
    color: '#ff2d55',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  songList: {
    paddingHorizontal: 0,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  separator: {
    height: 0.8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginLeft: 16,
  },
  songArtwork: {
    width: 48,
    height: 48,
    borderRadius: 4,
    marginRight: 12,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 2,
  },
  songArtist: {
    color: 'rgba(235,235,245,0.6)',
    fontSize: 14,
    fontWeight: '400',
  },
  moreButton: {
    padding: 8,
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: '#000',
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 25,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  tabLabel: {
    color: '#8e8e93',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
});
