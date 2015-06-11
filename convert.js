var fs = require('fs'),
    util = require('util'),
    moment = require('moment'),
    path = require('path'),
    program = require('commander'),
    _ = require('lodash');


//config part
var config = {
    maxLineLength: 60,
    debug: false
};

//tools part
var tools = {
    parseAssLineToObj: function(line) {
        var rx = new RegExp(/Dialogue:\s([^,]*),([^,]*),([^,]*),([^,]*),([^,]*),([^,]*),([^,]*),([^,]*),([^,]*),(.*)/);
        if (!rx.test(line)) { 
            console.warn('Erroneous line: ' + line);
        }
        var match = line.match(rx);
        var obj = {
            marked: match[1], 
            start: '0'+match[2].replace('.',','),
            end: '0'+match[3].replace('.',','), 
            startInt: parseInt(match[2].replace(/[^0-9]/g, '')), 
            endInt: parseInt(match[3].replace(/[^0-9]/g, '')), 
            style: match[4], 
            name: match[5], 
            marginL: match[6], 
            marginR: match[7], 
            marginV: match[8], 
            effect: match[9], 
            text: match[10].replace(/\\[nN]/g, '\n').replace(/\{\\[^}]+./g, '')
        };
        return obj;
    },
    splitLongLines: function(sourceLine) {
        var textLines = sourceLine.split('\n');
        var newText = ""
        textLines.forEach(function(textLine) {
            if (textLine.length > config.maxLineLength) {
                var midPos = textLine.length/2;
                var text1 = textLine.substr(0, midPos);
                var text2 = textLine.substr(midPos, textLine.length);
                var spacePos = text2.indexOf(' ');
                if (spacePos > 0) {
                    midPos = midPos + spacePos;
                    text1 = textLine.substr(0, midPos);
                    text2 = textLine.substr(midPos, textLine.length);
                }
                newText += _.trim(text1) + '\n' + _.trim(text2) + '\n';
            } else {
                newText += _.trim(textLine) + '\n';
            }
        });
        return newText;
    }
};

//main program part
program
   .version('1.0.1')
   .option('-f, --file [path]', 'Srouce file', '')
   .parse(process.argv);

if (program.file === '' || !fs.existsSync(program.file) || !_.endsWith(program.file, '.ass')) {
    console.error('No file specifed or ivalid');
    return -1;
} else {
    console.log('Processing: ' + program.file);
}

var content = fs.readFileSync(program.file).toString().split('\r\n');
var lines = _.filter(content, function(line) {return _.startsWith(line, 'Dialogue:')});
var outputFile =  path.join(path.dirname(program.file), path.basename(program.file, '.ass') + '.srt');

//parse ASS
var dialoges = _.map(lines, tools.parseAssLineToObj);

//recheck if we have overlay
var mergeCount = 0;
for(var i=1; i<dialoges.length; i++) {
    if (dialoges[i].startInt < dialoges[i-1].endInt) {
        if (config.debug) {
            console.warn(util.format('Got overlayed text!\n%s - %s : %s\n%s - %s : %s', 
                dialoges[i-1].start, dialoges[i-1].end, dialoges[i-1].text, 
                dialoges[i].start, dialoges[i].end, dialoges[i].text));
        }
        //merge subs data
        dialoges[i-1].end = dialoges[i].start;
        dialoges[i].text = dialoges[i-1].text + '\n' + dialoges[i].text;
        mergeCount++;
    }
}

if (mergeCount>0) {
    console.log('Line merged: ' + mergeCount);
}

var outContent = "";
for(var i=0; i<dialoges.length; i++) {
    var line = dialoges[i];
    outContent += util.format('%s\n%s --> %s\n%s\n\n', 
        i, line.start, line.end, 
        tools.splitLongLines(line.text));
}

console.log('Output: ' + outputFile);
fs.writeFileSync(outputFile, outContent);
console.log('Done!');