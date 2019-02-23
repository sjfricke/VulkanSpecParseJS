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
    
    parseXml(specXml, function(err, result) {
	const registry = result.registry;

	// registry.types[0].type[30].name[0] == "VK_HEADER_VERSION"
	// var x = registry.types[0].type[30]._
	// headerVersion = x.substr(x.indexOf("#define") + 9)

	debugger;
	
    });
}

parseSpec();
