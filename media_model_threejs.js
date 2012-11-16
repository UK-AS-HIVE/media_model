var objPath, mtlPath, fileId;

function media_model_viewer(objPath, mtlPath, fileId){
      var container;

      var camera;
      var dirLight = new THREE.DirectionalLight( 0xffffff );
      var scene, renderer;

      var mouseX = 0, mouseY = 0;
      var rotRadius = 100;
      windowWidth = 640;
      windowHeight = 480;
      var windowHalfX = windowWidth / 2;
      var windowHalfY = windowHeight / 2;
      var model;

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

        var ambient = new THREE.AmbientLight( 0x614400);
        scene.add( ambient );

        dirLight.position.set(0,0,1).normalize();
        scene.add( dirLight );

/*
        // grid
        var material = new THREE.LineBasicMaterial({
          color: 0x0000ff,
        }); 
        var geom = new THREE.Geometry();
        geom.vertices.push( new THREE.Vector3() );
        geom.vertices.push( new THREE.Vector3() );
        var newLine;
        for(var i=0;i<=10;i++){

          geom.vertices[0].set( -50, 0, -50+i*10 );
          geom.vertices[1].set( 50, 0, -50+i*10 );
          newLine = new THREE.Line(geom, material);
          console.log( newLine);
          scene.add( newLine );
          geom.vertices[0].set( new THREE.Vector3(-50, 0, -50+i*10) );
          geom.vertices[1].set( new THREE.Vector3(50, 0, -50+i*10) );
          scene.add( new THREE.Line(geom) );
        }*/



        // model

        var loader = new THREE.OBJMTLLoader();
        loader.addEventListener( 'load', function ( event ) {

          model = event.content;
          scene.add( model );

        });
      loader.load( objPath, mtlPath);
        renderer = new THREE.WebGLRenderer();
        renderer.setSize( windowWidth, windowHeight );
        renderer.setClearColorHex( 0x8e8272, 1 );
        container.appendChild( renderer.domElement );
        container.addEventListener( 'mousemove', onMouseMove, false );
        container.addEventListener( 'mousedown', onMouseDown, false );
        container.addEventListener( 'DOMMouseScroll', onMouseWheel, false );
        container.addEventListener( 'mousewheel', onMouseWheel, false );
      }
    function onMouseWheel( event ){
      event.preventDefault();
      console.log(event);
      var direction = new THREE.Vector3();
      direction.copy(camera.position);
      direction.addSelf(model.position).normalize();
      direction.multiplyScalar(-windowWidth/100*event.wheelDelta/(Math.abs(event.wheelDelta)));
      camera.position.addSelf(direction);
      /*
    var wheelData = e.detail ? e.detail/10 : e.wheelDelta/-300;
    cameraPos[2]+=wheelData;
    if(cameraPos[2]<1 && cameraPos[2]>-1) cameraPos[2]=cameraPos[2]/Math.abs(cameraPos[2]);
    camera.setLocZ(cameraPos[2]);
    camera.setRotMatrix(lookAt([0,cameraPos[1],0],[0,2,-cameraPos[2]]));
    render=true;*/
}

      var lastX, lastY;
      function onMouseMove( event ) {

        if( event.which == 1 && lastX && lastY ){
          var dx = lastX - event.clientX;
          var dy = lastY - event.clientY;
          rotateAroundObject(camera, dx * 0.015, dy * 0.015);
          rotateAroundObject(dirLight, dx * 0.015, dy * 0.015);

        }
                lastX = event.clientX;
          lastY = event.clientY;
      }


      function onMouseDown( event ) {
        if( event.which == 1 ){
          
        }
      }

      //

      function animate() {

        requestAnimationFrame( animate );
        render();

      }

      function render() {

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
}
