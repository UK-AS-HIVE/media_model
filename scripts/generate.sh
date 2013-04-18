# Material, texture, and normal derivations for media_model
# by Justin Hall
# 4/17/2012
#
# Takes in an "orignals" directory and cross references it with the media_model_files directory, creating requried derivatives

src="$1"
dst=../../../../default/files/media_model_files
obj=.obj


for object in `ls ${src}/*.obj`
do
	base="${object%.*}"
	file=$(basename "$object")
	fname="${file%.*}"
	echo "Producing derivatives for $fname"
	if [ ! -e "${dst}/${fname}_normal_low.png" ]
	then
		convert "${base}_normal.png" -resize 512x512 "${dst}/${fname}_normal_low.png"
	fi
	if [ ! -e "${dst}/${fname}_normal_med.png" ]
	then
		convert "${base}_normal.png" -resize 2048x2048 "${dst}/${fname}_normal_med.png"
	fi
	if [ ! -e "${dst}/${fname}_normal_high.png" ]
	then
		convert "${base}_normal.png" -resize 4096x4096 "${dst}/${fname}_normal_high.png"
	fi
	if [ ! -e "${dst}/${fname}_low.jpg" ]
	then
		convert "${base}.jpg" -resize 512x512 "${dst}/${fname}_low.jpg"
	fi
	if [ ! -e "${dst}/${fname}_med.jpg" ]
	then
		convert "${base}.jpg" -resize 2048x2048 "${dst}/${fname}_med.jpg"
	fi
	if [ ! -e "${dst}/${fname}_high.jpg" ]
	then
		convert "${base}.jpg" -resize 4096x4096 "${dst}/${fname}_high.jpg"
	fi
done
