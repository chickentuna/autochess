import Koa from 'koa'

import log from './log'

function errorLog (error: Error, ctx: Koa.Context) {
  const message = `Internal error

General
\tRemote address: ${ctx.request.ip}
\tRequest URL: ${ctx.request.href}
\tRequest Method: ${ctx.request.method}

Request Headers
${Object.entries(ctx.request.headers).map(([name, value]) => `\t${name}: ${value}`).join('\n')}

Request payload
\t${(ctx.request as any).rawBody}

Response Headers
${Object.entries(ctx.response.headers).map(([name, value]) => `\t${name}: ${value}`).join('\n')}

Response payload
\t${JSON.stringify(ctx.response.body, null, 2)}`

  log.log('error', message, { error })
}

export default errorLog
