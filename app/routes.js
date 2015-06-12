var User = require('../app/models/user');
var Server = require('../app/models/server');
var sanitize = require('../config/sanitize');
var validate = require('../config/inputValidation');
var nodemailer = require("nodemailer");
var jwt = require('jsonwebtoken');

var tasks = require('./tasks');

var store = require('../data/store');

var smtpTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'manageroflegends@gmail.com',
        pass: 'kreposb1tches'
    }
});

module.exports = function(app, passport, sessionStore) {
	app.route('/authenticate')
		.get(isLogged, function (req, res) {
			res.json({ token: jwt.sign(req.user, store.jwt_secret, { expiresInMinutes: 60*5 }) });
		});

	app.route('/')
		.get(isNotLogged, function(req, res) {
			Server.findOne({ 'name' : 'MOL'}, function(err, server){
				if(err){
					return res.render('index.ejs', { news: '' });
				}
				if(!server){
					return res.render('index.ejs', { news: '' }); 
				} else {
					return res.render('index.ejs', { news: server.news });
				}
			});
		});

	app.route('/login')
		.get(isNotLogged,  function(req, res) {
			Server.findOne({ 'name' : 'MOL'}, function(err, server){
				if(err){
					return res.render('login.ejs', { isLogInOpen: '', message: req.flash('loginMessage') });
				}
				if(!server){
					return res.render('login.ejs', { isLogInOpen: '', message: req.flash('loginMessage') }); 
				} else {
					if(server.isLogInOpen){
						return res.render('login.ejs', { isLogInOpen: '', message: req.flash('loginMessage') });
					} else {
						return res.render('login.ejs', { isLogInOpen: 'false', message: '' });
					}
				}	
			});
			
		})
		.post(isNotLogged, passport.authenticate('local-login', {
			successRedirect : '/main',
			failureRedirect : '/login',
			failureFlash : true 
			})
		);

	app.route('/signup')
		.get(isNotLogged, function(req, res) {
			Server.findOne({ 'name' : 'MOL'}, function(err, server){
				if(err){
					return res.render('signup.ejs', { isSignUpOpen: 'false', message: '' });
				}
				if(!server){
					return res.render('signup.ejs', { isSignUpOpen: 'false', message: '' });
				} else {
					if(server.isSignUpOpen){
						return res.render('signup.ejs', { isSignUpOpen: '', message: req.flash('signupMessage') });
					} else {
						return res.render('signup.ejs', { isSignUpOpen: 'false', message: '' });
					}
				}	
			});
		})
		.post(isNotLogged, passport.authenticate('local-signup', {
			successRedirect : '/main',
			failureRedirect : '/signup',
			failureFlash : true 
			})
		);

	app.route('/logout')
		.get(isLogged, function(req, res) {
			req.logout();
			res.redirect('/');
		});

	app.route('/main')
		.get(isLogged,  function(req, res) {
			res.render('main.ejs', { username: req.user.account.username.original, role : req.user.account.role });
		});

	app.route('/recovery')
		.get(isNotLogged,  function(req, res) {
			res.render('recovery.ejs');
		});

	app.route('/recovery/first')
		.post(isNotLogged, function(req, res) {
			validation(res, req.body.username, function(x){return validate.username(x)}, { passed: false, text: 'The username field is empty' }, { passed: false, text: 'This username is invalid' }, function(username){
				findUser(res, username, function(user){
					sendEmailTo(res, user.account.email.original, user.account.recoveryCode, { passed: false, text: 'Couldn`t send email to user: ' + user.account.email.original }, { passed: true });
				});
			});
		});

	app.route('/recovery/second')
		.post(isNotLogged, function(req, res) {
			validation(res, req.body.username, function(x){return validate.username(x)}, { passed: false, text: 'The username field is empty' }, { passed: false, text: 'This username is invalid' }, function(username){
				validation(res, req.body.password, function(x){return validate.password(x)}, { passed: false, text: 'The password field is empty' }, { passed: false, text: 'This password is invalid' }, function(password){
					validation(res, req.body.recoveryCode, function(x){return validate.code(x)}, { passed: false, text: 'The recovery code field is empty' }, { passed: false, text: 'This recovery code is invalid' }, function(recoveryCode){
						findUser(res, username, function(user){
							if (user.account.recoveryCode === recoveryCode){		  
						        user.account.password = user.generateHash(password);
								saveToDB(res, user, function(){
									res.json({ passed: true , text: 'You successfully change your password'});
								});					                   
							} else {
								return res.json({ passed: false, text: 'Wrong recovery code' });
							}
						});
					});
				});
			});
		});

	app.route('/friend/request/send')
		.post(isLogged, function(req, res) {
			validation(res, req.body.username, function(x){ return validate.username(x)}, { passed: false, text: 'The username field is empty' }, { passed: false, text: 'This username is invalid' }, function(username){
				if(username.toLowerCase() === req.user.account.username.lowerCase){
					return res.json({ passed: false, text: 'you cant add yourself as a friend' });
				}
				for(var i=0; i<req.user.account.ignoredList.length; i++){
					if(username.toLowerCase() === req.user.account.ignoredList[i].toLowerCase()){
						return res.json({ passed: false, text: username + ' is in your ignored list' });
					}
				}
				for(var i=0; i<req.user.account.friendList.length; i++){
					if(username.toLowerCase() === req.user.account.friendList[i].toLowerCase()){
						return res.json({ passed: false, text: username + ' is already in your friend list' });
					}
				}
				findUser(res, username, function(user){
					username = user.account.username.original;
					for(var i=0; i<user.account.ignoredList.length; i++){
						if(req.user.account.username.original === user.account.ignoredList[i]){
							return res.json({ passed: false, text: 'You are in ' + username + '`s ignored list' });
						}
					}
					for(var i=0; i<user.account.friendRequest.length; i++){
						if(req.user.account.username.original === user.account.friendRequest[i]){
							return res.json({ passed: false, text: 'You already send friend request to ' + username }); // BUG
						}
					}
					user.account.messages.push({
						title: 'Recieved friend request',
						message : 'You recieved friend request from ' + req.user.account.username.original + '. Do you accept his/her friendship?',
						sender: req.user.account.username.original
					});
					user.account.friendRequest.push(req.user.account.username.original);				
					saveToDB(res, user, function(){
						if(store.isUserOnline(username)){
							store.users.online[username].emit('updateMessages', user.account.messages);
							store.users.online[username].decoded_token.account.friendRequest.push(req.user.account.username.original);
						}
						return res.json({ passed: true, text: 'You successfully send friend request to ' + username });
					});					                   		
				});
			});
		});

	app.route('/friend/request/response')
		.post(isLogged, function(req, res) {
			validation(res, req.body.username, function(x){ return validate.username(x)}, { passed: false, text: 'The username field is empty' }, { passed: false, text: 'This username is invalid' }, function(username){
				validation(res, req.body.answer, null, { passed: false, text: 'name field is empty' }, null, function(answer){
					var found = false;
					if(answer.toLowerCase() === 'true'){
						for(var i=0; i<req.user.account.friendRequest.length; i++){
							if(username.toLowerCase() === req.user.account.friendRequest[i].toLowerCase()){
								found = true;
								username = req.user.account.friendRequest[i];
								req.user.account.friendRequest.splice(i, 1);
								req.user.account.friendList.push(username);
								saveToDB(res, req.user, function(){
									findUser(res, username, function(user){
										user.account.messages.push({
											title: 'Accept friend request',
											message : req.user.account.username.original + ' accept your friend request'
										});
										user.account.friendList.push(req.user.account.username.original);
										saveToDB(res, user, function(){
											if(store.isUserOnline(req.user.account.username.original)){
												store.users.online[req.user.account.username.original].decoded_token.account.friendRequest.splice(i, 1);
												store.users.online[req.user.account.username.original].decoded_token.account.friendList.push(username);
												store.updateUserList(store.users.online[req.user.account.username.original]);
											}
											if(store.isUserOnline(username)){
												store.users.online[username].emit('updateMessages', user.account.messages);
												store.users.online[username].decoded_token.account.friendList.push(req.user.account.username.original);
												store.updateUserList(store.users.online[username]);
											}
											return res.json({ passed: true, text: 'You successfully accept ' + username + '`s friendship'});
										});	
									});
								});
							}
						}
						if(!found){
							return res.json({ passed: false, text: 'You dont have friend request from ' + username });
						}
					} else {
						// friend request is denied
						for(var i=0; i<req.user.account.friendRequest.length; i++){
							if(username.toLowerCase() === req.user.account.friendRequest[i].toLowerCase()){
								found = true;
								username = req.user.account.friendRequest[i]
								req.user.account.friendRequest.splice(i, 1);
								saveToDB(res, req.user, function(){
									findUser(res, username, function(user){
										user.account.messages.push({
											title: 'Decliend friend request',
											message : req.user.account.username.original + ' declined your friend request'
										});
										saveToDB(res, user, function(){
											if(store.isUserOnline(username)){
												store.users.online[username].emit('updateMessages', user.account.messages);
											}
											return res.json({ passed: true, text: 'You successfully decliend ' + username + '`s friendship'});
										});
									});
								});
							}
						}
						if(!found){
							return res.json({ passed: false, text: 'You dont have friend request from ' + username });
						}
					}
				});
			});
		});

	app.route('/friend/remove')
		.post(isLogged, function(req, res) {
			validation(res, req.body.username, function(x){ return validate.username(x)}, { passed: false, text: 'The username field is empty' }, { passed: false, text: 'This username is invalid' }, function(username){
				var found = false, indexSender, indexReciever;
				for(var i=0; i<req.user.account.friendList.length; i++){
					if(username.toLowerCase() === req.user.account.friendList[i].toLowerCase()){
						found = true;
						username = req.user.account.friendList[i];
						indexSender = i;
						req.user.account.friendList.splice(indexSender, 1);
						saveToDB(res, req.user, function(){
							findUser(res, username, function(user){
								for(var j=0; j<user.account.friendList.length; j++){
									if(req.user.account.username.original === user.account.friendList[j]){
										indexReciever = j;
										user.account.messages.push({
											title: 'You have been removed as friend',
											message : req.user.account.username.original + ' removed you from his/her friend list'
										});
										user.account.friendList.splice(j, 1);
										saveToDB(res, user, function(){
											if(store.isUserOnline(req.user.account.username.original)){
												store.users.online[req.user.account.username.original].decoded_token.account.friendList.splice(indexSender, 1);
												store.updateUserList(store.users.online[req.user.account.username.original]);
											}
											if(store.isUserOnline(username)){
												store.users.online[username].emit('updateMessages', user.account.messages);
												store.users.online[username].decoded_token.account.friendList.splice(indexReciever, 1);
												store.updateUserList(store.users.online[username]);
											}
											return res.json({ passed: true, text: 'You successfully removed ' + username + ' from your friend list'});
										});
									}
								}
							});
						});
					}
				}
				if(!found){
					return res.json({ passed: false, text: username + ' is not in your friend list' });
				}
			});
		});

	app.route('/ignore')
		.post(isLogged, function(req, res) {
			validation(res, req.body.username, function(x){ return validate.username(x)}, { passed: false, text: 'The username field is empty' }, { passed: false, text: 'This username is invalid' }, function(username){
				var found = false, secondFound = false, indexSender, indexReciever;
				for(var i=0; i<req.user.account.ignoredList.length; i++){
					if(username.toLowerCase() === req.user.account.ignoredList[i].toLowerCase()){
						return res.json({ passed: false, text: username + ' is already in your ignored list' });
					}
				}
				for(var i=0; i<req.user.account.friendList.length; i++){
					if(username.toLowerCase() === req.user.account.friendList[i].toLowerCase()){
						found = true;
						username = req.user.account.friendList[i];
						indexSender = i;
						req.user.account.friendList.splice(indexSender, 1);
						req.user.account.ignoredList.push(username);
						saveToDB(res, req.user, function(){
							findUser(res, username, function(user){
								for(var j=0; j<user.account.friendList.length; j++){
									if(req.user.account.username.original === user.account.friendList[j]){
										secondFound = true; 
										indexReciever = j;
										user.account.messages.push({
											title: 'You have been ignored',
											message : 'You have been ignored from ' + req.user.account.username.original
										});
										user.account.friendList.splice(j, 1);
										saveToDB(res, user, function(){
											if(store.isUserOnline(req.user.account.username.original)){
												store.users.online[req.user.account.username.original].decoded_token.account.friendList.splice(indexSender, 1);
												store.users.online[req.user.account.username.original].decoded_token.account.ignoredList.push(username);
												store.updateUserList(store.users.online[req.user.account.username.original]);
											}
											if(store.isUserOnline(username)){
												store.users.online[username].emit('updateMessages', user.account.messages);
												store.users.online[username].decoded_token.account.friendList.splice(indexReciever, 1);
												store.updateUserList(store.users.online[username]);
											}
											return res.json({ passed: true, text: 'You successfully add ' + username + ' to your ignored list'});
										});
									}
								}
								if(!secondFound){
									user.account.messages.push({
										title: 'You have been ignored',
										message : 'You have been ignored from ' + req.user.account.username.original
									});
									saveToDB(res, user, function(){
										if(store.isUserOnline(req.user.account.username.original)){
											store.users.online[req.user.account.username.original].decoded_token.account.friendList.splice(indexSender, 1);
											store.users.online[req.user.account.username.original].decoded_token.account.ignoredList.push(username);
											store.updateUserList(store.users.online[req.user.account.username.original]);
										}
										if(store.isUserOnline(username)){
											store.users.online[username].emit('updateMessages', user.account.messages);
											store.users.online[username].decoded_token.account.friendList.splice(indexReciever, 1);
											store.updateUserList(store.users.online[username]);
										}
										return res.json({ passed: true, text: 'You successfully add ' + username + ' to your ignored list'});
									});
								}
							});
						});
					}
				}
				if(!found){
					findUser(res, username, function(user){
						username = user.account.username.original;
						req.user.account.ignoredList.push(username);
						saveToDB(res, req.user, function(){
							user.account.messages.push({
								title: 'You have been ignored',
								message : 'You have been ignored from ' + req.user.account.username.original
							});
							saveToDB(res, user, function(){
								if(store.isUserOnline(req.user.account.username.original)){
									store.users.online[req.user.account.username.original].decoded_token.account.ignoredList.push(username);
									store.updateUserList(store.users.online[req.user.account.username.original]);
								}
								if(store.isUserOnline(username)){
									store.users.online[username].emit('updateMessages', user.account.messages);
								}
								return res.json({ passed: true, text: 'You successfully add ' + username + ' to your ignored list'});
							});
							
						});	
					});
				}
			});
		});

	app.route('/ignore/remove')
		.post(isLogged, function(req, res) {
			validation(res, req.body.username, function(x){ return validate.username(x)}, { passed: false, text: 'The username field is empty' }, { passed: false, text: 'This username is invalid' }, function(username){
				var found = false, index;
				if(username.toLowerCase() === req.user.account.username.lowerCase){
					return res.json({ passed: false, text: 'you cant remove yourself from your ignored list' });
				}
				for(var i=0; i<req.user.account.ignoredList.length; i++){
					if(username.toLowerCase() === req.user.account.ignoredList[i].toLowerCase()){
						found = true;
						username = req.user.account.ignoredList[i];
						index = i;
						req.user.account.ignoredList.splice(index, 1);
						saveToDB(res, req.user, function(){
							findUser(res, username, function(user){
								if(store.isUserOnline(req.user.account.username.original)){
									store.users.online[req.user.account.username.original].decoded_token.account.ignoredList.splice(index, 1);
									store.updateUserList(store.users.online[req.user.account.username.original]);
								}
								user.account.messages.push({
									title: 'You have been removed from ignored list',
									message : 'You are no longer ignored from ' + req.user.account.username.original
								});
								saveToDB(res, user, function(){
									if(store.isUserOnline(username)){
										store.users.online[username].emit('updateMessages', user.account.messages);
									}
									return res.json({ passed: true, text: 'You successfully removed ' + username + ' from your ignored list'});
								});
								
							});
						});
					}
				}
				if(!found){
					return res.json({ passed: false, text: username + ' is not in your ignored list' });
				}
			});
		});

	app.route('/message/remove')
		.post(isLogged, function(req, res) {
			validation(res, req.body.id, null, { passed: false, text: 'The id field is empty' }, null, function(id){
				var found = false;
				for(var i=0; i<req.user.account.messages.length; i++){
					if(id == req.user.account.messages[i]._id){
						found = true;
						req.user.account.messages.splice(i, 1);
						saveToDB(res, req.user, function(){
							if(store.isUserOnline(req.user.account.username.original)){
								store.users.online[req.user.account.username.original].emit('updateMessages', req.user.account.messages);
							}
							return res.json({ passed: true, text: 'You successfully removed this message'});
						});
					}
				}
				if(!found){
					return res.json({ passed: false, text: 'Message not found'});
				}
			});
		});

	app.route('/settings')
		.get(isLogged,  function(req, res) {
			res.render('settings.ejs', { username: req.user.account.username.original, role : req.user.account.role, email: req.user.account.email.original});
		})
		.post(isLogged,  function(req, res) {
			var newPassword, newEmail, newRecoveryCode;
			validation(res, req.body.password, function(x){return validate.password(x)}, { passed: false, text: 'The password field is empty' }, { passed: false, text: 'This password is invalid' }, function(password){
				if(!req.user.validPassword(sanitize.HTML(req.body.password))){
					return res.json({ passed: false, text: 'Oops! Wrong password'});
				}
				if(req.body.newPassword !== undefined){
					newPassword = sanitize.HTML(req.body.newPassword);
					if (!validate.password(newPassword)){
						return res.json({ passed: false, text: 'Password must contain only letters, numbers or symbols "-", " _" with min 6 and max 20 symbols' });
					} else {
						req.user.account.password = req.user.generateHash(newPassword);
					}
				}
				if(req.body.newEmail !== undefined){
					newEmail = sanitize.HTML(req.body.newEmail);
					if (!validate.email(newEmail)){
						return res.json({ passed: false, text: 'This email addres is invalid' });
					} else {
						req.user.account.email.original = newEmail;
						req.user.account.email.lowerCase = newEmail.toLocaleLowerCase();
					}
				}
				if(req.body.newRecoveryCode !== undefined){
					newRecoveryCode = sanitize.HTML(req.body.newRecoveryCode);
					if(newRecoveryCode.toLowerCase() === 'true'){
						req.user.account.recoveryCode = req.user.genrateRecoveryCode();
					}
				}
				saveToDB(res, req.user, function(){
					return res.json({ passed: true, text: 'You successfully changed your settings' });
				});
			});
		});

	app.route('/admin')
		.get(isAdmin,  function(req, res) {
			res.render('admin.ejs', { username: req.user.account.username.original, role : req.user.account.role });
		});

	app.route('/admin/news')
		.get(isAdmin,  function(req, res) {
			getServer(res, function(server){
				res.json({ passed: true, news: server.news });
			});
		})
		.post(isAdmin, function(req, res) {
			var visible = true, title, content, autor, createDate;
			if(req.body.title === undefined){
				return res.json({ passed: false, text: 'The title field is empty' });
			} 
			if(req.body.content === undefined){
				return res.json({ passed: false, text: 'The content field is empty' });
			}
			if(req.body.visible !== undefined){
				if(sanitize.HTML(req.body.visible).toLowerCase() === 'false'){
					visible = false;
				}
			} 
			title = sanitize.News(req.body.title);
			content = sanitize.News(req.body.content);
			author = req.user.account.username.original; 
			createDate = new Date();
			getServer(res, function(server){
				server.news.push({
					author: author,
					lastModifiedBy: req.user.account.username.original,
        			createDate: createDate,
        			title: title,
        			content: content,
        			visible: visible,
				});
				saveToDB(res, server, function(){
					res.json({ passed: true , text: 'You successfully saved the news'});
				});		
			});
		});

	app.route('/admin/news/edit')
		.post(isAdmin, function(req, res) {
			var found = false;
			validation(res, req.body.id, null, { passed: false, text: 'The id field is empty' }, null, function(id){
				getServer(res, function(server){
					for(var i=0; i<server.news.length; i++){
						if(id == server.news[i].id ){
							found = true;
							if(req.body.title !== undefined){
								server.news[i].title = sanitize.News(req.body.title);
							}
							if(req.body.content !== undefined){
								server.news[i].content = sanitize.News(req.body.content);
							}
							if(req.body.visible !== undefined){
								if(sanitize.HTML(req.body.visible).toLowerCase() === 'false'){
									server.news[i].visible = false;
								} else {
									server.news[i].visible = true;
								}
							}
							if(req.body.author !== undefined){
								server.news[i].author = sanitize.HTML(req.body.author);
							} else {
								server.news[i].author = req.user.account.username.original;
							}
							server.news[i].lastModifiedBy = req.user.account.username.original;
							server.createDate = new Date();
							return saveToDB(res, server, function(){
								res.json({ passed: true , text: 'You successfully update the news'});
							});	
						}
					}
					if(!found){
						return res.json({ passed: false , text: 'News not found'});
					}
				});
			});
		});

	app.route('/admin/news/delete')
		.post(isAdmin, function(req, res) {
			var found = false;
			validation(res, req.body.id, null, { passed: false, text: 'The id field is empty' }, null, function(id){
				getServer(res, function(server){
					for(var i=0; i<server.news.length; i++){
						if(id == server.news[i].id ){
							found = true;
							server.news.splice(i, 1);
							return saveToDB(res, server, function(){
								res.json({ passed: true , text: 'You successfully remove this news'});
							});	
						}
					}
					if(!found){
						return res.json({ passed: false , text: 'News not found'});
					}
				});
			});
		});

	app.route('/admin/users')
		.get(isAdmin,  function(req, res) {
			User.find(function(err, users) {
				if(err){
					return res.json({ passed: false, text: err });
				}
				if(users){
					return res.json({ passed: true, users: users });	
				} else {
					return res.json({ passed: false, text: 'Server is busy, please try again later' });
				}
			});
		});

	app.route('/admin/user/username/:username')
		.get(isAdmin,  function(req, res) {
			validation(res, req.params.username, function(x){return validate.username(x)}, { passed: false, text: 'The username field is empty' }, { passed: false, text: 'This username is invalid' }, function(username){
				findUser(res, username, function(user){
					return res.json({ passed: true, user: user });
				});
			});
		});

	app.route('/admin/user/id/:id')
		.get(isAdmin,  function(req, res) {
			validation(res, req.params.id, null, { passed: false, text: 'The id field is empty' }, null, function(id){
				User.findById(id, function(err, user) {
					if(err){					
						return res.json({ passed: false, text: err });
					}
					if(user){
						return res.json({ passed: true, user: user });
					} else {
						return res.json({ passed: false, text: 'User not found' });
					}
				});
			});
		});

	app.route('/admin/user')
		.post(isAdmin, function(req, res) { // need testing
			validation(res, req.body.id, null, { passed: false, text: 'The id field is empty' }, null, function(id){
				var newPassword, newEmail, newRecoveryCode, newRole, banExpirationDate, now = new Date();
				User.findById(id, function(err, user) {
					if(err){					
						return res.json({ passed: false, text: err });
					}
					if(!user){
						return res.json({ passed: false, text: 'User not found' });
					} else {
						if(req.body.newPassword !== undefined){
							newPassword = sanitize.HTML(req.body.newPassword);
							if (!validate.password(newPassword)){
								return res.json({ passed: false, text: 'Password must contain only letters, numbers or symbols "-", " _" with min 6 and max 20 symbols' });
							} else {
								user.account.password = user.generateHash(newPassword);
							}
						}
						if(req.body.newEmail !== undefined){
							newEmail = sanitize.HTML(req.body.newEmail);
							if (!validate.email(newEmail)){
								return res.json({ passed: false, text: 'This email addres is invalid' });
							} else {
								user.account.email.original = newEmail;
								user.account.email.lowerCase = newEmail.toLocaleLowerCase();
							}
						}
						if(req.body.newRecoveryCode !== undefined){
							newRecoveryCode = sanitize.HTML(req.body.newRecoveryCode);
							if(newRecoveryCode.toLowerCase() === 'true'){
								user.account.recoveryCode = user.genrateRecoveryCode();
							}
						}
						if(req.body.newRole !== undefined){
							newRole = sanitize.HTML(req.body.newRole).toLowerCase();
							if(newRole === 'admin' || newRole === 'user'){
								user.account.role = newRole;
							}
						}
						if(req.body.isBanned !== undefined){
							if(sanitize.HTML(req.body.isBanned).toLowerCase() === 'true'){
								if(user.account.isBanned === false){
									if(store.isUserOnline(user.account.username.original)){
										store.users.removeUser(user.account.username.original);
										store.updateOnlineUsersUserList();
									}
									user.account.isBanned = true;
									sessionStore.destroy(user.sessionID);									
									if(req.body.banExpirationDate !== undefined){
										banExpirationDate = validate.date(sanitize.HTML(req.body.banExpirationDate));
										if(banExpirationDate !== null){
											if (banExpirationDate.getTime() > now.getTime()){
												user.account.banExpirationDate = banExpirationDate;
												getServer(res, function(server){
													server.banTasks.push({ user_id: id, banDate: banExpirationDate });
													saveToDB(res, server, function(){
														tasks.unBanPlayer(id, banExpirationDate);
													});
												});
											}
										}
									} else {
										user.account.banExpirationDate = undefined;
									}
								}
							} else {
								if(user.account.isBanned){
									tasks.unBanPlayer(id);
								}
							}
						}
						saveToDB(res, user, function(){
							return res.json({ passed: true, text: 'You successfully changed ' + user.account.username.original + '`s settings' });
						});
					}
				});
			});
		});

};

getServer = function(res, callback){
	Server.findOne({ 'name' : 'MOL'}, function(err, server){
		if(err){
			return res.json({ passed: false, text: err });
		}
		if(!server){
			return res.json({ passed: false, text: 'Server not found' }); 
		} else {
			return callback(server);
		}	
	});
};

findUser = function(res, username, callback){
	User.findOne({ 'account.username.lowerCase' :  username.toLocaleLowerCase() }, function(err, user){
		if(err){
			return res.json({ passed: false, text: 'Server is busy, please try again later' });
		}
		if (!user){
			return res.json({ passed: false, text: 'User not found' }); 
		} else {
			return callback(user);
		}
	});
};

isLogged = function(req, res, next) {
	if (req.isAuthenticated()){
		return next();
	} else {
		res.redirect('/');
	}
};

isNotLogged = function(req, res, next) {
	if (req.isAuthenticated()){
		res.redirect('/main');
	} else {
		return next();
	}
};

isAdmin = function(req, res, next) {
	if (req.isAuthenticated()){
		if(req.user.account.role === 'admin'){
			return next();
		} else {
			res.redirect('/main');
		}
	} else {
		res.redirect('/');
	}
};
sendEmailTo = function(res, reciever, code, resFail, resSuccess) {
	var mailOptions = {
	    from: "Manager Of Legends <manageroflegends@gmail.com>",
	    to: '"' + reciever + '"',
	    subject: "Password recovery",
	    text: "Password recovery",
	    html: "The code for changing your password is: <b>" + code +" </b>"
	}
	smtpTransport.sendMail(mailOptions, function(err, response){
	    if(err){
	    	res.json(resFail);
	    } else {
	    	res.json(resSuccess);
	    }
	    //smtpTransport.close();
	});
};

validation = function(res, thing, validateFunction, isEmpty, isInvalid, next) {
	if (thing === undefined){
		res.json(isEmpty);
		return;
	} else {
		thing = sanitize.HTML(thing);
		if(validateFunction !== null){
			if(!validateFunction(thing)){
				res.json(isInvalid);
				return;
			} else {
				return next(thing);
			}
		} else {
			return next(thing);
		}
	}
};

findUser = function(res, username, callback){
	User.findOne({ 'account.username.lowerCase' :  username.toLocaleLowerCase() }, function(err, user){
		if(err){
			return res.json({ passed: false, text: 'Server is busy, please try again later' });
		}
		if (!user){
			return res.json({ passed: false, text: 'User not found' }); 
		} else {
			return callback(user);
		}
	});
};

saveToDB = function(res, model, callback){
	model.save(function(err){
		if(err){
			return res.json({ passed: false, text: 'Server is busy, please try again later' });
		} else {
			if(callback !== undefined){
				return callback();
			}
		}
	});
};