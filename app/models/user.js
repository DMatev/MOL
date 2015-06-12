var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var userSchema = mongoose.Schema({
    
    sessionID: String,
    account: {
        username: {
            original: String,
            lowerCase: String
        },
        password: String,
        email: {
            original: String,
            lowerCase: String
        },
        recoveryCode: String,
        role: String,
        isBanned: Boolean,
        banExpirationDate: Date,
        ignoredList: [String],
        friendList: [String],
        friendRequest : [String],
        messages: [{
            title: String,
            message: String,
            sender: String
        }],
        chat: Object
    },
    gameData: {
        maxTeamsAllowed: Number,
        teams : [{
            name: String,
            players: [{ 
                name: String, 
                role: String, 
            }]
        }],
        cash: Number
    },
});

userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password);
};

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.account.password);
};

userSchema.methods.genrateRecoveryCode = function() {
    var text = '';
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

    for (var i=0; i < 5; i++){
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
};

module.exports = mongoose.model('User', userSchema);