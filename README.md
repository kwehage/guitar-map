# Guitar Map

Guitar Map is a tool to procedurally generate and display fretboard diagrams for 4–10 string guitars and basses. It is intended to help guitarists familiarize themselves with the fretboard and basic music theory, particularly when using non-standard tunings or more than six strings.

The tool allows you to configure:
* **Tuning**: choose from 27+ named presets spanning 4–8 string bass and guitar configurations — including standard, drop, open, and extended-range tunings (e.g. 7-string B Standard, 8-string Drop E, DADGAD, Mirar) — or select **Custom** to enter each string's pitch individually.
* Tonic (root note) of the first mode of the scale — for example, inputting C as the tonic for the diatonic scale with the Ionian (natural major) mode selected produces a C-Major scale; selecting the Aeolian (natural minor) mode produces a relative A-minor scale.
* Scale (diatonic, harmonic minor, melodic minor, Hungarian minor, pentatonic, blues, augmented, diminished — hover over a mode name for a tooltip listing alternate names)
* Mode of the scale

From those inputs it displays:
* A fretboard diagram with every position labelled — hover over any position to see the note name and frequency in Hz.
* All notes in the scale highlighted with circles; the tonic of the current mode is shown in black.
* All diatonic chord voicings for the scale; click a chord to highlight every matching position on the fretboard.
* **Chord note chips**: when a chord is selected, its notes are displayed as labeled chips. Clicking a tonic alteration chord (Neapolitan, ♭III, iv, ♭VI, ♭VII) shows its notes the same way.
* **Chord transition display**: when a transition or borrowed chord is also selected, a ↓ arrow appears and a second row of chips shows the notes of the target chord, making it easy to see voice-leading between two chords.
* For each chord, common out-of-key transitions: secondary dominant, chromatic mediants (major and minor third up and down).
* Borrowed chord suggestions from parallel modes of the same scale.
* Tonic alteration chords: Neapolitan (♭II), ♭III, minor subdominant (iv), ♭VI, and subtonic (♭VII).
* A **Circle of Fifths** diagram that highlights the active key, shows the relative major/minor relationship, and displays the standard diatonic key signature — treble clef, sharps, and flats — for all twelve keys around the perimeter.

Settings (tuning preset, tonic, scale, mode, and theme) are saved automatically in browser local storage and restored on next launch. Named settings files can be exported and re-imported via **File → Save / Open**.

![fretboard](doc/fretboard.png)

## Using Guitar Map

### Option 1 — Web app (recommended)

Open Guitar Map directly in your browser — no installation required:

**[https://kwehage.github.io/guitar-map/](https://kwehage.github.io/guitar-map/)**

The app runs entirely in the browser. Settings are saved in local storage and persist between sessions.

#### Install as a standalone app (PWA)

Most browsers let you install Guitar Map as a standalone app that launches from your home screen or dock and works offline:

* **Chrome / Edge (desktop)**: click the install icon (⊕) in the address bar, or open the browser menu and choose **Install Guitar Map**.
* **Safari (iPhone / iPad)**: tap the Share button, then **Add to Home Screen**.
* **Chrome (Android)**: tap the browser menu and choose **Add to Home Screen**.

Once installed, the app opens in its own window without browser chrome and caches all assets for offline use.

---

### Option 2 — Electron desktop app

If you prefer a native desktop window without a browser, Guitar Map can also be packaged as an Electron application.

#### Prebuilt binaries

Download the latest release for your platform from **[https://github.com/kwehage/guitar-map/releases](https://github.com/kwehage/guitar-map/releases)**.

##### Linux (AppImage)

```bash
# Download the AppImage (replace x.y.z with the version number)
wget https://github.com/kwehage/guitar-map/releases/download/vx.y.z/guitar-map-x.y.z.AppImage
chmod +x guitar-map-x.y.z.AppImage
./guitar-map-x.y.z.AppImage
```

No installation or root access is required. The AppImage is self-contained and runs on any modern x86-64 Linux distribution.

###### Desktop integration (optional)

To make Guitar Map appear in your application launcher, install the provided desktop entry. The install script places the launcher file and icon under `~/.local/share/` (no root required) and bakes the absolute path to the AppImage into the launcher. If you move the AppImage after installation, re-run the install script to update the path.

```bash
# Clone the repo (only needed for the install script and icon)
git clone https://github.com/kwehage/guitar-map
cd guitar-map

# Pass the path to the AppImage you downloaded
bash linux/install-desktop-entry.sh /path/to/guitar-map-x.y.z.AppImage
```

To uninstall the desktop entry:

```bash
rm ~/.local/share/applications/guitar-map.desktop
rm ~/.local/share/icons/hicolor/256x256/apps/guitar-map.png
update-desktop-database ~/.local/share/applications
```

##### macOS

* Download the `.dmg` from the releases page.
* Double-click the dmg and drag the guitar-map application to your Applications folder.

If macOS reports that the application is damaged and cannot be opened, this is Apple's Gatekeeper quarantine policy for applications distributed outside the App Store. Remove the quarantine attribute from the terminal:

```bash
xattr -rd com.apple.quarantine /Applications/guitar-map.app
xattr -rc /Applications/guitar-map.app
```

See [this guide](https://osxdaily.com/2019/02/13/fix-app-damaged-cant-be-opened-trash-error-mac/) for more detail.

##### Windows

* Download and run the `.exe` installer from the releases page.
* Launch guitar-map from the Start menu or desktop shortcut.

#### Building from source

Requires [Node.js](https://nodejs.org/) (v18+) and, on Linux, `libfuse2`.

```bash
# Install Node.js v22 LTS via NodeSource (Linux)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install libfuse2 (required by the AppImage runtime on Linux)
sudo apt-get install libfuse2

git clone https://github.com/kwehage/guitar-map
cd guitar-map
npm install
npm run prebuild   # copies Plotly.js into dist/
npm run make       # produces the AppImage under out/make/
```

The AppImage will be written to `out/make/appimage/x64/guitar-map-*.AppImage`.

To run without packaging:

```bash
npm run prebuild
npm start          # opens the app in an Electron window
```

## Known limitations

* **Key signatures on the Circle of Fifths** are fixed to the standard diatonic (natural major / natural minor) key signatures for all twelve positions, regardless of the scale selected. For non-diatonic scales such as harmonic minor, melodic minor, or Hungarian minor, the raised or lowered scale degrees are not reflected in the displayed key signatures. Properly annotating these alterations (e.g. showing G♯ as an in-score accidental for A harmonic minor) is planned for a future release.
* **Chord voicing playability**: the chord-finding algorithm uses heuristics to discard obviously unplayable shapes (excessive hand span, large string skips), but the filtering is imperfect. Some displayed voicings may still be difficult or impossible to play, and occasionally playable shapes may be excluded. It is up to the player to judge which highlighted positions form practical chord shapes or arpeggios.
* There is currently no audio playback or MIDI export, but this is planned for a future release.
