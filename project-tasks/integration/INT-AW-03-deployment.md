# INT-AW-03: Deploy and Configure Appwrite in Production

## Title
Deploy and Configure Appwrite in Production

## Priority
High

## Estimated Time
8-12 hours

## Dependencies
- INT-AW-01: Data migration completed
- INT-AW-02: Testing and validation passed
- All BE-AW and FE-AW tasks completed

## Description
Deploy and configure Appwrite in production environment, including infrastructure setup, security hardening, monitoring configuration, backup procedures, and performance optimization. This includes setting up production-grade Appwrite instance, configuring SSL certificates, implementing monitoring and alerting, and establishing operational procedures for the migrated system.

The deployment will ensure high availability, security, and performance for the production healthcare system.

## Acceptance Criteria
- [ ] Production Appwrite instance deployed and configured
- [ ] SSL certificates installed and configured
- [ ] Database backup and recovery procedures implemented
- [ ] Monitoring and alerting systems configured
- [ ] Security hardening completed
- [ ] Performance optimization applied
- [ ] Load balancing and high availability configured
- [ ] Disaster recovery procedures documented
- [ ] Production deployment validated
- [ ] Rollback procedures tested and documented

## Technical Notes

### Production Infrastructure Setup

#### Docker Compose Production Configuration
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  appwrite:
    image: appwrite/appwrite:1.4.13
    container_name: appwrite
    restart: unless-stopped
    networks:
      - appwrite
    volumes:
      - appwrite-uploads:/storage/uploads:rw
      - appwrite-cache:/storage/cache:rw
      - appwrite-config:/storage/config:rw
      - appwrite-certificates:/storage/certificates:rw
      - appwrite-functions:/storage/functions:rw
    depends_on:
      - mariadb
      - redis
      - clamav
      - influxdb
    environment:
      - _APP_ENV=production
      - _APP_LOCALE=en
      - _APP_CONSOLE_WHITELIST_ROOT=enabled
      - _APP_CONSOLE_WHITELIST_EMAILS=admin@immuneme.org
      - _APP_CONSOLE_WHITELIST_IPS=
      - _APP_SYSTEM_EMAIL_NAME=Immune Me System
      - _APP_SYSTEM_EMAIL_ADDRESS=system@immuneme.org
      - _APP_SYSTEM_SECURITY_EMAIL_ADDRESS=security@immuneme.org
      - _APP_SYSTEM_RESPONSE_FORMAT=
      - _APP_OPTIONS_ABUSE=enabled
      - _APP_OPTIONS_FORCE_HTTPS=enabled
      - _APP_OPTIONS_FUNCTIONS_FORCE_HTTPS=enabled
      - _APP_OPENSSL_KEY_V1=${_APP_OPENSSL_KEY_V1}
      - _APP_DOMAIN=${_APP_DOMAIN}
      - _APP_DOMAIN_TARGET=${_APP_DOMAIN_TARGET}
      - _APP_DOMAIN_FUNCTIONS=${_APP_DOMAIN_FUNCTIONS}
      - _APP_REDIS_HOST=redis
      - _APP_REDIS_PORT=6379
      - _APP_REDIS_USER=
      - _APP_REDIS_PASS=
      - _APP_DB_HOST=mariadb
      - _APP_DB_PORT=3306
      - _APP_DB_SCHEMA=appwrite
      - _APP_DB_USER=${_APP_DB_USER}
      - _APP_DB_PASS=${_APP_DB_PASS}
      - _APP_SMTP_HOST=${_APP_SMTP_HOST}
      - _APP_SMTP_PORT=${_APP_SMTP_PORT}
      - _APP_SMTP_SECURE=${_APP_SMTP_SECURE}
      - _APP_SMTP_USERNAME=${_APP_SMTP_USERNAME}
      - _APP_SMTP_PASSWORD=${_APP_SMTP_PASSWORD}
      - _APP_USAGE_STATS=enabled
      - _APP_INFLUXDB_HOST=influxdb
      - _APP_INFLUXDB_PORT=8086
      - _APP_STORAGE_LIMIT=30000000000
      - _APP_STORAGE_PREVIEW_LIMIT=20000000
      - _APP_STORAGE_ANTIVIRUS=enabled
      - _APP_STORAGE_ANTIVIRUS_HOST=clamav
      - _APP_STORAGE_ANTIVIRUS_PORT=3310
      - _APP_FUNCTIONS_SIZE_LIMIT=30000000
      - _APP_FUNCTIONS_TIMEOUT=900
      - _APP_FUNCTIONS_BUILD_TIMEOUT=900
      - _APP_FUNCTIONS_CONTAINERS=10
      - _APP_FUNCTIONS_CPUS=0
      - _APP_FUNCTIONS_MEMORY=0
      - _APP_FUNCTIONS_MEMORY_SWAP=0
      - _APP_FUNCTIONS_RUNTIMES=node-18.0,php-8.2,python-3.11
      - _APP_EXECUTOR_SECRET=${_APP_EXECUTOR_SECRET}
      - _APP_EXECUTOR_HOST=http://appwrite-executor/v1
      - _APP_LOGGING_PROVIDER=
      - _APP_LOGGING_CONFIG=
      - _APP_MAINTENANCE_INTERVAL=86400
      - _APP_MAINTENANCE_RETENTION_EXECUTION=1209600
      - _APP_MAINTENANCE_RETENTION_CACHE=2592000
      - _APP_MAINTENANCE_RETENTION_ABUSE=86400
      - _APP_MAINTENANCE_RETENTION_AUDIT=1209600
      - _APP_MAINTENANCE_RETENTION_USAGE_HOURLY=8640000
      - _APP_MAINTENANCE_RETENTION_SCHEDULES=86400
    labels:
      - "traefik.enable=true"
      - "traefik.constraint-label-stack=appwrite"
      - "traefik.http.routers.appwrite_api.rule=Host(`${_APP_DOMAIN}`)"
      - "traefik.http.routers.appwrite_api.service=appwrite_api"
      - "traefik.http.routers.appwrite_api.tls=true"
      - "traefik.http.routers.appwrite_api.tls.certresolver=dns"
      - "traefik.http.services.appwrite_api.loadbalancer.server.port=80"

  appwrite-realtime:
    image: appwrite/appwrite:1.4.13
    container_name: appwrite-realtime
    restart: unless-stopped
    networks:
      - appwrite
    depends_on:
      - mariadb
      - redis
    environment:
      - _APP_ENV=production
      - _APP_WORKER_PER_CORE=6
      - _APP_OPTIONS_ABUSE=enabled
      - _APP_OPTIONS_FORCE_HTTPS=enabled
      - _APP_OPENSSL_KEY_V1=${_APP_OPENSSL_KEY_V1}
      - _APP_REDIS_HOST=redis
      - _APP_REDIS_PORT=6379
      - _APP_DB_HOST=mariadb
      - _APP_DB_PORT=3306
      - _APP_DB_SCHEMA=appwrite
      - _APP_DB_USER=${_APP_DB_USER}
      - _APP_DB_PASS=${_APP_DB_PASS}
      - _APP_USAGE_STATS=enabled
      - _APP_INFLUXDB_HOST=influxdb
      - _APP_INFLUXDB_PORT=8086
    command: realtime
    labels:
      - "traefik.enable=true"
      - "traefik.constraint-label-stack=appwrite"
      - "traefik.http.routers.appwrite_realtime.rule=Host(`${_APP_DOMAIN}`)"
      - "traefik.http.routers.appwrite_realtime.service=appwrite_realtime"
      - "traefik.http.routers.appwrite_realtime.tls=true"
      - "traefik.http.routers.appwrite_realtime.tls.certresolver=dns"
      - "traefik.http.services.appwrite_realtime.loadbalancer.server.port=80"

  appwrite-executor:
    image: appwrite/appwrite:1.4.13
    container_name: appwrite-executor
    restart: unless-stopped
    networks:
      - appwrite
      - runtimes
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - appwrite-functions:/storage/functions:rw
      - appwrite-builds:/storage/builds:rw
    depends_on:
      - redis
      - mariadb
    environment:
      - _APP_ENV=production
      - _APP_VERSION=1.4.13
      - _APP_FUNCTIONS_TIMEOUT=900
      - _APP_FUNCTIONS_BUILD_TIMEOUT=900
      - _APP_FUNCTIONS_CONTAINERS=10
      - _APP_FUNCTIONS_RUNTIMES=node-18.0,php-8.2,python-3.11
      - _APP_FUNCTIONS_CPUS=0
      - _APP_FUNCTIONS_MEMORY=0
      - _APP_FUNCTIONS_MEMORY_SWAP=0
      - _APP_FUNCTIONS_INACTIVE_THRESHOLD=60
      - _APP_EXECUTOR_SECRET=${_APP_EXECUTOR_SECRET}
      - _APP_EXECUTOR_RUNTIME_NETWORK=appwrite_runtimes
      - _APP_REDIS_HOST=redis
      - _APP_REDIS_PORT=6379
      - _APP_DB_HOST=mariadb
      - _APP_DB_PORT=3306
      - _APP_DB_SCHEMA=appwrite
      - _APP_DB_USER=${_APP_DB_USER}
      - _APP_DB_PASS=${_APP_DB_PASS}
      - _APP_LOGGING_PROVIDER=
      - _APP_LOGGING_CONFIG=
    command: executor

  appwrite-worker-audits:
    image: appwrite/appwrite:1.4.13
    container_name: appwrite-worker-audits
    restart: unless-stopped
    networks:
      - appwrite
    depends_on:
      - redis
      - mariadb
    environment:
      - _APP_ENV=production
      - _APP_OPENSSL_KEY_V1=${_APP_OPENSSL_KEY_V1}
      - _APP_REDIS_HOST=redis
      - _APP_REDIS_PORT=6379
      - _APP_DB_HOST=mariadb
      - _APP_DB_PORT=3306
      - _APP_DB_SCHEMA=appwrite
      - _APP_DB_USER=${_APP_DB_USER}
      - _APP_DB_PASS=${_APP_DB_PASS}
      - _APP_LOGGING_PROVIDER=
      - _APP_LOGGING_CONFIG=
    command: worker-audits

  appwrite-worker-webhooks:
    image: appwrite/appwrite:1.4.13
    container_name: appwrite-worker-webhooks
    restart: unless-stopped
    networks:
      - appwrite
    depends_on:
      - redis
      - mariadb
    environment:
      - _APP_ENV=production
      - _APP_OPENSSL_KEY_V1=${_APP_OPENSSL_KEY_V1}
      - _APP_SYSTEM_SECURITY_EMAIL_ADDRESS=security@immuneme.org
      - _APP_REDIS_HOST=redis
      - _APP_REDIS_PORT=6379
      - _APP_DB_HOST=mariadb
      - _APP_DB_PORT=3306
      - _APP_DB_SCHEMA=appwrite
      - _APP_DB_USER=${_APP_DB_USER}
      - _APP_DB_PASS=${_APP_DB_PASS}
    command: worker-webhooks

  appwrite-worker-deletes:
    image: appwrite/appwrite:1.4.13
    container_name: appwrite-worker-deletes
    restart: unless-stopped
    networks:
      - appwrite
    depends_on:
      - redis
      - mariadb
    environment:
      - _APP_ENV=production
      - _APP_OPENSSL_KEY_V1=${_APP_OPENSSL_KEY_V1}
      - _APP_REDIS_HOST=redis
      - _APP_REDIS_PORT=6379
      - _APP_DB_HOST=mariadb
      - _APP_DB_PORT=3306
      - _APP_DB_SCHEMA=appwrite
      - _APP_DB_USER=${_APP_DB_USER}
      - _APP_DB_PASS=${_APP_DB_PASS}
    command: worker-deletes
    volumes:
      - appwrite-uploads:/storage/uploads:rw
      - appwrite-cache:/storage/cache:rw
      - appwrite-functions:/storage/functions:rw
      - appwrite-builds:/storage/builds:rw
      - appwrite-certificates:/storage/certificates:rw

  appwrite-worker-databases:
    image: appwrite/appwrite:1.4.13
    container_name: appwrite-worker-databases
    restart: unless-stopped
    networks:
      - appwrite
    depends_on:
      - redis
      - mariadb
    environment:
      - _APP_ENV=production
      - _APP_OPENSSL_KEY_V1=${_APP_OPENSSL_KEY_V1}
      - _APP_REDIS_HOST=redis
      - _APP_REDIS_PORT=6379
      - _APP_DB_HOST=mariadb
      - _APP_DB_PORT=3306
      - _APP_DB_SCHEMA=appwrite
      - _APP_DB_USER=${_APP_DB_USER}
      - _APP_DB_PASS=${_APP_DB_PASS}
    command: worker-databases

  appwrite-worker-builds:
    image: appwrite/appwrite:1.4.13
    container_name: appwrite-worker-builds
    restart: unless-stopped
    networks:
      - appwrite
    volumes:
      - appwrite-functions:/storage/functions:rw
      - appwrite-builds:/storage/builds:rw
    depends_on:
      - redis
      - mariadb
    environment:
      - _APP_ENV=production
      - _APP_OPENSSL_KEY_V1=${_APP_OPENSSL_KEY_V1}
      - _APP_EXECUTOR_SECRET=${_APP_EXECUTOR_SECRET}
      - _APP_EXECUTOR_HOST=http://appwrite-executor/v1
      - _APP_REDIS_HOST=redis
      - _APP_REDIS_PORT=6379
      - _APP_DB_HOST=mariadb
      - _APP_DB_PORT=3306
      - _APP_DB_SCHEMA=appwrite
      - _APP_DB_USER=${_APP_DB_USER}
      - _APP_DB_PASS=${_APP_DB_PASS}
    command: worker-builds

  appwrite-worker-certificates:
    image: appwrite/appwrite:1.4.13
    container_name: appwrite-worker-certificates
    restart: unless-stopped
    networks:
      - appwrite
    depends_on:
      - redis
      - mariadb
    environment:
      - _APP_ENV=production
      - _APP_OPENSSL_KEY_V1=${_APP_OPENSSL_KEY_V1}
      - _APP_DOMAIN_TARGET=${_APP_DOMAIN_TARGET}
      - _APP_SYSTEM_SECURITY_EMAIL_ADDRESS=security@immuneme.org
      - _APP_REDIS_HOST=redis
      - _APP_REDIS_PORT=6379
      - _APP_DB_HOST=mariadb
      - _APP_DB_PORT=3306
      - _APP_DB_SCHEMA=appwrite
      - _APP_DB_USER=${_APP_DB_USER}
      - _APP_DB_PASS=${_APP_DB_PASS}
    command: worker-certificates
    volumes:
      - appwrite-config:/storage/config:rw
      - appwrite-certificates:/storage/certificates:rw

  appwrite-worker-functions:
    image: appwrite/appwrite:1.4.13
    container_name: appwrite-worker-functions
    restart: unless-stopped
    networks:
      - appwrite
    depends_on:
      - redis
      - mariadb
      - appwrite-executor
    environment:
      - _APP_ENV=production
      - _APP_OPENSSL_KEY_V1=${_APP_OPENSSL_KEY_V1}
      - _APP_EXECUTOR_SECRET=${_APP_EXECUTOR_SECRET}
      - _APP_EXECUTOR_HOST=http://appwrite-executor/v1
      - _APP_FUNCTIONS_TIMEOUT=900
      - _APP_REDIS_HOST=redis
      - _APP_REDIS_PORT=6379
      - _APP_DB_HOST=mariadb
      - _APP_DB_PORT=3306
      - _APP_DB_SCHEMA=appwrite
      - _APP_DB_USER=${_APP_DB_USER}
      - _APP_DB_PASS=${_APP_DB_PASS}
    command: worker-functions

  appwrite-worker-mails:
    image: appwrite/appwrite:1.4.13
    container_name: appwrite-worker-mails
    restart: unless-stopped
    networks:
      - appwrite
    depends_on:
      - redis
    environment:
      - _APP_ENV=production
      - _APP_OPENSSL_KEY_V1=${_APP_OPENSSL_KEY_V1}
      - _APP_SYSTEM_EMAIL_NAME=Immune Me System
      - _APP_SYSTEM_EMAIL_ADDRESS=system@immuneme.org
      - _APP_REDIS_HOST=redis
      - _APP_REDIS_PORT=6379
      - _APP_SMTP_HOST=${_APP_SMTP_HOST}
      - _APP_SMTP_PORT=${_APP_SMTP_PORT}
      - _APP_SMTP_SECURE=${_APP_SMTP_SECURE}
      - _APP_SMTP_USERNAME=${_APP_SMTP_USERNAME}
      - _APP_SMTP_PASSWORD=${_APP_SMTP_PASSWORD}
    command: worker-mails

  appwrite-worker-messaging:
    image: appwrite/appwrite:1.4.13
    container_name: appwrite-worker-messaging
    restart: unless-stopped
    networks:
      - appwrite
    depends_on:
      - redis
    environment:
      - _APP_ENV=production
      - _APP_OPENSSL_KEY_V1=${_APP_OPENSSL_KEY_V1}
      - _APP_REDIS_HOST=redis
      - _APP_REDIS_PORT=6379
      - _APP_SMS_PROVIDER=
      - _APP_SMS_FROM=
    command: worker-messaging

  appwrite-maintenance:
    image: appwrite/appwrite:1.4.13
    container_name: appwrite-maintenance
    restart: unless-stopped
    networks:
      - appwrite
    depends_on:
      - redis
    environment:
      - _APP_ENV=production
      - _APP_OPENSSL_KEY_V1=${_APP_OPENSSL_KEY_V1}
      - _APP_DOMAIN_TARGET=${_APP_DOMAIN_TARGET}
      - _APP_REDIS_HOST=redis
      - _APP_REDIS_PORT=6379
      - _APP_DB_HOST=mariadb
      - _APP_DB_PORT=3306
      - _APP_DB_SCHEMA=appwrite
      - _APP_DB_USER=${_APP_DB_USER}
      - _APP_DB_PASS=${_APP_DB_PASS}
      - _APP_MAINTENANCE_INTERVAL=86400
      - _APP_MAINTENANCE_RETENTION_EXECUTION=1209600
      - _APP_MAINTENANCE_RETENTION_CACHE=2592000
      - _APP_MAINTENANCE_RETENTION_ABUSE=86400
      - _APP_MAINTENANCE_RETENTION_AUDIT=1209600
      - _APP_MAINTENANCE_RETENTION_USAGE_HOURLY=8640000
      - _APP_MAINTENANCE_RETENTION_SCHEDULES=86400
    command: maintenance
    volumes:
      - appwrite-uploads:/storage/uploads:rw
      - appwrite-cache:/storage/cache:rw
      - appwrite-functions:/storage/functions:rw
      - appwrite-builds:/storage/builds:rw
      - appwrite-certificates:/storage/certificates:rw

  appwrite-usage:
    image: appwrite/appwrite:1.4.13
    container_name: appwrite-usage
    restart: unless-stopped
    networks:
      - appwrite
    depends_on:
      - influxdb
      - mariadb
    environment:
      - _APP_ENV=production
      - _APP_OPENSSL_KEY_V1=${_APP_OPENSSL_KEY_V1}
      - _APP_DB_HOST=mariadb
      - _APP_DB_PORT=3306
      - _APP_DB_SCHEMA=appwrite
      - _APP_DB_USER=${_APP_DB_USER}
      - _APP_DB_PASS=${_APP_DB_PASS}
      - _APP_INFLUXDB_HOST=influxdb
      - _APP_INFLUXDB_PORT=8086
      - _APP_USAGE_AGGREGATION_INTERVAL=30
    command: usage

  appwrite-schedule:
    image: appwrite/appwrite:1.4.13
    container_name: appwrite-schedule
    restart: unless-stopped
    networks:
      - appwrite
    depends_on:
      - mariadb
      - redis
    environment:
      - _APP_ENV=production
      - _APP_OPENSSL_KEY_V1=${_APP_OPENSSL_KEY_V1}
      - _APP_REDIS_HOST=redis
      - _APP_REDIS_PORT=6379
      - _APP_DB_HOST=mariadb
      - _APP_DB_PORT=3306
      - _APP_DB_SCHEMA=appwrite
      - _APP_DB_USER=${_APP_DB_USER}
      - _APP_DB_PASS=${_APP_DB_PASS}
    command: schedule

  mariadb:
    image: mariadb:10.7
    container_name: appwrite-mariadb
    restart: unless-stopped
    networks:
      - appwrite
    volumes:
      - appwrite-mariadb:/var/lib/mysql:rw
    environment:
      - MYSQL_ROOT_PASSWORD=${_APP_DB_ROOT_PASS}
      - MYSQL_DATABASE=${_APP_DB_SCHEMA}
      - MYSQL_USER=${_APP_DB_USER}
      - MYSQL_PASSWORD=${_APP_DB_PASS}
    command: 'mysqld --innodb-flush-method=fsync --wait_timeout=86400'

  redis:
    image: redis:7.0-alpine
    container_name: appwrite-redis
    restart: unless-stopped
    command: >
      redis-server
      --maxmemory            512mb
      --maxmemory-policy     allkeys-lru
      --maxmemory-samples    5
    networks:
      - appwrite
    volumes:
      - appwrite-redis:/data:rw

  clamav:
    image: appwrite/clamav:1.2.0
    container_name: appwrite-clamav
    restart: unless-stopped
    networks:
      - appwrite
    volumes:
      - appwrite-uploads:/storage/uploads

  influxdb:
    image: appwrite/influxdb:1.5.0
    container_name: appwrite-influxdb
    restart: unless-stopped
    networks:
      - appwrite
    volumes:
      - appwrite-influxdb:/var/lib/influxdb:rw

  telegraf:
    image: appwrite/telegraf:1.4.0
    container_name: appwrite-telegraf
    restart: unless-stopped
    networks:
      - appwrite
    environment:
      - _APP_INFLUXDB_HOST=influxdb
      - _APP_INFLUXDB_PORT=8086

  # Load balancer
  traefik:
    image: traefik:2.9
    container_name: appwrite-traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    networks:
      - appwrite
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - appwrite-certificates:/certificates
    command:
      - --providers.docker=true
      - --providers.docker.constraints=Label(`traefik.constraint-label-stack`, `appwrite`)
      - --providers.docker.exposedbydefault=false
      - --entrypoints.appwrite_web.address=:80
      - --entrypoints.appwrite_websecure.address=:443
      - --certificatesresolvers.dns.acme.email=${_APP_SYSTEM_SECURITY_EMAIL_ADDRESS}
      - --certificatesresolvers.dns.acme.storage=/certificates/acme.json
      - --certificatesresolvers.dns.acme.dnschallenge=true
      - --certificatesresolvers.dns.acme.dnschallenge.provider=${_APP_ACME_DNS_PROVIDER}

networks:
  appwrite:
  runtimes:

volumes:
  appwrite-mariadb:
  appwrite-redis:
  appwrite-cache:
  appwrite-uploads:
  appwrite-certificates:
  appwrite-functions:
  appwrite-builds:
  appwrite-influxdb:
  appwrite-config:
```

### Production Environment Configuration

#### Environment Variables Template
```bash
# .env.prod
# Appwrite Core
_APP_ENV=production
_APP_LOCALE=en
_APP_OPTIONS_ABUSE=enabled
_APP_OPTIONS_FORCE_HTTPS=enabled
_APP_OPTIONS_FUNCTIONS_FORCE_HTTPS=enabled

# Domain Configuration
_APP_DOMAIN=api.immuneme.org
_APP_DOMAIN_TARGET=api.immuneme.org
_APP_DOMAIN_FUNCTIONS=functions.immuneme.org

# Security
_APP_OPENSSL_KEY_V1=your-secret-key-here
_APP_EXECUTOR_SECRET=your-executor-secret-here

# Database
_APP_DB_HOST=mariadb
_APP_DB_PORT=3306
_APP_DB_SCHEMA=appwrite
_APP_DB_USER=appwrite
_APP_DB_PASS=your-secure-db-password
_APP_DB_ROOT_PASS=your-secure-root-password

# Redis
_APP_REDIS_HOST=redis
_APP_REDIS_PORT=6379

# Email Configuration
_APP_SMTP_HOST=smtp.gmail.com
_APP_SMTP_PORT=587
_APP_SMTP_SECURE=tls
_APP_SMTP_USERNAME=system@immuneme.org
_APP_SMTP_PASSWORD=your-smtp-password

# System Email
_APP_SYSTEM_EMAIL_NAME=Immune Me System
_APP_SYSTEM_EMAIL_ADDRESS=system@immuneme.org
_APP_SYSTEM_SECURITY_EMAIL_ADDRESS=security@immuneme.org

# Console Configuration
_APP_CONSOLE_WHITELIST_ROOT=enabled
_APP_CONSOLE_WHITELIST_EMAILS=admin@immuneme.org
_APP_CONSOLE_WHITELIST_IPS=

# Storage
_APP_STORAGE_LIMIT=30000000000
_APP_STORAGE_PREVIEW_LIMIT=20000000
_APP_STORAGE_ANTIVIRUS=enabled
_APP_STORAGE_ANTIVIRUS_HOST=clamav
_APP_STORAGE_ANTIVIRUS_PORT=3310

# Functions
_APP_FUNCTIONS_SIZE_LIMIT=30000000
_APP_FUNCTIONS_TIMEOUT=900
_APP_FUNCTIONS_BUILD_TIMEOUT=900
_APP_FUNCTIONS_CONTAINERS=10
_APP_FUNCTIONS_CPUS=0
_APP_FUNCTIONS_MEMORY=0
_APP_FUNCTIONS_MEMORY_SWAP=0
_APP_FUNCTIONS_RUNTIMES=node-18.0,php-8.2,python-3.11

# Maintenance
_APP_MAINTENANCE_INTERVAL=86400
_APP_MAINTENANCE_RETENTION_EXECUTION=1209600
_APP_MAINTENANCE_RETENTION_CACHE=2592000
_APP_MAINTENANCE_RETENTION_ABUSE=86400
_APP_MAINTENANCE_RETENTION_AUDIT=1209600
_APP_MAINTENANCE_RETENTION_USAGE_HOURLY=8640000
_APP_MAINTENANCE_RETENTION_SCHEDULES=86400

# SSL/TLS
_APP_ACME_DNS_PROVIDER=cloudflare
CLOUDFLARE_EMAIL=admin@immuneme.org
CLOUDFLARE_API_KEY=your-cloudflare-api-key

# Monitoring
_APP_USAGE_STATS=enabled
_APP_INFLUXDB_HOST=influxdb
_APP_INFLUXDB_PORT=8086
```

### Backup and Recovery Procedures

#### Automated Backup Script
```bash
#!/bin/bash
# backup-appwrite.sh

set -e

# Configuration
BACKUP_DIR="/backups/appwrite"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Database credentials
DB_HOST="mariadb"
DB_USER="appwrite"
DB_PASS="${_APP_DB_PASS}"
DB_NAME="appwrite"

# Create backup directory
mkdir -p "${BACKUP_DIR}/${DATE}"

echo "Starting Appwrite backup at $(date)"

# 1. Database backup
echo "Backing up database..."
docker exec appwrite-mariadb mysqldump \
  -h ${DB_HOST} \
  -u ${DB_USER} \
  -p${DB_PASS} \
  --single-transaction \
  --routines \
  --triggers \
  ${DB_NAME} | gzip > "${BACKUP_DIR}/${DATE}/database.sql.gz"

# 2. Storage backup
echo "Backing up storage..."
docker run --rm \
  -v appwrite-uploads:/source:ro \
  -v ${BACKUP_DIR}/${DATE}:/backup \
  alpine:latest \
  tar czf /backup/uploads.tar.gz -C /source .

docker run --rm \
  -v appwrite-functions:/source:ro \
  -v ${BACKUP_DIR}/${DATE}:/backup \
  alpine:latest \
  tar czf /backup/functions.tar.gz -C /source .

docker run --rm \
  -v appwrite-certificates:/source:ro \
  -v ${BACKUP_DIR}/${DATE}:/backup \
  alpine:latest \
  tar czf /backup/certificates.tar.gz -C /source .

# 3. Configuration backup
echo "Backing up configuration..."
cp .env.prod "${BACKUP_DIR}/${DATE}/env.backup"
cp docker-compose.prod.yml "${BACKUP_DIR}/${DATE}/docker-compose.backup.yml"

# 4. Create backup manifest
echo "Creating backup manifest..."
cat > "${BACKUP_DIR}/${DATE}/manifest.json" << EOF
{
  "backup_date": "$(date -Iseconds)",
  "appwrite_version": "$(docker exec appwrite cat /usr/src/code/VERSION)",
  "database_size": "$(stat -c%s "${BACKUP_DIR}/${DATE}/database.sql.gz")",
  "files": [
    "database.sql.gz",
    "uploads.tar.gz",
    "functions.tar.gz",
    "certificates.tar.gz",
    "env.backup",
    "docker-compose.backup.yml"
  ]
}
EOF

# 5. Cleanup old backups
echo "Cleaning up old backups..."
find ${BACKUP_DIR} -type d -name "20*" -mtime +${RETENTION_DAYS} -exec rm -rf {} \;

# 6. Upload to cloud storage (optional)
if [ ! -z "${AWS_S3_BUCKET}" ]; then
  echo "Uploading backup to S3..."
  aws s3 sync "${BACKUP_DIR}/${DATE}" "s3://${AWS_S3_BUCKET}/appwrite-backups/${DATE}/"
fi

echo "