var MongoClient = require('mongodb').MongoClient
const mongoConf = require('../../private/mongo.json').mongo
var localMongoUrl = ''
var {sleep} = require('@kupi/sleep')

if (process.env.DOCKER === 'DOCKER') {
  localMongoUrl = 'mongodb://'+mongoConf.username+':'+mongoConf.password+'@'+mongoConf.dockerHost+':'+'27017'+'/'+mongoConf.db+'?authSource=admin'
  // console.log(localMongoUrl)
} else {
  localMongoUrl = 'mongodb://'+mongoConf.username+':'+mongoConf.password+'@'+mongoConf.host+':'+mongoConf.port+'/'+mongoConf.db+'?authSource=admin'
  // console.log(localMongoUrl)
}
const startMongo = async function() {
  while(true) {
    try {
      var db = await MongoClient.connect(localMongoUrl)
      console.log('Connected to mongo')
      return db
    } catch (err) {
      console.log("Can't connect to mongo")
    }
    await sleep(1000)
  }
}

module.exports = startMongo
