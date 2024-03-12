#!/bin/sh

# Use "$@" to represent all the arguments
for envVar in "$@"
do
    # Hotfix: remove escaped characters by \\
    echo "${envVar//\\\\/}" >> .env
done