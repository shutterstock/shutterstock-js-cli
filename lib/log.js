'use strict';

var colors = require('chalk');
var date = require('dateformat');

module.exports = function(){
  var sig = '['+colors.green('Shutterstock')+']';
  var time = '['+colors.grey(date(new Date(), 'HH:MM:ss'))+']';
  var args = Array.prototype.slice.call(arguments);
  args.unshift(time);
  args.unshift(sig);
  console.log.apply(console, args);
  return this;
};