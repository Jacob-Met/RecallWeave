// Original finite weighted-coalition teaching model. No random or provider calls.
export const MODEL='bounded-integer-weighted-coalitions/1';
export const FORMAT='recallweave-coalition-power-analysis/1';
const assumptions=[
 'Weights and the yes/no quota are fixed authored integers; reaching the quota passes.',
 'Players are distinct original ordinals, including players with equal or zero weights.',
 'Each coalition is enumerated once. A swing compares the same other-player coalition without and with one player.',
 'The absolute swing probability assumes each other player independently says yes with probability one half.',
 'Normalized Banzhaf share divides by the total swing count; it is not a probability that a player votes yes or that a proposal passes.',
 'Preferences, coordination, abstention, arrival order and empirical influence are outside this model; it is not a fairness test or a real-election forecast.'
];
function whole(value,min,max,label){
 if(typeof value!=='number'||!Number.isInteger(value)||!Number.isFinite(value)||Object.is(value,-0)||value<min||value>max)
  throw new RangeError(label+' must be an integer from '+min+' through '+max+'.');
 return value;
}
function fraction(numerator,denominator){
 let a=numerator,b=denominator;while(b){const r=a%b;a=b;b=r}
 return {numerator:numerator/a,denominator:denominator/a,text:(numerator/a)+'/'+(denominator/a)};
}
export function analyzeGame(weights,quota){
 if(!Array.isArray(weights)||weights.length<1||weights.length>6)throw new RangeError('Use an array of one through six player weights.');
 const copied=[];
 for(let i=0;i<weights.length;i++){
  if(!Object.hasOwn(weights,i))throw new RangeError('Player weights must form a dense array.');
  copied.push(whole(weights[i],0,20,'Weight '+(i+1)));
 }
 const n=copied.length,total=copied.reduce((a,b)=>a+b,0);
 if(total===0)throw new RangeError('At least one player must have positive weight.');
 whole(quota,1,total,'Quota');
 const coalitions=[];
 for(let mask=0;mask<2**n;mask++){
  const members=[];let weight=0;
  for(let i=0;i<n;i++)if(mask&(1<<i)){members.push(i+1);weight+=copied[i]}
  const winning=weight>=quota;
  coalitions.push({mask,members,weight,winning,critical_members:winning?members.filter(index=>weight-copied[index-1]<quota):[]});
 }
 const players=copied.map((weight,i)=>{
  const without=coalitions.filter(row=>!(row.mask&(1<<i))&&row.weight<quota&&row.weight+weight>=quota).map(row=>row.mask);
  return {index:i+1,label:String.fromCharCode(65+i),weight,swing_count:without.length,swing_without_masks:without};
 });
 const totalSwings=players.reduce((sum,p)=>sum+p.swing_count,0);
 // A quota in [1,total] guarantees a crossing along some sequence of players.
 for(const p of players){p.absolute_swing_probability=fraction(p.swing_count,2**(n-1));p.normalized_banzhaf_share=fraction(p.swing_count,totalSwings)}
 const winningCount=coalitions.filter(c=>c.winning).length;
 return {format:FORMAT,model:MODEL,input:{weights:copied,quota,player_count:n,total_weight:total},coalitions,players,
  summary:{coalition_count:2**n,winning_count:winningCount,losing_count:2**n-winningCount,total_swings:totalSwings,other_player_coalitions:2**(n-1)},
  assumptions:assumptions.slice()};
}
