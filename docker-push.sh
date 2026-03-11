#!/bin/bash

# Script pour builder et push l'image Docker vers DockerHub
# Usage: ./docker-push.sh [tag]

set -e

DOCKER_USERNAME="julienfroidefond32"
IMAGE_NAME="stripstream"

# Utiliser le tag fourni ou 'latest' par défaut
TAG=${1:-latest}

FULL_IMAGE_NAME="$DOCKER_USERNAME/$IMAGE_NAME:$TAG"

echo "=== Building Docker image: $FULL_IMAGE_NAME ==="
docker build -t $FULL_IMAGE_NAME .

echo ""
echo "=== Pushing to DockerHub: $FULL_IMAGE_NAME ==="
docker push $FULL_IMAGE_NAME

echo ""
echo "=== Successfully pushed: $FULL_IMAGE_NAME ==="
