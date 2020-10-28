// runs the virus simulator

const printDebugEnabled = true;

function debugPrint(message) {
    if (printDebugEnabled) {
        console.log(message);
    }
}

class VirusManager {

	constructor(discordBot, redisClient) {
        // CONSTANTS
        //this.infectedRole = "692604934884950036";
        this.infectedRole = "688970236279652427";
        this.botIDs = [
            "552978858710663177", // fetcher
            "155149108183695360", // dyno
            "340319472357474304", // kitrobit
            "425833927517798420", // voltaire
        ];
        this.bot = discordBot;
        this.redis = redisClient;
        this.infectionThreshold = 5000; // in milliseconds
        this.infectionChance = 0.5; // out of 1
        // VARIABLES
        this.lastInfectedSendTime = {
            "channelID": 0
        };
        this.lastInfectedSendUser = {
            "channelID": 0
        };
        this.lastInfectionEventTime = 0;
        // INFECTION QUEUE
        this.infectionQueue = [];
        this.infectionQueueTime = 2100;
        setInterval(this.processQueue, this.infectionQueueTime, this);
	}

    getChatMessage(textUserName, userID, channelID, message, evt) {
        debugPrint("Message from: " + userID);
        if (this.botIDs.includes(userID)) {
            return; // ignore bots
        }
        var virman = this;
        this.redis.sismember("infectedusers", userID, function(err, reply) {
            debugPrint("Redis DB says: " + reply);
            var messageDate = Date.now();
            debugPrint("Time: " + messageDate);
            if (reply == "1") {
                // user is infected
                debugPrint("User is infected!");
                virman.lastInfectedSendTime[channelID] = messageDate;
                virman.lastInfectedSendUser[channelID] = userID;
            } else {
                // user is not infected yet...
                debugPrint("User is not yet infected...");
                var lastSendTime = virman.lastInfectedSendTime[channelID];
                if (messageDate - lastSendTime < virman.infectionThreshold) {
                    // user can be infected!
                    virman.exposeUser(textUserName, userID, channelID);
                }
            }
        });
    }

    exposeUser(textUserName, userID, channelID) {
        debugPrint("User " + textUserName + " has been exposed.");
        if (Math.random() < this.infectionChance) {
            // user will be infected
            var infecterID = this.lastInfectedSendUser[channelID];
            // infect immediately, or wait in queue?
            if (Date.now() - this.lastInfectionEventTime
                    < (this.infectionQueueTime * 2)) {
                // put into the queue to prevent ratelimiting troubles
                var argsArr = [];
                argsArr.push(userID);
                argsArr.push(infecterID);
                argsArr.push(channelID);
                this.infectionQueue.push(argsArr);
            } else {
                // just infect immediately
                this.infectUser(userID, infecterID, channelID);
            }
        } else {
            debugPrint("User got off on random chance...");
        }
    }

    infectUser(userID, infecterID, channelID) {
        // user will be infected
        debugPrint("Processing infection...");
        this.lastInfectionEventTime = Date.now();
        // assign the role
        var serverID = this.bot.channels[channelID].guild_id;
        this.bot.addToRole({
            userID: userID,
            serverID: serverID,
            roleID: this.infectedRole
        });
        // announce that it happened
        var chatMessage = `<@!${userID}>`;
        chatMessage += " was infected by "
            + `<@!${infecterID}>`
            + "! :mask:";
        this.bot.sendMessage({
            to: channelID,
            message: chatMessage
        });
        // redis add to set of infected users
        this.redis.sadd("infectedusers", userID);
    }

    processQueue(virman) {
        // anything to process?
        if (virman.infectionQueue.length <= 0) {
            return;
        }
        var dequeued = virman.infectionQueue.shift();
        if (dequeued == undefined) {
            return;
        }
        virman.infectUser(dequeued[0], dequeued[1], dequeued[2]);
    }

    startInfection(channelID) {
        // start a new arbitrary infection
        var virman = this;
        virman.bot.sendMessage({
            to: channelID,
            message: ":airplane_arriving:"
        }, function() {
            var countries = [
                "China", "Italy", "Spain", "Wuhan", "Washington State",
                "Germany", "France", "Switzerland"
            ];
            var countryChoice = countries[Math.floor(Math.random() * countries.length)]; 
            virman.bot.sendMessage({
                to: channelID,
                message: "A flight has just landed from " + countryChoice + "!"
            });
            virman.lastInfectedSendTime[channelID] = Date.now() + 2000;
            virman.lastInfectedSendUser[channelID] = virman.botIDs[0];
        });
    }

}

module.exports = VirusManager;
