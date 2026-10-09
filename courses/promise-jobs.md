# Promise jobs: before and after await

This original twelve-question lesson connects a call's synchronous work to its later Promise reactions. Predict each returned log array before checking the explanation. The examples use local arrays and explicitly controlled settlement; they do not use timers, I/O, workers, network requests or wall-clock measurements.

Save [the checked course JSON](promise-jobs.json). Open the existing RecallWeave learner, choose it under **Bring your own lesson**, inspect the preview, then select **Start this deck**. Cancelling a preview preserves the active lesson; starting this course replaces that tab's active lesson. The existing feedback, separate practice and study-note flows keep the original question identities. Answer choices may be shuffled; the array content, rather than a displayed letter, identifies an answer.

The course is separate from the catalog and offline pack. Their existing registration and delivery owners retain those files; this addition does not register itself automatically or change a saved learning trace.

## Predict, execute, explain

From the repository root, with Node 20 or later:

~~~bash
node tools/promise-jobs.mjs --list
node tools/promise-jobs.mjs --scenario P01
node tools/promise-jobs.mjs --all
node tools/promise-jobs.mjs --help
node --test tests/promise-jobs.test.mjs
~~~

The worksheet executes the exact fixed function displayed in each question. It accepts no source code or file input. One scenario returns a complete `{id,lines}` object; all mode returns the twelve objects in course order after running them serially. Each invocation has fresh local state. It prints compact JSON plus one line feed, or concise help. Invalid arguments return exit2 with no result; output failures remain failures. There is no automatic saving.

The async function bodies are ordinary strict ES-module JavaScript. Await each function's returned Promise to obtain its completed array. The native receiving target is the separately pinned installed Node 24.19 runtime. The queueMicrotask example uses Node's documented shared microtask queue. process.nextTick, timer ordering, DOM events and other host scheduling are outside this lesson.

## Four useful distinctions

- Starting an async function or constructing a Promise can do synchronous work. Await suspends that function; it does not synchronously block its caller.
- Settling a Promise and running its registered reaction are separate events. Newly queued work waits behind previously queued reactions in these examples.
- Aggregate input order, first settlement and recovery are different contracts. all retains input positions; race chooses its first settlement and does not cancel other inputs.
- Obtaining a primitive property value before suspension differs from rereading a mutable object afterward. A shallow object copy still shares nested object references.

Those distinctions help explain a small program. They do not prove that an application is race-free, that validation remains valid for mutable nested data, or that every JavaScript host schedules all other callbacks identically.

## Complete worked responses

Each row names the canonical array content. It remains correct when the learner shuffles displayed options.

### P01: Synchronous start

Returned array: `["start","executor","end","value"]`.

The Promise constructor calls its executor during construction, so start is followed by executor. Resolving the Promise does not call the registered then handler immediately. The end log completes synchronously; the queued fulfillment reaction later appends value.

Transfer: The executor still runs immediately. A registered then fulfillment reaction waits for a later job even if resolve is called during the executor.

### P02: Synchronous start

Returned array: `["sync","A","B"]`.

Both fulfillment reactions are registered against the already fulfilled Promise in A-then-B order. Their callbacks wait until the current synchronous code finishes, so sync precedes A and B. Promise.all is awaited only to keep the function open until both callbacks finish.

Transfer: After swapping the registrations, the complete array becomes ["sync","B","A"]. The placement of sync is unchanged; only the queued reaction order changes.

### P03: Synchronous start

Returned array: `["before","caller","after"]`.

Calling an async function begins its body immediately: work logs before. Awaiting even the ordinary value 0 suspends that function and schedules its continuation; the caller can log caller before work resumes and logs after. The outer await collects the completed work.

Transfer: No. Awaiting an already fulfilled ordinary Promise still suspends this async function and resumes it through a reaction job. The caller can continue its synchronous work before that continuation.

### P04: Queued reactions

Returned array: `["sync","then","micro"]`.

In the stated Node ES-module runtime, Promise reactions and queueMicrotask callbacks use the same microtask queue. The then callback is queued first, the micro callback second, and sync is logged before either callback runs. Neither scheduling API interrupts the current synchronous statements.

Transfer: Scheduling the queueMicrotask callback first yields ["sync","micro","then"] in this stated runtime. No nextTick, timer, I/O callback or browser-task ordering is part of this claim.

### P05: Queued reactions

Returned array: `["A","B","C"]`.

A runs first and schedules the new C reaction. B was already queued when A began, so C joins behind it. Awaiting the promises ensures every logged callback has finished; it does not move the new C callback ahead of the already queued B callback.

Transfer: A queues C during its callback, after B is already pending. A newly scheduled reaction is appended behind that existing job; nesting a then call does not recursively run its callback immediately.

### P06: Queued reactions

Returned array: `["releasedB","releasedA","A,B"]`.

Both release calls run synchronously, producing releasedB and releasedA before the aggregate reaction. Promise.all stores fulfillment values by input position, not settlement order. Its iterable is [a, b], so the joined result is A,B even though b was released first.

Transfer: The aggregate associates each fulfillment with the original iterable index. Settlement determines when all inputs are ready, while iterable order determines the output positions.

### P07: Settlement and recovery

Returned array: `["released","B"]`.

The explicitly controlled releases settle b before a. The aggregate race takes the first settlement, B, and its then reaction runs after the synchronous released log. The A settlement cannot overwrite the already settled race. Race does not cancel its other inputs.

Transfer: Calling releaseA first instead selects A, giving ["released","A"]. The losing Promise still exists and can settle; Promise.race is not a cancellation operation.

### P08: Settlement and recovery

Returned array: `["finally","kept"]`.

A normally returning finally callback observes settlement without replacing its original fulfillment value. It logs finally, then the chain still fulfills with kept. Returning replacement is different from throwing or returning a rejected Promise, which can turn the resulting chain into a rejection.

Transfer: Throwing an Error from finally rejects the resulting chain with that Error. Returning a normal string preserves the old value; returning a rejected Promise also makes the chain reject.

### P09: Settlement and recovery

Returned array: `["then","bad","ok","7"]`.

The first fulfillment handler logs then and throws bad, rejecting its returned Promise. The catch handler logs bad and returns ok, so the chain recovers to fulfillment. The following handler receives ok, logs it and returns 7; await obtains that value, which is logged as the string 7.

Transfer: No. If catch rethrows, the chain stays rejected; a then containing only a fulfillment handler cannot recover it or produce 7. A later rejection handler or surrounding try/await/catch would be needed.

### P10: Values across suspension

Returned array: `["changed"]`.

The read function obtains request.state only after it resumes from await. Before that reaction runs, the caller synchronously changes the object to changed. Async suspension neither freezes the caller's object nor captures its old property values.

Transfer: It reads the property in the continuation after await. To capture this primitive value deliberately, read and validate it into a private local variable before any await, then use that variable afterward.

### P11: Values across suspension

Returned array: `["draft"]`.

The local const state obtains the primitive string draft before suspension. Changing request.state later replaces a property value on the object; it does not replace that already captured local string. This is a deliberately narrow primitive-value capture, not a deep snapshot of arbitrary data.

Transfer: The captured local string remains draft. For primitives, replacing a property does not mutate the already obtained value. Objects, getters, validation and queued work need their own explicit capture rules.

### P12: Values across suspension

Returned array: `["before:2"]`.

Object spread copies the name property value before but copies only the reference to the nested object. Replacing original.name does not change copy.name; mutating the shared nested.count is visible through both objects. The later callback therefore combines before with 2.

Transfer: The top-level name string was copied by value, but nested still refers to the same object. Shallow copying is insufficient when validated nested values can later mutate; a capture policy must specify exactly which values become independent.


## Reuse and background

The functions, questions, options, explanations and worked transfer responses were newly authored by HAMON contributors for RecallWeave in 2026, with AI assistance. Original lesson text and examples are offered under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); credit HAMON contributors for RecallWeave and this lesson title. This permission does not relicense the linked specifications or documentation.

Primary technical background:

- [ECMAScript Promise and async control algorithms](https://tc39.es/ecma262/multipage/control-abstraction-objects.html): Promise construction, reaction jobs, all/race, finally and Await. The current multipage source was labeled the 2027 draft during review; the algorithms supply background, while native runtime observations qualify the actual examples.
- [Node 24 queueMicrotask documentation](https://nodejs.org/docs/latest-v24.x/api/process.html#when-to-use-queuemicrotask-vs-processnexttick): the shared queue used for Promise handlers and queueMicrotask. The example does not use nextTick.

The course supplies practice and explanations. Parser acceptance checks structure, not subject truth, and this contribution makes no measured teaching-effectiveness or learner-ability claim.
