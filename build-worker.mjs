import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

async function buildWorker() {
  try {
    // 创建构建输出目录
    await fs.mkdirp('dist');
    
    // 编译 worker.cts 到 worker.cjs
    console.log('编译 worker.cts 到 worker.cjs...');
    
    // 使用 tsc 编译 worker.cts 到 dist 目录
    const tscCommand = 'npx tsc worker.cts --outDir dist --module CommonJS --target ES2020 --esModuleInterop';
    
    exec(tscCommand, async (error, stdout, stderr) => {
      if (error) {
        console.error(`编译错误: ${error.message}`);
        return;
      }
      
      if (stderr) {
        console.error(`编译警告: ${stderr}`);
      }
      
      // 复制 dist/worker.cjs 到根目录
      try {
        await fs.copy('dist/worker.cjs', 'worker.cjs');
        console.log('成功: worker.cjs 已生成');
      } catch (err) {
        console.error('复制 worker.cjs 失败:', err);
      }
    });
  } catch (err) {
    console.error('构建失败:', err);
  }
}

buildWorker(); 