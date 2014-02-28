'use strict';
var es = require('event-stream');
var ac = require('ansi-canvas');

var canvas = ac();
var Canvas = require('canvas');
var context = canvas.getContext('2d');
var request = require('request').defaults({ encoding: null });
var screenWidth = canvas.width;

var ACTION = 'view';
var handler, start;

module.exports = function(argv){
  handler = this;
  if(!this.initialized) { 
    return this.emit('action_err', { 
      action: ACTION, 
      msg: 'handler not initialized!' }); 
  }
  var help = argv.h || argv.help;
  var delay = argv.d || argv.delay || 1000;

  start = process.hrtime();
  
  var readStream = es.pipeline(
    process.openStdin(),
    //es.readArray(media),
    es.split(),                      
    normalizeStream());
  
  if(help){
    return showHelp();
  }

  // give time for the last image to fully flush
  readStream.on('close', function(){ 
    setTimeout(function(){
      process.exit(0);
    }, delay);
  }); 

  return readStream
    .pipe(canvasView(context, screenWidth, canvas, delay));
};

function showHelp(){
  console.log('Help for "' + ACTION + '"');
  console.log('usage: shutterstock view [--help] [--delay]');
}

// TODO refactor this post coderage
function canvasView(context, screenWidth, canvas, delay) {
  return es.through(function (data) {
      if(!this.paused) {
        var self = this;
        var url = data.url;
        var buff = data.buffer;
        var maxWidth = parseInt(process.argv[3], 10) || screenWidth;
        
        var showBuff = function(buff){
          var canvasImage = new Canvas.Image();
          canvasImage.src = buff; 
          var scaleW = canvasImage.width > width ? width / canvasImage.width : 1;
          var w = Math.floor(canvasImage.width * scaleW);
          var h = Math.floor(canvasImage.height * scaleW);
          var width = maxWidth;
          context.drawImage(canvasImage, 0, 0, w, h);
          self.emit('data', buff);
          // flush it to the console
          canvas.render();
          //
        };

        if(url){
          request.get(url, function (err, res, buff) {
            showBuff(buff);
          });
        }else if(buff){
          showBuff(buff);
        }
        self.pause(); // wait for effect...
        
        setTimeout(function(){
          self.resume();
        }, delay);
      }
    });
}

function normalizeStream(){
  return es.map(function (data, callback) { 
      try{
        // If we are passed a buffer wrap it and pass it along
        if(Buffer.isBuffer(data)){ return callback(null, { buffer: data }); }

        // if the data is url-ish then assume it is good and pass it
        if((/^(http|https):/).test(data)) {
          return callback(null, {url: data});
        }
        // if we get here, hope it is json and attempt to parse
        var obj = JSON.parse(data);
        if(obj.thumb_large && obj.thumb_large.url){
          return callback(null, {url: obj.thumb_large.url});
        }     
      }catch(e){
        handler.emit('action_warn', {action: ACTION, msg: 'invalid input ' + e });
      }
      // todo use something local for bad input
      callback(null, {url: 'http://s2.picdn.net/images/shutterstock_logo_rev7.png'});  
    });
}
