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
	var buttonPress = false;

	var mouse2D = new THREE.Vector2(0, 0);
	this.mouse2D = function(){return mouse2D;}
	var mouse3D = new THREE.Vector3(0, 0, 1);
	this.mouse3D = function(){return mouse3D;}

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
		//console.log(event);

		if(event.target.className === "media-model-control-button"){
			if(event.target.id === 'media-model-url-button')
  				window.prompt ('Copy this URL:', generateURL());
			else if(event.target.id === 'media-model-load-note-button')
				jQuery( '#media-model-load-note-form' ).dialog( 'open' );
			else if(event.target.id === 'media-model-save-note-button')
        		jQuery( '#media-model-save-notes-form' ).dialog( 'open' );
        	else if(event.target.id === 'media-model-color-button' )
        		ph.setPath(paths[(paths.indexOf(ph.path)+1)%colors.length]);
        	else if(event.target.id === 'media-model-mode-button' )
        		ph.path.setType();
        	else if(event.target.id === 'media-model-add-note-button' )
        		jQuery( '#media-model-add-note-form').dialog( 'open' );
        	else if(event.target.id === 'media-model-fs-button' )
        		fullscreenToggle();
        	buttonPress = true;
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
			if(ph.target.mesh){
				ph.grabbed = true;
			}
			var newMouseDown = new Date().getTime();
			// check for double click -- currently if two clicks are within 250ms, we consider it a double click
			if( newMouseDown - lastMouseDown < 250 ){
				if(ph.target.mesh)
					ph.path.removePin(ph.target.index);
				else 
					ph.path.addPin(ph.cursor);
			}
			lastMouseDown =  new Date().getTime();
		}
		//domElement.addEventListener( 'mousemove', onMouseMove, false );
		//domElement.addEventListener( 'mouseup', onMouseUp, false );

	}

	var fix = {x: 0, y: 0};
	function onMouseMove( event ) {
		event.preventDefault();
		if(buttonPress)
			return;
		var buttonFix = 0;
		if(event.target.className.indexOf("media-model-control-button")!==-1){
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
			this.center = ph.pin.position;
			return;
		}

		// begin code moved from media_model.js
		if ( !event.altKey && rotating ) {
				rotating = false;
				state = STATE.NONE;
				this.center = new THREE.Vector3();
		}
		if( mouse2D.x && mouse2D.y ){
			//document.body.style.cursor = "none";
			var dx = mouse2D.x - event.offsetX + fix.x;
			var dy = mouse2D.y - event.offsetY + fix.y;
			if( event.which == 1 ){
				camera.rotation.x += dy * 0.002;
				camera.rotation.y += dx * 0.002;
			}
			else if( event.which == 2 ){
				panCamera(dx, dy);
			}
			// don't do anything unless we have a model loaded!
			if( !rotating ){
				orientPin( ph.pin, ph.cursor);
			}
		}
		else
			document.body.style.cursor = "";
		// update our known 2d/3d mouse coordinates
		mouse2D.x = event.offsetX + fix.x;
		mouse2D.y = event.offsetY + fix.y;
		mouse3D.x = ( (event.offsetX + fix.x) / windowWidth ) * 2 - 1;
		mouse3D.y = - ( (event.offsetY + fix.y) / windowHeight ) * 2 + 1;
		// end code moved from media_model.js

	}

	function onMouseUp( event ) {
		buttonPress = false;
		if(ph.grabbed)
			ph.grabbed = false;

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
		direction.copy( ph.cursor );
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
			case 70: // 'f' for fullscreen
				fullscreenToggle();
				break;
			case 72: // 'h' for help
				jQuery(helpOverlay).toggle();
				jQuery(helpPrompt).toggle();
				break;
			case 78: // 'n' for next path color
				for(var i=0; i<paths.length; i++) 
					if(paths[i] === ph.path) {
						if(!paths[(i+1)%colors.length])
							paths[(i+1)%colors.length] = new THREE.MediaModelPath(colorChooser());
						ph.setPath(paths[(i+1)%colors.length]);
						break;
					}
				break;
			case 76: // 'l' for line
				ph.path.setType('LINE');
				break;
			case 79: // 'o'  for connected path
				ph.path.setType('POLYGON');
				break;
			case 80: // 'p' for points
				ph.path.setType('POINTS');
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
