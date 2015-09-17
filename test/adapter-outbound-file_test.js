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

const outboundFileFactory = require('../lib/adapter-outbound-file');
const messageFactory = require('kronos-step').message;

/**
 * Creates the outboundFileAdapter step and send it the given message
 * @param options The options to create the adapter
 * @param messageHeader The messageHeader for themessage to send to the adapter
 * @param done The done callback for the test framework
 * @param expectedErrors An array with the expected error messages
 * @param noStream if set to true, the message will be send without a payload
 */
function collect(options, messageHeader, done, expectedErrors, noStream) {
	// The file expected to be written
	const destFile = path.join(volatileDir, "myFile.csv");

	// collect the error messages from the step
	const errors = [];

	let outboundFile = outboundFileFactory(options);

	outboundFile._logMessage = function (level, message, err, endpointName) {
		errors.push(err);
	};


	let inEndPoint = outboundFile.getEndpoint('inWriteFile');
	let it = inEndPoint.getInPassiveIterator()();
	it.next();

	let msg = messageFactory(messageHeader);

	if (!noStream) {
		msg.payload = fs.createReadStream(path.join(fixturesDir, 'existing_file.csv'));
	} else {
		msg.payload = undefined;
	}

	// send the message to the step
	it.next(msg);

	// validate that the file exists
	setTimeout(function () {

		if (expectedErrors) {
			// custom verification function for error checks
			assert.deepEqual(errors, expectedErrors);
			done();
		} else {
			// check that the file exists
			// Query the entry
			let stats = fs.lstatSync(destFile);

			// Is it a directory?
			if (stats.isFile()) {
				done();
			} else {
				assert.ok(false, "The file does not exists");
			}
		}

	}, 10);
}


describe('adapter-outbound-file: test events', function () {
	/**
	 * Clears the test directory. This is the directory where the files will be written
	 */
	beforeEach(function () {
		// Delete all the the 'volatile' directory
		try {
			rimraf.sync(volatileDir);
		} catch (err) {
			console.log(err);
		}
		fs.mkdirSync(volatileDir);

	});


	it('Send event: absolute file name', function (done) {
		// the file name of the file to be written by the step
		const destFile = path.join(volatileDir, "myFile.csv");

		collect({
			"name": "myStep"
		}, {
			"file_name": destFile
		}, done);
	});

	it('Send event: absolute file name with directory given', function (done) {
		// the file name of the file to be written by the step
		const destFile = path.join(volatileDir, "myFile.csv");

		collect({
			"name": "myStep",
			"directory": volatileDir
		}, {
			"file_name": destFile
		}, done);
	});

	it('Send event: relative file name with directory given', function (done) {
		// the file name of the file to be written by the step
		const destFile = path.join(volatileDir, "myFile.csv");

		collect({
			"name": "myStep",
			"directory": volatileDir
		}, {
			"file_name": "myFile.csv"
		}, done);
	});

	it('Send event: Write with custom encoding', function (done) {
		// the file name of the file to be written by the step
		const destFile = path.join(volatileDir, "myFile.csv");

		collect({
			"name": "myStep",
			"directory": volatileDir,
			"encoding": "base64"
		}, {
			"file_name": "myFile.csv"
		}, done);
	});


	it('Error: Send event: relative file name without directory given', function (done) {
		// the file name of the file to be written by the step
		const destFile = path.join(volatileDir, "myFile.csv");

		collect({
			"name": "myStep"
		}, {
			"file_name": "myFile.csv"
		}, done, ['If there is no directory in the step configuration, then the file names must be absolute']);
	});

	it('Error: Send event: message without payload', function (done) {
		// the file name of the file to be written by the step
		const destFile = path.join(volatileDir, "myFile.csv");

		collect({
			"name": "myStep",
			"directory": volatileDir
		}, {
			"file_name": "myFile.csv"
		}, done, ['The payload of the message has no stream'], true);
	});

	it('Error: Send event: No "file_name" in the message header', function (done) {
		// the file name of the file to be written by the step
		const destFile = path.join(volatileDir, "myFile.csv");

		collect({
			"name": "myStep",
			"directory": volatileDir
		}, {
			"no_file_name": "myFile.csv"
		}, done, ["No 'file_name' property in the header"], true);
	});
});

describe('adapter-outbound-file: config', function () {
	it('Create the step directory.', function (done) {
		let outboundFile = outboundFileFactory({
			"name": "myStep",
			"directory": "path/to/nowhere"
		});
		assert.equal(outboundFile.directory, 'path/to/nowhere', 'The directory is not as expected');
		done();
	});


	it('Create the step with default config. (only step name)', function (done) {
		let outboundFile = outboundFileFactory({
			"name": "myStep"
		});
		assert.isObject(outboundFile);
		assert.equal(outboundFile.name, 'myStep', 'The step name is not as expected');
		done();
	});

	it('ERROR: No config given', function (done) {
		let fn = function () {
			let outboundFile = outboundFileFactory();
		};
		expect(fn).to.throw('No config given.');

		done();
	});


});
