#!/bin/bash
cd $(dirname $0)
mkdir -p build/debug
mkdir -p build/prod

echo "Building debug version into build/debug"
assetserver cp --disable-optimization . build/debug

echo "Building prod version into build/prod"
assetserver cp . build/prod

