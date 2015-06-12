var sanitizeHtml = require('sanitize-html');

function sanitizeHTML(content){
	return sanitizeHtml(content, { allowedTags: [ ]});
}

function sanitizeNews(content){
	return sanitizeHtml(content, { 
		allowedTags: [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'b', 'i', 'strong', 'em', 'strike'], 
		selfClosing: [ 'br'] 
	});
}

exports.HTML = sanitizeHTML;
exports.News = sanitizeNews;