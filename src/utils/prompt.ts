import fs from "fs-extra";
import path from "path";
import { getRepoDir } from "./config.js";

/**
 * 获取路径及其所有父目录中的 .reporef.md 或 .rr.md 文件内容
 * @param repoName 仓库名称
 * @param targetPath 目标路径
 * @param includeRoot 是否包含根目录的提示文件
 * @returns 找到的提示文件内容数组，每项包含路径和内容
 */
export async function getPromptFiles(
  repoName: string,
  targetPath: string,
  includeRoot: boolean = false
): Promise<Array<{ path: string; content: string }>> {
  const repoDir = getRepoDir(repoName);
  const results: Array<{ path: string; content: string }> = [];
  
  // 分解路径为各级目录
  const pathParts = targetPath.split('/').filter(part => part.length > 0);
  
  // 如果目标是文件而不是目录，去掉最后一个部分
  let isFile = false;
  try {
    const fullPath = path.join(repoDir, targetPath);
    if (await fs.pathExists(fullPath)) {
      const stats = await fs.stat(fullPath);
      isFile = stats.isFile();
    }
  } catch (error) {
    // 忽略错误，假设是文件
    isFile = true;
  }
  
  if (isFile && pathParts.length > 0) {
    pathParts.pop();
  }
  
  // 从目标路径开始，向上遍历所有父目录
  let currentPath = "";
  
  // 如果需要包含根目录
  if (includeRoot) {
    // 检查根目录
    for (const fileName of [".reporef.md", ".rr.md"]) {
      const promptFilePath = path.join(repoDir, fileName);
      if (await fs.pathExists(promptFilePath)) {
        try {
          const content = await fs.readFile(promptFilePath, "utf8");
          results.push({ 
            path: fileName,
            content 
          });
          // 一个目录只需要一个提示文件
          break;
        } catch (error) {
          console.warn(`Failed to read prompt file ${promptFilePath}:`, error);
        }
      }
    }
  }
  
  // 从最深层开始向上遍历各级目录
  for (let i = 0; i < pathParts.length; i++) {
    currentPath = pathParts.slice(0, i + 1).join("/");
    
    for (const fileName of [".reporef.md", ".rr.md"]) {
      const promptFilePath = path.join(repoDir, currentPath, fileName);
      if (await fs.pathExists(promptFilePath)) {
        try {
          const content = await fs.readFile(promptFilePath, "utf8");
          results.push({ 
            path: path.join(currentPath, fileName),
            content 
          });
          // 一个目录只需要一个提示文件
          break;
        } catch (error) {
          console.warn(`Failed to read prompt file ${promptFilePath}:`, error);
        }
      }
    }
  }
  
  return results;
} 