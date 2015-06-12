var LocalStrategy = require('passport-local').Strategy;
var User = require('../app/models/user');
var Server = require('../app/models/server');
var sanitize = require('./sanitize');
var validate = require('./inputValidation');

module.exports = function(passport, sessionStore) {

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });

    // local-signup
    passport.use('local-signup', new LocalStrategy({
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true
    }, function(req, username, password, done) {
        var user, pass, email;
        Server.findOne({ 'name' : 'MOL'}, function(err, server){
            if(err){
               return done(null, false, req.flash('loginMessage', 'We are sorry, but we have too many registered users right now. Please try again later'));
            }
            if(!server){
                return done(null, false, req.flash('loginMessage', 'We are sorry, but we have too many registered users right now. Please try again later'));
            } else {
                if(server.isLogInOpen){
                    user = sanitize.HTML(username);
                    pass = sanitize.HTML(password);
                    email = sanitize.HTML(req.body.email);
                    if (!validate.username(user))
                        return done(null, false, req.flash('signupMessage', 'Username must contain only letters, numbers or symbols "-", " _" with min 3 and max 20 symbols'));
                     if (user === 'admin')
                        return done(null, false, req.flash('signupMessage', 'Username must be different than word "admin"'));
                    if (!validate.password(pass))
                        return done(null, false, req.flash('signupMessage', 'Password must contain only letters, numbers or symbols "-", " _" with min 6 and max 20 symbols'));
                    if(!validate.email(email))
                        return done(null, false, req.flash('signupMessage', 'This email addres is invalid'));
                            
                    User.findOne({ 'account.username.lowerCase' : user.toLowerCase()  }, function(err, foundUser) { 
                        if(err)
                            return done(null, false, req.flash('signupMessage', 'Server is busy, please try again later'));
                        if (foundUser){
                            return done(null, false, req.flash('signupMessage', 'This username is already taken'));
                        } else {
                            User.findOne({ 'account.email.lowerCase' :  email.toLowerCase() }, function(err, foundEmail) {
                                var newUser = new User();
                                if(err)
                                    return done(null, false, req.flash('signupMessage', 'Server is busy, please try again later'));
                                if (foundEmail) {
                                    return done(null, false, req.flash('signupMessage', 'This email is already taken'));
                                } else {
                                    newUser.account.username.original = user;
                                    newUser.account.username.lowerCase = user.toLowerCase(); 
                                    newUser.account.password = newUser.generateHash(pass);
                                    newUser.account.email.original = email;
                                    newUser.account.email.lowerCase = email.toLowerCase();
                                    newUser.account.recoveryCode = newUser.genrateRecoveryCode();
                                    newUser.account.role = "user";
                                    newUser.account.isBanned = false;
                                    newUser.account.banExpirationDate = undefined;
                                    newUser.account.ignoredList[0] = user;
                                    newUser.sessionID = req.sessionID;
                                    newUser.gameData.maxTeamsAllowed = 1;
                                    newUser.gameData.cash = 1000;
                                    newUser.save(function(err) {
                                        if (err)
                                            return done(null, false, req.flash('signupMessage', 'Server is busy, please try again later'));
                                        return done(null, newUser);
                                    });
                                }
                            });
                        }
                    });
                } else {
                    return done(null, false, req.flash('loginMessage', 'We are sorry, but we have too many registered users right now. Please try again later'));
                }
            }
        });
             
    }));

    // local-login
    passport.use('local-login', new LocalStrategy({
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true
    }, function(req, username, password, done) {
        var usr, pass;
        Server.findOne({ 'name' : 'MOL'}, function(err, server){
            if(err){
               return done(null, false, req.flash('loginMessage', 'We are sorry, but we have too many users online right now. Please try again later')); 
            }
            if(!server){
                return done(null, false, req.flash('loginMessage', 'We are sorry, but we have too many users online right now. Please try again later'));
            } else {
                if(server.isLogInOpen){
                    usr = sanitize.HTML(username);
                    pass = sanitize.HTML(password);
                    if (!validate.username(usr))
                        return done(null, false, req.flash('loginMessage', 'This username is invalid')); 
                    if (!validate.password(pass))
                        return done(null, false, req.flash('loginMessage', 'This password is invalid')); 
            
                    User.findOne({ 'account.username.lowerCase' : usr.toLowerCase()  }, function(err, user) { 
                        if(err)
                            return done(null, false, req.flash('loginMessage', 'Server is busy, please try again later'));
                        if (!user)
                            return done(null, false, req.flash('loginMessage', 'User not found')); 
                        if (!user.validPassword(pass))
                            return done(null, false, req.flash('loginMessage', 'Oops! Wrong password'));
                        if (user.account.isBanned){
                            return done(null, false, req.flash('loginMessage', 'This account has been suspended until '+ user.account.banExpirationDate));
                        } else {
                            sessionStore.destroy(user.sessionID);
                            user.sessionID = req.sessionID;
                            user.save(function(err){
                                if(err){
                                    return done(null, false, req.flash('loginMessage', 'Server is busy, please try again later'));
                                } else {
                                    return done(null, user);
                                }
                            });
                           
                        }
                     });
                } else {
                    return done(null, false, req.flash('loginMessage', 'We are sorry, but we have too many users online right now. Please try again later'));
                }
            }   
        });

           
    }));

getServer = function(callback){
    Server.findOne({ 'name' : 'MOL'}, function(err, server){
        if(err){
           return callback(err, server); 
        }
        if(!server){
            return callback('server not found', server); 
        } else {
            return callback(null, server);
        }   
    });
};

};