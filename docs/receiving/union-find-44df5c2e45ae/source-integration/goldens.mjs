// Authored before viewing the candidate. Arrays are literal, not implementation output.
const state = (parent, size, components) => ({parent, size, components});
const union = (a,b) => ({type:'union',a,b});
const find = a => ({type:'find',a});
const prefix = [union(1,0),union(3,2),union(5,4),union(7,6),union(2,0),union(6,4),union(4,0)];
const balanced = [
 state([0,1,2,3,4,5,6,7],[1,1,1,1,1,1,1,1],8),
 state([0,0,2,3,4,5,6,7],[2,0,1,1,1,1,1,1],7),
 state([0,0,2,2,4,5,6,7],[2,0,2,0,1,1,1,1],6),
 state([0,0,2,2,4,4,6,7],[2,0,2,0,2,0,1,1],5),
 state([0,0,2,2,4,4,6,6],[2,0,2,0,2,0,2,0],4),
 state([0,0,0,2,4,4,6,6],[4,0,0,0,2,0,2,0],3),
 state([0,0,0,2,4,4,4,6],[4,0,0,0,4,0,0,0],2),
 state([0,0,0,2,0,4,4,6],[8,0,0,0,0,0,0,0],1)
];
export const goldens = [
 {name:'balanced-depth-three-without-compression',n:8,compress:false,
  operations:[...prefix,find(7),find(3),union(7,3)],
  snapshots:[...balanced,
   state([0,0,0,2,0,4,4,6],[8,0,0,0,0,0,0,0],1),
   state([0,0,0,2,0,4,4,6],[8,0,0,0,0,0,0,0],1),
   state([0,0,0,2,0,4,4,6],[8,0,0,0,0,0,0,0],1)]},
 {name:'balanced-depth-three-with-full-compression',n:8,compress:true,
  operations:[...prefix,find(7),find(3),union(5,3)],
  snapshots:[...balanced,
   state([0,0,0,2,0,4,0,0],[8,0,0,0,0,0,0,0],1),
   state([0,0,0,0,0,4,0,0],[8,0,0,0,0,0,0,0],1),
   state([0,0,0,0,0,0,0,0],[8,0,0,0,0,0,0,0],1)]},
 {name:'larger-high-root-wins-before-lower-root-tie',n:6,compress:true,
  operations:[union(4,5),union(3,4),union(0,1),union(0,4),find(1),union(2,2),union(2,1),find(0)],
  snapshots:[
   state([0,1,2,3,4,5],[1,1,1,1,1,1],6),
   state([0,1,2,3,4,4],[1,1,1,1,2,0],5),
   state([0,1,2,4,4,4],[1,1,1,0,3,0],4),
   state([0,0,2,4,4,4],[2,0,1,0,3,0],3),
   state([4,0,2,4,4,4],[0,0,1,0,5,0],2),
   state([4,4,2,4,4,4],[0,0,1,0,5,0],2),
   state([4,4,2,4,4,4],[0,0,1,0,5,0],2),
   state([4,4,4,4,4,4],[0,0,0,0,6,0],1),
   state([4,4,4,4,4,4],[0,0,0,0,6,0],1)]},
 {name:'singleton-find-and-self-union',n:1,compress:true,
  operations:[find(0),union(0,0)],
  snapshots:[state([0],[1],1),state([0],[1],1),state([0],[1],1)]},
 {name:'redundant-union-compresses-both-operand-paths',n:8,compress:true,
  operations:[...prefix,union(7,3),union(5,7)],
  snapshots:[...balanced,
   state([0,0,0,0,0,4,0,0],[8,0,0,0,0,0,0,0],1),
   state([0,0,0,0,0,0,0,0],[8,0,0,0,0,0,0,0],1)]}
];
