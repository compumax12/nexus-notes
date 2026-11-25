import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {getAccounts} from './runtime.mjs';
export type ChatGPTUser={userId:string;email:string;displayName:string;fullName:string|null;username:string};
// Deliberately never read OAI headers. Only our hashed server session is trusted.
export async function getChatGPTUser():Promise<ChatGPTUser|null>{return (await getAccounts()).identity((await cookies()).get('mi-avance-unlock')?.value);}
export async function requireChatGPTUser(_returnTo:string){const user=await getChatGPTUser();if(!user)redirect('/');return user;}
export const chatGPTSignInPath=()=>'/';
export const chatGPTSignOutPath=()=>'/';
