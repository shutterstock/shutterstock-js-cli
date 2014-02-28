#!/usr/bin/env node

'use strict';
var log = require('./../lib/log');
var prettyTime = require('pretty-hrtime');
var chalk = require('chalk');
var Liftoff = require('liftoff');
var handler = require('./../lib/handler');
var fs = require('fs');
var Q = require('q');

var actions = handler.actions();
var traceFlag = false;

var cli = new Liftoff({
  name: 'shutterstock'
  // TODO Add completions for bash / zsh
});

// Main execution loop
findCredentials()
  .then(function(credentials){
    handler.setup(credentials); })
  .done(
    function(){ 
      cli.launch(handleArguments); });

// look for a valid .shutterstock-credentials file in the usual places
function findCredentials(){
  // todo test this on windows...
  var configFile = '.shutterstock-api-credentials.json';
  var home = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
  var etc = process.env[(process.platform === 'win32') ? 'WINDOWS' : 'ETC'];
  var readFile = Q.denodeify(fs.readFile);
  
  var homeConfig = readFile(home + '/' + configFile, {encoding: 'utf8'});
  var etcConfig = readFile(etc + '/' + configFile, {encoding: 'utf8'});
  
  return Q.allSettled(homeConfig, etcConfig).spread(function(atHome, atEtc){
    // TODO Fix this, something odd was happening with fsRead, work around.
    if(atHome.state === 'fulfilled') { return require(home + '/' + configFile); }
    if(atEtc.state === 'fulfilled') { return require(etc + '/' + configFile); }
    
    throw 'Missing or invalid ' + configFile;
  });
}

function handleArguments(env) {
  var argv = env.argv;
  var cliPackage = require('../package');
  var versionFlag = argv.v || argv.version;
  var action = processAction(argv._);
  var media = processMedia(argv._);
  traceFlag = argv.trace;

  if (versionFlag) {
    log('CLI version', cliPackage.version);
    process.exit(0);
  }

  logEvents(handler);

  process.nextTick(function() {
    handler[action].call(handler, argv, media);
  });
}

// figure out what action to perform
function processAction(args){
	var filtered = args.filter(function(arg){ 
		return !!(handler[arg.toLowerCase()]);
	});
	if(filtered.length === 0) {
		log(chalk.red('No action specified, valid values are: ' + 
			actions.join(', ')));
    process.exit(1);
	} 
	if(filtered.length > 1) {
		log(chalk.red('Too many actions specified: ' + 
			filtered.join(', ') + '. One at a time please!'));
    process.exit(1);
	}
	return filtered[0];
}

// any extra bits that are not actions or flags are assumed to be media arguments.
function processMedia(args){
	return args.filter(function(arg){
		return (handler[arg.toLowerCase()]) === false;
	});
}

function formatError(e) {
  if (!e.err) { return e.message; }
  if (e.err.message) { return e.err.message; }
  return JSON.stringify(e.err);
}

// wire up logging events
function logEvents(handler) {
  handler.on('action_info', function (e) {
    if(!traceFlag) { return; }
    log("'" + chalk.cyan(e.action) + "'", chalk.red(e.msg));
  });

  handler.on('action_start', function (e) {
    log('Starting', "'" + chalk.cyan(e.action) + "'...");
  });

  handler.on('action_stop', function (e) {
    var time = prettyTime(e.hrDuration);
    log('Finished', "'" + chalk.cyan(e.action) + "'", 'after', chalk.magenta(time));
  });

  handler.on('action_err', function (e) {
    var msg = e.msg || formatError(e);
    var time = prettyTime(e.hrDuration) || 0;
    log("'" + chalk.cyan(e.action) + "'", 'errored after', chalk.magenta(time), chalk.red(msg));
    process.exit(1);
  });

  handler.on('action_warn', function (e) {
    log("'" + chalk.cyan(e.action) + "'", chalk.yellow(e.msg));
  });
}
