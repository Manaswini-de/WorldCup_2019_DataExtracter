// npm init -y
// npm install minimist
// npm install axios
// npm install jsdom
// npm install excel4node
// npm install pdf-lib

// node cricinfoExtracter.js --excel=Worldcup.csv --dataFolder=data --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results

let minimist = require("minimist");
let axios = require("axios");
let jsdom = require("jsdom");
let excel = require("excel4node");
let pdf = require("pdf-lib");
let fs = require("fs");
let path = require("path");

let args = minimist(process.argv);

// download using axios
// extract information using jsdom
// manipulate data using array functions
// save in excel using excel4node
// create folders and prepare pdfs

let responsekapromise= axios.get(args.source);
responsekapromise.then(function(response){
    let html = response.data;

    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;

    let matches =[];
    matchinfoDivs = document.querySelectorAll("div.match-score-block");

    for(let i=0; i<matchinfoDivs.length; i++){
        let matchDiv = matchinfoDivs[i];
        let match={
            team1:"",
            team2:"",
            team1Score:"",
            team2Score:"",
            result: ""
        };

        let teams = matchDiv.querySelectorAll("div.name-detail > p.name");
        match.team1 = teams[0].textContent;
        match.team2= teams[1].textContent;

        let teamsScore = matchDiv.querySelectorAll("div.score-detail>span.score");
        if(teamsScore.length==2){
            match.team1Score = teamsScore[0].textContent;
            match.team2Score = teamsScore[1].textContent;
        }
        else if(teamsScore.length==1){
            match.team1Score = teamsScore[0].textContent;
            match.team2Score = "";
        }
        else{
            match.team1Score = "";
            match.team2Score = "";
        }

        let resultSpan = matchDiv.querySelector(".status-text>span");
        match.result = resultSpan.textContent;
  
        matches.push(match);
    }

    let teams=[];

    for(let i=0; i<matches.length; i++){
        putTeamInTeamsIfMissing(teams,matches[i]);
    }

    for(let i=0; i<matches.length; i++){
        putMatchInAppropriateTeam(teams,matches[i])
    }

    let teamsJson = JSON.stringify(teams);
    fs.writeFileSync("teams.json",teamsJson, "utf-8");

    createExcel(teams);
    createFolders(teams);
    
})

function createFolders(teams){

    if(!fs.existsSync(args.dataFolder)){
        fs.mkdirSync(args.dataFolder);
    }

    for(let i=0; i<teams.length; i++){
        let folderPath = path.join(args.dataFolder,teams[i].name);

        if(!fs.existsSync(args.dest)){
            fs.mkdirSync(folderPath);
        }

        for(let j=0; j<teams[i].matches.length; j++){
            let matchFileName = path.join(folderPath,teams[i].matches[j].Opponent + ".pdf");
            createScorecard(teams[i].name,teams[i].matches[j],matchFileName);
        }
    }   
}

function createScorecard(teamName, match,matchFileName){
    let team1 = teamName;
    let team2 = match.Opponent;
    let t1s = match.SelfScore;
    let t2s = match.OpponentScore;
    let result = match.Result;

    let bytesOfPDFTemplate = fs.readFileSync("Template.pdf");
    let pdfDocumentkaPromise = pdf.PDFDocument.load(bytesOfPDFTemplate);
    pdfDocumentkaPromise.then(function(pdfDoc){
        let page = pdfDoc.getPage(0);

        page.drawText(team1,{
            size: 15,
            x: 355,
            y: 648
        });
        page.drawText(team2,{
            size: 15,
            x: 355,
            y: 599
        });
        page.drawText(t1s,{
            size: 15,
            x: 355,
            y: 552
        });
        page.drawText(t2s,{
            size: 15,
            x: 355,
            y: 507
        });

        page.drawText(result,{
            size: 13,
            x: 339,
            y: 464
        });

        let finalPDFBytesKaPromise = pdfDoc.save();
        finalPDFBytesKaPromise.then(function(finalPDFbytes){
            fs.writeFileSync(matchFileName,finalPDFbytes);
        })

    })

}

function createExcel(teams){
    let wb = new excel.Workbook();

    for(let i=0; i<teams.length; i++){
        let sheet = wb.addWorksheet(teams[i].name);

        sheet.cell(1,1).string("Opponent");
        sheet.cell(1,2).string("Self Score");
        sheet.cell(1,3).string("Opponent Score");
        sheet.cell(1,4).string("Result");

        for(let j=0; j< teams[i].matches.length; j++){
            sheet.cell(2+j,1).string(teams[i].matches[j].Opponent);
            sheet.cell(2+j,2).string(teams[i].matches[j].SelfScore);
            sheet.cell(2+j,3).string(teams[i].matches[j].OpponentScore);
            sheet.cell(2+j,4).string(teams[i].matches[j].Result);
        }

    }
    wb.write(args.excel);
}

function putTeamInTeamsIfMissing(teams, match){
    let t1idx = -1;
    for(let i=0; i<teams.length; i++){
        if(teams[i].name==match.team1){
            t1idx = i;
            break;
        }
    }
    if(t1idx==-1){
        teams.push({
            name: match.team1,
            matches:[]
        })
    }

    let t2idx = -1;
    for(let i=0; i<teams.length; i++){
        if(teams[i].name==match.team2){
            t2idx = i;
            break;
        }
    }
    if(t2idx == -1){
        teams.push({
            name: match.team2,
            matches:[]
        })
    }
}

function putMatchInAppropriateTeam(teams,match){
    
    for(let i=0; i<teams.length; i++){
        if(teams[i].name == match.team1){
            teams[i].matches.push({
                Opponent: match.team2,
                SelfScore: match.team1Score,
                OpponentScore: match.team2Score,
                Result: match.result
            })
        }
    }

    for(let i=0; i<teams.length; i++){
        if(teams[i].name == match.team2){
            teams[i].matches.push({
                Opponent: match.team1,
                SelfScore: match.team2Score,
                OpponentScore: match.team1Score,
                Result: match.result
            })
        }
    }
}
 


