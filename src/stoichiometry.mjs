/** Ideal completion of fixed, balanced reactions. All supplied amounts are moles. */
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export const REACTIONS = freeze([
  {
    id: 'water', name: 'Water formation', equation: '2 H₂ + O₂ → 2 H₂O',
    reactants: [
      { id: 'h2', formula: 'H₂', name: 'Hydrogen', coefficient: 2, atoms: { H: 2 } },
      { id: 'o2', formula: 'O₂', name: 'Oxygen', coefficient: 1, atoms: { O: 2 } }
    ],
    products: [{ id: 'h2o', formula: 'H₂O', name: 'Water', coefficient: 2, atoms: { H: 2, O: 1 } }],
    example: ['6', '2']
  },
  {
    id: 'ammonia', name: 'Ammonia formation', equation: 'N₂ + 3 H₂ → 2 NH₃',
    reactants: [
      { id: 'n2', formula: 'N₂', name: 'Nitrogen', coefficient: 1, atoms: { N: 2 } },
      { id: 'h2', formula: 'H₂', name: 'Hydrogen', coefficient: 3, atoms: { H: 2 } }
    ],
    products: [{ id: 'nh3', formula: 'NH₃', name: 'Ammonia', coefficient: 2, atoms: { N: 1, H: 3 } }],
    example: ['2', '3']
  },
  {
    id: 'magnesium', name: 'Magnesium oxide formation', equation: '2 Mg + O₂ → 2 MgO',
    reactants: [
      { id: 'mg', formula: 'Mg', name: 'Magnesium', coefficient: 2, atoms: { Mg: 1 } },
      { id: 'o2', formula: 'O₂', name: 'Oxygen', coefficient: 1, atoms: { O: 2 } }
    ],
    products: [{ id: 'mgo', formula: 'MgO', name: 'Magnesium oxide', coefficient: 2, atoms: { Mg: 1, O: 1 } }],
    example: ['1.5', '1']
  }
]);

export const MODEL_NOTE = 'Ideal stoichiometric completion only: the stated reaction proceeds until a reactant is exhausted, with no side reactions. These are theoretical amounts, not a prediction of experimental yield, reaction rate or equilibrium. No experimental procedure is provided.';

/** Integer millimoles keep the limiting-reactant comparison exact for admitted inputs. */
export function parseMoles(text) {
  if (typeof text !== 'string' || text.length > 32 || !/^(?:\d+(?:\.\d{1,3})?|\.\d{1,3})$/.test(text.trim())) {
    throw new Error('Enter moles as a decimal from 0 to 1000, with at most three decimal places.');
  }
  const [whole, fraction = ''] = text.trim().split('.');
  const millimoles = Number(whole || '0') * 1000 + Number(fraction.padEnd(3, '0'));
  if (!Number.isSafeInteger(millimoles) || millimoles < 0 || millimoles > 1000000) {
    throw new Error('Each starting amount must be between 0 and 1000 mol.');
  }
  return millimoles;
}

export function solveReaction(reactionId, amounts) {
  const reaction = REACTIONS.find(item => item.id === reactionId);
  if (!reaction) throw new Error('Choose one of the authored balanced reactions.');
  if (!Array.isArray(amounts) || amounts.length !== 2) throw new Error('Supply both reactant amounts in moles.');
  const mm = [parseMoles(amounts[0]), parseMoles(amounts[1])];
  const [a, b] = reaction.reactants;
  const comparison = mm[0] * b.coefficient - mm[1] * a.coefficient;
  const limitingIndex = comparison <= 0 ? 0 : 1;
  const limiting = reaction.reactants[limitingIndex];
  const extent = mm[limitingIndex] / (1000 * limiting.coefficient);
  const classification = extent === 0 ? 'no-product' : comparison === 0 ? 'matched' : limitingIndex === 0 ? 'first' : 'second';
  const reactants = reaction.reactants.map((item, index) => {
    // This integer numerator also avoids cancellation that could create negative excess.
    const remaining = (mm[index] * limiting.coefficient - mm[limitingIndex] * item.coefficient) / (1000 * limiting.coefficient);
    return { ...item, initial: mm[index] / 1000, capacity: mm[index] / (1000 * item.coefficient), consumed: item.coefficient * extent, remaining };
  });
  const products = reaction.products.map(item => ({ ...item, formed: item.coefficient * extent }));
  return freeze({ reaction, inputs: amounts.map(value => value.trim()), classification, extent, reactants, products });
}

export function formatMoles(value) {
  if (!Number.isFinite(value) || value < 0) throw new Error('A displayed amount must be finite and nonnegative.');
  return value === 0 ? '0' : Number(value.toPrecision(8)).toString();
}

export function outcomeText(result) {
  if (result.classification === 'no-product') return 'No product can form from these starting amounts.';
  if (result.classification === 'matched') return 'Exact reaction ratio: neither reactant remains.';
  const index = result.classification === 'first' ? 0 : 1;
  return `${result.reactants[index].name} limits the theoretical product.`;
}

export function workedRecord(result, prediction = '') {
  const choices = { first: `${result.reactants[0].name} alone limits with product formed, leaving excess ${result.reactants[1].name.toLowerCase()}`, second: `${result.reactants[1].name} alone limits with product formed, leaving excess ${result.reactants[0].name.toLowerCase()}`, matched: 'Exact ratio with product formed and neither reactant left', 'no-product': 'No product can form' };
  if (prediction && !Object.hasOwn(choices, prediction)) throw new Error('Unknown prediction.');
  return [
    'RecallWeave — Stoichiometry worked record',
    result.reaction.equation,
    '',
    `Prediction: ${prediction ? choices[prediction] : 'Not recorded'}`,
    outcomeText(result),
    '',
    ...result.reactants.map(item => `${item.formula}: ${formatMoles(item.initial)} mol ÷ coefficient ${item.coefficient} = ${formatMoles(item.capacity)} mol of reaction extent available`),
    `Shared extent = the smaller capacity = ${formatMoles(result.extent)} mol`,
    '',
    ...result.products.map(item => `Theoretical ${item.formula}: ${item.coefficient} × ${formatMoles(result.extent)} = ${formatMoles(item.formed)} mol`),
    ...result.reactants.map(item => `${item.formula}: ${formatMoles(item.initial)} mol initially; ${formatMoles(item.consumed)} mol consumed; ${formatMoles(item.remaining)} mol remaining`),
    '',
    'Input resolution: 0.001 mol. Calculated amounts may be rounded for display.',
    MODEL_NOTE,
    '',
    'Background references: OpenStax Chemistry 2e, sections 4.3 and 4.4.',
    'https://openstax.org/books/chemistry-2e/pages/4-3-reaction-stoichiometry',
    'https://openstax.org/books/chemistry-2e/pages/4-4-reaction-yields',
    'Original examples and teaching text by HAMON estate contributor 87eaaf0fdf63.',
    ''
  ].join('\n');
}
