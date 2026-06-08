'use strict'

// extract-zip@2.0.1 (via its yauzl dependency) stalls after extracting a
// single entry on modern Node.js: the read stream it opens for an entry's
// contents appears to starve the lazy zip-entry iterator, so neither the
// next 'entry' nor 'close' event ever fires, the returned promise never
// settles, and the process exits with code 0 once the event loop empties —
// silently truncating the package. adm-zip reads the archive into memory
// and decompresses synchronously, sidestepping that interaction entirely.
//
// This module is aliased over "extract-zip" via package.json overrides and
// must keep its signature: `module.exports = async function (zipPath, opts)`
// where opts.dir is an absolute target directory, matching what
// @electron/packager's unzip.js expects.

const AdmZip = require('adm-zip')
const fs = require('fs')
const path = require('path')

const IFMT = 61440
const IFDIR = 16384
const IFLNK = 40960

module.exports = async function extract(zipPath, opts) {
  if (!path.isAbsolute(opts.dir)) {
    throw new Error('Target directory is expected to be absolute')
  }

  await fs.promises.mkdir(opts.dir, { recursive: true })
  const dir = await fs.promises.realpath(opts.dir)

  const zip = new AdmZip(zipPath)
  for (const entry of zip.getEntries()) {
    if (entry.entryName.startsWith('__MACOSX/')) continue

    const dest = path.join(dir, entry.entryName)
    const destDir = path.dirname(dest)
    await fs.promises.mkdir(destDir, { recursive: true })

    const canonicalDestDir = await fs.promises.realpath(destDir)
    const relativeDestDir = path.relative(dir, canonicalDestDir)
    if (relativeDestDir.split(path.sep).includes('..')) {
      throw new Error(`Out of bound path "${canonicalDestDir}" found while processing file ${entry.entryName}`)
    }

    // Unix permission bits live in the high 16 bits of the external file
    // attributes — same convention extract-zip and most zip tools rely on.
    const mode = (entry.attr >>> 16) & 0xFFFF
    const isSymlink = (mode & IFMT) === IFLNK
    let isDir = (mode & IFMT) === IFDIR || entry.isDirectory
    if (!isDir && entry.entryName.endsWith('/')) isDir = true
    // Windows-authored zips signal directories via attr === 16 instead.
    const madeBy = entry.header.made >> 8
    if (!isDir) isDir = (madeBy === 0 && entry.attr === 16)

    const procMode = (mode === 0 ? (isDir ? 0o755 : 0o644) : mode) & 0o777

    if (isDir) {
      await fs.promises.mkdir(dest, { recursive: true, mode: procMode })
      continue
    }

    if (isSymlink) {
      const link = entry.getData().toString('utf8')
      await fs.promises.symlink(link, dest)
    } else {
      await fs.promises.writeFile(dest, entry.getData(), { mode: procMode })
    }
  }
}
