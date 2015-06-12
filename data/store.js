var store = module.exports = {
	jwt_secret : 'dido is awsome',
	users : {
		online : {}, //store username:socket
		removeUser: function(username){
			delete store.users.online[username];
		},
		getOnlineUsers: function(){
			var online = [];
			for(var user in store.users.online){
				online.push(user);
			}
			return online;
		}
	},
	isUserOnline: function(username){
		for(var user in store.users.online){
			if(username === user){
				return true;
			}
		}
		return false;
	},
	updateUserList: function(socket){
		var friends_online = [], friends_ofline = [], data = {};
			for(var i=0; i<socket.decoded_token.account.friendList.length; i++){
				if(store.isUserOnline(socket.decoded_token.account.friendList[i])){
					friends_online.push(socket.decoded_token.account.friendList[i]);
				} else {
					friends_ofline.push(socket.decoded_token.account.friendList[i]);
				}
			}
		data = { online: friends_online, ofline: friends_ofline, ignored: socket.decoded_token.account.ignoredList.slice(1, socket.decoded_token.account.ignoredList.length) }
		socket.emit('updateUserList', data);
	},
	updateOnlineUsersUserList: function(){
		for(var user in store.users.online){
			store.updateUserList(store.users.online[user]);
		}
	}
}