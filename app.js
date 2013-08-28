var http = require('http'),
    arDrone = require('ar-drone'),
    droneStream = require('dronestream'),
    io = require('socket.io'),
    colors = require('colors');

/**
 * OculusDrone object
 *
 * @constructor
 */
var oculusDrone = function() {
    var me = this;

    /** @type {Object} Configuration */
    me.settings = {

        /** @type {String} AR.Drone IP */
        droneIpAddress: '192.168.1.1',

        /** @type {Number} Speed of the AR.Drone movement */
        speed: 0.15,

        /** @type {String} Filename which should be served by the HTTP server */
        htmlFile: '/index.html',

        /** @type {Number} Port number which should be used by the HTTP server  */
        httpPort: 8000,

        /** @type {Number} Port number which should be used by the socket connection */
        socketPort: 8080,

        /** @type {Boolean} Truthy to enable the debugging mode */
        debug: true,

        /** @type {Boolean} Truthy to enable the key mapping, otherwise falsy */
        keyMapping: true,

        /** @type {Boolean} Truthy to enable logging of altitude changes */
        logAltitude: false,

        /** @type {Boolean} Truthy to log the battery changes of the drone */
        logBatteryStatus: true,

        /** @type {Number} Battery level (in percentage) where the drone should be landed automatically */
        criticalBatteryLevel: 15,

        /** @type {Number} Battery level (in percentage) where the user will be notified that the battery level is critical */
        warningBatteryLevel: 20,

        /** @type {String} LED animation type. The following values are valid: 'blinkGreenRed', 'blinkGreen', 'blinkRed',
         * 'blinkOrange', 'snakeGreenRed', 'fire', 'standard', 'red', 'green', 'redSnake', 'blank', 'rightMissile',
         * 'leftMissile', 'doubleMissile', 'frontLeftGreenOthersRed', 'frontRightGreenOthersRed', 'rearRightGreenOthersRed',
         * 'rearLeftGreenOthersRed', 'leftGreenRightRed', 'leftRedRightGreen', 'blinkStandard'
         */
        blinkAnimation: 'blinkGreenRed',

        /** @type {Number} LED blinking animation duration in seconds */
        blinkDuration: 2,

        /** @type {Number} LED blinking frequency in hz */
        blinkRate: 5,

        oculusAngle: 0.3
    };

    me.isInAir = false;

    me.init();
};

/**
 * Initializes the oculus drone object.
 *
 * @returns {Void}
 */
oculusDrone.prototype.init = function() {
    var me = this;

    if(me.settings.debug) {
        console.log('[ok]'.green + ' Initializing the Oculus Drone');
    }

    me.httpServer = me.createHTTPServer();
    me.httpServer.listen(me.settings.httpPort);
    me.createDroneStream(me.httpServer);

    me.client = me.createDroneClient();
    me.setUpDroneClient(me.client);

    me.socket = me.createSocketConnection();
    me.setUpSocketEvents(me.socket, me.client);

    if(me.settings.keyMapping) {
        me.bindKeyMapping(me.client);
    }

    // Don't crash AR.Drone on Node.js exceptions
    process.on('uncaughtException', function(err) {
        console.error(err.stack);
        try {
            me.client.stop();
            me.client.land();
        } catch(e) {}
        setTimeout(function() {
            process.exit();
        }, 200);
    })
};

/**
 * Creates the HTTP server which serves the index file to
 * the browser.
 *
 * @returns {Object} Instance of the HTTP Server
 */
oculusDrone.prototype.createHTTPServer = function() {
    var me = this;

    if(me.settings.debug) {
        console.log('[ok]'.green + ' Starting HTTP Server at Port ' + me.settings.httpPort);
    }

    return http.createServer(function(req, res) {
        require('fs').createReadStream(__dirname + me.settings.htmlFile).pipe(res);
    });
};

/**
 * Creates the `node-dronestream` module and bind it
 * to the HTTP server.
 *
 * @param { Object } httpServer - The instance of the HTTP server
 * @returns {Boolean}
 */
oculusDrone.prototype.createDroneStream = function(httpServer) {
    var me = this;

    if(!httpServer) {
        return false;
    }
    droneStream.listen(httpServer);

    if(me.settings.debug) {
        console.log('[ok]'.green + ' Starting DroneStream');
    }

    return true;
};

/**
 * Creates the socket connection using socket.io which are
 * used to get the rotation information from the Oculus Rift VR.
 *
 * @returns {Object} Instance of the socket.io connection
 */
oculusDrone.prototype.createSocketConnection = function() {
    var me = this;

    if(me.settings.debug) {
        console.log('[ok]'.green + ' Starting socket.io connection at Port ' + me.settings.socketPort);
    }

    return io.listen(me.settings.socketPort);
};

/**
 * Sets up the socket.io events which are fired from the browser.
 *
 * @param {Object} socket - Instance of the socket.io connection
 * @param {Object} client - Instance of the AR.Drone client
 * @returns {Boolean} Truthy to indicate that the events are
 *                    set up successfully.
 */
oculusDrone.prototype.setUpSocketEvents = function(socket, client) {
    var me = this,
        opts = me.settings;

    /**
     * Callback method which will be fired when the socket.io
     * connection to the browser was established successfully.
     *
     * @param {Object} browser - Browser socket.io connection
     */
    var onSocketConnected = function(browser) {
        var lastState = null;
        if(opts.debug) {
            console.log('[ok]'.green + ' socket.io connection started successfully at Port ' + opts.socketPort);
        }

        browser.on('rotation', function(event) {
            var y = event[1];

            console.log(event);

            y = Math.floor(y * 100) / 100;

            //turn left
            if (y > opts.oculusAngle && lastState != 'left') {
                lastState = 'left';
                client.counterClockwise(opts.speed);
                console.log('change state to left');
            //turn right
            } else if (y < -opts.oculusAngle && lastState != 'right') {
                console.log('change state to right');
                client.clockwise(opts.speed);
                lastState = 'right';
            //stop
            } else if (y > -opts.oculusAngle && y < opts.oculusAngle && lastState != 'stop') {
                lastState = 'stop';
                client.stop();
                console.log('change state to stop');
            }
        });
    };
    socket.on('connection', onSocketConnected);

    return true;
};

/**
 * Creates an instance of the AR.Drone client.
 *
 * @returns {Object} Instance of the AR.Drone client
 */
oculusDrone.prototype.createDroneClient = function() {
    var me = this;

    if(me.settings.debug) {
        console.log('[ok]'.green + ' Starting AR.Drone client');
    }

    return arDrone.createClient(me.settings.droneIpAddress);
};

/**
 * Sets up the AR.Drone client itself and it's event listeners.
 *
 * @param {Object} client - Instance of the AR.Drone client
 * @returns {Boolean} Truthy to indicate that the set up was successfully.
 */
oculusDrone.prototype.setUpDroneClient = function(client) {
    var me = this,
        opts = me.settings;

    client.config('general:navdata_demo', 'FALSE');
    client.config('control:control_yaw', '6.1');
    client.config('control:euler_angle_max', '0.25');

    // Disable emergency mode if it was triggered on the last fly
    client.disableEmergency();

    // Fire the stop command to the drone before the battery died
    client.stop();

    if(opts.logBatteryStatus) {
        client.on('batteryChange', function(num) {
            if(num <= opts.criticalBatteryLevel) {
                console.log('[critical]'.red + ' Drone will be landed due to the critical battery level');
                client.stop();
                client.land();
            } else {
                if(num <= opts.warningBatteryLevel) {
                    console.log('[warning]'.yellow + ' Battery status: ' + num + '%');
                    console.log('Please land the drone before the battery died');
                } else {
                    console.log('[info]'.cyan + ' Battery status: ' + num + '%');
                }
            }
        });
    }

    if(opts.logAltitude) {
        client.on('altitudeChange', function(event) {
            setInterval(function() {
                console.log('[info]'.cyan + 'Altitude changed to ' + event);
            }, 2000);
        });
    }

    client.on('landing', function(event) {
        me.isInAir = false;
    });

    client.on('flying', function(event) {
        me.isInAir = true;
    });

    return true;
};

/**
 * Sets the Node.js process into raw mode and captures the
 * key events which are fired in the process (e.g. terminal)
 *
 * @param {Object} client - AR.Drone client
 * @returns {Boolean} Truthy to indicate that the key mapping
 *                    was set successfully.
 */
oculusDrone.prototype.bindKeyMapping = function(client) {
    var me = this,
        opts = me.settings;

    process.stdin.setRawMode(true);
    process.stdin.on('data', function(chunk) {
        var key = chunk.toString(),
            keyBuffer = chunk.toJSON();

        if(key === 't') {
            if(opts.debug) {
                console.log('[info]'.cyan + ' Takeoff drone');
            }
            client.disableEmergency();
            client.stop();
            client.takeoff();
            me.isInAir = true;
        } else if(key === 'l') {
            if(opts.debug) {
                console.log('[info]'.cyan + ' Land drone');
            }
            client.land();
            me.isInAir = false;
        } else if(keyBuffer[0] === 32) {
            if(opts.debug) {
                console.log('[info]'.cyan + ' Stop drone movement');
            }
            client.stop();
        } else if(keyBuffer[0] === 27) {
            if(opts.debug) {
                console.log('[info]'.cyan + ' Stop and land drone + kill Node.js process');
            }
            client.stop();
            client.land();
            me.isInAir = false;

            process.exit();
        } else if(key === 'r') {
            if(opts.debug) {
                console.log('[info]'.cyan + ' Recover drone from emergency');
            }
            client.disableEmergency();
        } else if(key === 'b') {
            if(opts.debug) {
                console.log('[info]'.cyan + ' Blinking drone :)');
            }
            client.animateLeds(opts.blinkAnimation, opts.blinkRate, opts.blinkDuration);
        } else if(key === 'a') {
            if(opts.debug) {
                console.log('[info]'.cyan + ' Fly left')
            }
            client.left(opts.speed);
        } else if(key === 'd') {
            if(opts.debug) {
                console.log('[info]'.cyan + ' Fly right')
            }
            client.right(opts.speed);
        } else if(key === 'w') {
            if(opts.debug) {
                console.log('[info]'.cyan + ' Fly forward')
            }
            client.front(opts.speed);
        } else if(key === 's') {
            if(opts.debug) {
                console.log('[info]'.cyan + ' Fly backward')
            }
            client.back(opts.speed);
        } else if(key === '1') {
            if(opts.debug) {
                console.log('[info]'.cyan + ' Fly down');
            }
            client.down(opts.speed);
        } else if(key === '2') {
            if(opts.debug) {
                console.log('[info]'.cyan + ' Fly up');
            }
            client.up(opts.speed);
        } else if(key === 'q') {
            if(opts.debug) {
                console.log('[info]'.cyan + ' Fly counter clockwise');
            }
            client.counterClockwise(opts.speed);
        } else if(key === 'e') {
            if(opts.debug) {
                console.log('[info]'.cyan + ' Fly clockwise');
            }
            client.clockwise(opts.speed);
        }
    });

    // Key binding information
    console.log('[ok]'.green + ' Key mapping started');
    console.log('T - Takeoff drone');
    console.log('L - Land drone');
    console.log('SPACE - Stop whole drone movement');
    console.log('ESC - Stop whole drone movement, land drone and kill the Node.js process');
    console.log('R - Recover from emergency');
    console.log('B - Blinking LEDs');
    console.log('W - Fly forward');
    console.log('S - Fly backward');
    console.log('A - Fly left');
    console.log('D - Fly right');
    console.log('1 - Fly down');
    console.log('2 - Fly up');
    console.log('Q - Turn counter clockwise');
    console.log('E - Turn clockwise');
    console.log("\r");

    return true;
};

// Start a new instance of the oculus drone
new oculusDrone();