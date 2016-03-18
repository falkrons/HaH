'use strict';

/**************************
	Global variables
**************************/

if(typeof(String.prototype.trim) === "undefined")
{
	String.prototype.trim = function(){
		return String(this).replace(/^\s+|\s+$/g, '');
	}
}

var renderer;
var camera;
var scene = new THREE.Scene();
var root = new THREE.Object3D();
scene.add(root);


/**************************
	Initialize scene
**************************/

if( altspace.inClient )
{
	// convert all this altspace craziness into a normal coordinate space
	// i.e. units in meters, z-axis up, with origin on the floor
	renderer = altspace.getThreeJSRenderer();
	altspace.getEnclosure().then(function(enc){
		root.scale.set(enc.pixelsPerMeter, enc.pixelsPerMeter, enc.pixelsPerMeter);
		root.position.setY( -enc.innerHeight/2 );
		root.rotation.set( -Math.PI/2, 0, 0 );
	});
}
else
{
	// set up preview renderer, in case we're out of world
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(1280, 720);
	renderer.setClearColor( 0x888888 );
	document.body.appendChild(renderer.domElement);

	// add an orbiting camera
	camera = new THREE.PerspectiveCamera(45, 1280/720, 1, 1000);
	camera.up.set(0,0,1);
	camera.position.set(0, 4, 1.5);
	camera.lookAt( new THREE.Vector3(0, 0, 1.5) );
	root.add(camera);
}


// add table surface
var table = new THREE.Mesh(
	new THREE.CylinderGeometry(1.5, 1.5, 0.05, 12, 1),
	new THREE.MeshBasicMaterial({color: 0x22aa22})
);
table.position.setZ(0.8);
table.rotation.set(Math.PI/2, 0, 0);
root.add(table);

// add a big black card
generateCard(
	[
		'The new',
		'Chevy Tahoe.',
		'With the power',
		'and space to take',
		'_______________',
		'everywhere you go.'
	],
	'black',
	function(card){
		card.position.setZ(1.5);
		card.scale.set(12,12,12);
		card.rotation.set(Math.PI/2, 0, 0);

		root.add(card);
	}
);

// grab game id from URL
var gameId = /[?&]gameId=(\w+)\b/.exec(window.location.search);
if(gameId) gameId = gameId[1];

// initialize game
if(!gameId)
{
	var message = document.createElement('h1');
	message.innerHTML = 'No game room specified! Add a "gameId" query argument.';
	document.body.insertBefore(message, document.body.children[0]);
}
else
{
	connectToGame(gameId);
	
}


/***************************
	Render loop
***************************/

function render(timestamp)
{
	// update camera if necessary
	if(camera){
		camera.position.x = 4 * Math.sin(timestamp * 2*Math.PI/10000);
		camera.position.y = 4 * Math.cos(timestamp * 2*Math.PI/10000);
		camera.lookAt( new THREE.Vector3(0, 0, 1.5) );
	}

	// finally, render
	renderer.render(scene, camera);
}

// start animating
window.requestAnimationFrame(function animate(timestamp)
{
	window.requestAnimationFrame(animate);
	render(timestamp);
});
