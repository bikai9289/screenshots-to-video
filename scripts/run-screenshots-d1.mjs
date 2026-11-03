import { spawn } from 'node:child_process';
const child=spawn(process.execPath,['node_modules/vitest/vitest.mjs','run','src/modules/screenshots/service.test.ts','--maxWorkers=1','--minWorkers=1'],{
  stdio:'inherit',env:{...process.env,ATOMIC_D1:'1'},
});
child.on('error',()=>{process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
