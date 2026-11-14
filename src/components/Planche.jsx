import Sheet from './Sheet.jsx'
import Icone from './Icones.jsx'
import ImageDiapo from './ImageDiapo.jsx'

// Toutes les images du set en miniatures : un appui va à l'image dans le carrousel. Avec une trentaine d'images Brickset, glisser une
// par une est long. Les images dont le nom parle de boîte sont en tête (on peut en faire la boîte du set), puis toutes les autres.
export default function Planche({ set, diapos, cle, imageListe, onChoisir, onFermer }) {
  const reelles = diapos.filter((d) => d.cle !== 'ajout')
  const boites = reelles.filter((d) => d.extra?.boite)

  const cellule = (d) => {
    const rang = reelles.indexOf(d) + 1
    const nom = `${d.libelle} ${rang}/${reelles.length}${d.gardee ? ', gardée sur l\'appareil' : ''}${imageListe === d.cle ? ', image de la liste' : ''}`
    return (
      <li key={d.cle}>
        <button type="button" className="planche__cellule" aria-label={nom} aria-current={cle === d.cle ? 'true' : undefined} onClick={() => onChoisir(d.cle)}>
          <ImageDiapo set={set} diapo={d} variante="mini" />
          <span className="planche__rang">{rang}</span>
          {(d.gardee || imageListe === d.cle) && (
            <span className="planche__badges" aria-hidden="true">
              {d.gardee && <span className="planche__badge">Gardée</span>}
              {imageListe === d.cle && <span className="planche__badge planche__badge--liste"><Icone nom="etoile" /></span>}
            </span>
          )}
        </button>
      </li>
    )
  }

  return (
    <Sheet ouvert onFermer={onFermer} titre={`Images de ${set.nom}`}>
      {boites.length > 0 && (
        <>
          <p className="fiche__titre-bloc">Boîte probable</p>
          <ul className="planche">{boites.map(cellule)}</ul>
        </>
      )}
      <p className="fiche__titre-bloc">Toutes les images ({reelles.length})</p>
      <ul className="planche">{reelles.map(cellule)}</ul>
    </Sheet>
  )
}
