# Guitar Map

Guitar Map is a work-in-progress tool to procedurally generate and display fretboard diagrams for 4-10 string guitars and basses. This tool is intended to help guitarists familiarize themselves with the fretboard and basic music theory, especially to help understand how the relative positions between notes and chords changes when you use non-standard tunings or more than six strings. 

The tool allows you to configure:
* The number of strings
* Tuning for each string
* Tonic (root note) of the first mode of the scale: for example, if you input C as the tonic for the diatonic scale, it will create a C-Major scale if the Ionian (natural major) mode is selected. If you select the Aeolian (natural minor) mode, it will generate an A minor scale. 
* Scale (e.g. diatonic scale, harmonic minor, melodic minor, hungarian minor, etc. Hover over the scale name for a tool-tip with alternate names for each scale) 
* Mode of the scale (hover over the mode for a tool-tip with alternate names for each mode)

From those inputs it displays:
* A fretboard diagram with all positions on the fretboard labeled (hover over the fretboard position with your mouse to see the note name and frequency)
* All notes in the scale/mode are shown with circles. The tonic of the mode is shown in black (as described above, the tonic of the current mode selected may differ from the tonic of the first mode for the scale that is used to generate the scale)
* All chord voicings of the scale, click on the chord to display all the fretboard positions that are in the chord.

The below diagram shows a fretboard diagram for an 8-string guitar in drop-E tuning, using the diatonic scale, and Aeolian (natural minor) mode. Therefore the fretboard map is in E-minor. The E-minor chord is highlighted on the fretboard.

![fretboard](doc/fretboard.png)

## Usage
`guitar_map` is a python application that plots a guitar fretboard using the python [dash](https://pypi.org/project/dash/) and [dash-bootstrap-components](https://pypi.org/project/dash-bootstrap-components/) libraries. The python script start a simple webserver at `http://localhost:8050`, and you can visualize and change the settings from your web browser. There are two ways to launch the application. 
* If you are not comfortable using the terminal, the program is also offered as an electron application which starts the webserver and web browser for you and runs self-contained in a stand-alone application. The executable is packaged for a variety of operating systems which you can download at https://github.com/kwehage/guitar-map/releases. 
* If you are comfortable using the terminal, you can start the python server and point your web browser to `http://localhost:8050`. 

### Using prebuilt binaries
Download the pre-built binary for your system at https://github.com/kwehage/guitar-map/releases

#### Linux (Debian-based)
```
wget https://github.com/kwehage/guitar-map/releases/download/v1.0.0/guitar-map_1.0.0_amd64.deb
sudo dpkg -i guitar-map_1.0.0_amd64.deb
```

#### Mac
* Download https://github.com/kwehage/guitar-map/releases/download/v1.0.0/guitar-map-1.0.0-arm64.dmg
* Double-click the dmg, and drag the guitar-map application to your applications folder.

If you get an error that says the application is damaged and can't be opened; the error is due to Apple's security policy. Apple marks applications as quarantined unless they are downloaded through their app store. As a temporary workaround, you can follow the instructions [here](https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unknown-developer-mh40616/mac). Alternatively, you can fix the error permanently by removing the quarantine from the file at the command-line as:

```
xattr -rd com.apple.quarantine /Applications/guitar-map.app
xattr -rc /Applications/guitar-map.app
```

See [this link](https://osxdaily.com/2019/02/13/fix-app-damaged-cant-be-opened-trash-error-mac/) for more information.

#### Windows
* Download and run the installer at https://github.com/kwehage/guitar-map/releases/download/v1.0.0/ guitar-map-1.0.0.Setup.exe 
* Launch the guitar-map application


### Starting from the command-line

#### Install dependencies
This program is built on the python [dash](https://pypi.org/project/dash/) and [dash-bootstrap-components](https://pypi.org/project/dash-bootstrap-components/) libraries. To run the program, install the dependencies natively on your system using pip or your system package manager. For example to install using pip, run:

```
pip install dash dash-bootstrap-components
```

Alternatively, you can install the dependencies in a "virtual environment" to avoid interfering with your system packages.

On Mac/Linux
```
git clone https://github.com/kwehage/guitar-map
cd guitar-map
python -m venv dist/venv
source dist/venv/bin/activate
pip install --upgrade
pip install -r requirements.txt
```

On Windows
```
git clone https://github.com/kwehage/guitar-map
cd guitar-map
python -m venv dist/venv
dist/venv/Scripts/activate
pip install --upgrade
pip install -r requirements.txt
```

#### Get the code
```
git clone https://github.com/kwehage/guitar-map
cd guitar-map
```

#### Run with Python from command-line
To run using your system `dash` and `dash-bootstrap-components` libraries, run:
```
python dist/guitar_map.py
```

To run using the `dash` and `dash-bootstrap-components` libraries in your virtual environment:

On Linux/Mac:
```
dist/venv/bin/python guitar_map.py
```

On Windows:
```
dist/venv/Scripts/python.exe guitar_map.py
```

then point your web browser to `http://127.0.0.1:8050/`


#### Run with Electron from the command-line
Alternatively, you can use Electron to run the standalone application, which launches the python web server and browser in one application. First, download the code as described above. Then ensure that [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) is available on your system. Then run:
```
npm install
npm start
```
