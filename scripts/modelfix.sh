# Model fixing for media_model
# by Justin Hall
# 4/17/2012
#
# Takes .obj files and creates lower poly count versions based on the reduce-<number>.mlx scripts

suff=.obj
low=_low
med=_med
high=_high
mtl=.mtl
for original in "$@"
do
	fname=${original%$suff}
	echo "Producing derivatives for $fname"
	"C:/Program Files/VCG/MeshLab/meshlabserver" -i $original -o $fname$low$suff -s ./mlx/reduce-5000.mlx -om vc vn vt fc wt
	#perl -pi -e "s/$fname$low$suff$mtl/$fname$mtl/g" $fname$low$suff
	"C:/Program Files/VCG/MeshLab/meshlabserver" -i $original -o $fname$med$suff -s ./mlx/reduce-50000.mlx -om vc vn vt fc wt
	#perl -pi -e "s/$fname$med$suff$mtl/$fname$mtl/g" $fname$med$suff
	"C:/Program Files/VCG/MeshLab/meshlabserver" -i $original -o $fname$high$suff -s ./mlx/reduce-200000.mlx -om vc vn vt fc wt
	#perl -pi -e "s/$fname$high$suff$mtl/$fname$mtl/g" $fname$high$suff
done
rm *.bak
rm *.obj.mtl