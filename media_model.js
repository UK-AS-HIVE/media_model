jQuery(document).ready(function() {

function square(num) {
	return Math.pow(num,2);
}

var keyInput = new GLGE.KeyInput();
var lookAt=function(origin,point){
	var coord=[origin[0]-point[0],origin[1]-point[1],origin[2]-point[2]];
	var zvec=GLGE.toUnitVec3(coord);
	var xvec=GLGE.toUnitVec3(GLGE.crossVec3([0,1,0],zvec));
	var yvec=GLGE.toUnitVec3(GLGE.crossVec3(zvec,xvec));		
	return [xvec[0], yvec[0], zvec[0], 0,
					xvec[1], yvec[1], zvec[1], 0,
					xvec[2], yvec[2], zvec[2], 0,
					0, 0, 0, 1];
}


var canvas = jQuery('canvas.threejs-model')[0];
//canvas.width=innerWidth;
//canvas.height=innerHeight;


var drag=false;
var view=false;
var rotY=0;
var startpoint;
var cameraPos=[0,0,20];
var scene;
var distPoint1 = "No point selected";
var distPoint2 = "No point selected";
var cursor;

var measuringEndpoint1;
var measuringEndpoint2;
var distanceLine;

canvas.onmousedown=function(e){
	if(e.button==0){
		if (keyInput.isKeyPressed(GLGE.KI_CTRL)) {
			var pickData = scene.pick(e.clientX, e.clientY);
			if (distPoint1 && distPoint2) {
				distPoint1 = distPoint2 = null;
				measuringEndpoint1.setVisible(false);
				measuringEndpoint2.setVisible(false);
				distanceLine.setVisible(false);
			}
			if (!distPoint1) {
				distPoint1 = pickData.coord;
			}
			else {
				distPoint2 = pickData.coord;
			}

			if (distPoint1) {
				measuringEndpoint1.setLoc(distPoint1[0], distPoint1[1], distPoint1[2]);
				measuringEndpoint1.setVisible(true);
			}
			if (distPoint2) {
				measuringEndpoint2.setLoc(distPoint2[0], distPoint2[1], distPoint2[2]);
				measuringEndpoint2.setVisible(true);
			}
			if (distPoint1 && distPoint2) {
				var vertices = [].concat(distPoint1, distPoint2);
				distanceLine.getMesh().setPositions(vertices);
				distanceLine.setVisible(true);
				console.log(distPoint1, distPoint2);
				xd = distPoint1[0] - distPoint2[0];
				yd = distPoint1[1] - distPoint2[1];
				zd = distPoint1[2] - distPoint2[2];
				console.log("Point 1: ", distPoint2);
				console.log("Point 2: ", distPoint1);
				console.log("Distance: ", Math.sqrt(xd*xd + yd*yd + zd*zd));
			}

		}
		else {
        	view=true;
        	startpoint=[e.clientX,e.clientY,cameraPos[0],cameraPos[1]];
    	}
	}
	e.preventDefault();
}

canvas.onmouseup=function(e){
	view=false;
}
canvas.onmousemove=function(e){

	if(view){
		cameraPos[0]=startpoint[2]-(e.clientX-startpoint[0])/canvas.width*20;
		cameraPos[1]=startpoint[3]+(e.clientY-startpoint[1])/canvas.height*20;
		
		camera.setRotMatrix(lookAt([0,cameraPos[1],0],[0,2,-cameraPos[2]]));
		cameraOffset.setRotY(cameraPos[0]/10);
		cameraOffset.setLocY(cameraPos[1]);
		render=true;
	}

	var pickData = scene.pick(e.clientX, e.clientY);
	if (!pickData || isNaN(pickData.coord[0])) {
		cursor.setVisible(false);
	}
	else {
		cursor.setLoc(pickData.coord[0], pickData.coord[1], pickData.coord[2]);
		cursor.setVisible(true);
	}
}
canvas.onmousewheel=function(e){
    var wheelData = e.detail ? e.detail/10 : e.wheelDelta/-300;
    cameraPos[2]+=wheelData;
    if(cameraPos[2]<1 && cameraPos[2]>-1) cameraPos[2]=cameraPos[2]/Math.abs(cameraPos[2]);
    camera.setLocZ(cameraPos[2]);
    camera.setRotMatrix(lookAt([0,cameraPos[1],0],[0,2,-cameraPos[2]]));
    render=true;
}
canvas.addEventListener('DOMMouseScroll', canvas.onmousewheel, false);


canvas.oncontextmenu=function(e){
	return false;
}

var renderer = new GLGE.Renderer( canvas );

var XMLdoc = new GLGE.Document();
var camera;
var cameraOffset;

	
XMLdoc.onLoad = function(){	
	scene = XMLdoc.getElement( "mainscene" );
	camera = XMLdoc.getElement( "mainCamera" );
	cameraOffset = XMLdoc.getElement( "cameraOffset" );
	var model= XMLdoc.getElement( "model" );

  //when model loaded get animations
	model.addEventListener("loaded",function(data){
		//var anim=document.getElementById("animations");
		var animations=this.getAnimations();
		for(var i=0;i<animations.length;i++){
			var ele=document.createElement("div");
			ele.innerHTML=animations[i];
			var that=this;
			ele.onmousedown=function(){
				that.setMD2Animation(this.innerHTML,true);
			};
      console.log(animations[i]);
			//anim.appendChild(ele);
		}
	});
	

	/*var multimaterials = model.getMultiMaterials();
	for (var multimaterial in multimaterials) {
		multimaterial.getMaterial().setShadeless(true);
		multimaterial.getMaterial().setShadow(false);
	};*/
	
	var measuringEndpointMesh = new GLGE.Sphere();
	measuringEndpointMesh.setRadius(0.2)
	measuringEndpoint1 = new GLGE.Object();
	measuringEndpoint1.setMesh(measuringEndpointMesh);
	measuringEndpoint1.setMaterial(XMLdoc.getElement("red"));
	measuringEndpoint1.setVisible(false);
	measuringEndpoint2 = new GLGE.Object();
	measuringEndpoint2.setMesh(measuringEndpointMesh);
	measuringEndpoint2.setMaterial(XMLdoc.getElement("blue"));
	measuringEndpoint2.setVisible(false);

	cursor = new GLGE.Object();
	cursor.setMesh(measuringEndpointMesh);
	cursor.setMaterial(XMLdoc.getElement("green"));
	cursor.setVisible(false);

	distanceLine = (new GLGE.Object()).setDrawType(GLGE.DRAW_LINES);
	distanceLine.setMesh((new GLGE.Mesh));
	distanceLine.setMaterial(XMLdoc.getElement("distance"));
	distanceLine.setVisible(false);
	scene.addObject(measuringEndpoint1);
	scene.addObject(measuringEndpoint2);
	scene.addObject(distanceLine);
	scene.addObject(cursor);
		
	//rotate camera
	camera.setRotMatrix(lookAt([0,cameraPos[1],0],[0,2,-cameraPos[2]]));
	
	//draw grid
	var positions=[];
	for(var x=-50; x<50;x++){
		if(x!=0){
			positions.push(x);positions.push(0);positions.push(-50);
			positions.push(x);positions.push(0);positions.push(50);
			positions.push(50);positions.push(0);positions.push(x);
			positions.push(-50);positions.push(0);positions.push(x);
		}
	}
	
	var line=(new GLGE.Object).setDrawType(GLGE.DRAW_LINES);
	line.setMesh((new GLGE.Mesh).setPositions(positions));
	line.setMaterial(XMLdoc.getElement( "lines" ));
	scene.addObject(line);
		
	renderer.setScene( scene );
	renderer.render();
	var lasttime;
	setInterval(function(){
		var now=+new Date;

		renderer.render();

		lasttime=now;
	},15);
}

XMLdoc.parseScript("glge-document");

});

