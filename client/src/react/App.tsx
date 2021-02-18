import React, { Component } from 'react'
import './App.scss'
import * as PIXI from 'pixi.js'
import { Client } from './Client'

interface State {
}
interface Props {

}

export const WIDTH = 640
export const HEIGHT = 480

class App extends Component<Props, State> {
  app: PIXI.Application
  container: PIXI.Container
  state: State
  client: Client

  constructor (props: Props) {
    super(props)
    this.state = {
    }
  }

  componentDidMount () {
    this.app = new PIXI.Application({
      width: WIDTH,
      height: HEIGHT,
      antialias: true
    })
    document.querySelector('#canvas-zone').appendChild(this.app.view)
    this.client = new Client(this.app)
  }

  render () {
    return (
      <div className='App'>
        <header className='App-header'>
          <h1 className='App-header-title'>Autochess</h1>
        </header>
        <div className='App-content'>

          <div id='canvas-zone' />
          <div id='controls' />

        </div>
      </div>
    )
  }
}

export default App
