# Keys

The purpose of the Kupi terminal was to securely trade without having to trust your keys to third-parties.

We designed the terminal so that the user stores the keys on his computer or his server and does not trust them to store third-party services, including kupi.network.

With kupi.network, a user can only receive public data from exchanges (orders, trades, candles) and analytical data from the kupi.network team.

## Keys types

Keys consist of a pair of keys and secret_key.

Keys are stored in ```private/keys.json``` in clear text. Plans to implement storage in encrypted form.

| type of key    | operations                                             |
| -------------- | ------------------------------------------------------ |
| safe_apiKey    | key for orders, trades, balances, my_orders, my_trades |
| notSafe_apiKey | key for buy/sell                                       |
| danger_apiKey  | key for withdraw (not realized yet)                    |

## Keys config structure

```js
// private/keys.json
[
  {
    "id": "1654c8e6223492874293784293487293847",
    "name": "user@gmail.com",
    "parser": "ccxt",
    "stock": "binance",
    "safe_apiKey": "",
    "safe_secret": "",
    "notSafe_apiKey": "",
    "notSafe_secret": "",
    "danger_apiKey": "",
    "danger_secret": "",
    "2fa_hash": "",
    "2fa_secret": "",
    "2fa_type": "",
    "proxy": [],
    "withdrawLimit": "2",
    "withdrawLimitIn": "BTC",
    "note": "Default account, not safe key without linking to ips"
  }
]
```

## Recommendations for use

We recommend creating 3 separate keys on the exchange
  * This will increase the number of available requests to the exchange.
  * And also reduces the number of requests over the network using unsafe and dangerous keys, because mainly secure keys will be used.

We strongly recommend attaching keys to your ip.

If you suspect that the keys are compromised, change the keys immediately.

## Possible key storage implementations and possible security risks

#### Implemented in Kupi terminal
  * your hard drive
    - Viruses can download and analyze data
    - Malicious libraries and packages in the code can intercept keys

#### Not implemented in Kupi terminal
  * your hard + file encryption (will be implemented in the near future)
    - Viruses can download and analyze data, but will not be able to use without getting a passphrase.
    - Viruses can intercept the passphrase.
    - Malicious libraries and packages in the code can intercept keys
  * Localstorage localhost
    - All other sites on localhost will have access to the keys.
    - Malicious libraries and packages in the code can intercept keys
  * Localstorage kupi.network or your own domain (even with ssl)
    - Malefactors can substitute hosts by the machine for access to keys
    - Malicious libraries and packages in the code can intercept keys
  * Localstorage + encryption
    - In local storage keys are stored in encrypted form, but they can be decrypted by entering the code phrase.
    - Malicious plugins for browser can intercept keys
    - Viruses can intercept keys.
    - Malicious libraries and packages in the code can intercept keys
  * Different trading terminals with key storage on their servers
    - You trust your keys to the 3rd party.
    - Malicious plugins for browser can intercept keys
    - Viruses can intercept keys.
