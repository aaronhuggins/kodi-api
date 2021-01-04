import { v4 as uuidv4 } from 'uuid'
import type { KodiClient } from './KodiClient'
import type { JsonRpcResponse, KodiMethod } from './Types'

/** Method to return a Kodi JSON-RPC method as a function.
 * @hidden
 */
function getMethod (nameSpace: string, methodName: string, camelCase: string, thisArg: KodiClient, init?: () => void): (...args: any[]) => Promise<any> {
  const method = nameSpace + '.' + methodName.slice(0, 1).toUpperCase() + methodName.slice(1, methodName.length)
  const methodFunc = async function methodFunc (...args: any[]): Promise<any> {
    await thisArg.getIntrospectionCache()

    // Run namespace intiializer.
    if (typeof init === 'function') init()

    const methodDesc = thisArg.introspectionCache.describeMethod(method)
    const params = {}

    // Iterate over arguments, validating and constructing parameters
    for (let i = 0; i < args.length; i += 1) {
      const paramDesc = methodDesc.params[i]

      thisArg.introspectionCache.validateSchema(args[i], paramDesc, thisArg.throwValidationError)

      params[paramDesc.name] = args[i]
    }

    const response: JsonRpcResponse = await thisArg.jsonRpcClient.request(method, params, uuidv4())

    thisArg.introspectionCache.validateSchema(response, methodDesc.returns, thisArg.throwValidationError)

    return response.result
  }

  Object.defineProperty(methodFunc, 'name', { value: camelCase })
  Object.defineProperty(methodFunc.constructor, 'name', { value: camelCase })

  return methodFunc
}

/** Dynamic class for constructing a namespace of Kodi method funcions. */
export class KodiMethodNamespace {
  constructor (nameSpace: string, initMethodName: string, thisArg: KodiClient) {
    const setFunc = (name: string, method: string, thisArg: KodiClient, init?: () => void) => {
      const camelCase = method.slice(0, 1).toLowerCase() + method.slice(1, method.length)
      const func = getMethod(name, method, camelCase, thisArg, init)
      this[method] = func
      this[camelCase] = func
    }
    const init = () => {
      const groups = thisArg.introspectionCache.listMethods(true)
      const methodNames = groups[nameSpace]
      const listMethods = async function listMethods (): Promise<string[]> {
        return methodNames
      }
      this.ListMethods = listMethods
      this.listMethods = listMethods

      for (const methodName of methodNames) {
        setFunc(nameSpace, methodName, thisArg)
      }
    }
    if (typeof thisArg.introspectionCache === 'undefined') {
      setFunc(nameSpace, initMethodName, thisArg, init)
    } else {
      init()
    }
  }

  [method: string]: KodiMethod
  /** Method to list methods for this namespace. */
  listMethods: () => Promise<string[]>
  /** Method to list methods for this namespace. */
  ListMethods: () => Promise<string[]>
}
