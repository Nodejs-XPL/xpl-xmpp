var Xpl = require("xpl-api");
var commander = require('commander');
var HangoutsBot = require('./hangouts-bot');
var os = require('os');

commander.version(require("./package.json").version);

commander.option("--heapDump", "Enable heap dump (require heapdump)");
commander.option("--username <username>", "Xmpp username");
commander.option("--password <password>", "Xmpp password");
commander.option("--host <host>", "Xmpp host");
commander.option("--defaultTO <users>", "Default users");

Xpl.fillCommander(commander);

commander.command('*').description("Start processing XMPP").action(
    function() {
      console.log("Start");

      var bot = new HangoutsBot(commander.username, commander.password,
          commander.host || "talk.google.com", dd);

      if (!commander.xplSource) {
        var hostName = os.hostname();
        if (hostName.indexOf('.') > 0) {
          hostName = hostName.substring(0, hostName.indexOf('.'));
        }

        commander.xplSource = "xmpp." + hostName;
      }

      var xpl = new Xpl(commander);

      xpl.on("error", function(error) {
        console.error("XPL error", error);
      });

      xpl.bind(function(error) {
        if (error) {
          console.log("Can not open xpl bridge ", error);
          process.exit(2);
          return;
        }

        console.log("Xpl bind succeed ");
        // xpl.sendXplTrig(body, callback);

        bot.on("message", from, message, function() {
          xpl.sendXplTrig({
            from : from,
            message : message
          }, "xmpp.received");
        });

        xpl.on("xpl:xmpp-cmnd", function(message) {
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

          to.split(",").forEach(function(t) {
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
