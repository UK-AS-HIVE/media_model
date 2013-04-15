var objPaths, mtlPaths, fileId, savedNotes = [], 
	qh, ph,
	paths = [],
	modelLoaded = false, highlighted = false, rotating = false,
	helpOverlay, helpPrompt, 
	viewport, distancesLayer,
	controls, guiControls, leftButtons, centerIcon, rightButtons,
	URLButton, saveNoteButton, loadNoteButton, colorButton, modeButton, editNoteButton, fsButton,
	wrapper = document.createElement('div'),
	defaultWindow = {width: 800, height: 600},
	windowWidth, windowHeight, windowHalfX, windowHalfY,
	camComponents = {
		up: new THREE.Vector3(),
 		right: new THREE.Vector3()
 	};

wrapper.id = 'media-model-wrapper';
wrapper.name = 'Media Model Wrapper';

var pValues = location.search.replace('?', '').split(',');
if(pValues[pValues.length-1]=='')
	pValues.pop();

var dirLight = new THREE.DirectionalLight( 0xC8B79D );
var camera, scene, projector, renderer;

var model = [];

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

// helper objects
var protopin = {
	geometry: new THREE.CylinderGeometry( 0, 1, 4, 4, false ),
	material: new THREE.MeshPhongMaterial( { color : new THREE.Color(0xfffff)} )
};

protopin.geometry.computeBoundingSphere();

var PinHandler = function(){
	var cursor = new THREE.Vector3( model.position.x, model.position.y, model.position.y );
	var color = new THREE.Color();
	// establish another pin, to follow the cursor and represent where the pins will appear
	var pin = { 
		mesh:new THREE.Mesh( protopin.geometry, new THREE.MeshLambertMaterial( { color : 0xFF00FF } ) ),
		cursorPos: new THREE.Vector3(),
		up: new THREE.Vector3()
	}
	scene.add( pin.mesh );
	// a small positional light that will hug our cursor and approach the model
	var pl = new THREE.PointLight( 0xffffff, 1, 1000 );
	pin.mesh.add( pl );
	pl.position.y = -20;
	var  path, grabbed, up, moving = false;
	var target = { index: 0, pin: null, path: null, up: new THREE.Vector3()};
	return{
		moving: moving,
		target: target,
		cursor: cursor,
		color: color,
		pin: pin,
		path: path,
		setPath:function(path){
			centerIcon.style.backgroundColor = '#'+path.color.getHexString();
			this.path = path;
			this.color = path.color;
			//this.pin.mesh.material.color = this.color;
			centerIcon.innerHTML = path.typeName();
		},
		setObject:function(path, index){
			//selectedObject.scale.set(1.6, 1.6, 1.6);
			this.target.path = path;
			this.target.index = index
			this.target.pin = path.pins[index];
			//this.target.up.copy(path.pins[index].up);
			//this.color = path.color;
			//this.mesh.scale.set(1.6, 1.6, 1.6);
			//domObject = document.getElementById(this.object.name);
		},
		update:function(){

			var vector = new THREE.Vector3().copy(controls.mouse3D());
			projector.unprojectVector( vector, camera );
			var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
			var modelIntersects = ray.intersectObject(model);
			var pinIntersects, i;
			for(i=0; i<paths.length;i++){
				paths[i].repositionDistances();
				pinIntersects = ray.intersectObject(paths[i].pinRoot, true);
				if(pinIntersects.length>0)
					break;
			}
			//console.log(modelIntersects);
			//console.log(pinIntersects);
			//console.log(vector.sub(camera.position).normalize().x+", "+vector.sub(camera.position).normalize().y+", "+vector.sub(camera.position).normalize().z);
			if(modelIntersects &&  modelIntersects[0] &&  modelIntersects[0].point )
				this.cursor.copy( modelIntersects[0].point );

			if(modelIntersects.length > 0
				&& (pinIntersects == 0 || modelIntersects[0].point.distanceTo(camera.position) < pinIntersects[0].point.distanceTo(camera.position))) {
				this.clear();
				highlighted = true;
			}
			else if (pinIntersects.length > 0
				&& (modelIntersects == 0 || modelIntersects[0].point.distanceTo(camera.position) > pinIntersects[0].point.distanceTo(camera.position))) {
				this.pin.mesh.visible = false;
				this.setObject(paths[i], pinIntersects[0].object.id);
					//function(e){ jQuery.grep(paths[i].pins, return e.mesh.id === pinIntersects[0].object.id; }));
				highlighted = true;
			}
			else{
				highlighted = false;
				ph.clear();
			}

			if(this.target.pin)
				if(this.grabbed){
					for(var i=0;i<paths.length;i++){
						if(paths[i].color.getHexString() === this.target.pin.mesh.material.color.getHexString())
							this.setPath(paths[i]);
					}
					//this.pin.material.color = this.path.color;
					//this.target.index = index
					//this.target.mesh = path.pins[index].mesh;
					//this.target.up.copy(path.pins[index].up);
					if(this.moving){
						orientPin(this.target.pin, this.cursor);
						//this.target.mesh.position.set(this.cursor.x, this.cursor.y, this.cursor.z);
						this.path.rebuildPath();
						this.moving = false;
					}
				}
				else{//console.log('spin');
					rotateAroundWorldAxis(this.target.pin.mesh, this.target.pin.up, 0.05);
				}
		},
		clear:function(){
			if(!this.grabbed){
				this.pin.mesh.visible = true;
				return (this.target.pin = null);
			}
		}
	}
}

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

var QualityHandler = function(modObjs, modMtls, modNmls){
	var mtlLoad = new Load(modObjs), objLoad = new Load(modMtls), nmlLoad = new Load(modNmls), fpsAvg = new FPSAvg(100);
	var material, object;
	return{
		objLoad: objLoad,
		mtlLoad: mtlLoad,
		nmlLoad: nmlLoad,
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
					var result = THREE.ImageUtils.loadTexture(mtlLoad.next().path.replace('.mtl', '.jpg'), {}, function() {
						console.log('Successfully loaded ' + mtlLoad.next().name + ' quality material');
						model.material.map = result;
						model.material.map.anisotropy = renderer.getMaxAnisotropy();
						console.log('Enabled anisotropy x' + renderer.getMaxAnisotropy() + ', maximum for this renderer');
						model.material.needsUpdate = true;
						console.log('Swapped for ' + mtlLoad.next().name + ' quality material');
						mtlLoad.loading = false;
						mtlLoad.quality = QUALITY[mtlLoad.quality.value+1];
					});
				}
				if(!nmlLoad.loading && nmlLoad.next().path) {
					console.log('FPS is stable, attempting to download ' + nmlLoad.next().name + ' quality normal map');
					nmlLoad.loading = true;
					var result = THREE.ImageUtils.loadTexture(nmlLoad.next().path, {}, function() {
						console.log('Successfully loaded ' + nmlLoad.next().name + ' quality normal map');
						model.material.normalMap = result;
						model.material.needsUpdate = true;
						console.log('Swapped for ' + nmlLoad.next().name + ' quality normal map');
						nmlLoad.loading = false;
						nmlLoad.quality = QUALITY[nmlLoad.quality.value+1];
					});
				}
			}

		}
	};

};

function init(){
	for(var i=0;i<colors.length;i++)
		paths.push(new THREE.MediaModelPath(colorChooser()));

	container = document.getElementById( 'file-'.concat(fileId) );
	jQuery(container).prepend(wrapper);
	defaultWindow = {width: jQuery(wrapper).width(), height: jQuery(wrapper).height() };
	resetWindow(defaultWindow.width, defaultWindow.height);

	helpOverlay = document.getElementsByClassName('media-model-help-overlay')[0];
	helpPrompt = document.getElementsByClassName('media-model-help-prompt')[0];


	guiControls = document.createElement( 'div' );
	guiControls.id = 'media-model-gui-controls';

	leftButtons = document.createElement( 'div' );
	leftButtons.id = 'media-model-left-buttons';
	guiControls.appendChild(leftButtons);
	rightButtons = document.createElement( 'div' );
	rightButtons.id = 'media-model-right-buttons';
	guiControls.appendChild(rightButtons);
	centerIcon = document.createElement( 'span' );
	centerIcon.id = 'media-model-center-icon';
	//centerIcon.innerHTML = 'Line';
	guiControls.appendChild(centerIcon);

	viewport = document.createElement( 'div' );
	viewport.id = 'media-model-viewport';
	viewport.name = 'Media Model Viewport';
	jQuery(helpOverlay).hide();

	URLButton = document.createElement( 'button' );
	URLButton.className = 'media-model-control-button';
	URLButton.id = 'media-model-url-button';
	URLButton.innerHTML = 'Generate URL';
	leftButtons.appendChild(URLButton);

	loadNoteButton = document.createElement( 'button' );
	loadNoteButton.className = 'media-model-control-button';
	loadNoteButton.id = 'media-model-load-note-button';
	loadNoteButton.innerHTML = 'Load annotation from server';
	leftButtons.appendChild(loadNoteButton);

/*
	saveNoteButton = document.createElement( 'button' );
	saveNoteButton.className = 'media-model-control-button';
	saveNoteButton.id = 'media-model-save-note-button';
	saveNoteButton.innerHTML = 'Save note to server';
	leftButtons.appendChild(saveNoteButton);
*/
	colorButton = document.createElement( 'button' );
	colorButton.className = 'media-model-control-button';
	colorButton.id = 'media-model-color-button';
	colorButton.innerHTML = 'Switch color';
	rightButtons.appendChild(colorButton);

	modeButton = document.createElement( 'button' );
	modeButton.className = 'media-model-control-button';
	modeButton.id = 'media-model-mode-button';
	modeButton.innerHTML = 'Switch mode';
	rightButtons.appendChild(modeButton);
	
	editNoteButton = document.createElement( 'button' );
	editNoteButton.className = 'media-model-control-button';
	editNoteButton.id = 'media-model-edit-note-button';
	editNoteButton.innerHTML = 'Save/edit annotation';
	rightButtons.appendChild(editNoteButton);

	fsButton = document.createElement( 'button' );
	fsButton.className = 'media-model-control-button';
	fsButton.id = 'media-model-fs-button';
	fsButton.innerHTML = 'Fullscreen';
	rightButtons.appendChild(fsButton);

//modeButton, editNoteButton, fsButton,
	viewport.appendChild( helpOverlay );
	viewport.appendChild( helpPrompt );
	wrapper.appendChild( viewport );
	viewport.appendChild( guiControls );

	// create scene and establish lighting
	scene = new THREE.Scene();
	scene.name = 'scene';

	// create camera and position it in scene
	camera = new THREE.PerspectiveCamera( 45, windowWidth / windowHeight, 1, 2000 );
	camera.position.z = 100;
	scene.add( camera );

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
			if(pValues.length > 0)
				loadURLdata();
	
			controls = new THREE.MediaModelControls( camera, viewport );
			controls.addEventListener( 'change', render, false);	

			qh = new QualityHandler(objPaths.low, mtlPaths.low, nmlPaths.default);
			qh.mtlLoad.default.path = mtlPaths.default;
			qh.mtlLoad.low.path = mtlPaths.low;
			qh.mtlLoad.med.path = mtlPaths.med;
			qh.mtlLoad.high.path = mtlPaths.high;
			qh.objLoad.default.path = objPaths.default;
			qh.objLoad.low.path = objPaths.low;
			//qh.objLoad.med.path = objPaths.med;
			//qh.objLoad.high.path = objPaths.high;
			qh.nmlLoad.default.path = nmlPaths.default;
			qh.nmlLoad.low.path = nmlPaths.low;
			qh.nmlLoad.med.path = nmlPaths.med;
			qh.nmlLoad.high.path = nmlPaths.high;

			ph = new PinHandler();
			paths.push(new THREE.MediaModelPath(colorChooser()));
			ph.setPath(paths[0]);

			modelLoaded = true;
		});
		loader.load( objPaths.low ? objPaths.low : objPaths.default, mtlPaths.low ? mtlPaths.low : mtlPaths.default);

	console.log('Loading the following obj: ');
	console.log(objPaths.low ? objPaths.low : objPaths.default);
	console.log('Loading the following mtl: ');
	console.log(mtlPaths.low ? mtlPaths.low : mtlPaths.default);


	// establish our renderer
	renderer = new THREE.WebGLRenderer();
	renderer.setSize( windowWidth, windowHeight );
	renderer.setClearColorHex( 0x8e8272, 1 );

	distancesLayer = document.createElement( 'div' );
	distancesLayer.id = 'media-model-distances-layer';
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

	var modalMessage = document.createElement( 'div' );
	modalMessage.id = 'modal-message';
	modalMessage.innerHTML = '&nbsp'
	container.appendChild(modalMessage);
} // end init

function animate() {
	if(controls) controls.update();
	requestAnimationFrame( animate );
	render();
}
function render() {
	//console.log(scene.children);
	// check for cursor going over model
	renderer.render( scene, camera );
	if(ph) ph.update();
	if(qh) qh.update();
}

jQuery(wrapper).disableSelection();
jQuery(viewport).disableSelection();
jQuery(guiControls).disableSelection();
jQuery(centerIcon).disableSelection();
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
	pin.mesh.position.copy( location );
	var pinUp = new THREE.Vector3();
	// begin our up vector as a copy of the closest face's normal
	pinUp.copy( model.geometry.faces[closestFaceIndex].normal );
	// we cross the up vector with -1,0,0 so the pin points in the direction we want it to (on to the model)
	pin.up.copy(pinUp);

	pinUp.multiplyScalar( protopin.geometry.boundingSphere.radius/2 );
	// and add it to the pin's position
	pin.mesh.position.add( pinUp );

	pin.mesh.lookAt( location );
	pin.mesh.rotation.x -= Math.PI/2;
	pin.cursorPos.copy( location );
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

function colorName(color) {
	if(color === paths[0].color)
		return 'RED';
	else if(color === paths[1].color)
		return 'ORANGE';
	else if(color === paths[2].color)
		return 'YELLOW';
	else if(color === paths[3].color)
		return 'GREEN';
	else if(color === paths[4].color)
		return 'BLUE';
	else if(color === paths[5].color)
		return 'INDIGO';
	else if(color === paths[6].color)
		return 'VIOLET';
}

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
	var i=0, loadedCameraMatrix = new THREE.Matrix4();
	if(pValues[i].indexOf('cam=') == 0){
		pValues[0] = pValues[0].substr(pValues[0].indexOf('=')+1);
		for(i=0; i<loadedCameraMatrix.elements.length; i++)
			loadedCameraMatrix.elements[i]=parseFloat(pValues[i]);	
		camera.matrix.identity();
		camera.applyMatrix(loadedCameraMatrix);
	}
	var index = 0;
	var input = true;
	var pathType;
	if(!pValues[i] || pValues[i].indexOf('paths') != 0)
		return;
	do{
		pathType = pValues[i].substr(pValues[i].indexOf('-')+1, 1);
		//console.log('YEAH'+pathType);
		pValues[i] = pValues[i].substr(('paths['+index+'-'+pathType+']=').length);
		do{
			console.log(''+parseFloat(pValues[i])+','+parseFloat(pValues[i+1])+','+parseFloat(pValues[i+2])+'');
			paths[index].addPin(new THREE.Vector3(parseFloat(pValues[i]), parseFloat(pValues[i+1]), parseFloat(pValues[i+2])));
			i+=3;
		}while(i<pValues.length && pValues[i].indexOf('paths') )
		if(pathType === 'p')
			paths[index].setType('POINT');
		else if(pathType === 'l')
			paths[index].setType('LINE');
		else if(pathType ==='o')
			paths[index].setType('POLYGON');
		index++;
		//i++;
	}while(i<pValues.length);
}

function generateURL() {
	var URL = location.origin + location.pathname + '?' + 'cam=';
	for(var i=0; i<16; i++) {
		URL += camera.matrixWorld.elements[i].toPrecision(7) + ',';
	}
	for(var i=0; i<paths.length; i++){
		if(paths[i].pins.length<1) continue;
		URL += 'paths['+ i + '-'+paths[i].type()+']=';
		for(var j=0; j<paths[i].pins.length; j++) {
			URL += paths[i].pins[j].cursorPos.x.toPrecision(7) + ','
				+ paths[i].pins[j].cursorPos.y.toPrecision(7) + ',' 
				+ paths[i].pins[j].cursorPos.z.toPrecision(7) + ',';
		}
	}
	return URL;
}

function saveNote(formResults) {
	/*

	          saveNote({
	            title: noteTitle.val(),
	            note: noteText.val(),
	            path: pathSelect.val()
	          });	
*/

	var cam = "", pins = "", pathIndex = formResults.pathIndex;
	for(var i=0; i<16; i++) {
		cam += camera.matrixWorld.elements[i].toPrecision(7) + ',';
	}

	for(var j=0; j<paths[pathIndex].pins.length; j++) {
		pins += paths[pathIndex].pins[j].cursorPos.x.toPrecision(7) + ','
			+ paths[pathIndex].pins[j].cursorPos.y.toPrecision(7) + ',' 
			+ paths[pathIndex].pins[j].cursorPos.z.toPrecision(7) + ',';
	}

	return URL;

	fid = location.pathname.substr(location.pathname.lastIndexOf('/')+1);

	var data = {
			fid: fid,
			title: formResults.title,
			text: formResults.note,
			cam: urlData[0],
			pins: urlData[1],
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
	console.log(note);
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
			removePin(colors[i].toString(16));
	}

	if(note.pins != '') {
		for(var i=0; i<pins.length; i+=3) {
			addPin(new THREE.Vector3(parseFloat(pins[i]), parseFloat(pins[i+1]), parseFloat(pins[i+2])));
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


function media_model_viewer(fid, oPaths, mPaths, nPaths){
	mtlPaths = eval(mPaths);
	objPaths = eval(oPaths);
	nmlPaths = eval(nPaths);
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

function editNoteMenu(){
	var pathSelect = document.getElementById( 'media-model-path-select' );
	for(var i=0;i<paths.length;i++){
		if(paths[i].pins.length<1) continue;
		var pathDomElement = document.createElement( 'option' );
		pathDomElement.value = i;
		pathDomElement.className = 'media-model-path-selector';
		pathDomElement.innerHTML = colorName(paths[i].color) + ' ' + paths[i].typeName() + '(' + paths[i].pins.length + ')';
		//pathDomElement.style.backgroundColor = '#'+paths[i].color.getHexString();
		pathSelect.appendChild(pathDomElement);
		if(paths[i] === ph.path){
			jQuery(pathSelect).val(i);
			jQuery('#media-model-edit-note-text').val(paths[i].note);
			jQuery('#media-model-edit-note-title').val(paths[i].title);
		}
	}
	controls.toggleModal(true);
    //label = jQuery('label[for=media-model-edit-note-text]');
    //label.text('Annotate the '+colorName(ph.path.color)+' '+ph.path.typeName()+', or just the model');
    jQuery( '#media-model-edit-note-form').dialog( 'open' );
}


function loadNoteMenu(){
	controls.toggleModal(true);
	jQuery( '#media-model-load-note-form' ).dialog( 'open' );
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

   var noteTitle = jQuery('#media-model-edit-note-title'),
    	noteText = jQuery('#media-model-edit-note-text'),
     	pathSelect = jQuery('#media-model-path-select'),
        cam = jQuery('#media-model-edit-cam'),
        pins = jQuery('#media-model-edit-pins'),
        toServer = jQuery('#media-model-edit-to-server');
    jQuery( '#media-model-load-note-form' ).dialog({
      autoOpen: false,
      height: 400,
      width: 600,
      modal: true,
      buttons: {
        'Load': function() {
          if(jQuery('#media-model-load-notes-contains').text()!='No extra data')
            loadNote(savedNotes[jQuery('#media-model-load-notes-index').attr('class')]);
          jQuery( this ).dialog( 'close' );
        },
        Cancel: function() {
          jQuery( this ).dialog( 'close' );
        }
      },
      close: function() {
		controls.toggleModal(false);
      }
      });  
    jQuery( '#media-model-edit-note-form' ).dialog({
      autoOpen: false,
      height: 400,
      width: 600,
      modal: true,
      buttons: {
        'Save and continue': function() {
        	if(toServer.is(':checked')){
	          saveNote({
	            title: noteTitle.val(),
	            note: noteText.val(),
	            pathIndex: pathSelect.val()
	          });	
        	}
          ph.path.note = noteText.val();
          jQuery( this ).dialog( 'close' );
        },
        Cancel: function() {
          jQuery( this ).dialog( 'close' );
        }
      },
      close: function() {
        noteText.val('');
        noteTitle.val('');
      	//noteText.val('');
		controls.toggleModal(false);
      }
      });
    jQuery('#media-model-path-select').change(
    	function(){
    		var pathIndex = jQuery(this).val();
			jQuery('#media-model-edit-note-text').val(paths[pathIndex].note);
			jQuery('#media-model-edit-note-title').val(paths[pathIndex].title);
    	}
    );
    /*
      jQuery( '#media-model-save-note-form' ).dialog({
        autoOpen: false,
        height: 400,
        width: 600,
        modal: true,
        buttons: {
          'Save and continue': function() {
              saveNote({
                title: noteTitle.val(),
                note: noteText.val(),
                path: pathSelect.val(),
                cam: cam.is(':checked'),
                pins: pins.is(':checked')
              });
              noteText.val('');
              noteTitle.val('');
                            //cam.prop('checked', false);
              //pins.prop('checked', false);
              jQuery( this ).dialog( 'close' );
          },
          Cancel: function() {
            jQuery( this ).dialog( 'close' );
          }
        },
        close: function() {
        	jQuery(cam).attr('checked', true);
        	jQuery(pins).attr('checked', true);
            noteTitle.val('');
			var pathSelect = document.getElementById( 'media-model-path-select' );
			var pathCount = pathSelect.children.length-1;
			for(var i=0;i<pathCount;i++){
				pathSelect.removeChild(pathSelect.lastChild);
			}
		controls.toggleModal(false);
        	//console.log('Submitted?');
          //allFields.val( '' ).removeClass( 'ui-state-error' );
        }
      });*/
/*
	jQuery('.media-model-control-button').bind('mouseout', function(){
	  jQuery(viewport).trigger('mouseout');
	});
	jQuery('.media-model-control-button').bind('mouseout', function(){
	  jQuery(viewport).trigger('mouseout');
	});*/
	//Document Click
});

