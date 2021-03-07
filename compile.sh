#!/usr/bin/bash

shopt -s globstar

tsc

cd src
for file in **/*.{js,css,json,pug}; do
    mkdir -p $(dirname ../dist/$file)
    cp $file ../dist/$file
done
