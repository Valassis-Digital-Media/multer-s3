var S3FS = require('s3fs')
var crypto = require('crypto')

function getFilename (req, file, cb) {
  crypto.pseudoRandomBytes(16, function (err, raw) {
    cb(err, err ? undefined : raw.toString('hex'))
  })
}

function S3Storage (opts) {
  if (!opts.bucket) throw new Error('bucket is required')
  if (!opts.secretAccessKey) throw new Error('secretAccessKey is required')
  if (!opts.accessKeyId) throw new Error('accessKeyId is required')
  if (!opts.region) throw new Error('region is required')
  if (!opts.dirname) throw new Error('dirname is required')

  this.options = opts
  this.defaultS3Params = (opts.defaultS3Params || undefined)
  this.getFilename = (opts.filename || getFilename)
  this.s3fs = new S3FS(opts.bucket, opts)
}

S3Storage.prototype._handleFile = function (req, file, cb) {
  var that = this
  that.getFilename(req, file, function (err, filename) {
    var filePath = that.options.dirname + '/' + filename
    var json={ContentType:file.mimetype}
    if (that.defaultS3Params!=undefined){
      for (var p in that.defaultS3Params){
        json[p] = that.defaultS3Params[p]
      }
    }
    var metadata={}
    for (var prop in req.body){
      metadata[String(prop)] = String(req.body[prop])
    }
    json['Metadata']=metadata
    var outStream = that.s3fs.createWriteStream(filePath,json)

    file.stream.pipe(outStream)

    outStream.on('error', cb)
    outStream.on('finish', function () {
      cb(null, { size: outStream.bytesWritten, key: filePath })
    })
  })
}

S3Storage.prototype._removeFile = function (req, file, cb) {
  this.s3fs.unlink(file.key, cb)
}

module.exports = function (opts) {
  return new S3Storage(opts)
}
