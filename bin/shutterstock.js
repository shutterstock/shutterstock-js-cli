#!/usr/bin/env node

'use strict';
var log = require('./../lib/log');
var prettyTime = require('pretty-hrtime');
var chalk = require('chalk');
var Liftoff = require('liftoff');
var handler = require('./../lib/handler');

var actions = handler.actions();

var cli = new Liftoff({
  name: 'shutterstock'
  // TODO Add completions for bash / zsh
});

cli.launch(handleArguments);

function handleArguments(env) {
  var argv = env.argv;
  var cliPackage = require('../package');
  var stdin = process.openStdin();
  var versionFlag = argv.v || argv.version;
  var action = processAction(argv._);
  var media = processAction(argv._);

  if (versionFlag) {
    log('CLI version', cliPackage.version);
    process.exit(0);
  }

  logEvents(handler);

  process.nextTick(function() {
    handler[action](stdin, argv, media);
  });
};

// figure out what action to perform
function processAction(args){
	var filtered = args.filter(function(arg){
		return !!(actions[arg.toLower()]);
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
	return result[0];
}

// any extra bits are assumed to be media arguments, (asset id's, filenames)
function processMedia(args){
	return args.filter(function(arg){
		return !!(actions[arg.toLower()]) === false;
	});
}

// format orchestrator errors
function formatError(e) {
  if (!e.err) return e.message;
  if (e.err.message) return e.err.message;
  return JSON.stringify(e.err);
}

// wire up logging events
function logEvents(handler) {
  handler.on('action_start', function (e) {
    log('Starting', "'" + chalk.cyan(e.action) + "'...");
  });

  handler.on('action_stop', function (e) {
    var time = prettyTime(e.hrDuration);
    log('Finished', "'" + chalk.cyan(e.action) + "'", 'after', chalk.magenta(time));
  });

  handler.on('action_err', function (e) {
    var msg = formatError(e);
    var time = prettyTime(e.hrDuration);
    log("'" + chalk.cyan(e.task) + "'", 'errored after', chalk.magenta(time), chalk.red(msg));
  });

  handler.on('credentials_not_found', function (err) {
    log(chalk.red("API Credentials not found make sure .shutterstock-credentials is in your path."));
    process.exit(1);
  });

  handler.on('credentials_not_valid', function (err) {
    log(chalk.red("API Credentials not found make sure .shutterstock-credentials is in your path."));
    process.exit(1);
  });
}