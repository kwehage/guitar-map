# Guitar Map

Guitar Map is a tool to procedurally generate and display fretboard diagrams for 4–10 string guitars and basses. It is intended to help guitarists familiarise themselves with the fretboard and basic music theory, particularly when using non-standard tunings or more than six strings.

The tool allows you to configure:
* The number of strings
* Tuning for each string
* Tonic (root note) of the first mode of the scale — for example, inputting C as the tonic for the diatonic scale with the Ionian (natural major) mode selected produces a C-Major scale; selecting the Aeolian (natural minor) mode produces a relative A-minor scale.
* Scale (diatonic, harmonic minor, melodic minor, Hungarian minor, pentatonic, blues, augmented, diminished — hover over a mode name for a tooltip listing alternate names)
* Mode of the scale

From those inputs it displays:
* A fretboard diagram with every position labelled — hover over any position to see the note name and frequency in Hz.
* All notes in the scale highlighted with circles; the tonic of the current mode is shown in black.
* All diatonic chord voicings for the scale; click a chord to highlight every matching position on the fretboard.

Settings (string count, tuning, tonic, scale, mode, and theme) are saved automatically to `~/.guitar_map.json` and restored on next launch. Named settings files can be saved and loaded via **File → Save / Open**.

The diagram below shows an 8-string guitar in drop-E tuning, diatonic scale, Aeolian (natural minor) mode — i.e. E-minor — with the E-minor chord highlighted.

![fretboard](doc/fretboard.png)

## Known limitations

* Chord voicings are displayed for all positions across the neck without filtering by playability (hand span, fretting difficulty, or string-skip constraints). It is up to the player to use the highlighted positions to form practical chord shapes or arpeggios.
* There is currently no audio playback or MIDI export, but this is planned for a future release.

## Installation

### Prebuilt binaries (recommended)

Download the latest release for your platform from **[https://github.com/kwehage/guitar-map/releases](https://github.com/kwehage/guitar-map/releases)**.

#### Linux (AppImage)

```bash
# Download the AppImage (replace x.y.z with the version number)
wget https://github.com/kwehage/guitar-map/releases/download/vx.y.z/guitar-map-x.y.z.AppImage
chmod +x guitar-map-x.y.z.AppImage
./guitar-map-x.y.z.AppImage
```

No installation or root access is required. The AppImage is self-contained and runs on any modern x86-64 Linux distribution.

##### Desktop integration (optional)

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

##### Building the AppImage locally

If you prefer to build from source rather than downloading a prebuilt binary, you will need [Node.js](https://nodejs.org/) (v18+), [uv](https://docs.astral.sh/uv/), and `libfuse2` installed.

```bash
# Install Node.js v22 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install uv (used by the prebuild step to create the PyInstaller bundle)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install libfuse2 (required by the AppImage runtime)
sudo apt-get install libfuse2

git clone https://github.com/kwehage/guitar-map
cd guitar-map
npm install
npm run prebuild   # bundles the Python app with PyInstaller
npm run make       # produces the AppImage under out/make/
```

The AppImage will be written to `out/make/appimage/x64/guitar-map-*.AppImage`.

#### macOS

* Download the `.dmg` from the releases page.
* Double-click the dmg and drag the guitar-map application to your Applications folder.

If macOS reports that the application is damaged and cannot be opened, this is Apple's Gatekeeper quarantine policy for applications distributed outside the App Store. Remove the quarantine attribute from the terminal:

```bash
xattr -rd com.apple.quarantine /Applications/guitar-map.app
xattr -rc /Applications/guitar-map.app
```

See [this guide](https://osxdaily.com/2019/02/13/fix-app-damaged-cant-be-opened-trash-error-mac/) for more detail.

#### Windows

* Download and run the `.exe` installer from the releases page.
* Launch guitar-map from the Start menu or desktop shortcut.

### Running from source

`guitar_map` is a Python application built on [Dash](https://pypi.org/project/dash/) and [dash-bootstrap-components](https://pypi.org/project/dash-bootstrap-components/). Running from source starts a local web server at `http://127.0.0.1:8050`; open that URL in any browser to use the application.

[uv](https://docs.astral.sh/uv/) is the recommended way to manage the Python environment, as it pins Python 3.13 automatically without requiring a matching system Python.

#### Install uv

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

#### Clone and run

```bash
git clone https://github.com/kwehage/guitar-map
cd guitar-map
uv venv --python 3.13 .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python dist/guitar_map.py   # Windows: .venv\Scripts\python.exe dist\guitar_map.py
```

Then open `http://127.0.0.1:8050` in your browser.
