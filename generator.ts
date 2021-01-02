import * as DtsDom from 'dts-dom'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { KodiClient } from './index'

async function main () {
  const client = KodiClient.tcp()
  const introspect = await client.getIntrospectionCache()
  const rootFolder = './lib/api'
  const version = introspect.version()
  const apiFolder = rootFolder + '/' + version
  const methods = introspect.listMethods()

  if (!existsSync(apiFolder)) {
    mkdirSync(apiFolder)
  }

  
}

main()
