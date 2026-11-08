# Mooca artwork provenance

This prototype uses artwork supplied by the project owner. It does not claim that these are fresh Figma exports.

- character-sheet.png is the unchanged 609 x 2048 Character Sheet.png supplied in the conversation. Its header and labels identify 21 poses. The app displays complete 158 x 158 artwork tiles as CSS sprites at no more than 148 CSS px (136 px for sentence cards), preserving their pale backgrounds and original pixels. The images can appear softer on high-density displays; original transparent exports are preferable for production.
- relaxing.png is the unchanged 364 x 225 PNG embedded in the supplied Mooca-Rest-card.svg, extracted by decoding its base64 image data. CALM uses this higher-resolution reference and preserves its aspect ratio.
- Character names are exact labels from the supplied sheet. No extra six poses were invented to reach the requested 27.
- The exact supplied Relaxing node is https://www.figma.com/design/3PGPbkxDkElsmp7WXKn5nx/?node-id=2012-2840 . Exact node IDs for the other 20 poses are not available. The sheet reference is https://www.figma.com/design/3PGPbkxDkElsmp7WXKn5nx/?node-id=2012-2771 . Live Figma verification was unavailable because its MCP read quota was reached.
- All 53 catalog IDs have a semantic pose assignment in src/characters.ts. The rationale and 10 mappings recommended for human review are recorded in evidence/Mooca-mapping-53.json. Pose coordinates are in evidence/Mooca-poses-21.json.

Source checksums (SHA-256):
- character-sheet.png: 75A1BA3A4F2B5E4E8F4DAD5982A9A7D54012CF9D9A26FB1B8466D03289C059F7
- relaxing.png: B5BA3D0D57B475E0B9E6AEA060DB0E05F86B3A5C2570B5DA93E68D8A916A6723

All artwork is bundled locally. No character service or remote tracking is introduced. Existing content tags, quote text, and stored history snapshots are not rewritten by the character layer.
