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
			"in": true,
			"passive": true
		}
	},
	initialize(manager, scopeReporter, name, stepConfiguration, endpoints, props) {
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
	finalize(manager, scopeReporter, stepConfiguration) {
		const self = this;
		const inEndpoint = self.endpoints.inWriteFile;

		let generatorInitialized = false;
		inEndpoint.setPassiveGenerator(function* () {
			while (self.isRunning || generatorInitialized === false) {
				generatorInitialized = true;
				let currentRequest = yield;
				self._receiveWriteFileMessage(currentRequest);
			}
		});
	},

	/**
	 * receives messages from incomming endpoints
	 */
	_receiveWriteFileMessage(message) {
		if (message.header.file_name) {
			let fileName = message.header.file_name;
			let fileNameAbs;
			if (this.directory) {
				// all the files schould be written here
				if (path.isAbsolute(fileName)) {
					fileNameAbs = path.join(this.directory, path.basename(fileName));
				} else {
					fileNameAbs = path.join(this.directory, fileName);
				}
				// write it
				this._writeFile(message, fileNameAbs);
			} else {
				if (path.isAbsolute(fileName)) {
					// write it
					this._writeFile(message, fileName);
				} else {
					// error
					this.error({
						"message": message,
						"short_message": "If there is no directory in the step configuration, then the file names must be absolute",
						"endpoint": "inWriteFile"
					});
				}
			}
		} else {
			this.error({
				"message": message,
				"short_message": "No 'file_name' property in the header",
				"endpoint": "inWriteFile"
			});
		}
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
		if (stream) {
			let writeStream = fs.createWriteStream(fileName, options);
			stream.pipe(writeStream);
		} else {
			this.error({
				"message": message,
				"short_message": "The payload of the message has no stream",
				"endpoint": "inWriteFile"
			});
		}
	}


};

const AdapterOutboundFileFactory = Object.assign({}, BaseStep, AdapterOutboundFile);
module.exports = AdapterOutboundFileFactory;
