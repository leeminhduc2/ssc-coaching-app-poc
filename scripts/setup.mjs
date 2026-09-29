import {existsSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
if(Number(process.versions.node.split('.')[0])<22)throw new Error('Ứng dụng cần Node.js 22 trở lên.');
if(!existsSync('.env')){writeFileSync('.env',`DATABASE_URL=postgresql://ssc:ssc_local@127.0.0.1:55432/ssc?schema=public\nAPP_BASE_URL=http://localhost:5173\nPORT=3001\nDEMO_MODE=true\nFIELD_ENCRYPTION_KEY=${randomBytes(32).toString('hex')}\nPAYMENT_WEBHOOK_SECRET=${randomBytes(32).toString('hex')}\n`);console.log('Đã tạo .env với khóa ngẫu nhiên.')}else console.log('Giữ nguyên .env hiện có.');
