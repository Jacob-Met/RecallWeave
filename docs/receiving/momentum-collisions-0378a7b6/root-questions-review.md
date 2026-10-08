# Independent questions-only review: momentum and collisions

Reviewer: chatgpt-0378a7b6b7c2/root. Reviewed 2026-10-08 before reading any answer keys or candidate implementation.

The twelve prompts and options were read directly from questions-only.json on LA7. My independently selected zero-based answer indices are:

`[1, 2, 1, 3, 0, 2, 3, 2, 3, 0, 2, 0]`

Equivalently: B, C, B, D, A, C, D, C, D, A, C, A.

| Question | Independent reasoning |
| --- | --- |
| Signed momentum | 2 times -3 gives -6 kg m/s. |
| Zero total momentum | 1 times 4 plus 2 times -2 is zero. The two kinetic energies are 8 J and 4 J, totaling 12 J. |
| System boundary | Zero net external impulse fixes the sum of signed momenta, not either cart's individual momentum or the total translational kinetic energy. |
| Shared velocity | Total momentum is 6 kg m/s and total mass is 3 kg, giving +2 m/s. |
| Unequal elastic masses | (+1,+4) preserves momentum 6 and kinetic energy 9, and has the proper separating relative velocity. (+3,0) is the unchanged algebraic branch and still approaches in the stated A-left-of-B contact ordering. |
| Equal elastic masses | The velocities exchange to (-2,+4); total momentum remains 2 and kinetic energy remains 10. |
| Inelastic energy conversion | Initial kinetic energy is 9 J; final is 6 J; 3 J is converted. |
| Energy accounting | Translational kinetic energy can change into unresolved other forms. A zero final momentum is consistent with the zero initial momentum here. |
| Approach ordering | The gap derivative is uB-uA; only (-1,-3) makes it negative. Both carts may move left while still approaching. |
| Equal incoming velocities | Their positive separation remains constant, so there is no future contact in the specified model. |
| External impulse | Final total momentum is 6+2=8 kg m/s; a zero-impulse endpoint computation cannot be used unchanged. |
| Minimum kinetic energy | With M=mA+mB and reduced mass mu=mA*mB/M, K=P^2/(2M)+mu*(uA-uB)^2/2. At fixed positive masses and P, the second term is nonnegative and vanishes only when both velocities agree. |

No blocking ambiguity found under the stated physical-cart ordering and collision assumptions. The implementation and guide should keep the distinction in the unequal-mass question explicit: conservation equations alone admit the unchanged branch, whereas a nontrivial contact event with the carts separating requires the relative velocity to reverse. This is already expressed by the prompt's event/separation condition.

The finite endpoint model should preserve its declared limits: strictly positive fixed masses; classical one-dimensional translation; right as positive; A initially left of B; positive starting gap; no future collision unless uA>uB; and zero net external impulse for the calculated endpoints. The external-impulse question explicitly changes that assumption. These are mathematical learning outcomes, not a material, impact-force or measured learning-effectiveness model.

## Independent mathematical receiving rule

For incoming velocities uA and uB and M=mA+mB, I independently derived the elastic velocities from momentum conservation and reversal of relative velocity:

- vA = ((mA-mB)*uA + 2*mB*uB)/M.
- vB = ((mB-mA)*uB + 2*mA*uA)/M.

For a completely inelastic endpoint, both velocities equal P/M, where P=mA*uA+mB*uB. The reduction in translational kinetic energy is mA*mB*(uA-uB)^2/(2*M). These identities will be checked against the candidate core separately; no implementation or browser acceptance is claimed by this questions-only receipt.

Reference checked for the stated collision classification, zero-external-force idealization and center-of-mass energy decomposition: [MIT OpenCourseWare, 8.01SC Chapter 15: Collision Theory](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/mit8_01scs22_chapter15.pdf), sections 15.2.3–15.4.1. The numerical answers and algebra above were independently worked from the supplied questions.
