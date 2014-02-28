'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;

function Handler(){
  this.actions = ['search', 'download', 'lightbox', 'photo', 'video', 'view'];
  registerActions(this, this.actions);
}

util.inherits(Handler, EventEmitter);

Handler.prototype.actions = function(){
	return this.actions;
};

// private
function registerActions(handler, actions){
  try{
     handler.prototype[action] = require('./' + action);  
  }catch(e){
    handler.emit('action_err', 'Unable to register action:' + action);
  }
}

// let people use this class from our instance
Handler.prototype.Handler = Handler;

var inst = new Handler();
module.exports = inst;