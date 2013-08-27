var http = require('http'),
    arDrone = require('ar-drone'),
    droneStream = require('dronestream'),
    io = require('socket.io');

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

        /** @type {Boolean} Truthy to log the battery changes of the drone */
        logBatteryStatus: true,

        /** @type {Number} Battery level (in percentage) where the drone should be landed automatically */
        criticalBatteryLevel: 15,

        /** @type {Number} Battery level (in percentage) where the user will be notified that the battery level is critical */
        warningBatteryLevel: 20
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
        console.log('Initializing the Oculus Drone');
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
        console.log('Starting HTTP Server at Port ' + me.settings.httpPort);
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
        console.log('Starting DroneStream');
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
        console.log('Starting socket.io connection at Port ' + me.settings.socketPort);
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

        if(me.settings.debug) {
            console.log('socket.io connection started successfully at Port ' + opts.socketPort);
        }

        browser.on('rotation', function(event) {
            var y = event[1];

            if(Math.abs(y) < 0.45) {
                client.stop();
            } else {
                if(y < 0) {
                    client.clockwise(opts.speed);
                } else {
                    client.counterClockwise(opts.speed);
                }
            }
            console.log(event);
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
        console.log('Starting AR.Drone client');
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

    // Disable emergency mode if it was triggered on the last fly
    client.disableEmergency();

    // Fire the stop command to the drone before the battery died
    client.stop();

    if(opts.logBatteryStatus) {
        client.on('batteryChange', function(num) {
            if(num <= opts.criticalBatteryLevel) {
                console.log('Drone will be landed due to the critical battery level');
                client.stop();
                client.land();
            } else {
                if(num <= opts.warningBatteryLevel) {
                    console.log('Battery status: ' + num + '%');
                    console.log('Please land the drone before the battery died');
                } else {
                    console.log('Battery status: ' + num + '%');
                }
            }
        });
    }

    client.on('landing', function(event) {
        console.log(event);
        me.isInAir = false;
    });

    client.on('flying', function(event) {
        console.log(event);
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
        var key = chunk.toString();

        console.log('Key pressed:', key);

        if(key === 't') {
            if(opts.debug) {
                console.log('Takeoff drone');
            }
            client.takeoff();
            me.isInAir = true;
        } else if(key === 'l') {
            if(opts.debug) {
                console.log('Land drone');
            }
            client.land();
            me.isInAir = false;
        } else if(key === 's') {
            if(opts.debug) {
                console.log('Stop drone movement');
            }
            client.stop();
        } else if(key === 'q') {
            if(opts.debug) {
                console.log('Stop and land drone + kill Node.js process');
            }
            client.stop();
            client.land();
            me.isInAir = false;

            process.exit();
        } else if(key === 'r') {
            if(opts.debug) {
                console.log('Recover drone from emergency');
            }
            client.disableEmergency();
        }
    });

    if(me.settings.debug) {
        // Key binding information
        console.log('Key mapping started');
        console.log('T - Takeoff drone');
        console.log('L - Land drone');
        console.log('S - Stop whole drone movement');
        console.log('Q - Stop whole drone movement, land drone and kill the Node.js process');
        console.log('R - Recover from emergency');
    }

    return true;
};

// Start a new instance of the oculus drone
new oculusDrone();