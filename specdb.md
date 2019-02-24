# SpecDB

The parse.js `parseSpec()` function creates a SpecDB. Here is the JSON layout of the `gSpecDB` variable to be used to interact with it easier

```
var gSpecDB = {
    "headerVersion" : "", // Header version string
    
    // Index is where all terms can be found. This is designed to prevent having to loop through each section
    "index" : {
	// Each key is lowercase
	"vkimagelayout" : [
	    // Contains array of each place term can be found
	    { "key" : "enums", "index" : 0 }
	],
	"etc..." : []
    },

    // Enums found in spec
    "enums" : [
	{
	    "name" : "VkImageLayout",
	    "fields" : [
		{
		    "name" : "VK_IMAGE_LAYOUT_UNDEFINDED",
		    "value" : "0",
		    "comment" : "Comment from spec" // Optional
		},
		{
		    ...
		}
	    ]
	},
	{
	    ...
	}
    ],

    // Structs found in spec
    "structs" : [
	{
	    "name" : "VkBaseOutStructure",
	    "members" : [
		{
		    "name" : "sType",
		    "type" : "VkStructureType",
		    "comment" : "Comment from spec" // Optional
		},
		{
		    ...
		}
	    ]
	},
	{
	    ...
	}
    ],

    // Unions found in spec
    "unions" : [
	{
	    "name" : "VkClearColorValue",
	    "members" : [
		{
		    "name" : "float32",
		    "type" : "float [4]",
		    "comment" : "Comment from spec" // Optional
		},
		{
		    ...
		}
	    ]
	},
	{
	    ...
	}
    ],

    // Commands/functions found in spec
    // There are 6 Optionl features
    // - successcodes
    // - errorcodes
    // - queues
    // - renderpass
    // - cmdbufferlevel
    // - pipeline
    "commands" : [
	{
	    "name" : "VkCreateInstance",
	    "return" : "VkResult",
	    "successcodes" : [ // Optional
		"VK_SUCCESS"
	    ],
	    "errorcodes" : [ // Optional
		"VK_ERROR_OUT_OF_HOST_MEMORY",
		"VK_ERROR_OUT_OF_DEVICE_MEMORY",
		...
	    ],
	    "params" : [
		{
		    "name" : "pCreateInfo",
		    "type" : "VkInstanceCreateInfo const *",
		    "comment" : "Comment from spec" // Optional
		},
		{
		    ...
		}
	    ]
	},
	{
	    "name" : "VkCmdDraw",
	    "return" : "void",
	    "queues" : [ // Optional
		"graphics"
	    ],
	    "renderpass" : "inside", // Optional
	    "cmdbufferlevel" : [ // Optional
		"primary",
		"secondary"
	    ],
	    "pipeline" : "graphics", // Optional
	    "params" : [
		{
		    "name" : "commandBuffer",
		    "type" : "VkCommandBuffer",
		    "comment" : "Comment from spec" // Optional
		},
		{
		    ...
		}
	    ]
	},
	{
	    ...
	}
    ]
};
```