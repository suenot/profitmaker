
const initBalance = async function() {
  try {
    var balance = await global.MONGO.collection('balance').find({}).toArray()
    for (let [key, value] of Object.entries(balance)) {
      delete value._id
      if ( global.BALANCE === undefined ) global.BALANCE = {}
      if ( global.BALANCE[value.stock] === undefined ) global.BALANCE[value.stock] = {}
      global.BALANCE[value.stock] = value
      // console.log(value)
    }
    // console.log(global.BALANCE)
  } catch(err){console.log(err)}
}
module.exports = initBalance
