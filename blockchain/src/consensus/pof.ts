interface Validator {
  address: string;
  stake: number;
  flowScore: number;
}

const LAMBDA = 0.35;

export function selectProposer(validators: Validator[]): Validator {
  const totalStake = validators.reduce((sum, v) => sum + v.stake, 0);
  const totalFlow = validators.reduce((sum, v) => sum + v.flowScore, 0);
  const weights = validators.map(v => {
    const normStake = totalStake ? v.stake / totalStake : 0;
    const normFlow = totalFlow ? v.flowScore / totalFlow : 0;
    return (1 - LAMBDA) * normStake + LAMBDA * normFlow;
  });
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * sumWeights;
  for (let i = 0; i < validators.length; i++) {
    if (r < weights[i]) return validators[i];
    r -= weights[i];
  }
  return validators[validators.length - 1];
}
