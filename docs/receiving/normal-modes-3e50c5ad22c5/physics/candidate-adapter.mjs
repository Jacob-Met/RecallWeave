import {makeExperiment,stateAt} from '../hamon-normal-modes-3e50c5ad22c5/courses/normal-modes-core.mjs';
export function sample({m,k,c}, initial, signedTime) {
  return stateAt(makeExperiment({mass:m,wallStiffness:k,coupling:c,...initial,duration:20}),signedTime);
}
