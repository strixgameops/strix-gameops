import ivm from "isolated-vm";

export class BalanceModelFunctionExecutor {
  constructor(moduleContainer, { gameID, branch }) {
    this.moduleContainer = moduleContainer;
    this.gameID = gameID;
    this.branch = branch;
    this.modelFunctions = [];
    this.allVariables = [];
    this.allSegments = [];
  }

  async initialize() {
    const balanceModelService = this.moduleContainer.get("balanceModel");

    const result = await balanceModelService.getBalanceModel(
      this.gameID,
      this.branch,
      ["functions", "variables", "segments"]
    );
    this.allVariables = result.variables;
    this.allSegments = result.segments;
    this.modelFunctions = result.functions;
  }

  async calculateLinkedItem(linkObj, segmentID) {
    let modelFunction = this.modelFunctions.find(
      (f) => f.functionID === linkObj.linkedFunctionID
    );

    if (!modelFunction) {
      throw new Error(`Function with ID ${linkObj.linkedFunctionID} not found`);
    }

    modelFunction = JSON.parse(JSON.stringify(modelFunction));
    modelFunction.code = this.appendVariablesToCode(
      modelFunction.code,
      segmentID
    );

    let result = await this.execute(modelFunction.code);

    if (result.success === false) {
      console.error(
        "Error executing model function during cooking process:",
        result.error,
        result.details
      );
      throw new Error(
        `Error executing model function during cooking process: ${result.error}: ${result.details}`
      );
    } else {
      result = result.result;
    }

    result = this.evaluateOutputPath(linkObj.outputPath, result);

    this.validateResultType(result, linkObj, modelFunction);

    return result.toString();
  }

  appendVariablesToCode(code, segmentID) {
    if (!this.allVariables || this.allVariables.length === 0) return code;

    let varsArray = this.allVariables.map((v) => {
      switch (v.variableType) {
        case "string":
          return `var ${
            v.variableName
          } = "${this.getModelSegmentedVariableValue(
            segmentID,
            v.variableID
          )}"`;
        case "number":
          return `var ${v.variableName} = ${this.getModelSegmentedVariableValue(
            segmentID,
            v.variableID
          )}`;
        case "boolean":
          return `var ${v.variableName} = ${
            this.getModelSegmentedVariableValue(segmentID, v.variableID)
              .toString()
              .toLowerCase() === "true"
          }`;
        default:
          return `var ${v.variableName} = null`;
      }
    });

    return `${varsArray.join(";\n")}\n\n${code}`;
  }

  evaluateOutputPath(path, result) {
    if (!path || result === undefined || result === null) return null;

    try {
      // Direct array access pattern like "result[0]"
      const directArrayMatch = path.match(/^(\w+)\[(\d+)\]$/);
      if (directArrayMatch) {
        const [_, objName, index] = directArrayMatch;

        if (objName === "result" && Array.isArray(result)) {
          const idx = parseInt(index, 10);
          if (idx >= 0 && idx < result.length) {
            return result[idx];
          }
        } else if (typeof result === "object" && result !== null) {
          const arr = result[objName];
          if (Array.isArray(arr)) {
            const idx = parseInt(index, 10);
            if (idx >= 0 && idx < arr.length) {
              return arr[idx];
            }
          }
        }
        return null;
      }

      // Direct property access like "result.property"
      if (path === "result") {
        return result;
      }

      if (path.startsWith("result.")) {
        path = path.substring(7);
      }

      const pathParts = path.split(".");
      let currentValue = result;

      for (const part of pathParts) {
        const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);

        if (arrayMatch) {
          const [_, propName, index] = arrayMatch;
          if (
            !currentValue[propName] ||
            !Array.isArray(currentValue[propName])
          ) {
            return null;
          }
          const idx = parseInt(index, 10);
          if (idx >= 0 && idx < currentValue[propName].length) {
            currentValue = currentValue[propName][idx];
          } else {
            return null;
          }
        } else {
          if (
            currentValue === null ||
            currentValue === undefined ||
            !(part in currentValue)
          ) {
            return null;
          }
          currentValue = currentValue[part];
        }
      }

      return currentValue;
    } catch (error) {
      console.error("Error evaluating output path:", error);
      return null;
    }
  }

  getModelSegmentedVariableValue(segmentID, variableID) {
    let result = this.allSegments.find((s) => s.segmentID === segmentID);
    result = result?.overrides.find((o) => o.variableID === variableID)?.value;

    if (Boolean(result)) {
      return result;
    } else {
      result = this.allSegments.find((s) => s.segmentID === "everyone");
      result = result?.overrides.find(
        (o) => o.variableID === variableID
      )?.value;

      if (!Boolean(result)) {
        throw new Error(
          `Cannot build config because the variable with name ${
            this.allVariables.find((v) => v.variableID === variableID)?.name ||
            variableID
          } has no valid value!`
        );
      }
      return result;
    }
  }

  async execute(userCode) {
    if (!userCode || typeof userCode !== "string") {
      return {
        success: false,
        error: "Code must be a non-empty string",
      };
    }

    if (!this.isCodeSafe(userCode)) {
      return {
        success: false,
        error: "Code contains forbidden patterns",
        details:
          "Only mathematical calculations and basic operations are allowed",
      };
    }

    const MAX_CODE_LENGTH = 5000;
    if (userCode.length > MAX_CODE_LENGTH) {
      return {
        success: false,
        error: "Code exceeds maximum allowed length",
      };
    }

    if (!/\breturn\b/.test(userCode)) {
      return {
        success: false,
        error: "Code must include a return statement",
        details: "Function should return a string, number, or boolean",
      };
    }

    const isolate = new ivm.Isolate({ memoryLimit: 8 });

    try {
      const context = await isolate.createContext();
      const jail = context.global;

      await jail.set("global", jail.deref());
      await this.setupSafeEnvironment(context);

      const wrappedCode = `
        "use strict";
        
        function calculate() {
          ${userCode}
        }
        
        calculate();
      `;

      const script = await isolate.compileScript(wrappedCode);
      const startTime = Date.now();
      const resultRef = await script.run(context, { timeout: 300 });
      const executionTime = Date.now() - startTime;

      const result = await resultRef.copy();

      if (!this.isValidResultType(result)) {
        isolate.dispose();
        return {
          success: false,
          error: `Invalid result type: ${typeof result}`,
          details: "Function must return a string, number, boolean, or object",
        };
      }

      const MAX_RESULT_SIZE = 10000;
      const resultSize = JSON.stringify(result).length;
      if (resultSize > MAX_RESULT_SIZE) {
        isolate.dispose();
        return {
          success: false,
          error: "Result exceeds maximum allowed size",
        };
      }

      isolate.dispose();

      return {
        success: true,
        result,
        executionTime,
      };
    } catch (error) {
      isolate.dispose();
      return {
        success: false,
        error: error.message,
        details: "Execution failed",
      };
    }
  }

  isCodeSafe(userCode) {
    const forbiddenPatterns = [
      /(?:require|import)\s*\(\s*['"]fs['"]/,
      /fs\.(read|write|append|create|unlink|rename|mkdir|rmdir|access)/,
      /(?:require|import)\s*\(\s*['"](?:http|https|net|dgram|dns)['"]/,
      /\b(?:fetch|XMLHttpRequest|socket)\b/i,
      /(?:require|import)\s*\(\s*['"](?:child_process|process|cluster|worker_threads)['"]/,
      /\b(?:exec|spawn|fork|execFile|execSync)\b/,
      /process\.env/,
      /\bprocess\b/,
      /\b(?:setTimeout|setInterval|setImmediate|requestAnimationFrame)\b/,
      /\b(?:Promise|async|await)\b/,
      /\b(?:eval|Function|new\s+Function)\b/,
      /(?:require|import)\s*\(\s*['"](?:os|v8|vm|vm2)['"]/,
      /\b(?:global|globalThis|window|document)\b/,
      /(?:require|import)\.resolve/,
      /import\s*\(/,
      /(?:module|Module)\.(?:_load|load|require|createRequire)/,
      /\b(?:WebAssembly|Proxy)\b/,
      /\.constructor(?:\.constructor)?/,
      /\["constructor"\]|\['constructor'\]|\["prototype"\]|\['prototype'\]/,
      /\b(?:__proto__|prototype|constructor)\b/,
      /__defineGetter__|__defineSetter__|__lookupGetter__|__lookupSetter__/,
      /Buffer\.(?:allocUnsafe|allocUnsafeSlow)/,
    ];

    return !forbiddenPatterns.some((pattern) => pattern.test(userCode));
  }

  async setupSafeEnvironment(context) {
    await context.eval(`
      const Math = {
        abs: Math.abs, acos: Math.acos, acosh: Math.acosh, asin: Math.asin,
        asinh: Math.asinh, atan: Math.atan, atan2: Math.atan2, atanh: Math.atanh,
        cbrt: Math.cbrt, ceil: Math.ceil, clz32: Math.clz32, cos: Math.cos,
        cosh: Math.cosh, exp: Math.exp, expm1: Math.expm1, floor: Math.floor,
        fround: Math.fround, hypot: Math.hypot, imul: Math.imul, log: Math.log,
        log10: Math.log10, log1p: Math.log1p, log2: Math.log2, max: Math.max,
        min: Math.min, pow: Math.pow, random: Math.random, round: Math.round,
        sign: Math.sign, sin: Math.sin, sinh: Math.sinh, sqrt: Math.sqrt,
        tan: Math.tan, tanh: Math.tanh, trunc: Math.trunc,
        E: Math.E, LN10: Math.LN10, LN2: Math.LN2, LOG10E: Math.LOG10E,
        LOG2E: Math.LOG2E, PI: Math.PI, SQRT1_2: Math.SQRT1_2, SQRT2: Math.SQRT2
      };

      const JSON = {
        parse: JSON.parse,
        stringify: JSON.stringify
      };

      const Date = {
        now: () => ${Date.now()}
      };

      const Number = Number;
      const String = String;
      const Boolean = Boolean;
      const Array = Array;
      const Object = Object;
      const Error = Error;

      Object.defineProperty(Array.prototype, 'find', { value: Array.prototype.find, enumerable: false });
      Object.defineProperty(Array.prototype, 'filter', { value: Array.prototype.filter, enumerable: false });
      Object.defineProperty(Array.prototype, 'map', { value: Array.prototype.map, enumerable: false });
      Object.defineProperty(Array.prototype, 'forEach', { value: Array.prototype.forEach, enumerable: false });
      Object.defineProperty(Array.prototype, 'reduce', { value: Array.prototype.reduce, enumerable: false });
      Object.defineProperty(Array.prototype, 'includes', { value: Array.prototype.includes, enumerable: false });

      Object.defineProperty(String.prototype, 'includes', { value: String.prototype.includes, enumerable: false });
      Object.defineProperty(String.prototype, 'replace', { value: String.prototype.replace, enumerable: false });
      Object.defineProperty(String.prototype, 'split', { value: String.prototype.split, enumerable: false });

      const parseInt = parseInt;
      const parseFloat = parseFloat;
      const isNaN = isNaN;
      const isFinite = isFinite;
    `);
  }

  isValidResultType(result) {
    const resultType = typeof result;
    return ["string", "number", "boolean", "object"].includes(resultType);
  }

  validateResultType(result, linkObj, modelFunction) {
    const throwDataTypeError = () => {
      throw new Error(
        `Error validating model function output during cooking process: function "${
          modelFunction.name
        }" returned wrong value data type for a linked value! Expected "${
          linkObj.valueType
        }", got "${typeof result}"`
      );
    };

    switch (linkObj.valueType) {
      case "string (derived)":
        if (typeof result !== "string") throwDataTypeError();
        break;
      case "number (derived)":
        if (typeof result !== "number") throwDataTypeError();
        break;
      case "boolean (derived)":
        if (typeof result !== "boolean") throwDataTypeError();
        break;
      case "priceAmount (derived)":
        if (typeof result !== "number") throwDataTypeError();
        if (!Number.isInteger(result)) {
          throw new Error(
            `Error validating model function output during cooking process: function "${modelFunction.name}" returned a float instead of integer for offer's price! Expected integer, got value of ${result}`
          );
        }
        break;
    }
  }
}
