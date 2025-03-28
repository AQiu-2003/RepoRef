import { OllamaEmbeddings } from "@langchain/ollama";
import { Project, Node, ts, SyntaxKind } from "ts-morph";
import path from "path";

// 定义分片类型
type CodeFragment = {
  type: string;
  name: string | undefined;
  content: string;
  startLine: number;
  endLine: number;
};

// 定义工作线程结果类型
type WorkerResult = {
  file: string;
  type?: string;
  name?: string | undefined;
  content?: string;
  startLine?: number;
  endLine?: number;
  success: boolean;
  embedding?: number[];
  error?: string;
};

// 最大行数限制
const MAX_LINES = 50;

// 计算文本的行数
function countLines(text: string): number {
  return text.split("\n").length;
}

// 获取文件名，安全处理文件路径
function getBaseName(filePath: string | undefined): string {
  if (!filePath) return "未知文件";
  try {
    return path.basename(filePath);
  } catch (error) {
    console.error(`无法获取文件名: ${filePath}`, error);
    return "未知文件";
  }
}

// 根据语法节点的类型获取节点名称
function getNodeName(node: Node): string | undefined {
  // 尝试获取各种类型的名称
  if (
    Node.isClassDeclaration(node) ||
    Node.isFunctionDeclaration(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isInterfaceDeclaration(node) ||
    Node.isEnumDeclaration(node) ||
    Node.isTypeAliasDeclaration(node)
  ) {
    const identifier = node.getFirstDescendantByKind(SyntaxKind.Identifier);
    return identifier?.getText();
  }

  // 对于箭头函数、函数表达式等尝试获取变量名称
  if (Node.isVariableDeclaration(node)) {
    const identifier = node.getFirstDescendantByKind(SyntaxKind.Identifier);
    return identifier?.getText();
  }

  return undefined;
}

// 根据节点类型获取节点的类型描述
function getNodeType(node: Node): string {
  if (Node.isClassDeclaration(node)) return "类";
  if (Node.isFunctionDeclaration(node)) return "函数";
  if (Node.isMethodDeclaration(node)) return "方法";
  if (Node.isInterfaceDeclaration(node)) return "接口";
  if (Node.isEnumDeclaration(node)) return "枚举";
  if (Node.isTypeAliasDeclaration(node)) return "类型别名";
  if (Node.isVariableDeclaration(node)) {
    // 检查是否为箭头函数
    if (node.getFirstDescendantByKind(SyntaxKind.ArrowFunction))
      return "箭头函数";
    if (node.getFirstDescendantByKind(SyntaxKind.FunctionExpression))
      return "函数表达式";
  }
  if (Node.isPropertyDeclaration(node)) return "属性";
  return "代码片段";
}

// 从源文件中提取所有语法单元
function extractCodeFragments(
  filePath: string,
  fileContent: string
): CodeFragment[] {
  try {
    // 安全获取文件名
    const fileName = getBaseName(filePath);

    const project = new Project();
    const sourceFile = project.createSourceFile(fileName, fileContent, {
      overwrite: true,
    });

    const fragments: CodeFragment[] = [];

    // 提取主要语法单元
    function processNode(node: Node) {
      // 只处理我们关注的顶级语法单元
      if (
        Node.isClassDeclaration(node) ||
        Node.isFunctionDeclaration(node) ||
        Node.isInterfaceDeclaration(node) ||
        Node.isEnumDeclaration(node) ||
        Node.isTypeAliasDeclaration(node)
      ) {
        const content = node.getText();
        const lines = countLines(content);

        if (lines <= MAX_LINES) {
          // 如果单元小于行数限制，直接添加
          const { line: startLine } = sourceFile.getLineAndColumnAtPos(
            node.getStart()
          );
          const { line: endLine } = sourceFile.getLineAndColumnAtPos(
            node.getEnd()
          );

          fragments.push({
            type: getNodeType(node),
            name: getNodeName(node),
            content,
            startLine,
            endLine,
          });
        } else {
          // 单元过大时，需要进一步处理
          processLargeNode(node);
        }
      } else if (Node.isVariableStatement(node)) {
        // 处理变量声明，可能包含箭头函数或函数表达式
        const declarations = node.getDeclarations();
        for (const decl of declarations) {
          const hasFunction =
            decl.getFirstDescendantByKind(SyntaxKind.ArrowFunction) ||
            decl.getFirstDescendantByKind(SyntaxKind.FunctionExpression);

          if (hasFunction) {
            const content = decl.getText();
            const lines = countLines(content);

            if (lines <= MAX_LINES) {
              const { line: startLine } = sourceFile.getLineAndColumnAtPos(
                decl.getStart()
              );
              const { line: endLine } = sourceFile.getLineAndColumnAtPos(
                decl.getEnd()
              );

              fragments.push({
                type: getNodeType(decl),
                name: getNodeName(decl),
                content,
                startLine,
                endLine,
              });
            } else {
              processLargeNode(decl);
            }
          }
        }
      }

      // 递归处理子节点
      node.forEachChild((child) => processNode(child));
    }

    // 处理大型语法单元的函数
    function processLargeNode(node: Node) {
      // 对于类，处理每个方法
      if (Node.isClassDeclaration(node)) {
        const members = node.getMembers();
        for (const member of members) {
          if (
            Node.isMethodDeclaration(member) ||
            Node.isPropertyDeclaration(member)
          ) {
            const content = member.getText();
            const lines = countLines(content);

            if (lines <= MAX_LINES) {
              const { line: startLine } = sourceFile.getLineAndColumnAtPos(
                member.getStart()
              );
              const { line: endLine } = sourceFile.getLineAndColumnAtPos(
                member.getEnd()
              );

              fragments.push({
                type: getNodeType(member),
                name: getNodeName(member),
                content,
                startLine,
                endLine,
              });
            }
          }
        }
      } else if (
        Node.isInterfaceDeclaration(node) ||
        Node.isEnumDeclaration(node)
      ) {
        // 对于接口和枚举，处理每个成员
        const members = node.getMembers();

        // 将成员按组处理，以保持在行数限制内
        let currentGroup: Node[] = [];
        let currentLines = 0;

        for (const member of members) {
          const memberText = member.getText();
          const memberLines = countLines(memberText);

          if (currentLines + memberLines <= MAX_LINES) {
            currentGroup.push(member);
            currentLines += memberLines;
          } else {
            // 处理当前组
            if (currentGroup.length > 0) {
              const groupContent = currentGroup
                .map((m) => m.getText())
                .join("\n");
              const firstMember = currentGroup[0];
              const lastMember = currentGroup[currentGroup.length - 1];

              const { line: startLine } = sourceFile.getLineAndColumnAtPos(
                firstMember.getStart()
              );
              const { line: endLine } = sourceFile.getLineAndColumnAtPos(
                lastMember.getEnd()
              );

              fragments.push({
                type: `${getNodeType(node)}成员组`,
                name: getNodeName(node),
                content: groupContent,
                startLine,
                endLine,
              });

              // 重置组
              currentGroup = [member];
              currentLines = memberLines;
            } else {
              // 如果单个成员就超过限制，则单独处理
              const { line: startLine } = sourceFile.getLineAndColumnAtPos(
                member.getStart()
              );
              const { line: endLine } = sourceFile.getLineAndColumnAtPos(
                member.getEnd()
              );

              fragments.push({
                type: `${getNodeType(node)}成员`,
                name: getNodeName(node),
                content: memberText,
                startLine,
                endLine,
              });
            }
          }
        }

        // 处理最后一组
        if (currentGroup.length > 0) {
          const groupContent = currentGroup.map((m) => m.getText()).join("\n");
          const firstMember = currentGroup[0];
          const lastMember = currentGroup[currentGroup.length - 1];

          const { line: startLine } = sourceFile.getLineAndColumnAtPos(
            firstMember.getStart()
          );
          const { line: endLine } = sourceFile.getLineAndColumnAtPos(
            lastMember.getEnd()
          );

          fragments.push({
            type: `${getNodeType(node)}成员组`,
            name: getNodeName(node),
            content: groupContent,
            startLine,
            endLine,
          });
        }
      }
    }

    // 开始处理源文件
    sourceFile.forEachChild((node) => processNode(node));

    // 如果没有找到任何语法单元，添加整个文件作为片段
    if (fragments.length === 0) {
      const totalLines = fileContent.split("\n").length;

      if (totalLines <= MAX_LINES) {
        fragments.push({
          type: "文件",
          name: fileName,
          content: fileContent,
          startLine: 1,
          endLine: totalLines,
        });
      } else {
        // 如果整个文件太大，按行分片
        const lines = fileContent.split("\n");
        let currentChunk: string[] = [];
        let startLine = 1;
        let currentLine = 1;

        for (const line of lines) {
          if (currentChunk.length < MAX_LINES) {
            currentChunk.push(line);
            currentLine++;
          } else {
            // 添加当前分片
            fragments.push({
              type: "文件片段",
              name: `${fileName} (行 ${startLine}-${currentLine - 1})`,
              content: currentChunk.join("\n"),
              startLine,
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
          fragments.push({
            type: "文件片段",
            name: `${fileName} (行 ${startLine}-${currentLine - 1})`,
            content: currentChunk.join("\n"),
            startLine,
            endLine: currentLine - 1,
          });
        }
      }
    }

    return fragments;
  } catch (error) {
    console.error(`处理文件 ${filePath} 时出错:`, error);
    // 安全获取文件名
    const fileName = getBaseName(filePath);

    // 出错时返回整个文件作为一个片段
    const totalLines = fileContent.split("\n").length;

    // 如果文件太大，分片处理
    if (totalLines > MAX_LINES) {
      const fragments: CodeFragment[] = [];
      const lines = fileContent.split("\n");

      for (let i = 0; i < totalLines; i += MAX_LINES) {
        const endIdx = Math.min(i + MAX_LINES, totalLines);
        const content = lines.slice(i, endIdx).join("\n");

        fragments.push({
          type: "文件片段",
          name: `${fileName} (行 ${i + 1}-${endIdx})`,
          content,
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

interface WorkerData {
  file: string;
  content: string;
}

// 工作线程的处理函数
export default async function worker(
  data: WorkerData
): Promise<WorkerResult[]> {
  const { file, content } = data;
  const model = new OllamaEmbeddings({
    model: "nomic-embed-text",
    truncate: true,
  });

  try {
    // 使用 ts-morph 提取代码片段
    const fragments = extractCodeFragments(file, content);

    // 处理每个片段
    const results: WorkerResult[] = [];

    for (const fragment of fragments) {
      try {
        // 为每个片段生成嵌入
        const embedding = await model.embedQuery(fragment.content);

        results.push({
          file,
          type: fragment.type,
          name: fragment.name,
          content: fragment.content,
          startLine: fragment.startLine,
          endLine: fragment.endLine,
          success: true,
          embedding,
        });
      } catch (error) {
        console.error(`为文件 ${file} 中的片段生成嵌入时出错:`, error);
      }
    }

    // 如果没有成功生成任何嵌入，抛出错误
    if (results.length === 0) {
      throw new Error("No embeddings were generated for this file");
    }

    return results;
  } catch (error) {
    return [
      {
        file,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
    ];
  }
}
