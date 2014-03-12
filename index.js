// template-stream
xtend  = require('xtend') // extend object like a boss. Raynos/xtend
util   = require('util')
stream = require('stream').Transform
if (!stream) stream = require('readable-stream').Transform // stream 2 compatible

// json string in and out
function tStream(config) {
	self = this
	self._config  = (config) ? config : {}
	self._default = { jsonOut: 'auto', filterErrors: false } // true/false/'auto'=same as came in
	self._stat    = {
		processed: 0,
		filtered:  0,
		badJson:   0
	}

	function bump(area) {
		self._stat[area] = (self._stat[area]) ? self._stat[area] + 1 : 1
	}

	function stat(area) {
		return (self._stat[area]) ? self._stat[area] : self._stat
	}

	function Default(config) {
		self._default = xtend(self._default, self.config)  // update defaults
		self.config   = xtend(self._default, self._config) // remerge defaults with original config
		return self
	} 

	function bind(area, fn) {
		self[area] = fn
		return self
	}

	self.onError     = function(err) { 
		self.emit('error', err)
		return self
	}

	stream.call(self, { objectMode: true })

	self.onFlush = function(cb) { return true } // true=do callback, false=don't callback
	self._flush  = function(cb) {
		if (self.onFlush(cb)) cb()
	}

	self.onTransform = function (data) { 
		return data // return undefined to filter
	}

	self._transform = function (data, encoding, callback) {
		if (data) {
			isJson  = data instanceof Buffer
			if (isJson) {
				json = data.toString('utf8')
				try {
					data = JSON.parse(json)
				} catch (e) {
					self._stat.badJson++
					if (!self.config.filterErrors) self.emit('error', e + ': ' + json)
					callback()
				}
			}
			transformedData = self.onTransform(data)
			if (transformedData !== undefined) {
				if (self.config.jsonOut || (isJson && self.config.jsonOut == 'auto')) data = new Buffer(JSON.stringify(data), 'utf8')
				self._stat.processed++
				self.push(data)
			} else {
				self._stat.filtered++
			}
		} else {
			self.push(data)
			callback()
		}
	};
}


util.inherits(tStream, stream);
module.exports = tStream;