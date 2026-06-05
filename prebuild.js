const { exec } = require('child_process');
const os = require('os');
const path = require('path');

const isWindows = os.platform() === 'win32';
const buildVenvPath = path.join(__dirname, '.build_venv');
const binDir = isWindows ? 'Scripts' : 'bin';
const pyinstaller = path.join(buildVenvPath, binDir, isWindows ? 'pyinstaller.exe' : 'pyinstaller');
const venvPython = path.join(buildVenvPath, binDir, isWindows ? 'python.exe' : 'python');
const srcScript = path.join(__dirname, 'dist', 'guitar_map.py');
const distPath = path.join(__dirname, 'dist');
const workPath = path.join(__dirname, '.build_work');

const q = (p) => `"${p}"`;

// uv manages the Python 3.13 install automatically — no system Python required.
const command = [
    `uv venv --python 3.13 --clear ${q(buildVenvPath)}`,
    `uv pip install --python ${q(venvPython)} pyinstaller -r ${q(path.join(__dirname, 'requirements.txt'))}`,
    [
        q(pyinstaller),
        '--onefile',
        '--name guitar_map',
        '--collect-all dash',
        '--collect-all dash_bootstrap_components',
        '--collect-all plotly',
        '--collect-data certifi',
        `--distpath ${q(distPath)}`,
        `--workpath ${q(workPath)}`,
        `--specpath ${q(workPath)}`,
        q(srcScript),
    ].join(' '),
].join(' && ');

exec(command, { maxBuffer: 100 * 1024 * 1024 }, (error, stdout, stderr) => {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    if (error) {
        console.error(`PyInstaller build failed: ${error.message}`);
        process.exit(1);
    }
});
