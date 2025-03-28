"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = worker;
var ollama_1 = require("@langchain/ollama");
var ts_morph_1 = require("ts-morph");
var path_1 = require("path");
// 最大行数限制
var MAX_LINES = 50;
// 计算文本的行数
function countLines(text) {
    return text.split("\n").length;
}
// 获取文件名，安全处理文件路径
function getBaseName(filePath) {
    if (!filePath)
        return "未知文件";
    try {
        return path_1.default.basename(filePath);
    }
    catch (error) {
        console.error("\u65E0\u6CD5\u83B7\u53D6\u6587\u4EF6\u540D: ".concat(filePath), error);
        return "未知文件";
    }
}
// 根据语法节点的类型获取节点名称
function getNodeName(node) {
    // 尝试获取各种类型的名称
    if (ts_morph_1.Node.isClassDeclaration(node) ||
        ts_morph_1.Node.isFunctionDeclaration(node) ||
        ts_morph_1.Node.isMethodDeclaration(node) ||
        ts_morph_1.Node.isInterfaceDeclaration(node) ||
        ts_morph_1.Node.isEnumDeclaration(node) ||
        ts_morph_1.Node.isTypeAliasDeclaration(node)) {
        var identifier = node.getFirstDescendantByKind(ts_morph_1.SyntaxKind.Identifier);
        return identifier === null || identifier === void 0 ? void 0 : identifier.getText();
    }
    // 对于箭头函数、函数表达式等尝试获取变量名称
    if (ts_morph_1.Node.isVariableDeclaration(node)) {
        var identifier = node.getFirstDescendantByKind(ts_morph_1.SyntaxKind.Identifier);
        return identifier === null || identifier === void 0 ? void 0 : identifier.getText();
    }
    return undefined;
}
// 根据节点类型获取节点的类型描述
function getNodeType(node) {
    if (ts_morph_1.Node.isClassDeclaration(node))
        return "类";
    if (ts_morph_1.Node.isFunctionDeclaration(node))
        return "函数";
    if (ts_morph_1.Node.isMethodDeclaration(node))
        return "方法";
    if (ts_morph_1.Node.isInterfaceDeclaration(node))
        return "接口";
    if (ts_morph_1.Node.isEnumDeclaration(node))
        return "枚举";
    if (ts_morph_1.Node.isTypeAliasDeclaration(node))
        return "类型别名";
    if (ts_morph_1.Node.isVariableDeclaration(node)) {
        // 检查是否为箭头函数
        if (node.getFirstDescendantByKind(ts_morph_1.SyntaxKind.ArrowFunction))
            return "箭头函数";
        if (node.getFirstDescendantByKind(ts_morph_1.SyntaxKind.FunctionExpression))
            return "函数表达式";
    }
    if (ts_morph_1.Node.isPropertyDeclaration(node))
        return "属性";
    return "代码片段";
}
// 从源文件中提取所有语法单元
function extractCodeFragments(filePath, fileContent) {
    try {
        // 安全获取文件名
        var fileName = getBaseName(filePath);
        var project = new ts_morph_1.Project();
        var sourceFile_1 = project.createSourceFile(fileName, fileContent, {
            overwrite: true,
        });
        var fragments_1 = [];
        // 提取主要语法单元
        function processNode(node) {
            // 只处理我们关注的顶级语法单元
            if (ts_morph_1.Node.isClassDeclaration(node) ||
                ts_morph_1.Node.isFunctionDeclaration(node) ||
                ts_morph_1.Node.isInterfaceDeclaration(node) ||
                ts_morph_1.Node.isEnumDeclaration(node) ||
                ts_morph_1.Node.isTypeAliasDeclaration(node)) {
                var content = node.getText();
                var lines = countLines(content);
                if (lines <= MAX_LINES) {
                    // 如果单元小于行数限制，直接添加
                    var startLine = sourceFile_1.getLineAndColumnAtPos(node.getStart()).line;
                    var endLine = sourceFile_1.getLineAndColumnAtPos(node.getEnd()).line;
                    fragments_1.push({
                        type: getNodeType(node),
                        name: getNodeName(node),
                        content: content,
                        startLine: startLine,
                        endLine: endLine,
                    });
                }
                else {
                    // 单元过大时，需要进一步处理
                    processLargeNode(node);
                }
            }
            else if (ts_morph_1.Node.isVariableStatement(node)) {
                // 处理变量声明，可能包含箭头函数或函数表达式
                var declarations = node.getDeclarations();
                for (var _i = 0, declarations_1 = declarations; _i < declarations_1.length; _i++) {
                    var decl = declarations_1[_i];
                    var hasFunction = decl.getFirstDescendantByKind(ts_morph_1.SyntaxKind.ArrowFunction) ||
                        decl.getFirstDescendantByKind(ts_morph_1.SyntaxKind.FunctionExpression);
                    if (hasFunction) {
                        var content = decl.getText();
                        var lines = countLines(content);
                        if (lines <= MAX_LINES) {
                            var startLine = sourceFile_1.getLineAndColumnAtPos(decl.getStart()).line;
                            var endLine = sourceFile_1.getLineAndColumnAtPos(decl.getEnd()).line;
                            fragments_1.push({
                                type: getNodeType(decl),
                                name: getNodeName(decl),
                                content: content,
                                startLine: startLine,
                                endLine: endLine,
                            });
                        }
                        else {
                            processLargeNode(decl);
                        }
                    }
                }
            }
            // 递归处理子节点
            node.forEachChild(function (child) { return processNode(child); });
        }
        // 处理大型语法单元的函数
        function processLargeNode(node) {
            // 对于类，处理每个方法
            if (ts_morph_1.Node.isClassDeclaration(node)) {
                var members = node.getMembers();
                for (var _i = 0, members_1 = members; _i < members_1.length; _i++) {
                    var member = members_1[_i];
                    if (ts_morph_1.Node.isMethodDeclaration(member) ||
                        ts_morph_1.Node.isPropertyDeclaration(member)) {
                        var content = member.getText();
                        var lines = countLines(content);
                        if (lines <= MAX_LINES) {
                            var startLine = sourceFile_1.getLineAndColumnAtPos(member.getStart()).line;
                            var endLine = sourceFile_1.getLineAndColumnAtPos(member.getEnd()).line;
                            fragments_1.push({
                                type: getNodeType(member),
                                name: getNodeName(member),
                                content: content,
                                startLine: startLine,
                                endLine: endLine,
                            });
                        }
                    }
                }
            }
            else if (ts_morph_1.Node.isInterfaceDeclaration(node) ||
                ts_morph_1.Node.isEnumDeclaration(node)) {
                // 对于接口和枚举，处理每个成员
                var members = node.getMembers();
                // 将成员按组处理，以保持在行数限制内
                var currentGroup = [];
                var currentLines = 0;
                for (var _a = 0, members_2 = members; _a < members_2.length; _a++) {
                    var member = members_2[_a];
                    var memberText = member.getText();
                    var memberLines = countLines(memberText);
                    if (currentLines + memberLines <= MAX_LINES) {
                        currentGroup.push(member);
                        currentLines += memberLines;
                    }
                    else {
                        // 处理当前组
                        if (currentGroup.length > 0) {
                            var groupContent = currentGroup
                                .map(function (m) { return m.getText(); })
                                .join("\n");
                            var firstMember = currentGroup[0];
                            var lastMember = currentGroup[currentGroup.length - 1];
                            var startLine = sourceFile_1.getLineAndColumnAtPos(firstMember.getStart()).line;
                            var endLine = sourceFile_1.getLineAndColumnAtPos(lastMember.getEnd()).line;
                            fragments_1.push({
                                type: "".concat(getNodeType(node), "\u6210\u5458\u7EC4"),
                                name: getNodeName(node),
                                content: groupContent,
                                startLine: startLine,
                                endLine: endLine,
                            });
                            // 重置组
                            currentGroup = [member];
                            currentLines = memberLines;
                        }
                        else {
                            // 如果单个成员就超过限制，则单独处理
                            var startLine = sourceFile_1.getLineAndColumnAtPos(member.getStart()).line;
                            var endLine = sourceFile_1.getLineAndColumnAtPos(member.getEnd()).line;
                            fragments_1.push({
                                type: "".concat(getNodeType(node), "\u6210\u5458"),
                                name: getNodeName(node),
                                content: memberText,
                                startLine: startLine,
                                endLine: endLine,
                            });
                        }
                    }
                }
                // 处理最后一组
                if (currentGroup.length > 0) {
                    var groupContent = currentGroup.map(function (m) { return m.getText(); }).join("\n");
                    var firstMember = currentGroup[0];
                    var lastMember = currentGroup[currentGroup.length - 1];
                    var startLine = sourceFile_1.getLineAndColumnAtPos(firstMember.getStart()).line;
                    var endLine = sourceFile_1.getLineAndColumnAtPos(lastMember.getEnd()).line;
                    fragments_1.push({
                        type: "".concat(getNodeType(node), "\u6210\u5458\u7EC4"),
                        name: getNodeName(node),
                        content: groupContent,
                        startLine: startLine,
                        endLine: endLine,
                    });
                }
            }
        }
        // 开始处理源文件
        sourceFile_1.forEachChild(function (node) { return processNode(node); });
        // 如果没有找到任何语法单元，添加整个文件作为片段
        if (fragments_1.length === 0) {
            var totalLines = fileContent.split("\n").length;
            if (totalLines <= MAX_LINES) {
                fragments_1.push({
                    type: "文件",
                    name: fileName,
                    content: fileContent,
                    startLine: 1,
                    endLine: totalLines,
                });
            }
            else {
                // 如果整个文件太大，按行分片
                var lines = fileContent.split("\n");
                var currentChunk = [];
                var startLine = 1;
                var currentLine = 1;
                for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                    var line = lines_1[_i];
                    if (currentChunk.length < MAX_LINES) {
                        currentChunk.push(line);
                        currentLine++;
                    }
                    else {
                        // 添加当前分片
                        fragments_1.push({
                            type: "文件片段",
                            name: "".concat(fileName, " (\u884C ").concat(startLine, "-").concat(currentLine - 1, ")"),
                            content: currentChunk.join("\n"),
                            startLine: startLine,
                            endLine: currentLine - 1,
                        });
                        // 重置
                        currentChunk = [line];
                        startLine = currentLine;
                        currentLine++;
                    }
                }
                // 添加最后一个分片
                if (currentChunk.length > 0) {
                    fragments_1.push({
                        type: "文件片段",
                        name: "".concat(fileName, " (\u884C ").concat(startLine, "-").concat(currentLine - 1, ")"),
                        content: currentChunk.join("\n"),
                        startLine: startLine,
                        endLine: currentLine - 1,
                    });
                }
            }
        }
        return fragments_1;
    }
    catch (error) {
        console.error("\u5904\u7406\u6587\u4EF6 ".concat(filePath, " \u65F6\u51FA\u9519:"), error);
        // 安全获取文件名
        var fileName = getBaseName(filePath);
        // 出错时返回整个文件作为一个片段
        var totalLines = fileContent.split("\n").length;
        // 如果文件太大，分片处理
        if (totalLines > MAX_LINES) {
            var fragments = [];
            var lines = fileContent.split("\n");
            for (var i = 0; i < totalLines; i += MAX_LINES) {
                var endIdx = Math.min(i + MAX_LINES, totalLines);
                var content = lines.slice(i, endIdx).join("\n");
                fragments.push({
                    type: "文件片段",
                    name: "".concat(fileName, " (\u884C ").concat(i + 1, "-").concat(endIdx, ")"),
                    content: content,
                    startLine: i + 1,
                    endLine: endIdx,
                });
            }
            return fragments;
        }
        // 小文件直接返回整个内容
        return [
            {
                type: "文件",
                name: fileName,
                content: fileContent,
                startLine: 1,
                endLine: totalLines,
            },
        ];
    }
}
// 工作线程的处理函数
function worker(data) {
    return __awaiter(this, void 0, void 0, function () {
        var file, content, model, fragments, results, _i, fragments_2, fragment, embedding, error_1, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    file = data.file, content = data.content;
                    model = new ollama_1.OllamaEmbeddings({
                        model: "nomic-embed-text",
                        truncate: true,
                    });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 8, , 9]);
                    fragments = extractCodeFragments(file, content);
                    results = [];
                    _i = 0, fragments_2 = fragments;
                    _a.label = 2;
                case 2:
                    if (!(_i < fragments_2.length)) return [3 /*break*/, 7];
                    fragment = fragments_2[_i];
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, model.embedQuery(fragment.content)];
                case 4:
                    embedding = _a.sent();
                    results.push({
                        file: file,
                        type: fragment.type,
                        name: fragment.name,
                        content: fragment.content,
                        startLine: fragment.startLine,
                        endLine: fragment.endLine,
                        success: true,
                        embedding: embedding,
                    });
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    console.error("\u4E3A\u6587\u4EF6 ".concat(file, " \u4E2D\u7684\u7247\u6BB5\u751F\u6210\u5D4C\u5165\u65F6\u51FA\u9519:"), error_1);
                    return [3 /*break*/, 6];
                case 6:
                    _i++;
                    return [3 /*break*/, 2];
                case 7:
                    // 如果没有成功生成任何嵌入，抛出错误
                    if (results.length === 0) {
                        throw new Error("No embeddings were generated for this file");
                    }
                    return [2 /*return*/, results];
                case 8:
                    error_2 = _a.sent();
                    return [2 /*return*/, [
                            {
                                file: file,
                                success: false,
                                error: error_2 instanceof Error ? error_2.message : String(error_2),
                            },
                        ]];
                case 9: return [2 /*return*/];
            }
        });
    });
}
