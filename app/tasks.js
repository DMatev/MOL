var CronJob = require('cron').CronJob;
var User = require('../app/models/user');
var Server = require('../app/models/server');

function unBanPlayer(user_id, banDate){
	if(banDate){
		console.log('Cron task assigned - unban Player: ' + user_id);
		new CronJob(
			banDate, 
			function(){
				User.findById(user_id, function(err, user) {
					if(err){
						console.log(err);
					}
					if(user){
						user.account.isBanned = false;
						user.account.banExpirationDate = undefined;
						user.save(function(err){
							if(err){
								console.log(err);
							} else {
								Server.update({name: 'MOL', banTasks: { $elemMatch: { user_id: user._id } } }, { $pull: { banTasks: { user_id: user._id } } }, function(err) {
									if(err){
										console.log(err);
									}
								});
							}
						});
					} else {
						console.log('User with id: ' + user_id + ' not found');
					}
				});
			}, 
			function () {
				console.log('Player: ' + user_id + ' is unbanned');
			},
			true
		);
	} else {
		User.findById(user_id, function(err, user) {
			if(err){
				console.log(err);
			}
			if(user){
				user.account.isBanned = false;
				user.account.banExpirationDate = undefined;
				user.save(function(err){
					if(err){
						console.log(err);
					} else {
						Server.update({name: 'MOL', banTasks: { $elemMatch: { user_id: user._id } } }, { $pull: { banTasks: { user_id: user._id } } }, function(err) {
							if(err){
								console.log(err);
							}
						});
					}
				});
			} else {
				console.log('User with id: ' + user_id + ' not found');
			}
		});
	}
};

exports.unBanPlayer = unBanPlayer;