## Install manually

1. Install [nodejs](https://nodejs.org/en/)

2. Install mongo
```
docker volume create kupi-terminal-mongo-volume
docker run --name kupi-terminal-mongo -p 28319:27017 -v kupi-terminal-mongo-volume:/data/db -d mongo
```

3. Copy ignored by default files and fill stocks private keys in ```./private/keys.json```
```
cp -R ./defaults/. ./
```

4. Run terminal-server
```
cd server
npm install
npm run start
``` 

5. Run terminal-frontend
```
cd react-client
npm install
npm run start
```
