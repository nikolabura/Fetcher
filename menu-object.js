// this is the object which represents a complete daily menu for one dining location

const https = require("https");

class DiningMenu {
	
	constructor(menuDateArg) {
		this.menuDate = menuDateArg;
		this.httpResponse = "";
		this.menuJson = {};
	}
	
	fetchMenuFromInternet (discordBot, channelID, callback) {
		console.log("\nRequesting menu JSON...");
		const completeUrl = "https://api.dineoncampus.com/v1/location/menu?site_id=5751fd3690975b60e04893e2&platform=0&location_id=5873e39e3191a200fa4e8399&date=" + this.menuDate;
		var req = https.request(completeUrl, (res) => {
			console.log("Recieved details!");
			console.log(`STATUS: ${res.statusCode}`);
			console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
			res.setEncoding('utf8');
			res.on('data', (chunk) => {
				console.log("Got details chunk.");
				this.httpResponse += chunk;
			});
			res.on('end', () => {
				if (res.statusCode != 200) {
					console.log("RECIEVED BAD HTTP STATUS CODE, CANCELLING THIS DETAILS PAGE SEQUENCE.");
					var chatMessage = "Recieved bad HTTP status code from Dine On Campus API. Status code was ";
					chatMessage += res.statusCode + ".\nRequest URL was `" + completeUrl + "`";
					discordBot.sendMessage({
						to: channelID,
						message: chatMessage
					});
					return;
				}
				console.log("No more data in details.");
				this.menuJson = JSON.parse(this.httpResponse);
				callback();
			});
		});
		req.end();
	}
	
	sendMessageAsChunks (chatMessage, discordBot, channelID) {
		const SIZE_LIMIT = 2000;
		
		var chatMessageSplit = chatMessage.split("\n");
		var messageList = [];
		var buffer = "";
		
		for (var i in chatMessageSplit) {
			if ((buffer.length + chatMessageSplit[i].length) >= SIZE_LIMIT) {
				messageList.push(buffer);
				buffer = "";
			}
			buffer += chatMessageSplit[i];
			buffer += "\n";
			console.log(buffer.length);
		}
		messageList.push(buffer); // put the last message into the list
		
		for (var i in messageList) {
			discordBot.sendMessage({
				to: channelID,
				message: messageList[i]
			}, function (err, resp) {
				if (err != null) {
					console.log(err);
					console.log(resp);
				}
			});
		}
		
		console.log("Message chunks required: " + messageList.length);
	}
	
	printResults (targetPeriod, discordBot, channelID) {
		targetPeriod = targetPeriod.toLowerCase();
		if (targetPeriod == "latenight") { targetPeriod = "late night"; }
		else if (targetPeriod == "everyday") { targetPeriod = "every day"; }
		
		var chatMessage = "__Got menu for " + targetPeriod.toUpperCase() + " on date " + this.menuDate + "...__";
		
		try {
			var periods = this.menuJson.menu.periods;
		} catch (error) {
			console.log("Got error while processing JSON menu object.");
			var errorMessage = "Encountered error during processing of JSON menu object for date " + this.menuDate + ".";
			if (this.menuJson["msg"] != null) {
				errorMessage += "\nAPI endpoint reported error message: `" + this.menuJson["msg"] + "`.";
				if (this.menuJson["msg"] == "No menu")
					errorMessage += "\nPossible cause: Did you specify a valid date?"
			}
			discordBot.sendMessage({
				to: channelID,
				message: errorMessage
			});
			return;
		}
		
		var specificPeriodJson = {};
		for (var i in periods) {
			if (periods[i].name.toLowerCase() == targetPeriod) {
				specificPeriodJson = periods[i];
				break;
			}
		}
		
		var categories = specificPeriodJson.categories;
		var excludedCategories = ["BAKER'S CRUST (DELI)", "FRESH MARKET"];
		
		for (var i in categories) {
			console.log(categories[i].name);
			
			if (excludedCategories.includes(categories[i].name)) {
				console.log("This category is excluded.");
				break;
			}
			
			chatMessage += "\n**" + categories[i].name + ":**";
			var items = categories[i].items;
			
			for (var j in items) {
				
				items[j].name = items[j].name.trim();
				
				//console.log("'" + items[j].name + "'");
				chatMessage += " " + items[j].name;
				var nutrients = items[j].nutrients;
				
				if (categories[i].name == "SWEET TREATS" || categories[i].name == "SWEET TREAT'S") {
					for (var nut in nutrients) {
						if (nutrients[nut].name == "Sugar (g)") {
							if (nutrients[nut].value == "-") { break; }
							chatMessage += " *(" + nutrients[nut].value + "g Sugar)*";
						}
					}
				}
				
				if (j < items.length - 1) {
					chatMessage += ",";
				}
				
			}
		}
		
		this.sendMessageAsChunks(chatMessage, discordBot, channelID);
	}
	
}

module.exports = DiningMenu;
