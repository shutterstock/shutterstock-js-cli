'use strict';

var Api = require('shutterstock-api');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Q = require('q');
var log = require('./../lib/log');

var actions = ['search', 'view']; //, 'download', 'lightbox', 'photo', 'video', 'licensed'];

function Handler(){
  this.initialized = false;
  EventEmitter.call(this);
}

util.inherits(Handler, EventEmitter);

// private
function registerActions(){
  actions.forEach(function(action){
    try{
      Handler.prototype[action] = require('./actions/' + action);
    }catch(e){
      log(e);
    }
  });
}

registerActions();

Handler.prototype.setup = function(credentials){
  this.api = new Api(credentials.apiuser, credentials.apikey, {logLevel: 'WARN'});
  this.initialized = true;
  return Q.fcall(this, registerActions);
};

Handler.prototype.actions = function(){
	return actions;
};

Handler.prototype.Handler = Handler;

var inst = new Handler();
module.exports = inst;
