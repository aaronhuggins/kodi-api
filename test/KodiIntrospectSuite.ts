import { strictEqual, throws } from 'assert'
import { KodiClient, KodiIntrospect } from '../index'

let introspect: KodiIntrospect

describe('KodiIntrospect', () => {
  before (async () => {
    const client = new KodiClient({ clientType: 'tcp' })
    introspect = await client.getIntrospectionCache()
  })

  it('should describe a notification', async () => {
    const notf = introspect.describeNotification('System.OnQuit')

    strictEqual(notf.type, 'notification')
  })

  it('should describe a type', async () => {
    const typeDef = introspect.describeType('Addon.Content')

    strictEqual(typeDef.type, 'string')
  })

  it('should list methods', async () => {
    const methods = introspect.listMethods()

    strictEqual(Array.isArray(methods), true)
  })

  it('should validate input', async () => {
    const result = introspect.validateSchema(1, { type: 'number' })

    strictEqual(result, true)

    throws(() => {
      introspect.validateSchema('', { type: 'number' }, true)
    })
  })

  it('should get API version', async () => {
    const version = introspect.version()

    strictEqual(typeof version, 'string')
  })
})
