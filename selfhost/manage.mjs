import {getAccounts,getStorage} from './runtime.mjs';
const [action,email,name]=process.argv.slice(2);
try{
 const service=await getAccounts();
 if(action==='invite'&&email&&name){const code=await service.invite(email,name);console.log('Invitación válida por 24 horas. Entrégala solo a su destinatario, fuera de GitHub.');console.log(code);}
 else if(action==='disable'&&email){await service.disable(email);console.log('Cuenta desactivada; sesiones revocadas. Sus datos se conservan.');}
 else if(action==='admin'&&email){await service.grantAdmin(email);console.log('Administrador asignado. Entra en Configuración para gestionar usuarios.');}
 else throw new Error('Uso: node selfhost/manage.mjs invite CORREO "NOMBRE" | disable USUARIO | admin USUARIO');
}finally{getStorage().close();}
