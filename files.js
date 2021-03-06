const path = require('path')
const walk = require('walkdir')
const mm = require('music-metadata')

class Files {
  constructor (path) {
    this.path = path
  }

  loadFiles () {
    return new Promise((resolve, reject) => {
      const emitter = walk(this.path)
      const promises = []
      const entries = []

      emitter.on('file', (filename, stat) => {
        if (path.extname(filename) === '.mp3') {
          let p = mm.parseFile(filename)
            .then(metadata => {
              entries.push({
                filename,
                stat,
                metadata
              })
            })
          promises.push(p)
        }
      })

      emitter.on('error', reject)
      emitter.on('end', () => {
        Promise.all(promises).then(() => resolve(entries))
      })
    })
  }
}

module.exports = Files
