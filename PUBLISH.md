# Publish to the Chrome Web Store (for automatic updates)

Once published, Chrome installs updates automatically. You never download ZIPs again.

## One-time setup
1. Go to https://chrome.google.com/webstore/devconsole and sign in with your Google account.
2. Pay the one-time $5 developer registration fee.

## Publish
1. Click **New item** and upload `release/song-enhancer-webstore.zip` from this repo.
2. Fill in the listing:
   - **Name:** Song Enhancer Hi-Fi
   - **Category:** Entertainment (or Productivity)
   - **Description:** Automatic hi-fi audio processing for YouTube Music and YouTube: LUFS loudness leveling, adaptive EQ, 10-band graphic equalizer, phase-coherent multiband compressor, bass enhancer, exciter, 3D surround, headphone crossfeed and a lookahead true-peak limiter.
   - **Icon:** `extension/icons/128.png`
   - **Screenshot:** open the popup on YouTube Music and take a screenshot (1280×800 works best).
3. **Privacy** tab:
   - Single purpose: "Enhance the audio of YouTube Music and YouTube."
   - `storage` permission: "Saves your sound settings."
   - Host permission (raw.githubusercontent.com): "Checks whether a newer version exists."
   - Data usage: does not collect user data.
4. Click **Submit for review** (usually 1–3 days).

## After it's approved
- Remove the "Load unpacked" copy on `chrome://extensions` and install from your store page instead.
- For each new version: upload the new `release/song-enhancer-webstore.zip` under **Package → Upload new package** and submit. Everyone gets the update automatically.
