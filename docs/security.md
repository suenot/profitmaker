# Security

## Overview

Profitmaker stores exchange API keys locally in the browser's localStorage, encrypted with AES-256-GCM using a master password. For authenticated operations they are decrypted in the browser and sent to the **terminal server** (which forwards them to the exchange and never persists them — see *Server* below); they are never sent to any other third party.

## Architecture

```
User enters master password
  -> PBKDF2 derives encryption key (100,000 iterations, SHA-256)
  -> Key held in memory (CryptoKey object)
  -> API keys encrypted/decrypted with AES-256-GCM
  -> Encrypted keys stored in localStorage (user-store)
  -> On page reload: key cleared from memory, user must re-enter password
```

## Master Password

### First-time setup

1. User calls `setupMasterPassword(password)` (via the MasterPasswordDialog)
2. A random 16-byte salt is generated
3. Password is hashed with PBKDF2 for verification
4. Salt and hash are stored in localStorage (`encryption-salt`, `encryption-hash`)
5. Encryption key is derived and held in memory
6. All existing unencrypted accounts are encrypted

### Unlocking

On each page load, the store is "locked" (`isLocked: true`). The user must enter their master password:

1. `unlockStore(password)` is called
2. Salt is loaded from localStorage
3. Password is hashed and compared to stored hash
4. If match: encryption key is derived and held in memory
5. `isLocked` set to `false`

### Locking

`lockStore()` clears the encryption key from memory and sets `isLocked: true`. This can be triggered manually or happens automatically on page reload.

### Changing password

`changeMasterPassword(oldPassword, newPassword)`:
1. Verifies old password
2. Generates new salt and hash
3. Stores new salt/hash
4. Derives new encryption key

**Important:** After changing the password, all accounts must be re-encrypted with the new key. The current implementation updates the key material but existing encrypted data would need to be decrypted with the old key and re-encrypted with the new one.

## Encryption Details

| Parameter | Value |
|-----------|-------|
| Algorithm | AES-GCM |
| Key length | 256 bits |
| Salt length | 16 bytes |
| IV length | 12 bytes (random per encryption) |
| KDF | PBKDF2 |
| KDF iterations | 100,000 |
| KDF hash | SHA-256 |

**Implementation:** `src/utils/encryption.ts` (uses Web Crypto API, no external dependencies)

### Encrypted format

Each encrypted value is stored as a Base64 string containing: `IV (12 bytes) + ciphertext (variable)`

The `isEncrypted` flag on each account indicates whether its sensitive fields are encrypted.

### What gets encrypted

| Field | Encrypted |
|-------|-----------|
| `account.key` (API key) | Yes |
| `account.privateKey` (secret) | Yes |
| `account.password` (passphrase) | Yes |
| `account.exchange` | No |
| `account.email` | No |
| `account.uid` | No |

## API Key Tiers

Following the original Kupi terminal philosophy, Profitmaker recommends creating separate API keys with different permission levels:

| Tier | Permissions | Use Case |
|------|------------|----------|
| **Safe key** (`safe_apiKey`) | Read-only: balances, orders, trades, positions | Market data, portfolio display |
| **Trading key** (`notSafe_apiKey`) | Buy/sell orders | Placing and managing orders |
| **Danger key** (`danger_apiKey`) | Withdrawals | Not implemented -- reserved for future use |

**Best practices:**
- Create 3 separate API keys on each exchange
- Bind keys to your IP address
- The safe key handles most requests, reducing exposure of the trading key
- If you suspect compromise, rotate keys immediately

## Where Keys Are Stored

### Browser (client-side)

- **localStorage** (`user-store`): User accounts with encrypted API keys
- **localStorage** (`encryption-salt`): Salt for key derivation
- **localStorage** (`encryption-hash`): Password verification hash
- **Memory**: Derived CryptoKey (cleared on page reload or lock)

### Server

All trading goes through the server (the terminal is backend-required). For
authenticated operations, API keys are sent in POST request bodies to the server.
The server:
- Holds keys in memory only for the duration of the CCXT instance
- Caches instances (with keys) for 24 hours
- Does NOT persist keys to disk
- Uses Bearer token / session / SSO auth to protect endpoints

**Recommendation:** Run the server only on localhost or a trusted network (or
behind TLS). Set a strong `API_TOKEN`.

## Security Considerations

### Threats mitigated

- **Keys at rest**: Encrypted with AES-256-GCM in localStorage
- **Keys in transit to server**: Protected by Bearer token auth (use HTTPS in production)
- **Brute-force password**: PBKDF2 with 100K iterations makes offline attacks expensive

### Remaining risks

- **Malicious browser extensions**: Could intercept decrypted keys in memory
- **XSS attacks**: Could access localStorage and potentially the decrypted key in memory
- **Malicious npm packages**: Supply chain attacks could exfiltrate keys
- **Localhost server without HTTPS**: Keys sent in plaintext over HTTP on local network
- **No key rotation mechanism**: Changing the master password doesn't automatically re-encrypt all data

### Recommendations

1. Always bind API keys to your IP on the exchange
2. Use read-only keys when you only need market data
3. Set a strong, unique master password
4. Don't install untrusted browser extensions
5. If running the server remotely, use HTTPS and a strong API_TOKEN
6. Regularly rotate your exchange API keys
