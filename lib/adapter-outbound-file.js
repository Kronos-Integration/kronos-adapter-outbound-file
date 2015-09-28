/* jslint node: true, esnext: true */
"use strict";

const iconv = require('iconv-lite');
const fs = require('fs');
const path = require("path");

const baseStep = require('kronos-step').step;
const LOG_LEVEL = require('kronos-step').log_level;


/**
 * Opens a read stream from a file from the file system
 */
class AdapterOutboundFile extends baseStep {
	/**
	 * @param kronos The framework manager
	 * @param flow The flow this step was added to
	 * @param config The configration for this step
	 */
	constructor(kronos, flow, config) {
		super(kronos, flow, config);

		// A destination directory. If this directory is given all the files
		// will be written relative to this directory
		this.directory = undefined;
		if (config.directory) {
			this.directory = config.directory;
		}

		// see 'fs.createWriteStream' for encoding options
		// default is binary. As the stream should be decoded elsewhere
		if (config.encoding) {
			this.encoding = config.encoding;
		}
	}

	_start() {
		// nothing to do
	}

	_stop() {
		// nothing to do
	}

	/**
	 * receives messages from incomming endpoints
	 */
	_doReceive(endpointName, message) {
		if (endpointName === 'inWriteFile') {
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
						this._logMessage(LOG_LEVEL.error, message,
							"If there is no directory in the step configuration, then the file names must be absolute", 'inWriteFile');
					}
				}
			} else {
				this._logMessage(LOG_LEVEL.error, message, "No 'file_name' property in the header", 'inWriteFile');
			}
		}
	}

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
			this._logMessage(LOG_LEVEL.error, message, "The payload of the message has no stream", 'inWriteFile');
		}
	}

	/**
	 * This method should be overwritten by the dreived class to setup the endpoints
	 * for this step.
	 */
	_setupEndpoints() {
		// This 'in' endpoint receives file read events. The evnets have the following format:
		/*
		 * header.file-name = file name
		 * payload = readStream
		 */
		this._addEndpointFromConfig({
			"name": "inWriteFile",
			"passive": true,
			"in": true
		});
	}

}

module.exports = function (kronos, flow, opts) {
	return new AdapterOutboundFile(kronos, flow, opts);
};
