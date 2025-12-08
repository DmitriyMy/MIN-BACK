const fs = require('fs')
const concurrently = require('concurrently')

const AVAILABLE_MODES = ['dev', 'debug']
const BASE_DEBUG_PORT = 9230

const args = process.argv
const mode = args.at(2)

if (!AVAILABLE_MODES.includes(mode)) {
  throw new Error(`available modes is ${AVAILABLE_MODES}.`)
}

const nestCliFile = JSON.parse(fs.readFileSync('./nest-cli.json', 'utf8'))
const monorepoProjects = Object.keys(nestCliFile.projects)

console.log(`[starter] %o`, { mode, monorepoProjects })

const getStarterCommand = (project, index) => {
  if (mode === 'dev') {
    return `nest start ${project} --watch`
  }
  if (mode === 'debug') {
    const debugPort = BASE_DEBUG_PORT + index
    console.log({ project, debugPort })
    return `nest start ${project} --debug ${debugPort} --watch`
  }
  throw new Error('unknown mode')
}

concurrently(
  monorepoProjects.map((project, index) => ({ command: getStarterCommand(project, index), name: project })),
  {
    prefix: 'name',
    killOthers: ['failure', 'success'],
  },
)
