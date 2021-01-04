import { Client } from 'jayson/promise'
import { v4 as uuidv4 } from 'uuid'
import { KodiIntrospect } from './KodiIntrospect'
import { KodiMethodNamespace } from './KodiMethodNamespace'
import type {
  ClientType,
  JaysonClient,
  JsonRpcResponse,
  KodiClientOptions,
} from './Types'
import { WebSocketClient } from './WebSocketClient'

const numeric = /^\d+$/gu

/** Class for dynamically calling the Kodi JSON-RPC api, regardless of api version. */
export class KodiClient {
  constructor (options: KodiClientOptions) {
    this.throwValidationError = typeof options.throwValidationError === 'undefined' ? false : options.throwValidationError
    this.clientType = options.clientType
    // Initialize as undefined so that key can be looked up, like `key in this`.
    this.introspectionCache = undefined

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
  clientType: ClientType
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

  /** Method to list Kodi JSON-RPC methods. */
  async listMethods (): Promise<string[]>
  async listMethods (group: false): Promise<string[]>
  async listMethods (group: true): Promise<Record<string, string[]>>
  async listMethods (group: boolean = false): Promise<string[] | Record<string, string[]>> {
    await this.getIntrospectionCache()

    return this.introspectionCache.listMethods(group)
  }

  /** Construct an HTTP instance with Kodi defaults. */
  static http (): KodiClient {
    return new KodiClient({ clientType: 'http' })
  }

  /** Construct an HTTPS instance with Kodi defaults. __NOTE:__ _Kodi does not natively or officially support HTTPS; some users have unofficially found a way, though._ */
  static https (): KodiClient {
    return new KodiClient({ clientType: 'https' })
  }

  /** Construct a TCP instance with Kodi defaults. */
  static tcp (): KodiClient {
    return new KodiClient({ clientType: 'tcp' })
  }

  /** Construct a WebSocket instance with Kodi defaults. */
  static ws (): KodiClient {
    return new KodiClient({ clientType: 'ws' })
  }
}

/** @hidden */
const KodiProxyHandler: ProxyHandler<KodiClient> = {
  get (target, nameSpace, r) {
    // Short-circuit if namespace already exists on target.
    if (nameSpace in target) return target[nameSpace]
    if (typeof nameSpace !== 'string' || (/^\d+$/gu).test(nameSpace as string)) return void 0

    const listMethods = async function listMethods (): Promise<string[]> {
      await target.getIntrospectionCache()

      const groups = await target.listMethods(true)

      return groups[nameSpace]
    }

    return new Proxy({
      ListMethods: listMethods,
      listMethods
    }, {
      get (subTarget, methodName, r) {
        if (methodName in subTarget) return subTarget[methodName]
        if (typeof methodName !== 'string' || numeric.test(methodName as string)) return void 0

        // Construct a namespace object as a caching mechanism.
        const newNameSpace = new KodiMethodNamespace(nameSpace, methodName, target)
        // Store the namespace on the original `this`.
        target[nameSpace] = newNameSpace

        // Return the requested method from the namespace.
        return newNameSpace[methodName]
      }
    })
  }
}
