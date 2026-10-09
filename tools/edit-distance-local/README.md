# RecallWeave edit-distance local installation

This installation keeps the exact qualified eight-file edit-distance package in one stable Mac folder. It includes the offline explorer, twelve-question lesson, worked guide, original RecallWeave learner and original attribution. The original ZIP and the installation source are retained for recovery.

## Learn and keep your notes

Open **Open RecallWeave.command** in:

`/Users/me/Applications/RecallWeaveEditDistance-c945953fdeb7`

The launcher verifies the installed package and asks the existing macOS file opener to open `app/START-HERE.html`. The included activities require no account, server or network connection. Optional academic/source links are external reading.

1. In START-HERE, choose **Open the unchanged RecallWeave learner**. Its initial bundled lesson is biology.
2. Under **Bring your own lesson**, select **Choose a deck file** and choose `app/courses/edit-distance.json` inside this installation. Review the preview, then choose **Start this deck**. This replaces the current lesson in that tab.
3. Answer the twelve questions and read the review. You can write your own explanations and application response.
4. Choose **Download study notes** before closing or refreshing. Keep the downloaded `recallweave-study-notes-YYYY-MM-DD.txt` in your chosen document/download location.

The notes are a readable record of the questions, first answers, explanations, writing and any practice. They do not restore an editable session after a refresh. No automatic persistence or writing-restoration feature is added by this installation. The existing explorer remains available from START-HERE; its original input policy and guide explain what its minimum-cost alignment means.

## Installed version and input boundary

All eight files under `app/` have the exact bytes from the original 53,535-byte ZIP:

- Delivery commit `cb2f0ad1bc59bac7541004cde174179923e6cb75`; tree `8514ed3862142f5c3daf9c889b215ad3edb074f8`.
- Original ZIP Git `ae0f3ed4e067fd527b1db7e103270419242db0c2`.
- ZIP SHA256 `a86d823d70be98d08fd804ce9d8bccdb071b586adf5c30c0784a96a5db2a03e9`.
- Original learner Git `ef7bc3e27e7f161d917ced6a457fad8822802f3f`, 98,468 bytes.

The included course is the exact checked original. The separate strict UTF-8 picker replacement `be645943c6f5ad2357851b3f4f65050dfec8e6db` is not included; this installation retains the original selected-file behavior. The #7/#181 picker and #109/#159 combined-output owners retain that correction and its integration. This package does not claim corrected handling of damaged external UTF-8 decks, combined-pack integration or unfinished-session resume acceptance.

[Original source qualification](https://github.com/Jacob-Met/RecallWeave/issues/140#issuecomment-6072029542), [original offline delivery](https://github.com/Jacob-Met/RecallWeave/issues/140#issuecomment-6072607298), and the [distinct installation reservation](https://github.com/Jacob-Met/RecallWeave/issues/140#issuecomment-6076471572) retain the source and ownership history. Existing course, math and browser qualification is reused; it is not repeated by the installer.

## Identity and recovery

`INSTALLATION.json` records the exact installed files and modes, original archive, source inputs and existing Python runtime. Application and recovery files are read-only; the launcher is executable. The launcher verifies every declared package file before requesting the browser. Ordinary extra files, such as a user's separately saved notes or Finder metadata, are not treated as application inputs.

The launcher uses the existing resolved Python interpreter with its isolated/no-bytecode options. It does not install a runtime, register a package binary, alter PATH, add a launch agent or start a server. Its `--no-open` option reports the verified file path, URI and marker identity without requesting a browser. That mode supports explicit inspection and private-browser receiving; it does not establish Finder/default-profile acceptance.

The original ZIP is retained at `recovery/RecallWeave-edit-distance-offline.zip`. All five installer/launcher/guide/input files are retained at `recovery/source/`. If recovery is needed, choose a new, absent destination and run the retained installer with the existing Python interpreter, for example:

```sh
/Library/Frameworks/Python.framework/Versions/3.13/bin/python3 \
  /Users/me/Applications/RecallWeaveEditDistance-c945953fdeb7/recovery/source/install.py \
  --archive /Users/me/Applications/RecallWeaveEditDistance-c945953fdeb7/recovery/RecallWeave-edit-distance-offline.zip \
  --destination /Users/me/Applications/RecallWeaveEditDistance-recovered-c945953fdeb7 \
  --owned-root /Users/me/Applications/RecallWeaveEditDistance-c945953fdeb7
```

That additional recovery installation has not been executed. The installer refuses any existing destination and preserves a newly created partial destination on failure. It validates the complete exact original ZIP, all member identities and original checksums, copies the source inputs, and writes the final marker last. It requires at least 256 MiB free disk and 2 GiB conservative available RAM, with a combined 2 MiB allocation for the declared owned preparation directory and new installation. It does not remove another version to make room.

This installation has its own unique source/evidence fence. cf5799 retains the original course and delivery; 6c20's original extracted-package receiving stays closed. Other RecallWeave installations and the shared learner, author, catalog, picker and combined-package sources are unchanged.
