import nodemailer from 'nodemailer';
import {readFileSync} from 'node:fs';
export function recoveryMailer(){
 const user=process.env.NEXUS_SMTP_USER?.trim();
 if(!user)throw new Error('Falta NEXUS_SMTP_USER: configura explícitamente el remitente SMTP.');
 const pass=process.env.NEXUS_SMTP_PASSWORD_FILE?readFileSync(process.env.NEXUS_SMTP_PASSWORD_FILE,'utf8').trim():process.env.NEXUS_SMTP_PASSWORD;
 if(!pass)throw new Error('Correo de recuperación no configurado. Contacta al administrador.');
 const port=Number(process.env.NEXUS_SMTP_PORT||465);
 if(![465,587].includes(port))throw new Error('SMTP requiere el puerto 465 o 587.');
 const transport=nodemailer.createTransport({host:process.env.NEXUS_SMTP_HOST||'smtp.gmail.com',port,secure:port===465,requireTLS:true,auth:{user,pass},tls:{minVersion:'TLSv1.2'},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,disableFileAccess:true,disableUrlAccess:true});
 return async(to,code)=>{
  await transport.sendMail({from:{name:'Nexus Notes',address:user},to:{address:to},subject:'Tu código para recuperar Nexus Notes',text:`Tu código de recuperación es: ${code}\n\nCaduca en 10 minutos y solo puede utilizarse una vez.\nSi no solicitaste este cambio, ignora el mensaje. Nunca compartas este código.`});
 };
}
