import type {CharacterName} from './characters';

export type CharacterBounds={x:number;y:number;width:number;height:number};

// Intrinsic pixel bounds containing every nontransparent pixel (alpha > 0).
// Verified against the rendered assets by tests/character-artwork.spec.ts.
export const characterBounds={
 'Friendly Stand': {"x":29,"y":24,"width":220,"height":230},
 'Cloud Rider': {"x":24,"y":67,"width":230,"height":163},
 'Relaxing': {"x":20,"y":66,"width":239,"height":147},
 'Moon Dreamer': {"x":7,"y":7,"width":274,"height":274},
 'Glowing Heart': {"x":27,"y":15,"width":224,"height":240},
 'Safe Bubble': {"x":24,"y":24,"width":230,"height":230},
 'Bookworm': {"x":32,"y":24,"width":221,"height":222},
 'Rainy Day': {"x":43,"y":53,"width":188,"height":201},
 'Shy Smile': {"x":6,"y":15,"width":276,"height":255},
 'Heart Hug': {"x":8,"y":5,"width":209,"height":227},
 'Back View': {"x":14,"y":12,"width":175,"height":215},
 'Playful Tilt': {"x":0,"y":0,"width":219,"height":230},
 'Bench Break': {"x":32,"y":24,"width":221,"height":230},
 'Curious': {"x":32,"y":38,"width":215,"height":218},
 'Quiet Moment': {"x":3,"y":11,"width":154,"height":164},
 'Mirror Peek': {"x":26,"y":13,"width":228,"height":252},
 'Balloon Explorer': {"x":61,"y":30,"width":157,"height":223},
 'Sunny Friend': {"x":44,"y":49,"width":200,"height":188},
 'Friendly Doctor': {"x":28,"y":29,"width":224,"height":225},
 'Caring Listener': {"x":28,"y":29,"width":224,"height":225},
 'Cozy Reader': {"x":31,"y":34,"width":215,"height":214},
} as const satisfies Record<CharacterName,CharacterBounds>;
