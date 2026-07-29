import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generarCodigo, mensajeErrorSupabase, filtrarEnvios } from '../js/ui.js';

test('genera códigos únicos y reconoce errores de permisos', () => {
  const primero = generarCodigo();
  const segundo = generarCodigo();

  assert.match(primero, /^SGLI-[0-9A-F]{8}$/);
  assert.notEqual(primero, segundo);
  assert.match(
    mensajeErrorSupabase({ code: '42501', message: 'permission denied' }),
    /permisos/i,
  );
});

test('filtra los envíos por texto y estado', () => {
  const envios = [
    { codigo: 'SGLI-UNO', ciudad_origen: 'La Paz', ciudad_destino: 'Lima', mercancia: 'Textiles', clase: 'transito' },
    { codigo: 'SGLI-DOS', ciudad_origen: 'Oruro', ciudad_destino: 'Santos', mercancia: 'Café', clase: 'aduana' },
  ];

  assert.deepEqual(filtrarEnvios(envios, 'santos', 'aduana'), [envios[1]]);
  assert.deepEqual(filtrarEnvios(envios, 'la paz', ''), [envios[0]]);
});

test('usa desplegables para seleccionar envíos activos', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of ['op-codigo', 'ad-codigo', 'al-codigo']) {
    assert.match(html, new RegExp(`<select id="${id}"`));
  }
});

test('carga transportistas antes de dibujar el panel operador', () => {
  const codigo = readFileSync(
    new URL('../js/modules/operador.js', import.meta.url),
    'utf8',
  );
  assert.match(codigo, /await cargarTransportistas\(\);\s+await cargarEnviosOperador\(\);/);
});

test('registra seguimiento desde todos los módulos logísticos', () => {
  for (const modulo of ['cliente', 'operador', 'aduana', 'almacen']) {
    const codigo = readFileSync(
      new URL(`../js/modules/${modulo}.js`, import.meta.url),
      'utf8',
    );
    assert.match(codigo, /asegurarEventoSeguimiento/);
  }
});

test('actualiza el resumen en vivo y guarda su mismo código', () => {
  const codigo = readFileSync(
    new URL('../js/modules/cliente.js', import.meta.url),
    'utf8',
  );
  assert.match(codigo, /addEventListener\('input', actualizarResumenEnvio\)/);
  assert.match(codigo, /codigo: codigoBorrador \|\| generarCodigo\(\)/);
  assert.match(codigo, /poner\('preview-dimensiones'/);
});
