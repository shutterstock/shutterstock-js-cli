'use strict';

var inspector = require('eyes').inspector();
var es = require('event-stream')  ;

var ACTION = 'search';
var handler, start;

module.exports = function(argv){
  handler = this;
  if(!this.initialized) { 
    return this.emit('action_err', { 
      action: ACTION, 
      msg: 'handler not initialized!' }); 
  }
  var help = argv.h || argv.help;
  var terms = argv.t || argv.searchterm;
  var group = argv.g || argv.group || 'all';
  var safe = argv.safe || 0;
  var sort = argv.s || argv.sort || 'popular';
  var format = argv.f || argv.format || 'pretty';
  // TODO, parameterize full search options, update showHelp.

  start = process.hrtime();
  
  if(help){
    return showHelp();
  }

  if(!terms){
    this.emit('action_err', { 
      action: ACTION,
      hrDuration: process.hrtime(start),
      msg: '[--searchterm -t] argument required.' });
    return showHelp();
  }
  
  var readStream = this.api.streamSearchImages({
    searchterm: terms,
    search_group: group,
    safesearch: safe,
    sort_method: sort});

  return (/pretty/i).test(format) ? pretty(readStream) : thumbnail(readStream);
};

function showHelp(){
  console.log('Help for "' + ACTION + '"');
  console.log('usage: shutterstock search [--help] [--terms=<searchterms>]');
  console.log('        [--group=<photos|illustrations|vectors|all>] --safe=<safesearch>');
  console.log('        [--format=<pretty|thumbs>');
}

function thumbnail(readStream){
  return es.pipeline(
    readStream,
    es.map(function (data, callback) {
      console.log(data.thumb_large.url);
      callback(null, data.thumb_large.url);      
    }));
}

function pretty(readStream){
  handler.emit('action_start', { action: ACTION });
  try{
    readStream.pipe(
    es.map(function (data, callback) { 
      inspector(data);
      callback(null, data);
    }));
  }catch(e){
    this.emit('action_err', { 
      action: ACTION,
      hrDuration: process.hrtime(start),
      err: e
    }); 
  }
  readStream.on('end', function(){
    handler.emit('action_stop', { action: ACTION, hrDuration: process.hrtime(start) });
  });
}
