var objPath, mtlPath, fileId, stats, fps, savedNotes = [];
var keyInput = null;

var pValues = location.search.replace('?', '').split(',');
if(pValues[pValues.length-1]=='')
	pValues.pop();

// moved this stuff outside so generateURL() (and saveNote()) could be run outside of the main function.
var camera, controls, helpOverlay, helpPrompt, lastDownTarget;
var rotRadius = 100, windowWidth = 800, windowHeight = 600, 
		windowHalfX = windowWidth / 2, windowHalfY = windowHeight / 2;
var pathControls, markerRoot = new THREE.Object3D(), URLButton, addNoteButton
		path = {
		markers: [],
		colorID: [],
		ui: [],
		distances: [],
		distance: {
			element: document.createElement( 'div' ),
			value: 0,
		},
		 markerGeometry: new THREE.CylinderGeometry( 0, 1, 4, 4, false ),
		 markerMaterial: new THREE.MeshPhongMaterial( { color : 0x0000FF , wireframe: true} ),
		 //lineMaterial: new THREE.MeshBasicMaterial( { color: 0x00FF00 } )
		 lineRibbon: new THREE.Ribbon( new THREE.Geometry(),  new THREE.MeshBasicMaterial( { color: 0xffffff, side: THREE.DoubleSide, vertexColors: true } ))
		};

var mouseDown = 0;

var FPSAvg = function(n){
	var lastNFrames = [], avg = 0, factor = 1/n;
	return{
		update:function(){
			lastNFrames.push(factor*fps);
			avg += lastNFrames[lastNFrames.length-1];
			if(lastNFrames.length>n) {
				avg -= lastNFrames.shift();
				return avg;
			}
			return null;
		}
	};
};

var container = document.createElement( 'div' );
container.id = 'media-model-wrapper';
container.name = 'Media Model Wrapper';
//document.addEventListener('mousedown', function(){++mouseDown;}, false);
//document.addEventListener('mouseup', function(){--mouseDown;}, false);

function media_model_viewer(fileId, objPaths, mtlPaths){
	mtlPaths = eval(mtlPaths);
	objPaths = eval(objPaths);
	console.log(objPaths);
	var viewport, ul, distancesLayer;

	//path.lineRibbon.geometry = path.lineGeometry;
	path.markerGeometry.computeBoundingSphere();

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


	init();
	animate();

	function init(){

		var parent = document.getElementById( 'file-'.concat(fileId) );
		parent.appendChild( container );

		helpOverlay = document.getElementsByClassName('media-model-help-overlay')[0];
		helpPrompt = document.getElementsByClassName('media-model-help-prompt')[0];
		// place our div inside of the parent file-nameed div
		viewport = document.createElement( 'div' );
		viewport.id = 'media-model-viewport';
		viewport.name = 'Media Model Viewport';
		viewport.appendChild( helpOverlay );
		jQuery(helpOverlay).hide();
		viewport.appendChild( helpPrompt );
		
		container.appendChild( viewport );

		pathControls = document.createElement( 'div' );
		pathControls.id = 'media-model-path-controls';

		var pathDistanceNode = document.createElement('span');
		pathDistanceNode.innerHTML = 'Path distance: <br>';
		pathDistanceNode.className = 'media-model-path-control-text';
		pathControls.appendChild(pathDistanceNode);

		path.distance.element.innerHTML = '0';
		path.distance.element.id = 'media-model-path-distance';
		pathControls.appendChild(path.distance.element);
		container.appendChild( pathControls );

		URLButton = document.createElement( 'button' );
		URLButton.className = 'media-model-path-control-button';
		URLButton.id = 'media-model-generate-url-button';
		URLButton.innerHTML = 'Generate URL';
		pathControls.appendChild(URLButton);
		jQuery('#media-model-generate-url-button')
			.click(function () {
  			window.prompt ('Copy this URL:', generateURL());
		});
		pathControls.appendChild(document.createElement('br'));

		loadNoteButton = document.createElement( 'button' );
		loadNoteButton.className = 'media-model-path-control-button';
		loadNoteButton.id = 'media-model-load-note-button';
		loadNoteButton.innerHTML = 'Load note from server';
		pathControls.appendChild(loadNoteButton);
		jQuery( '#media-model-load-note-button' )
      		.click(function() {
        	jQuery( '#media-model-loadnote-form' ).dialog( 'open' );
      	});

		addNoteButton = document.createElement( 'button' );
		addNoteButton.className = 'media-model-path-control-button';
		addNoteButton.id = 'media-model-save-note-button';
		addNoteButton.innerHTML = 'Save note to server';
		pathControls.appendChild(addNoteButton);
		jQuery( '#media-model-save-note-button' )
      		.click(function() {
        	jQuery( '#media-model-addnote-form' ).dialog( 'open' );
      	});

		//addNoteButton = jQuery('.media-model-save-note-button');
		//addNoteButton.appendTo('#media-model-path-controls');
		//document.removeChild(addNoteButton);
		//addNoteButton.addClass('media-model-path-control-button');
		//addNoteButton.html('Save note to server');
		pathControls.appendChild(document.createElement('br'));

		var markerListNode = document.createElement('span');
		markerListNode.innerHTML = 'Marker list: <br>';
		markerListNode.className = 'media-model-path-control-text';
		pathControls.appendChild(markerListNode);

		ul = document.createElement( 'ul' );
		ul.id = 'sortable';
		pathControls.appendChild(ul);
		jQuery(function(){
			jQuery( '#sortable' ).sortable({
				update: function(event,ui){
					rebuildPath(ui.item.context.parentNode.children);
				},
				out: function(event,ui){
					//console.log(ui.item.context.style.opacity);
					//removePoint(ui.item.context.id);
					ui.item.context.style.opacity = 0.4;
				},
				over: function(event,ui){
					ui.item.context.style.opacity = '';
				},
				stop: function(event,ui){
					ui.item.context.style.opacity = '';
				}
			});
			jQuery( '#sortable' ).mouseup(function(event){
				console.log(event);
				if(event.target.style.opacity == 0.4){
					removePoint(event.target.id);
				}
			});
			jQuery( '#sortable' ).disableSelection();
		});


		jQuery(viewport).bind('click mouseup mousedown', function(e) {
			if(e.which == 2 || e.which == 1){
				e.preventDefault();
				//e.stopPropagation();
				e.stopImmediatePropagation();
				return false;
			}
			return e;
		});

		//camera.far = 5;

		// create scene and establish lighting
		scene = new THREE.Scene();
		scene.name = 'scene';
		scene.add(path.lineRibbon);
		scene.add(markerRoot);

		// create camera and position it in scene
		camera = new THREE.PerspectiveCamera( 45, windowWidth / windowHeight, 1, 2000 );
		camera.position.z = rotRadius;
		scene.add( camera );

		controls = new THREE.MediaModelControls( camera, viewport );
		controls.addEventListener( 'change', render, false);	

		// one ambient light of darkish color
		var ambient = new THREE.AmbientLight( 0x130d00 );
		scene.add( ambient );

		// one directional light which will follow behind our camera to highlight what we view
		dirLight.position.set( 0, 0, 1 ).normalize();
		//dirLight.parent = camera;
		scene.add( dirLight );

		projector = new THREE.Projector();
		var loader = new THREE.OBJMTLLoader();
			//loader.addEventListener( 'complete', );
			loader.addEventListener( 'load', function ( event ) {
				var tmp = event.content;
				console.log(tmp);
				// because sometimes the .obj seems to contain multiple models
				// TODO: combine all models which are loaded in 
				for( var i = 0; i<tmp.children.length; i++ ){
					model.push( tmp.children[i] );
					model[i].name = "model";
					// we enable flipSided and doubleSided to try to render the back of our model
					//model[i].flipSided = true;
					//model[i].doubleSided = true;
	        		model[i].material.side = THREE.DoubleSide;

					console.log('Successfully loaded model portion ' + i + ', with ' + model[i].geometry.vertices.length +' vertices and ' + model[i].geometry.faces.length + ' faces.');
					model[i].geometry.computeBoundingSphere();
					model[i].geometry.computeBoundingBox();
					console.log('Bounding sphere radius of the geometry is ' + model[i].geometry.boundingSphere.radius);
					//model[i].material = new THREE.MeshLambertMaterial( { color : 0xFF0000 } );
					/*
					avgPos = new THREE.Vector3();
					for(var j = 0; j<model[i].geometry.faces.length; j++){
						avgPos.addSelf(model[i].geometry.faces[j].centroid);
					}
					avgPos.multiplyScalar(1.0/model[i].geometry.faces.length);
					*/
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
				cursor = new THREE.Vector3( model[0].position.x, model[0].position.y, model[0].position.y );
				if(pValues.length > 0)
					loadURLdata();
			});
			loader.load( objPaths.low ? objPaths.low : objPaths.default , mtlPaths.low);

		console.log('Starting with this obj: ');
		console.log(objPaths.low ? objPaths.low : objPaths.default);
		console.log('Starting with this mtl: ');
		console.log(mtlPaths.low);


		// markers are pyramids which will point to the location on the surface selected by the user
		/*
		point1Marker = new THREE.Mesh( pyramidGeometry, new THREE.MeshLambertMaterial( { color : 0x0000FF } ) );
		point2Marker = new THREE.Mesh( pyramidGeometry, new THREE.MeshLambertMaterial( { color : 0x0000FF } ) );
		scene.add( point1Marker );
		scene.add( point2Marker );
		// we hide them until points are selected
		point1Marker.visible = false;
		point2Marker.visible = false;
		*/

		// establish another pyramid, to follow the cursor and represent where the markers will appear
		cursorPyr = new THREE.Mesh( path.markerGeometry, new THREE.MeshLambertMaterial( { color : 0xFF00FF } ) );
		scene.add( cursorPyr );
				// a small positional light that will hug our cursor and approach the model
		cursorPyr.add( cursorPLight );
		cursorPLight.position.y = -20;

		// establish our renderer
		renderer = new THREE.WebGLRenderer();
		renderer.setSize( windowWidth, windowHeight );
		renderer.setClearColorHex( 0x8e8272, 1 );

		distancesLayer = document.createElement( 'div' );
		distancesLayer.id = 'distances-layer';
		viewport.appendChild( distancesLayer );

		viewport.appendChild( renderer.domElement );
		viewport.addEventListener( 'mousemove', onMouseMove, false );
		viewport.addEventListener( 'mousedown', onMouseDown, false );
		viewport.addEventListener( 'mouseup', onMouseUp, false );
		viewport.addEventListener( 'DOMMouseScroll', onMouseWheel, false );
		viewport.addEventListener( 'mousewheel', onMouseWheel, false );
		viewport.addEventListener( 'mouseover', onMouseOver, false);
		viewport.addEventListener( 'mouseout', onMouseOut, false);
		viewport.addEventListener( 'keydown', onKeyDown, false);

		//viewport.addEventListener( 'touchstart', touchStart, false);
		//viewport.addEventListener( 'touchmove', touchMove, false);
		//viewport.addEventListener( 'touchend', touchEnd, false);

		rebuildPath(ul.children);

		var modalMessage = document.createElement( 'div' );
		modalMessage.id = 'modal-message';
		modalMessage.innerHTML = '&nbsp'
		container.appendChild(modalMessage);

		stats = new Stats();
		stats.domElement.style.position = 'absolute';
		stats.domElement.style.top = '0px';
		stats.domElement.style.zIndex = 100;

		fpsAvg = new FPSAvg(100);

		viewport.appendChild( stats.domElement );
		jQuery(stats.domElement).toggle();
	} // end init

	function loadURLdata() {
		// you were reodering this function to take input the same way generate generates
		// gl 
		var i, loadedCameraMatrix = new THREE.Matrix4();
		pValues[0] = pValues[0].substr(pValues[0].indexOf('=')+1);
		for(i=0; i<pValues.length; i++)
			if(pValues[i].indexOf('markers=') != -1) {
				break;
			}
			else
				loadedCameraMatrix.elements[i]=parseFloat(pValues[i]);	
		camera.matrix.identity();
		camera.applyMatrix(loadedCameraMatrix);
		if(pValues[i] !='markers=') {
			pValues[i] = pValues[i].substr(pValues[i].indexOf('=')+1);
			while(i<pValues.length) {
				addPoint(new THREE.Vector3(parseFloat(pValues[i]), parseFloat(pValues[i+1]), parseFloat(pValues[i+2])));
				i+=3;
			}
		}
	}


	function rebuildPath(newOrder){
		scene.remove(path.lineRibbon);
		scene.remove(markerRoot);
		markerRoot = new THREE.Object3D();
		scene.add(markerRoot);

		//console.log(viewport.hasChildNodes());
		while(distancesLayer.hasChildNodes()){
			distancesLayer.removeChild(distancesLayer.lastChild);
		}
		var newRibbon = new THREE.Ribbon(new THREE.Geometry(), path.lineRibbon.material);
		var newMarkers = [];
		var newDistances = [];
		var newColorID = [];
		var oldIndex = -1, newIndex = -1;
		path.distance.value = 0;
		for(var i=0; i<newOrder.length; i++) {
			//if(newOrder[i].id == '') continue;
			newMarkers.push(path.markers[path.colorID.indexOf(newOrder[i].id)]);
			newColorID.push(newOrder[i].id);
			markerRoot.add(newMarkers[i].mesh);
			if(i>0) {
				newDistances.push({
					value: newMarkers[i-1].mesh.position.distanceTo(newMarkers[i].mesh.position),
					element: document.createElement( 'div' )
				});
				distancesLayer.appendChild(newDistances[i-1].element);
				newDistances[i-1].element.className = 'media-model-floating-distance-text';
				newDistances[i-1].element.innerHTML = newDistances[i-1].value.toFixed(2);
				

				path.distance.value += newDistances[i-1].value;
			}
			newRibbon.geometry.vertices.push( new THREE.Vector3().copy(newMarkers[i].mesh.position));
			newRibbon.geometry.vertices.push( new THREE.Vector3().copy(newMarkers[i].mesh.position).add(newMarkers[i].up));
			newRibbon.geometry.colors.push(new THREE.Color(parseInt(newColorID[i],16)));
			newRibbon.geometry.colors.push(new THREE.Color(parseInt(newColorID[i],16)));
		}
		path.distance.element.innerHTML = path.distance.value.toFixed(2) + '\n';
		repositionDistances();
		path.lineRibbon = newRibbon;
		path.markers = newMarkers;
		path.distances = newDistances;
		path.colorID = newColorID;
		//console.log('Old index is ' + oldIndex + ' and new index is ' + newIndex);
		//repositionDistances(i);
		scene.add(path.lineRibbon);

		currentURL = generateURL();
	}


	function animate() {
		controls.update();
		requestAnimationFrame( animate );
		render();
	}

	function repositionDistances() {
		for(var i=0; i<path.distances.length; i++){
			positionDistance(i);
		}
	}

	function positionDistance(i) {
		var screenPos = new THREE.Vector3().copy(path.markers[i].mesh.position).add(path.markers[i+1].mesh.position).multiplyScalar(0.5);
		projector.projectVector( screenPos, camera );
		screenPos.x = ( screenPos.x * windowHalfX ) + windowHalfX;
		screenPos.y = - ( screenPos.y * windowHalfY ) + windowHalfY * 1.3;
		if(screenPos.x > 0 && screenPos.x < windowWidth && screenPos.y > 0 && screenPos.y < windowHeight) {
			path.distances[i].element.style.left = screenPos.x + 'px';
			path.distances[i].element.style.top = screenPos.y + 'px';
			path.distances[i].element.style.visibility = 'visible';
		}
		else
			path.distances[i].element.style.visibility = 'collapse';
	}
	var normals;
	function render() {
		// displays all vertex normals from origin to direction
		/*
		if(model[0] && !normals){
		normals = [];
		if(model[0])
			for(var i=0; i<model[0].geometry.faces.length; i++){
				var line = new THREE.Line(new THREE.Geometry(), new THREE.MeshBasicMaterial({color: 0x00ff00}));
				line.geometry.vertices.push(new THREE.Vector3().copy(model[0].geometry.faces[i].centroid));
				line.geometry.vertices.push(new THREE.Vector3().copy(model[0].geometry.faces[i].centroid).add(new THREE.Vector3().copy(model[0].geometry.faces[i].normal).multiplyScalar(5)));
				normals.push(line);
				scene.add(line);
			}
		}
		*/

		if(keyInput != null) {
			switch(keyInput) {
				case 'h':
					jQuery(helpOverlay).toggle();
					jQuery(helpPrompt).toggle();
					break;
				case '`':
					jQuery(stats.domElement).toggle();
					break;
			}
			keyInput = null;
		}
		//console.log(scene.children);
		// check for cursor going over model
		if ( model.length > 0 ){
			repositionDistances();
			var vector = new THREE.Vector3(mouse3D.x, mouse3D.y, 1);
			projector.unprojectVector( vector, camera );
			var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
			var modelIntersects = ray.intersectObjects(model);
			var markerIntersects = ray.intersectObject(markerRoot, true);
			//console.log(intersects);

			if(modelIntersects.length > 0
				&& (markerIntersects == 0 || modelIntersects[0].point.distanceTo(camera.position) < markerIntersects[0].point.distanceTo(camera.position))) {
				cursor.copy( modelIntersects[0].point );
				cursorPyr.visible = true;
				highlighted = true;
			}
			else if (markerIntersects.length > 0
				&& (modelIntersects == 0 || modelIntersects[0].point.distanceTo(camera.position) > markerIntersects[0].point.distanceTo(camera.position))) {
				cursorPyr.visible = false;
				cursor.copy( markerIntersects[0].object.position);
				highlighted = true;
			}
			else{
				highlighted = false;
			}

		}
		renderer.render( scene, camera );
		stats.update();
		fpsAvg.update();
	}

	function removePoint( colorID ){
		for( var i=0; i<ul.children.length; i++) {
			if(ul.children[i].id==colorID){
				jQuery('#'+colorID).remove();
    			jQuery('#'+colorID).sortable('destroy'); //call widget-function destroy
    			jQuery('.ui-sortable-placeholder').remove();
				colorAvailable[colors.indexOf(parseInt(colorID, 16))] = true;
				break;
			}
		}
		console.log(ul.children);
		console.log('Removed ' + colorID + ' from the set.');
		rebuildPath(ul.children);
	}

	function addPoint(location) {
		var color = colorChooser();
		if(color==false) return;
		var markerMaterial = new THREE.MeshPhongMaterial();
		markerMaterial.color = color;
		path.colorID.push( color.getHexString() );
		path.markers.push( { 	
				mesh: new THREE.Mesh(path.markerGeometry, markerMaterial),
				up: new THREE.Vector3()
			});
		var index = path.markers.length-1;
		markerRoot.add(path.markers[index].mesh);
		//path.markers[path.markers.length - 1].mesh.position.set(cursor.x, cursor.y, cursor.z);
		path.markers[index].up = orientPyramid(path.markers[index].mesh, location);

		var li = document.createElement( 'li' );
		li.className = 'marker-button';
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
		//model[0].visible = false;
	}

	var lastMouseDown = new Date().getTime();
	function onMouseDown( event ) {
		//console.log(event);
	 if( event.which == 1 ){
		mouse1Down = true;
			var newMouseDown = new Date().getTime();
			// check for double click -- currently if two clicks are within 250ms, we consider it a double click
			if( newMouseDown - lastMouseDown < 250 ){
				addPoint(cursor);
			}
			lastMouseDown =  new Date().getTime();
		}
	}
	function touchStart ( event ) {
		
	}

	function onKeyDown ( event ) {
		console.log(event);
	}

	function onMouseMove( event ) {
		if ( !event.altKey && rotating ) {
				rotating = false;
				controls.state = -1;
				controls.center = new THREE.Vector3();
		}
		// don't do anything unless we have a model loaded!
		if( model[0] && !rotating){
			//var cursorPyrUp = new THREE.Vector3();
			orientPyramid( cursorPyr, cursor);
		}
		if( mouse.x && mouse.y ){
			var dx = mouse.x - event.offsetX;
			var dy = mouse.y - event.offsetY;
			if( event.which == 1 ){
				if( event.altKey && !rotating ) {
					rotating = true;
					controls.center = cursorPyr.position;
				}
				else{
					camera.rotation.x += dy * 0.002;
					camera.rotation.y += dx * 0.002;
				}
			}
			else if( event.which == 2 ){
				//var forwardVector = new THREE.Vector3(mouse3D.x, mouse3D.y, 1);
				//projector.unprojectVector(forwardVector, camera);
				//forwardVector.normalize();
				panCamera(dx, dy);
			}
		}
		// update our known 2d/3d mouse coordinates
		mouse.x = event.offsetX;
		mouse.y = event.offsetY;
		mouse3D.x = ( event.offsetX / windowWidth ) * 2 - 1;
		mouse3D.y = - ( event.offsetY / windowHeight ) * 2 + 1;
	}
	function touchMove ( event ){
		
	}

	function onMouseUp( event ) {
	}

	function touchEnd ( event ){
		
	}

	function onMouseOver( event ){
		cursorPyr.visible = true;
	}

	function onMouseOut( event ){
		cursorPyr.visible = false;
	}

	function onMouseWheel( event ){
		// don't let the window scroll away!
		event.preventDefault();
		// we want a direction vector which points inside from the location of the camera
		var direction = new THREE.Vector3();
		direction.copy( cursor );
		// we use model[0] since it seems to contain "most" of the model data
		direction.sub( camera.position );
		if((direction.lengthSq() > 100 || event.wheelDelta < 0)
		 	&& (direction.lengthSq() < 1000000 || event.wheelDelta > 0)) {
			direction.normalize();
			direction.multiplyScalar( windowWidth / 100 * event.wheelDelta / ( Math.abs( event.wheelDelta ) ) );
			camera.position.add(direction);
		}
		
	}

	jQuery(container).disableSelection();
	jQuery(viewport).disableSelection();
	jQuery(pathControls).disableSelection();

	function orientPyramid(pyramid, location){
		var closestFaceIndex;
		closestFaceIndex = 0;
		// iterate over our model's faces to try to locate the nearest centroid
		for( var i = 1; i < model[0].geometry.faces.length; i++ ){
			if( location.distanceTo(model[0].geometry.faces[closestFaceIndex].centroid) > location.distanceTo(model[0].geometry.faces[i].centroid) )
				closestFaceIndex = i;
		}
		// move pyramid to our cursor's location
		// pyramid here is most likely cursorPyr
		pyramid.position.copy( location );
		var pyramidUp = new THREE.Vector3();
		// begin our up vector as a copy of the closest face's normal
		pyramidUp.copy( model[0].geometry.faces[closestFaceIndex].normal );
		// we cross the up vector with -1,0,0 so the pyramid points in the direction we want it to (on to the model)

		pyramidUp.multiplyScalar( pyramid.geometry.boundingSphere.radius/2 );
		// and add it to the pyramid's position
		//pyramid.position.add( pyramidUp );

		pyramid.lookAt( location );
		pyramid.rotation.x -= Math.PI/2;
		return pyramidUp;
	}


	var rotationY = new THREE.Matrix4();
	var rotationX = new THREE.Matrix4();
	var translation = new THREE.Matrix4();
	var translationInverse = new THREE.Matrix4();
	var matrix = new THREE.Matrix4();

	function rotateAroundWorldAxis( object, axis, radians ) {

    var rotationMatrix = new THREE.Matrix4();

    rotationMatrix.makeRotationAxis( axis.normalize(), radians );
    rotationMatrix.multiply( object.matrix );                       // pre-multiply
    object.matrix = rotationMatrix;
    object.rotation.setEulerFromRotationMatrix( object.matrix );
	}

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

	function rotateVectorForObject( vector, matrix){
		return new THREE.Vector3().copy(vector).applyMatrix4(matrix).sub(new THREE.Vector3(0,0,0).applyMatrix4(matrix));
	}
	function rotateVectorByEuler(vector, x, y, z){
		vector.applyMatrix4( new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1,0,0), x));
		vector.applyMatrix4( new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0,1,0), y));
		vector.applyMatrix4( new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0,0,1), z));
		vector.x *= -1;
		vector.y *= -1;
	}

	function colorChooser(color) {
		for(var i=0; i<colors.length; i++) {
			if(colorAvailable[i]){
				colorAvailable[i] = false;
				return new THREE.Color(colors[i]);
			}
		}
		return false;
	}


	function removeButtonColor(color){

	}

	function adjustColor(color, value) {
	    var digits = /(.*?)rgb\((\d+), (\d+), (\d+)\)/.exec(color);
	    
	    var red = Math.min(parseInt(digits[2])+value,255);
	    var green = Math.min(parseInt(digits[3])+value,255);
	    var blue = Math.min(parseInt(digits[4])+value,255);
	    
	    return 'rgb(' + red + ', ' + green + ', ' + blue + ')';
	}

	function loadNote(note){
		var loadedCameraMatrix = new THREE.Matrix4(),
			cam = note.cam.split(','),
			markers = note.markers.split(',');
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

		if(note.markers != '') {
			for(var i=0; i<markers.length; i+=3) {
				addPoint(new THREE.Vector3(parseFloat(markers[i]), parseFloat(markers[i+1]), parseFloat(markers[i+2])));
			}
		}
	}

	jQuery( '#media-model-loadnote-form' ).dialog({
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
		}
	});
}

function generateURL() {
	var URL = location.origin + location.pathname + '?' + 'cam=';
	for(var i=0; i<16; i++) {
		URL += camera.matrixWorld.elements[i].toPrecision(7) + ',';
	}
	URL += 'markers=';
	for(var i=0; i<path.markers.length; i++) {
		URL += path.markers[i].mesh.position.x.toPrecision(7) + ','
			+ path.markers[i].mesh.position.y.toPrecision(7) + ',' 
			+ path.markers[i].mesh.position.z.toPrecision(7) + ',';
	}
	return URL;
}

function saveNote(formResults) {
	var urlData = generateURL().replace('cam=', '');
	urlData = urlData.substr(urlData.indexOf('?')+1).split('markers=');

	fid = location.pathname.substr(location.pathname.lastIndexOf('/')+1);

	var data = {
			fid: fid,
			title: formResults.title,
			text: formResults.text,
			cam: (formResults.cam ? urlData[0] : null),
			markers: (formResults.markers ? urlData[1] : null),
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

// we use this to prevent selection of our distance text
// highlighting text would prevent functionality
jQuery.fn.extend({ 
	disableSelection : function() { 
		return this.each(function() { 
			this.onselectstart = function() { return false; }; 
			this.unselectable = "on"; 
			jQuery(this).css('user-select', 'none'); 
			jQuery(this).css('-o-user-select', 'none'); 
			jQuery(this).css('-moz-user-select', 'none'); 
			jQuery(this).css('-khtml-user-select', 'none'); 
			jQuery(this).css('-webkit-user-select', 'none'); 
		}); 
	} 
}); 

function media_model_append_saved_note(title, text, cam, markers, noteid){
	savedNotes.push({
		title: title,
		text: text,
		cam: cam,
		markers: markers,
		noteid: noteid
	});
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
			if(savedNotes[index].cam != '' && savedNotes[index].markers != '') {
				jQuery('#media-model-load-notes-contains').text('Contains camera and marker data');
			}
			else if (savedNotes[index].cam != '') {
				jQuery('#media-model-load-notes-contains').text('Contains camera data');
			}
			else if (savedNotes[index].markers != '') {
				jQuery('#media-model-load-notes-contains').text('Contains marker data');
			}
			jQuery('#media-model-load-notes-index').attr('class', index);
    	});
    //console.log(jQuery('#media-model-saved-notes-root'));
	}
	jQuery('#media-model-saved-notes-selector').click(function() {
	//	if(jQuery(this).attr('class') == 'hidden') {
			//jQuery('.media-model-saved-notes-submenu').show();
			//jQuery(this).attr('class', 'visible'); 
	//	}
	//	else {
	//		jQuery('.media-model-saved-notes-submenu').hide();
	//		jQuery(this).attr('class', 'hidden'); 
	//	}
	});
	//Mouse click on sub menu
	jQuery('.media-model-saved-notes-submenu').mouseup(function() {
		return false
	});

	//Mouse click on my account link
	jQuery('#media-model-saved-notes-selector').mouseup(function() {
		return false
	});

	//Document Click
	jQuery(document).mouseup(function() {
		//jQuery('.media-model-saved-notes-submenu').hide();
		//jQuery('#media-model-saved-notes-selector').attr('class', 'hidden');
	});

	document.addEventListener('keydown', function (event) {
		switch(event.keyCode){
			case 72: 
				keyInput = 'h';
				break;
			case 192:
				keyInput = '`';
				break;
		}
	}, false);
});