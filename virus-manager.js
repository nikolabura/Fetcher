// runs the duels

const printDebugEnabled = true;

function debugPrint(message) {
    if (printDebugEnabled) {
        console.log(message);
    }
}

class VirusManager {

	constructor(discordBot, redisClient) {
        this.bot = discordBot;
        this.redis = redisClient;
	}

    getChatMessage(textUserName, userID, channelID, message, evt) {
        debugPrint("Message from: " + userID);
        var redisKey = `user:${userID}:infected`;
        this.redis.get(redisKey, function(err, reply) {
            debugPrint("Redis DB says: " + reply);
            debugPrint(Date.now());
            if (reply == "1") {
                debugPrint("NULL RESPONSE");
            }
        });
    }

}

module.exports = VirusManager;
