var fs = require('fs'),
    stl = require('stl'),
    poly2tri = require('poly2tri');
//put verts into verts object for STL
function createFacet(verts) {
    return {
        verts: verts
    }
}
var outerBounds = [
    [-100, -100],
    [-100, 100],
    [100, 100],
    [100, -100]
];
var innerBound = [
    [-10, -10],
    [-10, 10],
    [10, 10],
    [10, -10]
];
var contour = new Array;
outerBounds.forEach(function (point) {
    contour.push(new poly2tri.Point(point[0], point[1]));
});

var ftprint = new poly2tri.SweepContext(contour);

//array stuff
var innerFullArray = new Array;
var x = -10;
var xArr = new Array;
while (x <= 10) {
    xArr.push(x);
    x++;
}
var y = -10;
var yArr = new Array;
while (y <= 10) {
    yArr.push(y);
    y++;
}
for (var i = 0; i < xArr.length; i++) {
    innerFullArray.push(new poly2tri.Point(xArr[i], -10));
    innerFullArray.push(new poly2tri.Point(xArr[i], 10));
    innerFullArray.push(new poly2tri.Point(-10, xArr[i]));
    innerFullArray.push(new poly2tri.Point(10, xArr[i]));
}
for (var i = 0; i < xArr.length; i++) {
    innerFullArray.push(new poly2tri.Point(xArr[i] - 2, -12));
    innerFullArray.push(new poly2tri.Point(xArr[i] + 2, 12));
    innerFullArray.push(new poly2tri.Point(-12, xArr[i] - 2));
    innerFullArray.push(new poly2tri.Point(12, xArr[i] + 2));
}
for (var i = 0; i < xArr.length; i++) {
    innerFullArray.push(new poly2tri.Point(xArr[i] - 5, -15));
    innerFullArray.push(new poly2tri.Point(xArr[i] + 5, 15));
    innerFullArray.push(new poly2tri.Point(-15, xArr[i] - 5));
    innerFullArray.push(new poly2tri.Point(15, xArr[i] + 5));
}
for (var i = 0; i < xArr.length; i++) {
    innerFullArray.push(new poly2tri.Point(xArr[i] - 15, -25));
    innerFullArray.push(new poly2tri.Point(xArr[i] + 15, 25));
    innerFullArray.push(new poly2tri.Point(-25, xArr[i] - 25));
    innerFullArray.push(new poly2tri.Point(25, xArr[i] + 25));
}
for (var i = 0; i < xArr.length; i++) {
    innerFullArray.push(new poly2tri.Point(xArr[i] + 40, -50));
    innerFullArray.push(new poly2tri.Point(xArr[i] - 40, 50));
    innerFullArray.push(new poly2tri.Point(-50, xArr[i] - 40));
    innerFullArray.push(new poly2tri.Point(50, xArr[i] + 40));
}
for (var i = 0; i < xArr.length; i++) {

    innerFullArray.push(new poly2tri.Point(xArr[i] - 65, -75));
    innerFullArray.push(new poly2tri.Point(xArr[i] + 65, 75));
    innerFullArray.push(new poly2tri.Point(-75, xArr[i] - 75));
    innerFullArray.push(new poly2tri.Point(75, xArr[i] + 75));
}

ftprint.addPoints(innerFullArray);

ftprint.triangulate();
var triangles = ftprint.getTriangles();
var facets = new Array;
triangles.forEach(function (tri) {
    var verts = [];
    tri.points_.reverse();
    tri.points_.forEach(function (points) {
        verts.push([points.x, points.y, 0]);
    });
    facets.push(createFacet(verts));
});

var stlObj = {
    description: "ground",
    facets: facets
};

var buildingSTL = stl.fromObject(stlObj);
fs.writeFileSync("stlFiles/ground3.stl", buildingSTL);
