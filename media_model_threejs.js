var objPath, mtlPath, fileId;

function media_model_viewer(objPath, mtlPath, nrmPath, fileId){
  var container;

  var camera;
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

  function init() {
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

        jQuery.get('../sites/all/modules/media_model/shaders/vertexshader', function(data){
          vertexshader = data;
          console.log("Loaded vertexshader.js");
          shaderMaterial = shaderLoad(uniforms, attributes, vertexshader, fragmentshader);
        });
        jQuery.get('../sites/all/modules/media_model/shaders/fragmentshader', function(data){
          fragmentshader = data;
          console.log("Loaded fragmentshader.js");
          shaderMaterial = shaderLoad(uniforms, attributes, vertexshader, fragmentshader);
        });


        var loader = new THREE.OBJMTLLoader();
        loader.addEventListener( 'load', function ( event ) {
          var tmp = event.content;
          for(var i=0;i<tmp.children.length;i++){
            model.push(tmp.children[i]);
            model[i].name = "model";
            model[i].material = material;
            model[i].flipSided = true;
            model[i].doubleSided = true;
            //scene.add(model[i]);
          }
          cursor = new THREE.Vector3(model[0].position.x, model[0].position.y, model[0].position.y);
          for(var p = 0; p < particleCount; p++) {
            var particle = new THREE.Vector3(cursor.x, cursor.y, cursor.z);
            particle.velocity = new THREE.Vector3(Math.random()*2-1,-Math.random()*2-1,Math.random()*2-1);
            particle.velocity.multiplyScalar(0.1);
            particles.vertices.push(particle);
          }
          particleSystem = new THREE.ParticleSystem(particles, pMaterial);
          particleSystem.sortParticles = true;
          console.log(particleSystem);
          scene.add(particleSystem);
        });
loader.load( objPath, mtlPath);

renderer = new THREE.WebGLRenderer();
renderer.setSize( windowWidth, windowHeight );
renderer.setClearColorHex( 0x8e8272, 1 );
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

      //var lastX, lastY;
      function onMouseMove( event ) {

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


      function onMouseDown( event ) {
        if( event.which == 1 ){

        }
      }

      //

      var switchedMaterials = false;
      var frame = 0;
      function animate() {
        uniforms.amplitude.value =
    Math.sin(frame);
    frame+=1;
        if(model[0] != null && shaderMaterial != null && material != null && !switchedMaterials){
          console.log([material, shaderMaterial]);
          var tmp = THREE.SceneUtils.createMultiMaterialObject( model[0].geometry, [material, shaderMaterial]);
          //model[0].material = [material, shaderMaterial];
          scene.add(tmp);
          switchedMaterials = true;
        }
        if(highlighted && particleSystem){ 

          var pCount = particleCount;
          while(pCount--) {

    // get the particle
    var particle = particles.vertices[pCount];
    // check if we need to reset
    if(cursor.distanceTo(particle)>10) {
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
    //if(i==0)console.log(collisionResults);
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

//console.log(cursorPLight);
//console.log(cursor);

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



    function shaderLoad(uniforms, attributes, vertexshader, fragmentshader){
      if(vertexshader == null || fragmentshader == null)
        return;

      var shaderMaterial = new THREE.ShaderMaterial({
        uniforms:       uniforms,
        attributes:     attributes,
        vertexShader:   vertexshader,
        //fragmentShader: fragmentshader
      });
      return shaderMaterial;
    }
  }