import { Server } from './Server'
import { io } from './webapp/app'

new Server(io).init()
