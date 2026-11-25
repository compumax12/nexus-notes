import path from 'node:path';
import {openStorage} from './storage.mjs';
import {accounts} from './accounts.mjs';
let storage,service;
export function getStorage(){return storage??=openStorage({dataDirectory:path.resolve(process.env.NEXUS_DATA_DIR||'.nexus-data'),migrationsDirectory:path.resolve('drizzle')});}
export const getAccounts=()=>service??=accounts(getStorage().DB);
export const env={get DB(){return getStorage().DB;},get BUCKET(){return getStorage().BUCKET;}};
