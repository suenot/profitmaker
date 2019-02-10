## Install with docker

1. Copy ignored by default files
```
cp -R ./defaults/. ./
```

2. Fill stocks private keys in ```./private/keys.json```

3. Set mongo password in ```./private/mongo.json``` and ```./private/mongo.env```

4. Install node modules
```cd react-client && npm i``` # for react verison
```cd vue-client && npm i``` # for vue verison (in development, not ready)

5. Build and run containers
```docker-compose up``` # for react version
```docker-compose -f docker-compose-vue.yml up``` # for vue version (in development, not ready)
