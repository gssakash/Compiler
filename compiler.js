const fs = require("fs");

console.log("Compiler Project");

tokenizeCharacter = (type, value, input, current) =>
  value === input[current] ? [1, { type, value }] : [0, null];

tokenizeParenOpen = (input, current) =>
  tokenizeCharacter("paren", "(", input, current);

tokenizeParenClose = (input, current) =>
  tokenizeCharacter("paren", ")", input, current);

tokenizePattern = (type, pattern, input, current) => {
  let char = input[current];
  let consumedChars = 0;
  if (pattern.test(char)) {
    let value = "";
    while (char && pattern.test(char)) {
      value += char;
      consumedChars++;
      char = input[current + consumedChars];
    }
    return [consumedChars, { type, value }];
  }
  return [0, null];
};

tokenizeNumber = (input, current) =>
  tokenizePattern("number", /[0-9]/, input, current);

tokenizeName = (input, current) =>
  tokenizePattern("name", /[a-z]/i, input, current);

tokenizeString = (input, current) => {
  if (input[current] === '"') {
    let value = "";
    let consumedChars = 0;
    consumedChars++;
    char = input[current + consumedChars];
    while (char !== '"') {
      if (char === undefined) {
        throw new TypeError("unterminated string ");
      }
      value += char;
      consumedChars++;
      char = input[current + consumedChars];
    }
    return [consumedChars + 1, { type: "string", value }];
  }
  return [0, null];
};

skipWhiteSpace = (input, current) =>
  /\s/.test(input[current]) ? [1, null] : [0, null];

tokenizers = [
  skipWhiteSpace,
  tokenizeParenOpen,
  tokenizeParenClose,
  tokenizeString,
  tokenizeNumber,
  tokenizeName
];

tokenizer = (input) => {
  let current = 0;
  let tokens = [];
  while (current < input.length) {
    let tokenized = false;
    tokenizers.forEach((tokenizer_fn) => {
      if (tokenized) {
        return;
      }
      let [consumedChars, token] = tokenizer_fn(input, current);
      if (consumedChars !== 0) {
        tokenized = true;
        current += consumedChars;
      }
      if (token) {
        tokens.push(token);
      }
    });
    if (!tokenized) {
      throw new TypeError("I dont know what this character is: " + char);
    }
  }
  return tokens;
};

parseNumber = (tokens, current) => [
  current + 1,
  { type: "NumberLiteral", value: tokens[current].value }
];

parseString = (tokens, current) => [
  current + 1,
  { type: "StringLiteral", value: tokens[current].value }
];

parseExpression = (tokens, current) => {
  let token = tokens[++current];
  let node = {
    type: "CallExpression",
    name: token.value,
    params: []
  };
  token = tokens[++current];
  while (!(token.type === "paren" && token.value === ")")) {
    [current, param] = parseToken(tokens, current);
    node.params.push(param);
    token = tokens[current];
  }
  current++;
  return [current, node];
};

parseToken = (tokens, current) => {
  let token = tokens[current];
  if (token.type === "number") {
    return parseNumber(tokens, current);
  }
  if (token.type === "string") {
    return parseString(tokens, current);
  }
  if (token.type === "paren" && token.value === "(") {
    return parseExpression(tokens, current);
  }
  throw new TypeError(token.type);
};

function parseProgram(tokens) {
  let current = 0;
  let ast = {
    type: "Program",
    body: []
  };
  let node = null;
  while (current < tokens.length) {
    [current, node] = parseToken(tokens, current);
    ast.body.push(node);
  }
  return ast;
}
parser = parseProgram;

emitNumber = (node) => node.value;

emitString = (node) => `"${node.value}"`;

emitProgram = (node) => node.body.map((exp) => emitter(exp) + ";").join("\n");

emitExpression = (node) =>
  `${node.name}(${node.params.map(emitter).join(", ")})`;

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

emitter = (node) => {
  switch (node.type) {
    case "Program":
      return emitProgram(node);
    case "CallExpression":
      return emitExpression(node);
    case "NumberLiteral":
      return emitNumber(node);
    case "StringLiteral":
      return emitString(node);
    default:
      throw new TypeError(node.type);
  }
};

my_compiler = (input) => {
  let tokens = tokenizer(input);

  console.log("Output of Tokens Array : ");
  console.log(tokens);
  let ast = parser(tokens);

  console.log(ast);
  var newAst = transformer(ast);
  console.log("Transformer output : ");
  printAST(newAst);

  let output = emitter(ast);
  console.log("Code Generator Output : ");
  console.log(output);
  return output;
};

const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question("Enter Your Input : ", (input) => {
  console.log(`Given Input : ${input}`);
  console.log("\r\n");

  let finalOutput = my_compiler(input);
  console.log("Output : " + finalOutput);
  readline.close();
});
