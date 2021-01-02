import { doesNotReject, rejects, strictEqual } from 'assert'
import { WebSocketClient } from '../lib/WebSocketClient'

describe('WebSocketClient', () => {
  it('should construct a web socket client', async () => {
    const client = new WebSocketClient()

    strictEqual(client instanceof WebSocketClient, true)
  })

  it('should make a JSON RPC request', async () => {
    const client = new WebSocketClient({ closeOnRequest: false })

    await client.connect()

    const res = await client.request('JSONRPC.Ping', null)

    strictEqual(res.result, 'pong')

    await client.disconnect()
  })

  it('should disconnect regardless of internal `onclose` function', async () => {
    const client: any = new WebSocketClient({ closeOnRequest: false })

    await doesNotReject(async () => {
      await client.connect()
    })

    client.io.ws.onclose = null

    await doesNotReject(async () => {
      await client.disconnect()
    })
  })
})