// CLASSFETCHER
// Nikola B.

// Using Renemari Padillo's Discord Bot template

var Discord = require("discord.io");
var logger = require("winston");
var auth = require("./auth.json");

var http = require("http");
var https = require("https");

const CourseDetails = require("./class-object.js");
const DiningMenu = require("./menu-object.js");
const DiningMenuManager = require("./menu-manager-object.js");

// CLASSFETCHER CONSTANTS BELOW
var CATALOG_URL_BASE = "https://catalog.umbc.edu/"
var SEARCH_URL 	     = "https://catalog.umbc.edu/search_advanced.php?cur_cat_oid=18&search_database=Search&search_db=Search&cpage=1&ecpage=1&ppage=1&spage=1&tpage=1&location=33&filter[keyword]="
	// suffix the filter keyword to the end of this URL
	// no other suffixes required
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

// Initialize global variables
var diningMenuManagerInstance = new DiningMenuManager();

logger.info("Starting...");

bot.on("ready", function (evt) {
	logger.info("Connected");
	logger.info("Logged in as: ");
	logger.info(bot.username + " - (" + bot.id + ")");
});

function respondClassCmd (bot, args, channelID) {
	console.log("\nGot !class command with " + args.length + " arguments.");
	/*bot.sendMessage({
		to: channelID,
		message: "Warning: The class search function is experiencing difficulties and may not work at this time."
	});*/
	if (args.length === 0) {
		var msg = "**!class**";
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
	if (args.length === 2 && /^[A-Za-z]+$/.test(args[0]) && /^\d+$/.test(args[1])) {
		console.log("Regex test found class ID argument separated in half by a space.");
		console.log("Condensing both into one argument.");
		bot.sendMessage({
			to: channelID,
			message: "Caution: This command accepts a single-word argument. Your argument has been condensed into \"" + args[0] + args[1] + "\". Searching now..."
		});
		var reqUrl = SEARCH_URL + args[0] + args[1];
	} else {
		var reqUrl = SEARCH_URL + args[0];
	}
	console.log("\nRequesting search results...");
	console.log(reqUrl);
	var req = https.request(reqUrl, (res) => {
		console.log("Recieved search results!");
		console.log(`STATUS: ${res.statusCode}`);
		console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
		res.setEncoding('utf8');
		res.validDataCounter = 0;
		res.on('data', (chunk) => {
			console.log("Got data");
			// Does this chunk have the course match?
			const CATALOG_MATCH_INDICATOR = "preview_course_nopop";
			const BAD_RESULTS_RED_FLAG = "coid=\""; // this indicates a blank COID, meaning empty search results!
			if (chunk.indexOf(CATALOG_MATCH_INDICATOR) !== -1) {
				console.log("Got chunk containing '" + CATALOG_MATCH_INDICATOR + "'");
				if (chunk.indexOf(BAD_RESULTS_RED_FLAG) !== -1) {
					console.log("This chunk also contains '" + BAD_RESULTS_RED_FLAG + "'");
					console.log("These search results are empty and therefore invalid.");
					return;
				}
				res.validDataCounter += 1;
				chunkLines = chunk.split("\n");
				for (var i in chunkLines) {
					var line = chunkLines[i];
					var matchIndicatorIndex = line.indexOf(CATALOG_MATCH_INDICATOR);
					if (matchIndicatorIndex !== -1) {
						console.log("Processing line...");
						line = line.substring(matchIndicatorIndex); // chop off beginning
						line = line.substring(0, line.indexOf('"')); // get line until double quote
						// now line is something like = preview_course_nopop.php?catoid=18&coid=53775
						console.log(line);
						var courseObj = new CourseDetails(args[0], CATALOG_URL_BASE + line, bot, channelID);
						courseObj.getDetailedCourseData();
					}
				}
				//console.log(`BODY: ${chunk}`);
			}
		});
		res.on('end', () => {
			console.log("No more data in response.");
			if (res.validDataCounter == 0) {
				console.log("No chunks contained a match. Assuming failed search.");
				var msg = "No classes found. "
				if (Math.random() > 0.25) {
					msg += "Please re-check your search parameters.";
				} else {
					msg += "Please re-check your search parameters, 4head.";
					console.log("Deploying intermediate insult.");
				}
				msg += "\nThis command has the syntax `!class [CLASS ID]`";
				msg += "\nExample: `!class cmsc202`";
				bot.sendMessage({
					to: channelID,
					message: msg
				});
			}
		});
	});
	req.end();
}

function respondMenuCmd (bot, args, channelID) {
	diningMenuManagerInstance.handleUserCommand(args, bot, channelID);
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
            // !class
			case "class":
				respondClassCmd(bot, args, channelID);
				break;
			// !dhall
			case "dhall":
				respondMenuCmd(bot, args, channelID);
				break;
			// !tts
			case "tts":
				respondTtsCmd(bot, args, channelID);
				break;
		}
	}
});

