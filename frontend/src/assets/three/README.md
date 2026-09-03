# Bundled three.js (r147)

`ArtifactViewerScreen` renders its 3D artifacts inside a WebView. These files
hold the viewer's JavaScript dependencies as JSON string modules so Metro can
bundle them with the app — the screen previously pulled them from `unpkg.com`
at runtime, which meant no offline support and a blank canvas whenever that CDN
was slow or blocked.

Sources, all pinned to three.js r147:

| File                 | Upstream path                                      |
| -------------------- | -------------------------------------------------- |
| `three.min.json`     | `three@0.147.0/build/three.min.js`                  |
| `OrbitControls.json` | `three@0.147.0/examples/js/controls/OrbitControls.js` |
| `GLTFLoader.json`    | `three@0.147.0/examples/js/loaders/GLTFLoader.js`   |

Each file is `{ "src": "<the file's JavaScript>" }`. JSON is used because Metro
bundles `.json` natively (the same approach as `assets/offline-bible`), whereas
raw `.js` assets would need custom `assetExts` configuration.

To upgrade, re-download the three files at the new version, wrap each in the
same `{ "src": ... }` shape, and update the table above. Note that the
`examples/js` (non-module) builds were removed after r147, so moving past that
version means switching the viewer to ES module imports.
