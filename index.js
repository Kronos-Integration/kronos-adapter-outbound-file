/* jslint node: true, esnext: true */
'use strict';

const AdapterOutboundFileFactory = require('./lib/adapter-outbound-file');
exports.adpaterOutboundFile = AdapterOutboundFileFactory;

exports.registerWithManager = manager => manager.registerStep(AdapterOutboundFileFactory);
