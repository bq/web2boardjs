const ELECTRON = require('electron');
const LOG = require('electron-log');
const APP = ELECTRON.app;

const PATHS = {
    arduinoBuilder: 'res/arduino_ide/' + process.platform + '/Arduino.app/Contents/Java/arduino-builder',
    hardware: 'res/arduino_ide/' + process.platform + '/Arduino.app/Contents/Java/hardware',
    tools: 'res/arduino_ide/' + process.platform + '/Arduino.app/Contents/Java/hardware/tools',
    toolsBuilder: 'res/arduino_ide/' + process.platform + '/Arduino.app/Contents/Java/tools-builder',
    builtInLibraries: 'res/arduino_ide/' + process.platform + '/Arduino.app/Contents/Java/libraries',
    arduinoLibraries: 'res/arduino_libs',
    tempInoFile: '/main.ino',
    compilationFolder: '/compilation'
};

const compiler = require('./libs/compiler.js')(PATHS);
const uploader = require('./libs/uploader.js')(PATHS);



LOG.info('starting in platform: ' + process.platform);


let io;

function startSocketServer() {
    if (io) {
        io.close();
    }
    io = require('socket.io')(9876);

    io.on('connection', function (socket) {
        socket.on('message', function (data) {
            LOG.info('message', data);
        });
        socket.on('compile', function (data, callback) {
            compiler.compile(JSON.parse(data), function (err, res) {
                let response;
                if (err) {
                    LOG.info('error in the compile process', err);
                    response = {
                        status: -1,
                        error: err
                    };
                } else {
                    response = {
                        status: 0,
                        hex: res
                    };
                }
                callback(JSON.stringify(response));
            });
        });
        socket.on('upload', function (data, callback) {
            uploader.load(JSON.parse(data), function (err, res) {
                let response;
                if (err) {
                    LOG.info('error in the load process', err);
                    response = {
                        status: -1,
                        error: err
                    };
                } else {
                    response = {
                        status: 0
                    };
                }
                callback(JSON.stringify(response));
            });
        });
        socket.on('disconnect', function (data) {
            LOG.info('disconnect', data);
        });
    });
}

APP.on('start', function () {
    LOG.info('start');
});
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
APP.on('ready', function () {
    LOG.info('ready');
    startSocketServer();
});

// Quit when all windows are closed.
APP.on('window-all-closed', function () {
    LOG.info('window-all-closed');
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        APP.quit();
    }
});

APP.on('activate', function () {
    LOG.info('activate');

});

let tryTimeout;
process.on('uncaughtException', function (error) {
    // Handle the error
    LOG.info('uncaughtException', error);
    if (tryTimeout) {
        clearTimeout(tryTimeout);
    }
    tryTimeout = setTimeout(startSocketServer, 3000);
});
