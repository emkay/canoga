const os = require('os')
const crypto = require('crypto')
const EventEmitter = require('events')
const blessed = require('blessed')
const contrib = require('blessed-contrib')

const Speaker = require('speaker')
const lame = require('lame')
const fs = require('fs')
const mp3Duration = require('mp3-duration')

const Volume = require('pcm-volume')

const Files = require('./files')

class Canoga extends EventEmitter {
  constructor (opts) {
    super()

    this.path = opts.path || `${os.homedir()}/Music`
    this.artists = new Map()
    this.albums = new Map()
    this.tracks = new Map()

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

  isArtistInTree (artist) {
    return this.fileTreeData
      .children['Artists']
      .children[artist]
  }

  addArtistToTree (artist) {
    this.fileTreeData
      .children['Artists']
      .children[artist] = {
        children: {}
      }
  }

  isAlbumInTree (artist, album) {
    return this.fileTreeData
      .children['Artists']
      .children[artist]
      .children[album]
  }

  addAlbumToTree (artist, album) {
    this.fileTreeData
      .children['Artists']
      .children[artist]
      .children[album] = {
        children: {}
      }
  }

  isTrackInTree (artist, album, track) {
    return this.fileTreeData
      .children['Artists']
      .children[artist]
      .children[album]
      .children[track]
  }

  hash (name) {
    return crypto.createHash('md5').update(name).digest('hex')
  }

  addTrackToTree (artist, album, track, filename) {
    const id = this.hash(track)
    this.fileTreeData
      .children['Artists']
      .children[artist]
      .children[album]
      .children[track] = {
        children: {},
        id,
        artist,
        album
      }
    this.tracks.set(id, filename)
  }

  organize () {
    this.fileTreeData = {
      extended: true,
      children: {
        'Artists': {
          extended: true,
          children: {}
        }
      }
    }

    this.files.entries.forEach(entry => {
      const {artist, album, title} = entry.metadata.common
      this.artists.set(artist, album)
      this.albums.set(album, title)

      if (artist && album && title) {
        if (!this.isArtistInTree(artist)) {
          this.addArtistToTree(artist)
        }

        if (!this.isAlbumInTree(artist, album)) {
          this.addAlbumToTree(artist, album)
        }

        if (!this.isTrackInTree(artist, album, title)) {
          this.addTrackToTree(artist, album, title, entry.filename)
        }
      }
    })
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
    await this.loadFiles()
    this.organize()
    this.setupProgressBar()
    this.setupFileTree()
    this.setupDisplay()
    this.render()
  }

  setupDisplay () {
    this.display = this.grid.set(0, 1, 2, 1, contrib.table, {
     interactive: false
     , label: 'Info'
     , width: '30%'
     , height: '30%'
     , border: {type: "line", fg: "cyan"}
     , columnSpacing: 10
     , columnWidth: [36]
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
        this.currentFile = this.tracks.get(node.id)
        this.setDisplay(node.artist, node.album, node.name)
        this.play()
      }
    })
    this.fileTree.setData(this.fileTreeData)
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
