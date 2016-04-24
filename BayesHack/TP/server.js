var express = require('express');
var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var app = express();
var cookieParser = require('cookie-parser');

app.use(cookieParser());


var mongo = require('mongodb');
var monk = require('monk');
//var db = monk('localhost:27017/nodetest1');

//var db = monk('mongodb://admin:godis1@ds019101.mlab.com:19101/targetedprevention');
var db = monk('mongodb://admin:godis1@ds045454.mlab.com:45454/targetedprevention2');

db.on('error', function (err) { console.error(err); })
db.on('open', function () { console.log('open'); });


var HTTP_PORT = 3000,
    HTTPS_PORT = 4443,
    SSL_OPTS = {
      key: fs.readFileSync(path.resolve(__dirname,'.ssl/www.example.com.key')),
	  cert: fs.readFileSync(path.resolve(__dirname,'.ssl/www.example.com.cert'))
    };

/*
 *  Define Middleware & Utilties
 **********************************
 */
var allowCrossDomain = function(req, res, next) {
  if (req.headers.origin) {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
  }
  res.header('Access-Control-Allow-Credentials', true);
  // send extra CORS headers when needed
  if ( req.headers['access-control-request-method'] ||
    req.headers['access-control-request-headers']) {
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Max-Age', 1728000);  // 20 days
    // intercept OPTIONS method
    if (req.method == 'OPTIONS') {
        res.send(200);
    }
  }
  else {
      next();
  }
};



// trim string value and enclose it with double quotes if needed
var parseValue = function(value) {
  if (typeof value === "string") {
    // trim
    value = value.replace(/^\s+|\s+$/g, '');
    if (value == "") {
      value = '""';
    } else if (value.split(' ').length > 1) {
      // enclose with "" if needed
      value = '"' + value + '"';
    }
  }
  return value;
}

// decode and parse query param param
var parseDataQuery = function(req, debug) {
  if (!req.query.data) {
    if (debug) { console.error('No \'data\' query param defined!') };
    return false;
  }
  var data = {};
  try {
    data = JSON.parse(decodeURIComponent(req.query.data));
  } catch (e) {
    if (debug) { console.error('Failed to JSON parse \'data\' query param') };
    return false;
  }
  return data;
}

// create single event based on data which includes time, event & properties
var createAndLogEvent = function(data, req) {
  var time = (data && data.t) || new Date().toISOString(),
      event = (data && data.e) || "unknown",
      properties = (data && data.kv) || {};

  // append some request headers (ip, referrer, user-agent) to list of properties
  properties.date = time;
  properties.ip = req.ip;
  properties.origin = (req.get("Origin")) ? req.get("Origin").replace(/^https?:\/\//, '') : "";
  properties.page = req.get("Referer");
  //properties.useragent = req.get("User-Agent");




  var pt = db.get('pagetracking');
  var promise = pt.insert(properties);

  promise.on('error', function(err){console.error("someting went wrong", err);});

/*
  fs.appendFile(path.resolve(__dirname, './events.log'), json_string, function(err) {
    if (err) {
      console.log(err);
    } else {
      //console.log("Logged tracked data");
    }
  });
  */
}

/*
 * Use Middlewares
 **********************************
 */
app.use(express.logger());
//app.use(express.compress());
app.use(allowCrossDomain);
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.send(500, 'Something broke!');
});

/*
 *  Create Tracking Endpoints
 **********************************
 */

// API endpoint tracking
app.get('/track', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  var data;
  // data query param required here
  if ((data = parseDataQuery(req, true)) === false) {
    res.send('0');
  }


  properties = (data && data.kv) || {};

  console.log("ides in /track  is, ", properties.id)


  var cookie = req.cookies.cookieName;
  if (cookie === undefined || cookie != 'livebetter')
  {
    //res.cookie('livebetter',properties.id, { maxAge: 9000000, httpOnly: true });
    res.cookie('livebetter',properties.id, { expires: new Date(Date.now() + 900000), httpOnly: true });

    console.log('cookie created successfully');
  }
  else {

    console.log('cookie already existed', req.cookies.cookieName);
  }

  createAndLogEvent(data, req);
  res.send('1');
});

// IMG beacon tracking - data query optional
app.get('/t.gif', function(req, res) {
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'private, no-cache, no-cache=Set-Cookie, proxy-revalidate');
  res.setHeader('Expires', 'Sat, 01 Jan 2000 12:00:00 GMT');
  res.setHeader('Pragma', 'no-cache');
  // data query param optional here
  var data = parseDataQuery(req) || {};
  // fill in default success event if none specified
  if (!data.e) { data.e = "success";}

  properties = (data && data.kv) || {};

  console.log("ides is, ", properties.id)

  createAndLogEvent(data, req);
  res.sendfile(path.resolve(__dirname, './t.gif'));
});


app.get('/ad.png', function(req, res) {

  console.log("Cookies: /ad.png ", req.cookies.livebetter)


  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'private, no-cache, no-cache=Set-Cookie, proxy-revalidate');
  res.setHeader('Expires', 'Sat, 01 Jan 2000 12:00:00 GMT');
  res.setHeader('Pragma', 'no-cache');
  // data query param optional here
  var data = parseDataQuery(req) || {};
  // fill in default success event if none specified
  if (!data.e) { data.e = "success";}
  //createAndLogEvent(data, req);

  var pt = db.get('userprofile');

         var risk = 0;

         pt.find({id : req.cookies.livebetter},
             { limit : 1, sort : { date : -1 } },
             function (err,res) {
                 if(err) throw err;

                console.log("result", JSON.stringify(res) )

                for (var k in res[0].tags[0])
                {
                  console.log("k ", JSON.stringify(k) )

                  if (k=="risk"){

                      if (risk <  res[0].tags[0][k]) {risk = res[0].tags[0][k] }
                  }

              }});





              if (risk >= 1 ){

                  res.sendfile(path.resolve(__dirname, './sever.png'));

              }

              if (risk > .5 && risk < 1 ){

                  res.sendfile(path.resolve(__dirname, './moderate.png'));
              }
              else{

                  res.sendfile(path.resolve(__dirname, './not.png'));
              }


});

// root
app.get('/', function(req, res) {

  var pt = db.get('pagetracking');
    pt.find({}, function(err, pagetracking){
        if (err) throw err;
      	res.json(pagetracking);
    });
  //res.send("");

});

var pidFile = path.resolve(__dirname, './pid.txt');
fs.writeFileSync(pidFile, process.pid, 'utf-8');

// Create an HTTP service.
http.createServer(app).listen(HTTP_PORT,function() {
  console.log('Listening to HTTP on port ' + HTTP_PORT);
});

// Create an HTTPS service identical to the HTTP service.
https.createServer(SSL_OPTS, app).listen(HTTPS_PORT,function() {
  console.log('Listening to HTTPS on port ' + HTTPS_PORT);
});
