import {defineConfig} from 'vite';
import vinext from 'vinext';
import path from 'node:path';
export default defineConfig({
 resolve:{alias:{'cloudflare:workers':path.resolve('selfhost/runtime.mjs')}},
 plugins:[{
  name:'nexus-local-runtime',enforce:'pre',
  load(id){
   const file=id.replaceAll('\\','/').split('?')[0];
   const replacements:Record<string,[string,boolean]>={
    '/app/chatgpt-auth.ts':['identity.ts',false],'/app/page.tsx':['page.tsx',true],
    '/app/lock-screen.tsx':['login.tsx',true],'/app/api/lock/route.ts':['lock-route.ts',false],
    '/app/api/recovery/route.ts':['recovery-route.ts',false],'/app/api/maintenance/route.ts':['maintenance-route.ts',false],
    '/app/api/users/route.ts':['users-route.ts',false],
   };
   for(const [suffix,[target,hasDefault]] of Object.entries(replacements))if(file.endsWith(suffix)){const from=JSON.stringify(path.resolve('selfhost',target).replaceAll('\\','/'));return `export * from ${from};${hasDefault?`export {default} from ${from};`:''}`;}
  },
  transform(code,id){
   const file=id.replaceAll('\\','/').split('?')[0];
   if(file.endsWith('/app/dashboard.tsx')||file.endsWith('/app/notes.tsx'))code=code.replaceAll('Correo de ChatGPT de la persona','Correo registrado de la persona').replace('La persona también debe tener acceso a Nexus Notes desde Sites.','La persona debe tener una cuenta en esta instalación de Nexus Notes.').replace('La persona también necesita acceso a Nexus Notes en Sites.','La persona necesita una cuenta en esta instalación de Nexus Notes.');
   if(file.endsWith('/app/dashboard.tsx')||file.endsWith('/app/notes.tsx'))return code;
   if(file.endsWith('/app/settings.tsx'))code=code.replace('import { useState }', 'import LocalUsers from "../selfhost/users";\nimport { useState }').replace(/<p>Cada persona entra[^]*?<\/a>/,'<LocalUsers/>');
   if(file.endsWith('/app/settings.tsx'))return code.replace('Cada persona entra con su propia cuenta de ChatGPT y crea su usuario y contraseña al acceder por primera vez. Sus tareas comienzan privadas.','Cada persona entra con su cuenta propia de Nexus Notes. Sus tareas comienzan privadas.').replace('Para añadir a otra persona, el propietario debe habilitar su correo en Compartir de Sites. Después, comparte tareas concretas desde su formulario. Crear un usuario no da acceso a tus tareas.','El administrador crea una invitación desde la consola del servidor. Después puedes compartir tareas y apuntes con el correo invitado.').replace(/<a className="secondary" href="https:\/\/chatgpt.com\/sites"[^]*?<\/a>/,'').replaceAll('contraseña adicional','contraseña');
   if(file.endsWith('/app/recovery.tsx'))return code.replace('recuperar tu usuario y restablecer la contraseña','restablecer tu contraseña').replace('Necesitarás seguir teniendo acceso a tu cuenta de ChatGPT.','Guarda también tu nombre de usuario: ambos serán necesarios para recuperar el acceso.').replaceAll('contraseña adicional','contraseña');
   if(file.endsWith('/app/cloud-backups.tsx'))return code.replaceAll('Respaldos en la nube','Respaldos del servidor').replaceAll('Copias diarias','Copias guardadas').replaceAll('almacenamiento separado de la base de trabajo','la carpeta de respaldos del servidor');
  },
 },vinext({rscOutDir:'dist-selfhost/server',ssrOutDir:'dist-selfhost/server/ssr',clientOutDir:'dist-selfhost/client'})],
});
