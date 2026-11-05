import { useState } from 'react'
import PhotoSheet from './PhotoSheet.jsx'
import Vignette from './Vignette.jsx'
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

// L'image en tête de fiche : la boîte (BrickLink, ou le rendu Rebrickable) ou la photo personnelle,
// au choix. La boîte reste l'affichage par défaut ; les listes ne changent pas.
export default function PhotoFiche({ set, lectureSeule }) {
  const [vue, setVue] = useState('boite')
  const [fichier, setFichier] = useState(null)
  const [retrait, setRetrait] = useState(false)
  const [probleme, setProbleme] = useState('')
  const photo = usePhoto(set.id)

  async function enregistrer(blob) {
    try {
      await ecrirePhoto(set.id, blob)
      photo.recharger()
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
      setRetrait(false)
      setProbleme('')
    } catch {
      setProbleme('La photo n\'a pas pu être retirée.')
    }
  }

  return (
    <div className="photo-fiche">
      <div className="groupe__options" role="group" aria-label="Image du set">
        <button type="button" className="puce" aria-pressed={vue === 'boite'} onClick={() => setVue('boite')}>Boîte</button>
        <button type="button" className="puce" aria-pressed={vue === 'photo'} onClick={() => setVue('photo')}>Ma photo</button>
      </div>

      {vue === 'boite' && <Vignette image={set.image} numero={set.numero} variante="fiche" />}

      {vue === 'photo' && (
        <>
          {photo.chargement && <div className="photo-vide" role="status">Chargement…</div>}
          {!photo.chargement && photo.url && <img className="vignette vignette--fiche" src={photo.url} alt={`Ma photo de ${set.nom}`} />}
          {!photo.chargement && !photo.url && (
            <div className="photo-vide">{photo.erreur ? 'La photo n\'a pas pu être lue.' : 'Pas encore de photo pour ce set.'}</div>
          )}

          {!photo.chargement && !retrait && (
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
        </>
      )}

      {fichier && <PhotoSheet fichier={fichier} onFermer={() => setFichier(null)} onEnregistrer={enregistrer} />}
    </div>
  )
}
