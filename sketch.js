/*
 * Ubiquitous Computing - Digital Futures, OCAD University
 * Kate Hartman / Nick Puckett
 * 
 * Uses a PubNub function to query the Wolfram Conversation API
 * 
 *  
 */


var databaseUrl = 'https://rawcdn.githack.com/astronexus/HYG-Database/800de966fb36661c7c03e2f1eab62fbab9bec345/hygdata_v3.csv';

var maxStars = 0;

//size of the active area
var cSizeX = 700;
var cSizeY = 700;

var stars = [];
var readDelay = 1;

var maxValues = {};
var minValues = {};

var spectralColorNames = {
    O: 'darkblue', 
    B: 'lightblue', 
    A: 'white', 
    F: 'lightyellow', 
    G: 'yellow', 
    K: 'orange', 
    M: 'red'
};

var spectralColors = {
    O: 'rgb(0, 0, 180)', 
    B: 'rgb(30, 30, 255)', 
    A: 'rgb(255, 255, 255)', 
    F: 'rgb(255, 255, 153)', 
    G: 'rgb(255, 255, 60)', 
    K: 'rgb(255, 165, 0)', 
    M: 'rgb(180, 0, 0)'
};

var header;

// new decoder with encoding = utf-8
var decoder = new TextDecoder("utf-8");

// id: 0, dist: 8, mag: 11, absmag: 12, ci: 14, 15: pos, 16: vel, 22: luinosity

function parseHeader(line) {
    header = line.split(',');
    maxValues = _.zipObject(header, _.times(header.length, _.constant(-10e15)));
    minValues = _.zipObject(header, _.times(header.length, _.constant(10e15)));
}

function tryParseNumber(val) {
    var n = parseFloat(val);
    if (isNaN(n)) {
        return val;
    }
    return n;
}

function addLines(newLines) {
    for (var i = 0; i < newLines.length-1; ++i) {
        var line = newLines[i];
        
        var values = line.split(',');
        var star = _.zipObject(header, values);
        star = _.mapValues(star, tryParseNumber);
        maxValues = _.mapValues(maxValues, (v, k) => isNaN(star[k]) ? v : Math.max(v, star[k]));
        minValues = _.mapValues(minValues, (v, k) => isNaN(star[k]) ? v : Math.min(v, star[k]));
        //if (values.map(v => v.toLowerCase()).includes('sun')) {
        if (star.bf || star.bayer) {
            //console.log(stars.length + '.', star, '(', star.bf, star.base, ')', line);
        }
        //console.log(star.spect);
        stars.push(star);
    }
    return newLines[newLines.length-1];
}

async function setup() 
{
    var cnv = createCanvas(cSizeX, cSizeY);
    cnv.parent('app');
    
    // Fetch the original image
    // https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams#Consuming_a_fetch_as_a_stream
    var response = await fetch(databaseUrl);
    var body = response.body;
    
    const reader = body.getReader();
    let charsReceived = 0;
    let lastLine = '';
    //let result = '';
    
    let started = false;
    
    // https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/getReader
    function processText({ done, value }) {
        // Result objects contain two properties:
        // done  - true if the stream has already given you all its data.
        // value - some data. Always undefined when done is true.
        
        
        if (!done) {
            charsReceived += value.length;
        }
        $('#status').text(charsReceived/1024 + 'kb');
        
        if (maxStars && stars.length > maxStars) {
            done = true;
        }
        if (done) {
          console.log("Stream complete:", charsReceived/1024, 'kb');
            
            onLoadFinished();
          return;
        }
        
        
        // value for fetch streams is a Uint8Array
        // decoder takes Uint8Array and converts it to string, according to it's encoding
        var text = decoder.decode(value);
        const lines = (lastLine + text).split('\n');
        
        if (!started) {
            parseHeader(lines[0]);
            started = true;
        }
    
        lastLine = addLines(lines);
        
        //drawStars();

        //let listItem = $(body).append('<li></li>');
        //listItem.textContent = 'Received ' + charsReceived + ' characters so far. Current chunk = ' + chunk;

        //result += chunk;

        // Read some more, and call this function again
        if (readDelay) {
            setTimeout(() => {
                return reader.read().then(processText);
            }, readDelay);
        }
        else {
            return reader.read().then(processText);
        }
    }

    reader.read().then(processText);
}

function onLoadFinished() {
    var i = 0;
    var count = stars.length;
    var batchCount = 1000;
    
    console.log(minValues.x, maxValues.x, minValues.z, maxValues.z);
    
    background(0);
    
    var timer = setInterval(() => {
        if (count-i < batchCount) {
            batchCount = count-i;
            clearInterval(timer);
        }
        console.log(drawStars);
        drawStars(i, batchCount);
        
        i += batchCount;
    }, 20);
}

function drawStar(star) {
    var {x,z,mag,spect} = star;
        
    x = map(x, minValues.x, maxValues.x, 0, cSizeX);
    y = map(z, minValues.z, maxValues.z, 0, cSizeY);

    
    var color = spectralColors[(spect||'')[0]] || 100;
    fill(color);
    ellipse(x, y, 10, 10);
}

function drawStars(start, count) 
{
    noStroke();
    fill(255,0,0);
    //rect(0,0,10, 10);
    for (var i = start; i < start+count; ++i) {
        var star = stars[i];
        drawStar(star);

    }
}