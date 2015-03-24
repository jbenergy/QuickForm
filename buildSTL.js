//Dependencies
var fs = require('fs'),
    stl = require('stl'),
    exec = require('child_process').exec;
//Export Function
module.exports.buildSTL = buildSTL;

//Ececuting Functions
function execRuby(fileName, arguments, callback) {
    if (typeof(arguments) == "object") arguments = JSON.stringify(arguments);
    exec("ruby " + fileName + " '" + arguments + "'", callback);
};

function execEnergyPlus(idfFile, weather, callback) {
    exec('runenergyplus ' + idfFile + " " + weather, callback) //Callback is (err, stdout, stderr) of exec file
}

//Average Function
function average(pt1, pt2) {
        return (pt1 + pt2) / 2;
    }
    //Latitude and Longitude to Cartesian
Number.prototype.toRadians = function() {
    return this * Math.PI / 180;
};
Number.prototype.toDegrees = function() {
    return this * 180 / Math.PI;
};

//Round to two decimal places
Number.prototype.round2 = function() {
    var up = this * 100 | 0;
    return up / 100;
}

//Prototype to find side length of array of points
Array.prototype.findLengths = function() {
    var sideLengths = [];
    for (var i = 1; i < this.length; i++) {
        var d = distanceFormula(this[i - 1][0], this[i - 1][1], this[i][0], this[i][1]);
        sideLengths.push(Math.round(d * 100) / 100);
    }
    var d = distanceFormula(this[this.length - 1][0], this[this.length - 1][1], this[0][0], this[0][1]);
    sideLengths.push(d);
    return sideLengths;
}

function distanceFormula(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow((x2 - x1), 2) + Math.pow((y2 - y1), 2));
}

function polygonArea(X, Y, numPoints) {
    area = 0; // Accumulates area in the loop
    j = numPoints - 1; // The last vertex is the 'previous' one to the first

    for (i = 0; i < numPoints; i++) {
        area = area + (X[j] + X[i]) * (Y[j] - Y[i]);
        j = i; //j is previous vertex to i
    }
    return area / 2;
}

//Create Lat/Lng object
function latLon(lat, lng) {
        this.latitude = Number(lat);
        this.longitude = Number(lng);
    }
    //Latitude and Longitude to X,Y Coord
latLon.prototype.coordinatesTo = function(point) {
    var radius = 6371;
    var phi1 = this.latitude.toRadians(),
        lambda1 = this.longitude.toRadians(),
        phi2 = point.latitude.toRadians(),
        lambda2 = point.longitude.toRadians();
    var deltaPhi = phi2 - phi1,
        deltaLambda = lambda2 - lambda1;

    var a = Math.pow(Math.sin(deltaPhi / 2), 2) + Math.cos(phi1) * Math.cos(phi2) * Math.pow(Math.sin(deltaLambda / 2), 2);

    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = radius * c * 1000;

    var x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda),
        y = Math.sin(deltaLambda) * Math.cos(phi2);
    var theta = Math.atan2(y, x);
    var X = d * Math.sin(theta),
        Y = d * Math.cos(theta);
    return [X, Y];
}

//Coordinates from Basic Lat/lng point to Lat/Lng
latLon.prototype.destinationPoint = function(X, Y) {
    var radius = 6371;
    var brng = Math.atan(X / Y),
        dist = Math.sqrt(Math.pow(X, 2) + Math.pow(Y, 2));
    var theta = Number(brng).toRadians();
    var delta = Number(dist) / radius; // angular distance in radians

    var phi1 = this.latitude.toRadians();
    var lambda1 = this.longitude.toRadians();

    var phi2 = Math.asin(Math.sin(phi1) * Math.cos(delta) +
        Math.cos(phi1) * Math.sin(delta) * Math.cos(theta));
    var lambda2 = lambda1 + Math.atan2(Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
        Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2));
    lambda2 = (lambda2 + 3 * Math.PI) % (2 * Math.PI) - Math.PI; // normalise to -180..+180º

    return new latLon(phi2.toDegrees(), lambda2.toDegrees());
}

function minMaxPoints(buildingPoints) {
    var minX, minY, maxX, maxY,
        xPts = [],
        yPts = [];
    buildingPoints.forEach(function(pt) {
        xPts.push(pt[0]);
        yPts.push(pt[1]);
    });
    minX = Math.min.apply(null, xPts);
    maxX = Math.max.apply(null, xPts);
    minY = Math.min.apply(null, yPts);
    maxY = Math.max.apply(null, yPts);
    return [minX, maxX, minY, maxY];
}

//Adjust Rectangle
function rotatePoint(startPoint, point, theta) {
    var rotatedPoint, x1, y1;
    var x0 = startPoint[0],
        y0 = startPoint[1],
        x = point[0],
        y = point[1];
    x1 = x0 + (x - x0) * Math.cos(theta) + (y - y0) * Math.sin(theta);
    y1 = y0 - (x - x0) * Math.sin(theta) + (y - y0) * Math.cos(theta);
    rotatedPoint = [x1, y1];
    return rotatedPoint;
}

function findRotation(pt1, pt2) {
    var deltaX, deltaY, theta;
    deltaX = pt2[0] - pt1[0];
    deltaY = pt2[1] - pt1[1];
    theta = Math.atan2(deltaY, deltaX);
    return theta
}

//STL Format Creation

function createVertPlane(pt1, pt2, z1, z2, material) {
    var tri1, tri2, facets;
    tri1 = [
        [pt1[0], pt1[1], z1],
        [pt2[0], pt2[1], z2],
        [pt2[0], pt2[1], z1]

    ];
    tri2 = [
        [pt1[0], pt1[1], z1],
        [pt1[0], pt1[1], z2],
        [pt2[0], pt2[1], z2]
    ];
    facets = [{
        verts: tri1
    }, {
        verts: tri2
    }];
    return facets;
}

function createHorPlaneUp(pt1, pt2, pt3, pt4, z) {
    var tri1 = [
            [pt1[0], pt1[1], z],
            [pt3[0], pt3[1], z],
            [pt2[0], pt2[1], z]
        ],
        tri2 = [
            [pt1[0], pt1[1], z],
            [pt4[0], pt4[1], z],
            [pt3[0], pt3[1], z]
        ],
        facets = [{
            verts: tri1
        }, {
            verts: tri2
        }];
    return facets;
}

function createHorPlaneDn(pt1, pt2, pt3, pt4, z) {
    var tri1 = [
            [pt2[0], pt2[1], z],
            [pt3[0], pt3[1], z],
            [pt1[0], pt1[1], z]
        ],
        tri2 = [
            [pt3[0], pt3[1], z],
            [pt4[0], pt4[1], z],
            [pt1[0], pt1[1], z]
        ],
        facets = [{
            verts: tri1
        }, {
            verts: tri2
        }];
    return facets;
}

function createRoofFloor(buildingName, pt0, pt1, pt3, gridSize, height, roofMaterial, floorMaterial) {
    var l0, l3, gridLength0, deltaX0, deltaY0, xIt0, yIt0, iterator0, deltaX3, deltaY3, xIt3, yIt3, iterator3, gridLength3, theta0, theta3, triFloor, triRoof, facets = [];
    var stlString = '';
    //Lengths of Square
    l0 = distanceFormula(pt0[0], pt0[1], pt1[0], pt1[1]);
    l3 = distanceFormula(pt0[0], pt0[1], pt3[0], pt3[1]);
    //GridLength & Iterators for Side 0
    gridLength0 = ((l0 % gridSize) / (parseInt(l0 / gridSize))) + gridSize;
    if ((gridSize * 2) > l0) {
        gridLength0 = l0 / 2;
        gridSize = gridLength0;
    }
    deltaX0 = pt1[0] - pt0[0];
    deltaY0 = pt1[1] - pt0[1];
    xIt0 = deltaX0 / parseInt(l0 / gridSize);
    yIt0 = deltaY0 / parseInt(l0 / gridSize);
    iterator0 = parseInt(l0 / gridSize);
    //Infinity Check
    if (!isFinite(xIt0)) xIt0 = 0;
    if (!isFinite(yIt0)) yIt0 = 0;
    if (!isFinite(gridLength0)) gridLength0 = l0;
    //0 Check
    if (xIt0 == 0 && yIt0 == 0) {
        xIt0 = deltaX0;
        yIt0 = deltaY0;
        iterator0 = 1;
    };
    //GridLength & Iterators for Side 3
    gridLength3 = ((l3 % gridSize) / (parseInt(l3 / gridSize))) + gridSize;
    if ((gridSize * 2) > l3) {
        gridLength3 = l3 / 2;
        gridSize = gridLength3;
    }
    deltaX3 = pt0[0] - pt3[0];
    deltaY3 = pt0[1] - pt3[1];
    xIt3 = deltaX3 / parseInt(l3 / gridSize);
    yIt3 = deltaY3 / parseInt(l3 / gridSize);
    iterator3 = parseInt(l3 / gridSize);

    //Infinity Check
    if (!isFinite(xIt3)) xIt3 = 0;
    if (!isFinite(yIt3)) yIt3 = 0;
    if (!isFinite(gridLength3)) gridLength3 = l3;
    //0 Check
    if (xIt3 == 0 && yIt3 == 0) {
        xIt3 = deltaX3;
        yIt3 = deltaY3;
        iterator3 = 1;
    };
    //Rotation
    theta0 = findRotation(pt0, pt1);
    theta3 = findRotation(pt0, pt3);
    //Loop Along side 3
    for (var j = 0; j < iterator3; j++) {
        var point0, point3;
        point0 = [pt0[0] + (gridLength3 * j * Math.cos(theta3)), pt0[1] + (gridLength3 * j * Math.sin(theta3))];
        point3 = [pt0[0] + (gridLength3 * (j + 1) * Math.cos(theta3)), pt0[1] + (gridLength3 * (j + 1) * Math.sin(theta3))];
        //Loop Along side 0
        for (var i = 0; i < iterator0; i++) {
            var point0_1, point3_1, point1, point2;
            point0_1 = [point0[0] + (gridLength0 * i * Math.cos(theta0)), point0[1] + (gridLength0 * i * Math.sin(theta0))];
            point1 = [point0[0] + (gridLength0 * (i + 1) * Math.cos(theta0)), point0[1] + (gridLength0 * (i + 1) * Math.sin(theta0))];
            point2 = [point3[0] + (gridLength0 * (i + 1) * Math.cos(theta0)), point3[1] + (gridLength0 * (i + 1) * Math.sin(theta0))];
            point3_1 = [point3[0] + (gridLength0 * i * Math.cos(theta0)), point3[1] + (gridLength0 * i * Math.sin(theta0))];
            //Roof
            triRoof = createHorPlaneUp(point0_1, point1, point2, point3_1, height);
            /*facets.push(triRoof[0]);
            facets.push(triRoof[1]);*/
            //Floor -- Disabled for the time
            triFloor = createHorPlaneDn(point0_1, point1, point2, point3_1, 0);
            //facets.push(triFloor[0]);
            //facets.push(triFloor[1]);
            var stlObj = {
                description: buildingName + ':' + 'roof' + ':' + roofMaterial + ':' + i + ':' + j + ':0',
                facets: triRoof[0]
            };
            stlString += stl.fromObject(stlObj) + "\n";
            var stlObj = {
                description: buildingName + ':' + 'roof' + ':' + roofMaterial + ':' + i + ':' + j + ':1',
                facets: triRoof[1]
            };
            stlString += stl.fromObject(stlObj) + "\n";
            /*var stlObj = {
                description: buildingName + ':' + 'floor' + ':' + floorMaterial + ':' + i + ':' + j + ':0',
                facets: triFloor[0]
            };
            stlString += stl.fromObject(stlObj) + "\n";
            var stlObj = {
                description: buildingName + ':' + 'floor' + ':' + floorMaterial + ':' + i + ':' + j + ':1',
                facets: triFloor[1]
            };
            stlString += stl.fromObject(stlObj) + "\n";*/

        }
    }
    return stlString;
}

function createWallMaterial(buildingName, faceNum, point1, point2, gridSize, height, floorHeight, floors, windowWallRatio, wallMaterial, windowMaterial) {
    var sideLength, deltaX, deltaY, gridLength, xIt, yIt, iterator, zIterator, pt1, pt2, i, z, zGrid, zIt, tri, tri1, tri2, facets, z0, z1, wH, w0, w1, w0Floor, w1Floor;
    var stlString = '';
    //Window Dimensions
    wH = windowWallRatio * floorHeight;
    w0 = (floorHeight - wH) / 2;
    w1 = w0 + wH;
    //Create Facets
    facets = [];
    //Find the Length of the side, and the x and y iterations to creat the grid
    sideLength = distanceFormula(point1[0], point1[1], point2[0], point2[1]);
    gridLength = ((sideLength % gridSize) / (parseInt(sideLength / gridSize))) + gridSize;
    if ((gridSize * 2) > sideLength) {
        gridLength = sideLength / 2;
        gridSize = gridLength;
    }
    deltaX = point2[0] - point1[0];
    deltaY = point2[1] - point1[1];
    xIt = deltaX / parseInt(sideLength / gridSize);
    yIt = deltaY / parseInt(sideLength / gridSize);
    iterator = parseInt(sideLength / gridSize);
    //Infinity Check
    if (!isFinite(xIt)) xIt = 0;
    if (!isFinite(yIt)) yIt = 0;
    if (!isFinite(gridLength)) gridLength = sideLength;
    //0 Check
    if (xIt == 0 && yIt == 0) {
        xIt = deltaX;
        yIt = deltaY;
        iterator = 1;
    };
    //console.log("SideLength : " + sideLength + "  GridLength: " + gridLength + "  iterator: " + iterator);
    //console.log("xIt: " + xIt + "  yIT: " + yIt);
    //Iterate Through Floors
    for (var t = 0; t < floors; t++) {
        //Floor Height
        z0 = t * floorHeight;
        z1 = z0 + floorHeight;
        //Window Height
        w0Floor = w0 + (t * floorHeight);
        w1Floor = w1 + (t * floorHeight);
        //Iterate Along wall
        for (i = 0; i < iterator; i++) {
            //Ground Points
            pt1 = [point1[0] + (xIt * i), point1[1] + (yIt * i)];
            pt2 = [point1[0] + (xIt * (i + 1)), point1[1] + (yIt * (i + 1))];
            //Create Plans for bottom wall, window, and top wall
            tri = createVertPlane(pt1, pt2, z0, w0Floor, wallMaterial);
            tri2 = createVertPlane(pt1, pt2, w0Floor, w1Floor, windowMaterial);
            tri1 = createVertPlane(pt1, pt2, w1Floor, z1, wallMaterial);
            //Push planes to stlObj

            var stlObj = {
                description: buildingName + ':' + faceNum + ':' + wallMaterial + ':' + i + ':' + (t * 3) + ':0',
                facets: tri[0]
            };
            stlString += stl.fromObject(stlObj) + "\n";
            var stlObj = {
                description: buildingName + ':' + faceNum + ':' + wallMaterial + ':' + i + ':' + (t * 3) + ':1',
                facets: tri[1]
            };
            stlString += stl.fromObject(stlObj) + "\n";
            var stlObj = {
                description: buildingName + ':' + faceNum + ':' + wallMaterial + ':' + i + ':' + (t * 3 + 1) + ':0',
                facets: tri2[0]
            };
            stlString += stl.fromObject(stlObj) + "\n";
            var stlObj = {
                description: buildingName + ':' + faceNum + ':' + wallMaterial + ':' + i + ':' + (t * 3 + 1) + ':1',
                facets: tri2[1]
            };
            stlString += stl.fromObject(stlObj) + "\n";
            var stlObj = {
                description: buildingName + ':' + faceNum + ':' + wallMaterial + ':' + i + ':' + (t * 3 + 2) + ':0',
                facets: tri1[0]
            };
            stlString += stl.fromObject(stlObj) + "\n";
            var stlObj = {
                description: buildingName + ':' + faceNum + ':' + wallMaterial + ':' + i + ':' + (t * 3 + 2) + ':1',
                facets: tri1[1]
            };
            stlString += stl.fromObject(stlObj) + "\n";
        };
    };
    return stlString;
}



function createGroundGrid(face, groundMaterial, xMin, xMax, yMin, yMax, step) {
    var xpt, ypt, pt1, pt2, pt3, pt4, tri, facets = [];
    var stlString = '';
    for (xpt = xMin; xpt < xMax; xpt += step) {
        for (ypt = yMax; ypt > yMin; ypt -= step) {
            pt1 = [xpt, ypt];
            pt2 = [xpt + step, ypt];
            pt3 = [xpt + step, ypt - step];
            pt4 = [xpt, ypt - step];
            tri = createHorPlaneUp(pt1, pt2, pt3, pt4, 0, "grass");
            facets.push(tri[0]);
            facets.push(tri[1]);
            var stlObj = {
                description: 'Ground' + ':' + face + ':' + groundMaterial + ':' + xpt + ':' + ypt + ':0',
                facets: tri[0]
            };
            stlString += stl.fromObject(stlObj) + "\n";
            var stlObj = {
                description: 'Ground' + ':' + face + ':' + groundMaterial + ':' + xpt + ':' + ypt + ':1',
                facets: tri[1]
            };
            stlString += stl.fromObject(stlObj) + "\n";
        }
    }
    return stlString;
}


function createGround(innerBounds, maxHeight, gridSize) {
    var boundDistances = [],
        gridSizes = [],
        smallGridBound = [],
        mediumGridBound = [],
        largeGridBound = [],
        xpt,
        ypt,
        pt1,
        pt2,
        pt3,
        pt4,
        tri,
        facets = [];
    var innerGridSize = 5;
    console.log(innerBounds);
    var stlString = '';
    //Inner Grid Dimensions
    var innerBoundsLengths = innerBounds.findLengths();
    //console.log(innerBoundsLengths);
    var xPrime = gridSize * Math.ceil((maxHeight * 5) / gridSize);
    console.log(xPrime);
    var yPrime1 = gridSize * Math.ceil((maxHeight * 5) / gridSize);
    var yPrime2 = gridSize * Math.ceil((maxHeight * 5) / gridSize);
    console.log(yPrime2);
    //Left
    stlString += createGroundGrid('left', 'grass', innerBounds[0][0] - xPrime, innerBounds[0][0], innerBounds[3][1], innerBounds[0][1] + yPrime1, gridSize);
    //Inner Grid
    stlString += createGroundGrid('innerGrid', 'grass', innerBounds[0][0], innerBounds[1][0], innerBounds[3][1], innerBounds[0][1], innerGridSize);
    //Windward Top
    stlString += createGroundGrid('top', 'grass', innerBounds[0][0], innerBounds[1][0], innerBounds[0][1], innerBounds[0][1] + xPrime, gridSize);
    //Right
    stlString += createGroundGrid('right', 'grass', innerBounds[2][0], innerBounds[2][0] + xPrime, innerBounds[2][1], innerBounds[1][1] + xPrime, gridSize);
    //LeeWardBottom
    stlString += createGroundGrid('bottom', 'grass', innerBounds[3][0] - xPrime, innerBounds[2][0] + xPrime, innerBounds[3][1] - yPrime2, innerBounds[3][1], gridSize);
    return stlString;
}

//Final Function
function buildSTL(buildings, windwardDirection) {
    //Initialize Variables
    var lat = 0,
        lng = 0,
        pathCount = 0,
        centerLat = 0,
        centerLng = 0,
        origin = 0,
        allBldgSTL = '',
        minXPts = [],
        maxXPts = [],
        minYPts = [],
        maxYPts = [],
        minX,
        maxX,
        minY,
        maxY,
        maxHeight,
        innerBounds = [],
        groundFacets = [],
        groundSTL,
        fileName = '',
        bldgHeights = [];

    //Set Grid Size
    var gridSize = 10;
    //Find Center of Latitude and Longitude Points
    for (var i = 0; i < buildings.length; i++) {
        for (var j = 0; j < buildings[i].polygon.path.length; j++) {
            lat += buildings[i].polygon.path[j].latitude;
            lng += buildings[i].polygon.path[j].longitude;
            pathCount++;
        }
    }
    centerLat = lat / pathCount;
    centerLng = lng / pathCount;
    //Make Center Latitude and Longitude the Origin Point for LatLng
    origin = new latLon(centerLat, centerLng);
    //Go through Each Building

    for (var i = 0; i < buildings.length; i++) {
        var bldg = buildings[i];
        //Initialize Variables
        var points = [],
            averageSideLengths = [],
            adjustedPoints = [],
            adjustedLatLng = [],
            lengths = [],
            length,
            width,
            theta,
            facets = [],
            minMaxPts = [];
        var CFDFacets = [];
        //Add Building Name to File Name
        fileName += bldg.name + "_";
        //Set Grid Size
        //Get Cartesian Points from LatLng
        for (var j = 0; j < bldg.polygon.path.length; j++) {
            var point = origin.coordinatesTo(new latLon(bldg.polygon.path[j].latitude, bldg.polygon.path[j].longitude));
            points.push([point[0].round2(), point[1].round2()]);
        }
        //Average and Adjust the Rectangle
        lengths = points.findLengths();
        //Find Rotation of the Building Shape
        theta = findRotation(points[0], points[1]);
        console.log("ID:  " + bldg.id);
        console.log("theta: " + theta);
        console.log(bldg.windowWallRatio);

        switch (bldg.bldgFootprint) {
            case 'rect':
                var l0 = (lengths[0] + lengths[2]) / 2,
                    l1 = (lengths[1] + lengths[3]) / 2,
                    pt0 = [points[0][0], points[0][1]],
                    pt1 = [pt0[0] + (l0 * Math.cos(theta)), pt0[1] + l0 * Math.sin(theta)],
                    pt2 = [pt1[0] + l1 * Math.cos(theta - Math.PI / 2), pt1[1] + l1 * Math.sin(theta - Math.PI / 2)],
                    pt3 = [pt2[0] + l0 * -Math.cos(theta), pt2[1] + l0 * -Math.sin(theta)];

                var orthRect = [pt0, pt1, pt2, pt3];
                var rotatedRect = [];
                for (var j = 0; j < orthRect.length; j++) {
                    rotatedRect.push(rotatePoint([0, 0], orthRect[j], windwardDirection));
                };
                bldg.cardinalCoords = orthRect;
                bldg.windwardCoords = rotatedRect;

                //Create Grids for Radiance STL Creation
                //Walls
                for (var j = 1; j < rotatedRect.length; j++) {
                    allBldgSTL += createWallMaterial(bldg.name, j - 1, rotatedRect[j - 1], rotatedRect[j], gridSize, bldg.height, bldg.flrToFlrHeight, bldg.numFloors, bldg.windowWallRatio, "brick", "glass")
                }
                allBldgSTL += createWallMaterial(bldg.name, rotatedRect.length - 1, rotatedRect[rotatedRect.length - 1], rotatedRect[0], gridSize, bldg.height, bldg.flrToFlrHeight, bldg.numFloors, bldg.windowWallRatio, "brick", "glass")

                //Roof and Floor
                allBldgSTL += createRoofFloor(bldg.name, rotatedRect[0], rotatedRect[1], rotatedRect[3], gridSize, bldg.height, "asphalt", "concrete")
                break;
            case 'l':
                //Average 1 & 3+5
                var l4 = (lengths[4] + (lengths[0] + lengths[2])) / 2,
                    l0 = l4 * (lengths[0] / (lengths[0] + lengths[2])),
                    l2 = l4 * (lengths[2] / (lengths[0] + lengths[2]));
                //Average 6 & 2+4
                var l5 = (lengths[5] + (lengths[1] + lengths[3])) / 2;
                var l3 = l5 * (lengths[3] / (lengths[1] + lengths[3])),
                    l1 = l5 * (lengths[1] / (lengths[1] + lengths[3]));

                var pt0 = [points[0][0], points[0][1]],
                    pt1 = [pt0[0] + (l0 * Math.cos(theta)), pt0[1] + l0 * Math.sin(theta)],
                    pt2 = [pt1[0] + l1 * Math.cos(theta - Math.PI / 2), pt1[1] + l1 * Math.sin(theta - Math.PI / 2)],
                    pt3 = [pt2[0] + (l2 * Math.cos(theta)), pt2[1] + l2 * Math.sin(theta)],
                    pt4 = [pt3[0] + l3 * Math.cos(theta - Math.PI / 2), pt3[1] + l3 * Math.sin(theta - Math.PI / 2)],
                    pt5 = [pt4[0] + l4 * -Math.cos(theta), pt4[1] + l4 * -Math.sin(theta)];

                var orthL = [pt0, pt1, pt2, pt3, pt4, pt5];
                var rotatedL = [];
                for (var j = 0; j < orthL.length; j++) {
                    rotatedL.push(rotatePoint([0, 0], orthL[j], windwardDirection));
                };
                bldg.cardinalCoords = orthL;
                bldg.windwardCoords = rotatedL;

                //Add Walls
                for (var j = 1; j < rotatedL.length; j++) {
                    allBldgSTL += createWallMaterial(bldg.name, j - 1, rotatedL[j - 1], rotatedL[j], gridSize, bldg.height, bldg.flrToFlrHeight, bldg.numFloors, bldg.windowWallRatio, "brick", "glass")
                }
                allBldgSTL += createWallMaterial(bldg.name, rotatedL.length - 1, rotatedL[rotatedL.length - 1], rotatedL[0], gridSize, bldg.height, bldg.flrToFlrHeight, bldg.numFloors, bldg.windowWallRatio, "brick", "glass")

                //Roof and Floor
                var dx = (rotatedL[5][0] - rotatedL[0][0]) / l5,
                    dy = (rotatedL[5][1] - rotatedL[0][1]) / l5,
                    pt7 = [(dx * l1) + rotatedL[0][0], (dy * l1) + rotatedL[0][1]];

                allBldgSTL += createRoofFloor(bldg.name, rotatedL[0], rotatedL[1], pt7, gridSize, bldg.height, "asphalt", "concrete")
                allBldgSTL += createRoofFloor(bldg.name, pt7, rotatedL[3], rotatedL[5], gridSize, bldg.height, "asphalt", "concrete")

                break;
            case "t":
                var l0 = (lengths[0] + (lengths[2] + lengths[4] + lengths[6])) / 2,
                    l1 = (lengths[1] + lengths[1]) / 2,
                    l2 = l0 * (lengths[2] / (lengths[2] + lengths[4] + lengths[6])),
                    l3 = (lengths[3] + lengths[5]) / 2,
                    l4 = l0 * (lengths[4] / (lengths[2] + lengths[4] + lengths[6])),
                    l5 = l3,
                    l6 = l0 * (lengths[6] / (lengths[2] + lengths[4] + lengths[6])),
                    l7 = l1;

                var pt0 = [points[0][0], points[0][1]],
                    pt1 = [pt0[0] + (l0 * Math.cos(theta)), pt0[1] + l0 * Math.sin(theta)],
                    pt2 = [pt1[0] + l1 * Math.cos(theta - Math.PI / 2), pt1[1] + l1 * Math.sin(theta - Math.PI / 2)],
                    pt3 = [pt2[0] + l2 * -Math.cos(theta), pt2[1] + l2 * -Math.sin(theta)],
                    pt4 = [pt3[0] + l3 * Math.cos(theta - Math.PI / 2), pt3[1] + l3 * Math.sin(theta - Math.PI / 2)],
                    pt5 = [pt4[0] + l4 * -Math.cos(theta), pt4[1] + l4 * -Math.sin(theta)],
                    pt6 = [pt5[0] + l5 * -Math.cos(theta - Math.PI / 2), pt5[1] + l5 * -Math.sin(theta - Math.PI / 2)],
                    pt7 = [pt6[0] + l6 * -Math.cos(theta), pt6[1] + l6 * -Math.sin(theta)];

                var orthT = [pt0, pt1, pt2, pt3, pt4, pt5, pt6, pt7];
                var rotatedT = [];
                for (var j = 0; j < orthT.length; j++) {
                    rotatedT.push(rotatePoint([0, 0], orthT[j], windwardDirection));
                };
                bldg.cardinalCoords = orthT;
                bldg.windwardCoords = rotatedT;
                //Add Walls
                for (var j = 1; j < rotatedT.length; j++) {
                    allBldgSTL += createWallMaterial(bldg.name, j - 1, rotatedT[j - 1], rotatedT[j], gridSize, bldg.height, bldg.flrToFlrHeight, bldg.numFloors, bldg.windowWallRatio, "brick", "glass")
                };
                allBldgSTL += createWallMaterial(bldg.name, rotatedT.length - 1, rotatedT[rotatedT.length - 1], rotatedT[0], gridSize, bldg.height, bldg.flrToFlrHeight, bldg.numFloors, bldg.windowWallRatio, "brick", "glass")
                    //Roof
                allBldgSTL += createRoofFloor(bldg.name, rotatedT[0], rotatedT[1], rotatedT[7], gridSize, bldg.height, "asphalt", "concrete")
                allBldgSTL += createRoofFloor(bldg.name, rotatedT[6], rotatedT[3], rotatedT[5], gridSize, bldg.height, "asphalt", "concrete")

                break;
            case "u":
                var l0, l1, l2, l3, l4, l5, l6, l7, lu, orthU, pt0, pt1, pt2, pt3, pt4, pt5, pt6, pt7, pt6_3, pt6_2;
                l6 = ((lengths[0] + lengths[2] + lengths[4]) + lengths[6]) / 2;
                l0 = l6 * (lengths[0] / (lengths[0] + lengths[2] + lengths[4]));
                l2 = l6 * (lengths[2] / (lengths[0] + lengths[2] + lengths[4]));
                l4 = l6 * (lengths[4] / (lengths[0] + lengths[2] + lengths[4]));
                lu = ((lengths[7] - lengths[1]) + (lengths[5] - lengths[3])) / 2;
                l1 = lengths[1];
                l3 = lengths[3];
                l5 = l3 + lu;
                l7 = l1 + lu;

                pt0 = [points[0][0], points[0][1]];
                pt1 = [pt0[0] + (l0 * Math.cos(theta)), pt0[1] + l0 * Math.sin(theta)];
                pt2 = [pt1[0] + l1 * Math.cos(theta - Math.PI / 2), pt1[1] + l1 * Math.sin(theta - Math.PI / 2)];
                pt3 = [pt2[0] + (l2 * Math.cos(theta)), pt2[1] + l2 * Math.sin(theta)];
                pt4 = [pt3[0] + l3 * -Math.cos(theta - Math.PI / 2), pt3[1] + l3 * -Math.sin(theta - Math.PI / 2)];
                pt5 = [pt4[0] + (l4 * Math.cos(theta)), pt4[1] + l4 * Math.sin(theta)];
                pt6 = [pt5[0] + l5 * Math.cos(theta - Math.PI / 2), pt5[1] + l5 * Math.sin(theta - Math.PI / 2)];

                pt7 = [pt6[0] + l6 * -Math.cos(theta), pt6[1] + l6 * -Math.sin(theta)];

                orthU = [pt0, pt1, pt2, pt3, pt4, pt5, pt6, pt7];
                var rotatedU = [];
                for (var j = 0; j < orthU.length; j++) {
                    rotatedU.push(rotatePoint([0, 0], orthU[j], windwardDirection));
                };
                bldg.cardinalCoords = orthU;
                bldg.windwardCoords = rotatedU;
                //Add Walls
                for (var j = 1; j < rotatedU.length; j++) {
                    allBldgSTL += createWallMaterial(bldg.name, j - 1, rotatedU[j - 1], rotatedU[j], gridSize, bldg.height, bldg.flrToFlrHeight, bldg.numFloors, bldg.windowWallRatio, "brick", "glass")
                }
                allBldgSTL += createWallMaterial(bldg.name, rotatedU.length - 1, rotatedU[rotatedU.length - 1], rotatedU[0], gridSize, bldg.height, bldg.flrToFlrHeight, bldg.numFloors, bldg.windowWallRatio, "brick", "glass")

                //Roof & Floor
                pt6_3 = [pt6[0] + (l4) * -Math.cos(theta), pt6[1] + (l4) * -Math.sin(theta)];
                pt6_2 = [pt6[0] + (l4 + l2) * -Math.cos(theta), pt6[1] + (l4 + l2) * -Math.sin(theta)];
                pt6_2 = rotatePoint([0, 0], pt6_2, windwardDirection);
                pt6_3 = rotatePoint([0, 0], pt6_3, windwardDirection);

                allBldgSTL += createRoofFloor(bldg.name, rotatedU[0], rotatedU[1], rotatedU[7], gridSize, bldg.height, "asphalt", "concrete")
                allBldgSTL += createRoofFloor(bldg.name, rotatedU[2], rotatedU[3], pt6_2, gridSize, bldg.height, "asphalt", "concrete")
                allBldgSTL += createRoofFloor(bldg.name, rotatedU[4], rotatedU[5], pt6_3, gridSize, bldg.height, "asphalt", "concrete")
                break;
            case "h":
                console.log(lengths)
                var l0, l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, lH, orthH, pt0, pt1, pt2, pt3, pt4, pt5, pt6, pt7, pt8, pt9, pt10, pt11;

                l0 = (lengths[0] + lengths[10]) / 2;
                l10 = l0;
                l4 = (lengths[4] + lengths[6]) / 2;
                l6 = l4;
                l2 = (lengths[2] + lengths[8]) / 2;
                l8 = l2;
                lH = ((lengths[11] - lengths[1] - lengths[9]) + (lengths[5] - lengths[3] - lengths[7])) / 2;
                l1 = lengths[1];
                l3 = lengths[3];
                l7 = lengths[7];
                l9 = lengths[9];
                l5 = lH + l3 + l7;
                l11 = l1 + lH + l9;

                pt0 = [points[0][0], points[0][1]];
                pt1 = [pt0[0] + (l0 * Math.cos(theta)), pt0[1] + l0 * Math.sin(theta)];
                pt2 = [pt1[0] + l1 * Math.cos(theta - Math.PI / 2), pt1[1] + l1 * Math.sin(theta - Math.PI / 2)];
                pt3 = [pt2[0] + (l2 * Math.cos(theta)), pt2[1] + l2 * Math.sin(theta)];
                pt4 = [pt3[0] + l3 * -Math.cos(theta - Math.PI / 2), pt3[1] + l3 * -Math.sin(theta - Math.PI / 2)];
                pt5 = [pt4[0] + (l4 * Math.cos(theta)), pt4[1] + l4 * Math.sin(theta)];
                pt6 = [pt5[0] + l5 * Math.cos(theta - Math.PI / 2), pt5[1] + l5 * Math.sin(theta - Math.PI / 2)];
                pt7 = [pt6[0] + l6 * -Math.cos(theta), pt6[1] + l6 * -Math.sin(theta)];
                pt8 = [pt7[0] + l7 * -Math.cos(theta - Math.PI / 2), pt7[1] + l7 * -Math.sin(theta - Math.PI / 2)];
                pt9 = [pt8[0] + l8 * -Math.cos(theta), pt8[1] + l8 * -Math.sin(theta)];
                pt10 = [pt9[0] + l9 * Math.cos(theta - Math.PI / 2), pt9[1] + l9 * Math.sin(theta - Math.PI / 2)];
                pt11 = [pt10[0] + l10 * -Math.cos(theta), pt10[1] + l10 * -Math.sin(theta)];

                orthH = [pt0, pt1, pt2, pt3, pt4, pt5, pt6, pt7, pt8, pt9, pt10, pt11];
                var rotatedH = [];
                for (var j = 0; j < orthH.length; j++) {
                    rotatedH.push(rotatePoint([0, 0], orthH[j], windwardDirection));
                };
                bldg.cardinalCoords = orthH;
                bldg.windwardCoords = rotatedH;
                //Add Walls
                for (var j = 1; j < rotatedH.length; j++) {
                    allBldgSTL += createWallMaterial(bldg.name, j - 1, rotatedH[j - 1], rotatedH[j], gridSize, bldg.height, bldg.flrToFlrHeight, bldg.numFloors, bldg.windowWallRatio, "brick", "glass")
                }
                allBldgSTL += createWallMaterial(bldg.name, rotatedH.length - 1, rotatedH[rotatedH.length - 1], rotatedH[0], gridSize, bldg.height, bldg.flrToFlrHeight, bldg.numFloors, bldg.windowWallRatio, "brick", "glass")

                //Roof & Floor
                allBldgSTL += createRoofFloor(bldg.name, rotatedU[0], rotatedU[1], rotatedU[11], gridSize, bldg.height, "asphalt", "concrete")
                allBldgSTL += createRoofFloor(bldg.name, rotatedU[2], rotatedU[3], rotatedU[9], gridSize, bldg.height, "asphalt", "concrete")
                allBldgSTL += createRoofFloor(bldg.name, rotatedU[4], rotatedU[5], rotatedU[7], gridSize, bldg.height, "asphalt", "concrete")

                break;
            case "cross":
                var l0, l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, orthCross, pt0, pt1, pt2, pt3, pt4, pt5, pt6, pt7, pt8, pt9, pt10, pt11;
                var topLength = lengths[10] + lengths[0] + lengths[2],
                    rightLength = lengths[1] + lengths[3] + lengths[5],
                    bottomLength = lengths[4] + lengths[6] + lengths[8],
                    leftLength = lengths[7] + lengths[9] + lengths[11];

                l0 = topLength * (lengths[0] / topLength);
                l1 = rightLength * (lengths[1] / rightLength);
                l2 = topLength * (lengths[2] / topLength);
                l3 = rightLength * (lengths[3] / rightLength);
                l4 = bottomLength * (lengths[4] / bottomLength);
                l5 = rightLength * (lengths[5] / rightLength);
                l6 = bottomLength * (lengths[6] / bottomLength);
                l7 = leftLength * (lengths[7] / leftLength);
                l8 = bottomLength * (lengths[8] / bottomLength);
                l9 = leftLength * (lengths[9] / leftLength);
                l10 = topLength * (lengths[10] / topLength);
                l11 = leftLength * (lengths[11] / leftLength);

                pt0 = [points[0][0], points[0][1]];
                pt1 = [pt0[0] + (l0 * Math.cos(theta)), pt0[1] + l0 * Math.sin(theta)];
                pt2 = [pt1[0] + l1 * Math.cos(theta - Math.PI / 2), pt1[1] + l1 * Math.sin(theta - Math.PI / 2)];
                pt3 = [pt2[0] + (l2 * Math.cos(theta)), pt2[1] + l2 * Math.sin(theta)];
                pt4 = [pt3[0] + l3 * Math.cos(theta - Math.PI / 2), pt3[1] + l3 * Math.sin(theta - Math.PI / 2)];
                pt5 = [pt4[0] + l4 * -Math.cos(theta), pt4[1] + l4 * -Math.sin(theta)];
                pt6 = [pt5[0] + l5 * Math.cos(theta - Math.PI / 2), pt5[1] + l5 * Math.sin(theta - Math.PI / 2)];
                pt7 = [pt6[0] + l6 * -Math.cos(theta), pt6[1] + l6 * -Math.sin(theta)];
                pt8 = [pt7[0] + l7 * -Math.cos(theta - Math.PI / 2), pt7[1] + l7 * -Math.sin(theta - Math.PI / 2)];
                pt9 = [pt8[0] + l8 * -Math.cos(theta), pt8[1] + l8 * -Math.sin(theta)];
                pt10 = [pt9[0] + l9 * -Math.cos(theta - Math.PI / 2), pt9[1] + l9 * -Math.sin(theta - Math.PI / 2)];
                pt11 = [pt10[0] + (l10 * Math.cos(theta)), pt10[1] + l10 * Math.sin(theta)];

                orthCross = [pt0, pt1, pt2, pt3, pt4, pt5, pt6, pt7, pt8, pt9, pt10, pt11];
                var rotatedCross = [];
                for (var j = 0; j < orthCross.length; j++) {
                    rotatedCross.push(rotatePoint([0, 0], orthCross[j], windwardDirection));
                };
                bldg.cardinalCoords = orthCross;
                bldg.windwardCoords = rotatedCross;
                //Add Walls
                for (var j = 1; j < rotatedCross.length; j++) {
                    allBldgSTL += createWallMaterial(bldg.name, j - 1, rotatedCross[j - 1], rotatedCross[j], gridSize, bldg.height, bldg.flrToFlrHeight, bldg.numFloors, bldg.windowWallRatio, "brick", "glass")
                }
                allBldgSTL += createWallMaterial(bldg.name, rotatedCross.length - 1, rotatedCross[rotatedCross.length - 1], rotatedCross[0], gridSize, bldg.height, bldg.flrToFlrHeight, bldg.numFloors, bldg.windowWallRatio, "brick", "glass")

                //Roof & Walls
                allBldgSTL += createRoofFloor(bldg.name, rotatedU[10], rotatedU[11], rotatedU[9], gridSize, bldg.height, "asphalt", "concrete")
                allBldgSTL += createRoofFloor(bldg.name, rotatedU[0], rotatedU[1], rotatedU[7], gridSize, bldg.height, "asphalt", "concrete")
                allBldgSTL += createRoofFloor(bldg.name, rotatedU[2], rotatedU[3], rotatedU[5], gridSize, bldg.height, "asphalt", "concrete")

                break;

            case "trap":
                var theta0_3 = findRotation(coords[0], coords[3]);
                var theta1_2 = findRotation(coords[1], coords[2]);
                var h = (lengths[1] * Math.cos(theta1_2) + lengths[3] * Math.cos(theta0_3)) / 2;
                var offset2 = Math.tan(theta0_3) * h;
                var offset1 = Math.tan(theta1_2) * h;
                var pt0 = [coords[0][0], coords[0][1]];
                var pt1 = [pt0[0] + (lengths[0] * Math.cos(theta)), pt0[1] + lengths[0] * Math.sin(theta)];
                var pt2 = [pt1[0] + lengths[1] * Math.cos(theta - theta1_2), pt1[1] + lengths[1] * Math.sin(theta - theta1_2)];
                var pt3 = [pt2[0] + lengths[2] * -Math.cos(theta), pt2[1] + lengths[2] * -Math.sin(theta)];
                var orthTrap = [pt0, pt1, pt2, pt3];
                var rotatedTrap = [];
                for (var j = 0; j < points.length; j++) {
                    rotatedTrap.push(rotatePoint([0, 0], points[j], windwardDirection));
                };
                bldg.cardinalCoords = points;
                bldg.windwardCoords = rotatedTrap;
                //Add Walls
                for (var j = 1; j < rotatedTrap.length; j++) {
                    allBldgSTL += createWallMaterial(bldg.name, j - 1, rotatedTrap[j - 1], rotatedTrap[j], gridSize, bldg.height, bldg.flrToFlrHeight, bldg.numFloors, bldg.windowWallRatio, "brick", "glass")
                }
                allBldgSTL += createWallMaterial(bldg.name, rotatedTrap.length - 1, rotatedTrap[3], rotatedTrap[0], gridSize, bldg.height, bldg.flrToFlrHeight, bldg.numFloors, bldg.windowWallRatio, "brick", "glass")

                break;

            case "triangle":
                var rotatedTri = [];
                for (var j = 0; j < points.length; j++) {
                    rotatedTri.push(rotatePoint([0, 0], points[j], windwardDirection));
                };
                bldg.cardinalCoords = points;
                bldg.windwardCoords = rotatedTri;
                //Add Walls
                for (var j = 1; j < rotatedTri.length; j++) {
                    allBldgSTL += createWallMaterial(bldg.name, j - 1, rotatedTri[j - 1], rotatedTri[j], gridSize, bldg.height, bldg.flrToFlrHeight, bldg.numFloors, bldg.windowWallRatio, "brick", "glass")
                }
                allBldgSTL += createWallMaterial(bldg.name, rotatedTri.length - 1, rotatedTri[2], rotatedTri[0], gridSize, bldg.height, bldg.flrToFlrHeight, bldg.numFloors, bldg.windowWallRatio, "brick", "glass")

                break;
        }
        //Create OSM & IDF and Simulate for Temperature
        var tempBuilding = {
            fileName: bldg.name,
            coords: points,
            gridSize: gridSize,
            floors: bldg.numFloors,
            floorHeight: bldg.flrToFlrHeight,
            wwr: bldg.windowWallRatio
        };
        console.log(tempBuilding);
        execRuby('./temperature.rb', tempBuilding, function(err, stdout, stderr) {
            if (err) throw err;
            console.log(stdout);
            execEnergyPlus(bldg.name + '.idf', 'USA_PA_State.College-Penn.State.University.725128_TMY3.epw', function(err, stdout, stderr) {
                if (err) throw err;
                console.log(stdout);
            });
        });

        //Ground Stats for This Building
        minMaxPts = minMaxPoints(bldg.windwardCoords);
        minXPts.push(minMaxPts[0]);
        maxXPts.push(minMaxPts[1]);
        minYPts.push(minMaxPts[2]);
        maxYPts.push(minMaxPts[3]);

        //Building Heights
        bldgHeights.push(bldg.height);
    }
    //Create Gound STL
    //Find Max Building Height as Characteristic Length for Ground Dimensions
    maxHeight = Math.max.apply(null, bldgHeights);
    maxHeight = Math.ceil(maxHeight);
    console.log(maxHeight);
    //Find Min and Max X&Y of building location points to be the inner bounds of the ground file
    minX = Math.min.apply(null, minXPts);
    maxX = Math.max.apply(null, maxXPts);
    minY = Math.min.apply(null, minYPts);
    maxY = Math.max.apply(null, maxYPts);
    var groundGridSize = 20;
    //Round these min and max points to next 5 
    minX = groundGridSize * Math.floor(minX / groundGridSize);
    maxX = groundGridSize * Math.ceil(maxX / groundGridSize);
    minY = groundGridSize * Math.floor(minY / groundGridSize);
    maxY = groundGridSize * Math.ceil(maxY / groundGridSize);
    //Create innerBounds of the Ground STL
    innerBounds = [
        [minX, maxY],
        [maxX, maxY],
        [maxX, minY],
        [minX, minY]
    ];
    //Call CreateGound
    var groundSTL = createGround(innerBounds, maxHeight, groundGridSize);


    //Write Files
    //Write All Buildings in One STL File
    fs.writeFileSync("stlFiles/" + fileName + ".stl", allBldgSTL);
    //Write Ground STL File for All Buildings
    fs.writeFileSync("stlFiles/" + fileName + "Ground.stl", groundSTL);

}
