import Dashboard from '../app/dashboard';
import {getChatGPTUser} from './identity';
import Login from './login';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getChatGPTUser();return user?<Dashboard displayName={user.displayName} email={user.email}/>:<Login/>;}
