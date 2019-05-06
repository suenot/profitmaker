
const getCCXTId = function(accountId, type) {
  try {
    return global.ACCOUNTS[accountId][type]
  } catch (err) {
    console.log(err)
  }
}
exports.getCCXTId = getCCXTId
