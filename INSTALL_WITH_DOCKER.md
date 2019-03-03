## Install with docker

1. Copy ignored by default files
```
cp -R ./defaults/. ./
```

2. Fill stocks private keys in ```./private/keys.json```

3. Set mongo password in ```./private/mongo.json``` and ```./private/mongo.env```

4. Build and run containers
```docker-compose up``` # for server+mongo version (react or vue need run separately)
```docker-compose -f docker-compose-react.yml up``` # for express+mongo+react version (in development, not ready)
```docker-compose -f docker-compose-vue.yml up``` # for express+mongo+vue version (vue frontend not ready)
```docker-compose -f docker-compose-mongo.yml up``` # for mongo
