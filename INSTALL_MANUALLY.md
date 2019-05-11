# Install manually

- Install [nodejs](https://nodejs.org/en/)
- Install mongo

```bash
docker volume create kupi-terminal-mongo-volume
docker run --name kupi-terminal-mongo -p 27018:27017 -v kupi-terminal-mongo-volume:/data/db -d mongo
```

- Copy ignored by default files

```bash
cp -R ./defaults/. ./
```

- Fill stocks private keys in ```./private/keys.json```

- Set mongo password in ```./private/mongo.json``` and ```./private/mongo.env```

- Set auth password in ```./private/auth.json```

- Run terminal-server

```bash
cd server
npm install
npm run start
```

- Run terminal-frontend

```bash
cd react-client
npm install
npm run start
```
