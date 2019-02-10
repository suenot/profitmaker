## Install manually

1. Install [nodejs](https://nodejs.org/en/)

2. Install mongo
```
docker volume create kupi-terminal-mongo-volume
docker run --name kupi-terminal-mongo -p 27018:27017 -v kupi-terminal-mongo-volume:/data/db -d mongo
```

3. Copy ignored by default files
```
cp -R ./defaults/. ./
```

4. Fill stocks private keys in ```./private/keys.json```

5. Set mongo password in ```./private/mongo.json``` and ```./private/mongo.env```

6. Run terminal-server
```
cd server
npm install
npm run start
```

7. Run terminal-frontend
```
cd react-client
npm install
npm run start
```
