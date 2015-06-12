function validateUsername(elementValue){        
   var usernamePattern = /^[a-zA-Z0-9_-]{3,20}$/;  
   return usernamePattern.test(elementValue);   
}

function validatePassword(elementValue){        
   var passwordPattern = /^[a-zA-Z0-9_-]{6,20}$/;  
   return passwordPattern.test(elementValue);   
}

function validateEmail(elementValue){        
   var emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;  
   return emailPattern.test(elementValue);   
}

function validateCode(elementValue){        
   var codePattern = /^[a-zA-Z0-9_-]{5}$/;  
   return codePattern.test(elementValue);   
}

function validateDate(elementValue){
	var m = elementValue.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
	return (m) ? new Date(m[3], m[2]-1, m[1]) : null;  
}

exports.username = validateUsername;
exports.password = validatePassword;
exports.email = validateEmail;
exports.code = validateCode;
exports.date = validateDate;