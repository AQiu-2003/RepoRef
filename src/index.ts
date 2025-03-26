/**
 * simple-git示例 - 克隆仓库并切换分支
 */

import simpleGit, { SimpleGit } from "simple-git";

async function cloneAndCheckout() {
  try {
    // 初始化git实例
    const git: SimpleGit = simpleGit();

    // 仓库地址和目标目录
    const repoUrl = "ssh://git";
    const targetDir = "./repo";

    console.log(`开始克隆仓库: ${repoUrl}`);

    // 克隆仓库
    await git.clone(repoUrl, targetDir);
    console.log("仓库克隆完成");

    // 切换到目标目录中的git实例
    const repoGit: SimpleGit = simpleGit(targetDir);

    // 切换到指定分支
    const targetBranch = "develop/2.x";
    await repoGit.checkout(targetBranch);
    console.log(`已成功切换到分支: ${targetBranch}`);

    // 获取当前分支信息
    const branchSummary = await repoGit.branch();
    console.log(`当前分支: ${branchSummary.current}`);
  } catch (error) {
    console.error("操作失败:", error);
  }
}

// 执行克隆和切换分支操作
cloneAndCheckout();

export { cloneAndCheckout };
