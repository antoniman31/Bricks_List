import { useContext, useRef, useState } from 'react'
import PhotoSheet from './PhotoSheet.jsx'
import ImageDiapo from './ImageDiapo.jsx'
import Visionneuse from './Visionneuse.jsx'
import Icone from './Icones.jsx'
import ImagesContext from '../ImagesContext.js'
import { NUMEROS_PHOTO, PHOTOS_MAX, choisirImage, choixPhoto, clePhoto, diapositives, numeroPhotoDe } from '../lib/imageListe.js'
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

const SEUIL_GLISSE = 48

// L'image en tête de fiche, en grand : un carrousel des images du set (boîte, rendu Rebrickable, photos personnelles), qu'on fait
// défiler en glissant ou avec les flèches, avec le titre posé dessus. Un appui sur l'image l'ouvre en plein écran. La fiche
// s'ouvre sur l'image choisie pour la liste (sinon sur celle de la règle des Réglages). Une étoile, en bas à droite, fait de l'image
// qu'on regarde celle du set dans la liste. Les actions de la photo perso (reprendre, galerie, retirer) restent dessous.
export default function PhotoFiche({ set, lectureSeule, onChanger, sousTitre = '' }) {
  const { photos, regle, rafraichir } = useContext(ImagesContext)
  const diapos = diapositives(set, photos, lectureSeule)
  // La fiche s'ouvre sur l'image de la liste (une photo voulue mais absente retombe sur la boîte, voir `choisirImage`). Tant qu'on n'a
  // pas touché au carrousel, on suit ce choix à chaque affichage : dans le panneau d'un grand écran, la fiche s'affiche avant que la
  // liste des photos soit lue, et elle doit ensuite se placer d'elle-même sur la bonne image.
  const [choisieParMoi, setChoisieParMoi] = useState(null)
  const parDefaut = (() => {
    const choix = choisirImage(set, regle, (n) => photos.has(clePhoto(set.id, n)))
    return choix === 'rendu' && !set.image ? 'boite' : choix
  })()
  const vue = choisieParMoi ?? parDefaut
  const setVue = setChoisieParMoi
  const [fichier, setFichier] = useState(null)
  const [retrait, setRetrait] = useState(false)
  const [probleme, setProbleme] = useState('')
  const [plein, setPlein] = useState(false)
  const depart = useRef(null)
  const geste = useRef(false)

  const trouve = diapos.findIndex((d) => d.cle === vue)
  const index = trouve < 0 ? 0 : trouve
  const diapo = diapos[index]
  const nPhoto = numeroPhotoDe(diapo.cle)

  function aller(delta) {
    const cible = diapos[index + delta]
    if (cible) { setVue(cible.cle); setProbleme(''); setRetrait(false) }
  }

  // Le numéro de photo où écrire : la photo qu'on regarde, ou la première place libre sur la diapositive « ajouter ».
  const placeLibre = () => NUMEROS_PHOTO.find((n) => !photos.has(clePhoto(set.id, n))) ?? null

  async function enregistrer(blob) {
    const n = nPhoto ?? placeLibre()
    if (n === null) return { ok: false, erreur: `${PHOTOS_MAX} photos au plus par set.` }
    try {
      await ecrirePhoto(clePhoto(set.id, n), blob)
      // On attend la liste à jour avant d'aller voir la photo : sa diapositive n'existe qu'ensuite.
      await rafraichir()
      setVue(choixPhoto(n))
      return { ok: true }
    } catch (e) {
      return { ok: false, erreur: messageErreur(e) }
    }
  }

  async function retirer() {
    try {
      await supprimerPhoto(clePhoto(set.id, nPhoto))
      await rafraichir()
      setRetrait(false)
      // Plus de photo à montrer : si elle était l'image de la liste, le set repasse en automatique.
      if (set.imageListe === diapo.cle) onChanger?.({ imageListe: null })
      setVue('boite')
      setProbleme('')
    } catch {
      setProbleme('La photo n\'a pas pu être retirée.')
    }
  }

  // Étoile : l'image qu'on regarde devient celle de la liste (ou cesse de l'être). Pas sur la diapositive « ajouter ».
  function basculerListe(cle) {
    setVue(vue) // on reste sur l'image qu'on regarde, même si le choix de la liste (et donc l'image par défaut) change
    const ok = onChanger?.({ imageListe: set.imageListe === cle ? null : cle })
    setProbleme(ok === false ? 'Modification refusée.' : '')
  }

  const peutChoisir = diapo.cle !== 'ajout'
  const choisie = set.imageListe === diapo.cle
  // Le rang ne compte que les vraies images : la diapositive « ajouter » n'en est pas une.
  const reelles = diapos.filter((d) => d.cle !== 'ajout').length
  const legende = diapo.cle === 'ajout' || reelles < 2 ? diapo.libelle : `${diapo.libelle} · ${index + 1}/${reelles}`

  // Glisser l'image change de diapositive ; un simple appui l'ouvre en plein écran. `touch-action: pan-y` laisse la page défiler
  // verticalement : seul le mouvement horizontal est à nous.
  function debutGeste(e) { depart.current = { x: e.clientX, y: e.clientY } }
  function finGeste(e) {
    const d = depart.current
    depart.current = null
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.abs(dx) > SEUIL_GLISSE && Math.abs(dx) > Math.abs(dy)) {
      geste.current = true
      aller(dx < 0 ? 1 : -1)
    }
  }
  function toucheImage() {
    if (geste.current) { geste.current = false; return }
    if (diapo.cle !== 'ajout') setPlein(true)
  }
  function touche(e) {
    if (e.key === 'ArrowLeft') { aller(-1); e.preventDefault() }
    if (e.key === 'ArrowRight') { aller(1); e.preventDefault() }
  }

  return (
    <div className="photo-fiche heros" role="group" aria-roledescription="carrousel" aria-label="Images du set">
      <div className="heros__image">
        {diapo.cle === 'ajout' ? (
          <div className="photo-vide">{nPhoto === null && !diapos.some((d) => d.n) ? 'Pas encore de photo pour ce set.' : 'Ajoute une autre photo de ce set.'}</div>
        ) : (
          <ImageDiapo key={diapo.cle} set={set} diapo={diapo} variante="fiche" />
        )}

        {diapo.cle !== 'ajout' && (
          <button
            type="button"
            className="heros__ouvrir"
            aria-label="Voir en plein écran"
            onPointerDown={debutGeste}
            onPointerUp={finGeste}
            onPointerCancel={() => { depart.current = null }}
            onClick={toucheImage}
            onKeyDown={touche}
          />
        )}
        {diapo.cle === 'ajout' && <span className="heros__ouvrir heros__ouvrir--ajout" onPointerDown={debutGeste} onPointerUp={finGeste} onKeyDown={touche} />}

        <p className="heros__legende" aria-live="polite">
          {set.imageListe === diapo.cle && <span className="puce__etoile"><Icone nom="etoile" /></span>}
          {legende}
          {set.imageListe === diapo.cle && <span className="visuellement-cache"> (image de la liste)</span>}
        </p>

        {index > 0 && (
          <button type="button" className="heros__fleche heros__fleche--gauche" aria-label="Image précédente" onClick={() => aller(-1)}>
            <Icone nom="precedent" />
          </button>
        )}
        {index < diapos.length - 1 && (
          <button type="button" className="heros__fleche heros__fleche--droite" aria-label="Image suivante" onClick={() => aller(1)}>
            <Icone nom="suivant" />
          </button>
        )}

        {peutChoisir && (
          <button
            type="button"
            className="heros__etoile"
            aria-pressed={choisie}
            aria-label={choisie ? 'Image de la liste' : 'Utiliser dans la liste'}
            title={choisie ? 'Image de la liste' : 'Utiliser dans la liste'}
            disabled={lectureSeule}
            onClick={() => basculerListe(diapo.cle)}
          >
            <Icone nom="etoile" />
          </button>
        )}

        <div className="heros__titre">
          <p>{sousTitre}</p>
          <h2>{set.nom}</h2>
        </div>
      </div>

      {(nPhoto !== null || diapo.cle === 'ajout') && !retrait && (
        <div className="photo-actions">
          <ChoixFichier libelle={nPhoto !== null ? 'Reprendre' : 'Prendre une photo'} camera desactive={lectureSeule} onChoisi={setFichier} />
          <ChoixFichier libelle={nPhoto !== null ? 'Galerie' : 'Choisir dans la galerie'} desactive={lectureSeule} onChoisi={setFichier} />
          {nPhoto !== null && <button type="button" className="bouton bouton--danger" disabled={lectureSeule} onClick={() => setRetrait(true)}>Retirer</button>}
        </div>
      )}

      {retrait && (
        <div className="avis avis--erreur" role="alertdialog" aria-label="Confirmer le retrait de la photo">
          <p>Retirer cette photo ? Retire-la seulement si tu as une sauvegarde : elle serait perdue.</p>
          <div className="sheet__pied">
            <button type="button" className="bouton" onClick={() => setRetrait(false)}>Annuler</button>
            <button type="button" className="bouton bouton--danger" onClick={retirer}>Retirer</button>
          </div>
        </div>
      )}
      {probleme && <p className="avis avis--erreur" role="alert">{probleme}</p>}

      {fichier && <PhotoSheet fichier={fichier} onFermer={() => setFichier(null)} onEnregistrer={enregistrer} />}

      {plein && (
        <Visionneuse
          set={set}
          diapos={diapos.filter((d) => d.cle !== 'ajout')}
          cle={vue}
          onAller={setVue}
          onFermer={() => setPlein(false)}
          imageListe={set.imageListe}
          lectureSeule={lectureSeule}
          onBasculerListe={basculerListe}
        />
      )}
    </div>
  )
}
