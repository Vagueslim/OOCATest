import type {Character} from './characters';

export default function CharacterArtwork({character}:{character:Character}){
 const shared={className:`quote-character ${character.tile?'character-tile':''}`,'data-character-name':character.name,'data-source-kind':character.sourceKind};
 if(character.tile){
  const {x,y,sheetWidth,sheetHeight}=character.tile;
  return <span {...shared} role="img" aria-label={`Mooca ${character.name}`} style={{
   aspectRatio:`${character.width} / ${character.height}`,
   backgroundImage:`url("${character.image}")`,
   backgroundSize:`${sheetWidth/character.width*100}% ${sheetHeight/character.height*100}%`,
   backgroundPosition:`${x/(sheetWidth-character.width)*100}% ${y/(sheetHeight-character.height)*100}%`
  }}/>;
 }
 return <img {...shared} src={character.image} width={character.width} height={character.height} alt={`Mooca ${character.name}`} draggable={false}/>;
}
