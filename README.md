
![hero-image](https://storage.googleapis.com/strix-landing-articles/landing-main-screenshots/landing-hero-image.png)

## Overview

Strix GameOps is a high-load, microservices-based game operations platform that provides analytics, deployment management, geocoding, data ingestion and live services capabilities.

## Prerequisites

### Required Software
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Git**: For cloning the repository

### System Requirements

**Minimum Requirements:**
- **RAM**: 8GB (12GB+ recommended for production)
- **CPU**: 4 cores (8+ cores recommended)
- **Storage**: 20GB free space (SSD recommended)
- **Network**: Stable internet connection for configs downloads

**Recommended Production Requirements:**
- **RAM**: 16GB+
- **CPU**: 8+ cores
- **Storage**: 50GB+ SSD and S3 / Google Cloud Storage
- **Network**: High-speed connection

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/strixgameops/strix-gameops.git
cd strix-gameops
```

### 2. Initial Setup and Password Generation

The system includes automated password generation scripts for database security.

**For Linux/macOS:**
```bash
chmod +x start.sh
./start.sh
```

**For Windows:**
```powershell
.\start.bat
```

These scripts will:
- Generate secure random passwords for all databases
- Create the passwords.txt file with all created passwords
- Set up initial configuration

Make sure not to delete passwords.txt (you can just leave it empty, though) if you plan on using `start.sh` from now on, otherwise it will make the generation script think that passwords weren't generated yet. But nothing stops from using this script just once, and then just calling a simple `docker-compose up -d`.

### 3. Environment Configuration

Verify the environment variables in files in the `./env/` directory:

- `.env-strix-game-backend-analytics`
- `.env-strix-game-backend-deployment`
- `.env-strix-game-backend-geocoder`
- `.env-strix-game-backend-ingester`
- `.env-strix-game-backend-liveservices`
- `.env-strix-game-backend-cacher`
- `.env-strix-web-backend-alerts-manager`
- `.env-strix-web-backend`
- `.env-strix-web`

**Important:** Keep these files secure as they contain database credentials. You may want to run separate secret registry for that.

Make sure to configure the following variables in `.env-strix-web-backend`:
- FB_ASDK_TYPE
- FB_ASDK_PROJECT_ID
- FB_ASDK_PROJECT_KEY_ID
- FB_ASDK_PRIVATE_KEY
- FB_ASDK_CLIENT_EMAIL
- FB_ASDK_CLIENT_ID
- FB_ASDK_AUTH_URI
- FB_ASDK_TOKEN_URI
- FB_ASDK_AUTH_PROVIDER
- FB_ASDK_CLIENT_CERT
- FB_ASDK_UNIVERSE_DOMAIN

Strix is using Firebase Admin SDK to operate on Google Cloud Storage. This is necessary to upload/download any files, such as offers icons or remote config files. Using external file service is unavoidable because players have to somehow download configurations. Amazon S3 or custom CDNs aren't supported in community edition.

## Starting the System

```bash
docker-compose up -d
```

## Stopping the System

### Graceful Shutdown
```bash
docker-compose down
```

### Stop with Volume Cleanup (⚠️ Data Loss Warning)
```bash
docker-compose down -v
```

This will clear all volumes: users, passwords, analytics, etc.

## Troubleshooting

### Common Issues

**1. Memory Issues**

If services fail to run due to memory constraints:
- Increase Docker Desktop memory allocation (8GB+)
- Close unnecessary applications

Normal game-backends memory consumption is under 250-300MB.

**2. Pulsar Issues**

Pulsar requires significant memory. If it fails:
```bash
// Check Pulsar logs
docker-compose logs pulsar

// Restart Pulsar specifically
docker-compose restart pulsar
```

**Important:** Since Pulsar is used for micro-service communications, losing Pulsar will result in a permanent data loss because analytics won't be able to be processed correctly.

### Logging

Container logs aren't saved anywhere by default, but you can use SEQ to catch errors. To configure SEQ, uncomment `SEQ_SERVER_URL` and `SEQ_INGEST_API_KEY` and configure them accordingly.

### Metrics

Strix backends output Prometheus-compatible metrics from /metrics endpoint.

### Performance Problems

It is not a simple task to make community edition available for a decent load without Kubernetes and orchestration. All `.env` files are already configured for the best balance of performance and stability. But below you can find some tips of you experience instability.

1. **Analytics events processing is too slow in game-backend:** This may happen if you send too many events, or they are linked with too many Player Warehouse elements. Consider cutting the load or contacting Strix team so we can transfer you to a paid plan and provide a managed and scalable solution. If you cannot do that yet, as a last resort, you can try to increase the amount of `EVENTS_PULSAR_LISTENERS` in analytics game-backends, but this can lead to data loss in case of problems linked to higher memory consumption. Since the backend is created using NodeJS, processing isn't multithreaded, so increasing the amount of events listeners will only increase the load on this particular process. When the capability of Pulsar listeners will exceed your CPU and RAM capabilities, you wil eventually start catching errors and lose data.
2. **Analytics queries are too slow:** This happens when you have too complex queries (A/B test results tend to take a long time), too much data in your DB, or too slow disk/RAM. Moving your DB to a server with SSD M2 storage and a good amount of fast RAM may help.
3. **Profile Composition is too slow:** Download MongoDB Compass and check if PWplayers collection has indexes for `elements.analytics.elementID`, `elements.statistics.elementID`, `firstJoinDate`, `lastJoinDate`, and compound indexes for `gameID branch clientID` and `gameID clientID`.
4. **Initial load of Behavior Tree is too slow:** Behavior Tree loads all 2 sides: client and server. 
   * On backend, all sessions with all their events are loaded in memory and processed to digestable format for frontend. This is typically the longest phase and it is indicated by the animated loading indicator on frontend. To decrease the load, you may want to decrease the limit of `BEHAVIOR_TREE_SESSIONS_LIMIT` or `ECONOMY_TREE_SESSIONS_LIMIT`. It regulates the amount of sessions taken for the analysis. If your average session has around 10-100 events, the limit of 1000-10000 will be acceptable.
   * On frontend, when events are fetched from the backend, client can experience a freeze for a few seconds until the tree is visualized. This is indicated by the frozen loading indicator. This phase should not take long, but if it does, there is almost nothing you can do on your own.

## Security Considerations

1. **Save initial passwords** generated by setup scripts elsewhere
2. **Restrict network access** to necessary ports only
3. **Place frontend behind firewall** so its only accessible through VPN
3. **Use Docker secrets** for production deployments

## Support

For additional support:
- **GitHub Issues**: https://github.com/strixgameops/strix-gameops/issues
- **Documentation**: Check the repository wiki
- **Logs**: Always include relevant logs when reporting issues


This project is licensed under a custom license based on the Mozilla Public License 2.0.  
Commercial usage is allowed, but resale or redistribution of the code as a product is prohibited.  
See the [LICENSE](./LICENSE.md) file for details.
