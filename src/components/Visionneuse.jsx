import { useEffect, useRef, useState } from 'react'
import Icone from './Icones.jsx'
import ImageDiapo from './ImageDiapo.jsx'
import { nomFichierImage } from '../lib/partageImage.js'

const PEUT_PARTAGER = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

// Enregistre le fichier par un lien de téléchargement : ce que fait un navigateur qui ne sait pas partager (Chrome sur ordinateur).
function telecharger(blob, nom) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// Les images du set en plein écran : fond noir, l'image entière (un appui zoome, un second dézoome ; on se déplace en faisant défiler),
// flèches pour passer à l'image voisine (et touches ← →), partage ou enregistrement, étoile « image de la liste ». Construit sur
// <dialog> comme les feuilles : le navigateur gère le focus, Échap et l'inertie du reste de la page.
export default function Visionneuse({ set, diapos, cle, onAller, onFermer, imageListe, lectureSeule, onBasculerListe }) {
  const ref = useRef(null)
  const scene = useRef(null)
  const [zoom, setZoom] = useState(false)
  const [message, setMessage] = useState('')
  const trouve = diapos.findIndex((d) => d.cle === cle)
  const index = trouve < 0 ? 0 : trouve
  const diapo = diapos[index]

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])

  function aller(delta) {
    const cible = diapos[index + delta]
    if (!cible) return
    onAller(cible.cle)
    setZoom(false)
    setMessage('')
    scene.current?.scrollTo?.(0, 0)
  }

  // Partage l'image affichée en fichier. Une image d'un autre site sans autorisation (le rendu Rebrickable tant qu'il n'est pas
  // copié sur l'appareil) ne peut pas être lue par l'appli : on le dit, avec le geste qui règle le problème.
  async function partager() {
    const img = scene.current?.querySelector('img')
    if (!img?.currentSrc) return setMessage('L\'image n\'est pas encore chargée.')
    setMessage('')
    try {
      const reponse = await fetch(img.currentSrc)
      const blob = await reponse.blob()
      const nom = nomFichierImage(set.numero, diapo.cle, blob.type)
      if (!nom) return setMessage('Ce type de fichier ne peut pas être partagé.')
      const fichier = new File([blob], nom, { type: blob.type })
      if (PEUT_PARTAGER && navigator.canShare?.({ files: [fichier] })) await navigator.share({ files: [fichier], title: set.nom })
      else telecharger(blob, nom)
    } catch (e) {
      if (e?.name === 'AbortError') return // partage annulé par la personne
      setMessage('Cette image ne peut pas être copiée d\'ici : garde-la d\'abord sur l\'appareil (Réglages > Images sur l\'appareil).')
    }
  }

  return (
    <dialog
      ref={ref}
      className="visionneuse"
      aria-label={`Images de ${set.nom}`}
      // React fait remonter `close` et `cancel` jusqu'à la feuille de la fiche, qui se fermerait avec le plein écran : on les arrête ici.
      onClose={(e) => { e.stopPropagation(); onFermer() }}
      onCancel={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') { aller(-1); e.preventDefault() }
        if (e.key === 'ArrowRight') { aller(1); e.preventDefault() }
      }}
    >
      <div className="visionneuse__haut">
        <p className="visionneuse__legende" aria-live="polite">
          {diapo.libelle}{diapos.length > 1 ? ` · ${index + 1}/${diapos.length}` : ''}
          {imageListe === diapo.cle && <span className="visuellement-cache"> (image de la liste)</span>}
        </p>
        <button type="button" className="icone-btn visionneuse__fermer" aria-label="Fermer le plein écran" onClick={() => ref.current?.close()}>
          <Icone nom="fermer" />
        </button>
      </div>

      <div ref={scene} className={`visionneuse__scene${zoom ? ' visionneuse__scene--zoom' : ''}`}>
        <button type="button" className="visionneuse__image" aria-label={zoom ? 'Dézoomer' : 'Zoomer'} aria-pressed={zoom} onClick={() => setZoom((z) => !z)}>
          <ImageDiapo key={diapo.cle} set={set} diapo={diapo} variante="plein" />
        </button>
      </div>

      {message && <p className="visionneuse__message" role="alert">{message}</p>}

      <div className="visionneuse__bas">
        <button type="button" className="icone-btn visionneuse__fleche" aria-label="Image précédente" disabled={index === 0} onClick={() => aller(-1)}>
          <Icone nom="precedent" />
        </button>
        <button type="button" className="bouton visionneuse__action" onClick={partager}>
          <Icone nom="partager" />{PEUT_PARTAGER ? 'Partager' : 'Enregistrer'}
        </button>
        <button
          type="button"
          className="bouton visionneuse__action"
          aria-pressed={imageListe === diapo.cle}
          disabled={lectureSeule}
          onClick={() => onBasculerListe(diapo.cle)}
        >
          <Icone nom="etoile" />{imageListe === diapo.cle ? 'Image de la liste' : 'Pour la liste'}
        </button>
        <button type="button" className="icone-btn visionneuse__fleche" aria-label="Image suivante" disabled={index === diapos.length - 1} onClick={() => aller(1)}>
          <Icone nom="suivant" />
        </button>
      </div>
    </dialog>
  )
}
