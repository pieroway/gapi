# =================================================================
# Garage Sale Finder - PHP/Apache Docker Image
# =================================================================
# Uses the official PHP image with Apache built in.
# PHP 8.2 matches what most modern shared hosts provide.
# =================================================================

FROM php:8.2-apache

# Enable Apache mod_rewrite (required for .htaccess routing)
RUN a2enmod rewrite

# Install the PDO MySQL extension (required for database access)
RUN docker-php-ext-install pdo pdo_mysql

# Allow .htaccess files to override Apache config
# This sets AllowOverride All for the web root
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Add an explicit <Directory> block for the web root in the default vhost
# so that AllowOverride All is guaranteed even when the volume mount
# replaces the directory that apache2.conf's generic block covers.
RUN sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html\n\n\t<Directory /var/www/html>\n\t\tOptions -Indexes +FollowSymLinks\n\t\tAllowOverride All\n\t\tRequire all granted\n\t</Directory>|' /etc/apache2/sites-available/000-default.conf

# Copy the PHP API files into the web root
COPY php/api/ /var/www/html/api/

# Copy the public frontend files (HTML, CSS, JS, images).
# public/.htaccess is included here — it lives in public/ so it is also
# present when the folder is deployed directly to cPanel shared hosting.
COPY public/ /var/www/html/

# Copy and set up the entrypoint script
COPY php/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create the uploads directory and make it writable
RUN mkdir -p /var/www/html/uploads && \
    chown -R www-data:www-data /var/www/html/uploads && \
    chmod 755 /var/www/html/uploads

# Set correct ownership for the whole web root
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80

# Use our entrypoint to inject DB env vars before Apache starts
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
