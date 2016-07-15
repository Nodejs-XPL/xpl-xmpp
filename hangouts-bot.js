/*jslint node: true, vars: true, nomen: true, esversion: 6 */
'use strict';

const Events = require('events');
const xmpp = require('node-xmpp-client');
const util = require('util');
const debug = require('debug')('xpl-xmpp:bot');

/**
 * @author Olivier Oeuillot
 */
class HangoutsBot extends Events {
	/**
	 * Create a XMPP bot
	 *
	 * @param {string} username
	 * @param {string} password
	 * @param {string} [host]
	 * @param {number} [port]
	 * @param {string} [onlineStatus]
	 */
	constructor(username, password, host, port, onlineStatus) {
    super();

    var connection = new xmpp.Client({
      jid : username,
      password : password,
			host: host || "talk.google.com",
			port: port || 5222,
      preferred : "PLAIN",
      reconnect : true
    });
    this.connection = connection;

    connection.on('online', () => {
			debug("onOnline", "Send online presence status");

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
				return;
      }

      if (stanza.is('presence') && stanza.attrs.type === 'subscribe') {
				// Accept
        stanza.attrs.to = stanza.attrs.from;
        delete stanza.attrs.from;

        connection.send(stanza);
				return;
      }
    });

    connection.on('error', (e) => {
			debug("onError", "Receive error=", e);

      console .error("Connection error", e);
      this.emit('error', e);
    });
  }

	/**
	 * Send a message
	 *
	 * @param {string} to
	 * @param {string} message
	 */
  sendMessage(to, message) {
    var stanza = new xmpp.Element('message', {
      to : to,
      type : 'chat'
    });

    var b = stanza.c('body').t(message);

    debug("Send message=",stanza);

    this.connection.send(stanza);
  }

	/**
	 * Send a message
	 *
	 * @param {string} to
	 * @param {string} [type] - Type of composing
	 */
	sendComposing(to, type) {
		if (!type) {
			type = "composing";
		}
		var stanza = new xmpp.Element('message', {
			to: to,
			type: 'chat'
		});

		var b = stanza.c('cha:' + type).attr('xmlns:cha', 'http://jabber.org/protocol/chatstates');

		debug("Send message=", stanza);

		this.connection.send(stanza);
	}
}
module.exports = HangoutsBot;
