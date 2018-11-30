## Install with docker

1. Copy ignored by default files and fill stocks private keys in ```./private/keys.json```
```
cp -R ./defaults/. ./
```

2. Set global variables
```
export DOCKER_CLIENT_TIMEOUT=120
export COMPOSE_HTTP_TIMEOUT=120
```

3. Build and run containers
```docker-compose up```
