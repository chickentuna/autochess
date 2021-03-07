import React, { Component } from 'react'
import './App.scss'
import * as PIXI from 'pixi.js'
import { Client } from './Client'

interface State {
  name: string
  started: boolean
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
      name: 'Player',
      started: false
    }
  }

  startGame () {
    this.app = new PIXI.Application({
      width: WIDTH,
      height: HEIGHT,
      antialias: true
    })
    document.querySelector('#canvas-zone').appendChild(this.app.view)
    this.client = new Client(this.app, this.state.name)
  }

  componentDidMount () {

  }

  onNameChange (e) {
    this.setState({
      name: e.target.value
    })
  }

  go () {
    this.setState({
      started: true
    })
    this.startGame()
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
        {this.state.started ? (
          <></>
        ) : (
          <div className='lobby'>
            <label htmlFor='name'>Name: <input value={this.state.name} id='name' onChange={(e) => this.onNameChange(e)} /></label>
            <button onClick={() => this.go()}> GO</button>
          </div>
        )}
      </div>
    )
  }
}

export default App
