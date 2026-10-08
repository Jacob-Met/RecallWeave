// Reproduction adapter. Historical receipts retain the originally used adapter hash.
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {makeExperiment,stateAt}=await import(pathToFileURL(path.resolve(process.argv[3])).href);
export function sample({m,k,c}, initial, signedTime) {
  return stateAt(makeExperiment({mass:m,wallStiffness:k,coupling:c,...initial,duration:20}),signedTime);
}
