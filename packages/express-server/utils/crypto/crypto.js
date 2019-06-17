var CryptoJS = require("crypto-js")

var key = 'passphase'
var pass = 'secret key 123'

var encrypted = CryptoJS.AES.encrypt(key, pass)
var decrypted_bytes = CryptoJS.AES.decrypt(encrypted, pass)
var decrypted = decrypted_bytes.toString(CryptoJS.enc.Utf8)
console.log(decrypted)