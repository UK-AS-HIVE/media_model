CONTENTS OF THIS FILE
---------------------

 * Introduction
 * Module Installation
 * Per model instructions
 * Controls
 * Future plans
 * Thanks
 * References

INTRODUCTION
------------

This module provides a platform for interacting with annotating Wavefront OBJ format 3D models. This is accomplished by adding a file type for 3D models, and formatting the file with hook_file_view_alter. Per model steps should be taken to ensure the highest quality experience, and these are outlined below.

Annotation consists of text and/or a set of points which refer to an individual model. The set of points can be of the form points, a line, or a polygon. The module's client will allow up to 7 different annotations to be worked on simultaneously, but they are saved individually. Functionality is detailed further in Controls.

MODULE INSTALLATION
-------------------

The following modules must be installed:
	Media (2.x or above)
	Libraries

In addition to these modules, Three.js should be installed to the Libraries folder such that it can be referenced at <libraries>build/three.js. Three.js is in heavy development, so we suggest using r56. Here are some steps for obtaining this version through git:
 $ cd <libraries folder location>
 $ git clone https://github.com/mrdoob/three.js.git three.js
 $ git checkout f4ce3b666826fb5a140eccbc408baf478708de73

A full list of instructions:
1. Install and configure the module dependencies.

2. Enabled media_model.

3. Ensure that any per model instructions have been done, and that all models are in the following format:
	<original_name>.obj
	<original_name>.mtl
	<original_name>.jpg
	Where <original_name> is some name for the model, mtl is a valid material, and jpg is the texture referenced in the mtl file. All files should be stored in the same directory.

PER MODEL INSTRUCTIONS
----------------------

For each model intended for use in media_model, some steps should be taken to ensure full functionality. We have provided instructions for use with the free program MeshLab[1] Here is a basic workflow for a single model. 

1. Create variable poly count models. If you would like to use your original model as the high quality model, you can skip the filtering steps and simply copy and rename the model. The settings for these filters are also mirrored in the reduce-*.mlx scripts located in <media_model>\scripts\mlx\, but it's not really quicker to use them at this point. It's easiest to start by making highest quality and working toward the lowest.

	a. Open up MeshLab and go to File->Import Mesh...
	b. Browse to and select the desired original mesh
	c. Go to Filters->Remeshing, Simplificiation and Reconstruction->Quadratic Edge Collapse Decimation (with texture)
	d. Fill out the following values:
		Target number of faces [200000, 50000, or 5000 depending on if you are producing high, medium, or low]
		Percentage reduction (0..1) [0]
		Quality threshhold [1]
		Texture Weight [1]
		Preserve Boundary of the mesh [check]
		Boundary Preserving Weight [1]
		Optimal position of simplified vertices [check]
		Preserve Normal [check]
		Planar Simplification [check]
		Simplify only selected faces [no check]
	e. Click Apply
	f. Go to Filer->Export Mesh as...
	g. Save the file as <original_name>_<quality>.obj, where <original_name> is the original file name and <quality> is low, medium, or high.
	h. If you would like to produce a further decimated model, go to Filters->Show current filter script
	i. Select the Quadratic Edge Collapse Decimation (with texture) and click Edit Paramters on the right hand side
	j. Change the target number of faces to the new target number of faces, and repeat the application and export process.
		* Be sure to delete any extra .mtl files produced during this process.

2. Create variable sized normal maps.

	a. Open up MeshLab and go to File->Import Mesh...
	b. Browse to and select the desired original mesh
		* You can skip to step h by going to Filters->Show current filter script, selecting Open Script, and using our normals.mlx (<media_model>\scripts\mlx\).
	c. Go to Filters->Mesh Layer->Duplicate Current layer
	 	* If you go to View->Show layer dialog, you will see a list of layers on the right. Make sure you have the _copy highlighted.
	d. Go to Filters->Remeshing, Simplificiation and Reconstruction->Quadratic Edge Collapse Decimation (with texture)
	e. Fill out the following values:
		Target number of faces [5000]
		Percentage reduction (0..1) [0]
		Quality threshhold [1]
		Texture Weight [1]
		Preserve Boundary of the mesh [check]
		Boundary Preserving Weight [1]
		Optimal position of simplified vertices [check]
		Preserve Normal [check]
		Planar Simplification [check]
		Simplify only selected faces [no check]
	f. Click Apply
	g. Go to Filters->Texture->Transfer Vertex Attributes to texture (between 2 meshes)
	h. Fill out the following values:
		Source Mesh [<original_name>.obj]
		Target Mesh [<original_name>.obj_copy]
		Color Data Source [Vertex Normal]
		Max Dist Search [8.6519][2.000]
		Texture file [<original_name>_normal.png]
		Texture width (px) [512, 2048, or 4096 depending on if you are producing high, medium, or low]
		Texture heigh (px) [512, 2048, or 4096 depending on if you are producing high, medium, or low]
		Overwrite Target Mesh Texture [no check]
		Assign Texture [no check]
		Fill texture [check]
	i. Click apply

3. Move all of the created files to public://media_model_files/. This folder might have been created automatically. We recommend keeping them out of your file management system, as they do not need to be for the module to work properly. 




FUTURE PLANS
------------

Though the module is capable of use right now, the setup could be more
configurable through the Drupal interface.

 * admin page for setting minimum dimensions to use
 * allow specifying a fallback formatter for smaller images
 * use queue or batch to generate the image tiles, instead of a drush script

THANKS
------

This module was developed at the University of Kentucky [College of Arts &
Sciences][2] for a scholarly project under the direction of Dr. Bill Endres,
documenting illuminated insular manuscripts including the St.  Chad Gospels
and the Wycliffe New Testament housed at the [Lichfield Cathedral][3] in the
United Kingdom.  More details from Dr. Endres about the project can be found
at its website, [The Manuscripts of Lichfield Cathedral][4].

REFERENCES
----------

[1]: http://meshlab.sourceforge.net/
