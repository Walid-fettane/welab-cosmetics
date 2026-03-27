FROM php:8.3-cli

ARG USERID=1000
ARG GROUPID=1000

# Installer les dependances systeme
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpq-dev \
    libicu-dev \
    libzip-dev \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    unzip \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Installer les extensions PHP
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    pdo \
    pdo_pgsql \
    pgsql \
    intl \
    zip \
    gd \
    opcache

# Installer Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Installer Symfony CLI
RUN curl -sS https://get.symfony.com/cli/installer | bash \
    && mv /root/.symfony5/bin/symfony /usr/local/bin/symfony

# Installer Node.js (pour assets Symfony si besoin)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Creer l'utilisateur avec UID/GID specifiques
RUN groupadd --gid ${GROUPID} devgroup && \
    useradd --uid ${USERID} --gid ${GROUPID} --shell /bin/bash --create-home devuser

# Configurer les permissions
RUN mkdir -p /var/www/html \
    && chown -R devuser:devgroup /var/www/html

# Configuration PHP
RUN echo "memory_limit = 512M" > /usr/local/etc/php/conf.d/memory.ini \
    && echo "upload_max_filesize = 50M" >> /usr/local/etc/php/conf.d/memory.ini \
    && echo "post_max_size = 50M" >> /usr/local/etc/php/conf.d/memory.ini

USER devuser

WORKDIR /var/www/html

EXPOSE 8000
