# Song Enhancer

A browser-based song enhancement tool. Load a song and **Auto Enhance (Hi-Fi)** analyzes it (tonal balance, dynamics, stereo image, loudness) and enhances it automatically, like a high-end audio processor. Open `index.html` in any modern browser — no install needed. Audio never leaves your computer.

- Load any audio file your browser can play (MP3, WAV, OGG, M4A…)
- Harmonic exciter for detail, subsonic rumble filter, 4-band EQ (bass, low-mid, presence, air), compression, stereo width, reverb, output gain, safety limiter
- Presets: Balanced Master, Bass Boost, Vocal Clarity, Warm Vintage, Loud & Punchy, Concert Hall
- Real-time preview, A/B against the original, spectrum visualizer
- Auto-normalize and export the enhanced track as WAV

## Browser extension: YouTube Music & YouTube

The `extension/` folder is a Chrome/Edge extension that enhances YouTube Music (and YouTube) **live, automatically**.

**Install**
1. Download this repo (green **Code** button → **Download ZIP**) and unzip it.
2. Open `chrome://extensions` (or `edge://extensions`) and turn on **Developer mode**.
3. Click **Load unpacked** and select the `extension` folder.
4. Reload any open YouTube Music tab and press play.

Click the extension icon to turn enhancement on/off, choose a mode (Auto Enhance adapts to each song in real time), set the effect intensity (up to 150%), and fine-tune with your own Bass, Vocals, Treble, Stereo width, 3D surround and Volume boost sliders.

**Spotify:** not supported. Spotify encrypts its audio (DRM), so browsers and extensions only receive silence. Use Spotify's built-in equalizer (Settings → Playback → Equalizer) or a system-wide equalizer such as Equalizer APO (Windows) or eqMac (Mac).
