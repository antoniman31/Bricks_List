import { useContext, useState } from 'react'
import PhotoSheet from './PhotoSheet.jsx'
import Vignette from './Vignette.jsx'
import Icone from './Icones.jsx'
import ImagesContext from '../ImagesContext.js'
import usePhoto from '../usePhoto.js'
import { ecrirePhoto, messageErreur, supprimerPhoto } from '../lib/photosDB.js'

// Un bouton qui ouvre l'appareil photo (capture) ou la galerie : un <label> sur un champ fichier,
// comme l'import des Réglages. Sur ordinateur, `capture` est ignoré et on choisit un fichier.
function ChoixFichier({ libelle, camera, desactive, onChoisi }) {
  return (
    <label className={`bouton bouton--fichier${desactive ? ' bouton--inactif' : ''}`}>
      {libelle}
      <input
        type="file"
        accept="image/*"
        capture={camera ? 'environment' : undefined}
        disabled={desactive}
        className="visuellement-cache"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onChoisi(f) }}
      />
    </label>
  )
}

const ONGLETS = [['boite', 'Boîte'], ['rendu', 'Rendu'], ['photo', 'Ma photo']]

// L'image en tête de fiche, en grand : la boîte, le rendu Rebrickable ou la photo personnelle, au choix, avec le titre
// posé dessus. Les pastilles de choix sont sur l'image, en haut ; une étoile, en bas à droite, fait de l'image qu'on
// regarde celle du set dans la liste (une étoile marque aussi la pastille choisie) ; sans choix, la règle des Réglages
// décide. La boîte est affichée d'abord. Les actions de la photo perso (reprendre, galerie, retirer) restent dessous.
export default function PhotoFiche({ set, lectureSeule, onChanger, sousTitre = '' }) {
  const [vue, setVue] = useState('boite')
  const [fichier, setFichier] = useState(null)
  const [retrait, setRetrait] = useState(false)
  const [probleme, setProbleme] = useState('')
  const photo = usePhoto(set.id)
  const { rafraichir } = useContext(ImagesContext)

  async function enregistrer(blob) {
    try {
      await ecrirePhoto(set.id, blob)
      photo.recharger()
      rafraichir()
      setVue('photo')
      return { ok: true }
    } catch (e) {
      return { ok: false, erreur: messageErreur(e) }
    }
  }

  async function retirer() {
    try {
      await supprimerPhoto(set.id)
      photo.recharger()
      rafraichir()
      setRetrait(false)
      // Plus de photo à montrer : le choix « photo » n'a plus d'objet, le set repasse en automatique.
      if (set.imageListe === 'photo') onChanger?.({ imageListe: null })
      setProbleme('')
    } catch {
      setProbleme('La photo n\'a pas pu être retirée.')
    }
  }

  function basculerListe() {
    const ok = onChanger?.({ imageListe: set.imageListe === vue ? null : vue })
    setProbleme(ok === false ? 'Modification refusée.' : '')
  }

  const onglets = ONGLETS.filter(([cle]) => cle !== 'rendu' || set.image)
  const choisie = set.imageListe === vue
  const peutChoisir = vue !== 'photo' || Boolean(photo.url)

  return (
    <div className="photo-fiche heros">
      <div className="heros__image">
        {vue === 'boite' && <Vignette image={set.image} numero={set.numero} variante="fiche" />}
        {vue === 'rendu' && <Vignette image={set.image} numero={set.numero} variante="fiche" premier="rendu" />}

        {vue === 'photo' && (
          <>
            {photo.chargement && <div className="photo-vide" role="status">Chargement…</div>}
            {!photo.chargement && photo.url && <img className="vignette vignette--fiche" src={photo.url} alt={`Ma photo de ${set.nom}`} />}
            {!photo.chargement && !photo.url && (
              <div className="photo-vide">{photo.erreur ? 'La photo n\'a pas pu être lue.' : 'Pas encore de photo pour ce set.'}</div>
            )}
          </>
        )}

        <div className="heros__pastilles groupe__options" role="group" aria-label="Image du set">
          {onglets.map(([cle, libelle]) => (
            <button key={cle} type="button" className="puce puce--etoile" aria-pressed={vue === cle} onClick={() => setVue(cle)}>
              {set.imageListe === cle && <span className="puce__etoile"><Icone nom="etoile" /></span>}
              {libelle}
              {set.imageListe === cle && <span className="visuellement-cache"> (image de la liste)</span>}
            </button>
          ))}
        </div>

        {peutChoisir && !photo.chargement && (
          <button
            type="button"
            className="heros__etoile"
            aria-pressed={choisie}
            aria-label={choisie ? 'Image de la liste' : 'Utiliser dans la liste'}
            title={choisie ? 'Image de la liste' : 'Utiliser dans la liste'}
            disabled={lectureSeule}
            onClick={basculerListe}
          >
            <Icone nom="etoile" />
          </button>
        )}

        <div className="heros__titre">
          <p>{sousTitre}</p>
          <h2>{set.nom}</h2>
        </div>
      </div>

      {vue === 'photo' && !photo.chargement && !retrait && (
        <div className="photo-actions">
          <ChoixFichier libelle={photo.url ? 'Reprendre' : 'Prendre une photo'} camera desactive={lectureSeule} onChoisi={setFichier} />
          <ChoixFichier libelle={photo.url ? 'Galerie' : 'Choisir dans la galerie'} desactive={lectureSeule} onChoisi={setFichier} />
          {photo.url && <button type="button" className="bouton bouton--danger" disabled={lectureSeule} onClick={() => setRetrait(true)}>Retirer</button>}
        </div>
      )}

      {retrait && (
        <div className="avis avis--erreur" role="alertdialog" aria-label="Confirmer le retrait de la photo">
          <p>Retirer ta photo ? Elle n'est pas dans l'export : elle serait perdue.</p>
          <div className="sheet__pied">
            <button type="button" className="bouton" onClick={() => setRetrait(false)}>Annuler</button>
            <button type="button" className="bouton bouton--danger" onClick={retirer}>Retirer</button>
          </div>
        </div>
      )}
      {probleme && <p className="avis avis--erreur" role="alert">{probleme}</p>}

      {fichier && <PhotoSheet fichier={fichier} onFermer={() => setFichier(null)} onEnregistrer={enregistrer} />}
    </div>
  )
}
