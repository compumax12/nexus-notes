import assert from 'node:assert/strict';
import {RECOVERY_TTL_MS,RECOVERY_FUTURE_TOLERANCE_MS,recoveryCodeExpired} from '../lib/recovery-ttl.mjs';

const ahora=1_000_000;
const fecha=desplazamiento=>new Date(ahora+desplazamiento).toISOString();

assert.equal(RECOVERY_TTL_MS,900000);
assert.equal(RECOVERY_FUTURE_TOLERANCE_MS,60000);

// Un código recién creado y el límite exacto siguen vigentes; 1 ms más ya no.
assert.equal(recoveryCodeExpired(fecha(0),ahora),false);
assert.equal(recoveryCodeExpired(fecha(-RECOVERY_TTL_MS),ahora),false);
assert.equal(recoveryCodeExpired(fecha(-RECOVERY_TTL_MS+1),ahora),false);
assert.equal(recoveryCodeExpired(fecha(-RECOVERY_TTL_MS-1),ahora),true);

// Fechas inválidas y futuras más allá de la tolerancia se rechazan.
for(const valor of ['','no-es-fecha',null,undefined])assert.equal(recoveryCodeExpired(valor,ahora),true);
assert.equal(recoveryCodeExpired(fecha(RECOVERY_FUTURE_TOLERANCE_MS),ahora),false);
assert.equal(recoveryCodeExpired(fecha(RECOVERY_FUTURE_TOLERANCE_MS+1),ahora),true);

// El reloj por defecto también acepta un código creado ahora mismo.
assert.equal(recoveryCodeExpired(new Date().toISOString()),false);

console.log('PASS: vigencia de 15 minutos con límite inclusivo, tolerancia futura de 1 minuto y rechazo de fechas inválidas.');
