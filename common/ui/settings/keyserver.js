/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012-2015 Mailvelope GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

function KeyServer(mvelo, options) {
  this._mvelo = mvelo;
  this._options = options;
}

KeyServer.prototype.init = function() {
  // init jquery elements
  this._inputHkpUrl = $('#keyserverInputHkpUrl');
  this._saveBtn = $('#keyserverBtnSave');
  this._cancelBtn = $('#keyserverBtnCancel');
  this._alert = $('#keyserverAlert');

  // set event handlers
  this._saveBtn.click(this.save.bind(this));
  this._cancelBtn.click(this.cancel.bind(this));
  this._inputHkpUrl.on('input', this.onChangeHkpUrl.bind(this));

  // load preferences
  this.loadPrefs();
};

KeyServer.prototype.onChangeHkpUrl = function() {
  this.normalize();
  if (!this.validateUrl(this._inputHkpUrl.val())) {
    this._alert.showAlert(this._options.l10n.alert_header_warning, this._options.l10n.keyserver_url_warning, 'warning', true);
    return false;
  }

  this._saveBtn.prop('disabled', false);
  this._cancelBtn.prop('disabled', false);
};

KeyServer.prototype.save = function() {
  var self = this;
  var opt = self._options;
  var hkpBaseUrl = self._inputHkpUrl.val();

  return self.testUrl(hkpBaseUrl).then(function() {
    var update = {keyserver: {hkp_base_url: hkpBaseUrl}};
    self._mvelo.extension.sendMessage({event: 'set-prefs', data: update}, function() {
      self.normalize();
      opt.event.triggerHandler('hkp-url-update');
    });

  }).catch(function() {
    self._alert.showAlert(opt.l10n.alert_header_error, opt.l10n.keyserver_url_error, 'danger', true);
  });
};

KeyServer.prototype.cancel = function() {
  this.normalize();
  this.loadPrefs();
  return false;
};

KeyServer.prototype.validateUrl = function(url) {
  var urlPattern = /^(http|https):\/\/[\w-]+(?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?)*\.?$/;
  return urlPattern.test(url);
};

KeyServer.prototype.testUrl = function(url) {
  if (!this.validateUrl(url)) {
    return Promise.reject(new Error('Invalid url'));
  }

  return new Promise(function(resolve, reject) {
    url += '/pks/lookup?op=get&options=mr&search=0x11A1A9C84B18732F'; // test query info@eff.org
    $.get(url, function(data, statusText, xhr) {
      if (xhr.status === 200) {
        resolve();
      } else {
        reject(new Error('Server not reachable'));
      }
    }).fail(reject);
  });
};

KeyServer.prototype.normalize = function() {
  this._alert.empty();
  $('#keyserver .form-group button').prop('disabled', true);
  $('#keyserver .control-group').removeClass('error');
  $('#keyserver .help-inline').addClass('hide');
};

KeyServer.prototype.loadPrefs = function() {
  var self = this;
  return self._options.pgpModel('getPreferences').then(function(prefs) {
    self._inputHkpUrl.val(prefs.keyserver.hkp_base_url);
  });
};

//
// bootstraping
//

var mvelo = mvelo || null;
var options = options || null;

(function(mvelo, options) {
  if (!options) { return; }

  options.registerL10nMessages([
    'alert_header_warning',
    'alert_header_error',
    'keyserver_url_warning',
    'keyserver_url_error'
  ]);

  var keyserver = new KeyServer(mvelo, options);
  options.event.on('ready', keyserver.init.bind(keyserver));

}(mvelo, options));
