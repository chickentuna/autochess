import * as events from 'events'

const emitter = new events.EventEmitter()

export function on (id:string, callback: (detail: any) => void) {
  emitter.on(id, (ev) => callback(ev))
}

export function emit (id:string, data: any) {
  emitter.emit(id, data)
}
