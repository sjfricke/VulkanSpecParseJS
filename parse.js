const fs = require("fs");
const request = require("sync-request");
var parseXml = require('xml2js').parseString;

const specFilePath = "./vk.xml"
const specUrl = "https://raw.githubusercontent.com/KhronosGroup/Vulkan-Docs/master/xml/vk.xml";

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

    // SpecDB is the restructured version of the spec to JSON for easier querying
    var specDB = {};
    
    parseXml(specXml, function(err, result) {
	const registry = result.registry;

	// ------------- Header Version -------------
	registry.types[0].type[30].name[0] == "VK_HEADER_VERSION"
	var x = registry.types[0].type[30]._
	specDB.headerVersion = x.substr(x.indexOf("#define") + 9)

	// ------------- Enums -------------
	specDB.enums = [];
	for (var i = 0; i < registry.enums.length; i++) {
	    var oldEnum = registry.enums[i];
	    var newEnum = {};

	    // enum or bitmask types
	    if (oldEnum.$.type == "enum") {
		if (!oldEnum.enum) { continue; }

		// Get rid of extra {$ : <vlaue>} object nested
		var fields = [];
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
		var fields = [];
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
	    
	    specDB.enums.push(newEnum);
	}

	// ------------- Structs and Unions -------------
	specDB.structs = [];
	specDB.unions = [];
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
		    member.type += oldType.member[j]._.trim()
		}
		
		members.push(member);
	    }
	    newStruct.members = members;

	    if (oldType.$.category == "struct") {
		specDB.structs.push(newStruct);
	    } else if (oldType.$.category == "union") {
		specDB.unions.push(newStruct);
	    }
	}

	// ------------- Commands -------------
	specDB.commands = [];
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
		    param.type += oldCommand.param[j]._.trim();
		}
		
		params.push(param);
	    }
	    newCommand.params = params;

	    specDB.commands.push(newCommand);
	}
	    
	// ------------- Features -------------

	// ------------- Extensions -------------
	
	debugger;
	
    });
}

parseSpec();
