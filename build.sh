#!/bin/bash
version="$1"
if [ -z "$version" ]; then
	version=dev
fi

cd $(dirname $0)
build=build/nanomaps-js-$version
mkdir -p $build/debug
mkdir -p $build/prod
assetserver="java -jar bin/assetserver"

echo "Building debug version into $build/debug"
$assetserver cp --disable-optimization . $build/debug

echo "Building prod version into $build/prod"
$assetserver cp . $build/prod

echo "Building apidocs"
./generate-docs.sh $build/apidocs

cd build
tar czf nanomaps-js-$version.tar.gz $(basename $build)

