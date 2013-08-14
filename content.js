if($('#issuetable').length == 0){
	log("Didn't find the issue table");
	return;
} else{
	log("Found issue table- continuing");
}

String.prototype.format = String.prototype.f = function() {
    var s = this,
        i = arguments.length;
    while (i--) {
        s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
    }
    return s;
};

updateTimer="";
MAXRESULTSTOPROCESS=250;
APISEARCHBASE="/rest/api/2/search?jql={0}&fields=keys";
APISEARCHBASEPAGINATED="{0}{1}".format(APISEARCHBASE, "&startAt={1}");
SEARCHBOXIDENTIFIER=".advanced-search";
shouldAutoProcessTable=true;



$(".navigator-content").bind('DOMSubtreeModified', function(event){
	clearTimeout(updateTimer);
	if(shouldAutoProcessTable){
		updateTimer = setTimeout(function(){ 
			log("Running function"); 
			processTable();
		}, 
		500);
	}
 });



processTable();

function processTable() {
	if($('#issuetable tbody tr').length == 0){
		log("Issue table has no rows, not processing further");
		return;
	}
	shouldAutoProcessTable=false;
	shouldProcessEveryPage=false;
	allSearchKeys=[];
	totalResults=0;
	resultsPerPage=0;
	searchText=$(SEARCHBOXIDENTIFIER).val();
	log(searchText);
	$.ajaxSetup( { "async": false } );
	if(searchText != ""){
		log("Searching for text: {0}".format(APISEARCHBASE.format(encodeURIComponent(searchText))));
		$.getJSON(APISEARCHBASE.format(encodeURIComponent(searchText)), function(data) {
		log(data);
		totalResults=data.total;
		resultsPerPage=data.maxResults;
		if(totalResults<=MAXRESULTSTOPROCESS){
			shouldProcessEveryPage=true;
			$.each(data.issues, function(index, dict) {
				allSearchKeys.push(dict.key);
			});
		}
		log("Made it to here");
		});
		log("Total results: {0}; resultsPerPage: {1}; shouldProcessEveryPage: {2}".f(totalResults, resultsPerPage, shouldProcessEveryPage));
		if(totalResults > resultsPerPage && shouldProcessEveryPage){

			for(x=resultsPerPage; x<totalResults; x+=resultsPerPage){
				log("X is {0}".format(x));
				$.ajaxSetup( { "async": false } );
				log("Searching for {0}".f(APISEARCHBASEPAGINATED.format(encodeURIComponent(searchText), x)));
				$.getJSON(APISEARCHBASEPAGINATED.format(encodeURIComponent(searchText), x), function(data) {
					log("Total results back is: {0}".f(data.issues.length));
					$.each(data.issues, function(index, dict) {
						allSearchKeys.push(dict.key);
					});
				});
			}
		}

		$.ajaxSetup( { "async": true } );	
	}
	
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
			// $(cell).css("background-color", "#9CBA7F");

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
	log("In buildTreeNode for "+ currentIssue.key);
	processedKeys.push(currentIssue.key);
	//If the parent is in our list, let's add it as a relationship

	if($.inArray(currentIssue.parentIssueKey, keysInTable) != -1) {
		log("Assigning the parent");
		currentIssue.parentIssue=issueObjects[currentIssue.parentIssueKey];
	}
	$.each(currentIssue.childrenIssueKeys, function(index, childIssueKey) {
		log("Find child with key " + childIssueKey + ". Do I want him: ");

		if($.inArray(childIssueKey, keysInTable) != -1) {
			log("	YES");
			currentIssue.childrenIssues.push(issueObjects[childIssueKey]);
			if($.inArray(childIssueKey, processedKeys) == -1) {
				log("Processing issue: " + childIssueKey);
				buildTreeNode(issueObjects[childIssueKey]);

			}
		} else{
			log("	NO");
		}
	});
}


function reorderTable() {
	log("In reorder table");
	// $.each(issueObjects, function(key, issueObject) {
	// 	log("Issue: "+ issueObject.key  + " has parent " + issueObject.parentIssuekey + " and has the following chilren count: " + issueObject.childrenIssueKeys.length);
	// });
	

	//Let's build a tree from all of our keys
	$.each(issueObjects, function(key, issueObject) {
		if($.inArray(issueObject.key, processedKeys) == -1) {
			log("Processing issue: " + issueObject.key);
			buildTreeNode(issueObject);
		}
		else {
			log("Already processed: "+issueObject.key);
		}
	});

	tableIndex=0;
	$.each(issueObjects, function(key, issueObject) {
		if(issueObject.parentIssue.length == 0){
			//At this point, I want to draw out my tree keeping track of the hierarcy
			log("Calling orderIssueTable");
			orderIssueTable(issueObject, 0);
		}
		else{
			log("Issue has a parent: "+ key);
		}
	});
	log("I AM HERE");
	shouldAutoProcessTable=true;

}

function orderIssueTable(currentIssue, indentLevel){
	// log("In orderIssueTable with indentLevel: " + indentLevel);
	myRow=$("tr[data-issuekey='" + currentIssue.key + "']");
	if(myRow.length == 0){
		log("Couldn't find a table row for issue: " + currentIssue.key);
		return;
	}
	else{
		if(indentLevel > 0){
			log("Indenting the row for key: " + currentIssue.key);
			myRow.find(".summary").css("padding-left", 30*indentLevel+"px");
		}
		if(myRow.index() != tableIndex) {
			log("Moving row");
			tableRows=$('#issuetable > tbody > tr');
			if(tableIndex == 0){ //If I need to move it to the first row
				log("Inserting issue: " + currentIssue.key + " at index: " + tableIndex);
				myRow.insertBefore($($('#issuetable > tbody > tr')[0]));
			} else if(tableIndex == tableRows.length-1){ //If I need to move it to the last row
				log("Inserting issue: " + currentIssue.key + " at index: " + tableIndex);
				myRow.insertAfter($($('#issuetable > tbody > tr')[tableRows.length-1]));
			} else {
				log("Inserting issue: " + currentIssue.key + " at index: " + tableIndex);
				myRow.insertBefore($($('#issuetable > tbody > tr')[tableIndex+1]));
			}
		}
		tableIndex+=1;
		log("Issue: "+ currentIssue.key + " at indent level " + indentLevel + " has parent " + currentIssue.parentIssue.key + " and has the following chilren: " + arrayElementsToString(currentIssue.childrenIssues));
		$.each(currentIssue.childrenIssues, function(index, childIssue) {
			// log("Here3");
			orderIssueTable(childIssue, indentLevel+1);
		});
	}
}



function arrayElementsToString(myArray) {
	myString="";
	$.each(myArray, function(index, element) {
		myString+=", " + element.key;
	});
	return myString;
}

// String.prototype.format = String.prototype.f = function() {
//     var s = this,
//         i = arguments.length;
//     while (i--) {
//         s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
//     }
//     return s;
// };
//first, checks if it isn't implemented yet
