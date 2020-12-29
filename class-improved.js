/*
 * IMPROVED "COURSEDETAILS" OBJECT
 * Using the highpoint tool instead of course catalog
 */

const https = require("https");
const cheerio = require("cheerio");
const got = require("got");

//const table = require("text-table");
const { table } = require("table");

exports.getCourseData = (deptName, classCode, discordBot, channelID, detailType, extraArgs) => {
    deptName = deptName.toUpperCase();
    classCode = classCode.toUpperCase();
    const DEPT_COURSES_URL = `https://highpoint-prd.ps.umbc.edu/app/catalog/listCoursesBySubject/UMBC1/${deptName[0]}/${deptName}/UGRD`;
    
    console.log(DEPT_COURSES_URL);
    var req = https.request(DEPT_COURSES_URL, (res) => {
        console.log("Recieved dept courses results!");
        console.log(`STATUS: ${res.statusCode}`);
        //console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
        res.setEncoding('utf8');
        res.validDataCounter = 0;
        let reqData = "";
        res.on('data', (chunk) => {
            console.log("Got data.");
            reqData += chunk;
        });
        res.on('end', () => {
            console.log("End of dept courses response.");
            if (reqData.includes("no courses for the subject")) {
                let msg = "**Error!**";
                msg += "\nDepartment `" + deptName + "` does not exist.";
                discordBot.sendMessage({
                    to: channelID,
                    message: msg
                });
                return false;
            }
            if (reqData.includes("Invalid Input")) {
                let msg = "**Error!**";
                msg += "\nDepartment name `" + deptName + "` is not valid.";
                discordBot.sendMessage({
                    to: channelID,
                    message: msg
                });
                return false;
            }
            return gotDeptCoursesList(deptName, classCode, reqData, discordBot,
                    channelID, detailType, extraArgs);
        });
    });
    req.end();
};

function gotDeptCoursesList(deptName, classCode, body, discordBot, channelID, detailType, extraArgs) {
    //const classCodeInt = parseInt(classCode, 10);
    const courses = cheerio.load(body);
    let foundClassElem = false;
    let linksList = courses("a[href*='showCourse']").find(".section-body.strong");

    linksList.each(function(i, elem) {
        const thisCourse = courses(elem).text();
        const regexOut = thisCourse.match(/([a-zA-Z]+)\s*(\d+[a-zA-Z]{0,9})/);
        if (regexOut == null) return true;
        if (classCode == regexOut[2]) {
            // FOUND CLASS
            foundClassElem = elem;
            return false;
        }
    });

    if (foundClassElem == false) {
        console.log("Couldn't find " + deptName + classCode);
        let msg = "**Error!**";
        msg += "\nCould not find class `" + classCode + "` under department `" + deptName + "`.";
        discordBot.sendMessage({
            to: channelID,
            message: msg
        });
        return false;
    }

    // SIMPLE RESPONSE (JUST PRINT NAME)
    if (false) {
        let courseName = courses(foundClassElem).next().text();
        discordBot.sendMessage({
            to: channelID,
            message: deptName + " " + classCode + ": **" + courseName + "**"
        });
        return true;
    }

    // COMPLEX RESPONSE (GET DESCRIPTION)
    const DETAILS_LINK = courses(foundClassElem).parent().parent().attr("href");
    var req = https.request(DETAILS_LINK, (res) => {
        console.log("Recieved courses details results!");
        console.log(`STATUS: ${res.statusCode}`);
        res.setEncoding('utf8');
        let reqData = "";
        res.on('data', (chunk) => {
            console.log("Got data.");
            reqData += chunk;
        });
        res.on('end', () => {
            console.log("End of courses details response.");
            if (detailType == "details") {
                return gotCourseDetailsPagePrintDetails(deptName, classCode, reqData,
                        discordBot, channelID, DETAILS_LINK);
            } else if (detailType == "sections") {
                return gotCourseDetailsPagePrintSections(deptName, classCode, reqData,
                        discordBot, channelID, DETAILS_LINK, extraArgs);
            } else {
                return gotCourseDetailsPage(deptName, classCode, reqData,
                        discordBot, channelID, DETAILS_LINK);
            }
        });
    });
    req.end();
}

function gotCourseDetailsPage(deptName, classCode, body, discordBot, channelID, detailsUrl) {
    const $ = cheerio.load(body);
    console.log("Parsing course details...");

    const DESC_HOLDER = $("div:contains('Description')").next();
    const COURSE_TITLE = $(DESC_HOLDER.children()[0]).text();
    const COURSE_DESC = $(DESC_HOLDER.children()[1]).text();
    const UNITS_HOLDER = $("div.strong:contains('Units')").parent().next().children()[0];
    const UNITS_NUM = $(UNITS_HOLDER).text();

    if (false) {
        // NO EMBED
        let msg = deptName + " " + classCode + ": **" + COURSE_TITLE + "**";
        msg += "\nDescription: " + COURSE_DESC;
        discordBot.sendMessage({
            to: channelID,
            message: msg
        });
        return true;
    }

    // PRINT EMBED
    let fields = [
        { name: "Description",  value: COURSE_DESC, inline: true },
        { name: "Credits",      value: UNITS_NUM,   inline: true }
    ];
    if (!body.includes("View Sections")) {
        const WARNTEXT = "**No sections found.** This class may be no longer offered.";
        fields.push(
            { name: ":warning: Warning", value: WARNTEXT, inline: false }
        );
    }
    let embed = {
        title: deptName + " " + classCode + ": __" + COURSE_TITLE + "__",
        url: detailsUrl,
        color: 14181526,
        fields: fields,
    };
    if (Math.random() > 0.8) {
        embed.footer = {
            icon_url: "https://cdn.discordapp.com/icons/485299559694729216/"
                + "a_8b51acf2ca8b04755d8f65d1bb257afd.webp?size=128",
            text: "Tip: Use !classl for long/detailed output"
        };
    }
    /*embed.thumbnail = {
        url: "https://cdn.discordapp.com/icons/485299559694729216/"
            + "a_8b51acf2ca8b04755d8f65d1bb257afd.webp?size=128"
    };*/
    discordBot.sendMessage({
        to: channelID,
        message: "",
        embed: embed
    });
    return true;
}

function gotCourseDetailsPagePrintDetails(deptName, classCode, body, discordBot, channelID, detailsUrl) {
    const $ = cheerio.load(body);
    console.log("Parsing course details...");

    const DESC_HOLDER = $("div:contains('Description')").next();
    const COURSE_TITLE = $(DESC_HOLDER.children()[0]).text();
    const COURSE_DESC = $(DESC_HOLDER.children()[1]).text();
    const UNITS_HOLDER = $("div.strong:contains('Units')").parent().next().children()[0];
    const UNITS_NUM = $(UNITS_HOLDER).text();

    const ACADEMIC_GROUP = $($("div.strong:contains('Academic Group')")
            .parent().next().children()[0]).text();
    const ACADEMIC_ORG = $($("div.strong:contains('Academic Organization')")
            .parent().next().children()[0]).text();

    let enrollmentReqs = $($("div.strong:contains('Enrollment Requirements')")
            .parent().next().children()[0]).text();
    if (enrollmentReqs.length == 0) enrollmentReqs = "None";

    let classComponent = "";
    $("div.strong:contains('Component')").parent().next().children().each(function(i, elem) {
        classComponent += $(elem).text() + "\n";
    });
    if (classComponent.length == 0) classComponent = "N/A";

    // PRINT EMBED
    discordBot.sendMessage({
        to: channelID,
        message: "",
        embed: {
            title: deptName + " " + classCode + ": __" + COURSE_TITLE + "__",
            url: detailsUrl,
            color: 14181526,
            fields: [
                { name: "Description",      value: COURSE_DESC,     inline: false },
                { name: "Academic Group",   value: ACADEMIC_GROUP,  inline: true },
                { name: "Academic Org.",    value: ACADEMIC_ORG,    inline: true },
                { name: "Credits",          value: UNITS_NUM,       inline: true },
                { name: "Enrollment Requirements",
                    value: enrollmentReqs, inline: true },
                { name: "Component",
                    value: classComponent, inline: true }
            ]
        }
    });
    return true;
}

function determineSemester(extraArgs) {
    let userInput = String(extraArgs);
    userInput = userInput.toLowerCase();
    let uiArray = userInput.split(" ").filter(x => x); // remove empty post-split
    userInput = "";
    for (UI of uiArray) {
        if (UI=="spring" || UI=="winter" || UI=="fall" || UI=="summer") {
            userInput = UI;
        }
    }

    const CURMONTH = (new Date()).getMonth() + 1;
    const CURYEAR = (new Date()).getFullYear();

    if (userInput == "") {
        /*
         *  DEFAULT ASSUMED SEMESTER REQUESTS
         *  =================================
         *          defreq
         *  1 jan   SPRING  
         *  --- jan24-27
         *  2 feb   SPRING
         *  3 mar   SUMMER
         *  4 april SUMMER
         *  5 may   SUMMER
         *  --- may 21-26
         *  6 june  FALL
         *  7 july  FALL
         *  8 aug   FALL
         *  --- aug14-28
         *  9 sept  FALL
         *  10 oct  SPRING
         *  11 nov  SPRING
         *  12 dec  SPRING
         *  --- jan2
         */
        console.log("Current month: " + CURMONTH);
        switch(CURMONTH) {
        case 10:
        case 11:
        case 12:
        case 1:
        case 2:
            userInput = "spring"; break;
        case 3:
        case 4:
        case 5:
            userInput = "summer"; break;
        case 6:
        case 7:
        case 8:
        case 9:
            userInput = "fall"; break;
        }
        console.log("New target sem: " + userInput);
    }

    // determine target year
    let targetYear = CURYEAR;
    let targetSem = userInput;
    switch(CURMONTH) {
        case 1:
            // winter
            switch (targetSem) {
                case "spring":  targetYear = CURYEAR; break;
                case "summer":  targetYear = CURYEAR; break;
                case "fall":    targetYear = CURYEAR - 1; break;
                case "winter":  targetYear = CURYEAR; break;
            }
            break;
        case 2:
        case 3:
        case 4:
        case 5:
            // spring
            switch (targetSem) {
                case "spring":  targetYear = CURYEAR; break;
                case "summer":  targetYear = CURYEAR; break;
                case "fall":    targetYear = CURYEAR; break;
                case "winter":  targetYear = CURYEAR; break;
            }
            break;
        case 6:
        case 7:
        case 8:
            // summer
            switch (targetSem) {
                case "spring":  targetYear = CURYEAR; break;
                case "summer":  targetYear = CURYEAR; break;
                case "fall":    targetYear = CURYEAR; break;
                case "winter":  targetYear = CURYEAR + 1; break;
            }
            break;
        case 9:
        case 10:
        case 11:
        case 12:
            // fall
            switch (targetSem) {
                case "spring":  targetYear = CURYEAR + 1; break;
                case "summer":  targetYear = CURYEAR; break;
                case "fall":    targetYear = CURYEAR; break;
                case "winter":  targetYear = CURYEAR + 1; break;
            }
            break;
    }

    return targetSem[0].toUpperCase() + targetSem.slice(1) + " " + targetYear;
}

function gotCourseDetailsPagePrintSections(deptName, classCode, body,
        discordBot, channelID, detailsUrl, extraArgs) {
    const $ = cheerio.load(body);
    console.log("Parsing course details... [!SECTION]");
    
    const SEMESTER = determineSemester(extraArgs);
    if (SEMESTER == false) {
        let msg = "**Error!**";
        msg += "\nSemester `" + deptName + "` is not a valid semester name."
        msg += "\nSemester should be `spring`, `summer`, `winter`, `fall`, or leave it blank."
        discordBot.sendMessage({
            to: channelID,
            message: msg
        });
        return false;
    }

    const SECTIONS_URL = $("button:contains('View Sections')").parent().attr("href");
    console.log(SECTIONS_URL);
    if (SECTIONS_URL == undefined) {
        let msg = "**Error!**";
        msg += "\nCourse " + deptName + " " + classCode + " ";
        msg += "does not have any sections offered."
        discordBot.sendMessage({
            to: channelID,
            message: msg
        });
        return false;
    }

    var req = https.request(SECTIONS_URL, (res) => {
        console.log("Recieved course sections menu of semesters!");
        console.log(`STATUS: ${res.statusCode}`);
        res.setEncoding('utf8');
        let reqData = "";
        res.on('data', (chunk) => {
            reqData += chunk;
        });
        res.on('end', () => {
            const semsMenu = cheerio.load(reqData);
            const SEM_TEXT = semsMenu("div.strong:contains('" + SEMESTER + "')");
            const SEMESTER_URL = SEM_TEXT.parent().parent().attr("href");
            console.log(SEMESTER_URL);
            if (SEMESTER_URL == undefined) {
                let msg = "Course `" + deptName + " " + classCode + "` ";
                msg += "does not have any sections offered for semester **" + SEMESTER + "**.";
                discordBot.sendMessage({
                    to: channelID,
                    message: msg
                });
                return false;
            }
            var semReq = https.request(SEMESTER_URL, (res) => {
                console.log("Got sections in " + SEMESTER);
                res.setEncoding('utf8');
                let semData = "";
                res.on('data', (chunk) => { semData += chunk; });
                res.on('end', () => { 
                    gotSemesterSectionsPage(deptName, classCode, semData, discordBot,
                            channelID, SEMESTER, SEMESTER_URL, extraArgs);
                });
            });
            semReq.end();
        });
    });
    req.end();
}

async function getRateMyProfessor(profName) {
    const NAVAL = "N/A " + String.fromCodePoint(9898);

    if (profName == "Staff") return NAVAL;
    const INSTRUCTOR_SPLIT = profName.split(" ");
    if (INSTRUCTOR_SPLIT.length < 2) return NAVAL;

    let profQuery = 
        INSTRUCTOR_SPLIT[0] + "+" + INSTRUCTOR_SPLIT.slice(-1)[0];
    console.log("Querying RMP for '" + profQuery + "'");

    const RMP_URL = "https://solr-aws-elb-production.ratemyprofessors.com//solr"
        + "/rmp/select/?rows=20&wt=json&q=" + profQuery + "+AND+schoolid_s%3A1244";

    const respBody = await got(RMP_URL).json();
    const response = respBody["response"];
    if (response.numFound == 0) return NAVAL;
    if (response.numFound > 1) return "Mul " + String.fromCodePoint(9899);

    let numVal = response.docs[0].averageratingscore_rf;
    let val = String(numVal).padEnd(4);
    if (numVal > 3.33) val += String.fromCodePoint(128994);
    else if (numVal > 1.66) val += String.fromCodePoint(128993);
    else val += String.fromCodePoint(128308);
    return val;
}

function gotSemesterSectionsPage(deptName, classCode, body, discordBot,
        channelID, semester, sectionsUrl, extraArgs) {
    const $ = cheerio.load(body);
    console.log("Got sections page");

    // CHECK FOR RMP FLAG
    let rmpFlag = false;
    let uiArray = extraArgs.split(" ").filter(x => x); // remove empty post-split
    for (UI of uiArray) {
        if (UI == "rmp") { rmpFlag = true; break; }
    }
    let profMap = {};
    if (rmpFlag == true) {
        // FIND ALL PROF RATINGS
        $("div.section-body:contains('Instructor')").each(function(i, elem) {
            const INSTRUCTOR = $(elem).text().split(":")[1].trim();
            profMap[INSTRUCTOR] = "";
        });
        let profPromises = [];
        for (prof in profMap) {
            const PROM = new Promise((resolve, reject) => {
                const PROFKEY = String(prof);
                getRateMyProfessor(PROFKEY).then(result => {
                    profMap[PROFKEY] = result;
                    resolve(result);
                });
            });
            profPromises.push(PROM);
        }
        console.log("Waiting...");
        Promise.all(profPromises).then(() => {
            gotSemesterSectionsPagePostRmp(deptName, classCode, body, discordBot,
                channelID, semester, sectionsUrl, extraArgs, profMap);
        }).catch(error => console.log(error));
    } else {
        gotSemesterSectionsPagePostRmp(deptName, classCode, body, discordBot,
            channelID, semester, sectionsUrl, extraArgs, null);
    }
}

function gotSemesterSectionsPagePostRmp(deptName, classCode, body, discordBot,
        channelID, semester, sectionsUrl, extraArgs, rmpProfMap) {
    const $ = cheerio.load(body);

    const RMP_FLAG = rmpProfMap != null;

    // CHECK FOR TOPIC FIELD IN SECTIONS
    let topicFlag = false;
    let tableArr = [["ID", "PROF", "DAYS", "STATUS"]];
    const TOPIC_INDEX = 3;
    if (body.includes("Topic")) { 
        topicFlag = true;
        tableArr[0].splice(TOPIC_INDEX, 0, "TOPIC");
    }
    const RMP_INDEX = 2;
    if (RMP_FLAG) {
        tableArr[0][RMP_INDEX] = "RATING";
    }

    // MAIN LOOP
    $("#course-sections").children("a").each(function(i, elem) {
        // FOR EACH SECTION
        const SECT_TITLE = $(elem).find("div.section-body.strong").text().trim();
        const SECT_TITLE_SHORT = SECT_TITLE.substring(SECT_TITLE.indexOf(" ") + 1);
        const DAYS_PRESPLIT = $(elem).find("div.section-body:contains('Days')").first().text();
        const DAYS = DAYS_PRESPLIT.substring(DAYS_PRESPLIT.indexOf(":") + 2)
            .replace(" - ", "-");

        const INSTRUCTOR = $(elem).find("div.section-body:contains('Instructor')")
            .text().split(":")[1].trim();
        const INSTRUCTOR_SPLIT = INSTRUCTOR.split(" ");
        let instructorShort = INSTRUCTOR;
        if (INSTRUCTOR_SPLIT.length > 1) {
            instructorShort = 
                INSTRUCTOR_SPLIT[0][0] + ". " + INSTRUCTOR_SPLIT.slice(-1)[0];
        }

        let topic = "N/A";
        try {
            topic = $(elem).find("div.section-body:contains('Topic')")
                .text().split(":")[1].trim();
        } catch (e) {}

        let status = $(elem).find("div.section-body:contains('Status')")
            .text().split(":")[1].trim();
        if (status == "Open") status += " " + String.fromCodePoint(9989); // check
        else if (status == "Closed") status = "Shut " + String.fromCodePoint(10060); // cross
        else if (status == "Wait List") status = "Wait " + String.fromCodePoint(129000); // yellow box

        let newRow = [
            SECT_TITLE_SHORT, instructorShort, DAYS, status
        ];
        if (topicFlag) newRow.splice(TOPIC_INDEX, 0, topic);
        if (RMP_FLAG) newRow[RMP_INDEX] = rmpProfMap[INSTRUCTOR];
        tableArr.push(newRow);
    });

    // CREATE TABLE OUTPUT
    let tableConfig = {
        border: {
            topBody: ``, topJoin: ``, topLeft: ``, topRight: ``,
            bottomBody: ``, bottomJoin: ``, bottomLeft: ``, bottomRight: ``,
            bodyLeft: ``, bodyRight: ``, bodyJoin: ``, 
            joinBody: ``, joinLeft: ``, joinRight: ``, joinJoin: ``
        },
        drawHorizontalLine: () => false
    };
    let tableStr = table(tableArr, tableConfig);
    // truncate length
    if (tableStr.length > 1920)
        tableStr = tableStr.substring(0, 1920) + " ...";
    // remove space at beginning of each line
    tableStr = tableStr.split("\n")
        .map(str => str.length > 0 ? str.substr(1) : str)
        .join("\n");

    // MAKE OUTPUT AND SEND MESSAGE
    let msg = "**" + semester + "** sections for " + deptName + " " + classCode + ":";
    msg += "\n```\n";
    msg += tableStr;
    msg += "\n```";
    console.log("Done making table");
    discordBot.sendMessage({
        to: channelID,
        message: msg,
    }, function(e,r) {
        //console.log(e);
        //console.log(r);
        discordBot.sendMessage({
            to: channelID,
            message: "<" + sectionsUrl + ">"
        });
    });
}

