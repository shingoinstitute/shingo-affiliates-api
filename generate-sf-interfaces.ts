#!/usr/bin/env ts-node
import describe2ts from '@shingo/describe2ts'
import { Connection, DescribeSObjectResult } from 'jsforce'
import { writeFile as writefile } from 'fs'
import { promisify } from 'util'
const writeFile = promisify(writefile)

const describeAll = async (conn: Connection, objects: string[]) => {
  const global = await conn.describeGlobal()
  return global.sobjects.reduce((acc, c) => {
    if (objects.includes(c.name))
      acc.push(conn.sobject(c.name).describe())
    return acc
  }, [] as Array<Promise<DescribeSObjectResult>>)
}

const objects = [
  'Workshop__c'
, 'Account'
, 'Contact'
, 'Attachment'
, 'RecordType'
, 'Support_Page__c'
, 'WorkshopFacilitatorAssociation__c'
]

const extension = '.sf'

const resolver = (name: string) =>
  objects.includes(name) ? `import("./${name}${extension}").default` : null

if ( !process.env.SF_URL
  || !process.env.SF_ENV
  || !process.env.SF_USER
  || !process.env.SF_PASS) {
  console.error('Missing environment variables')
  process.exit(1)
}

const main = async () => {
  const conn = new Connection({
    loginUrl: process.env.SF_URL!,
    instanceUrl: process.env.SF_ENV!
  })
  await conn.login(process.env.SF_USER!, process.env.SF_PASS!)
  const describes = await describeAll(conn, objects)

  const pairs = await Promise.all(
    describes.map(async descP => {
      const desc = await descP
      // add the name to the file
      const iface =
        describe2ts(desc, resolver) + `\nexport const name = "${desc.name}"\nexport type name = typeof name\n`
      await writeFile(`./src/sf-interfaces/${desc.name}${extension}.ts`, iface, 'utf8')
      return [desc.name, `${desc.name}${extension}`] as [string, string]
    })
  )

  const exports = pairs.map(([d, fn]) => 
    `export { ${d} } from "./${fn}"`
  ).join('\n')

  const typeTable = 
      `export interface SFInterfaces {\n${pairs.map(([d]) => `${d}: ${resolver(d)}`).join('\n')}\n}`

  const index =
    exports + '\n' + typeTable + '\n'

  await writeFile(`./src/sf-interfaces/index.ts`, index, 'utf8')
}

main().then(() => {
  process.exit(0)
}).catch(err => {
  console.error(err)
  process.exit(1)
})

