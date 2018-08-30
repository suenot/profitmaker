import Web3 from 'web3'
var address = '0x06Fc8e3c2929bD4Ce50F5423B9605EeD68972022'
var abi = [
	{
		"constant": false,
		"inputs": [
			{
				"name": "amount",
				"type": "uint256"
			}, {
				"name": "token",
				"type": "address"
			}, {
				"name": "price_each",
				"type": "uint256"
			}, {
				"name": "bid_order_spot",
				"type": "uint256"
			}
		],
		"name": "willbuy",
		"outputs": [
			{
				"name": "",
				"type": "bool"
			}
		],
		"payable": true,
		"stateMutability": "payable",
		"type": "function"
	}, {
		"constant": true,
		"inputs": [],
		"name": "updateAvailable",
		"outputs": [
			{
				"name": "",
				"type": "address"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	}, {
		"constant": true,
		"inputs": [],
		"name": "name",
		"outputs": [
			{
				"name": "",
				"type": "string"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	}, {
		"constant": true,
		"inputs": [
			{
				"name": "token",
				"type": "address"
			}, {
				"name": "min_trade_amount",
				"type": "uint256"
			}
		],
		"name": "findBestBid",
		"outputs": [
			{
				"name": "bid_order",
				"type": "uint256"
			}, {
				"name": "volume",
				"type": "uint256"
			}, {
				"name": "price",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	}, {
		"constant": false,
		"inputs": [
			{
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "withdraw",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	}, {
		"constant": true,
		"inputs": [
			{
				"name": "token",
				"type": "address"
			}, {
				"name": "user",
				"type": "address"
			}
		],
		"name": "balanceApprovedForToken",
		"outputs": [
			{
				"name": "amount",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	}, {
		"constant": true,
		"inputs": [
			{
				"name": "user",
				"type": "address"
			}
		],
		"name": "balanceOf",
		"outputs": [
			{
				"name": "balance",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	}, {
		"constant": true,
		"inputs": [
			{
				"name": "token",
				"type": "address"
			}, {
				"name": "ask_order",
				"type": "uint256"
			}
		],
		"name": "willsellInfo",
		"outputs": [
			{
				"name": "user",
				"type": "address"
			}, {
				"name": "price",
				"type": "uint256"
			}, {
				"name": "amount",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	}, {
		"constant": false,
		"inputs": [
			{
				"name": "amount",
				"type": "uint256"
			}, {
				"name": "token",
				"type": "address"
			}, {
				"name": "min_price_each",
				"type": "uint256"
			}, {
				"name": "bid_orders",
				"type": "uint256[]"
			}, {
				"name": "rebate_address",
				"type": "address"
			}
		],
		"name": "sellAll",
		"outputs": [
			{
				"name": "new_bid_order_amount",
				"type": "uint256"
			}
		],
		"payable": true,
		"stateMutability": "payable",
		"type": "function"
	}, {
		"constant": false,
		"inputs": [
			{
				"name": "amount",
				"type": "uint256"
			}, {
				"name": "token",
				"type": "address"
			}, {
				"name": "min_price_each",
				"type": "uint256"
			}, {
				"name": "bid_order",
				"type": "uint256"
			}, {
				"name": "rebate_address",
				"type": "address"
			}
		],
		"name": "sell",
		"outputs": [
			{
				"name": "fact_amount",
				"type": "uint256"
			}
		],
		"payable": true,
		"stateMutability": "payable",
		"type": "function"
	}, {
		"constant": true,
		"inputs": [
			{
				"name": "token",
				"type": "address"
			}, {
				"name": "min_trade_amount",
				"type": "uint256"
			}
		],
		"name": "findBestAsk",
		"outputs": [
			{
				"name": "ask_order",
				"type": "uint256"
			}, {
				"name": "volume",
				"type": "uint256"
			}, {
				"name": "price",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	}, {
		"constant": false,
		"inputs": [
			{
				"name": "amount",
				"type": "uint256"
			}, {
				"name": "token",
				"type": "address"
			}, {
				"name": "price_each",
				"type": "uint256"
			}, {
				"name": "ask_order_spot",
				"type": "uint256"
			}
		],
		"name": "willsell",
		"outputs": [
			{
				"name": "",
				"type": "bool"
			}
		],
		"payable": true,
		"stateMutability": "payable",
		"type": "function"
	}, {
		"constant": false,
		"inputs": [
			{
				"name": "amount",
				"type": "uint256"
			}, {
				"name": "token",
				"type": "address"
			}, {
				"name": "max_price_each",
				"type": "uint256"
			}, {
				"name": "ask_orders",
				"type": "uint256[]"
			}, {
				"name": "rebate_address",
				"type": "address"
			}
		],
		"name": "buyAll",
		"outputs": [
			{
				"name": "amount_left",
				"type": "uint256"
			}
		],
		"payable": true,
		"stateMutability": "payable",
		"type": "function"
	}, {
		"constant": true,
		"inputs": [
			{
				"name": "token",
				"type": "address"
			}, {
				"name": "bid_order",
				"type": "uint256"
			}
		],
		"name": "willbuyInfo",
		"outputs": [
			{
				"name": "user",
				"type": "address"
			}, {
				"name": "price",
				"type": "uint256"
			}, {
				"name": "amount",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	}, {
		"constant": false,
		"inputs": [],
		"name": "deposit",
		"outputs": [
			{
				"name": "",
				"type": "bool"
			}
		],
		"payable": true,
		"stateMutability": "payable",
		"type": "function"
	}, {
		"constant": true,
		"inputs": [
			{
				"name": "token",
				"type": "address"
			}
		],
		"name": "willsellFindSpot",
		"outputs": [
			{
				"name": "ask_order_spot",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	}, {
		"constant": true,
		"inputs": [
			{
				"name": "token",
				"type": "address"
			}
		],
		"name": "willbuyFindSpot",
		"outputs": [
			{
				"name": "bid_order_spot",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	}, {
		"constant": false,
		"inputs": [
			{
				"name": "amount",
				"type": "uint256"
			}, {
				"name": "token",
				"type": "address"
			}, {
				"name": "max_price_each",
				"type": "uint256"
			}, {
				"name": "ask_order",
				"type": "uint256"
			}, {
				"name": "rebate_address",
				"type": "address"
			}
		],
		"name": "buy",
		"outputs": [
			{
				"name": "fact_amount",
				"type": "uint256"
			}
		],
		"payable": true,
		"stateMutability": "payable",
		"type": "function"
	}, {
		"payable": true,
		"stateMutability": "payable",
		"type": "fallback"
	}, {
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"name": "amount",
				"type": "uint256"
			}, {
				"indexed": false,
				"name": "token",
				"type": "address"
			}, {
				"indexed": false,
				"name": "price_each",
				"type": "uint256"
			}, {
				"indexed": false,
				"name": "buyer",
				"type": "address"
			}, {
				"indexed": false,
				"name": "seller",
				"type": "address"
			}
		],
		"name": "Trade",
		"type": "event"
	}
]

const _init = function() {
  if (window.web3) {
    window.web3old = window.web3;
    window.web3 = new Web3(window.web3.currentProvider);
  }
  if (typeof web3 === 'undefined') {
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"))
  }
  return window.web3
}

const _wallet = async function(web3) {
  var wallet = (await web3.eth.getAccounts())[0]
  console.log('wallet')
  console.log(wallet)
  return wallet
}

export default {
  address,
  abi,
  _init,
  _wallet
}
