# Mooca artwork provenance

18 standalone PNGs supplied by the owner in Downloads/OOCA/18/Mooca replaced the matching poses on 2026-11-09. Their bytes are copied unchanged; the preview- filename prefix is removed. Character names, card assignments, text and tags remain unchanged. Original files in Downloads are untouched.

All PNGs are 278 x 278 except Moon Dreamer (285 x 285) and Shy Smile (290 x 278). The app preserves those native aspect ratios.

Heart Hug, Back View and Playful Tilt were not in the supplied PNG folder. Heart Hug and Quiet Moment now render native Figma SVGs; their source nodes and export dimensions are recorded in [source.json](../figma-artwork/source.json). On 2026-11-10, Playful Tilt and Back View were also replaced with direct native Figma vector exports in `../figma-artwork/`, excluding their preview backdrops. Their original paths and poses are unchanged; no character was redrawn. Source nodes and checksums are recorded in [transparent-mascots-source.json](../figma-artwork/transparent-mascots-source.json). The registry still has 21 distinct poses; no visible artwork uses the sheet background.

Visible artwork is fitted into a shared 166 x 176 CSS pixel slot without changing the source image bytes. [character-artwork.spec.ts](../../../tests/character-artwork.spec.ts) verifies intrinsic alpha bounds, aspect ratios and normalized placement for all 21 poses.

The previously verified Relaxing Figma node is https://www.figma.com/design/3PGPbkxDkElsmp7WXKn5nx/?node-id=2012-2840. Other individual node IDs are not independently verified. The source folder was supplied by the owner; this is not a claim of fresh Figma export verification.

The original sheet is unchanged (SHA-256 75A1BA3A4F2B5E4E8F4DAD5982A9A7D54012CF9D9A26FB1B8466D03289C059F7). Artwork is local; no remote service or tracking is introduced. See replacement-manifest.json for per-file checksums.
