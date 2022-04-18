
"use strict";
console.log('Compiler Project');

function tokenizer(input) {
  let current = 0;

  let tokens = [];

  while (current < input.length) {
    let char = input[current];

    if (char === "(") {
      tokens.push({
        type: "paren",
        value: "("
      });

      current++;

      continue;
    }

    if (char === ")") {
      tokens.push({
        type: "paren",
        value: ")"
      });
      current++;
      continue;
    }

    let WHITESPACE = /\s/;
    if (WHITESPACE.test(char)) {
      current++;
      continue;
    }

    let NUMBERS = /[0-9]/;
    if (NUMBERS.test(char)) {
      let value = "";
      while (NUMBERS.test(char)) {
        value += char;
        char = input[++current];
      }

      tokens.push({ type: "number", value });

      continue;
    }

    if (char === '"') {
      let value = "";

      char = input[++current];

      while (char !== '"') {
        value += char;
        char = input[++current];
      }

      char = input[++current];

      tokens.push({ type: "string", value });

      continue;
    }

    let LETTERS = /[a-z]/i;
    if (LETTERS.test(char)) {
      let value = "";

      while (LETTERS.test(char)) {
        value += char;
        char = input[++current];
      }

      tokens.push({ type: "name", value });

      continue;
    }

    throw new TypeError("I dont know what this character is: " + char);
  }

  return tokens;
}

var input = "(add 2 (subtract 4 2))";

var tokens = tokenizer(input);

console.log("Output of Tokens Array : ");
console.log(tokens);

function parser(tokens) {
  var current = 0;

  function walk() {
    var token = tokens[current];

    if (token.type === "number") {
      current++;

      return {
        type: "NumberLiteral",
        value: token.value
      };
    }

    if (token.type === "paren" && token.value === "(") {
      token = tokens[++current];

      var node = {
        type: "CallExpression",
        name: token.value,
        params: []
      };

      token = tokens[++current];

      while (
        token.type !== "paren" ||
        (token.type === "paren" && token.value !== ")")
      ) {
        node.params.push(walk());
        token = tokens[current];
      }

      current++;

      return node;
    }

    throw new TypeError(token.type);
  }

  var ast = {
    type: "Program",
    body: []
  };

  while (current < tokens.length) {
    ast.body.push(walk());
  }

  return ast;
}

function traverser(ast, visitor) {
  function traverseArray(array, parent) {
    array.forEach(function (child) {
      traverseNode(child, parent);
    });
  }

  function traverseNode(node, parent) {
    var method = visitor[node.type];

    if (method) {
      method(node, parent);
    }

    switch (node.type) {
      case "Program":
        traverseArray(node.body, node);
        break;

      case "CallExpression":
        traverseArray(node.params, node);
        break;

      case "NumberLiteral":
        break;

      default:
        throw new TypeError(node.type);
    }
  }

  traverseNode(ast, null);
}

function transformer(ast) {
  var newAst = {
    type: "Program",
    body: []
  };

  ast._context = newAst.body;

  traverser(ast, {
    NumberLiteral: function (node, parent) {
      parent._context.push({
        type: "NumberLiteral",
        value: node.value
      });
    },

    CallExpression: function (node, parent) {
      var expression = {
        type: "CallExpression",
        callee: {
          type: "Identifier",
          name: node.name
        },
        arguments: []
      };

      node._context = expression.arguments;

      if (parent.type !== "CallExpression") {
        expression = {
          type: "ExpressionStatement",
          expression: expression
        };
      }

      parent._context.push(expression);
    }
  });

  return newAst;
}

function printAST(ast) {
  function traverseArray(array, parent, depth) {
    array.forEach(function (child) {
      traverseNode(child, parent, depth);
    });
  }

  function traverseNode(node, parent, depth) {
    let spaces = "";
    for (let i = 0; i < depth; i++) {
      spaces = spaces + "\t";
    }

    switch (node.type) {
      case "Program":
        console.log(spaces, node.type);
        traverseArray(node.body, node, depth + 1);
        break;
      case "CallExpression":
        console.log(spaces, node.type);
        traverseArray([node.callee], node, depth + 1);
        traverseArray(node.arguments, node, depth + 1);
        break;
      case "ExpressionStatement":
        console.log(spaces, node.type);
        traverseArray([node.expression], node, depth + 1);
        break;
      case "Identifier":
        console.log(spaces, node.type, " - ", node.name);
        break;
      case "NumberLiteral":
        console.log(spaces, node.type, " - ", node.value);
        break;
      default:
        throw new TypeError(node.type);
    }
  }
  traverseNode(ast, null, 0);
}

var ast = {
  type: "Program",
  body: [
    {
      type: "CallExpression",
      name: "add",
      params: [
        {
          type: "NumberLiteral",
          value: "2"
        },
        {
          type: "CallExpression",
          name: "subtract",
          params: [
            {
              type: "NumberLiteral",
              value: "4"
            },
            {
              type: "NumberLiteral",
              value: "2"
            }
          ]
        }
      ]
    }
  ]
};

var newAst = transformer(ast);
console.log("Transformer output : ");
printAST(newAst);

function codeGenerator(node) {
  switch (node.type) {
    case "Program":
      return node.body.map(codeGenerator).join("\n");

    case "ExpressionStatement":
      return codeGenerator(node.expression) + ";";

    case "CallExpression":
      return (
        codeGenerator(node.callee) +
        "(" +
        node.arguments.map(codeGenerator).join(", ") +
        ")"
      );

    case "Identifier":
      return node.name;

    case "NumberLiteral":
      return node.value;

    case "StringLiteral":
      return '"' + node.value + '"';

    default:
      throw new TypeError(node.type);
  }
}

var newAST = {
  type: "Program",
  body: [
    {
      type: "ExpressionStatement",
      expression: {
        type: "CallExpression",
        callee: {
          type: "Identifier",
          name: "add"
        },
        arguments: [
          {
            type: "NumberLiteral",
            value: "2"
          },
          {
            type: "CallExpression",
            callee: {
              type: "Identifier",
              name: "subtract"
            },
            arguments: [
              {
                type: "NumberLiteral",
                value: "4"
              },
              {
                type: "NumberLiteral",
                value: "2"
              }
            ]
          }
        ]
      }
    }
  ]
};

var output = codeGenerator(newAST);
console.log("Code Generator Output : ");
console.log(output);

function compiler(input) {
  let tokens = tokenizer(input);
  let ast = parser(tokens);
  let newAst = transformer(ast);
  let output = codeGenerator(newAst);

  return output;
}

var input = "(add 2 (subtract 4 2))";
console.log("Input Given : " + input);
console.log("Output: " + compiler(input));

module.exports = {
  tokenizer,
  parser,
  printAST,
  transformer,
  codeGenerator,
  compiler
};
