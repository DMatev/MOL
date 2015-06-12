var tasks = require('./tasks');
var User = require('../app/models/user');
var Server = require('../app/models/server');
var store = require('../data/store');

function loadTasks (){
	var now = new Date();
	Server.findOne({ 'name': 'MOL' }, function (err, server){
		if(err){
			console.log(err);
		}
		if(server){
			for(var i=0; i<server.banTasks.length; i++){
				if(server.banTasks[i].banDate.getTime() > now.getTime()){
					tasks.unBanPlayer(server.banTasks[i].user_id, server.banTasks[i].banDate);
				} else {
					User.findById(server.banTasks[i].user_id, function(err, user) {
						if (user){
							user.account.isBanned = false;
							user.account.banExpirationDate = undefined;
							user.save(function(err){
								if(err){
									console.log(err);
								}
							});
						}
					});
					server.banTasks.splice(i,1);
					i--;
				}
			}
			server.save(function(err){
				if(err){
					console.log(err);
				}
			});
		} else {
			console.log('Server not found');
		}
	});
};

exports.loadTasks = loadTasks;