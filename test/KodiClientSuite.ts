import { strictEqual, deepStrictEqual, doesNotReject } from 'assert'
import { KodiClient, KodiIntrospect } from '../index'

let client: KodiClient

describe('KodiClient', () => {
  before(() => {
    client = new KodiClient({ clientType: 'tcp', clientOptions: { port: 9090 }})
  })

  it('should access native JS methods on client instance', async () => {
    const res1 = await client.getIntrospectionCache(true)

    strictEqual(res1 instanceof KodiIntrospect, true)

    const res2 = await client.getMethod('JSONRPC.Permission')

    strictEqual(typeof res2, 'function')

    const res3 = client.throwValidationError

    strictEqual(typeof res3, 'boolean')

    const res4 = await client.listMethods()

    strictEqual(Array.isArray(res4), true)
    strictEqual(typeof res4[0], 'string')
    await doesNotReject(async () => {
      await client.connect()
    })
    await doesNotReject(async () => {
      await client.disconnect()
    })
  })

  it('should construct all supported client types with defaults', async () => {
    const res1 = KodiClient.http()
    const res2 = KodiClient.https()
    const res3 = KodiClient.tcp()
    const res4 = KodiClient.ws()

    strictEqual(res1 instanceof KodiClient, true)
    strictEqual(res2 instanceof KodiClient, true)
    strictEqual(res3 instanceof KodiClient, true)
    strictEqual(res4 instanceof KodiClient, true)
  })

  it('should call JSONRPC.Version', async () => {
    const res = await client.JSONRPC.Version()
    const res2 = await client.JSONRPC.version()

    strictEqual(typeof res, 'object')
    strictEqual(typeof res.version, 'object')
    deepStrictEqual(res2, res)
  })

  it('should call JSONRPC.Ping', async () => {
    const res = await client.JSONRPC.Ping()
    const res2 = await client.JSONRPC.ping()

    strictEqual(res, 'pong')
    strictEqual(res2, res)
  })

  it('should call custom function `listMethods` on JSONRPC namespace', async () => {
    const res = await client.JSONRPC.ListMethods()
    const res2 = await client.JSONRPC.listMethods()

    strictEqual(typeof res, 'object')
    deepStrictEqual(res2, res)
  })

  it('should get data from Application.GetProperties', async () => {
    const client = new KodiClient({ clientType: 'ws', throwValidationError: true })
    const res = await client.Application.GetProperties(['volume', 'language'])

    strictEqual(typeof res.language, 'string')
    strictEqual(typeof res.volume, 'number')
  })

  it('should keep connection alive until manually closed', async () => {
    const client = new KodiClient({ clientType: 'ws', clientOptions: { closeOnRequest: false } })

    await client.connect()

    const res = await client.Application.GetProperties(['volume', 'language'])

    strictEqual(typeof res.language, 'string')
    strictEqual(typeof res.volume, 'number')

    await client.disconnect()
  })

  it('should return `undefined` for non-existent or non-string members', async () => {
    const res = client[1]
    const res2 = client.XBMC[2]

    strictEqual(typeof res, 'undefined')
    strictEqual(typeof res2, 'undefined')
  })
})
