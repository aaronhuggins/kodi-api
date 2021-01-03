# Kodi API

A complete implementation of Kodi JSON-RPC calls in an easy-to-use Javascript/TypeScript client.

# Installation and usage

Availabel via npm:

```shell
npm install --save kodi-api
```

Then import or require:

```typescript
import { KodiClient } from 'kodi-api'
```

```javascript
const { KodiClient } = require('kodi-api')

async function main () {
  // Expects localhost and port 9090.
  const client = KodiClient.tcp()
  const result = client.JSONRPC.Ping()

  console.log(result) // Expected output: 'pong'
}

main()
```

# Documentation

Documentation for the client is available in `./docs`.

# How it works

First, the library instantiates a connection over the desired type, such as `tcp`. Then, it dynamically caches the output from `JSONRPC.Introspect`. This metadata is then used to make and validate calls to Kodi's JSON-RPC api. No functions are predefined on the client class itself; the class self-mutates to confirm to the metadata from `JSONRPC.Introspect`.

This makes it possible to use the most up-to-date API documentation available from Kodi's website, or to output the documentation by executing `JSONRPC.Introspect` yourself.

# Future

Eventually, the plan is to generate TypeScript definitions from Kodi for the latest two major releases and include them in `./lib/api/<version>`. The generator will also be included in the library so that types can be generated on-the-fly for use in other projects.

# Why

Kodi's support today for [syncing and sharing](https://kodi.wiki/view/Syncing_and_sharing) is fairly limited. This module is one leg of a strategy for a server sync based on CouchDB and the Kodi API. However, this module is fully stand-alone and only requires a running instance of Kodi to communicate with.
