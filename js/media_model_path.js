THREE.MediaModelPath = function(c){
	// api


	// internals
	var pinRoot = new THREE.Object3D(),
		color = new THREE.Color().copy(c),
		pins = [],
		distances = [],
		distance = 0,

		lineRibbon = new THREE.Ribbon( new THREE.Geometry(),  new THREE.MeshBasicMaterial( { color: color, side: THREE.DoubleSide, vertexColors: true } ));
	
	var TYPE = { POINTS: 0, LINE: 1, POLYGON: 2};
	var type = TYPE.LINE;

	this.type = function(){
		switch(type){
			case TYPE.POINTS:
				return 'p';
			case TYPE.LINE:
				return 'l';
			case TYPE.POLYGON:
				return 'o';
		}
	}
	
	this.pins = pins;

	this.pinRoot = pinRoot;

	this.color = color;

	this.setType = function ( typeName ){
		type = TYPE[typeName];
		this.rebuildPath();
	}

	this.positionDistance = function( i ){
		var screenPos = new THREE.Vector3().copy(this.pins[i].mesh.position).add(this.pins[(i!=pins.length-1) ? i+1 : 0].mesh.position).multiplyScalar(0.5);
		projector.projectVector( screenPos, camera );
		screenPos.x = ( screenPos.x * windowHalfX ) + windowHalfX;
		screenPos.y = - ( screenPos.y * windowHalfY ) + windowHalfY;
		if(screenPos.x > 0 && screenPos.x < windowWidth && screenPos.y > 0 && screenPos.y < windowHeight) {
			distances[i].element.style.left = screenPos.x + 'px';
			distances[i].element.style.top = screenPos.y + 'px';
			//distances[i].element.style.visibility = 'visible';
			jQuery(distances[i].element).show();
			distances[i].element.style.color = '#' + this.color.getHexString();
		}
		else
			//distances[i].element.style.visibility = 'hidden';
			jQuery(distances[i].element).hide();
	}

	this.repositionDistances = function() {
		for(var i=0; i<distances.length; i++){
			this.positionDistance(i);
		}
	}

	this.addPin = function(location) {
		this.pins.push( { 	
				mesh: new THREE.Mesh(protopin.geometry, new THREE.MeshPhongMaterial()),
				up: new THREE.Vector3()
			});
		var index = this.pins.length-1;

		this.pinRoot.add(this.pins[index].mesh);

		this.pins[index].up = orientPin(this.pins[index].mesh, location);
		this.pins[index].mesh.material.color = color;

		this.rebuildPath();
	}

	this.removePin = function( i ){
		this.pins.splice(i, 1);

		console.log('Removed pins[' + i + '] from the ' + color.getHexString() + 'set.');
		this.rebuildPath();
	}

	this.destroyPath = function(){
		scene.remove(lineRibbon);
		scene.remove(this.pinRoot);
		var newDistances;
		for(var i=distancesLayer.childNodes.length-1; i>=0 ;i--){
			if(distancesLayer.childNodes.item(i).id === c.getHexString())
				distancesLayer.childNodes.item(i).remove();
		}

	}

	this.rebuildPath = function(){
		this.destroyPath();

		this.pinRoot = new THREE.Object3D();
		scene.add(this.pinRoot);

		scene.remove(lineRibbon);
		lineRibbon = new THREE.Ribbon(new THREE.Geometry(), lineRibbon.material);
		distance.value = 0;

		distances = [];
		var i;
		for(i=0; i<this.pins.length; i++) {
			this.pinRoot.add(this.pins[i].mesh);
			this.pins[i].mesh.id = i;
			//newMarkers.push(path.markers[path.colorID.indexOf(newOrder[i].id)]);
			//newColorID.push(newOrder[i].id);
			//markerRoot.add(newMarkers[i].mesh);
			if(type == TYPE.LINE || type == TYPE.POLYGON) {
				if(i>0) {
					distances.push({
						value: this.pins[i-1].mesh.position.distanceTo(this.pins[i].mesh.position),
						element: document.createElement( 'div' )
					});
					distancesLayer.appendChild(distances[i-1].element);
					distances[i-1].element.className = 'media-model-floating-distance-text';
					distances[i-1].element.innerHTML = distances[i-1].value.toFixed(2);
					distances[i-1].element.id = color.getHexString();
					distance.value += distances[i-1].value;
				}
				lineRibbon.geometry.vertices.push( new THREE.Vector3().copy(this.pins[i].mesh.position));
				lineRibbon.geometry.vertices.push( new THREE.Vector3().copy(this.pins[i].mesh.position).add(this.pins[i].up));
				lineRibbon.geometry.colors.push(color);
				lineRibbon.geometry.colors.push(color);
			}
		}
		if(type == TYPE.POLYGON){
			distances.push({
				value: this.pins[i-1].mesh.position.distanceTo(this.pins[0].mesh.position),
				element: document.createElement( 'div' )
			});
			distancesLayer.appendChild(distances[i-1].element);
			distances[i-1].element.className = 'media-model-floating-distance-text';
			distances[i-1].element.innerHTML = distances[i-1].value.toFixed(2);
			distances[i-1].element.id = color.getHexString();
			distance.value += distances[i-1].value;

			lineRibbon.geometry.vertices.push( new THREE.Vector3().copy(this.pins[0].mesh.position));
			lineRibbon.geometry.vertices.push( new THREE.Vector3().copy(this.pins[0].mesh.position).add(this.pins[0].up));
			lineRibbon.geometry.colors.push(color);
			lineRibbon.geometry.colors.push(color);
		}
		this.repositionDistances();

		scene.add(lineRibbon);

		//currentURL = generateURL();
	}
}