// CLASSFETCHER
// Nikola B.

// Using Renemari Padillo's Discord Bot template

var Discord = require("discord.io");
var logger = require("winston");
var auth = require("./auth.json");

const http = require("http");
const https = require("https");
const redis = require("redis");

const CourseData = require("./class-improved.js");

const DiningMenu = require("./menu-object.js");
const DiningMenuManager = require("./menu-manager-object.js");

const DuelManager = require("./duel-manager.js");
const VirusManager = require("./virus-manager.js");

const MessageMover = require("./message-mover.js");

// CLASSFETCHER CONSTANTS BELOW
var CATALOG_URL_BASE = "https://catalog.umbc.edu/"
var SEARCH_URL 	     = "https://catalog.umbc.edu/search_advanced.php?cur_cat_oid=18&search_database=Search&search_db=Search&cpage=1&ecpage=1&ppage=1&spage=1&tpage=1&location=33&filter[keyword]="
	// suffix the filter keyword to the end of this URL
	// no other suffixes required
// OTHER CONSTANTS
var adminUserIDs = [
    "346053055470370818",
];
// END CONSTANTS

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
	colorize: true
});
logger.level = "info";

// Initialize Discord Bot
var bot = new Discord.Client({
	token: auth.token,
	autorun: true
});

// Initialize redis client
const redisClient = redis.createClient();
redisClient.on("error", function(error) {
      console.error(error);
});

// Initialize global variables
var diningMenuManagerInstance = new DiningMenuManager();
var duelManagerInstance = new DuelManager();
var virusManagerInstance = new VirusManager(bot, redisClient);

logger.info("Starting...");

bot.on("ready", function (evt) {
	logger.info("Connected");
	logger.info("Logged in as: ");
	logger.info(bot.username + " - (" + bot.id + ")");
});

function respondClassCmd (bot, args, channelID, detailType) {
	console.log("\nGot !class command with " + args.length + " arguments.");
	if (args.length === 0) {
		let msg = "**!class**";
		msg += "\nLooks up information about a class using its ID. Courses are looked up in the UMBC catalog.";
		msg += "\nThis command has the syntax `!class [CLASS ID]`";
		msg += "\nExamples: ```\n!class cmsc202\n!class ges110```";
		msg += "Note: This bot is experimental and will break. Sorry.";
		bot.sendMessage({
			to: channelID,
			message: msg
		});
		return;
	}
    let regexResult = args.join(" ").match(/([a-zA-Z]+)\s*(\d+[a-zA-Z]{0,9})\s*(.*)/);
    let deptName, classCode, extraArg;
    if (regexResult != null) {
        deptName = regexResult[1];
        classCode = regexResult[2];
        extraArg = regexResult[3];
    }
    if (regexResult == null || deptName == undefined || classCode == undefined) {
		let msg = "**Error!**";
		msg += "\nImproper argument to !class command. Syntax is `!class [CLASS ID]`.";
		msg += "\nExamples: ```\n!class cmsc202\n!class ges 110```";
		bot.sendMessage({
			to: channelID,
			message: msg
		});
		return;
    }
    CourseData.getCourseData(deptName, classCode, bot, channelID, detailType, extraArg);
}

function respondMenuCmd (bot, args, channelID) {
	diningMenuManagerInstance.handleUserCommand(args, bot, channelID);
}

function respondMovemessageCmd(bot, args, channelID, userID) {
	if (userID != "346053055470370818") {
		bot.sendMessage({
			to: channelID,
			message: "Command reserved for admins, please contact @nikola-B"
		});
		return;
	} else {
		MessageMover.handleUserCommand(args, bot, channelID);
	}
}

function respondHamburgerCmd(bot, args, channelID, userIDarg) {
	var userObj = {
		userID: userIDarg
	};
	bot.getUser(userObj, (ignoreVar, userVar) => {
		var message = `The great ${userVar.username} has been hamburgered!`;
		if (userVar.username == "Serebit") {
			message += "\n**UMBC and Fetcherbot, Inc. do not accept any liability for potential food allergies.**";
		}
		bot.sendMessage({
			to: channelID,
			message: message,
			embed: {
				"image": { "url": "https://cdn.discordapp.com/attachments/539992133126455326/619749261009092609/borger_borger_2.png" }
			}
		});
	});
}

function respondTtsCmd (bot, args, channelID) {
	var possibleMessages = [
		"Here comes another Chinese earthquake. Ebrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbr",
		"JOHN MADDEN JOHN MADDEN JOHN MADDEN JOHN MADDEN",
		"aeiou"
	];
	var chosenMessage = possibleMessages[Math.floor(Math.random() * possibleMessages.length)];
	bot.sendMessage({
		to: channelID,
		message: chosenMessage,
		tts: true
	});
}

bot.on("message", function (user, userID, channelID, message, evt) {
	// Our bot needs to know if it will execute a command
	// It will listen for messages that will start with `!`
	if (message.substring(0, 1) == "!") {
		var args = message.substring(1).split(" ");
		var cmd = args[0];
		
		args = args.splice(1);
		args = args.filter(arg => arg != "");
		console.log("User: " + user + ";" + userID);
		console.log(args);
		console.log("Said message: " + message + ";    Meaning: " + cmd);
		// :dead: command
		if (cmd.startsWith("<:dead:")) {
			cmd = ":dead:";
		}
		switch(cmd) {
			// !ping
			case "ping":
				bot.sendMessage({
					to: channelID,
					message: "Pong!"
				});
				break;
			// !help
			case "help":
				bot.sendMessage({
					to: channelID,
					message: "I fetch info about UMBC courses and dining."
					+ " Ask @nikolab for further info.\nCommands:\n!ping\n!help\n!class [CLASS]\n!dhall [PERIOD] [DATE (optional)]"
				});
				break;
			// !echo
			case "echo":
                if (adminUserIDs.includes(userID)) {
                    bot.sendMessage({ to: args[0], message: args.slice(1).join(" ") });
                }
				break;
			// !class
			case "class":
				respondClassCmd(bot, args, channelID, "normal");
				break;
			case "classl":
			case "classlo":
			case "classlon":
			case "classlong":
			case "classd":
			case "classde":
			case "classdet":
			case "classdeta":
			case "classdetai":
			case "classdetail":
			case "classdetails":
				respondClassCmd(bot, args, channelID, "details");
				break;
			case "sect":
			case "sects":
			case "section":
			case "sections":
				respondClassCmd(bot, args, channelID, "sections");
				break;
			// !dhall
			case "dhall":
				respondMenuCmd(bot, args, channelID);
				break;
			// !movemessage
			case "movemessage":
				respondMovemessageCmd(bot, args, channelID, userID);
				break;
			// !hamburger
			case "hamburger":
				respondHamburgerCmd(bot, args, channelID, userID);
				break;
			// !tts
			case "tts":
				respondTtsCmd(bot, args, channelID);
				break;
			// !:dead:
			case ":dead:":
                   // TODO UNCOMMENT
				//duelManagerInstance.handleStartingCommand(
					//args, userID, bot, channelID);
				break;
			// !acceptduel
			case "acceptduel":
				duelManagerInstance.handleAcceptDuelCommand(
					args, userID, bot, channelID);
				break;
			// !draw
			case "draw":
				duelManagerInstance.handleDrawCommand(
					args, userID, bot, channelID);
				break;
			// !testcommand
			case "testcommand":
				var serverID = bot.channels[channelID].guild_id;
				//console.log(bot.servers[serverID].roles);
				/*bot.removeFromRole({
					userID: userID,
					serverID: serverID,
					roleID: '679914346700472412'
				});*/
				break;
            // !infect
            case "infect":
                if (adminUserIDs.includes(userID)) {
                    virusManagerInstance.startInfection(args[0]);
                }
                break;
        }
	} else {
        // message is NOT a bot command
        // TODO UNCOMMENT
        //virusManagerInstance.getChatMessage(user, userID, channelID, message, evt);
    }
});

