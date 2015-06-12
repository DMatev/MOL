var express  = require('express');
var http = require('http');
var app      = express();
var port     = process.env.PORT || 3000;
var favicon = require('serve-favicon');
var mongoose = require('mongoose');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var passport = require('passport');
var flash 	 = require('connect-flash');
var socketIo = require('socket.io');
var socketio_jwt = require('socketio-jwt');

var configDB = require('./config/database');

var startup = require('./app/startup');

var store = require('./data/store');

var sessionStore = new MongoStore({
		url : configDB.url
	});

	app.use(morgan('dev'));
	app.use(cookieParser());
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(bodyParser.json());
	app.use(favicon(__dirname + '/public/images/favicon.ico'));
	app.use(express.static(__dirname +  '/public'));

	app.set('view engine', 'ejs'); 
    
	app.use(session({
		secret: store.jwt_secret,
		store : sessionStore, 
		saveUninitialized: true,
        resave: true
    }));
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(flash());

require('./config/passport')(passport, sessionStore);
require('./app/routes.js')(app, passport, sessionStore);

mongoose.connect(configDB.url, function(err){
	if(err){
		console.log(err);
	}
});

var server = http.createServer(app);
var sio = socketIo.listen(server);

sio.use(socketio_jwt.authorize({
  secret: store.jwt_secret,
  handshake: true
}));

require('./app/sockets.js')(sio);

startup.loadTasks();

server.listen(port, function () {
  console.log('Dido`s awsome site runes on http://localhost:' + port);
});