/**
 * @file Creates a new lightning component/opens the new lightning component ui
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise           = require('bluebird');
var _                 = require('lodash');
var util              = require('../../util').instance;
var inherits          = require('inherits');
var BaseCommand       = require('../../command');
var EditorService     = require('../../editor');
var LightningService  = require('../../lightning');
var RefreshDelegate   = require('../../refresh');
var path              = require('path');
var MavensMateFile    = require('../../file').MavensMateFile;

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (self.isUICommand()) {
      var editorService = new EditorService(self.client, self.editor);
      editorService.launchUI('new-lightning-component', { pid: self.getProject().settings.id })
        .then(function() {
          resolve('Success');
        })
        .catch(function(error) {
          reject(error);
        });
    } else {
      var project = self.getProject();
      var lightningService = new LightningService(project);
      var apiName = self.payload.apiName;
      var newAuraFile;
      var newBundleId;
      return lightningService.createBundle(apiName, self.payload.description)
        .then(function(result) {
          newBundleId = result.id;
          var createPromises = [];
          createPromises.push(lightningService.createComponent(newBundleId));
          if (self.payload.createController) {
            createPromises.push(lightningService.createController(newBundleId));
          }
          if (self.payload.createHelper) {
            createPromises.push(lightningService.createHelper(newBundleId));
          }
          if (self.payload.createStyle) {
            createPromises.push(lightningService.createStyle(newBundleId));
          }
          if (self.payload.createDocumentation) {
            createPromises.push(lightningService.createDocumentation(newBundleId));
          }
          if (self.payload.createRenderer) {
            createPromises.push(lightningService.createRenderer(newBundleId));
          }
          return Promise.all(createPromises);
        })
        .then(function(result) {
          var failures = _.where(result, { 'success': false });
          if (failures.length > 0) {
            lightningService.deleteBundle(newBundleId)
              .then(function() {
                throw new Error(JSON.stringify(failures));
              });
          } else {
            newAuraFile = new MavensMateFile({ project: project, path: path.join(project.path, 'src', 'aura', apiName) });
            newAuraFile.writeToDiskSync();
            project.packageXml.subscribe(newAuraFile);
            return project.packageXml.writeFileSync();
          }
        })
        .then(function() {
          var refreshDelegate = new RefreshDelegate(project, [ newAuraFile.path ]);
          return refreshDelegate.execute();
        })
        .then(function() {
          return project.indexLightning();
        })
        .then(function() {
          resolve('Lightning component created successfully');
        })
        .catch(function(error) {
          reject(error);
        })
        .done();
    }
  });
};

exports.command = Command;
exports.addSubCommand = function(client) {
  client.program
    .command('new-lightning-component')
    .option('--ui', 'Launches the default UI for the selected command.')
    .description('Creates new lightning component')
    .action(function() {
      if (this.ui) {
        client.executeCommand({
          name: this._name,
          body: { args: { ui: true } },
          editor: this.parent.editor
        });
      } else {
        var self = this;
        util.getPayload()
          .then(function(payload) {
            client.executeCommand({
              name: self._name,
              body: payload,
              editor: self.parent.editor
            });
          });
      }
    });
};