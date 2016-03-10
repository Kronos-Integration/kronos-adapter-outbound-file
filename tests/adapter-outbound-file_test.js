/* global describe, it, beforeEach */
/* jslint node: true, esnext: true */

"use strict";

const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const should = chai.should();

const fs = require('fs');
const path = require("path");
const rimraf = require('rimraf');

const fixturesDir = path.join(__dirname, 'fixtures');
const volatileDir = path.join(__dirname, 'fixtures', 'volatile');

const kronosAdapterOutboundFile = require('../index');
const testStep = require('kronos-test-step');
const step = require('kronos-step');
const endpoint = require('kronos-endpoint');
const serviceManager = require('kronos-service-manager');

// ---------------------------
// Create a mock manager
// ---------------------------

const managerPromise = serviceManager.manager().then(manager =>
	Promise.all([
		kronosAdapterOutboundFile.registerWithManager(manager)
	]).then(() =>
		Promise.resolve(manager)
	));



/**
 * Creates the outboundFileAdapter step and send it the given message
 * @param options The options to create the adapter
 * @param messageHeader The messageHeader for the message to send to the adapter
 * @param expectedErrors An array with the expected error messages
 * @param noStream if set to true, the message will be send without a payload
 */
function collect(options, messageHeader, expectedErrors, noStream) {
	return managerPromise.then(manager => {

		// The file expected to be written
		const destFile = path.join(volatileDir, "myFile.csv");

		// collect the error messages from the step
		const errors = [];

		options.type = "kronos-adapter-outbound-file";
		let outboundFile = manager.createStepInstanceFromConfig(options, manager);

		outboundFile.error = function (logObject) {
			errors.push(logObject.short_message);
		};

		// This endpoint is the OUT endpoint of the previous step.
		// It will be connected with the OUT endpoint of the Adpater
		let sendEndpoint = new endpoint.SendEndpoint("testEndpointOut");

		let inEndPoint = outboundFile.endpoints.inWriteFile;
		sendEndpoint.connected = inEndPoint;

		let msg = {
			"info": messageHeader
		};

		if (!noStream) {
			msg.payload = fs.createReadStream(path.join(fixturesDir, 'existing_file.csv'));
		} else {
			msg.payload = undefined;
		}

		return outboundFile.start().then((step) => {
			// send the message to the step
			return sendEndpoint.receive(msg).then(
				function (val) {
					if (expectedErrors) {
						assert.false("There where errors expected. The promise should fail");
						return Promise.reject("Error");
					} else {
						// check that the file exists
						// Query the entry
						let stats = fs.lstatSync(destFile);

						// Is it a file?
						if (stats.isFile()) {
							return Promise.resolve("OK");
						} else {
							assert.ok(false, "The file does not exists");
							return Promise.reject("Error");
						}
					}
					return Promise.reject("Error");
				}
			).catch(function (err) {
				if (expectedErrors) {
					assert.deepEqual(errors, expectedErrors);
					return Promise.resolve("OK");
				} else {
					assert.false("There where NO errors expected. The promise should be fulfilled");
					return Promise.reject("Error");
				}

			});

		});
	});

}


describe('adapter-outbound-file: test events', function () {
	/**
	 * Clears the test directory. This is the directory where the files will be written
	 */
	beforeEach(function () {
		// Delete the the 'volatile' directory
		try {
			rimraf.sync(volatileDir);
		} catch (err) {
			console.log(err);
		}
		fs.mkdirSync(volatileDir);

	});


	it('Send event: absolute file name', function () {
		// the file name of the file to be written by the step
		const destFile = path.join(volatileDir, "myFile.csv");

		return collect({
			"name": "myStep"
		}, {
			"file_name": destFile
		});
	});

	it('Send event: absolute file name with directory given', function () {
		// the file name of the file to be written by the step
		const destFile = path.join(volatileDir, "myFile.csv");

		return collect({
			"name": "myStep",
			"directory": volatileDir
		}, {
			"file_name": destFile
		});
	});

	it('Send event: relative file name with directory given', function () {
		// the file name of the file to be written by the step
		const destFile = path.join(volatileDir, "myFile.csv");

		return collect({
			"name": "myStep",
			"directory": volatileDir
		}, {
			"file_name": "myFile.csv"
		});
	});

	it('Send event: Write with custom encoding', function () {
		// the file name of the file to be written by the step
		const destFile = path.join(volatileDir, "myFile.csv");

		return collect({
			"name": "myStep",
			"directory": volatileDir,
			"encoding": "base64"
		}, {
			"file_name": "myFile.csv"
		});
	});


	it('Error: Send event: relative file name without directory given', function () {
		// the file name of the file to be written by the step
		const destFile = path.join(volatileDir, "myFile.csv");

		return collect({
			"name": "myStep"
		}, {
			"file_name": "myFile.csv"
		}, ['If there is no directory in the step configuration, then the file names must be absolute']);
	});

	it('Error: Send event: message without payload', function () {
		// the file name of the file to be written by the step
		const destFile = path.join(volatileDir, "myFile.csv");

		return collect({
			"name": "myStep",
			"directory": volatileDir
		}, {
			"file_name": "myFile.csv"
		}, ['The payload of the message has no stream'], true);
	});

	it('Error: Send event: No "file_name" in the message header', function () {
		// the file name of the file to be written by the step
		const destFile = path.join(volatileDir, "myFile.csv");

		return collect({
			"name": "myStep",
			"directory": volatileDir
		}, {
			"no_file_name": "myFile.csv"
		}, ["No 'file_name' property in the header"], true);
	});
});

describe('adapter-outbound-file: config', function () {
	it('Create the step directory.', function () {
		return managerPromise.then(manager => {

			let outboundFile = manager.createStepInstanceFromConfig({
				"type": "kronos-adapter-outbound-file",
				"name": "myStep",
				"directory": "path/to/nowhere"
			}, manager);
			assert.equal(outboundFile.directory, 'path/to/nowhere', 'The directory is not as expected');
			return Promise.resolve("OK");
		});
	});


	it('Create the step with default config. (only step name)', function () {
		return managerPromise.then(manager => {

			let outboundFile = manager.createStepInstanceFromConfig({
				"type": "kronos-adapter-outbound-file",
				"name": "myStep"
			}, manager);
			assert.isObject(outboundFile);
			assert.equal(outboundFile.name, 'myStep', 'The step name is not as expected');
			return Promise.resolve("OK");
		});
	});


});
