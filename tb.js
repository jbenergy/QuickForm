'use strict';
//Dependencies
var fs = require('fs'),
    stl = require('stl');

function createVertPlane(pt1, pt2, z1, z2) {
    var tri1 = [[pt1[0], pt1[1], z1], [pt2[0], pt2[1], z1], [pt2[0], pt2[1], z2]],
        tri2 = [[pt1[0], pt1[1], z1], [pt2[0], pt2[1], z2], [pt1[0], pt1[1], z2]],
        facets = [];
    facets = [{
        verts: tri1
    }, {
        verts: tri2
    }];
    return facets;

}

function createHorPlane(pt1, pt2, z) {
    var tri1 = [[pt1[0], pt1[1], z], [pt2[0], pt1[1], z], [pt2[0], pt2[1], z]],
        tri2 = [[pt1[0], pt1[1], z], [pt2[0], pt2[1], z], [pt1[0], pt2[1], z]],
        facets = [{
            verts: tri1
    }, {
            verts: tri2
    }];
    return facets;
}

var array = [],
    height,
    xGrid,
    xIt,
    yGrid,
    yIt,
    zGrid,
    zIt,
    facets = [];

array = [[-10.25, -10.5],
    [10, -10.5],
    [10, 10],
    [-10.25, 10]];
height = 15.5;

xGrid = Math.abs(parseInt(array[0][0] - array[1][0], 10));
xIt = (array[0][0] - array[1][0]) / xGrid;
console.log("xGrid: " + xGrid + "  X iteration: " + xIt);
yGrid = Math.abs(parseInt(array[0][1] - array[2][1], 10));
yIt = (array[0][1] - array[2][1]) / yGrid;
console.log("yGrid: " + yGrid + "  Y iteration: " + yIt);
zGrid = Math.abs(parseInt(height));
zIt = height / zGrid;
console.log("zGrid: " + zGrid + "  Z iteration: " + zIt);

//South Side
for (var x = 0; x < xGrid; x++) {
    var x1 = array[0][0] - xIt * x;
    var x2 = array[0][0] - xIt * (x + 1);
    //console.log(array[0][0] - xIt * x)
    for (var z = 0; z < zGrid; z++) {
        //console.log(zIt * z);
        var z1 = zIt * z;
        var z2 = zIt * (z + 1);
        var pt1 = [x1, array[0][1]],
            pt2 = [x2, array[0][1]];
        var tri = createVertPlane(pt1, pt2, z1, z2);
        facets.push(tri[0]);
        facets.push(tri[1]);
    }
}
//North Side
for (var x = 0; x < xGrid; x++) {
    var x1 = array[2][0] + xIt * x;
    var x2 = array[2][0] + xIt * (x + 1);
    //console.log(array[0][0] - xIt * x)
    for (var z = 0; z < zGrid; z++) {
        //console.log(zIt * z);
        var z1 = zIt * z;
        var z2 = zIt * (z + 1);
        var pt1 = [x1, array[2][1]],
            pt2 = [x2, array[2][1]];
        var tri = createVertPlane(pt1, pt2, z1, z2);
        facets.push(tri[0]);
        facets.push(tri[1]);
    }
}

//East Side
for (var y = 0; y < yGrid; y++) {
    var y1 = array[1][1] - yIt * y;
    var y2 = array[1][1] - yIt * (y + 1);
    //console.log(array[0][0] - xIt * x)
    for (var z = 0; z < zGrid; z++) {
        //console.log(zIt * z);
        var z1 = zIt * z;
        var z2 = zIt * (z + 1);
        var pt1 = [array[1][0], y1],
            pt2 = [array[1][0], y2];
        var tri = createVertPlane(pt1, pt2, z1, z2);
        facets.push(tri[0]);
        facets.push(tri[1]);
    }
}
//West Side
for (var y = 0; y < yGrid; y++) {
    var y1 = array[3][1] + yIt * y;
    var y2 = array[3][1] + yIt * (y + 1);
    //console.log(array[0][0] - xIt * x)
    for (var z = 0; z < zGrid; z++) {
        //console.log(zIt * z);
        var z1 = zIt * z;
        var z2 = zIt * (z + 1);
        var pt1 = [array[3][0], y1],
            pt2 = [array[3][0], y2];
        var tri = createVertPlane(pt1, pt2, z1, z2);
        facets.push(tri[0]);
        facets.push(tri[1]);
    }
}
//Roof & Floor
for (var x = 0; x < xGrid; x++) {
    var x1 = array[0][0] - xIt * x;
    var x2 = array[0][0] - xIt * (x + 1);
    //console.log(array[0][0] - xIt * x)
    for (var y = 0; y < yGrid; y++) {
        //console.log(zIt * z);
        var y1 = array[0][1] - yIt * y;
        var y2 = array[0][1] - yIt * (y + 1);
        var pt1 = [x1, y1],
            pt2 = [x2, y2];
        var tri = createHorPlane(pt1, pt2, 0);
        facets.push(tri[0]);
        facets.push(tri[1]);
        var tri = createHorPlane(pt1, pt2, height);
        facets.push(tri[0]);
        facets.push(tri[1]);
    }
}

var stlObj = {
    description: "testBuilding",
    facets: facets
};

fs.writeFileSync("stlFiles/testBuildings.stl", stl.fromObject(stlObj));
