import { Client } from 'jayson/promise'
import { validate } from 'jsonschema'
import { v4 as uuidv4 } from 'uuid'
import { KodiIntrospect } from './KodiIntrospect'
import type {
  JaysonClient,
  JsonRpcResponse,
  KodiClientOptions,
  KodiMethodNamespace
} from './Types'
import { WebSocketClient } from './WebSocketClient'

export class KodiClient {
  constructor (options: KodiClientOptions) {
    this.throwValidationError = typeof options.throwValidationError === 'undefined' ? false : options.throwValidationError

    switch (options.clientType) {
      case 'http':
        this.jsonRpcClient = Client.http({
          port: 8080,
          ...options.clientOptions
        })
        break
      case 'https':
        this.jsonRpcClient = Client.https({
          ...options.clientOptions
        })
        break
      case 'ws':
        this.jsonRpcClient = new WebSocketClient({
          ...options.clientOptions
        })
        break
      case 'tcp':
      default:
        this.jsonRpcClient = Client.tcp({
          ...{ port: 9090 },
          ...options.clientOptions
        })
        break
    }

    return new Proxy(this, KodiProxyHandler)
  }

  // Internal objects
  jsonRpcClient: JaysonClient
  introspectionCache?: KodiIntrospect
  throwValidationError: boolean
  // Kodi documented method namespaces
  Addons?: KodiMethodNamespace
  Application?: KodiMethodNamespace
  AudioLibrary?: KodiMethodNamespace
  Favourites?: KodiMethodNamespace
  Files?: KodiMethodNamespace
  GUI?: KodiMethodNamespace
  Input?: KodiMethodNamespace
  JSONRPC?: KodiMethodNamespace
  PVR?: KodiMethodNamespace
  Player?: KodiMethodNamespace
  Playlist?: KodiMethodNamespace
  Profiles?: KodiMethodNamespace
  Settings?: KodiMethodNamespace
  System?: KodiMethodNamespace
  Textures?: KodiMethodNamespace
  VideoLibrary?: KodiMethodNamespace
  XBMC?: KodiMethodNamespace

  /** Method to manually connect to the defined web socket; silently returns for any other client type. */
  async connect () {
    if (this.jsonRpcClient instanceof WebSocketClient) {
      await this.jsonRpcClient.connect()
    }
  }

  /** Method to manually disconnect from the defined web socket; silently returns for any other client type. */
  async disconnect () {
    if (this.jsonRpcClient instanceof WebSocketClient) {
      await this.jsonRpcClient.disconnect()
    }
  }

  /** Method to get and cache the introspection result on this instance. */
  async getIntrospectionCache (refresh: boolean = false): Promise<KodiIntrospect> {
    if (typeof this.introspectionCache === 'undefined' || refresh) {
      const result: JsonRpcResponse = await this.jsonRpcClient.request('JSONRPC.Introspect', null, uuidv4())

      this.introspectionCache = new KodiIntrospect(result)
    }

    return this.introspectionCache
  }

  /** Method to return a Kodi JSON-RPC method as a function. */
  getMethod (method: string, name?: string): (...args: any[]) => Promise<any> {
    const self = this
    const methodFunc = async function methodFunc (...args: any[]): Promise<any> {
      await self.getIntrospectionCache()

      const methodDesc = self.introspectionCache.describeMethod(method)
      const params = {}

      // Iterate over arguments, validating and constructing parameters
      for (let i = 0; i < args.length; i += 1) {
        const paramDesc = methodDesc.params[i]

        self.introspectionCache.validateSchema(args[i], paramDesc, self.throwValidationError)

        params[paramDesc.name] = args[i]
      }

      const response: JsonRpcResponse = await self.jsonRpcClient.request(method, params, uuidv4())

      self.introspectionCache.validateSchema(response, methodDesc.returns, self.throwValidationError)

      return response.result
    }

    if (typeof name === 'string') {
      Object.defineProperty(methodFunc, 'name', { value: name })
      Object.defineProperty(methodFunc.constructor, 'name', { value: name })
    }

    return methodFunc
  }

  /** Method to list Kodi JSON-RPC methods. */
  async listMethods (): Promise<string[]>
  async listMethods (group: false): Promise<string[]>
  async listMethods (group: true): Promise<Record<string, string[]>>
  async listMethods (group: boolean = false): Promise<string[] | Record<string, string[]>> {
    await this.getIntrospectionCache()

    return this.introspectionCache.listMethods(group)
  }

  static http (): KodiClient {
    return new KodiClient({ clientType: 'http' })
  }

  static https (): KodiClient {
    return new KodiClient({ clientType: 'https' })
  }

  static tcp (): KodiClient {
    return new KodiClient({ clientType: 'tcp' })
  }

  static ws (): KodiClient {
    return new KodiClient({ clientType: 'ws' })
  }
}

const KodiProxyHandler: ProxyHandler<KodiClient> = {
  get (target, nameSpace, r) {
    const numeric = /^\d+$/gu

    switch (nameSpace) {
      case 'connect':
        return target.connect
      case 'disconnect':
        return target.disconnect
      case 'getIntrospectionCache':
        return target.getIntrospectionCache
      case 'getMethod':
        return target.getMethod
      case 'introspectionCache':
        return target.introspectionCache
      case 'jsonRpcClient':
        return target.jsonRpcClient
      case 'listMethods':
        return target.listMethods
      case 'throwValidationError':
        return target.throwValidationError
      default:
        if (typeof nameSpace !== 'string' || numeric.test(nameSpace as string)) return void 0

        return new Proxy({}, {
          get (empty, methodName, r) {
            if (typeof methodName !== 'string' || numeric.test(methodName as string)) return void 0

            const listMethodsRx = /^[Ll]istMethods$/gu

            if (listMethodsRx.test(methodName)) {
              return async function listMethods (): Promise<string[]> {
                await target.getIntrospectionCache()

                const groups = await target.listMethods(true)

                return groups[nameSpace]
              }
            }

            const method = nameSpace + '.' + methodName.slice(0, 1).toUpperCase() + methodName.slice(1, methodName.length)

            return target.getMethod(method, methodName)
          }
        })
    }
  }
}
