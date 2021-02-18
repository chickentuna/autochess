import { createLogger, format, transports } from 'winston'

const errorFormat = format.printf((info) => {
  const { level, message, timestamp, ...meta } = info
  let logMessage = `${info.timestamp} ${info.level}: ${info.message}`
  if (Object.keys(meta).length > 0) {
    logMessage += ` ${JSON.stringify(meta)}`
  }
  if (info.error) {
    logMessage += `\n\n${info.error.stack}`
  }
  return logMessage
})

const logger = createLogger({
  transports: new transports.Console({
    level: 'debug',
    format: format.combine(
      format.colorize(),
      format.timestamp(),
      errorFormat
    )
  })
})

export default logger
