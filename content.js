myCell="";
issuetable = $('#issuetable');
processedKeys=[]; //Holds keys as they get processed for their final structure
if(issuetable.length != 0){
	log("Found Issue Table");
	log("The Table has " + $('#issuetable tbody tr').length + " rows");

	keysInTable=[]; //Holds all keys found in the table
	issueObjects={}; //Hold all issueObjects
	rowsToProcess=$('#issuetable tbody tr').length; //Create an object to check for when all the rows have been processed with the API
	$.each($('#issuetable .issuekey'), function(index, cell) {
		log(index);
		key=$(cell).find("a").text();
		log(key);
		keysInTable.push(key);
		$(cell).css("background-color", "#9CBA7F");

		$.getJSON('/rest/api/2/issue/'+key +'?fields=issuelinks', function(data) {
			var myIssue=new issue(data.key);
			log("Received info for relationships for key:" +data.key);
			$.each(data.fields.issuelinks, function(index, issueLink) {
				relationshipType=issueLink.type.name;
				if(relationshipType=="Child-Issue"){
					if(issueLink.outwardIssue){ //This relationship is my child
						log("Found child with key "+issueLink.outwardIssue.key);
						myIssue.childrenIssueKeys.push(issueLink.outwardIssue.key);
					} else if(issueLink.inwardIssue){ //This relationship is my parent
						log("Found parent with key "+issueLink.inwardIssue.key);
						myIssue.parentIssueKey=issueLink.inwardIssue.key;
					}
				}
			});
			// issueObjects.push(myIssue);
			issueObjects[myIssue.key]=myIssue;
			rowsToProcess--;
			if(rowsToProcess == 0){ //If this is the final callback
				reorderTable();
			}
		});
	});

} else{

	log("Didn't find issue table");
}



function log(message) {
	logJSON = {
		action: 'logmessage',
		message: message
	};
	chrome.extension.sendMessage(logJSON);
}



function issue(key) {
	this.key=key;	
	this.parentIssueKey="";
	this.parentIssue="";
	this.childrenIssues=[];
	this.childrenIssueKeys=[];
}

//This take a key and build all child nodes (all the way down recursively)
//It only adds issueObjects for ones that are in our table
//When it processes an issueObject in the table, it marks it as processed
//We won't process the same issueObject twice by checking if an issueObject was processed or not
function buildTreeNode(currentIssue){
	//If the parent is in our list, let's add it as a relationship
	if($.inArray(currentIssue.parentIssueKey, keysInTable) != -1) {
		currentIssue.parentIssue=issueObject[currentIssue.parentIssueKey];
	}
	$.each(currentIssue.childrenIssueKeys, function(index, childIssue) {
		if($.inArray(childIssue.key, keysInTable) != -1) {
			issueObject.childrenIssues.push(childIssue.key);
		}
	});

}


function reorderTable() {
	log("In reorder table");

	//Let's build a tree from all of our keys
	$.each(issueObjects, function(index, issueObject) {
		if(!$.inArray(issueObject.key, processedKeys)) {
			log("Processing issue: " + issueObject.key);
			buildTreeNode(issueObject);
		}
	});


	$.each(keysInTable, function(index, key) {
		myIssue=issueObjects[key];
		$.inArray(key, keysInTable)
		//If my parent is in the table, skip for now
		if($.inArray(myIssue.parentIssue, keysInTable) != -1){
			log("My parent is in the table");
		} else {
			log("My parent is NOT in the table");
		}
		log("Issue: " + myIssue.key + " has parent: "+myIssue.parentIssueKey + " and this many chilren: " + myIssue.childrenIssueKeys.length);
	})


}
