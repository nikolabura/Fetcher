// holds and manages all dining menus for all locations

const DiningMenu = require("./menu-object.js");

class DiningMenuManager {
	
	constructor() {
		this.menus = [];
	}
	
	printPeriodMenuToChat (menuDate, mealPeriod, discordBot, channelID) {
		
		// see if we already have the menu for this date
		var selectedMenu = null;
		for (var i in this.menus) {
			if (this.menus[i].menuDate == menuDate) {
				console.log("We already have the menu for " + menuDate + " at index " + i + ".");
				selectedMenu = this.menus[i];
				break;
			}
		}
		
		if (selectedMenu == null) {
			// if we don't have it then request it
			console.log("Fetching new menu for " + menuDate + ".");
			discordBot.sendMessage({
				to: channelID,
				message: "Please wait, fetching and caching menu from Dine On Campus API. Future requests for this date will be faster."
			});
			var menu = new DiningMenu(menuDate);
			menu.fetchMenuFromInternet(discordBot, channelID, () => {
				this.menus.push(menu);
				try {
					menu.printResults(mealPeriod, discordBot, channelID);
				} catch (error) {
					console.log(error);
					discordBot.sendMessage({
						to: channelID,
						message: "Encoutered general error during result printing. See internal console output for details."
					});
				}
			});
		} else {
			// if we do already have it, then immediately display it
			selectedMenu.printResults(mealPeriod, discordBot, channelID);
		}
		
	}
	
	handleUserCommand (args, discordBot, channelID) {
		const validMealPeriods = ["breakfast", "lunch", "dinner", "latenight", "everyday"];
		const validDateStrings = ["today", "tomorrow", "yesterday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
		
		console.log("Got !dhall command with " + args.length + " arguments.");
		
		if (args.length <= 0) {
			var chatMessage = "**!dhall**";
			chatMessage += "\nLooks up what is on the dining hall menu for a specific date and meal period.";
			chatMessage += " Menus are looked up using the Dine On Campus API.";
			chatMessage += "\nThis command has the syntax `!dhall [MEAL PERIOD] [DATE (optional)]`";
			chatMessage += "\nIf not provided, the date will default to today, or tomorrow if the time is after 9PM.";
			chatMessage += "\nExamples: ```\n!dhall lunch\n!dhall lunch tomorrow\n!dhall lunch friday\n!dhall lunch 2019-3-15```";
			chatMessage += "Note: Food categories \"BAKER'S CRUST (DELI)\" and \"FRESH MARKET\" are excluded from output";
			chatMessage += " as they are lengthy and generally the same every day.";
			chatMessage += "\nNote: This bot is experimental and will break. Sorry.";
			discordBot.sendMessage({
				to: channelID,
				message: chatMessage
			});
			return;
		} else if (args.length > 2) {
			discordBot.sendMessage({
				to: channelID,
				message: ("Invalid number of arguments. This command accepts 1 or 2 arguments. You entered " + args.length + ".")
			});
			return;
		}
		
		// if control reached down here, then there are either one or two arguments
		// leave dateArg blank if 2nd argument is blank
		// then translate it to the real API-compatible date
		var dateArg = (args.length == 1) ? "" : args[1];
		var actualDateString = this.translateUserDateToActualDate(dateArg); // this returns null on failure
		
		var targetPeriod = args[0].toLowerCase();
		
		if (!validMealPeriods.includes(targetPeriod)) {
			var chatMessage = "Your specified meal period is not valid. The valid meal periods are:\n";
			for (var i in validMealPeriods) {
				chatMessage += validMealPeriods[i];
				if (i < validMealPeriods.length - 1) chatMessage += ", ";
			}
			discordBot.sendMessage({
				to: channelID,
				message: chatMessage
			});
			return;
		}
		
		if (actualDateString == null) {
			var chatMessage = "Your specified date is not valid. The valid date identifiers are:\n";
			for (var i in validDateStrings) {
				chatMessage += validDateStrings[i];
				if (i < validDateStrings.length - 1) chatMessage += ", ";
			}
			chatMessage += "\nAdditionally, you may specify a date in any format compatible with the Javascript/NodeJS `Date.parse()` function.";
			discordBot.sendMessage({
				to: channelID,
				message: chatMessage
			});
			return;
		}
		
		// COMMENT OUT THIS LINE TO DISABLE MENU FETCH, AND INSTEAD PERFORM ONLY ARGUMENT + DATE RESOLUTION
		this.printPeriodMenuToChat(actualDateString, targetPeriod, discordBot, channelID);
	}
	
	translateUserDateToActualDate(userDate) {
		var currentDate = new Date();
		userDate = userDate.toLowerCase();
		
		// no date supplied means default to today, or tomorrow if after CUTOFF_HOUR
		if (userDate == "") {
			const CUTOFF_HOUR = 21; // 9pm
			if (currentDate.getHours() < CUTOFF_HOUR) {
				userDate = "today";
			} else {
				userDate = "tomorrow";
			}
			console.log("Date was blank. Changed date string.");
		}
		
		// check if this is obviously a valid date
		var validDateRegex = /^\d{4}-\d{1,2}-\d{1,2}$/;
		var passedRegexTest = validDateRegex.test(userDate);
		
		var dateObj = null;
		
		// if it didn't pass regex, it's probably a special text date identifier
		if (!passedRegexTest) {
			console.log("Note: Did not pass regex test for date. String was: " + userDate);
			dateObj = new Date();
			switch (userDate) {
				case "today":
					dateObj.setDate(currentDate.getDate() + 0);
					break;
				case "tomorrow":
					dateObj.setDate(currentDate.getDate() + 1);
					break;
				case "yesterday":
					dateObj.setDate(currentDate.getDate() - 1);
					break;
				case "sunday":
					dateObj = this.getNextOccuringDayOfWeek(0);
					break;
				case "monday":
					dateObj = this.getNextOccuringDayOfWeek(1);
					break;
				case "tuesday":
					dateObj = this.getNextOccuringDayOfWeek(2);
					break;
				case "wednesday":
					dateObj = this.getNextOccuringDayOfWeek(3);
					break;
				case "thursday":
					dateObj = this.getNextOccuringDayOfWeek(4);
					break;
				case "friday":
					dateObj = this.getNextOccuringDayOfWeek(5);
					break;
				case "saturday":
					dateObj = this.getNextOccuringDayOfWeek(6);
					break;
				default:
					dateObj = null;
			}
		}
		
		// null because none of those special date words worked?
		// try and parse it using javascript. failure will return NaN
		var parsedRawDateFlag = false;
		if (dateObj == null) {
			console.log("Trying to parse date...");
			var attemptedParse = Date.parse(userDate);
			if (isNaN(attemptedParse)) {
				// must be a complete failure; exit this function
				console.log("Parse failed.");
				return null;
			} else {
				// success
				console.log("Parse succeeded with result: " + attemptedParse);
				parsedRawDateFlag = true;
				dateObj = new Date(attemptedParse);
			}
		}
		
		// if we reached down here, dateObj must contain a valid JS timestamp
		// turn it into the DineOnCampus API's preferred format
		var outputStr = (parsedRawDateFlag ? dateObj.getUTCFullYear() : dateObj.getFullYear()) + "-";
		outputStr += ((parsedRawDateFlag ? dateObj.getUTCMonth() : dateObj.getMonth()) + 1) + "-";
		outputStr += parsedRawDateFlag ? dateObj.getUTCDate() : dateObj.getDate();
		console.log("Finished determining date. Final date: \"" + outputStr + "\"");
		return outputStr;
	}
	
	getNextOccuringDayOfWeek(dayNumber) {
		var i = 0;
		var curDate = new Date();
		while (i < 10) {
			if (curDate.getDay() == dayNumber) {
				return curDate;
			}
			curDate.setDate(curDate.getDate() + 1);
			i++;
		}
		console.log("Failed to get next occuring Day of Week for day number " + dayNumber);
		return new Date();
	}
	
}

module.exports = DiningMenuManager;
