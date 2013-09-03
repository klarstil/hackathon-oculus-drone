# hackathon-oculus-drone

Control an AR.Drone using Oculus Rift and VR.js

## Introducing
The project was born during the Shopware Hackathon #2 to demonstrate the combination of the Oculus Rift and an third party peripheral device like the AR.Drone 2.0.

Keep in mind that the project isn't finished yet and under heavy development, so use it on your own risk.

Please see the ```Further features``` section to see what's coming up next.

## Installation

First of all, please make sure you've [VR.js](https://github.com/benvanik/vr.js) up and running in your browser. It's necessary to get the head tracking information from the Oculus Rift.

Install via Github to get the latest version:

```
git clone git@github.com:klarstil/hackathon-oculus-drone.git
```

The next step is to install the project dependencies using:

```
npm install
```

## Usage

Now you've installed the project dependencies, so you can fire up the script using:

```
node app.js
```

The drone can be controlled using the following keyboard mapping:

* T - Takeoff drone
* L - Land drone
* SPACE - Stop the whole movement of the drone
* ESC - Stop the whole movement of the drone, land it and kill the node.js process
* R - Recover from emergency
* W - Fly forward
* S - Fly backward
* A - Fly left
* D - Fly right
* 1 - Fly down
* 2 - Fly up
* Q - Turn counter clockwise
* E - Turn clockwise
* B - Start LED animation

## Configuration / Customization
The module has an configuration in it's constructor which can be easily customized to your needs.

Just head over to the ```app.js``` file and open it up in your favorite editor. Below you can found all the available options, which can be customized to your needs:

#### droneIpAddress (Default: ```192.168.1.1```)
IP address of the AR.Drone

#### speed (Default: ```0.15```)
Speed of the AR.Drone movement. The range of the property is between 0 and 1.

#### htmlFile (Default: ```/index.html```)
Filename which should be served by the HTTP server.

#### httpPort (Default: ```8000```)
Port number which should be used by the HTTP server.

#### socketPort (Default: ```8080```)
Port number which should be used by the socket connection.

#### debug (Default: ```true```)
Truthy to enable the debugging mode.

#### keyMapping (Default: ```true```)
Truthy to enable the key mapping, otherwise falsy.

#### logAltitude (Default: ```false```)
Truthy to enable logging of altitude changes.

#### logBatteryStatus (Default: ```true```)
Truthy to log the battery changes of the drone.

#### criticalBatteryLevel (Default: ```15```)
Battery level (in percentage) where the drone should be landed automatically. The range of the property is between 0 and 100.

#### warningBatteryLevel (Default: ```20```)
Battery level (in percentage) where the user will be notified that the battery level is critical. The range of the property is between 0 and 100.

#### blinkAnimation (Default: ```blinkGreenRed```)
LED animation type. The following values are valid:

* blinkGreenRed
* blinkGreen
* blinkRed
* blinkOrange
* snakeGreenRed
* fire
* standard
* red
* green
* redSnake
* blank
* rightMissile
* leftMissile
* doubleMissile
* frontLeftGreenOthersRed
* frontRightGreenOthersRed
* rearRightGreenOthersRed
* rearLeftGreenOthersRed
* leftGreenRightRed
* leftRedRightGreen
* blinkStandard

#### blinkDuration (Default: ```2```)
LED blinking animation duration in seconds.

#### blinkRate (Default: ```5```)
LED blinking frequency in hz.

#### oculusAngle (Default: ```0.3```)
The minimum angle of the Oculus Rift where the drone start rotating (counter) clockwise.

## Further features
The following features are planned for further development. Feel free to implement them and open up a new pull request to get it merged in the ```master``` branch.

* Output the video stream using [three.js](https://github.com/mrdoob/three.js/) and an Oculus Rift camera renderer to provide a POV flying
* Control the drone using an third party controller like the PS3 or the Xbox 360 controller to get a better control over the drone while using the Oculus Rift on your head. 

## License
The source code is published under BSD, see the `LICENSE` file in the repository.