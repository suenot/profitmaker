var MongoClient = require('mongodb').MongoClient
const mongoConf = require('../../private/mongo.json').mongo
var localMongoUrl = ''
var {sleep} = require('../../utils')

if (process.env.DOCKER === 'DOCKER') {
  localMongoUrl = 'mongodb://'+mongoConf.username+':'+mongoConf.password+'@'+mongoConf.dockerHost+':'+mongoConf.port+'/'+mongoConf.db+'?authSource=admin'
  console.log(localMongoUrl)
} else {
  localMongoUrl = 'mongodb://'+mongoConf.username+':'+mongoConf.password+'@'+mongoConf.host+':'+mongoConf.port+'/'+mongoConf.db+'?authSource=admin'
  console.log(localMongoUrl)
}
const startMongo = async function() {
  while(true) {
    try {
      var db = await MongoClient.connect(localMongoUrl)
      console.log('Получилось подключиться к монге')
      return db
    } catch (err) {
      console.log('Не получилось подключиться к монге')
      // console.log(err)
    }
    await sleep(1000)
  }
}

module.exports = startMongo
