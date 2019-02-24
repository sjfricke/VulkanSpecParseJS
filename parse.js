const fs = require("fs");
const request = require("sync-request");
var parseXml = require('xml2js').parseString;

const specFilePath = "./vk.xml";
const specUrl = "https://raw.githubusercontent.com/KhronosGroup/Vulkan-Docs/master/xml/vk.xml";

// gSpecDB is the global restructured version of the spec to JSON for easier querying
// The structure/modle can be found in ./specdb.md
var gSpecDB = {
    "headerVersion" : "",
    "index" : {},
    "enums" : [],
    "structs" : [],
    "unions" : [],
    "commands" : []
};

function parseSpec() {

    // Gets file from either local xml or else from url
    var specXml;
    if (fs.existsSync(specFilePath)) {
	specXml = fs.readFileSync(specFilePath, 'utf8');
	console.log("Read in spec from " + specFilePath);
    } else {
	console.log("No spec found at " + specFilePath);
	console.log("Getting Spec from " + specUrl);
	specXml = request("GET", specUrl).getBody();
    }
    if (specXml.length == 0) { console.error("Spec file was empty!!!"); }
    
    parseXml(specXml, function(err, result) {
	const registry = result.registry;

	// ------------- Header Version -------------
	registry.types[0].type[30].name[0] = "VK_HEADER_VERSION";
	var x = registry.types[0].type[30]._;
	gSpecDB.headerVersion = x.substr(x.indexOf("#define") + 9);

	// ------------- Enums -------------
	for (var i = 0; i < registry.enums.length; i++) {
	    var oldEnum = registry.enums[i];
	    var newEnum = {};
	    var fields = [];
	    
	    // enum or bitmask types
	    if (oldEnum.$.type == "enum") {
		if (!oldEnum.enum) { continue; }

		// Get rid of extra {$ : <vlaue>} object nested
		for (var j = 0; j < oldEnum.enum.length; j++) {
		    fields.push(oldEnum.enum[j].$);
		}
		
		newEnum = {
		    "name" : oldEnum.$.name,
		    "fields" : fields
		};
	    } else if (oldEnum.$.type == "bitmask") {
		if (!oldEnum.enum) { continue; }

		// Turn bitpos into hex string value
		for (var j = 0; j < oldEnum.enum.length; j++) {
		    fields.push({
			"name" : oldEnum.enum[j].$.name,
			"comment" : oldEnum.enum[j].$.comment,
			"value" : "0x" + (1 << parseInt(oldEnum.enum[j].$.bitpos)).toString(16)
		    });
		}
		
		newEnum = {
		    "name" : oldEnum.$.name,
		    "fields" : fields
		};
	    } else {
		// Anything invalid
		continue;
	    }

	    // Update index
	    var thisIndex = {"key" : "enums", "index" : gSpecDB.enums.length };
	    gSpecDB.index[newEnum.name.toLowerCase()] = [thisIndex];
	    for (var j = 0; j < newEnum.fields.length; j++) {
		var name = newEnum.fields[j].name.toLowerCase();
		if (typeof(gSpecDB.index[name]) == "object") {
		    gSpecDB.index[name].push(thisIndex);
		} else {
		    gSpecDB.index[name] = [thisIndex];
		}
	    }

	    gSpecDB.enums.push(newEnum);
	}

	// ------------- Extension Extended Enums -------------
	for (var i = 0; i < registry.extensions[0].extension.length; i++) {
	    if (!registry.extensions[0].extension[i].require) { continue; }
	    for (var k = 0; k < registry.extensions[0].extension[i].require.length; k++) {
		var thisExt = registry.extensions[0].extension[i].require[k];

		if (!thisExt.enum) { continue; }

		for (var j = 0; j < thisExt.enum.length; j++) {
		    if (!thisExt.enum[j].$.extends) { continue; }

		    var thisIndex = gSpecDB.index[thisExt.enum[j].$.extends.toLowerCase()];		 
		    if (!thisIndex && thisExt.enum[j].$.bitpos) {
			// New enum, need to create instead of extending
			// TODO handle if it doesn't have bitpos
			var newEnum = {
			    "name" : thisExt.enum[j].$.extends,
			    // Onl need to include first field, rest will be added automatically
			    "fields" : [{
				"name" : thisExt.enum[j].$.name,
				"comment" : thisExt.enum[j].$.comment,
				"value" : "0x" + (1 << parseInt(thisExt.enum[j].$.bitpos)).toString(16)
			    }]
			};

			var newIndex = {"key" : "enums", "index" : gSpecDB.enums.length };
			gSpecDB.index[newEnum.name.toLowerCase()] = [newIndex];
			var name = newEnum.fields[0].name.toLowerCase();
			if (typeof(gSpecDB.index[name]) == "object") {
			    gSpecDB.index[name].push(newIndex);
			} else {
			    gSpecDB.index[name] = [newIndex];
			}

			gSpecDB.enums.push(newEnum);
			continue;
		    }
		    
		    // Add to enum object
		    var field = {
			"name" : thisExt.enum[j].$.name,
			"comment" : thisExt.enum[j].$.comment
		    };

		    if (thisExt.enum[j].$.bitpos) {
			field.value = "0x" + (1 << parseInt(thisExt.enum[j].$.bitpos)).toString(16);
		    } else {
			// TODO figure how to handle others
			continue;
		    }
		    
		    // Add to index
		    for (var index = 0; index < thisIndex.length; index++) {
			gSpecDB.enums[thisIndex[0].index].fields.push(field);
			
			var name = field.name.toLowerCase();
			if (typeof(gSpecDB.index[name]) == "object") {
			    gSpecDB.index[name].push(thisIndex[0]);
			} else {
			    gSpecDB.index[name] = [thisIndex[0]];
			}
		    }
		}
	    }
	}
	
	// ------------- Structs and Unions -------------
	for (var i = 0; i < registry.types[0].type.length; i++) {
	    var oldType = registry.types[0].type[i];
	    if (!oldType.member) { continue; }
	    
	    var newStruct = {};
	    newStruct.name = oldType.$.name;
	    
	    // Reformat member field to get rid of single index arrays
	    var members = [];
	    for (var j = 0; j < oldType.member.length; j++) {
		var member = {
		    "type" : oldType.member[j].type[0],
		    "name" : oldType.member[j].name[0]
		};
		
		// Check for point and arrays in type
		if (oldType.member[j]._) {
		    member.type += " " + oldType.member[j]._.trim();
		}
		
		members.push(member);
	    }
	    newStruct.members = members;

	    // Get value for gSpecDV
	    var dbField = "";
	    if (oldType.$.category == "struct") { dbField = "structs"; }
	    else if (oldType.$.category == "union") { dbField = "unions"; }
	    else { console.error("oldType.$.category unknown: " + oldType.$.category); }
	    
	    // Update index
	    var thisIndex = {"key" : dbField, "index" : gSpecDB[dbField].length };
	    gSpecDB.index[newStruct.name.toLowerCase()] = [thisIndex];
	    for (var j = 0; j < newStruct.members.length; j++) {
		var name = newStruct.members[j].name.toLowerCase();
		if (typeof(gSpecDB.index[name]) == "object") {
		    gSpecDB.index[name].push(thisIndex);
		} else {
		    gSpecDB.index[name] = [thisIndex];
		}
	    }
	    gSpecDB[dbField].push(newStruct);
	}

	// ------------- Commands -------------
	for (var i = 0; i < registry.commands[0].command.length; i++) {
	    var oldCommand = registry.commands[0].command[i];
	    if (!oldCommand.proto) { continue; }
	    
	    var newCommand = {
		"name" : oldCommand.proto[0].name[0],
		"return" : oldCommand.proto[0].type[0]
	    };
	    
	    // Special function attributes
	    if (oldCommand.$) {
		if (oldCommand.$.queues) { newCommand.queues = oldCommand.$.queues.split(","); }
		if (oldCommand.$.renderpass) { newCommand.renderpass = oldCommand.$.renderpass; }
		if (oldCommand.$.cmdbufferlevel) { newCommand.cmdbufferlevel = oldCommand.$.cmdbufferlevel.split(","); }
		if (oldCommand.$.pipeline) { newCommand.pipeline = oldCommand.$.pipeline; }
		if (oldCommand.$.successcodes) { newCommand.successcodes = oldCommand.$.successcodes.split(","); }
		if (oldCommand.$.errorcodes) { newCommand.errorcodes = oldCommand.$.errorcodes.split(","); }
	    }

	    // Format parameters
	    var params = [];
	    for (var j = 0; j < oldCommand.param.length; j++) {
		var param = {
		    "name" : oldCommand.param[j].name[0],
		    "type" : oldCommand.param[j].type[0]
		};

		// Check for param attributes
		if (oldCommand.param[j].$) {
		    if (oldCommand.param[j].$.optional) { param.optional = oldCommand.param[j].$.optional; }
		}

		// Check for point and arrays in type
		if (oldCommand.param[j]._) {
		    param.type += " " + oldCommand.param[j]._.trim();
		}
		
		params.push(param);
	    }
	    newCommand.params = params;

	    // Add to index
	    var thisIndex = {"key" : "commands", "index" : gSpecDB.commands.length };
	    gSpecDB.index[newCommand.name.toLowerCase()] = [thisIndex];
	    for (var j = 0; j < newCommand.params.length; j++) {
		var name = newCommand.params[j].name.toLowerCase();
		if (typeof(gSpecDB.index[name]) == "object") {
		    gSpecDB.index[name].push(thisIndex);
		} else {
		    gSpecDB.index[name] = [thisIndex];
		}
	    }
	    gSpecDB.commands.push(newCommand);
	}
	
	debugger; // For getting repl in inspect mode to view gSpecDB
    });
}

parseSpec();
