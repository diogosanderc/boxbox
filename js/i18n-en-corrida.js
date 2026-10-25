// Inglês (britânico): narração da corrida e modos de pilotagem (js/engine.js).
(function () {
  'use strict';
  if (typeof BoxI18n === 'undefined') return;
  BoxI18n.registrar({
    'Atacar': 'Push',
    'Normal': 'Standard',
    'Poupar': 'Conserve',
    'Problema no pit stop de {1}!': 'Problem at the pit stop for {1}!',
    '{1} para nos boxes: {2} → {3} ({4}s)': '{1} pits: {2} → {3} ({4}s)',
    '{1} abandona: {2}!': '{1} retires: {2}!',
    '{1} ultrapassa {2} pela P{3}': '{1} overtakes {2} for P{3}',
    '{1} ultrapassa {2} pela P{3} com o DRS': '{1} overtakes {2} for P{3} using DRS',
    'Safety car recolhido. Relargada!': 'Safety Car in. Racing resumes!',
    'SAFETY CAR na pista!': 'SAFETY CAR deployed!',
    '{1} punido em {2}s (não usou dois compostos)': '{1} given a {2}s penalty (failed to use two tyre compounds)',
    '{1} vence o {2}!': '{1} wins the {2}!',
    'Superlicença: não consegui gravar o save': 'Super Licence: could not write the save file',
  });
})();
