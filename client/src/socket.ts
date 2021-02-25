import io from 'socket.io-client'

const socket = io('localhost:3001', {
  transports: ['websocket']
})
socket.on('connect', (...args) => {
  console.log('connect', ...args)
})

socket.on('disconnect', () => {
  console.log('disconnect')
  window.location.reload()
})

export default socket
