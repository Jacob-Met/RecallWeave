# Current catalog and authoring-source boundary

This is a read-only source review, not an additional browser or whole-suite run.

At current source 3e110dfb0aded80152afea685660105fed224e74:

- tools/build-course-catalog.mjs (Git blob 2f3ce774be06a82824524965c1759b75b6253415) reads catalog/courses.json explicitly, validates those paths, and reads only those listed course files. It does not discover every JSON file in courses/.
- catalog/courses.json (a16b7d8bbef20b826fc0b5ecf72bb76326390325) lists binary-search, dependency-graphs, measurement-uncertainty and sql-query-foundations decks.
- src/course-catalog.mjs (3dea1166430f3f05bd6ddbfa473bb66176bdb28b) accepts a basename made only of lowercase letters, digits and hyphens before the single .json suffix. traceable-measurements.json fits; traceable-measurements.source.json does not.
- tests/course-catalog.test.mjs (59aee85423294cd9bbe520cc99d5f528ecf9f023) explicitly includes courses/one.source.json among rejected curated paths.
- The unchanged native deck parser requires readable top-level title, attribution, license, concepts and items. The authoring wrapper instead has source_format, measurement_case and deck; it is not an importable native deck. The guide directs learners to the generated traceable-measurements.json.

Current focused-lesson tests enumerate explicit supplied decks, and handout tests consume validated native deck objects; neither read reviewed source shows automatic inclusion of authoring JSON.

The root independently confirmed this catalog boundary. No catalog, importer, discovery, builder or source-schema correction was needed or made. A separate README discovery pointer is the publisher's coordinated integration scope; the curated catalog is unchanged.

The four catalog source/test blobs above are unchanged on final received main 61751d74475b61ca1e0388c808b9fc81ce9b9ed3.
