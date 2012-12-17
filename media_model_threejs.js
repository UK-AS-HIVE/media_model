var objPath, mtlPath, fileId;

function media_model_viewer(objPath, mtlPath, nrmPath, fileId){
  var container;

  var camera;
  var cursor;
  var dirLight = new THREE.DirectionalLight( 0xC8B79D );
  var cursorPLight = new THREE.PointLight( 0xffffff, 1, 100 );
  var scene, projector, renderer, cursor, highlighted = false;
  /*
  Contents of our scene:
    ambient - ambient light
    dirLight - directional light from behind camera
    cursorPLight - positional light following cursor
    model[i] in I - model provided by server
    particleSystem - particles spawning from cursor
    point1Marker - distance measurement marker 1
    point2Marker - distance measurement marker 2
    cursorPyr - cursor pyramid follows mouse drag projected onto 3d model

    *distanceLine may be added, if point1 and point2 exist
  */
  var particleSystem, particleCount = 25,
  particles = new THREE.Geometry(),
  pMaterial =
  new THREE.ParticleBasicMaterial({
    color: 0xFFFFFF,
    size: 1,
    blending: THREE.AdditiveBlending,
    transparent: false
  });

  var mouse = { x: 0, y: 0 }, INTERSECTED;
  var mouse3D = { x: 0, y: 0, z: 1 };
  var rotRadius = 100;
  var windowWidth = 640;
  var windowHeight = 480;
  var windowHalfX = windowWidth / 2;
  var windowHalfY = windowHeight / 2;
  var model = [];
  var material;


  var shaderMaterial, fragmentshader, vertexshader;
  var attributes = {
    displacement: {
      type: 'f', // a float
      value: [] // an empty array
    }
  };
  
  var uniforms = {
    amplitude: {
      type: 'f', // a float
      value: 0
    }
  };
  init();
  animate();

  var point1Marker;
  var point2Marker;
  var cursorPyr;
  function init(){
    // place our div inside of the parent file-nameed div
    container = document.createElement( 'threejs-model' );
    var parent = document.getElementById( 'file-'.concat(fileId) );
    parent.appendChild( container );

    // create camera and position it in scene
    camera = new THREE.PerspectiveCamera( 45, windowWidth / windowHeight, 1, 2000 );
    camera.position.z = rotRadius;

    // create scene and establish lighting
    scene = new THREE.Scene();

    // one ambient light of darkish color
    var ambient = new THREE.AmbientLight( 0x130d00 );
    scene.add( ambient );

    // one directional light which will follow behind our camera to highlight what we view
    dirLight.position.set( 0, 0, 1 ).normalize();
    scene.add( dirLight );

    // a small positional light that will hug our cursor and approach the model
    cursorPLight.position.set( 0, 0, 0 );
    scene.add( cursorPLight );

    projector = new THREE.Projector();

    // mapHeight and mapColor are used for bump mapping
    // mapHeight holds the actual normal map
    var mapHeight = THREE.ImageUtils.loadTexture( nrmPath );
    mapHeight.anisotropy = 4;
    mapHeight.repeat.set( 0.998, 0.998 );
    mapHeight.offset.set( 0.001, 0.001 );
    mapHeight.wrapS = mapHeight.wrapT = THREE.RepeatWrapping;
    mapHeight.format = THREE.RGBFormat;

    // mapColor reads color values from the jpg directly, since we don't have our other material handy
    var mapColor = THREE.ImageUtils.loadTexture( objPath.substr(0,objPath.length-4)+'.jpg');
    mapColor.anisotropy = 4;
    mapColor.repeat.set( 0.998, 0.998 );
    mapColor.offset.set( 0.001, 0.001 );
    mapColor.wrapS = mapColor.wrapT = THREE.RepeatWrapping;
    mapColor.format = THREE.RGBFormat;

    // if mapHeight loaded
    if( mapHeight )
      // we will use a normal mapped phong material
      material = new THREE.MeshPhongMaterial( { ambient: 0x552811,  specular: 0x333333, shininess: 25, map: mapColor, bumpMap: mapHeight, bumpScale: 19, metal: false } );
    else if( mapColor )
      // otherwise, we load the mtl -- which basically just applies the jpg. 
      material = mtlPath;

    var loader = new THREE.OBJMTLLoader();
    loader.addEventListener( 'load', function ( event ) {
      var tmp = event.content;
      // because sometimes the .obj seems to contain multiple models
      // TODO: combine all models which are loaded in 
      for( var i = 0; i<tmp.children.length; i++ ){
        model.push( tmp.children[i] );
        model[i].name = "model";
        // we enable flipSided and doubleSided to try to render the back of our model
        // but this doesn't appear to be working
        model[i].flipSided = true;
        model[i].doubleSided = true;
        // we noticed no change in behavior by disabling these three calls
        //model[i].geometry.computeCentroids();
        //model[i].geometry.computeFaceNormals();
        //model[i].geometry.computeVertexNormals();
        scene.add( model[i] );
      }

      // ***** this code was used to test shaders, may be referred to later *****
      //jQuery.get('../sites/all/modules/media_model/shaders/vertexshader', function(data){
      //  vertexshader = data;
      //  console.log("Loaded vertexshader.js");
      //  shaderMaterial = shaderLoad(model[0], uniforms, attributes, vertexshader, fragmentshader);
      //});
      //jQuery.get('../sites/all/modules/media_model/shaders/fragmentshader', function(data){
      //  fragmentshader = data;
      //  console.log("Loaded fragmentshader.js");
      //  shaderMaterial = shaderLoad(model[0], uniforms, attributes, vertexshader, fragmentshader);
      //});

      cursor = new THREE.Vector3( model[0].position.x, model[0].position.y, model[0].position.y );
      for(var p = 0; p < particleCount; p++) {
        // spawn all of our particles at the location of the cursor
        var particle = new THREE.Vector3( cursor.x, cursor.y, cursor.z );
        // with random velocity
        particle.velocity = new THREE.Vector3( Math.random() * 2 - 1 , -Math.random() * 2 - 1, Math.random() * 2 - 1) ;
        particle.velocity.multiplyScalar( 0.1 );
        particles.vertices.push( particle );
      }
      // create the system and add it to the scene
      particleSystem = new THREE.ParticleSystem( particles, pMaterial );
      particleSystem.sortParticles = true;
      scene.add( particleSystem );
    });
    loader.load( objPath, mtlPath );

    // markers are pyramids which will point to the location on the surface selected by the user
    point1Marker = new THREE.Mesh( new THREE.CylinderGeometry( 0, 3, 4, 4, false ), new THREE.MeshLambertMaterial( { color : 0x0000FF } ) );
    point2Marker = new THREE.Mesh( new THREE.CylinderGeometry( 0, 3, 4, 4, false ), new THREE.MeshLambertMaterial( { color : 0x0000FF } ) );
    scene.add( point1Marker );
    scene.add( point2Marker );
    // we hide them until points are selected
    point1Marker.visible = false;
    point2Marker.visible = false;

    // establish another pyramid, to follow the cursor and represent where the markers will appear
    cursorPyr = new THREE.Mesh( new THREE.CylinderGeometry( 0, 3, 4, 4, false ), new THREE.MeshLambertMaterial( { color : 0xFF00FF } ) );
    scene.add( cursorPyr );

    // establish our renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( windowWidth, windowHeight );
    renderer.setClearColorHex( 0x8e8272, 1 );

    container.appendChild( renderer.domElement );
    container.addEventListener( 'mousemove', onMouseMove, false );
    container.addEventListener( 'mousedown', onMouseDown, false );
    container.addEventListener( 'DOMMouseScroll', onMouseWheel, false );
    container.addEventListener( 'mousewheel', onMouseWheel, false );
  } // end init
  
  function onMouseWheel( event ){
    // don't let the window scroll away!
    event.preventDefault();

    // we want a direction vector which points inside from the location of the camera
    var direction = new THREE.Vector3();
    direction.copy( camera.position );
    // we use model[0] since it seems to contain "most" of the model data
    direction.addSelf( model[0].position ).normalize();
    direction.multiplyScalar( -windowWidth / 100 * event.wheelDelta / ( Math.abs( event.wheelDelta ) ) );
    // we want to prevent a sign change from occuring during our zoom -- this will prevent us from going through
    if( camera.position.x/Math.abs( camera.position.x ) == ( camera.position.x + direction.x ) / Math.abs( camera.position.x + direction.x )
      && camera.position.y/Math.abs( camera.position.y ) == ( camera.position.y + direction.y ) / Math.abs( camera.position.y + direction.y )
      && camera.position.z/Math.abs( camera.position.z ) == ( camera.position.z + direction.z ) / Math.abs( camera.position.z + direction.z ) )
      camera.position.addSelf( direction );
  }

  function orientPyramid(pyramid, pyramidUp){
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
    pyramidUp = new THREE.Vector3();
    // begin our up vector as a copy of the closest face's normal
    pyramidUp.copy( model[0].geometry.faces[closestFaceIndex].normal );
    // we cross the up vector with -1,0,0 so the pyramid points in the direction we want it to (on to the model)
    pyramidUp.crossSelf( new THREE.Vector3( -1,0,0 ) );

    cursorOffset = new THREE.Vector3();
    // we will create an offset from the face by 2 units
    cursorOffset.copy( pyramidUp );
    cursorOffset.multiplyScalar( 2 );
    // and add it to the pyramid's position
    pyramid.position.addSelf( cursorOffset );

    var newLook = new THREE.Vector3();
    // we make another copy of the position of the pyramid after it's been offset
    newLook.copy( pyramid.position );
    // multiplied by the bounding radius of the pyramid's model
    pyramidUp.multiplyScalar( pyramid.boundRadius );
    // and add the calculated up vector for the pyramid
    newLook.addSelf( pyramidUp );
    // and direct it to look at the calculated look location
    pyramid.lookAt( newLook );
    pyramidUp.normalize();
  }

  function onMouseMove( event ) {
    // don't do anything unless we have a model loaded!
    if( model[0] ){
      var cursorPyrUp = new THREE.Vector3();
      orientPyramid( cursorPyr, cursorPyrUp );
    }
    // if the left is clicked
    if( event.which == 1 && mouse.x && mouse.y ){
      // calculate change in x/y and use to rotate camera/dirLight in an identical fashion
      // around the object.
      var dx = mouse.x - event.offsetX;
      var dy = mouse.y - event.offsetY;
      rotateAroundObject( camera, dx * 0.015, dy * 0.015 );
      rotateAroundObject( dirLight, dx * 0.015, dy * 0.015 );
    }
    // update our known 2d/3d mouse coordinates
    mouse.x = event.offsetX;
    mouse.y = event.offsetY;
    mouse3D.x = ( event.offsetX / windowWidth ) * 2 - 1;
    mouse3D.y = - ( event.offsetY / windowHeight ) * 2 + 1;
  }

  var lastMouseDown = new Date().getTime();
  function onMouseDown( event ) {
    if( event.which == 1 ){
      var newMouseDown = new Date().getTime();
      // check for double click -- currently if two clicks are within 250ms, we consider it a double click
      if( newMouseDown - lastMouseDown < 250 ){
        if( !point1 ){// if no point1, drop point1
          point1 = new THREE.Vector3(cursor.x, cursor.y, cursor.z);
          // move a marker to the position
          point1Marker.position.copy(point1);
          var point1MarkerUp = new THREE.Vector3();
          orientPyramid(point1Marker, point1MarkerUp);
        }
        else if( !point2 ){// else if no point2, drop point2
          point2 = new THREE.Vector3( cursor.x, cursor.y, cursor.z );
          point2Marker.position.copy( point2 );
          var point2MarkerUp = new THREE.Vector3();
          orientPyramid( point2Marker, point2MarkerUp );
          // additionally, we must calculate and display distance
          var pointsDistance = point1.distanceTo( point2 );
          distanceText.innerHTML = 'Distance between selected points: ' + pointsDistance;
          // append this outside of our 3d window
          container.appendChild(distanceText);

          // create a line to go between the two points
          // TODO: make this line sit better on the surface of the model
          var lineGeometry = new THREE.Geometry();
          lineGeometry.vertices.push( new THREE.Vector3( point1.x, point1.y + 1, point1.z + 1 ) );
          lineGeometry.vertices.push( new THREE.Vector3( point1.x, point1.y - 1, point1.z - 1 ) );
          lineGeometry.vertices.push( new THREE.Vector3( point2.x, point2.y + 1, point2.z + 1 ) );
          lineGeometry.vertices.push( new THREE.Vector3( point2.x, point2.y - 1, point2.z - 1 ) );
          distanceLine = new THREE.Ribbon( lineGeometry,  new THREE.MeshBasicMaterial( { color: 0x0000FF } ) );
          scene.add( distanceLine );
        }
        else{// else reset
            point1 = point2 = null;
            container.removeChild( distanceText );
            scene.remove( distanceLine );
        }
      }
      lastMouseDown =  new Date().getTime();
    } 
  }

  distanceText = document.createElement( 'div' );
  distanceText.style.position = 'absolute';
  distanceText.style.color = 'rgb(0,255,0)';
  distanceText.style.left = '25px'; 
  distanceText.style.top = '50px';
  jQuery(distanceText).disableSelection();
  var switchedMaterials = true;
  var point1, point2;
  var distanceText;
  var distanceLine;
  // var frame = 0;

  function animate() {
    // check for points -- display them if they are set
    if( point1 ){ 
      point1Marker.visible = true; 
    }
    else{ point1Marker.visible = false; }
    if( point2 ){
      point2Marker.visible = true;
    }
    else{ point2Marker.visible = false; }
        
    //uniforms.amplitude.value = Math.sin(frame);
    //frame+=1;
    //if(model[0] != null && shaderMaterial != null && material != null && !switchedMaterials){
      // var tmp = THREE.SceneUtils.createMultiMaterialObject( model[0].geometry, [material, shaderMaterial]);
      // tmp.computeFaceNormals()
      // tmp.computeVertexNormals()
      // scene.add(tmp);
      // switchedMaterials = true;
    //}
    
    // if we are mousing over something in the 3d window
    // and our particle system exsts
    if( highlighted && particleSystem ){
      var pCount = particleCount;
      // iterate over our particle system
      while( pCount-- ) {
        // get the particle
        var particle = particles.vertices[pCount];
        // check if we need to reset
        if( cursor.distanceTo( particle ) > 10 ) {
        particle.x = cursor.x;
        particle.y = cursor.y;
        particle.z = cursor.z;
        particle.velocity = new THREE.Vector3( Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1 );
        particle.velocity.multiplyScalar( 0.1 );
      }
      // and the position
      particle.addSelf(particle.velocity);
    }
    /* this is some collision code that I don't think I ever got working right....
        I tested with this commented out, so it shouldn't affect anything.
    for ( var i=0; i>model[0].geometry.vertices.length; i++ )
    {       
      var localVertex = model[0].geometry.vertices[i].clone();
      var globalVertex = model[0].matrix.multiplyVector3( localVertex );
      var directionVector = globalVertex.subSelf( model[0].position );
      var ray = new THREE.Ray( model[0].position, directionVector.clone().normalize() );
      var collisionResults = ray.intersectObjects( model );
      if ( collisionResults.length > 0 && collisionResults[0].distance < directionVector.length() ) 
      {
        // a collision occurred... do something...
      }
    }*/

    // that we've changed its vertices.
    particleSystem.geometry.verticesNeedUpdate = true;
    particleSystem.visible = true;
    }
    else if(particleSystem){// hide particle system if nothing is highlighted
      particleSystem.visible = false;
    }
    requestAnimationFrame( animate );
    render();
  }

  function render() {
    // check for cursor going over model
    var vector = new THREE.Vector3(mouse3D.x, mouse3D.y, 1);
    projector.unprojectVector( vector, camera );
    var ray = new THREE.Ray(camera.position, vector.subSelf( camera.position ).normalize() );
    var intersects = ray.intersectObjects( model );

    if(intersects.length>0){
      // if we do intersect, we move the cursor to that point and highlight it
      for( var i = 0; i < intersects.length; i++ ){
        cursor.copy( intersects[i].point );
        cursorPLight.position.copy( intersects[i].point );
        highlighted = true;
      }
    }
    else{
      highlighted = false;
    }
    renderer.render( scene, camera );
  }

  // rotate an object around an object in world space       
  function rotateAroundObject(object, xRadians, yRadians) { 
    var rotationMatrix = new THREE.Matrix4();
    if(xRadians != 0){
      var matrix = new THREE.Matrix4();
      matrix.extractRotation( object.matrix );
      var direction = new THREE.Vector3(0,1,0);
      direction = matrix.multiplyVector3( direction );
      rotationMatrix.makeRotationAxis(direction, xRadians);
      object.applyMatrix(rotationMatrix);
    }
    if(yRadians != 0){
      var matrix = new THREE.Matrix4();
      matrix.extractRotation( object.matrix );
      var direction = new THREE.Vector3(1,0,0);
      direction = matrix.multiplyVector3( direction );
      rotationMatrix.makeRotationAxis(direction, yRadians);
      object.applyMatrix(rotationMatrix);
    }
  }

  var rotWorldMatrix;
  // rotate an object around an arbitrary axis
  function rotateAroundWorldAxis(object, axis, radians) {
    rotWorldMatrix = new THREE.Matrix4();
    rotWorldMatrix.makeRotationAxis(axis.normalize(), radians);
    rotWorldMatrix.multiplySelf(object.matrix);        // pre-multiply
    object.matrix = rotWorldMatrix;
    object.rotation.getRotationFromMatrix(object.matrix, object.scale);
  }

/* shader logic
  function shaderLoad(model, uniforms, attributes, vertexshader, fragmentshader){
    if(vertexshader == null || fragmentshader == null)
      return;
    var shaderMaterial = new THREE.ShaderMaterial({
      uniforms:       uniforms,
      attributes:     attributes,
      vertexShader:   vertexshader,
        //fragmentShader: fragmentshader
    });
    var verts = model.geometry.vertices;
    var values = attributes.displacement.value;

    for(var v = 0; v < verts.length; v++) {
      values.push(Math.random() * 30);
    }
    return shaderMaterial;
  }*/
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