/**
 * @file Updates the subscription associated with a project
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise     = require('bluebird');
var util        = require('../../util').instance;
var inherits    = require('inherits');
var BaseCommand = require('../../command');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var project = self.getProject();
      project.writeSettings({ subscription: self.payload.subscription });
      resolve('Subscription updated successfully!');
    } catch(err) {
      reject(err);
    }
  });
};

exports.command = Command;
exports.addSubCommand = function(client) {
  client.program
    .command('update-subscription')
    .description('Updates project metadata subscription')
    .action(function(/* Args here */){
      var self = this;
      util.getPayload()
        .then(function(payload) {
          client.executeCommand({
            name: self._name,
            body: payload,
            editor: self.parent.editor
          });
        });
    });
};