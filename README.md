# Interlude

**Interlude** is an AI audio layer for digital advertising in music streaming. Instead of static ads that break the flow, Interlude creates **Hyper-Personalized Audio Ads** where your favorite artists act as the bridge between songs.

By integrating with platforms like **Spotify** or **Apple Music**, Interlude transforms dead silence into a radio-style experience where artists talk directly to you, making every ad feel like an organic recommendation rather than an interruption.

## Watch the Demo
<div align="center">
  <a href="https://www.youtube.com/watch?v=TeAcs4mMetQ">
    <img src="https://img.youtube.com/vi/TeAcs4mMetQ/maxresdefault.jpg" alt="Interlude Demo Video" width="100%">
  </a>
  <p><i>Click to watch the full product demonstration on YouTube</i></p>
</div>

## Idea"
Traditional ads are detached from the listener's preferences. **Interlude** flips the script by leveraging AI to generate "Smart Intermissions" that are:

- **Artist-Led**: Your favorite artists are the ones speaking. If you're listening to Bad Bunny, it's Benito himself who introduces the next track or tells you about a new product.
- **Hyper-Personalized**: The scripts are generated in real-time using user data (name, city, time of day, listening history) to ensure the message resonates.
- **Context-Aware**: The AI analyzes the mood of the current and upcoming tracks to maintain the perfect energy flow.

For example, when transitioning from a Bad Bunny track to Rauw Alejandro, the AI generates a **simulated conversation** between both artists pitching a product (like Apple Music Premium). To the user, it feels like a behind-the-scenes moment or a personalized shoutout, not a commercial break.

## Tech Stack
The project is built on a client-server architecture:

- **Frontend**:
  - **React Native & Expo**: For cross-platform experience.
  - **Expo-AV**: Audio engine supporting multi-channel playback (background music + AI voiceover).
  - **DJ Fading System**: Simple "ducking" logic that drops background music to 8% volume during voiceovers and recovers it progressively.

- **Backend**:
  - **Node.js & Express**: Orchestration API for real-time resource coordination.
  - **Google Gemini 2.5 Flash**: The AI behind the scripts. It analyzes song metadata, user location, and profile to draft contextual scripts.
  - **ElevenLabs AI**: The vocal engine. It converts Gemini's scripts into ultra-realistic human voices that clone the style and tone of the artists.

## Key Features
- **Ad Personalization**: AI scripts that use the listener's name, location, and metadata to create a 1-to-1 connection.
- **Artist Voice AI**: Realistic voice cloning (via ElevenLabs) that allows artists to "host" their own intermissions.
- **"Collab" Ads**: Unique logic that detects artist pairings (e.g., Bad Bunny x Rauw Alejandro) to trigger back-and-forth dialogue transitions.
- **DJing**: Advanced audio mixing where background music fades to 8% (or even 2% for high-impact moments) during the ad, then swells back up before the next song begins.
- **Smart Analytics**: A visual "Preparing Intermission" badge that creates anticipation for the upcoming content.

## Ethical and Legal Considerations
This project is a **technical and artistic Proof of Concept**. Using AI for voice cloning carries significant responsibilities:

1. **Voice and Image Rights**: The generated voices are simulations for demonstration purposes. In a commercial environment, this would require explicit agreements with rights holders and artists.
2. **Transparency**: The system includes "Powered by Interlude" badges and visual labels to ensure users always know they are hearing AI-generated content.
3. **Responsible Use**: Interlude advocates for a model where AI empowers creators and platforms to better monetize and connect with audiences, not replace human talent.

## Project Structure
```bash
.
├── backend/            # Node.js server, Gemini & ElevenLabs logic
├── frontend/           # React Native App (Expo)
│   ├── assets/         # Local audio assets and cover art
│   ├── data/           # Song database (songs.js)
│   └── screens/        # Screen components (Player, Playlist, etc.)
└── package.json
```

