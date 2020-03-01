// runs the duels

class DuelManager {
	
	constructor() {
		// CONSTANTS
		//this.mutedRole = "679914346700472412";
		this.mutedRole = "678751042980151328";
		//this.deademoji = "<:dead:679892050614943767>";
		this.deademoji = "<:dead:647489983518736394>";
		this.fetcherID = "552978858710663177";
		this.dynoID = "155149108183695360";
		this.dynoChannel = "583793495446257674";
		this.dynoCommandsChannel = "595630236205580289";
		//this.dynoCommandsChannel = "583793495446257674";
		// State vars
		this.duelState = "none";
		// DUEL STATES:
		// "none"
		// "waiting_accept"
		// "doing_duel"
		// "drawing"
		// "cooldown"
		this.discordBot = null;
		this.duelStarter = "";
		this.duelOpponent = "";
		this.duelChannel = "";
		this.waitingForAcceptTimeout = null;
		this.drawMessageID = "";
	}

	handleStartingCommand (args, userID, discordBot, channelID) {
		this.discordBot = discordBot;
		this.duelChannel = channelID;
		if (args.length == 0) {
			discordBot.sendMessage({
				to: channelID,
				message: `Who do you want to ${this.deademoji}?`
			});
			return;
		} else if (args.length != 1) {
			discordBot.sendMessage({
				to: channelID,
				message: "Incorrectly formatted command."
			});
			return;
		}
		// check that user in args[0] exists
		// run regex to extract
		var opponentID = /<@!?(\d{6,})>/.exec(args[0]);
		console.log(opponentID);
		if (opponentID == null) {
			// not a user ping
			discordBot.sendMessage({
				to: channelID,
				message: "You need to ping a user!"
			});
			return;
		}
		// good to go, start the duel
		this.startTheDuel (userID, opponentID[1], discordBot, channelID);
		return;
	}

	startTheDuel (userID, opponentID, discordBot, channelID) {
		if (this.duelState != "none") {
			if (this.duelState == "cooldown") {
				discordBot.sendMessage({
					to: channelID,
					message: "A duel already happened very recently, let's cool it for a while, OK?"
				});
				return;
			}
			discordBot.sendMessage({
				to: channelID,
				message: "A duel is already in progress, cool it for a while, OK?"
			});
			return;
		}
		// dyno duel?
		if (opponentID == this.dynoID && channelID != this.dynoChannel) {
			discordBot.sendMessage({
				to: channelID,
				message: "Sheriff Dyno only duels in the town square, at #bot_commands"
			});
			return;
		}
		// continue to duel start
		var chatMes = `<@${userID}> has challenged`;
		chatMes += ` <@!${opponentID}> to a duel!`;
		chatMes += "\n";
		chatMes += `If you wish to accept, <@${opponentID}>, `;
		chatMes += "please reply with `!acceptduel` within 60 seconds.";
		discordBot.sendMessage({
			to: channelID,
			message: chatMes
		});
		this.duelState = "waiting_accept";
		this.duelStarter = userID;
		this.duelOpponent = opponentID;
		// if it's vs the bot then automatically accept
		if (opponentID == this.fetcherID) {
			setTimeout(function(duelManager) {
				discordBot.sendMessage({
					to: channelID,
					message: "!acceptduel"
				});
			}, 5500, this);
		}
		// dyno duel?
		if (opponentID == this.dynoID) {
			setTimeout(function(duelManager) {
				discordBot.sendMessage({
					to: duelManager.dynoCommandsChannel,
					message: "?dynoduel"
				});
			}, 7000, this);
		}
		// waiting for 60 seconds
		this.waitingForAcceptTimeout = setTimeout(function(duelManager) {
			var chatMes = `<@!${opponentID}> has not responded `;
			chatMes += "to the duel offer. How dishonorable.";
			discordBot.sendMessage({
				to: channelID,
				message: chatMes
			});
			// halt the duel
			duelManager.duelState = "none";
			duelManager.waitingForAcceptTimeout = null;
			duelManager.duelStarter = "";
			duelManager.duelOpponent = "";
		}, 60000, this);
		return;
	}

	handleAcceptDuelCommand (args, userID, discordBot, channelID) {
		console.log("DUEL STATE:" + this.duelState);
		if (this.duelState == "none" || this.duelState == "cooldown") {
			discordBot.sendMessage({
				to: channelID,
				message: "There is no duel currently being offered."
			});
		} else if (this.duelState == "waiting_accept") {
			// check if the channels match
			if (this.duelChannel != channelID) {
				discordBot.sendMessage({
					to: channelID,
					message: "There is no duel currently being offered in this channel."
				});
				return;
			}
			// check that user matches
			if (this.duelOpponent != userID) {
				discordBot.sendMessage({
					to: channelID,
					message: `<@${userID}>, you are not the requested duel opponent! Leave!`
				});
				return;
			}
			// halt the failed-to-accept-duel message
			if (this.waitingForAcceptTimeout != null) {
				clearTimeout(this.waitingForAcceptTimeout);
			}
			var chatMes = `<@${this.duelOpponent}> has agreed to `;
			chatMes += `duel with <@${this.duelStarter}>!`;
			if (this.duelOpponent == this.duelStarter) {
				chatMes += "\nUh..."
				chatMes += "\nYou OK? I have a hotline you can call, if you want.";
			}
			discordBot.sendMessage({
				to: channelID,
				message: chatMes
			});
			this.duelState = "doing_duel";
			// commence the duel
			this.commenceDuel();
		} else if (this.duelState == "doing_duel" || this.duelState == "drawing") {
			var mes = `<@!${userID}>, a duel is already in progress, go away.`;
			discordBot.sendMessage({
				to: channelID,
				message: mes
			});
		}
		return;
	}

	handleDrawCommand (args, userID, discordBot, channelID) {
		if (this.duelState != "drawing") {
			return;
		}
		var chatMes = "";
		if (userID != this.duelStarter && userID != this.duelOpponent) {
			// some random person
			console.log(userID + " bystander");
			chatMes = `<@!${userID}> draws their gun, but since they're not part of the duel, all they can do is watch!`;
		} else if (userID == this.fetcherID) {
			console.log(userID + " fetcher");
			chatMes = "**BANG!** :boom: THE BOT SUDDENLY DRAWS A GODDAMN 12-MEGATON PLASMA CANNON";
		} else {
			console.log(userID + " pewpew");
			chatMes = "**BANG!** :bangbang::boom:";
		}
		discordBot.sendMessage({
			to: channelID,
			message: chatMes
		}, function(err, resp) {
			console.log(err);
			console.log(resp);
		});
	}

	commenceDuel() {
		setTimeout(function(duelManager) {
			var chatMes = "The match is about to begin!\n";
			chatMes += "I will count down from 3 to 1, and then say **DRAW**.\n";
			chatMes += "After that point, you may use the command `!draw` to draw and fire.\n";
			chatMes += "Using the `!draw` command before I say DRAW will have __no effect__.\n";
			chatMes += "After ten seconds, the duel will be over.\n";
			chatMes += "Get ready.";
			duelManager.discordBot.sendMessage({
				to: duelManager.duelChannel,
				message: chatMes
			});
			// countdown
			// yes i know the nested timeouts are ugly :(
			setTimeout(function(duelManager) {
				duelManager.discordBot.sendMessage({
					to: duelManager.duelChannel,
					message: "3."
				});
			setTimeout(function(duelManager) {
				duelManager.discordBot.sendMessage({
					to: duelManager.duelChannel,
					message: "2."
				});
			setTimeout(function(duelManager) {
				duelManager.discordBot.sendMessage({
					to: duelManager.duelChannel,
					message: "1."
				});
			setTimeout(function(duelManager) {
				duelManager.discordBot.sendMessage({
					to: duelManager.duelChannel,
					message: "**DRAW!** :gun:"
				}, function(err, resp) {
					duelManager.drawMessageID = resp.id;
					// countdown finished
					duelManager.duelState = "drawing";
					duelManager.afterDrawActivated();
				});
				if (duelManager.duelOpponent == duelManager.dynoID) {
					console.log("SAYING DRAW");
					setTimeout(function(duelManager) {
						duelManager.discordBot.sendMessage({
							to: duelManager.dynoCommandsChannel,
							message: "?dynodraw"
						}, function(err, resp) {
							console.log("DYNODRAW: " + err);
						});
					}, 100, duelManager);
				}
			}, 1500, duelManager);
			}, 1500, duelManager);
			}, 1500, duelManager);
			}, 10000, duelManager);
		}, 5000, this);
	}

	afterDrawActivated() {
		// if bot is playing...
		if (this.duelOpponent == this.fetcherID) {
			setTimeout(function(duelManager) {
				duelManager.discordBot.sendMessage({
					to: duelManager.duelChannel,
					message: "!draw"
				});
			}, 400, this);
		}
		setTimeout(function(duelManager) {
			duelManager.duelState = "cooldown";
			duelManager.discordBot.getMessages({
				channelID: duelManager.duelChannel,
				after: duelManager.drawMessageID,
				limit: 60
			}, function(err, messages) {
				messages = messages.reverse();
				messages = messages.filter(message => message.content.startsWith("!draw"));
				messages = messages.filter(message =>
					(  message.author.id == duelManager.duelStarter
					|| message.author.id == duelManager.duelOpponent));
				// determine the winner by the first message
				// first, was there any winner?
				if (messages.length <= 0) {
					// nobody won
					var overMessage = "Nobody drew their weapon. The duel ends with a stalemate.";
					overMessage += "```\nA STRANGE GAME.\nTHE ONLY WINNING MOVE IS\nNOT TO PLAY.```";
					duelManager.discordBot.sendMessage({
						to: duelManager.duelChannel,
						message: overMessage
					});
					setTimeout(function(duelManager) {
						duelManager.discordBot.sendMessage({
							to: duelManager.duelChannel,
							message: "The duel is over. Have a good day."
						});
						duelManager.duelState = "none";
						// DUEL ENDS HERE
					}, 3000, duelManager);
					return;
				}
				var winnerID = messages[0].author.id;
				var chatMes = "And as the dust settles...\n";
				// if bot is playing...
				if (duelManager.duelOpponent == duelManager.fetcherID)
					winnerID = duelManager.fetcherID;
				chatMes += `The winner is <@!${winnerID}>! :medal:`;
				if (duelManager.duelOpponent == duelManager.fetcherID)
					chatMes += "\nHey, you just can't beat a robot. :robot:";
				duelManager.discordBot.sendMessage({
					to: duelManager.duelChannel,
					message: chatMes
				});
				// taunt the loser
				var loserID = "";
				if (winnerID == duelManager.duelStarter) {
					loserID = duelManager.duelOpponent;
				} else {
					loserID = duelManager.duelStarter;
				}
				setTimeout(function(duelManager) {
					duelManager.discordBot.sendMessage({
						to: duelManager.duelChannel,
						message: `Which means <@!${loserID}> is...`
					}, function(err, resp) {
						duelManager.discordBot.sendMessage({
							to: duelManager.duelChannel,
							message: `${duelManager.deademoji}   ${duelManager.deademoji}   ${duelManager.deademoji}`
						});
						// MUTE THE LOSER!!
						duelManager.muteLoser(loserID);
					});
				}, 3500, duelManager);
			});
		}, 10000, this);
	}

	muteLoser(loserID) {
		var serverID = this.discordBot.channels[this.duelChannel].guild_id;
		this.discordBot.addToRole({
			userID: loserID,
			serverID: serverID,
			roleID: this.mutedRole
		});
		setTimeout(function(duelManager) {
			duelManager.discordBot.sendMessage({
				to: duelManager.duelChannel,
				message: "The duel is over. Have a good day."
			});
		}, 3000, this);
		// set a timeout to unmute the original guy after seven minutes
		setTimeout(function(duelManager) {
			duelManager.discordBot.removeFromRole({
				userID: loserID,
				serverID: serverID,
				roleID: duelManager.mutedRole
			});
			duelManager.discordBot.sendMessage({
				to: duelManager.duelChannel,
				message: `<@${loserID}> has been unmuted.`
			});
			// reset duel state
			if (duelManager.duelState = "cooldown") {
				duelManager.duelState = "none";
			}
		}, (7 * 60 * 1000), this);
	}

}

module.exports = DuelManager;
