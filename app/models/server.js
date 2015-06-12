var mongoose = require('mongoose');

var serverSchema = mongoose.Schema({
    
	name: String,
    banTasks: [ { 
        user_id: String, 
        banDate: Date
    } ],
    news: [ { 
        author: String,
        lastModifiedBy: String,
        createDate: Date,
        title: String,
        content: String,
        visible: Boolean
    } ],
    isSignUpOpen: Boolean,
    isLogInOpen: Boolean

});

module.exports = mongoose.model('Server', serverSchema);