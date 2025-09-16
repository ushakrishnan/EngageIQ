import pino from 'pino'

const isProd = process.env.NODE_ENV === 'production'

const pinoLib: any = pino
let logger: pino.Logger

if (!isProd && typeof pinoLib.transport === 'function') {
  logger = pinoLib({ level: process.env.LOG_LEVEL || 'info' }, pinoLib.transport({ target: 'pino-pretty' }))
} else {
  logger = pinoLib({ level: process.env.LOG_LEVEL || 'info' })
}

export default logger
