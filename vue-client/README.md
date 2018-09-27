# vue

## Project setup
```
yarn install
```

### Compiles and hot-reloads for development
```
yarn run serve
```

### Compiles and minifies for production
```
yarn run build
```

### Lints and fixes files
```
yarn run lint
```

### Run your unit tests
```
yarn run test:unit
```


var Web3 = require('web3')

// Инициализация
if (typeof web3 !== 'undefined') {
  web3 = new Web3(web3.currentProvider)
} else {
  web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"))
}

// BURSA
var bursaAddress = '0x06Fc8e3c2929bD4Ce50F5423B9605EeD68972022'
var bursaAbi = 
[{"constant":false,"inputs":[{"name":"amount","type":"uint256"},{"name":"token","type":"address"},{"name":"price_each","type":"uint256"},{"name":"bid_order_spot","type":"uint256"}],"name":"willbuy","outputs":[{"name":"","type":"bool"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[],"name":"updateAvailable","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"token","type":"address"},{"name":"min_trade_amount","type":"uint256"}],"name":"findBestBid","outputs":[{"name":"bid_order","type":"uint256"},{"name":"volume","type":"uint256"},{"name":"price","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"token","type":"address"},{"name":"user","type":"address"}],"name":"balanceApprovedForToken","outputs":[{"name":"amount","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"user","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"token","type":"address"},{"name":"ask_order","type":"uint256"}],"name":"willsellInfo","outputs":[{"name":"user","type":"address"},{"name":"price","type":"uint256"},{"name":"amount","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"},{"name":"token","type":"address"},{"name":"min_price_each","type":"uint256"},{"name":"bid_order","type":"uint256"},{"name":"frontend_refund","type":"address"}],"name":"sell","outputs":[{"name":"","type":"bool"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[{"name":"token","type":"address"},{"name":"min_trade_amount","type":"uint256"}],"name":"findBestAsk","outputs":[{"name":"ask_order","type":"uint256"},{"name":"volume","type":"uint256"},{"name":"price","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"},{"name":"token","type":"address"},{"name":"price_each","type":"uint256"},{"name":"ask_order_spot","type":"uint256"}],"name":"willsell","outputs":[{"name":"","type":"bool"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[{"name":"token","type":"address"},{"name":"bid_order","type":"uint256"}],"name":"willbuyInfo","outputs":[{"name":"user","type":"address"},{"name":"price","type":"uint256"},{"name":"amount","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"deposit","outputs":[{"name":"","type":"bool"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[{"name":"token","type":"address"}],"name":"willsellFindSpot","outputs":[{"name":"ask_order_spot","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"token","type":"address"}],"name":"willbuyFindSpot","outputs":[{"name":"bid_order_spot","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"},{"name":"token","type":"address"},{"name":"max_price_each","type":"uint256"},{"name":"ask_order","type":"uint256"},{"name":"frontend_refund","type":"address"}],"name":"buy","outputs":[{"name":"","type":"bool"}],"payable":true,"stateMutability":"payable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":false,"name":"amount","type":"uint256"},{"indexed":false,"name":"token","type":"address"},{"indexed":false,"name":"price_each","type":"uint256"},{"indexed":false,"name":"buyer","type":"address"},{"indexed":false,"name":"seller","type":"address"}],"name":"Trade","type":"event"}]
var bursaInstance = web3.eth.contract(bursaAbi).at(bursaAddress)

// KUPI/MINT test token
var tokenAbi = [{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"from","type":"address"},{"name":"to","type":"address"},{"name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"who","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"to","type":"address"},{"name":"value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint2html56"}],"name":"Transfer","type":"event"}]
// var tokenAddress = '0x5D8b2400961546691214b495a501dE818939cfe2' // MINT TEST
var tokenAddress = '0xafe5a978c593fe440d0c5e4854c5bd8511e770a4' // KUPI TEST
var tokenInstance = web3.eth.contract(tokenAbi).at(tokenAddress)


// Сколько токенов выпущено
tokenInstance.totalSupply(function(err, res){
  console.log(web3.fromWei(parseFloat(res), "ether"))
})

// Разрешаем бирже списывать наши токены с аккаунта (если не указано второе значение, то разрешаем все токены)
// нужно апрувить ровно столько сколько есть на балансе, не больше
tokenInstance.approve(bursaAddress, 100000000000000000000000000000000000000000000000, function(err, res){
  console.log(res)
})

// Узнаем сколько токенов на балансе у аккаунта
tokenInstance.balanceOf("0x94964Bdf167CD9729df470cA75f56C087EAeFDa8", function(err, res){
  console.log(parseFloat(res))
})

// Узнаем сколько токенов заапрувлено для управления биржей
// {name: "token", type: "address"}
// {name: "user", type: "address"}
// -> {name: "amount", type: "uint256"}
bursaInstance.balanceApprovedForToken(tokenAddress, "0x94964Bdf167CD9729df470cA75f56C087EAeFDa8", function(err, res){
  console.log(web3.fromWei(parseFloat(res), "ether"))
})

// Узнаем свободный спот на продажу
// {name: "token", type: "address"} -> {name: "ask_order_spot", type: "uint256"}
bursaInstance.willsellFindSpot(tokenAddress, function(err, res){
  console.log(parseFloat(res))
})

// Выставляем ордер на продажу
// {name: "amount", type: "uint256"}
// {name: "token", type: "address"}
// {name: "price_each", type: "uint256"}
// {name: "ask_order_spot", type: "uint256"}
// -> {name: "", type: "bool"}
bursaInstance.willsell(6*100000000000000000, tokenAddress, 1000, 1, function(err, res){
  console.log(res)
})

// Узнаем значение первого ордера на продажу
bursaInstance.willsellInfo(tokenAddress, 1, function(err, res){
  var order = {}
  order.user = res[0].toString()
  order.price = parseFloat(res[1])
  order.amount = parseFloat(res[2])
  console.log(order)
})

// СТАКАН на продажу (ASYNC)
var willsellInfo = async function (orderPosition) {
  var order = {}
  var result = await bursaInstance.willsellInfo(tokenAddress, orderPosition)
  order.user = result[0].toString()
  order.price = parseFloat(result[1])
  order.amount = parseFloat(result[2])
  return order
}
for (var i=1;i<10;i++) {
  willsellInfo(i)
  .then(function(res){
    console.log(res)
  })
}

// Найти лучший ордер на продажу
// {name: "token", type: "address"}
// {name: "min_trade_amount", type: "uint256"}
// ->
// {name: "ask_order", type: "uint256"}
// {name: "volume", type: "uint256"}
// {name: "price", type: "uint256"}
bursaInstance.findBestAsk(tokenAddress, 0, function(err, res){
  var order = {}
  order.user = parseFloat(res[0])
  order.price = parseFloat(res[1])
  order.amount = parseFloat(res[2])
  console.log(order)
})

// попробовать купить прямо сейчас
// {name: "amount", type: "uint256"}
// {name: "token", type: "address"}
// {name: "max_price_each", type: "uint256"}
// {name: "ask_order", type: "uint256"}
// {name: "frontend_refund", type: "address"}
// -> {name: "", type: "bool"}
bursaInstance.buy(20000000000, tokenAddress, 1000, 1, 0, function(err, res){
  console.log(res)
})

// вывести eth с биржи
// {name: "amount", type: "uint256"}
bursaInstance.withdraw(2*1000000000000000000, function(err, res){
  console.log(res)
})

// "findBestAsk"
// {name: "amount", type: "uint256"}
// {name: "token", type: "address"}
// {name: "price_each", type: "uint256"}
// {name: "ask_order_spot", type: "uint256"}

// "willsell"
// {name: "amount", type: "uint256"}
// {name: "token", type: "address"}
// {name: "price_each", type: "uint256"}
// {name: "bid_order_spot", type: "uint256"}

// "willsellFindSpot"
// {name: "token", type: "address"}
