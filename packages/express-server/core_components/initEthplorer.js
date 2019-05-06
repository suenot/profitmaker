
const initEthplorer = async function(privateKeys) {
  try {
    for (let key of privateKeys) {
      if (key.parser === 'ethplorer') {
        // console.log(key)
        global.ETHPLORER[key.name] = key
      }
    }
  } catch (err) {
    console.log(err)
  }

}
exports.initEthplorer = initEthplorer
