/*jslint node: true, vars: true, nomen: true */
'use strict';

var Events = require('events');
var xmpp = require('node-xmpp-client');
var util = require('util');

function HangoutsBot(username, password, host, onlineStatus) {
  Events.EventEmitter.call(this);

  var self = this;

  var connection = new xmpp.Client({
    jid : username,
    password : password,
    host : "talk.google.com",
    port : 5222,
    preferred : "PLAIN",
    reconnect : true
  });
  this.connection = connection;

  connection.on('online', function() {
    connection.send(new xmpp.Element('presence', {}).c('show').t('chat').up()
        .c('status').t(onlineStatus || 'Online'));

    var roster_elem = new xmpp.Element('iq', {
      'from' : self.connection.jid,
      'type' : 'get',
      'id' : 'google-roster'
    }).c('query', {
      'xmlns' : 'jabber:iq:roster',
      'xmlns:gr' : 'google:roster',
      'gr:ext' : '2'
    });

    connection.send(roster_elem);

    self.emit('online');
  });

  connection.on('stanza', function(stanza) {
    if (stanza.is('message') && (stanza.attrs.type !== 'error') &&
        (stanza.getChildText('body'))) {
      console.log("Message", util.inspect(stanza, {
        depth : null
      }));

      self.emit('message', stanza.attrs.from, stanza.getChildText('body'));
    }

    if (stanza.is('presence') && stanza.attrs.type === 'subscribe') {
      stanza.attrs.to = stanza.attrs.from;
      delete stanza.attrs.from;

      connection.send(stanza);
    }
  });

  connection.on('error', function(e) {
    console.error("Connection error", e);
    self.emit('error', e);
  });
}

util.inherits(HangoutsBot, Events.EventEmitter);

HangoutsBot.prototype.sendMessage = function(to, message) {
  var stanza = new xmpp.Element('message', {
    to : to,
    type : 'chat'
  });

  stanza.c('body').t(message);

  this.connection.send(stanza);
}

module.exports = HangoutsBot;
