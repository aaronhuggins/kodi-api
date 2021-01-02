import { Validator } from 'jsonschema'
import type { JsonRpcResponse, JsonSchema, MethodDescription, NotificationDescription, ServiceDescription } from './Types'

/** Wrapper class for Kodi's `JSONRPC.Introspect` metadata response. */
export class KodiIntrospect implements JsonRpcResponse {
  constructor (introspect: KodiIntrospect) {
    this.id = introspect.id
    this.jsonrpc = introspect.jsonrpc
    this.result = introspect.result

    this.validator = new Validator()

    for (const refSchema of Object.values(this.result.types)) {
      this.validator.addSchema(refSchema)
    }
  }

  private validator?: Validator
  id?: string | number
  jsonrpc: '2.0'
  result: ServiceDescription

  /** Method to return a method descripton. */
  describeMethod? (method: string): MethodDescription {
    return this.result.methods[method]
  }

  /** Method to return a notification description. */
  describeNotification? (notification: string): NotificationDescription {
    return this.result.notifications[notification]
  }

  /** Method to return a type description. */
  describeType? (typeName: string): JsonSchema {
    return this.result.types[typeName]
  }

  /** Method to validate an input by it's accompanying schema. */
  validateSchema? (input: any, schema: JsonSchema, throwError?: boolean): boolean {
    const result = this.validator.validate(input, schema)

    if (throwError && !result.valid) {
      throw result.errors[0]
    }

    return result.valid
  }

  /** Method to list Kodi JSON-RPC methods. */
  listMethods? (): string[]
  listMethods? (group: false): string[]
  listMethods? (group: true): Record<string, string[]>
  listMethods? (group: boolean): string[] | Record<string, string[]>
  listMethods? (group: boolean = false): string[] | Record<string, string[]> {
    const methodNames = Object.keys(this.result.methods)

    if (group) {
      const methodNameGroups: Record<string, string[]> = {}

      for (const methodName of methodNames) {
        const [nameSpace, method] = methodName.split('.')

        if (!Array.isArray(methodNameGroups[nameSpace])) methodNameGroups[nameSpace] = []

        methodNameGroups[nameSpace].push(method)
      }

      return methodNameGroups
    }

    return methodNames
  }

  /** Get the version of the Kodi API. */
  version? (): string {
    return this.result.version
  }
}
