import { RpcWebSocketClient } from 'rpc-websocket-client'
import { v4 as uuidv4 } from 'uuid'
import type { RequestParamsLike, JSONRPCIDLike } from 'jayson/promise'

export interface WebSocketClientOptions {
  host?: string
  port?: number
  closeOnRequest?: boolean
}

export class WebSocketClient {
  constructor (options: WebSocketClientOptions = {}) {
    const config: WebSocketClientOptions = {
      host: 'localhost',
      port: 9090,
      closeOnRequest: true,
      ...options
    }
    this.closeOnRequest = config.closeOnRequest
    this.connected = false
    this.url = 'ws://' + config.host + ':' + config.port.toString() + '/jsonrpc'
    this.nextId = ''
  }

  /** Indicates that a request is a singleton operation. */
  private closeOnRequest: boolean
  private connected: boolean
  private ignoreJsonErrors: boolean
  private url: string
  private io: RpcWebSocketClient
  /** Caches the last used id. */
  private lastId: string
  /** Caches the next id, passed to the `request` method. */
  private nextId: string

  /** Closely matches the type from Jayson/promise import. */
  async request (method: string, params: RequestParamsLike, id?: JSONRPCIDLike): Promise<any> {
    if (!this.connected) await this.connect(this.url)
    if (typeof id === 'string') this.nextId = id

    const result: any = await this.io.call(method, params)

    if (this.closeOnRequest) await this.disconnect()

    return {
      id: typeof id === 'string' ? id : this.lastId,
      jsonrpc: '2.0',
      result
    }
  }

  /** Custom unique ID function following internal state. */
  private id (): string {
    // If no `nextId` was cached, generate a unique id.
    if (this.nextId === '') {
      const id = uuidv4()
      this.lastId = id

      return id
    }

    // Use the cached id, and reset `nextId` when done.
    const id = this.nextId
    this.lastId = id
    this.nextId = ''

    return id
  }

  /** Manage custom connection logic. */
  async connect (url?: string): Promise<void> {
    this.io = new RpcWebSocketClient()

    this.io.onOpen(() => {
      this.connected = true
    })
    this.io.onClose(() => {
      this.connected = false
    })
    this.io.customId(() => this.id())

    if (typeof url === 'string') {
      await this.io.connect(url)
    } else {
      await this.io.connect(this.url)
    }

    if (typeof this.io.ws === 'object') {
      const onmessage = this.io.ws.onmessage
      this.io.ws.onmessage = (e: any) => {
        // Handle syntax errors due to intermittent issues with non-string/non-JSON data on Kodi web socket.
        try {
          onmessage(e)
        } catch (err) {
          for (const handler of this.io.onErrorResponse) {
            handler(err)
          }
        }
      }
    }
  }

  /** Manage graceful disconnect from web socket. */
  async disconnect (): Promise<void> {
    const close = new Promise<void>((resolve, reject) => {
      let ioHandler = (e: any) => {}

      if (typeof this.io.ws.onclose === 'function') {
        ioHandler = this.io.ws.onclose
      }

      this.io.ws.onclose = (e: any) => {
        ioHandler(e)

        resolve(void 0)
      }

      this.io.ws.close()
    })

    return await close
  }
}
