import nodemailer from 'nodemailer';
import {readFileSync} from 'node:fs';
try {
 const user=process.env.NEXUS_SMTP_USER;
 const pass=readFileSync(process.env.NEXUS_SMTP_PASSWORD_FILE,'utf8').trim();
 const transport=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user,pass},tls:{minVersion:'TLSv1.2'},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
 await transport.verify();
 transport.close();
 console.log('Conexion y autenticacion SMTP verificadas. La entrega real aun debe probarse.');
} catch {
 console.error('No se pudo verificar Gmail. Revisa la contrasena de aplicacion, la verificacion en dos pasos y la conexion.');
 process.exitCode=1;
}
