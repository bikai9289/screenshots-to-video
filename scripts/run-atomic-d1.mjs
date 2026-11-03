import { spawn } from 'node:child_process';
const child=spawn(process.execPath,['--import','tsx','--test','tests/atomic.test.ts'],{
  stdio:'inherit',env:{...process.env,ATOMIC_D1:'1'},
});
child.on('error',()=>{process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
