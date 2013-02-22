var objPath, mtlPath, fileId;

function media_model_viewer(objPath, mtlPath, nrmPath, fileId){
	var viewport, container;
	var pathControls,
		path = {
		markers: [],
		distance: {
			element: document.createTextNode( 'unknown' ),
			value: 0,
		},
		 markerGeometry: new THREE.CylinderGeometry( 0, 1, 4, 4, false ),
		 markerMaterial: new THREE.MeshLambertMaterial( { color : 0x0000FF } ),
		 lineGeometry: new THREE.Geometry(),
		 lineRibbon: new THREE.Ribbon( new THREE.Geometry(),  new THREE.MeshBasicMaterial( { color: 0x00FF00 } ) )
		};
	path.lineRibbon.geometry = path.lineGeometry;
	path.markerGeometry.computeBoundingSphere();

	var camera;
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

	var mouse = { x: 0, y: 0 }, INTERSECTED;
	var mouse3D = { x: 0, y: 0, z: 1 };
	var rotRadius = 100;
	var windowWidth = 800;
	var windowHeight = 600;
	var windowHalfX = windowWidth / 2;
	var windowHalfY = windowHeight / 2;
	var model = [];
	var rotating = false;

	init();
	animate();

	var point1Marker;
	var point2Marker;
	var cursorPyr;//, something;
	var avgPos;

	function init(){
		// place our div inside of the parent file-nameed div
		container = document.createElement( 'div' );
		container.id = 'model-viewer-wrapper';
		viewport = document.createElement( 'div' );
		pathControls = document.createElement( 'div' );
		pathControls.style.overflow = 'hidden';
		var parent = document.getElementById( 'file-'.concat(fileId) );
		parent.appendChild( container );
		container.appendChild( viewport );
		viewport.style.cssFloat = 'left';
		console.log(viewport);
		container.appendChild( pathControls );
		pathControls.appendChild(document.createTextNode( 'Path distance: \n' ));
		pathControls.appendChild(path.distance.element);
		pathControls.appendChild(document.createTextNode( '\n' ));
		pathControls.appendChild(document.createTextNode( 'Marker list: \n' ));

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

		// create camera and position it in scene
		camera = new THREE.PerspectiveCamera( 45, windowWidth / windowHeight, 1, 2000 );
		camera.position.z = rotRadius;
		scene.add( camera );

		// one ambient light of darkish color
		var ambient = new THREE.AmbientLight( 0x130d00 );
		scene.add( ambient );

		// one directional light which will follow behind our camera to highlight what we view
		dirLight.position.set( 0, 0, 1 ).normalize();
		dirLight.parent = camera;
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

				var ray = new THREE.Raycaster(camera.position, new THREE.Vector3(0,0,-1), 0, camera.position.distanceTo( model[i].position )*2 );
				if(ray.intersectObjects( model ).length==0)
					model[i].applyMatrix(new THREE.Matrix4().makeRotationY(Math.PI));


			}
			cursor = new THREE.Vector3( model[0].position.x, model[0].position.y, model[0].position.y );
		});
		loader.load( objPath, mtlPath );


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
		cursorPLight.position.y = -10;

		// establish our renderer
		renderer = new THREE.WebGLRenderer();
		renderer.setSize( windowWidth, windowHeight );
		renderer.setClearColorHex( 0x8e8272, 1 );


		viewport.appendChild( renderer.domElement );
		viewport.addEventListener( 'mousemove', onMouseMove, false );
		viewport.addEventListener( 'mousedown', onMouseDown, false );
		viewport.addEventListener( 'mouseup', onMouseUp, false );
		viewport.addEventListener( 'DOMMouseScroll', onMouseWheel, false );
		viewport.addEventListener( 'mousewheel', onMouseWheel, false );
		viewport.addEventListener( 'mouseover', onMouseOver, false);
		viewport.addEventListener( 'mouseout', onMouseOut, false);

		viewport.addEventListener( 'touchstart', touchStart, false);
		viewport.addEventListener( 'touchmove', touchMove, false);
		viewport.addEventListener( 'touchend', touchEnd, false);
	} // end init

	function animate() {



		requestAnimationFrame( animate );
		render();
	}

	var timer = 0;

	function render() {
		//console.log(scene.children);
		// check for cursor going over model
		if ( model.length > 0 ){
			var vector = new THREE.Vector3(mouse3D.x, mouse3D.y, 1);
			projector.unprojectVector( vector, camera );
			var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize(), 0, camera.position.distanceTo( model[0].position )*2 );
			var intersects = ray.intersectObjects( model );

			if(intersects.length > 0) {
				cursor.copy( intersects[0].point );
				highlighted = true;
			}
			else{
				highlighted = false;
			}
		}

		renderer.render( scene, camera );
	}

	function handlePoints() {
		scene.remove(path.lineRibbon);
		path.markers.push(
			{ mesh: new THREE.Mesh(path.markerGeometry, path.markerMaterial),
				up: new THREE.Vector3()
			});
		scene.add(path.markers[path.markers.length - 1].mesh);
		path.markers[path.markers.length - 1].mesh.position.set(cursor.x, cursor.y, cursor.z);
		path.markers[path.markers.length - 1].up = orientPyramid(path.markers[path.markers.length - 1].mesh);
		if( path.markers.length > 1)
			path.distance.value += path.markers[path.markers.length - 1].mesh.position.distanceTo(path.markers[path.markers.length - 2].mesh.position);
		path.distance.element.nodeValue = '' + path.distance.value + '\n';

		path.lineGeometry.vertices.push( new THREE.Vector3().copy(cursor) );
		path.lineGeometry.vertices.push( new THREE.Vector3().copy(cursor).sub(path.markers[path.markers.length - 1].up));
		path.lineRibbon = new THREE.Ribbon(path.lineGeometry, path.lineRibbon.material);
		scene.add(path.lineRibbon);
		model[0].visible = false;
	}

	var lastMouseDown = new Date().getTime();
	function onMouseDown( event ) {
		console.log(event);
	 if( event.which == 1 ){
		mouse1Down = true;
			var newMouseDown = new Date().getTime();
			// check for double click -- currently if two clicks are within 250ms, we consider it a double click
			if( newMouseDown - lastMouseDown < 250 ){
				handlePoints();
			}
			lastMouseDown =  new Date().getTime();
		} 
	}
	function touchStart ( event ){
		
	}

	function onMouseMove( event ) {
		if ( !event.altKey && rotating ) {
				rotating = false;
		}
		// don't do anything unless we have a model loaded!
		if( model[0] && !rotating){
			//var cursorPyrUp = new THREE.Vector3();
			orientPyramid( cursorPyr );
		}
		if( mouse.x && mouse.y ){
			var dx = mouse.x - event.offsetX;
			var dy = mouse.y - event.offsetY;
			if( event.which == 1 ){
				if( event.altKey ) {
					rotateCameraAroundObject(dy * 0.005, dx * 0.005, cursorPyr);
					//return;
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

		if (event.which == 1 ) {
			if (rotating)
				rotating = false;
		}
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

	var switchedMaterials = true;


	function orientPyramid(pyramid){
		var closestFaceIndex;
		closestFaceIndex = 0;
		// iterate over our model's faces to try to locate the nearest centroid
		for( var i = 1; i < model[0].geometry.faces.length; i++ ){
			if( cursor.distanceTo(model[0].geometry.faces[closestFaceIndex].centroid) > cursor.distanceTo(model[0].geometry.faces[i].centroid) )
				closestFaceIndex = i;
		}
		// move pyramid to our cursor's location
		// pyramid here is most likely cursorPyr
		pyramid.position.copy( cursor );
		var pyramidUp = new THREE.Vector3();
		// begin our up vector as a copy of the closest face's normal
		pyramidUp.copy( model[0].geometry.faces[closestFaceIndex].normal );
		// we cross the up vector with -1,0,0 so the pyramid points in the direction we want it to (on to the model)

		pyramidUp.multiplyScalar( pyramid.geometry.boundingSphere.radius/2 );
		// and add it to the pyramid's position
		pyramid.position.add( pyramidUp );

		pyramid.lookAt( cursor );
		pyramid.rotation.x -= Math.PI/2;
		return pyramidUp;
	}


	var rotationY = new THREE.Matrix4();
	var rotationX = new THREE.Matrix4();
	var translation = new THREE.Matrix4();
	var translationInverse = new THREE.Matrix4();
	var matrix = new THREE.Matrix4();function rotateCameraAroundObject(dx, dy, target) {
	
		/*
		if(!rotating){
			camComponents.start.copy( camera.position );
			camComponents.radius = camera.position.distanceTo( target.position );

			camComponents.vDegs  = Math.acos((camera.position.y - camComponents.start.y)/camComponents.radius)*180/Math.PI;
			camComponents.hDegs = Math.acos((camera.position.x - camComponents.start.x)/(camComponents.radius * Math.cos(camComponents.vDegs * Math.PI / 180)))*180/Math.PI;

			rotating = true;
		}
		camComponents.hDegs -= dy*80;
		camComponents.vDegs += dx*80;
		
		var theta = camComponents.hDegs * Math.PI / 180;
		var phi = camComponents.vDegs * Math.PI / 180;

		camera.position.x = camComponents.start.x + camComponents.radius * Math.sin( phi ) * Math.cos( theta );
		camera.position.y = camComponents.start.y + camComponents.radius * Math.cos( phi );
		camera.position.z = camComponents.start.z + camComponents.radius * Math.sin( phi ) * Math.sin( theta );
		camera.lookAt( target.position );
		*/
		if( !rotating ) {
			rotating = true;
		}
		camComponents.up = rotateVectorForObject(new THREE.Vector3(0,1,0), camera.matrixWorld);
		camComponents.right = rotateVectorForObject(new THREE.Vector3(1,0,0), camera.matrixWorld);
		
		/// reset matrix (since we're reusing declared variables)
		matrix.identity();
		// rotations based on input
		rotationX.makeRotationAxis(camComponents.right, -dx);
		rotationY.makeRotationAxis(camComponents.up, -dy);
		// translate to and from center point
		translation.makeTranslation(
			target.position.x - camera.position.x,
			target.position.y - camera.position.y,
			target.position.z - camera.position.z);
		translationInverse.getInverse(translation);
		// translation * rotationX * rotationY * translationInverse
		matrix.multiply(rotationY).multiply(rotationX);
		//matrix.multiplySelf(translationInverse);
		camera.applyMatrix(matrix);
		camera.lookAt(target.position);



		//var d2 = camera.position.distanceTo(target.console);
		//position.log('Distance is ' + d1 + ' before rotation, and ' + d2 + ' after.');

	}
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

				camComponents.right.multiplyScalar(-dx * 0.2);
				camComponents.up.multiplyScalar(dy * 0.2);

				camera.position.add(camComponents.up);
				camera.position.add(camComponents.right);
	}

	function rotateVectorForObject( vector, matrix){
		return new THREE.Vector3().copy(vector).applyMatrix4(matrix).sub(new THREE.Vector3(0,0,0).applyMatrix4(matrix));
	}
	function rotateVectorByEuler(vector, x, y, z){
		var axis = new THREE.Vector3(1,0,0);
		var angle = x;
		vector.applyMatrix4( new THREE.Matrix4().makeRotationAxis(axis, angle) );
		axis.x = 0;
		axis.y = 1;
		angle = y;
		vector.applyMatrix4( new THREE.Matrix4().makeRotationAxis(axis, angle) );
		axis.y = 0;
		axis.z = 1;
		angle = z;
		vector.applyMatrix4( new THREE.Matrix4().makeRotationAxis(axis, angle) );
		vector.x *= -1;
		vector.y *= -1;
	}
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
