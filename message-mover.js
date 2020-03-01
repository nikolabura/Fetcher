// for moving messages from one channel to another using webhooks
// MAKE SURE TO CONFIGURE THE WEBHOOK URL AND DESTINATION CHANNEL

var https = require("https");
var Discord = require("discord.io");
var auth = require("./auth.json");

class MessageMover {

	static handleUserCommand (args, discordBot, channelIDarg) {
		console.log("Got MOVE MESSAGE command!");
		MessageMover.getMessages(args, discordBot, channelIDarg, null, []);
		return;
	}

	static getMessages (args, discordBot, channelIDarg, beforeMessageID, messageAccumulator) {
		discordBot.getMessages({
			channelID: channelIDarg,
			before: beforeMessageID,
			limit: 50
		}, (nullvar, messages) => {
			console.log("Read in new batch of messages");
			if (messages.length == 0) {
				console.log("Reached end! Stopping recursion chain.");
				messageAccumulator.forEach((mes) => {
					console.log(mes.timestamp + "     " + mes.content);
					if (mes.author.username == "Fetcher") {
						console.log(mes);
					}
				});
				// POST MESSAGES TO NEW CHANNEL
				MessageMover.postMessages(messageAccumulator, args, discordBot, channelIDarg, function() {
					console.log("FINISHED POSTING MESSAGES!");
				});
				return;
			}
			var earliestMessage = messages[messages.length - 1].id;
			console.log(earliestMessage + " was earliest");
			console.log("Recursing");
			// RECURSIVE CALL
			MessageMover.getMessages(args, discordBot, channelIDarg, earliestMessage, messageAccumulator.concat(messages));
		});
	}

	static postMessages (messages, args, discordBot, channelID, callback) {
		// initialize
		const TIME_PER_MESSAGE = 2100;
		const BOT_ENDPOINT_USERNAME = "Fetcher (Message Merge Endpoint)"
		var rateLimitCounter = 0;
		var completeUrl = auth.testserv_endpoint;
		if (args[0] == "mainserv") {
			console.log("WARNING: POSTING INTO MAIN SERVER!");
			completeUrl = auth.mainserv_endpoint;
		}
		const options = {
			method: "POST",
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			}
		};
		// post start message
		var chanName = "#" + discordBot.channels[channelID]["name"];
		var contentStr = "**STARTING MESSAGE MERGE!**\nMoving " + messages.length + " messages from " + chanName
			+ " into this channel. This operation will take about "
			+ messages.length * (TIME_PER_MESSAGE / 1000) + " seconds to complete due to Discord rate limits. "
			+ "Note that bot commands (with exclamation points) will be filtered out, and reactions will not be transferred over."
			+ "\nThank you for your patience.";
		var postData = JSON.stringify({
			content: contentStr,
			username: BOT_ENDPOINT_USERNAME,
			avatar_url: "https://cdn.discordapp.com/avatars/552978858710663177/1f877859e8c57bd9ff827704779c8f86.webp",
		});
		var req = https.request(completeUrl, options, (res) => {
			res.setEncoding('utf8');
			res.on('data', (chunk) => {
				if (chunk.includes("rate")) {
					console.log("RATE LIMIT!");
					rateLimitCounter++;
				}
			});
		});
		req.write(postData);
		req.end();
		// begin posting main payload
		var intervalID = setInterval(function() {
			console.log("Remaining: " + messages.length);
			var message = messages.pop();
			if (message == null) {
				clearInterval(intervalID);
				// END IS HERE
				// post conclusion message
				setTimeout(function() {
					var contentStr = "**Message merge complete.**";
					if (rateLimitCounter > 0) {
						contentStr += "\nWARNING! Counted **" + rateLimitCounter + "** occurences of rate limiting. Messages were probably dropped.";
					} else {
						contentStr += "\nNo rate limiting was detected, all messages should have transferred fine.";
					}
					var postData = JSON.stringify({
						content: contentStr,
						username: "Fetcher (Message Merge Endpoint)",
						avatar_url: "https://cdn.discordapp.com/avatars/552978858710663177/1f877859e8c57bd9ff827704779c8f86.webp",
					});
					var req = https.request(completeUrl, options, (res) => {
						res.setEncoding('utf8');
						res.on('data', (chunk) => {
							if (chunk.includes("rate")) {
								console.log("RATE LIMITED THE RATE LIMIT MESSAGE!");
							}
						});
					});
					req.write(postData);
					req.end();
					callback();
				}, 2100); // 2.1 seconds later send conclusion
				return;
			}
			console.log("Message content: " + message.content);
			if (message["content"].includes("movemessage") || message["content"].startsWith("!")) {
				console.log("Recursion filtered message");
				return;
			}
			var postData = {
				content: message["content"],
				username: "[" + chanName + "] " + message.author.username,
				avatar_url: "https://cdn.discordapp.com/avatars/" +message.author.id+ "/" +message.author.avatar+ ".webp",
			};
			console.log(postData.avatar_url);
			if (message.attachments.length > 0) {
				message.attachments.forEach((attachment) => {
					postData.content += "\nAttachment: ";
					postData.content += attachment.url;
					postData.content += "\n";
				});
			}
			var postDataStr = JSON.stringify(postData);
			var req = https.request(completeUrl, options, (res) => {
				res.setEncoding('utf8');
				res.on('data', (chunk) => {
					if (chunk.includes("rate")) {
						console.log("RATE LIMIT!");
						rateLimitCounter++;
					}
				});
			});
			req.write(postDataStr);
			req.end();
		}, TIME_PER_MESSAGE);
	}

}

module.exports = MessageMover;
