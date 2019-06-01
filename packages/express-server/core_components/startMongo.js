var MongoClient = require('mongodb').MongoClient
var localMongoUrl = ''
var {sleep} = require('@kupi/sleep')

// GET PRIVATE CONFIGS
var fs = require('fs')
try {
  var mongoConf = JSON.parse(fs.readFileSync('../../private/mongo.json', 'utf8')).mongo
} catch(err) {
  var mongoConf = undefined
}
// END GET PRIVATE CONFIGS

const startMongo = async function() {
  if (!mongoConf) return false

  if (process.env.DOCKER === 'DOCKER') {
    localMongoUrl = 'mongodb://'+mongoConf.username+':'+mongoConf.password+'@'+mongoConf.dockerHost+':'+'27017'+'/'+mongoConf.db+'?authSource=admin'
    // console.log(localMongoUrl)
  } else {
    localMongoUrl = 'mongodb://'+mongoConf.username+':'+mongoConf.password+'@'+mongoConf.host+':'+mongoConf.port+'/'+mongoConf.db+'?authSource=admin'
    // console.log(localMongoUrl)
  }

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
