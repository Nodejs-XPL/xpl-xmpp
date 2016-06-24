/*jslint node: true, vars: true, nomen: true, esversion: 6 */
'use strict';

const Events = require('events');
const xmpp = require('node-xmpp-client');
const util = require('util');
const debug = require('debug')('xpl-xmpp:bot');

class HangoutsBot extends Events {
  constructor(username, password, host, onlineStatus) {
    super();

    var connection = new xmpp.Client({
      jid : username,
      password : password,
      host : "talk.google.com",
      port : 5222,
      preferred : "PLAIN",
      reconnect : true
    });
    this.connection = connection;

    connection.on('online', () => {
      debug("Send online presence status");

      connection.send(new xmpp.Element('presence', {}).c('show').t('chat').up()
          .c('status').t(onlineStatus || 'Online'));

      var roster_elem = new xmpp.Element('iq', {
        'from' : this.connection.jid,
        'type' : 'get',
        'id' : 'google-roster'
      }).c('query', {
        'xmlns' : 'jabber:iq:roster',
        'xmlns:gr' : 'google:roster',
        'gr:ext' : '2'
      });

      connection.send(roster_elem);

      this.emit('online');
    });

    connection.on('stanza', (stanza) => {
      if (debug.enabled) {
        debug("Receive stanza=", util.inspect(stanza, {depth: null}));
      }

      if (stanza.is('message') && (stanza.attrs.type !== 'error') &&
          (stanza.getChildText('body'))) {

        this.emit('message', stanza.attrs.from, stanza.getChildText('body'));
      }

      if (stanza.is('presence') && stanza.attrs.type === 'subscribe') {
        stanza.attrs.to = stanza.attrs.from;
        delete stanza.attrs.from;

        connection.send(stanza);
      }
    });

    connection.on('error', (e) => {
      debug("Receive error=",e);

      console .error("Connection error", e);
      this.emit('error', e);
    });
  }

  sendMessage(to, message) {
    var stanza = new xmpp.Element('message', {
      to : to,
      type : 'chat'
    });

    var b = stanza.c('body');

    message.split('\n').forEach((l) => b.t(message));

    debug("Send message=",stanza);

    this.connection.send(stanza);
  }
}
module.exports = HangoutsBot;
