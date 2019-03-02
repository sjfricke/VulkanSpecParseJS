const parseSpec = require("../parse.js").parseSpec;

const LIST_SIZE = 10; // Size of list to hold longest values

parseSpec(function(specDB){
    const names = Object.keys(specDB.index);

    // Holds list sorted by length of string
    var longest = [];
   
    // Use first few elements to fill list
    for (var i = 0; i < LIST_SIZE; i++) {
	longest.push(names[i]);
    }
    longest.sort(function(a,b) { return b.length - a.length; });

    // Sort rest of items
    for (var i = LIST_SIZE; i < names.length; i++) {
	if (names[i].length > longest[LIST_SIZE-1].length) {
	    // Item is long and goes in list
	    longest[LIST_SIZE-1] = names[i];
	    longest.sort(function(a,b) { return b.length - a.length; });
	}
    }

    // List results
    for (var i = 0; i < LIST_SIZE; i++) {
	console.log((i+1) + ". " + longest[i] + " [" + longest[i].length + "]");
    }
});

