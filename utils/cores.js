export const LIMITE_LARANJA = 1800; // 30 min
export const LIMITE_VERMELHO = 3600; // 60 min

export const corPorTempo = (tempoSegundos) => {
  if (tempoSegundos >= LIMITE_VERMELHO) return 'red';
  if (tempoSegundos >= LIMITE_LARANJA) return 'orange';
  return 'black';
};