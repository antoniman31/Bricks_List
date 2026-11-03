import { useEffect, useRef, useState } from 'react'
import Sheet from './Sheet.jsx'
import { ETATS } from '../lib/model.js'
import { MESSAGES } from '../lib/rebrickable.js'
import { chercherLot, cocheParDefaut, construireAjouts, extraireNumeros, LOT_MAX, marquerDoublons } from '../lib/lot.js'

const GROUPES = [
  { cle: 'trouves', titre: 'Trouvés', garde: (r) => r.etat === 'trouve' },
  { cle: 'autres', titre: 'À vérifier', garde: (r) => r.etat !== 'trouve' },
]

function detail(r) {
  if (r.etat === 'trouve') {
    return [r.set.nom, r.set.theme, r.set.annee, r.set.pieces != null ? `${r.set.pieces.toLocaleString('fr-FR')} pièces` : null]
      .filter((d) => d != null && d !== '')
      .join(' · ')
  }
  return r.motif
}

// Ajout de plusieurs sets d'un coup : on colle les numéros, l'app les cherche un
// par un, puis montre ce qu'elle a trouvé AVANT d'écrire quoi que ce soit. Fermer
// la feuille en cours de route n'ajoute rien.
export default function LotSheet({ sets, aCle, statutParDefaut, onChercher, onAjouter, onFermer }) {
  const [texte, setTexte] = useState('')
  const [statut, setStatut] = useState(statutParDefaut)
  const [etat, setEtat] = useState('')
  const [phase, setPhase] = useState('saisie')
  const [erreur, setErreur] = useState('')
  const [ignores, setIgnores] = useState({ invalides: [], tronque: false })
  const [progres, setProgres] = useState({ fait: 0, total: 0 })
  const [resultats, setResultats] = useState([])
  const [coches, setCoches] = useState(new Set())
  const controleur = useRef(null)

  // Fermer la feuille pendant la recherche l'interrompt : les réponses en vol sont
  // ignorées et rien n'est écrit.
  useEffect(() => () => controleur.current?.abort(), [])

  async function lancer() {
    const { numeros, invalides, tronque } = extraireNumeros(texte)
    if (numeros.length === 0) return setErreur('Aucun numéro de set reconnu.')
    setErreur('')
    setIgnores({ invalides, tronque })
    setProgres({ fait: 0, total: numeros.length })
    setPhase('recherche')

    const ctrl = new AbortController()
    controleur.current = ctrl
    const r = await chercherLot(numeros, aCle ? onChercher : null, {
      signal: ctrl.signal,
      onProgres: (fait, total) => setProgres({ fait, total }),
    })
    if (ctrl.signal.aborted) return

    if (r.arret === 'cle') {
      setErreur(MESSAGES.cle)
      return setPhase('saisie')
    }
    const marques = marquerDoublons(r.resultats, sets)
    setResultats(marques)
    setCoches(new Set(marques.flatMap((m, i) => (cocheParDefaut(m) ? [i] : []))))
    setPhase('verification')
  }

  function annuler() {
    controleur.current?.abort()
    setPhase('saisie')
  }

  // Cocher ou décocher tout un groupe d'un geste : sans clé, tout le lot est à
  // vérifier, et dix-huit cases une à une seraient dix-huit gestes.
  function basculerGroupe(indices) {
    setCoches((c) => {
      const toutes = indices.every((i) => c.has(i))
      const suivant = new Set(c)
      for (const i of indices) {
        if (toutes) suivant.delete(i)
        else suivant.add(i)
      }
      return suivant
    })
  }

  function basculer(i) {
    setCoches((c) => {
      const suivant = new Set(c)
      if (suivant.has(i)) suivant.delete(i)
      else suivant.add(i)
      return suivant
    })
  }

  return (
    <Sheet ouvert onFermer={onFermer} titre="Ajouter par lot">
      {phase === 'saisie' && (
        <div className="formulaire">
          <label className="formulaire__champ">
            Numéros des sets
            <textarea
              className="champ champ--texte"
              rows={6}
              placeholder={'75192\n10294\n21330'}
              value={texte}
              onChange={(e) => { setTexte(e.target.value); setErreur('') }}
              spellCheck={false}
            />
          </label>
          <p className="formulaire__aide">Un numéro par ligne, ou séparés par des virgules ou des espaces. {LOT_MAX} maximum.</p>
          {!aCle && (
            <p className="avis" role="status">Sans clé Rebrickable (Réglages), seuls les numéros seront ajoutés : tu complèteras ensuite chaque fiche.</p>
          )}

          <div className="formulaire__ligne">
            <label className="formulaire__champ">
              Statut
              <select className="champ" value={statut} onChange={(e) => setStatut(e.target.value)}>
                <option value="possédé">Possédé</option>
                <option value="souhaité">Souhaité</option>
              </select>
            </label>
            {statut === 'possédé' && (
              <label className="formulaire__champ">
                État
                <select className="champ" value={etat} onChange={(e) => setEtat(e.target.value)}>
                  <option value="">Non précisé</option>
                  {ETATS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </label>
            )}
          </div>

          {erreur && <p className="avis avis--erreur" role="alert">{erreur}</p>}

          <div className="sheet__pied">
            <button type="button" className="bouton" onClick={onFermer}>Annuler</button>
            <button type="button" className="bouton bouton--plein" disabled={texte.trim() === ''} onClick={lancer}>
              {aCle ? 'Chercher' : 'Continuer'}
            </button>
          </div>
        </div>
      )}

      {phase === 'recherche' && (
        <div className="formulaire">
          <p role="status">Recherche {progres.fait} sur {progres.total}…</p>
          <progress className="progression" max={progres.total} value={progres.fait} aria-label="Avancement de la recherche" />
          <button type="button" className="bouton" onClick={annuler}>Annuler</button>
        </div>
      )}

      {phase === 'verification' && (
        <div className="formulaire">
          {ignores.invalides.length > 0 && (
            <p className="avis" role="status">Ignoré, ce n'est pas un numéro : {ignores.invalides.join(', ')}.</p>
          )}
          {ignores.tronque && <p className="avis" role="status">Seuls les {LOT_MAX} premiers numéros sont traités.</p>}

          {GROUPES.map((g) => {
            const lignes = resultats.map((r, i) => ({ r, i })).filter(({ r }) => g.garde(r))
            if (lignes.length === 0) return null
            return (
              <section key={g.cle} className="lot__groupe">
                <div className="lot__entete">
                  <h3 className="reglage__titre">{g.titre} ({lignes.length})</h3>
                  <button type="button" className="bouton" onClick={() => basculerGroupe(lignes.map(({ i }) => i))}>
                    {lignes.every(({ i }) => coches.has(i)) ? 'Tout décocher' : 'Tout cocher'}
                  </button>
                </div>
                <ul className="lot__liste">
                  {lignes.map(({ r, i }) => (
                    <li key={i}>
                      <label className="coche">
                        <input type="checkbox" checked={coches.has(i)} onChange={() => basculer(i)} />
                        <span className="coche__texte">
                          <span className="coche__numero">{r.numero}</span>
                          <span className="coche__detail">{detail(r)}</span>
                          {r.doublon === 'collection' && <span className="coche__alerte">Déjà dans ta collection</span>}
                          {r.doublon === 'liste' && <span className="coche__alerte">Déjà plus haut dans la liste</span>}
                          {r.etat === 'trouve' && r.motif && <span className="coche__alerte">{r.motif}</span>}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
          <p className="formulaire__aide">
            Les lignes à vérifier sont décochées : coche-les pour les ajouter avec leur seul numéro, tu les complèteras ensuite dans « À compléter ».
          </p>

          <div className="sheet__pied sheet__pied--collant">
            <button type="button" className="bouton" onClick={() => setPhase('saisie')}>Modifier la liste</button>
            <button
              type="button"
              className="bouton bouton--plein"
              disabled={coches.size === 0}
              onClick={() => onAjouter(construireAjouts(resultats, coches, { statut, etat }), statut)}
            >
              Ajouter {coches.size} set{coches.size > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
