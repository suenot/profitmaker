# Install manually

- Install [nodejs](https://nodejs.org/en/)
- Install [yarn](https://yarnpkg.com/en/docs/install)
- Install [mongo](https://www.mongodb.com/) or use cloud solution

```bash
docker volume create kupi-terminal-mongo-volume
docker run --name kupi-terminal-mongo -p 27018:27017 -v kupi-terminal-mongo-volume:/data/db -d mongo
```

- Configure and run mongo

You can use official documentation or run with [docker](https://www.docker.com/):
```
docker-compose -f docker-compose-mongo.yml up
```

- Copy ignored by default files

```bash
cp -R ./defaults/. ./
```

- Fill stocks private keys in ```./private/keys.json``` [guide](https://github.com/kupi-network/kupi-terminal/blob/master/KEYS.md)

- Set mongo password in ```./private/mongo.json``` and ```./private/mongo.env```

- Set auth password in ```./private/auth.json```

- Install packages

```bash
yarn
```

- Run terminal-server

```bash
yar server:start
```

- Run terminal-frontend

```bash
yarn vue:start // run vue-client in dev mode
yarn react:start // OR run react-client in dev mode
```
