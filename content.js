$("body").append('Test2');

myCell="";
issuetable = $('#issuetable');
if(issuetable.length != 0){
	log("Found Issue Table");
	log("The Table has " + $('#issuetable tbody tr').length + " rows");

	// $.each($('#issuetable > tbody > tr'), function(index, row) {
	// 		backgroundLog("HERE: "+ index);
	// 	backgroundLog(row);
	// 	backgroundLog("HERE2");
	// 	issueColumn=row.find('.issuekey');
	// 	if(issueColumn.length == 0){
	// 		backgroundLog("Didn't find column");
	// 	} else{
	// 		backgroundLog("Found Column");
	// 	}
	// });
	$.each($('#issuetable .issuekey'), function(index, cell) {
		log(index);
		key=$(cell).find("a").text();
		log(key);
		$(cell).css("background-color", "#9CBA7F");

		$.getJSON('/rest/api/2/issue/'+key, function(data) {
			log("Received info for relationships for key:" +data.key);
			if(data.fields.issuelinks[0].outwardIssue){
				log("First outward relationship of " + data.key + " is " + data.fields.issuelinks[0].outwardIssue.key);
			}
			if(data.fields.issuelinks[0].inwardIssue){
				log("First inward relationship of " + data.key + " is " + data.fields.issuelinks[0].inwardIssue.key);
			}
		});
	});
	log("Done");
} else{

	log("Didn't find issue table");
}





log("At end of file");


function log(message) {
	logJSON = {
		action: 'logmessage',
		message: message
	};
	chrome.extension.sendMessage(logJSON);
}