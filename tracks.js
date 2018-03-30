const crypto = require('crypto')

class Tracks {
  constructor () {
    this.artists = new Map()
    this.albums = new Map()
    this.tracks = new Map()
    this.playlist = []
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

  addTrackToTree (artist, album, track, filename, picture) {
    const id = this.hash(track)
    this.fileTreeData
      .children['Artists']
      .children[artist]
      .children[album]
      .children[track] = {
        children: {},
        id,
        artist,
        album,
        picture
      }
    this.tracks.set(id, filename)
  }

  organize (entries) {
    this.fileTreeData = {
      extended: true,
      children: {
        'Artists': {
          extended: true,
          children: {}
        }
      }
    }

    entries.forEach(entry => {
      const {artist, album, title} = entry.metadata.common
      const picture = entry.metadata.common.picture &&
        entry.metadata.common.picture[0] &&
        entry.metadata.common.picture[0].data

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
          this.addTrackToTree(artist, album, title, entry.filename, picture)
        }
      }
    })
  }
}

module.exports = Tracks
