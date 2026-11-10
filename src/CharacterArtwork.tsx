import type {Character,CharacterName} from './characters';
import {characterBounds} from './characterBounds';
import './character-artwork.css';

export default function CharacterArtwork({character}:{character:Character}){
 const bounds=characterBounds[character.name as CharacterName]??{x:0,y:0,width:character.width,height:character.height};
 const width=166,height=176;
 const scale=Math.min(width/bounds.width,height/bounds.height);
 // Fit visible artwork, not transparent file padding. Original asset bytes stay intact.
 return <span className="quote-character character-artwork" data-character-name={character.name} data-source-kind={character.sourceKind} role="img" aria-label={`Mooca ${character.name}`} style={{width,height,maxWidth:width}}>
  <img src={character.image} width={character.width} height={character.height} alt="" aria-hidden="true" draggable={false} style={{
   width:character.width*scale,height:character.height*scale,
   left:(width-bounds.width*scale)/2-bounds.x*scale,
   top:height-bounds.height*scale-bounds.y*scale,
  }}/>
 </span>;
}
