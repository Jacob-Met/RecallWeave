# Independent normal-modes content review contract

Frozen before inspecting candidate content or answer keys, 2026-10-08. Reviewer: /root/research, session 3e50c5ad22c5. The implementation owner is /root. This directory contains only independent review material.

## Physical scope

Two equal positive masses m move along one common signed displacement axis from equilibrium. Each outside spring has positive stiffness k; the middle spring has stiffness c >= 0. The ideal model is linear, undamped, unforced, and uses small displacements. qPlus=(x1+x2)/2 and qMinus=(x1-x2)/2 have the same displacement units as x1 and x2.

Newton equations are m*x1''=-(k+c)*x1+c*x2 and m*x2''=c*x1-(k+c)*x2. Adding and subtracting yields qPlus''=-(k/m)*qPlus and qMinus''=-((k+2*c)/m)*qMinus. The angular frequencies are sqrt(k/m) and sqrt((k+2*c)/m), in radians per unit time. An oscillation period is 2*pi/omega.

## Blind-answer principles

- In-phase motion does not extend the coupling spring. Its frequency is independent of c.
- Out-of-phase motion extends the coupling spring by twice one mass's displacement. Its frequency includes 2*c, not c.
- A pure mode requires both its other modal displacement and its other modal velocity to vanish. Equal displacements at one instant alone do not guarantee a pure in-phase trajectory.
- For c=0 the two frequencies coincide. The masses are independent and every combination of the two displayed basis vectors is another normal-mode direction; the displayed basis is not uniquely selected.
- Larger m reduces both frequencies by the inverse square root of m. Larger c changes only the out-of-phase frequency in this equal-mass, equal-wall-spring model.
- General initial velocities contribute sine terms divided by omega to displacement. Setting time to zero must recover all four initial values.
- The normal-coordinate transformation reconstructs x1=qPlus+qMinus and x2=qPlus-qMinus.
- With these half-sum coordinates the energy is m*(qPlusDot^2+qMinusDot^2)+k*qPlus^2+(k+2*c)*qMinus^2. Each coordinate has effective mass 2*m, so inserting an extra factor 1/2 is wrong.
- Direct physical energy is m*(v1^2+v2^2)/2+k*(x1^2+x2^2)/2+c*(x1-x2)^2/2.
- Total energy and each normal-mode energy are constant. Mass-associated energies may vary; assigning the shared coupling energy to one mass or the other requires a stated convention.
- For x1(0)=A, x2(0)=0, and zero initial velocities, x1=A*cos((omegaPlus+omegaMinus)*t/2)*cos((omegaMinus-omegaPlus)*t/2), and x2=A*sin((omegaPlus+omegaMinus)*t/2)*sin((omegaMinus-omegaPlus)*t/2).
- A slow amplitude envelope is distinct from exact instantaneous displacement or energy transfer. At its first complete amplitude exchange, one mass can retain nonzero velocity and the coupling spring can contain energy. Generic complete-energy-transfer claims need additional conditions or a weak-coupling approximation.
- Distinguish angular frequency from cycles per second and the signed slow cosine from its absolute amplitude envelope. No beat exchange occurs when only one mode is excited or when c=0.
- Claims about these coordinates/frequencies must retain the equal-mass and equal-wall-spring assumptions.

## Review procedure

Read question prompts and choices without answer fields or explanations. Record independent expected choices and reasoning with a timestamp, then compare against the candidate keys and explanations. Report correctness, ambiguity, missing assumptions, and any disagreement without retroactively changing the frozen answers. Inspect implementation and lesson exposition only after controls above have been retained.

## Numerical controls

physics-oracle.mjs was frozen at 2026-10-08T18:46:53.495Z with SHA256 915bdc0b5d54aeefbf125d5d2ee2f03fb869a89c7b4cf141437575f518e5d74e. frozen-controls.json retains runtime, all self-check results, and rejected negative controls. No actual candidate had been evaluated at freeze time.

The sample adapter contract is sample({m,k,c}, {x1,x2,v1,v2}, signedTime) -> {x1,x2,v1,v2}. The oracle uses direct Cartesian RK4 integration and finite differences of the submitted trajectory, so it does not simply mirror the candidate's modal implementation.
