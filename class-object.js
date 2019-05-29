// this is the object which represents a class
// not literally a Class as in object oriented
//	well it is a class but
// 	you get the point

// it's a class class

const https = require("https");
const cheerio = require("cheerio");

class CourseDetails {
	
	constructor(name, detailsUrl, discordBot, channelID) {
		this.name = name;
		this.detailsUrl = detailsUrl;
		this.discordBot = discordBot;
		this.channelID = channelID;
		this.httpResponse = "";
	}
	
	getDetailedCourseData() {
		console.log("\nRequesting details page...");
		this.httpResponse = "";
		var req = https.request(this.detailsUrl, (res) => {
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
					return;
				}
				console.log("No more data in details.");
				console.log("Proceeding to parse details as HTML/DOM.");
				this.htmlDoc = cheerio.load(this.httpResponse);
				console.log("Parsing done.");
				console.log("Finally, printing details to user...");
				this.printDetails();
			});
		});
		req.end();
	}
	
	printDetails() {
		if (typeof (this.htmlDoc) === "undefined") {
			console.log("Member htmlDoc is undefined. Cancelling print.");
		}
		var title = this.htmlDoc("#course_preview_title");
		var parent = title.parent();
		console.log("Title: " + title.text());
		console.log("Credits: " + title["0"].next.data);
		
		var courseDesc = parent.text(); // start with everything
		courseDesc = courseDesc.substring(courseDesc.indexOf(")") + 1); // remove prefixed text
		courseDesc = courseDesc.substring(0, courseDesc.indexOf("Course ID")); // remove suffixed text
		console.log("Course Description: " + courseDesc);
		
		var strongChildren = parent.children("strong");
		console.log(strongChildren.length);
		
		var firstChildren = strongChildren.first().nextUntil("br");
		for (var i=0; i < firstChildren.length; i++) {
			console.log(firstChildren.get(i).name);
		}
		
		//console.log(this.htmlDoc("#course_preview_title").nextUntil(':contains("Course ID")').text());
		
		/*
		for (var i=0; i < strongChildren.length; i++) {
			console.log(i);
			var nextElement = strongChildren[i].next;
			if (nextElement.type == "text" && /\S/.test(nextElement.data)) { // NOTE: Short circuit evaluation
				console.log(nextElement.data);
			} else {
				var nextNext = nextElement.next;
				if (nextNext.type == "tag" && nextNext.name == "a") {
					console.log(nextNext.children[0].data);
				}
			}
		}*/
		//console.log(this.htmlDoc.getElementById("course_preview_title"));
		
		var chatMessage = "__Found class...__";
		chatMessage += "\n**Title: " + title.text() + "**";
		chatMessage += "\n**Credits:** " + title["0"].next.data;
		chatMessage += "\n**Course Description:** " + courseDesc;
		this.discordBot.sendMessage({
			to: this.channelID,
			message: chatMessage
		});
	}
	
}

module.exports = CourseDetails;