/*jslint node: true, vars: true, nomen: true, esversion: 6 */

const Xpl = require("xpl-api");
const commander = require('commander');
const HangoutsBot = require('./hangouts-bot');
const os = require('os');
const debug = require('debug')('xpl-xmpp');

commander.version(require("./package.json").version);

commander.option("--heapDump", "Enable heap dump (require heapdump)");
commander.option("--username <username>", "Xmpp username");
commander.option("--password <password>", "Xmpp password");
commander.option("--host <host>", "Xmpp host");
commander.option("--defaultTO <users>", "Default users");
commander.option("--onlineStatus <status>", "Online status");

Xpl.fillCommander(commander);

commander.command('*').description("Start processing XMPP").action( () => {
      console.log("Starting ...");

      var bot = new HangoutsBot(commander.username, commander.password,
          commander.host || "talk.google.com", commander.onlineStatus);

      if (!commander.xplSource) {
        var hostName = os.hostname();
        if (hostName.indexOf('.') > 0) {
          hostName = hostName.substring(0, hostName.indexOf('.'));
        }

        commander.xplSource = "xmpp." + hostName;
      }

      var xpl = new Xpl(commander);

      xpl.on("error", (error) => {
        console.error("XPL error", error);
      });

      xpl.bind((error) => {
        if (error) {
          console.log("Can not open xpl bridge ", error);
          process.exit(2);
          return;
        }

        console.log("Xpl bind succeed ");
        // xpl.sendXplTrig(body, callback);

        bot.on("online", () => {

          xpl.sendXplTrig({
            online : true
          }, "xmpp.basic");

        });

        bot.on("message", (from, message) => {
          debug("Receive XMPP", from, message);

          xpl.sendXplTrig({
            from : from,
            message : message
          }, "xmpp.basic");
        });

        xpl.on("xpl:xpl-cmnd", (message) => {
          debug("Receive XPL", message);

          if (message.bodyName !== "xmpp.post") {
            return;
          }

          var to = message.body.to;
          if (!to || to === '*') {
            to = commander.defaultTO;
          }
          if (!to) {
            return;
          }

          to.split(",").forEach((t) => {
            t = t.trim();

            bot.sendMessage(t, message.body.message);
          });
        });
      });
    });

commander.parse(process.argv);

if (commander.headDump) {
  var heapdump = require("heapdump");
  console.log("***** HEAPDUMP enabled **************");
}
