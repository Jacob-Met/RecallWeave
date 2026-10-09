# Refraction: normal angles, ray paths and the critical boundary

This original 16-question course helps a learner predict a ray's direction at a flat boundary, check a calculation against geometry, and distinguish the critical boundary from total internal reflection. It uses the existing RecallWeave learner; there is no new optical simulator or learning model.

Open [the direct-file learner](../demo.html), choose [refraction-foundations.json](refraction-foundations.json) through its local deck picker, inspect the preview, then select **Start this deck**. Choosing a file does not itself replace the active session. After the first pass, review the explanations, retry missed questions in the separate practice round, write a reflection, and download study notes. The notes retain first answers separately from retries. Model estimates and first-pass counts are not validated grades or evidence of learning gains.

The four course concepts are angles and index, Snell paths, the critical boundary, and model/transfer checks. Each has four questions. Prerequisites connect the concepts without changing the learner's existing selection rules. You can read the worked examples below before or after the questions.

## A model with explicit limits

We consider a flat, stationary interface between two transparent, homogeneous, isotropic, nonabsorbing media. Each has an ordinary positive refractive index at one fixed frequency. The examples use authored ideal indices, not measured material properties. The ray picture assumes geometric optics; it does not resolve diffraction, polarization, dispersion, absorption or an evanescent field. It does not calculate a reflected/transmitted power fraction.

Write the **incident** medium first: n1. The medium the ray is trying to enter is n2. Reversing a ray exchanges those roles. Forward ray angles here run from 0° through 90°, including the normal-incidence and grazing limits. Draw the normal, which is perpendicular to the surface, before labeling angles. Unless a prompt expressly says otherwise, θ1 and θ2 are measured from that normal, in the plane of incidence.

OpenStax's [Refraction, section 1.3](https://openstax.org/books/university-physics-volume-3/pages/1-3-refraction) gives the index/speed relation and the normal-angle law. Its [Total Internal Reflection, section 1.4](https://openstax.org/books/university-physics-volume-3/pages/1-4-total-internal-reflection) supplies the higher-to-lower-index condition and critical-angle boundary. These are reference readings; all question wording, numerical examples and explanations here are original. Their figures and exercises are not reproduced.

## Work from the sine, then check the direction

The relations are

- n = c/v, where v is phase speed at the specified frequency;
- n1 sin θ1 = n2 sin θ2;
- s = (n1/n2) sin θ1, followed by θ2 = asin(s) when 0 ≤ s ≤ 1.

For these forward rays, use the inverse-sine result between 0° and 90°. A calculator must be in degree mode for the displayed angles, or convert degrees to radians before using a programming language's sine. Index is dimensionless; do not put degrees into an API that expects radians.

| Incident medium → destination | θ1 | s | Result |
| --- | ---: | ---: | --- |
| 1.20 → 1.80 | 30° | 1/3 | θ2 ≈ 19.4712°, toward the normal |
| 1.50 → 1.20 | 30° | 0.625 | θ2 ≈ 38.6822°, away from the normal |
| 1.60 → 1.60 | 47° | sin 47° | θ2 = 47°, unchanged direction |
| 1.20 → 1.80 | 0° | 0 | θ2 = 0°, along the normal |

The equal-index and normal-incidence rows are useful controls. Neither a different region label nor a speed change by itself proves a bend. At a stationary boundary the frequency is unchanged; the changed speed changes the wavelength through λ = v/f. For an index increase from 1.00 to 1.60, an initial wavelength of 640 nm becomes 400 nm. This statement concerns phase speed and wavelength at that frequency, not a general signal-velocity claim.

For the first row, reverse the allowed path: n1 is now 1.80 and n2 is 1.20. Use the original unrounded sine 1/3, giving sin θout = (1.80/1.20)(1/3) = 1/2, so the outgoing normal angle is 30°. Reusing a rounded displayed angle introduces an ordinary rounding difference.

## Equality is a boundary, not the strict-above case

A critical angle below 90° exists only when n1 > n2:

θc = asin(n2/n1).

For n1 = 2 and n2 = 1, θc = 30°. Classify the three cases separately:

| Incident angle | What the sine relation permits |
| --- | --- |
| θ1 < 30° | A forward transmitted direction with θ2 < 90° |
| θ1 = 30° | The limiting transmitted direction θ2 = 90°, along the interface |
| θ1 > 30° | No real propagating transmitted ray angle; total internal reflection |

The equality row describes a limiting ray direction. It does not claim that finite transmitted power travels along the boundary. The strict-above row does not mean that electromagnetic fields vanish everywhere in the second medium; evanescent fields are outside this lesson's ray model.

At 35°, 2 sin 35° ≈ 1.14715, so taking a real inverse sine is impossible. The reflected angle remains 35° from the normal by the law of reflection. Do not clamp that sine to 1 and report a transmitted 90° ray: that would replace an above-critical case with the boundary case.

If n1 ≤ n2, there is no critical angle strictly below 90° and no total internal reflection for these ordinary incident rays. Equal indices deserve their own unchanged-direction check, not an invented threshold.

## Three transfer problems

**Surface-angle trap.** At the same 2 → 1 boundary, an angle of 68° to the surface is only 22° to the normal. It is below 30°, so transmission is allowed. An angle of 40° to the surface is 50° to the normal and is above the threshold. Compare angles in the same convention.

**Parallel slab.** Put a transparent slab between two regions with the same outside index. Its faces are parallel and transmission is allowed at both. The two applications of Snell's law give

n_out sin θ_in = n_slab sin θ_inside = n_out sin θ_out.

Thus the emergent ray is parallel to the incoming ray. Oblique propagation across finite thickness may shift its path sideways. This conclusion does not apply unchanged to a wedge with nonparallel faces.

**Small angles.** For 1 → 2, the exact relation is sin θ2 = sin θ1/2, not θ2 = θ1/2. At θ1 = 30°, the exact result is asin(1/4) ≈ 14.4775°, whereas angle-halving gives 15°. The familiar approximation sin θ ≈ θ uses radians and becomes less accurate away from zero.

For a final reflection, describe how you would reject a plausible-looking wrong ray sketch without measuring power: name the ordered indices, convert surface angles, check the sine range, and distinguish a direction prediction from a power prediction.

## Authorship and reuse

Original questions, distractors, explanations, transfer prompts and this guide were authored for RecallWeave with AI assistance and are offered under CC0-1.0. The cited OpenStax publications retain their own licenses. No source passages, exercises, diagrams or measured datasets are incorporated. This is an educational model and authored lesson, not an experiment, a calibrated optical-design tool or an empirical efficacy result.
