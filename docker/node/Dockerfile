FROM node:20-slim

ARG USERID=1000
ARG GROUPID=1000

# Installer les dependances systeme
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Installer Angular CLI globalement
RUN npm install -g @angular/cli@latest

# Utiliser le user node (deja existant dans l'image node avec UID 1000)
RUN mkdir -p /app && chown -R node:node /app

RUN mkdir -p /home/node/.npm && chown -R node:node /home/node

USER node

WORKDIR /app

EXPOSE 4200
