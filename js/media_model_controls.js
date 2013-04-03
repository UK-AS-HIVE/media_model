/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / https://github.com/WestLangley
 * 
 * Modified for use in Media Model
 */


THREE.MediaModelControls = function ( object, domElement ) {

	THREE.EventDispatcher.call( this );
	this.object = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document;

	// API

	this.center = new THREE.Vector3();

	this.userRotate = true;
	this.userRotateSpeed = 1.0;

	this.minPolarAngle = 0; // radians
	this.maxPolarAngle = Math.PI; // radians

	this.minDistance = 0;
	this.maxDistance = Infinity;

	// internals

	var scope = this;

	var EPS = 0.000001;
	var PIXELS_PER_ROUND = 1800;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var phiDelta = 0;
	var thetaDelta = 0;
	var scale = 1;

	var lastPosition = new THREE.Vector3();

	var STATE = { NONE : -1, ROTATE : 0 };
	var state = STATE.NONE;

	// events

	var changeEvent = { type: 'change' };


	this.rotateLeft = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationdomAngle();

		}

		thetaDelta -= angle;

	};

	this.rotateRight = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		thetaDelta += angle;

	};

	this.rotateUp = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		phiDelta -= angle;

	};

	this.rotateDown = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		phiDelta += angle;

	};

	this.update = function () {
		if(state == STATE.NONE)
			return;

		var position = this.object.position;
		var offset = position.clone().sub( this.center )

		// angle from z-axis around y-axis

		var theta = Math.atan2( offset.x, offset.z );

		// angle from y-axis

		var phi = Math.atan2( Math.sqrt( offset.x * offset.x + offset.z * offset.z ), offset.y );

		if ( this.autoRotate ) {

			this.rotateLeft( getAutoRotationAngle() );

		}

		theta += thetaDelta;
		phi += phiDelta;

		// restrict phi to be between desired limits
		phi = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, phi ) );

		// restrict phi to be betwee EPS and PI-EPS
		phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) );

		var radius = offset.length() * scale;

		// restrict radius to be between desired limits
		radius = Math.max( this.minDistance, Math.min( this.maxDistance, radius ) );

		offset.x = radius * Math.sin( phi ) * Math.sin( theta );
		offset.y = radius * Math.cos( phi );
		offset.z = radius * Math.sin( phi ) * Math.cos( theta );

		position.copy( this.center ).add( offset );

		this.object.lookAt( this.center );

		thetaDelta = 0;
		phiDelta = 0;
		scale = 1;

		if ( lastPosition.distanceTo( this.object.position ) > 0 ) {

			this.dispatchEvent( changeEvent );

			lastPosition.copy( this.object.position );

		}

	};


	function getAutoRotationAngle() {

		return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

	}

	var lastMouseDown = new Date().getTime();
	function onMouseDown( event ) {
		console.log(event);

		if(event.target.className === "media-model-control-button"){
			if(event.target.id === 'media-model-generate-url-button')
  				window.prompt ('Copy this URL:', generateURL());
			else if(event.target.id === 'media-model-load-note-button')
				jQuery( '#media-model-loadnote-form' ).dialog( 'open' );
			else if(event.target.id === 'media-model-save-note-button')
        		jQuery( '#media-model-addnote-form' ).dialog( 'open' );
        	return;
		}

		if ( event.button == 0 && event.altKey ) {
			//console.log("1");
			event.preventDefault();

			state = STATE.ROTATE;

			rotateStart.set( event.clientX, event.clientY );

		} 

		if( event.which == 1 ){
			mouse1Down = true;
			if(markerHandler.object){
				markerHandler.grabbed = true;
			}
			var newMouseDown = new Date().getTime();
			// check for double click -- currently if two clicks are within 250ms, we consider it a double click
			if( newMouseDown - lastMouseDown < 250 ){
				if(markerHandler.object)
					removePoint(markerHandler.object.name);
				else {
					console.log('adding point');
					addPoint(cursor);
				}
			}
			lastMouseDown =  new Date().getTime();
		}
		//domElement.addEventListener( 'mousemove', onMouseMove, false );
		//domElement.addEventListener( 'mouseup', onMouseUp, false );

	}

	var fix = {x: 0, y: 0};
	function onMouseMove( event ) {
		event.preventDefault();
		var buttonFix = 0;
		if(event.target.className == "media-model-control-button"){
			fix.x = event.target.offsetLeft;
			fix.y = event.target.offsetTop;
		}
		else
			fix = {x: 0, y: 0}; 
		//if (!event.which == 1 )
			//onMouseUp( event );
		if ( state === STATE.ROTATE ) {

			rotateEnd.set( event.clientX, event.clientY );
			rotateDelta.subVectors( rotateEnd, rotateStart );

			scope.rotateLeft( 2 * Math.PI * rotateDelta.x / PIXELS_PER_ROUND * scope.userRotateSpeed );
			scope.rotateUp( 2 * Math.PI * rotateDelta.y / PIXELS_PER_ROUND * scope.userRotateSpeed );

			rotateStart.copy( rotateEnd );
			rotating = true;
			this.center = cursorPyr.position;
			return;
		}

		// begin code moved from media_model.js
		if ( !event.altKey && rotating ) {
				rotating = false;
				state = STATE.NONE;
				this.center = new THREE.Vector3();
		}
		if( mouse.x && mouse.y ){
			var dx = mouse.x - event.offsetX + fix.x;
			var dy = mouse.y - event.offsetY + fix.y;
			if( event.which == 1 ){
					camera.rotation.x += dy * 0.002;
					camera.rotation.y += dx * 0.002;
			}
			else if( event.which == 2 ){
				//var forwardVector = new THREE.Vector3(mouse3D.x, mouse3D.y, 1);
				//projector.unprojectVector(forwardVector, camera);
				//forwardVector.normalize();
				panCamera(dx, dy);
			}

			// don't do anything unless we have a model loaded!
			if( model[0] && !rotating){
				//var cursorPyrUp = new THREE.Vector3();
				orientPyramid( cursorPyr, cursor);
			}
		}
		// update our known 2d/3d mouse coordinates
		mouse.x = event.offsetX + fix.x;
		mouse.y = event.offsetY + fix.y;
		mouse3D.x = ( (event.offsetX + fix.x) / windowWidth ) * 2 - 1;
		mouse3D.y = - ( (event.offsetY + fix.y) / windowHeight ) * 2 + 1;
		// end code moved from media_model.js

	}

	function onMouseUp( event ) {
		if(markerHandler.grabbed)
			markerHandler.grabbed = false;

		if ( ! scope.userRotate ) return;

		//domElement.removeEventListener( 'mousemove', onMouseMove, false );
		//domElement.removeEventListener( 'mouseup', onMouseUp, false );

		state = STATE.NONE;

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

	function onKeyDown( event ){
		//console.log("ON KEY DOWN!");
		//console.log(event);
		switch(event.keyCode){
			case 70: // 'f'
				fullscreenToggle();
				break;
			case 72: // 'h'
				jQuery(helpOverlay).toggle();
				jQuery(helpPrompt).toggle();
				break;
		}
	}

	//this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousemove', onMouseMove, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
	this.domElement.addEventListener( 'mouseup', onMouseUp, false );
	this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox
	document.addEventListener( 'keydown', onKeyDown, false);
};
