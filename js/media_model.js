var objPaths, mtlPaths, fileId, savedNotes = [], qh, parent, wrapper = document.createElement('div');
wrapper.id = 'media-model-wrapper';
wrapper.name = 'Media Model Wrapper';

var pValues = location.search.replace('?', '').split(',');
if(pValues[pValues.length-1]=='')
	pValues.pop();

// moved this stuff outside so generateURL() (and saveNote()) could be run outside of the main function.
var camera, controls, helpOverlay, helpPrompt, lastDownTarget;
var defaultWindow = {width: 800, height: 600};
var windowWidth, windowHeight, windowHalfX, windowHalfY;
var pathControls, pinRoot = new THREE.Object3D(), URLButton, saveNoteButton, loadNoteButton,
		path;


var pin = {geometry: new THREE.CylinderGeometry( 0, 1, 4, 4, false ), material: new THREE.MeshPhongMaterial( { color : new THREE.Color(0xfffff), wireframe: true} )
};

var PinHandler = function(){
	var object, path, index, grabbed, lastClick;
	return{				
		setObject:function(path, index){
			//selectedObject.scale.set(1.6, 1.6, 1.6);
			this.path = path;
			this.index = index
			this.object = path[index];
			//this.object.scale.set(1.6, 1.6, 1.6);
			//domObject = document.getElementById(this.object.name);
			return null;
		},
		update:function(){
			if(this.object)
				if(this.grabbed){
					this.object.position.set(cursor.x, cursor.y, cursor.z);
					this.path.rebuildPath();
				}
				else{//console.log("spin");
					rotateAroundWorldAxis(this.object, this.up, 0.05);
				}
			return null;
		},
		clear:function(){
			if(!this.grabbed){
				if(this.object)
					this.object.scale.set(1, 1, 1);
				cursorPin.visible = true;
				return (this.object = null);
			}
			else
				return null;
		}
	}
}
var pinHandler = new PinHandler();

var mouseDown = 0;

var FPSAvg = function(n){
	var lastNFrames = [], avg = 0, factor = 1/n, last = Date.now();
	return{
		update:function(){
			var curr = Date.now(), myfps=Math.round(1E3/(curr-last));
			last = curr;
			if(Date.now()>last+1E3)
				return null;
			lastNFrames.push(factor*(myfps));
			avg += lastNFrames[lastNFrames.length-1];
			//console.log(avg);
			if(lastNFrames.length>n) {
				avg -= lastNFrames.shift();
				return avg;
			}
			return null;
		}
	};
};

var QUALITY = [
	{value: 0, name: 'default'},
	{value: 1, name: 'low'}, 
	{value: 2, name: 'med'}, 
	{value: 3, name: 'high'}
];

var Load = function(modifiedFilesExist){
	var loading = false;
	var quality = QUALITY[modifiedFilesExist ? 1 : 0];
	var ready = false;
	return{
		quality: quality,
		loading: loading,
		ready: ready,
		next: function(){
			return  QUALITY[this.quality.value+1] ? this[QUALITY[this.quality.value+1].name] : {path: null};
		},
		default: {path: null, name: 'default'},
		low: {path: null, name: 'low'},
		med: {path: null, name: 'med'},
		high: {path: null, name: 'high'},
	};
};

var QualityHandler = function(modObjs, modMtls){
	var mtlLoad = new Load(modObjs), objLoad = new Load(modMtls), fpsAvg = new FPSAvg(100);
	var material, object;
	return{
		objLoad: objLoad,
		mtlLoad: mtlLoad,
		update:function(){
			if(fpsAvg.update()>15){
				if(!objLoad.loading && objLoad.next().path) {
					console.log('FPS is stable, attempting to download ' + objLoad.next().name + ' quality model');
					object = [];
					objLoad.loading = true;
					var loader = new THREE.OBJLoader();
					loader.addEventListener( 'load', function ( event ) {
						var tmp = event.content;
						console.log('Loaded from: ' + objLoad.next().path);
						if(tmp.children.length>0)
							for( var i = 0; i<tmp.children.length; i++ ){
								object.push( tmp.children[i] );
								object[i].name = objLoad.next().name;
								console.log('Successfully loaded ' + objLoad.next().name + ' quality model portion ' + i + '\n\t'
								 + object[i].geometry.vertices.length +' vertices and ' + object[i].geometry.faces.length + ' faces.');
								object[i].geometry.computeBoundingSphere();
								object[i].geometry.computeBoundingBox();
								console.log('Bounding sphere radius of the geometry is ' + object[i].geometry.boundingSphere.radius);
							}
						else  {
							object[0] = tmp;
							object[0].name = objLoad.next().name;
							console.log('Successfully loaded ' + objLoad.next().name + ' quality model. Loaded as single\n\t'
								+ object[0].geometry.vertices.length +' vertices and ' + object[0].geometry.faces.length + ' faces.');
							object[0].geometry.computeBoundingSphere();
							object[0].geometry.computeBoundingBox();
							console.log('Bounding sphere radius of the geometry is ' + object[0].geometry.boundingSphere.radius);
						}
						object[0].material = model.material;
						scene.add(object[0]);
						model = object[0];
						console.log('Swapped for ' + objLoad.next().name + ' quality object');
						objLoad.loading = false;
						objLoad.quality = QUALITY[objLoad.quality.value+1];
						processing = false;
					});
					loader.load( objLoad.next().path );
				}
				if(!mtlLoad.loading && mtlLoad.next().path) {
					console.log('FPS is stable, attempting to download ' + mtlLoad.next().name + ' quality material');
					mtlLoad.loading = true;
					var result = THREE.ImageUtils.loadTexture(mtlLoad.next().path.replace('.obj.mtl', '.jpg'), {}, function() {
						console.log('Successfully loaded ' + objLoad.next().name + ' quality material');
						model.material.map = result;
						model.material.needsUpdate = true;
						console.log('Swapped for ' + mtlLoad.next().name + ' quality material');
						mtlLoad.loading = false;
						mtlLoad.quality = QUALITY[mtlLoad.quality.value+1];
					});
				}
			}

		}
	};

};
//document.addEventListener('mousedown', function(){++mouseDown;}, false);
//document.addEventListener('mouseup', function(){--mouseDown;}, false);

var viewport, ul, distancesLayer;

//path.lineRibbon.geometry = path.lineGeometry;


var camComponents = {
 	up: new THREE.Vector3(),
 	right: new THREE.Vector3(),
 	hDegs: 0,
 	vDegs: 0,
 	radius: 0,
 	start: new THREE.Vector3() };

var dirLight = new THREE.DirectionalLight( 0xC8B79D );
var cursorPLight = new THREE.PointLight( 0xffffff, 1, 1000 );
var scene, projector, renderer, cursor, highlighted = false;

var mouse = { x: 0, y: 0 }, INTERSECTED, mouse3D = { x: 0, y: 0, z: 1 };

var model = [];
var rotating = false;

var colors = [
	0xd10000,
	0xff6622,
	0xffda21,
	0x33dd00,
	0x1133cc,
	0x220066,
	0x330044
];

var colorAvailable = [ true, true, true, true, true, true, true ];

function init(){
	path = new THREE.MediaModelPath(colorChooser());
	container = document.getElementById( 'file-'.concat(fileId) );
	jQuery(container).prepend(wrapper);
	defaultWindow = {width: jQuery(wrapper).width(), height: jQuery(wrapper).height() };
	resetWindow(defaultWindow.width, defaultWindow.height);

	helpOverlay = document.getElementsByClassName('media-model-help-overlay')[0];
	helpPrompt = document.getElementsByClassName('media-model-help-prompt')[0];

	viewport = document.createElement( 'div' );
	viewport.id = 'media-model-viewport';
	viewport.name = 'Media Model Viewport';
	jQuery(helpOverlay).hide();

	pathControls = document.createElement( 'div' );
	pathControls.id = 'media-model-path-controls';

	URLButton = document.createElement( 'button' );
	URLButton.className = 'media-model-control-button';
	URLButton.id = 'media-model-url-button';
	URLButton.innerHTML = 'Generate URL';
	pathControls.appendChild(URLButton);

	loadNoteButton = document.createElement( 'button' );
	loadNoteButton.className = 'media-model-control-button';
	loadNoteButton.id = 'media-model-load-note-button';
	loadNoteButton.innerHTML = 'Load note from server';
	pathControls.appendChild(loadNoteButton);

	saveNoteButton = document.createElement( 'button' );
	saveNoteButton.className = 'media-model-control-button';
	saveNoteButton.id = 'media-model-save-note-button';
	saveNoteButton.innerHTML = 'Save note to server';
	pathControls.appendChild(saveNoteButton);

	viewport.appendChild( helpOverlay );
	viewport.appendChild( helpPrompt );
	wrapper.appendChild( viewport );
	viewport.appendChild( pathControls );

	// create scene and establish lighting
	scene = new THREE.Scene();
	scene.name = 'scene';

	// create camera and position it in scene
	camera = new THREE.PerspectiveCamera( 45, windowWidth / windowHeight, 1, 2000 );
	camera.position.z = 100;
	scene.add( camera );

	controls = new THREE.MediaModelControls( camera, viewport );
	controls.addEventListener( 'change', render, false);	

	// one ambient light of darkish color
	var ambient = new THREE.AmbientLight( 0x130d00 );
	scene.add( ambient );

	// one directional light which will follow behind our camera to highlight what we view
	dirLight.position.set( 0, 0, 1 ).normalize();
	scene.add( dirLight );

	projector = new THREE.Projector();
	var loader = new THREE.OBJMTLLoader();
		loader.addEventListener( 'load', function ( event ) {
			var tmp = event.content;
			console.log(tmp);
			// because sometimes the .obj seems to contain multiple models
			// TODO: combine all models which are loaded in 
			for( var i = 0; i<tmp.children.length; i++ ){
				model.push( tmp.children[i] );
				model[i].name = 'model';
				// we enable double sided materials so we have a back
        		model[i].material.side = THREE.DoubleSide;

				console.log('Successfully loaded model portion ' + i + ', with ' + model[i].geometry.vertices.length +' vertices and ' + model[i].geometry.faces.length + ' faces.');
				model[i].geometry.computeBoundingSphere();
				model[i].geometry.computeBoundingBox();
				console.log('Bounding sphere radius of the geometry is ' + model[i].geometry.boundingSphere.radius);

				avgPos = new THREE.Vector3()
					.copy(model[i].geometry.boundingBox.min)
					.add(model[i].geometry.boundingBox.max)
					.multiplyScalar(0.5)
					.negate();
				console.log('Center point (of bounding box) is away from the origin by ' + avgPos.x + ', ' + avgPos.y + ', ' + avgPos.z);

				//this is to try to move the center to the right place
				model[i].geometry.applyMatrix(new THREE.Matrix4().makeTranslation(avgPos.x, avgPos.y, avgPos.z));

				//model[i].translate(avgPos.length(), avgPos.negate());
				scene.add(model[i]);

				var ray = new THREE.Raycaster(camera.position, new THREE.Vector3(0,0,-1));
				if(ray.intersectObjects( model ).length==0)
					model[i].applyMatrix(new THREE.Matrix4().makeRotationY(Math.PI));


			}
			model = model[0];
			cursor = new THREE.Vector3( model.position.x, model.position.y, model.position.y );
			if(pValues.length > 0)
				loadURLdata();
	
			
			qh = new QualityHandler(objPaths.low, mtlPaths.low);
			qh.mtlLoad.default.path = mtlPaths.default;
			qh.mtlLoad.low.path = mtlPaths.low;
			qh.mtlLoad.med.path = mtlPaths.med;
			qh.mtlLoad.high.path = mtlPaths.high;
			qh.objLoad.default.path = objPaths.default;
			qh.objLoad.low.path = objPaths.low;
			//qh.objLoad.med.path = objPaths.med;
			//qh.objLoad.high.path = objPaths.high;
			if(fileId=="26"){
				var result = THREE.ImageUtils.loadTexture('https://media-dev.as.uky.edu/media-dev3/sites/default/files/Chads/Chad217_normaltest_normal.png', {}, function() {
					console.log('Successfully loaded test normal map material');
					//while(!model){
						//waiting for model to load
					//}
					model.material.normalMap = result;
					model.material.needsUpdate = true;
					console.log('Swapped for test normal map material');
				});
			}
		});
		loader.load( objPaths.low ? objPaths.low : objPaths.default, mtlPaths.low ? mtlPaths.low : mtlPaths.default);

	console.log('Loading the following obj: ');
	console.log(objPaths.low);
	console.log('Loading the following mtl: ');
	console.log(mtlPaths.low);

	// establish another pin, to follow the cursor and represent where the pins will appear
	cursorPin = new THREE.Mesh( pin.geometry, new THREE.MeshLambertMaterial( { color : 0xFF00FF } ) );
	scene.add( cursorPin );
			// a small positional light that will hug our cursor and approach the model
	cursorPin.add( cursorPLight );
	cursorPLight.position.y = -20;

	// establish our renderer
	renderer = new THREE.WebGLRenderer();
	renderer.setSize( windowWidth, windowHeight );
	renderer.setClearColorHex( 0x8e8272, 1 );

	distancesLayer = document.createElement( 'div' );
	distancesLayer.id = 'distances-layer';
	viewport.appendChild( distancesLayer );

	viewport.appendChild( renderer.domElement );
	/*viewport.addEventListener( 'mousemove', onMouseMove, false );
	viewport.addEventListener( 'mousedown', onMouseDown, false );
	viewport.addEventListener( 'mouseup', onMouseUp, false );
	viewport.addEventListener( 'DOMMouseScroll', onMouseWheel, false );
	viewport.addEventListener( 'mousewheel', onMouseWheel, false );
	viewport.addEventListener( 'mouseover', onMouseOver, false);
	viewport.addEventListener( 'mouseout', onMouseOut, false);
	viewport.addEventListener( 'keydown', onKeyDown, false);*/

	path.rebuildPath();

	var modalMessage = document.createElement( 'div' );
	modalMessage.id = 'modal-message';
	modalMessage.innerHTML = '&nbsp'
	container.appendChild(modalMessage);
} // end init

function animate() {
	controls.update();
	requestAnimationFrame( animate );
	render();
}
function render() {
	//console.log(scene.children);
	// check for cursor going over model
	if ( model.length > 0 ){
		repositionDistances();
		var vector = new THREE.Vector3(mouse3D.x, mouse3D.y, 1);
		projector.unprojectVector( vector, camera );
		var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
		var modelIntersects = ray.intersectObjects(model);
		var pinIntersects = ray.intersectObject(pinRoot, true);
		//console.log(intersects);
		if(modelIntersects &&  modelIntersects[0] &&  modelIntersects[0].point )
			cursor.copy( modelIntersects[0].point );

		if(modelIntersects.length > 0
			&& (pinIntersects == 0 || modelIntersects[0].point.distanceTo(camera.position) < pinIntersects[0].point.distanceTo(camera.position))) {
			pinHandler.clear();
			highlighted = true;
		}
		else if (pinIntersects.length > 0
			&& (modelIntersects == 0 || modelIntersects[0].point.distanceTo(camera.position) > pinIntersects[0].point.distanceTo(camera.position))) {
			cursorPin.visible = false;
			//cursor.copy( pinIntersects[0].object.position);
			pinHandler.setObject(pinIntersects[0].object);
			highlighted = true;
		}
		else{
			highlighted = false;
			pinHandler.clear();
		}

	}
	renderer.render( scene, camera );
	pinHandler.update();
	if(qh) qh.update();
}

/*
function removePoint( colorID ){
	for( var i=0; i<ul.children.length; i++) {
		if(ul.children[i].id==colorID){
			jQuery('#'+colorID).remove();
			jQuery('#'+colorID).sortable('destroy'); //call widget-function destroy
			jQuery('.ui-sortable-placeholder').remove();
			colorAvailable[colors.indexOf(parseInt(colorID, 16))] = true;
			//delete(pinHandler.object);
			break;
		}
	}
	console.log(ul.children);
	console.log('Removed ' + colorID + ' from the set.');
	rebuildPath(ul.children);
}

function addPoint(location) {
	var color = colorChooser();
	console.log("adding new point of ");
	console.log(color);
	if(color==false) return;
	var pinMaterial = new THREE.MeshPhongMaterial();
	pinMaterial.color = color;
	path.colorID.push( color.getHexString() );
	path.pins.push( { 	
			mesh: new THREE.Mesh(path.pinGeometry, pinMaterial),
			up: new THREE.Vector3()
		});
	var index = path.pins.length-1;
	pinRoot.add(path.pins[index].mesh);
	//path.pins[path.pins.length - 1].mesh.position.set(cursor.x, cursor.y, cursor.z);
	path.pins[index].up = orientPin(path.pins[index].mesh, location);
	path.pins[index].mesh.name = color.getHexString();

	var li = document.createElement( 'li' );
	li.className = 'pin-button';
	li.id = color.getHexString();
	//li.innerHTML = "";
	li.style.backgroundColor = '#' + color.getHexString();
	li.onmouseover = function(event){
		event.target.style.backgroundColor = adjustColor(event.target.style.backgroundColor, 40);
	};
	li.onmouseout = function(event){
		event.target.style.backgroundColor = adjustColor(event.target.style.backgroundColor, -40);
	};

	li.appendChild(document.createElement('br'));
	path.ui.push(li);
	ul.appendChild(li);
	rebuildPath(ul.children);
	//scene.add(newLine);
	//model.visible = false;
}



function positionDistance(i) {
	var screenPos = new THREE.Vector3().copy(path.pins[i].mesh.position).add(path.pins[i+1].mesh.position).multiplyScalar(0.5);
	projector.projectVector( screenPos, camera );
	screenPos.x = ( screenPos.x * windowHalfX ) + windowHalfX;
	screenPos.y = - ( screenPos.y * windowHalfY ) + windowHalfY;
	if(screenPos.x > 0 && screenPos.x < windowWidth && screenPos.y > 0 && screenPos.y < windowHeight) {
		path.distances[i].element.style.left = screenPos.x + 'px';
		path.distances[i].element.style.top = screenPos.y + 'px';
		path.distances[i].element.style.visibility = 'visible';
	}
	else
		path.distances[i].element.style.visibility = 'collapse';
}

function repositionDistances() {
	for(var i=0; i<path.distances.length; i++){
		positionDistance(i);
	}
}

function rebuildPath(newOrder){
		scene.remove(path.lineRibbon);
		scene.remove(pinRoot);
		pinRoot = new THREE.Object3D();
		scene.add(pinRoot);

		//console.log(viewport.hasChildNodes());
		while(distancesLayer.hasChildNodes()){
			distancesLayer.removeChild(distancesLayer.lastChild);
		}
		var newRibbon = new THREE.Ribbon(new THREE.Geometry(), path.lineRibbon.material);
		var newPins = [];
		var newDistances = [];
		var newColorID = [];
		var oldIndex = -1, newIndex = -1;
		path.distance.value = 0;
		for(var i=0; i<newOrder.length; i++) {
			//if(newOrder[i].id == '') continue;
			newPins.push(path.pins[path.colorID.indexOf(newOrder[i].id)]);
			newColorID.push(newOrder[i].id);
			pinRoot.add(newPins[i].mesh);
			if(i>0) {
				newDistances.push({
					value: newPins[i-1].mesh.position.distanceTo(newPins[i].mesh.position),
					element: document.createElement( 'div' )
				});
				distancesLayer.appendChild(newDistances[i-1].element);
				newDistances[i-1].element.className = 'media-model-floating-distance-text';
				newDistances[i-1].element.innerHTML = newDistances[i-1].value.toFixed(2);
				path.distance.value += newDistances[i-1].value;
			}
			newRibbon.geometry.vertices.push( new THREE.Vector3().copy(newPins[i].mesh.position));
			newRibbon.geometry.vertices.push( new THREE.Vector3().copy(newPins[i].mesh.position).add(newPins[i].up));
			newRibbon.geometry.colors.push(new THREE.Color(parseInt(newColorID[i],16)));
			newRibbon.geometry.colors.push(new THREE.Color(parseInt(newColorID[i],16)));
		}
		path.distance.element.innerHTML = path.distance.value.toFixed(2);
		repositionDistances();
		path.lineRibbon = newRibbon;
		path.pins = newPins;
		path.distances = newDistances;
		path.colorID = newColorID;
		//console.log('Old index is ' + oldIndex + ' and new index is ' + newIndex);
		//repositionDistances(i);
		scene.add(path.lineRibbon);

		currentURL = generateURL();
	}
*/

jQuery(wrapper).disableSelection();
jQuery(viewport).disableSelection();
jQuery(pathControls).disableSelection();
jQuery(distancesLayer).disableSelection();

// general motion functionality
function rotateVectorForObject( vector, matrix){
	return new THREE.Vector3().copy(vector).applyMatrix4(matrix).sub(new THREE.Vector3(0,0,0).applyMatrix4(matrix));
}

function rotateAroundWorldAxis( object, axis, radians ) {

    var rotationMatrix = new THREE.Matrix4();

    rotationMatrix.makeRotationAxis( axis.normalize(), radians );
    rotationMatrix.multiply( object.matrix );                       // pre-multiply
    object.matrix = rotationMatrix;
    object.rotation.setEulerFromRotationMatrix( object.matrix );
}

function rotateVectorByEuler(vector, x, y, z){
	vector.applyMatrix4( new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1,0,0), x));
	vector.applyMatrix4( new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0,1,0), y));
	vector.applyMatrix4( new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0,0,1), z));
	vector.x *= -1;
	vector.y *= -1;
}

function orientPin(pin, location){
	var closestFaceIndex;
	closestFaceIndex = 0;

	// iterate over our model's faces to try to locate the nearest centroid
	for( var i = 1; i < model.geometry.faces.length; i++ ){
		if( location.distanceTo(model.geometry.faces[closestFaceIndex].centroid) > location.distanceTo(model.geometry.faces[i].centroid) )
			closestFaceIndex = i;
	}
	// move pin to our cursor's location
	pin.position.copy( location );
	var pinUp = new THREE.Vector3();
	// begin our up vector as a copy of the closest face's normal
	pinUp.copy( model.geometry.faces[closestFaceIndex].normal );
	// we cross the up vector with -1,0,0 so the pin points in the direction we want it to (on to the model)

	pinUp.multiplyScalar( pin.geometry.boundingSphere.radius/2 );
	// and add it to the pin's position
	pin.position.add( pinUp );

	pin.lookAt( location );
	pin.rotation.x -= Math.PI/2;
	return pinUp;
}

// camera motion functionality
function panCamera(dx, dy) {
	camComponents.up = rotateVectorForObject(new THREE.Vector3(0,1,0), camera.matrixWorld);
	//var upTest = new THREE.Vector3(0,1,0).applyMatrix4(camera.matrixWorld).sub(new THREE.Vector3(0,0,0).applyMatrix4(camera.matrixWorld));
	//console.log('rotateByEuler gives us ' + camComponents.up.x + ',' + camComponents.up.y + ',' + + camComponents.up.z + ', and new method gives us ' + upTest.x + ',' + upTest.y + ',' + upTest.z);

	camComponents.right = rotateVectorForObject(new THREE.Vector3(1,0,0), camera.matrixWorld);
	//cameraSideMotion.cross(cameraUpMotion, forwardVector);

	camComponents.right.multiplyScalar(dx * 0.2);
	camComponents.up.multiplyScalar(-dy * 0.2);

	camera.position.add(camComponents.up);
	camera.position.add(camComponents.right);
}

// lil helper functions of the miscellaneous sort
// we use this to prevent selection of our distance text
// highlighting text would prevent functionality
jQuery.fn.extend({ 
	disableSelection : function() { 
		return this.each(function() { 
			this.onselectstart = function() { return false; }; 
			this.unselectable = 'on'; 
			jQuery(this).css('user-select', 'none'); 
			jQuery(this).css('-o-user-select', 'none'); 
			jQuery(this).css('-moz-user-select', 'none'); 
			jQuery(this).css('-khtml-user-select', 'none'); 
			jQuery(this).css('-webkit-user-select', 'none'); 
		}); 
	} 
}); 

function colorChooser() {
	for(var i=0; i<colors.length; i++) {
		if(colorAvailable[i]){
			colorAvailable[i] = false;
			return new THREE.Color(colors[i]);
		}
	}
	return false;
}


function adjustColor(color, value) {
    var digits = /(.*?)rgb\((\d+), (\d+), (\d+)\)/.exec(color);
    
    var red = Math.min(parseInt(digits[2])+value,255);
    var green = Math.min(parseInt(digits[3])+value,255);
    var blue = Math.min(parseInt(digits[4])+value,255);
    
    return 'rgb(' + red + ', ' + green + ', ' + blue + ')';
}



// general data interfaces
function loadURLdata() {
	// you were reodering this function to take input the same way generate generates
	// gl 
	var i, loadedCameraMatrix = new THREE.Matrix4();
	pValues[0] = pValues[0].substr(pValues[0].indexOf('=')+1);
	for(i=0; i<pValues.length; i++)
		if(pValues[i].indexOf('pins=') != -1) {
			break;
		}
		else
			loadedCameraMatrix.elements[i]=parseFloat(pValues[i]);	
	camera.matrix.identity();
	camera.applyMatrix(loadedCameraMatrix);
	if(pValues[i] !='pins=') {
		pValues[i] = pValues[i].substr(pValues[i].indexOf('=')+1);
		while(i<pValues.length) {
			path.addPoint(new THREE.Vector3(parseFloat(pValues[i]), parseFloat(pValues[i+1]), parseFloat(pValues[i+2])));
			i+=3;
		}
	}
}

function generateURL() {
	var URL = location.origin + location.pathname + '?' + 'cam=';
	for(var i=0; i<16; i++) {
		URL += camera.matrixWorld.elements[i].toPrecision(7) + ',';
	}
	URL += 'pins=';
	for(var i=0; i<path.pins.length; i++) {
		URL += path.pins[i].mesh.position.x.toPrecision(7) + ','
			+ path.pins[i].mesh.position.y.toPrecision(7) + ',' 
			+ path.pins[i].mesh.position.z.toPrecision(7) + ',';
	}
	return URL;
}

function saveNote(formResults) {
	var urlData = generateURL().replace('cam=', '');
	urlData = urlData.substr(urlData.indexOf('?')+1).split('pins=');

	fid = location.pathname.substr(location.pathname.lastIndexOf('/')+1);

	var data = {
			fid: fid,
			title: formResults.title,
			text: formResults.text,
			cam: (formResults.cam ? urlData[0] : null),
			pins: (formResults.pins ? urlData[1] : null),
	};
	console.log(data);

	jQuery.ajax({
		type: 'POST',
		url: '../addnote/add',
		dataType: 'json',
		data: data,
		success: function(data){
			console.log('Successfully sent add note POST to server');
			console.log(data.status);
		},
		complete: function(data){
			console.log('Completed sending add note POST to server');
		},
	});
}

function loadNote(note){
	var loadedCameraMatrix = new THREE.Matrix4(),
		cam = note.cam.split(','),
		pins = note.pins.split(',');
	if(note.cam != '') {
		for(var i=0; i<cam.length; i++){
			loadedCameraMatrix.elements[i]=cam[i];
		}
		camera.matrix.identity();
		camera.applyMatrix(loadedCameraMatrix);
	}
	for(var i=0; i<colors.length; i++) {
		if(!colorAvailable[i])
			removePoint(colors[i].toString(16));
	}

	if(note.pins != '') {
		for(var i=0; i<pins.length; i+=3) {
			addPoint(new THREE.Vector3(parseFloat(pins[i]), parseFloat(pins[i+1]), parseFloat(pins[i+2])));
		}
	}
}

// drupal module interface
function media_model_append_saved_note(title, text, cam, pins, noteid){
	savedNotes.push({
		title: title,
		text: text,
		cam: cam,
		pins: pins,
		noteid: noteid
	});
}


function media_model_viewer(fid, oPaths, mPaths){
	mtlPaths = eval(mPaths);
	objPaths = eval(oPaths);
	fileId = fid;
	init();
	animate();
}

// window size management
var fs = false;
var fullscreenToggle = function() {
	if(fs=!fs) {
		jQuery(viewport).detach().prependTo('body');
		jQuery(viewport).css({
			top: 0,
			left: 0,
			height: '100%',
			width: '100%',
			overflow: 'hidden'
		});
		jQuery('#page-wrapper').hide();
		resetWindow(window.innerWidth, window.innerHeight);
    	camera.aspect = windowWidth/ windowHeight;
    	camera.updateProjectionMatrix();
		renderer.setSize( windowWidth, windowHeight );
	}
	else {
		jQuery(viewport).detach().prependTo(wrapper);
		jQuery(viewport).css({
			top: '',
			left: '',
			height: '',
			width: '',
			overflow: 'auto'
		});
		jQuery('#page-wrapper').show();
		resetWindow(defaultWindow.width, defaultWindow.height);
    	camera.aspect = windowWidth/ windowHeight;
    	camera.updateProjectionMatrix();
		renderer.setSize( windowWidth, windowHeight );
	}
}
window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize(){
	if(fs){
		windowWidth = window.innerWidth;
		windowHeight = window.innerHeight;
    	camera.aspect = windowWidth/ windowHeight;
    	camera.updateProjectionMatrix();
		renderer.setSize( windowWidth, windowHeight );
	}
}

function resetWindow(w, h){
	windowWidth = w;
	windowHeight = h;
	windowHalfX = windowWidth / 2;
	windowHalfY = windowHeight / 2;
}

jQuery(document).ready(function(){

	for(var i=0; i<savedNotes.length; i++){
		var li = document.createElement( 'li' );
		var id = 'media-model-note-' + i;
		li.id = id;
		li.innerHTML = '<a href="#">' + savedNotes[i].title + '</a>';
    //console.log(li);
    	jQuery('#media-model-saved-notes-root').append(li);
    	jQuery('#' + id).click(function() {
    		var index = jQuery(this).attr('id').replace('media-model-note-', '');
			jQuery('#media-model-load-notes-title').text(savedNotes[index].title);
			jQuery('#media-model-load-notes-note').text(savedNotes[index].text);
			jQuery('#media-model-load-notes-contains').text('No extra data');
			if(savedNotes[index].cam != '' && savedNotes[index].pins != '') {
				jQuery('#media-model-load-notes-contains').text('Contains camera and pin data');
			}
			else if (savedNotes[index].cam != '') {
				jQuery('#media-model-load-notes-contains').text('Contains camera data');
			}
			else if (savedNotes[index].pins != '') {
				jQuery('#media-model-load-notes-contains').text('Contains pin data');
			}
			jQuery('#media-model-load-notes-index').attr('class', index);
    	});
    //console.log(jQuery('#media-model-saved-notes-root'));
	}
	jQuery('#media-model-saved-notes-selector').click(function() {

	});
	//Mouse click on sub menu
	jQuery('.media-model-saved-notes-submenu').mouseup(function() {
		return false
	});

	//Mouse click on my account link
	jQuery('#media-model-saved-notes-selector').mouseup(function() {
		return false
	});

jQuery(document).ready(function(){
      var noteTitle = jQuery("#noteTitle"),
        noteText = jQuery("#noteText"),
        cam = jQuery("#cam"),
        pins = jQuery("#pins");
    jQuery( "#media-model-loadnote-form" ).dialog({
      autoOpen: false,
      height: 400,
      width: 600,
      modal: true,
      buttons: {
        "Load": function() {
          if(jQuery("#media-model-load-notes-contains").text()!="No extra data")
            loadNote(savedNotes[jQuery("#media-model-load-notes-index").attr("class")]);
          jQuery( this ).dialog( "close" );
        },
        Cancel: function() {
          jQuery( this ).dialog( "close" );
        }
      },
      close: function() {
      }
      });
      jQuery( "#media-model-addnote-form" ).dialog({
        autoOpen: false,
        height: 400,
        width: 600,
        modal: true,
        buttons: {
          "Add note": function() {
              //allFields.removeClass( "ui-state-error" );
              saveNote({
                title: noteTitle.val(),
                text: noteText.val(),
                cam: cam.is(":checked"),
                pins: pins.is(":checked")
              });
              noteTitle.val("");
              noteText.val("");
              //cam.prop("checked", false);
              //pins.prop("checked", false);
              jQuery( this ).dialog( "close" );
          },
          Cancel: function() {
            jQuery( this ).dialog( "close" );
          }
        },
        close: function() {
          //allFields.val( "" ).removeClass( "ui-state-error" );
        }
      });
    })
/*
	jQuery('.media-model-control-button').bind('mouseout', function(){
	  jQuery(viewport).trigger('mouseout');
	});
	jQuery('.media-model-control-button').bind('mouseout', function(){
	  jQuery(viewport).trigger('mouseout');
	});*/
	//Document Click
});

