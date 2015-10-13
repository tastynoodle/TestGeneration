var esprima = require("esprima");
var options = {tokens:true, tolerant: true, loc: true, range: true };
var faker = require("faker");
var fs = require("fs");
faker.locale = "en";
var mock = require('mock-fs');
var _ = require('underscore');
var Random = require('random-js');

function main()
{
	var args = process.argv.slice(2);

	if( args.length == 0 )
	{
		args = ["subject.js"];
	}
	var filePath = args[0];

	constraints(filePath);

	generateTestCases()

}

var engine = Random.engines.mt19937().autoSeed();

function createConcreteIntegerValue( greaterThan, constraintValue )
{
	if( greaterThan )
		return Random.integer(constraintValue,constraintValue+10)(engine);
	else
		return Random.integer(constraintValue-10,constraintValue)(engine);
}

function Constraint(properties)
{
	this.ident = properties.ident;
	this.expression = properties.expression;
	this.operator = properties.operator;
	this.value = properties.value;
	this.inverse = properties.inverse;
	this.funcName = properties.funcName;
	// Supported kinds: "fileWithContent","fileExists"
	// integer, string, phoneNumber
	this.kind = properties.kind;
}

function fakeDemo()
{
	console.log( faker.phone.phoneNumber() );
	console.log( faker.phone.phoneNumberFormat() );
	console.log( faker.phone.phoneFormats() );
}

var functionConstraints =
{
}

var mockFileLibrary = 
{
	pathExists:
	{
		'path/fileExists': {},
	},
	fileWithContent:
	{
		pathContent: 
		{	
  			file1: 'text content',
		}
	},
	pathWithContent:
	{
		'path/fileExists': { 'file1': 'text content'},
	},
	fileWithoutContent:
	{
		pathContent: 
		{	
  			file1: '',
		}
	},
	fileNotExists:
	{
		pathContent:
		{

		}
	}
};

function generateTestCases()
{

	var content = "var subject = require('./subject.js')\nvar mock = require('mock-fs');\n";
	for ( var funcName in functionConstraints )
	{
		var params = {};

		// initialize params
		for (var i =0; i < functionConstraints[funcName].params.length; i++ )
		{
			var paramName = functionConstraints[funcName].params[i];
			//params[paramName] = '\'' + faker.phone.phoneNumber()+'\'';
			params[paramName] = '\'\'';
		}

		//console.log( params );

		// update parameter values based on known constraints.
		var constraints = functionConstraints[funcName].constraints;
		// Handle global constraints...
		var fileWithContent = _.some(constraints, {kind: 'fileWithContent' });
		var pathExists      = _.some(constraints, {kind: 'fileExists' });
		var pathWithContent = _.some(constraints, {kind: 'pathWithContent' });
		var fileNotExists   = _.some(constraints, {kind: 'fileNotExists' });

		// plug-in values for parameters
		for( var c = 0; c < constraints.length; c++ )
		{
			var constraint = constraints[c];
			if( params.hasOwnProperty( constraint.ident ) )
			{
				params[constraint.ident] = constraint.value;
			}
		}

		// Prepare function arguments.
		var args = Object.keys(params).map( function(k) {return params[k]; }).join(",");
		if( pathExists || fileWithContent )
		{
			content += generateMockFsTestCases(pathExists,fileWithContent,!pathWithContent,fileNotExists,funcName, args);
			// Bonus...generate constraint variations test cases....
			content += generateMockFsTestCases(!pathExists,fileWithContent,!pathWithContent,fileNotExists,funcName, args);
			content += generateMockFsTestCases(pathExists,!fileWithContent,!pathWithContent,fileNotExists,funcName, args);
			content += generateMockFsTestCases(!pathExists,!fileWithContent,!pathWithContent,fileNotExists,funcName, args);
			content += generateMockFsTestCases(!pathExists,fileWithContent,pathWithContent,fileNotExists,funcName, args);
			content += generateMockFsTestCases(!pathExists,!fileWithContent,pathWithContent,fileNotExists,funcName, args);
			content += generateMockFsTestCases(!pathExists,!fileWithContent,pathWithContent,!fileNotExists,funcName, args);
		}
		else
		{
			// Emit simple test case.
			content += "subject.{0}({1});\n".format(funcName, args );
		}

	}

	variables = new Object();
	// inverse the condition, generate new test cases
	for ( var funcName in functionConstraints )
	{
		var params = {};

		// initialize params
		variables[funcName] = new Array( functionConstraints[funcName].params.length );

		for (var i =0; i < functionConstraints[funcName].params.length; i++ )
		{
			var paramName = functionConstraints[funcName].params[i];
			//params[paramName] = '\'' + faker.phone.phoneNumber()+'\'';
			params[paramName] = '\'\'';
		}

		//console.log( params );

		// update parameter values based on known constraints.
		var constraints = functionConstraints[funcName].constraints;
		// plug-in values for parameters
		for( var c = 0; c < constraints.length; c++ )
		{
			var constraint = constraints[c];
			index = functionConstraints[funcName].params.indexOf(constraint.ident);
			if( typeof variables[funcName][index] == "undefined" ) variables[funcName][index] = [];
			if( typeof constraint.ident !== "undefined" )
			{
				variables[funcName][index].push( constraint.value );
				if( typeof constraint.inverse != "undefined" )
				{
					variables[funcName][index].push( constraint.inverse );
				}
			}
			//if( typeof constraint.ident != "undefined" && typeof constraint.inverse != "undefined")
			//{
			//	params[constraint.ident] = constraint.inverse;
			//}
		}

		var len = 1;
		for( var i = 0; i < functionConstraints[funcName].params.length; i++ )
		{
			if( typeof variables[funcName][i] == "undefined" ) variables[funcName][i] = [ "\'\'" ];
			else len *= variables[funcName][i].length;
		}

		for( var i = 0; i < len; i++ )
		{
			var params_list = [];
			var x = i;
			for( var j = 0; j < functionConstraints[funcName].params.length; j ++ )
			{
				params_list[j] = variables[funcName][j][x % variables[funcName][j].length];
				x = Math.floor( x / variables[funcName][j].length );
			}

			// Prepare function arguments.
			var args = params_list.join(",");
			// Emit simple test case.
			content += "subject.{0}({1});\n".format(funcName, args );
		}

	}
	console.log(variables);

	fs.writeFileSync('test.js', content, "utf8");

}

function generateMockFsTestCases (pathExists,fileWithContent,pathWithContent,fileNotExists,funcName,args) 
{
	var testCase = "";
	// Build mock file system based on constraints.
	var mergedFS = {};
	if( !pathWithContent )
	{
		for (var attrname in mockFileLibrary.pathWithContent) { mergedFS[attrname] = mockFileLibrary.pathWithContent[attrname]; }
	}
	if( pathWithContent && pathExists )
	{
		for (var attrname in mockFileLibrary.pathExists) { mergedFS[attrname] = mockFileLibrary.pathExists[attrname]; }
	}
	if( fileNotExists )
	{
		for (var attrname in mockFileLibrary.fileNotExists) { mergedFS[attrname] = mockFileLibrary.fileNotExists[attrname]; }
	}
	else if( fileWithContent )
	{
		for (var attrname in mockFileLibrary.fileWithContent) { mergedFS[attrname] = mockFileLibrary.fileWithContent[attrname]; }
	}
	else
	{
		for (var attrname in mockFileLibrary.fileWithoutContent) { mergedFS[attrname] = mockFileLibrary.fileWithoutContent[attrname]; }
	}

	testCase += 
	"mock(" +
		JSON.stringify(mergedFS)
		+
	");\n";

	testCase += "\tsubject.{0}({1});\n".format(funcName, args );
	testCase+="mock.restore();\n";
	return testCase;
}

function constraints(filePath)
{
   var buf = fs.readFileSync(filePath, "utf8");
	var result = esprima.parse(buf, options);

	traverse(result, function (node) 
	{
		if (node.type === 'FunctionDeclaration') 
		{
			var funcName = functionName(node);
			console.log("Line : {0} Function: {1}".format(node.loc.start.line, funcName ));

			var params = node.params.map(function(p) {return p.name});

			functionConstraints[funcName] = {constraints:[], params: params};

			// Check for expressions using argument.
			traverse(node, function(child)
			{
				if( child.type === 'BinaryExpression' && child.operator == "==")
				{
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1)
					{
						// get expression from original source code:
						var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1]);

						var inverse;
						if (rightHand == "undefined") inverse = 1;
						else inverse = [rightHand.slice(0,1), "a", rightHand.slice(1)].join('');
						functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: rightHand,
								inverse: inverse,
								funcName: funcName,
								kind: "integer",
								operator : child.operator,
								expression: expression
							}));
					}

					if( child.left.type == 'Identifier' && child.left.name == "area" )
					{
						// get expression from original source code:
						var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1]);

						var inverse = [rightHand.slice(0,1), "a", rightHand.slice(1)].join('');
						functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: 'phoneNumber',
								value: rightHand,
								inverse: inverse,
								funcName: funcName,
								kind: "integer",
								operator : child.operator,
								expression: expression
							}));
					}

					if( child.left.type == "CallExpression" &&
						child.left.callee.property &&
						child.left.callee.property.name =="indexOf")
					{
						var expression = buf.substring(child.range[0], child.range[1]);
						var value = "\"" + child.left.arguments[0].value + "\"";
						var inverse = [value.slice(0,1), "a", value.slice(1)].join('');
						functionConstraints[funcName].constraints.push( 
						new Constraint(
						{
							ident: child.left.callee.object.name,
							// A fake path to a file
							value: value,
							inverse: inverse,
							funcName: funcName,
							kind: "integer",
							operator : child.operator,
							expression: expression
						}));
					}
				}

				if( child.type === 'BinaryExpression' && child.operator == "<")
				{
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1)
					{
						// get expression from original source code:
						var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])

						functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: parseInt(rightHand) - 1,
								inverse: parseInt(rightHand) + 1,
								funcName: funcName,
								kind: "integer",
								operator : child.operator,
								expression: expression
							}));
					}
				}

				if( child.type === 'BinaryExpression' && child.operator == ">")
				{
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1)
					{
						// get expression from original source code:
						var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])

						functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: parseInt(rightHand) + 1,
								inverse: parseInt(rightHand) - 1,
								funcName: funcName,
								kind: "integer",
								operator : child.operator,
								expression: expression
							}));
					}
				}

				if( child.type === 'LogicalExpression' && child.operator == "||")
				{
					if((child.right.type == 'UnaryExpression') && (child.right.argument.type == 'MemberExpression'))
					{
						functionConstraints[funcName].constraints.push( 
							{
								ident: child.right.argument.object.name,
								value: '{'+child.right.argument.property.name+":true}",
								inverse: '{'+child.right.argument.property.name+":false}",
								funcName: funcName
							});

					}
				}

				if( child.type == "CallExpression" && 
					 child.callee.property &&
					 child.callee.property.name =="readFileSync" )
				{
					for( var p =0; p < params.length; p++ )
					{
						if( child.arguments[0].name == params[p] )
						{
							functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: params[p],
								value:  "'pathContent/file1'",
								funcName: funcName,
								kind: "fileWithContent",
								operator : child.operator,
								expression: expression
							}));
						}
					}
				}

				if( child.type == "CallExpression" &&
					 child.callee.property &&
					 child.callee.property.name =="existsSync")
				{
					for( var p =0; p < params.length; p++ )
					{
						if( child.arguments[0].name == params[p] )
						{
							functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: params[p],
								// A fake path to a file
								value:  "'path/fileExists'",
								funcName: funcName,
								kind: "fileExists",
								operator : child.operator,
								expression: expression
							}));
						}
					}
				}
			});

			console.log( functionConstraints[funcName]);

		}
	});
}

function traverse(object, visitor) 
{
    var key, child;

    visitor.call(null, object);
    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            if (typeof child === 'object' && child !== null) {
                traverse(child, visitor);
            }
        }
    }
}

function traverseWithCancel(object, visitor)
{
    var key, child;

    if( visitor.call(null, object) )
    {
	    for (key in object) {
	        if (object.hasOwnProperty(key)) {
	            child = object[key];
	            if (typeof child === 'object' && child !== null) {
	                traverseWithCancel(child, visitor);
	            }
	        }
	    }
 	 }
}

function functionName( node )
{
	if( node.id )
	{
		return node.id.name;
	}
	return "";
}


if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

main();
