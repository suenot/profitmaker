# Install TL;DR

- Install [docker](https://www.docker.com/)
- Install [nodejs](https://nodejs.org/en/)
- Install [yarn](https://yarnpkg.com/en/docs/install)
- Copy ignored by default files ```cp -R ./defaults/. ./```
- Fill stocks private keys in ```./private/keys.json``` [guide](https://github.com/kupi-network/kupi-terminal/blob/master/KEYS.md)
- Set mongo password in ```./private/mongo.json``` and ```./private/mongo.env```
- Set auth password in ```./private/auth.json```
- install nodejs packages
  ```
  yarn
  ```
- Build and run containers (mongo+express_server+vue_client)
  ```
  docker-compose -f docker-compose-vue.yml up
  ```
