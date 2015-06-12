var store = require('../data/store');
var User = require('../app/models/user');
var sanitize = require('../config/sanitize');

module.exports = function(sio) {
	sio.sockets
		.on('connection', function (socket) {
		    store.users.online[socket.decoded_token.account.username.original] = socket;
		    socket.emit('updateMessages', socket.decoded_token.account.messages);
		    
		  	store.updateOnlineUsersUserList();

		  	User.findOne({ 'account.username.original' :  socket.decoded_token.account.username.original }, function(err, user){
				if(user){
					socket.emit('updateChatMessages', user.account.chat);
				}
			});
		    

			socket.on('chatMessage', function (data) {
				validateInput([data.to, data.message], function(reciever, message){
			    	var sender = socket.decoded_token.account.username.original, found = false;
			    	for(var j=0; j<socket.decoded_token.account.friendList.length; j++){
			    		if(reciever === socket.decoded_token.account.friendList[j]){
			    			if(store.isUserOnline(reciever)){
					    		for(var i=0; i<store.users.online[reciever].decoded_token.account.ignoredList.length; i++){
							    	if(sender === store.users.online[reciever].decoded_token.account.ignoredList[i]){
							    		found = true;
							    		return socket.emit('chatMessage', {
							    			from : 's',
							    			to : sender,
							    			message : 'you are ignored by this person'
							    		});
							    	}
							    }
							    if(!found){
							    	storeInChatHistory(sender, reciever, message);
							    	return store.users.online[reciever].emit('chatMessage', {
								    	from : sender,
								    	to : reciever,
								    	message : message
								    });
							    }
					    	} else {
							    return socket.emit('chatMessage', {
							    	from : 's',
							    	to : sender,
							    	message : 'this user is offline'
							    });
					    	}
			    		}
			   		}
				    if(!found){
				    	return socket.emit('chatMessage', {
						    from : 's',
						    to : sender,
						    message : 'this user must be in your friend list in order to chat with him'
						});
				    }
				});

		    });

			socket.on('chatMessageSeen', function (who) {
				var query = {};
				query['account.chat.'+ who] = { $exists : true };
				User.update({ 'account.username.original' :  socket.decoded_token.account.username.original }, { $unset: query}, { upsert: true }, function (){});
			});

		    socket.on('disconnect', function () {
		    	if(store.isUserOnline(socket.decoded_token.account.username.original)){
		    		store.users.removeUser(socket.decoded_token.account.username.original);
		    		store.updateOnlineUsersUserList();
		    	}
		    });
		    
		});
};

validateInput = function(thing, callback){
	var b = [];
	if(thing === undefined){
		return;
	}
	if(typeof thing === 'object'){
		if(thing.length !== undefined){
			for(var i=0; i<thing.length ; i++){
				if(thing[i] === undefined){
					return;
				} else {
					b[i] = sanitize.HTML(thing[i]);
				}
			}
			return callback.apply(null, b);
		}
	} else {
		if(thing !== undefined){
			return callback(sanitize.HTML(thing));
		}
	}
};

storeInChatHistory = function(sender, reciever, message){
	User.findOne({ 'account.username.lowerCase' :  reciever.toLowerCase() }, function(err, user){
		if(typeof user.account.chat === undefined || user.account.chat == null){
			user.account.chat = {};
			user.account.chat[sender] = [];
			user.account.chat[sender].push(message);
		} else {
			if(user.account.chat[sender] !== undefined){
				user.account.chat[sender].push(message);
			} else {
				user.account.chat[sender] = [];
				user.account.chat[sender].push(message);
			}
		}
		user.save(function (){
			User.update({ 'account.username.lowerCase' :  reciever.toLowerCase() }, { $set: { 'account.chat': user.account.chat }}, { upsert: true }, function (){});
		});
	});
};