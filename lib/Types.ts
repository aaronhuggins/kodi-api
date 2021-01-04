import type {
  HttpClient,
  HttpClientOptions,
  HttpsClient,
  HttpsClientOptions,
  TcpClient,
  TcpClientOptions
} from 'jayson/promise'
import type { Schema } from 'jsonschema'
import type { WebSocketClient, WebSocketClientOptions } from './WebSocketClient'

// Internal modification of json schema type.
export interface JsonSchema extends Schema {
  name?: string
}

// Client interfaces and types.
export type JaysonClient = HttpClient | HttpsClient | TcpClient | WebSocketClient
export type JaysonClientOptions = HttpClientOptions | HttpsClientOptions | TcpClientOptions | WebSocketClientOptions
export type ClientType = 'http' | 'https' | 'tcp' | 'ws'
export type ParameterMode = 'arguments' | 'object'
export type KodiObjectMethod = (obj?: Record<string, any>) => Promise<any>
export type KodiArgumentMethod = (...args: any[]) => Promise<any>
export type KodiMethod = KodiArgumentMethod | KodiObjectMethod

interface KodiBaseClientOptions {
  clientType: ClientType
  clientOptions?: JaysonClientOptions
  throwValidationError?: boolean
  parameterMode?: ParameterMode
}

interface KodiHttpClientOptions extends KodiBaseClientOptions {
  clientType: 'http'
  clientOptions?: HttpClientOptions
}

interface KodiHttpsClientOptions extends KodiBaseClientOptions {
  clientType: 'https'
  clientOptions?: HttpsClientOptions
}

interface KodiTcpClientOptions extends KodiBaseClientOptions {
  clientType: 'tcp'
  clientOptions?: TcpClientOptions
}

interface KodiWsClientOptions extends KodiBaseClientOptions {
  clientType: 'ws'
  clientOptions?: WebSocketClientOptions
}

export type KodiClientOptions = KodiHttpClientOptions | KodiHttpsClientOptions | KodiTcpClientOptions | KodiWsClientOptions

// Kodi JSON-RPC interfaces.
export interface JsonRpcResponse {
  id?: string | number
  jsonrpc: '2.0'
  result: any
}

export interface ServiceDescription {
  description: string
  id: 'http://xbmc.org/jsonrpc/ServiceDescription.json'
  version: string
  methods: Record<string, MethodDescription>
  notifications: Record<string, NotificationDescription>
  types: Record<string, JsonSchema>
}

export interface PropertyDescription {
  description: string
  params: JsonSchema[]
  returns: JsonSchema
  type: 'method' | 'notification'
}

export interface MethodDescription extends PropertyDescription {
  type: 'method'
}

export interface NotificationDescription extends PropertyDescription {
  returns: null
  type: 'notification'
}
