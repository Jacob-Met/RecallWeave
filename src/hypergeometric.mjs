/** Exact finite-population count model; no sampling or measured-data claims. */
export const MAX_POPULATION = 200;
function integer(value, name, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(name + " must be a whole number from " + minimum + " to " + maximum + ".");
  }
  return value;
}
export function parseWhole(text, name = "Value") {
  if (typeof text !== "string" || !/^\s*[0-9]{1,3}\s*$/.test(text)) {
    throw new Error(name + " must contain only whole-number digits.");
  }
  return Number(text.trim());
}
export function admit(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Supply population, marked, draws and event endpoints.");
  const population = integer(input.population, "Population N", 1, MAX_POPULATION);
  const marked = integer(input.marked, "Marked K", 0, population);
  const draws = integer(input.draws, "Sample size n", 0, population);
  const lower = integer(input.lower, "Event lower endpoint", 0, draws);
  const upper = integer(input.upper, "Event upper endpoint", lower, draws);
  return Object.freeze({population, marked, draws, lower, upper});
}
function choose(n, k) {
  if (k < 0 || k > n) return 0n;
  let value = 1n;
  k = Math.min(k, n-k);
  for (let i=1; i<=k; i++) value = value * BigInt(n-k+i) / BigInt(i);
  return value;
}
function fraction(numerator, denominator) {
  if (denominator <= 0n) throw new Error("An exact fraction needs a positive denominator.");
  let a=numerator, b=denominator;
  while (b !== 0n) { const remainder=a%b; a=b; b=remainder; }
  return Object.freeze({
    numerator: String(numerator/a), denominator: String(denominator/a),
    approximate: Number(numerator)/Number(denominator)
  });
}
export function distribution(input) {
  const config=admit(input);
  const {population:N,marked:K,draws:n,lower,upper}=config;
  const denominator=choose(N,n);
  const support=Object.freeze({minimum:Math.max(0,n-(N-K)),maximum:Math.min(n,K)});
  const rows=[];
  let eventCount=0n;
  for (let k=0;k<=n;k++) {
    const markedWays=choose(K,k), unmarkedWays=choose(N-K,n-k);
    const count=markedWays*unmarkedWays;
    const inEvent=k>=lower && k<=upper;
    if(inEvent) eventCount+=count;
    rows.push(Object.freeze({markedCount:k,unmarkedCount:n-k,
      markedWays:String(markedWays),unmarkedWays:String(unmarkedWays),
      favourableSubsets:String(count),possible:count!==0n,inEvent,
      probability:fraction(count,denominator)}));
  }
  const mean=fraction(BigInt(n)*BigInt(K),BigInt(N));
  const variance=N===1 ? fraction(0n,1n) :
    fraction(BigInt(n)*BigInt(K)*BigInt(N-K)*BigInt(N-n),BigInt(N)*BigInt(N)*BigInt(N-1));
  return Object.freeze({config,support,totalSubsets:String(denominator),
    rows:Object.freeze(rows),event:Object.freeze({lower,upper,favourableSubsets:String(eventCount),probability:fraction(eventCount,denominator)}),
    mean,variance});
}
export function observationJSON(input, inspectedCount) {
  const result=distribution(input);
  integer(inspectedCount,"Inspected count",0,result.config.draws);
  return JSON.stringify({
    format:"recallweave-hypergeometric-observation/1",
    model:"Uniformly selected subsets of a fixed size, without replacement, among distinct tokens.",
    arithmetic:"Counts and reduced fraction strings are exact. approximate fields are floating-point display approximations.",
    inspectedCount,
    ...result,
    limitations:["Synthetic mathematical model; no observed sample or random simulation.",
      "Requires every subset of the selected size to be equally likely.",
      "This observation is separate from learner-answer and study-note archives."]
  },null,2)+"\n";
}
