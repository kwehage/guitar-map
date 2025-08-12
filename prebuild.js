const { exec } = require('child_process');
const os = require('os');
const path = require('path');

const venvPath = path.join(__dirname, '.venv');

const command = os.platform() === 'win32'
    ? `python -m venv ${venvPath} && ${venvPath}\\Scripts\\pip install --upgrade pip && ${venvPath}\\Scripts\\pip install -r requirements.txt`
    : `python3 -m venv ${venvPath} && ${venvPath}/bin/pip install --upgrade pip && ${venvPath}/bin/pip install -r requirements.txt`;

// Execute the command
exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error creating virtual environment: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
});
