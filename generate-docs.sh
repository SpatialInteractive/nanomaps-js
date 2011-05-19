#!/bin/bash
cd $(dirname $0)
td=$(pwd)
out="$1"
if [ -z "$out" ]; then
	out=$td/build/apidocs
fi
echo "Writing docs to $out"

SRC_DIR=client/lib/components
SRC_FILES="
	$SRC_DIR/nanomaps.util.js
	$SRC_DIR/nanomaps.dom.js
	$SRC_DIR/nanomaps.geometry.js
	$SRC_DIR/nanomaps.projections.js
	$SRC_DIR/nanomaps.core.js 
	$SRC_DIR/nanomaps.tiles.js
	$SRC_DIR/nanomaps.motion.js
	$SRC_DIR/nanomaps.imgmarker.js
	$SRC_DIR/nanomaps.svgmarker.js
	"

if [ -z "$JSDOC_DIR" ]; then
	JSDOC_DIR=$td/jsdoc-toolkit
fi

if ! [ -f "$JSDOC_DIR/jsrun.jar" ]; then
	echo "JSDoc Toolkit not found in $JSDOC_DIR.  Please install it."
	echo "It can be downloaded from: http://code.google.com/p/jsdoc-toolkit/"
	exit 1
fi

jsdoc() {
	if ! ( java -Djsdoc.dir=$JSDOC_DIR -jar $JSDOC_DIR/jsrun.jar $JSDOC_DIR/app/run.js "$@" ); then
		return 1
	fi
}

mkdir -p $out

if ! ( jsdoc -d=$out -e=UTF-8 -t=$JSDOC_DIR/templates/jsdoc $SRC_FILES )
then
	echo "Error generating documentation."
	exit 1
fi

if [ -d $td/pages ]; then
	echo "Updating website with documentation"
	mkdir -p $td/pages/apidocs
	cp -a $out/* $td/pages/apidocs	
fi

