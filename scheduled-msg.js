// For parsing the ./scheduled-message.txt file using fs (in Node.js)
// Henry B.

// TODO:
// 1. Add interface to allow for editing messages via Discord commands
// 2. Add interface to stop and start specific messages instead of all or none
// 3. Add logging capabilities
// 4. Use database instead of .txt file - this will help with items 1 and 2
// 5. Announcement channel specified at message level
// 6. More verbose logs (ie. with userID)
// 7. Fix display option
// 8. MAJOR: FIX NODE-CRON JOBS PERSISTING AFTER SCRIPT ENDS.
// 	Current workaround - issue the !schedule halt command before ending this script
// 	If not, reboot the computer... or end the offending process
// 9. Make useage print better

const fs = require("fs");
const cron = require("node-cron");

const SOURCE = "./scheduled-messages.txt";

class ScheduledMessageManager {
	constructor(botID, announceChannelID, autostart) {
		this.messages = "";
		this.events = [];
		this.botID = botID;
		this.announceChannelID = announceChannelID;
		this.autostart = autostart;
	}

	populateSchedule() {
		this.messages = fs.readFileSync(SOURCE, "utf-8").split("\n");
		this.messages.forEach(msg => {
			if (msg != 0) {
				let timing = /.*(?=\|)/.exec(msg)[0].trim();
				let text = /(?<=\|).*/.exec(msg)[0].trim();
				console.log("Generating scheduled task: " + timing + ": " + text)

				const ev = cron.schedule(timing, () => {
					console.log("Sent msg with content " + text + " to channel " + this.anounceChannelID);
					this.botID.sendMessage({
						to: this.announceChannelID,
						message: text
					});
				}, {
					scheduled: false
				});
				this.events.push(ev);
			}
		});
		if (this.autostart) {
			console.log("Auto-started schedule")
			this.startSchedule(false);
		}
	}

	startSchedule(verbose, bot = 0, channelID = 0) {
		console.log("Starting all scheduled messages");
		this.events.forEach(ev => {
			ev.start();
		});
		if (verbose) {
			bot.sendMessage({
				to: channelID,
				message: "All events on the schedule started"
			});
		}
	}

	haltSchedule(verbose, bot = 0, channelID = 0) {
		console.log("Halting all scheduled messages");
		this.events.forEach(ev => {
			ev.stop();
		});
		if (verbose) {
			bot.sendMessage({
				to: channelID,
				message: "All events on the schedule halted"
			});
		}
	}

	displaySchedule(bot, channelID) {
		if (this.events.length == 0) {
			bot.sendMessage({
				to: channelID,
				message: "The schedule is empty"
			});
		} else {
			bot.sendMessage({
				to: channelID,
				message: this.events.join('\n')
			});
		}
	}

	addEvent(bot, channelID) {
		bot.sendMessage({
			to: channelID,
			message: "This feature is coming soon!"
		});
	}

	removeEvent(bot, channelID) {
		bot.sendMessage({
			to: channelID,
			message: "This feature is coming soon!"
		});
	}

	handleUserCommand(bot, args, channelID, userID) {
		switch(args[0]) {
			case "add":
			case "a":
				this.addEvent(bot, channelID);
				break;
			case "remove":
			case "rem":
			case "r":
				this.removeEvent(bot, channelID);
				break;
			case "start":
			case "s":
				this.startSchedule(true, bot, channelID);
				break;
			case "halt":
			case "stop":
			case "h":
				this.haltSchedule(true, bot, channelID);
				break;
			case "display":
			case "d":
				this.displaySchedule(bot, channelID);
				break;
			default:
				bot.sendMessage({
					to: channelID,
					message: "Unknown command. Usage: !schedule [add|remove|start|halt|display] options..."
				});
		}
	}
}

module.exports = ScheduledMessageManager;
