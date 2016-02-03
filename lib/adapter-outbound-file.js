/* jslint node: true, esnext: true */
"use strict";

const iconv = require('iconv-lite');
const fs = require('fs');
const path = require("path");

const BaseStep = require('kronos-step').Step;

const AdapterOutboundFile = {
	"name": "kronos-adapter-outbound-file",
	"description": "Writes files to the file system",
	"endpoints": {
		"inWriteFile": {
			"in": true
		}
	},
	initialize(manager, name, stepConfiguration, props) {
		// A destination directory. If this directory is given all the files
		// will be written relative to this directory
		let directory;
		if (stepConfiguration.directory) {
			directory = stepConfiguration.directory;
		}
		props.directory = {
			value: directory
		};

		// see 'fs.createWriteStream' for encoding options
		// default is binary. As the stream should be decoded elsewhere
		let encoding;
		if (stepConfiguration.encoding) {
			encoding = stepConfiguration.encoding;
		}
		props.encoding = {
			value: encoding
		};

	},
	finalize(manager, stepConfiguration) {
		const self = this;
		const inEndpoint = self.endpoints.inWriteFile;

		inEndpoint.receive = function (message) {
			return new Promise(function (fulfill, reject) {

				if (message.info.file_name) {
					let fileName = message.info.file_name;
					let fileNameAbs;
					if (self.directory) {
						// all the files schould be written here
						if (path.isAbsolute(fileName)) {
							fileNameAbs = path.join(self.directory, path.basename(fileName));
						} else {
							fileNameAbs = path.join(self.directory, fileName);
						}
						// write it
						fulfill(self._writeFile(message, fileNameAbs));
					} else {
						if (path.isAbsolute(fileName)) {
							// write it
							fulfill(self._writeFile(message, fileName));
						} else {
							// error
							const msg = {
								"message": message,
								"short_message": "If there is no directory in the step configuration, then the file names must be absolute",
								"endpoint": "inWriteFile"
							};
							self.error(msg);
							reject(msg);
						}
					}
				} else {
					const msg = {
						"message": message,
						"short_message": "No 'file_name' property in the header",
						"endpoint": "inWriteFile"
					};
					self.error(msg);
					reject(msg);
				}
			});
		};

	},


	/**
	 * Writes the file
	 * @param message The message object
	 * @param fileName The file name for the new file
	 */
	_writeFile(message, fileName) {
		let stream = message.payload;
		let options = {
			"encoding": 'binary'
		};
		if (this.encoding) {
			options.encoding = this.encoding;
		}

		const self = this;

		return new Promise(function (fulfill, reject) {
			if (stream) {
				let writeStream = fs.createWriteStream(fileName, options);
				stream.pipe(writeStream);
				fulfill(self);
			} else {
				const msg = {
					"message": message,
					"short_message": "The payload of the message has no stream",
					"endpoint": "inWriteFile"
				};
				self.error(msg);
				reject(msg);
			}
		});

	}

};

const AdapterOutboundFileFactory = Object.assign({}, BaseStep, AdapterOutboundFile);
module.exports = AdapterOutboundFileFactory;
