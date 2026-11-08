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

Click the extension icon to turn enhancement on/off, choose a mode (Auto Enhance adapts to each song in real time), set the effect intensity (up to 150%), and fine-tune with a pro 10-band graphic equalizer (31 Hz–16 kHz, with Flat, V-Shape, Bass, Vocal, Bright and Night presets) plus Stereo width, 3D surround and Volume boost.

**Signal chain (like a broadcast/studio processor)**

LUFS loudness AGC (ITU-R BS.1770 K-weighted, targets −16 LUFS) → subsonic filter → adaptive tone EQ → 10-band graphic EQ → bass enhancer + harmonic exciter → phase-coherent 4-band multiband compressor (Linkwitz-Riley LR4 crossovers at 150 Hz, 800 Hz, 5 kHz with allpass compensation; sums flat within 0.2 dB) → stereo width + 3D surround → output device profile (Headphones with crossfeed, Speakers, Laptop, Car) → volume boost → soft clipper → 5 ms lookahead true-peak limiter (−1 dBTP ceiling).

**Smart mode (default):** analyzes each song live (loudness range, bass weight, vocal presence, brightness), recognizes the style (Cinematic, Bass-heavy, Vocal, Energetic or Balanced) and smoothly blends the matching treatment, the way a mastering engineer adapts to each track.

Cinematic modes: **Cinematic** (wide, immersive soundstage, subtle concert-hall space, dynamics preserved) and **Epic** (adds deep sub-bass for big orchestral hits).

Processor styles: **Gentle** (transparent), **Broadcast** (dense, radio-style), **Club** (maximum punch). The popup shows live IN/OUT/AGC meters and gain reduction for each band and the limiter.

**Headphone correction:** search your exact headphone or earbud model (8,000+ models from the AutoEQ measurement database by oratory1990, crinacle and others) and the extension applies a parametric correction so it sounds neutral and accurate.

**Personal hearing test:** a 2-minute test of each ear (8 frequencies, 250 Hz–8 kHz). The enhancer then gently compensates for the frequencies you hear less well, separately for each ear (up to +10 dB). A listening-comfort tool, not a medical test.

**Equal-loudness compensation (ISO 226):** at low volume, ears lose bass and treble. The enhancer restores them automatically based on the player volume, so quiet listening still sounds full.

**Volume-matched A/B:** when you turn enhancement off, the original plays at the same loudness, so you hear the real difference instead of "louder sounds better".

**Shortcut:** Alt+Shift+E turns enhancement on/off (change it at chrome://extensions/shortcuts).

**Updates:** the popup shows an "Update available" banner when a newer version is on GitHub. For fully automatic updates, publish it to the Chrome Web Store — see [PUBLISH.md](PUBLISH.md).

**Spotify:** not supported. Spotify encrypts its audio (DRM), so browsers and extensions only receive silence. Use Spotify's built-in equalizer (Settings → Playback → Equalizer) or a system-wide equalizer such as Equalizer APO (Windows) or eqMac (Mac).
