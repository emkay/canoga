const os = require('os')
const EventEmitter = require('events')
const blessed = require('blessed')
const contrib = require('blessed-contrib')

const Speaker = require('speaker')
const lame = require('lame')
const fs = require('fs')
const mp3Duration = require('mp3-duration')

const Volume = require('pcm-volume')

const Files = require('./files')
const Tracks = require('./tracks')

class Canoga extends EventEmitter {
  constructor (opts) {
    super()

    this.path = opts.path || `${os.homedir()}/Music`
    this.tracker = new Tracks()

    this.files = new Files(this.path)
    this.setup()
    this.screen = blessed.screen()

    /* eslint-disable-next-line */
    this.grid = new contrib.grid({rows: 3, cols: 2, screen: this.screen})

    this.screen.key(['escape', 'q', 'C-c'], (ch, key) => process.exit(0))
    this.render()
  }

  loadFiles () {
    return this.files.loadFiles()
  }

  async getDuration () {
    return parseInt(await mp3Duration(this.currentFile))
  }

  async play () {
    const readable = fs.createReadStream(this.currentFile)
    const decoder = new lame.Decoder()
    const duration = await this.getDuration()

    let total = 0

    this.isPlaying = true
    this.timer = setInterval(() => {
      total += 1
      const percent = total / duration
      this.setProgressBar(percent)
      this.screen.render()
    }, 1000)

    decoder.on('format', (f) => {
      const format = f
      const v = new Volume()
      const speaker = new Speaker(format)
      v.pipe(speaker)
      decoder.pipe(v)
      speaker.on('close', this.next.bind(this))
    })

    readable.pipe(decoder)
  }

  pause () {
    this.isPlaying = false
  }

  next () {
    clearInterval(this.timer)
    this.isPlaying = false
    this.setProgressBar(0)
    this.play()
  }

  prev () {
  }

  render () {
    this.screen.render()
  }

  async setup () {
    const entries = await this.loadFiles()
    this.tracker.organize(entries)
    this.setupProgressBar()
    this.setupFileTree()
    this.setupDisplay()
    this.render()
  }

  setPicture (picture) {
    if (!picture) return
    const render = this.render.bind(this)

    this.picture = this.grid.set(1, 1, 1, 1, contrib.picture, {
      base64: picture,
      cols: 30,
      onReady: render
    })
  }

  setupDisplay () {
    this.display = this.grid.set(0, 1, 1, 1, contrib.table, {
      interactive: false,
      label: 'Info',
      width: '30%',
      height: '30%',
      border: {type: 'line', fg: 'cyan'},
      columnSpacing: 10,
      columnWidth: [36]
    })
  }

  setDisplay (artist, album, track) {
    this.display.setData(
      { headers: ['Now Playing'],
        data:
        [ [track],
          [''],
          ['By'],
          [''],
          [artist],
          [''],
          ['Off the album'],
          [''],
          [album]
        ]})
    this.render()
  }

  setupFileTree () {
    this.fileTree = this.grid.set(0, 0, 2, 1, contrib.tree,
      {label: 'File Tree', fg: 'green'})
    this.fileTree.focus()
    this.fileTree.on('select', node => {
      if (node.id) {
        this.currentFile = this.tracker.tracks.get(node.id)
        this.setDisplay(node.artist, node.album, node.name)

        if (node.picture) this.setPicture(node.picture)
        if (this.timer) clearInterval(this.timer)
        this.play()
      }
    })
    this.fileTree.setData(this.tracker.fileTreeData)
  }

  setupProgressBar () {
    this.progressBar = this.grid.set(2, 0, 1, 2, contrib.gauge,
      {label: 'Progress', stroke: 'green', fill: 'white'})
    this.setProgressBar(0)
  }

  setProgressBar (n) {
    this.progressBar.setPercent(n)
    this.render()
  }
}

module.exports = Canoga
