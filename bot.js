// CLASSFETCHER
// Nikola B.

// Using Renemari Padillo's Discord Bot template

const Discord = require("discord.io");
const logger = require("winston");
const redis = require("redis");
const fs = require("fs");

// Might be better to use .env here
const auth = require("./auth.json");

const CourseData = require("./class-improved.js");

const DiningMenu = require("./menu-object.js");
const DiningMenuManager = require("./menu-manager-object.js");

const DuelManager = require("./duel-manager.js");
const VirusManager = require("./virus-manager.js");

const MessageMover = require("./message-mover.js");

const ScheduledMessageManager = require("./scheduled-msg.js");

// CLASSFETCHER CONSTANTS BELOW
const CATALOG_URL_BASE = "https://catalog.umbc.edu/"
const SEARCH_URL 	   = "https://catalog.umbc.edu/search_advanced.php?cur_cat_oid=18&search_database=Search&search_db=Search&cpage=1&ecpage=1&ppage=1&spage=1&tpage=1&location=33&filter[keyword]="
	// suffix the filter keyword to the end of this URL
	// no other suffixes required
// OTHER CONSTANTS
/* 
    idk if this should be const honestly. If we treat it as a global, it might be better to just stick it as a property in "Discord" (Discord.adminUserIDs)
    idk, up to you 
*/
const adminUserIDs = [
    "346053055470370818",
    "194974011631861760",
    "266608090487586837",
    "323482948147871746"
];
// END CONSTANTS

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
	colorize: true
});
logger.level = "info";

// Initialize Discord Bot
const bot = new Discord.Client({
	token: auth.token,
	autorun: true
});

// Initialize redis client
const redisClient = redis.createClient();
redisClient.on("error", console.error);

// Initialize global variables
const diningMenuManagerInstance = new DiningMenuManager();
const duelManagerInstance = new DuelManager();
const virusManagerInstance = new VirusManager(bot, redisClient);
const scheduledMessageManagerInstance = new ScheduledMessageManager(bot, "487095520473382922", true);

logger.info("Starting...");

bot.on("ready", () => {
	logger.info("Connected");
	logger.info("Logged in as: ");
	logger.info(bot.username + " - (" + bot.id + ")");

	// Load scheduled messages
	scheduledMessageManagerInstance.populateSchedule();
});

function respondClassCmd (bot, args, channelID, detailType) {
    console.log("\nGot !class command with " + args.length + " arguments.");
    
	if (args.length === 0) {
		let msg = `**!class**
		\nLooks up information about a class using its ID. Courses are looked up in the UMBC catalog.
		\nThis command has the syntax \`!class [CLASS ID]\`
		\nExamples: \`\`\`\n!class cmsc202\n!class ges110\`\`\`
        Note: This bot is experimental and will break. Sorry.`;
        
		bot.sendMessage({
			to: channelID,
			message: msg
        });
        
		return;
    }
 
    let sendClassErrorCmd = () => {
        let msg = `**Error!**
		\nImproper argument to !class command. Syntax is \`!class [CLASS ID]\`.
        \nExamples: \`\`\`\n!class cmsc202\n!class ges 110\`\`\``;
        
		bot.sendMessage({
			to: channelID,
			message: msg
		});
    }

    let regexResult = args.join(" ").match(/([a-zA-Z]+)\s*(\d+[a-zA-Z]{0,9})\s*(.*)/);
    if(regexResult)
    {
        let [deptName, classCode, extraArg] = regexResult;
        
        if(!(deptName && classCode))
        {
            sendClassErrorCmd();
            return;
        }

        CourseData.getCourseData(deptName, classCode, bot, channelID, detailType, extraArg);
    }
    else
        sendClassErrorCmd();
}

function respondMenuCmd (bot, args, channelID) {
	diningMenuManagerInstance.handleUserCommand(args, bot, channelID);
}

function respondMovemessageCmd(bot, args, channelID, userID) {
	if (adminUserIDs.includes(userID)) {
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
	bot.getUser({ userID: userIDarg }, (_, userVar) => {
		let message = `The great ${userVar.username} has been hamburgered!`;
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
	const possibleMessages = [
		"Here comes another Chinese earthquake. Ebrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbrbr",
		"JOHN MADDEN JOHN MADDEN JOHN MADDEN JOHN MADDEN",
		"aeiou"
    ];
    
	const chosenMessage = possibleMessages[Math.floor(Math.random() * possibleMessages.length)];
	bot.sendMessage({
		to: channelID,
		message: chosenMessage,
		tts: true
	});
}

function respondScheduleMsg (bot, args, channelID, userID) {
	scheduledMessageManagerInstance.handleUserCommand(bot, args, channelID, userID);
}

bot.on("message", function (user, userID, channelID, message, evt) {
	// Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    
    /* So, there's a lot of stuff that needs to be done here to make this safe. Checking for just a `!` isn't "good" enough. 
       For example, you could have a case where another bot will send a message starting with `!` and fetcher will run it, which probably isn't something 
       you would want. There's also an issue with permissions (i.e if a user doesn't have the SEND_MESSAGE permission in a channel but uses another bot to access that channel, 
       they can interact with fetcher. Oof). For this branch, I'm just not gonna worry about it because discord.io is ass and it's probably better if you switch to discord.js
       
       I'm just doing this to make the code look cleaner :3 
    */
	if (message.substring(0, 1) == "!") {
        const prefix = "!";

		let args = message.slice(prefix.length).trim().split(/ +/g);
		let cmd = args.shift();
		
		console.log("User: " + user + ";" + userID);
		console.log(args);
        console.log("Said message: " + message + ";    Meaning: " + cmd);
        
		// :dead: command
		if (cmd.startsWith("<:dead:"))
			cmd = ":dead:";
        
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

			// !schedule
			case "schedule":
				if (adminUserIDs.includes(userID)) {
					respondScheduleMsg(bot, args, channelID, userID);
				} else {
					bot.sendMessage({
						to: channelID,
						message: "You must have Administrator permissions to execute that command"
					});
				}
				break;

			// !testcommand
			case "testcommand":
				// var serverID = bot.channels[channelID].guild_id;
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

