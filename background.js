console.log("In background.js");

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {

		if(request.action == "logmessage"){
			console.log("Received a message from " + sender.tab.id + ": " + request.message);
		}
		console.log("Made it to the end");
  // If we don't return anything, the message channel will close, regardless
  // of whether we called sendResponse.
});