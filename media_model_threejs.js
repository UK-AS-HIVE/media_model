var objPath, mtlPath, fileId;

function media_model_viewer(objPath, mtlPath, nrmPath, fileId){
  var container;

  var camera;
  var cursor;
  var dirLight = new THREE.DirectionalLight( 0xC8B79D );
  var cursorPLight = new THREE.PointLight(0xffffff, 1, 100);
  var scene, projector, renderer, cursor, highlighted = false;
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
  var mouse3D = { x: 0, y: 0, z: 1};
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
    container = document.createElement( 'threejs-model' );

    var parent = document.getElementById( 'file-'.concat(fileId) );
    parent.appendChild( container );

    camera = new THREE.PerspectiveCamera( 45, windowWidth / windowHeight, 1, 2000 );
    camera.position.z = rotRadius;

        // scene
        scene = new THREE.Scene();
        var ambient = new THREE.AmbientLight( 0x130d00);
        scene.add( ambient );

        dirLight.position.set(0,0,1).normalize();
        scene.add( dirLight );


        cursorPLight.position.set(0,0,0);
        scene.add(cursorPLight);

        // attempting to create cursor effect


        projector = new THREE.Projector();
        var mapHeight = THREE.ImageUtils.loadTexture( nrmPath );

        mapHeight.anisotropy = 4;
        mapHeight.repeat.set( 0.998, 0.998 );
        mapHeight.offset.set( 0.001, 0.001 )
        mapHeight.wrapS = mapHeight.wrapT = THREE.RepeatWrapping;
        mapHeight.format = THREE.RGBFormat;

        var mapColor = THREE.ImageUtils.loadTexture( objPath.substr(0,objPath.length-4)+'.jpg');

        mapColor.anisotropy = 4;
        mapColor.repeat.set( 0.998, 0.998 );
        mapColor.offset.set( 0.001, 0.001 )
        mapColor.wrapS = mapColor.wrapT = THREE.RepeatWrapping;
        mapColor.format = THREE.RGBFormat;

        //materials.push( new THREE.MeshPhongMaterial( { map: imgTexture, bumpMap: imgTexture, bumpScale: bumpScale, color: 0xffffff, ambient: 0x777777, specular: specular, shininess: shininess, shading: shading } ) );

        if(mapHeight)
          material = new THREE.MeshPhongMaterial( { ambient: 0x552811,  specular: 0x333333, shininess: 25, map: mapColor, bumpMap: mapHeight, bumpScale: 19, metal: false } );
        else if(mapColor)
          material = mtlPath;

        var loader = new THREE.OBJMTLLoader();
        loader.addEventListener( 'load', function ( event ) {
          var tmp = event.content;
          for(var i=0;i<tmp.children.length;i++){
            model.push(tmp.children[i]);
            model[i].name = "model";
            //model[i].material = material;
            model[i].flipSided = true;
            model[i].doubleSided = true;
            model[i].geometry.computeCentroids();
            model[i].geometry.computeFaceNormals();
            model[i].geometry.computeVertexNormals();
            console.log(model[i]);
            scene.add(model[i]);

          }
          jQuery.get('../sites/all/modules/media_model/shaders/vertexshader', function(data){
            vertexshader = data;
            console.log("Loaded vertexshader.js");
            shaderMaterial = shaderLoad(model[0], uniforms, attributes, vertexshader, fragmentshader);
          });
          jQuery.get('../sites/all/modules/media_model/shaders/fragmentshader', function(data){
            fragmentshader = data;
            console.log("Loaded fragmentshader.js");
            shaderMaterial = shaderLoad(model[0], uniforms, attributes, vertexshader, fragmentshader);
          });

          cursor = new THREE.Vector3(model[0].position.x, model[0].position.y, model[0].position.y);
          for(var p = 0; p < particleCount; p++) {
            var particle = new THREE.Vector3(cursor.x, cursor.y, cursor.z);
            particle.velocity = new THREE.Vector3(Math.random()*2-1,-Math.random()*2-1,Math.random()*2-1);
            particle.velocity.multiplyScalar(0.1);
            particles.vertices.push(particle);
          }
          particleSystem = new THREE.ParticleSystem(particles, pMaterial);
          particleSystem.sortParticles = true;
          //console.log(particleSystem);
          scene.add(particleSystem);
        });
loader.load( objPath, mtlPath);
point1Marker = new THREE.Mesh(new THREE.CylinderGeometry(0, 3, 4, 4, false), new THREE.MeshLambertMaterial({ color : 0x0000FF}));
point2Marker = new THREE.Mesh(new THREE.CylinderGeometry(0, 3, 4, 4, false), new THREE.MeshLambertMaterial({ color : 0x0000FF}));

scene.add(point1Marker);
scene.add(point2Marker);
point1Marker.visible = false;
point2Marker.visible = false;

renderer = new THREE.WebGLRenderer();
renderer.setSize( windowWidth, windowHeight );
renderer.setClearColorHex( 0x8e8272, 1 );

cursorPyr = new THREE.Mesh(new THREE.CylinderGeometry(0, 3, 4, 4, false), new THREE.MeshLambertMaterial({ color : 0xFF00FF}));
scene.add(cursorPyr);

        //renderer.setFaceCulling(0);
        container.appendChild( renderer.domElement );

        container.addEventListener( 'mousemove', onMouseMove, false );
        container.addEventListener( 'mousedown', onMouseDown, false );
        container.addEventListener( 'DOMMouseScroll', onMouseWheel, false );
        container.addEventListener( 'mousewheel', onMouseWheel, false );
      }
      function onMouseWheel( event ){
        event.preventDefault();
      //console.log(event);
      var direction = new THREE.Vector3();
      direction.copy(camera.position);
      direction.addSelf(model[0].position).normalize();
      direction.multiplyScalar(-windowWidth/100*event.wheelDelta/(Math.abs(event.wheelDelta)));
      if(camera.position.x/Math.abs(camera.position.x)==(camera.position.x+direction.x)/Math.abs(camera.position.x+direction.x)
        && camera.position.y/Math.abs(camera.position.y)==(camera.position.y+direction.y)/Math.abs(camera.position.y+direction.y)
        && camera.position.z/Math.abs(camera.position.z)==(camera.position.z+direction.z)/Math.abs(camera.position.z+direction.z))
        camera.position.addSelf(direction);

    }

function orientPyramid(pyramid, pyramidUp){
    var closestFaceIndex;
    closestFaceIndex = 0;
    for( var i=1; i < model[0].geometry.faces.length; i++ ){
      if( cursor.distanceTo(model[0].geometry.faces[closestFaceIndex].centroid) > cursor.distanceTo(model[0].geometry.faces[i].centroid) )
        closestFaceIndex = i;
    }
    pyramid.position.copy(cursor);
    pyramidUp = new THREE.Vector3();
    pyramidUp.copy(model[0].geometry.faces[closestFaceIndex].normal);
    cursorOffset = new THREE.Vector3();
    cursorOffset.copy(pyramidUp);
    cursorOffset.multiplyScalar(2);
    pyramid.position.addSelf(cursorOffset);
    pyramidUp.crossSelf(new THREE.Vector3(-1,0,0));
    var newLook = new THREE.Vector3();
    newLook.copy(pyramid.position);
    pyramidUp.multiplyScalar(pyramid.boundRadius);
    newLook.addSelf(pyramidUp);
    pyramid.lookAt(newLook);
    pyramidUp.normalize();
}
      //var lastX, lastY;
      function onMouseMove( event ) {
    //cursorPyr.position = cursor.copy();//new THREE.Vector3(cursor.x, cursor.y, cursor.z);
    if(model[0]){
    var cursorPyrUp = new THREE.Vector3();
    orientPyramid(cursorPyr, cursorPyrUp);
    // var closestFaceIndex;
    // closestFaceIndex = 0;
    // for( var i=1; i < model[0].geometry.faces.length; i++ ){
    //   if( cursor.distanceTo(model[0].geometry.faces[closestFaceIndex].centroid) > cursor.distanceTo(model[0].geometry.faces[i].centroid) )
    //     closestFaceIndex = i;
    // }
    // cursorPyr.position.copy(cursor);
    // cursorPyrUp = new THREE.Vector3();
    // cursorPyrUp.copy(model[0].geometry.faces[closestFaceIndex].normal);
    // cursorOffset = new THREE.Vector3();
    // cursorOffset.copy(cursorPyrUp);
    // cursorOffset.multiplyScalar(2);
    // cursorPyr.position.addSelf(cursorOffset);
    // cursorPyrUp.crossSelf(new THREE.Vector3(-1,0,0));
    // var newLook = new THREE.Vector3();
    // newLook.copy(cursorPyr.position);
    // cursorPyrUp.multiplyScalar(cursorPyr.boundRadius);
    // newLook.addSelf(cursorPyrUp);
    // cursorPyr.lookAt(newLook);
  }

        if( event.which == 1 && mouse.x && mouse.y ){
          var dx = mouse.x - event.offsetX;
          var dy = mouse.y - event.offsetY;
          rotateAroundObject(camera, dx * 0.015, dy * 0.015);
          rotateAroundObject(dirLight, dx * 0.015, dy * 0.015);

        }

        mouse.x = event.offsetX;
        mouse.y = event.offsetY;
        mouse3D.x = ( event.offsetX / windowWidth ) * 2 - 1;
        mouse3D.y = - ( event.offsetY / windowHeight ) * 2 + 1;

      }


      var lastMouseDown = new Date().getTime();
      function onMouseDown( event ) {

              //console.log(event);
              if( event.which == 1 ){
                var newMouseDown = new Date().getTime();
                if(newMouseDown - lastMouseDown < 250){
                  if(!point1){
              // if no point1, drop point1
              point1 = new THREE.Vector3(cursor.x, cursor.y, cursor.z);
              point1Marker.position.copy(point1);
    var point1MarkerUp = new THREE.Vector3();
    orientPyramid(point1Marker, point1MarkerUp);
            }
            else if(!point2){
              // else if no point2, drop point2
              point2 = new THREE.Vector3(cursor.x, cursor.y, cursor.z);
              point2Marker.position.copy(point2);
    var point2MarkerUp = new THREE.Vector3();
    orientPyramid(point2Marker, point2MarkerUp);
              var pointsDistance = point1.distanceTo(point2);
              distanceText.innerHTML = 'Distance between selected points: ' + pointsDistance;
              container.appendChild(distanceText);
              
              var lineGeometry = new THREE.Geometry();
              lineGeometry.vertices.push(new THREE.Vector3(point1.x,point1.y+1,point1.z+1));
              lineGeometry.vertices.push(new THREE.Vector3(point1.x,point1.y-1,point1.z-1));
              lineGeometry.vertices.push(new THREE.Vector3(point2.x,point2.y+1,point2.z+1));
              lineGeometry.vertices.push(new THREE.Vector3(point2.x,point2.y-1,point2.z-1));
              distanceLine = new THREE.Ribbon(lineGeometry,  new THREE.MeshBasicMaterial( { color: 0x0000FF } ));//{ linewidth: 10 }));
              scene.add(distanceLine);
          }
          else
          {              // else reset
            point1 = point2 = null;
            container.removeChild(distanceText);
            scene.remove(distanceLine);
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
var frame = 0;
var point1, point2;
var distanceText;
var distanceLine;

function animate() {

        //cursorPyr.position = cursor.copy();
        if(point1){ 
          point1Marker.visible = true; 
          //point1Marker.
        }
        else{ point1Marker.visible = false; }
        if(point2){
          point2Marker.visible = true;

        }
        else{ point2Marker.visible = false;}
        uniforms.amplitude.value = Math.sin(frame);
        frame+=1;
        if(model[0] != null && shaderMaterial != null && material != null && !switchedMaterials){
          // //console.log([material, shaderMaterial]);
          // var tmp = THREE.SceneUtils.createMultiMaterialObject( model[0].geometry, [material, shaderMaterial]);
          // tmp.computeFaceNormals()
          // tmp.computeVertexNormals()
          // scene.add(tmp);
          // switchedMaterials = true;
        }
        if(highlighted && particleSystem){ 

          var pCount = particleCount;
          while(pCount--) {

    // get the particle
    var particle = particles.vertices[pCount];
    // check if we need to reset
    //var cursorLoc = new THREE.Vector3(cursor.x, cursor.y, cursor.z);
    if(cursor.distanceTo(particle)>10) {
    //console.log(cursor);
     particle.x = cursor.x;
     particle.y = cursor.y;
     particle.z = cursor.z;
     particle.velocity = new THREE.Vector3(Math.random()*2-1,Math.random()*2-1,Math.random()*2-1);
     particle.velocity.multiplyScalar(0.1);
   }
       //particle.velocity.y -= Math.random() * .1;

    // and the position
    particle.addSelf(particle.velocity);
  }
  for (var i = 0; i > model[0].geometry.vertices.length; i++)
  {       
    var localVertex = model[0].geometry.vertices[i].clone();
    var globalVertex = model[0].matrix.multiplyVector3(localVertex);
    var directionVector = globalVertex.subSelf( model[0].position );
    var ray = new THREE.Ray( model[0].position, directionVector.clone().normalize() );
    var collisionResults = ray.intersectObjects( model );

    if ( collisionResults.length > 0 && collisionResults[0].distance < directionVector.length() ) 
    {
        // a collision occurred... do something...
      }
    }

  // that we've changed its vertices.
  particleSystem.geometry.verticesNeedUpdate = true;
  particleSystem.visible = true;
}
else if(particleSystem){
  particleSystem.visible = false;
}



requestAnimationFrame( animate );
render();

}

function render() {
  var vector = new THREE.Vector3(mouse3D.x, mouse3D.y, 1);
  projector.unprojectVector( vector, camera );
  var ray = new THREE.Ray(camera.position, vector.subSelf( camera.position ).normalize() );
  var intersects = ray.intersectObjects( model );

  if(intersects.length>0){
    for(var i=0;i<intersects.length;i++){
      cursor.copy(intersects[i].point);
      cursorPLight.position.copy(intersects[i].point);
      highlighted = true;
    }
  }
  else{
    highlighted = false;
  }
  renderer.render( scene, camera );
}

  // Rotate an object around an arbitrary axis in world space       
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
function rotateAroundWorldAxis(object, axis, radians) {
    rotWorldMatrix = new THREE.Matrix4();
    rotWorldMatrix.makeRotationAxis(axis.normalize(), radians);
    rotWorldMatrix.multiplySelf(object.matrix);        // pre-multiply
    object.matrix = rotWorldMatrix;
    object.rotation.getRotationFromMatrix(object.matrix, object.scale);
}

function shaderLoad(model, uniforms, attributes, vertexshader, fragmentshader){
  if(vertexshader == null || fragmentshader == null)
    return;

  var shaderMaterial = new THREE.ShaderMaterial({
    uniforms:       uniforms,
    attributes:     attributes,
    vertexShader:   vertexshader,
        //fragmentShader: fragmentshader
      });
  var verts =
  model.geometry.vertices;

  var values =
  attributes.displacement.value;

  for(var v = 0; v < verts.length; v++) {
    values.push(Math.random() * 30);
  }
  return shaderMaterial;
}
}

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