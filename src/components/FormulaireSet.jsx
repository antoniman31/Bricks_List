import { useRef, useState } from 'react'
import Sheet from './Sheet.jsx'
import Vignette from './Vignette.jsx'
import ChoixEmplacement from './ChoixEmplacement.jsx'
import { normaliserNumero } from '../lib/numero.js'
import { normaliserSet, ETATS, LIBELLES_PRIORITE, PRIORITES } from '../lib/model.js'
import { analyserSaisie, basculerDansSaisie, cleEtiquette, formaterSaisie, preparerSaisie } from '../lib/etiquettes.js'
import { messageErreur, MESSAGES, MOTS_MIN } from '../lib/rebrickable.js'

const RECHERCHE_VIDE = { etat: 'repos', message: '', avertissements: [] }
const NOM_VIDE = { mots: '', etat: 'repos', message: '', resultats: [], page: 1, suite: false, total: 0 }
const VIDE = { numero: '', nom: '', theme: '', annee: '', pieces: '', etat: '', notes: '', emplacement: '', boite: '', notice: '', priorite: '', dateAchat: '', dateMontage: '', etiquettes: '' }

function versChamps(set) {
  return {
    numero: set.numero,
    nom: set.nom,
    theme: set.theme,
    annee: set.annee ?? '',
    pieces: set.pieces ?? '',
    etat: set.etat ?? '',
    notes: set.notes,
    emplacement: set.emplacement ?? '',
    boite: set.boite ?? '',
    notice: set.notice ?? '',
    priorite: set.priorite ?? '',
    dateAchat: set.dateAchat ?? '',
    dateMontage: set.dateMontage ?? '',
    etiquettes: formaterSaisie(set.etiquettes ?? []),
  }
}

// Sert à l'ajout et à la modification. La validation finale est celle du
// modèle (normaliserSet) : un set qui passe ici est un set que le stockage
// acceptera, sans deuxième jeu de règles à tenir à jour.
export default function FormulaireSet({ initial, statutParDefaut, themesConnus, emplacementsConnus, etiquettesConnues, compterExemplaires, valeurs, aCle, onChercher, onRechercherNom, onChoisirResultat, onValider, onFermer }) {
  const [depart] = useState(() => (initial ? versChamps(initial) : { ...VIDE, ...valeurs }))
  const [champs, setChamps] = useState(depart)
  const [statut, setStatut] = useState(initial?.statut ?? statutParDefaut)
  const [erreur, setErreur] = useState('')
  const [doublonConfirme, setDoublonConfirme] = useState(false)
  const [avertissement, setAvertissement] = useState('')
  const [image, setImage] = useState(initial?.image ?? null)
  const [recherche, setRecherche] = useState(RECHERCHE_VIDE)
  const [nom, setNom] = useState(NOM_VIDE)
  // Numérote les recherches : une réponse qui arrive après que le numéro a changé
  // appartient à un autre set et ne doit pas remplir le formulaire.
  const jeton = useRef(0)
  // Même principe pour la recherche par nom : on ne garde que la réponse la plus récente.
  const jetonNom = useRef(0)

  const maj = (cle) => (e) => {
    if (cle === 'numero') {
      jeton.current += 1
      setRecherche(RECHERCHE_VIDE)
      // L'image n'appartient qu'au numéro pour lequel elle a été trouvée.
      setImage(initial && normaliserNumero(e.target.value) === initial.numero ? initial.image : null)
    }
    setChamps((c) => ({ ...c, [cle]: e.target.value }))
    setErreur('')
    setAvertissement('')
    setDoublonConfirme(false)
  }

  // Remplit le formulaire avec un set venu de Rebrickable, que ce soit par numéro ou
  // par choix dans une liste de résultats. En modification, la recherche remplace nom,
  // thème, année, pièces et image, mais jamais le statut, l'état ni les notes : ce sont
  // des choix de l'utilisateur.
  function remplir(set, avertissements) {
    setChamps((c) => ({
      ...c,
      numero: set.numero,
      nom: set.nom,
      theme: set.theme || c.theme,
      annee: set.annee ?? '',
      pieces: set.pieces ?? '',
    }))
    setImage(set.image)
    setErreur('')
    setRecherche({ etat: 'ok', message: 'Rempli depuis Rebrickable : vérifie.', avertissements })
  }

  async function chercher() {
    const numero = normaliserNumero(champs.numero)
    if (!numero) return setRecherche({ etat: 'erreur', message: MESSAGES.numero, avertissements: [] })
    jeton.current += 1
    const mien = jeton.current
    setRecherche({ etat: 'charge', message: 'Recherche…', avertissements: [] })
    try {
      const { set, avertissements } = await onChercher(numero)
      if (mien !== jeton.current) return
      remplir(set, avertissements)
    } catch (e) {
      if (mien !== jeton.current) return
      setRecherche({ etat: 'erreur', message: `${messageErreur(e)} Saisis à la main.`, avertissements: [] })
    }
  }

  async function chercherParNom(page = 1) {
    const mots = nom.mots.trim()
    if (mots.length < MOTS_MIN) return setNom((n) => ({ ...n, etat: 'erreur', message: MESSAGES.requete }))
    jetonNom.current += 1
    const mien = jetonNom.current
    setNom((n) => ({ ...n, etat: 'charge', message: 'Recherche…' }))
    try {
      const r = await onRechercherNom(mots, page)
      if (mien !== jetonNom.current) return
      setNom((n) => ({
        ...n,
        etat: 'ok',
        message: r.resultats.length === 0 && page === 1 ? 'Aucun résultat. Noms en anglais (« falcon »).' : '',
        resultats: page === 1 ? r.resultats : [...n.resultats, ...r.resultats],
        page,
        suite: r.suite,
        total: r.total,
      }))
    } catch (e) {
      if (mien !== jetonNom.current) return
      setNom((n) => ({ ...n, etat: 'erreur', message: `${messageErreur(e)} Saisis à la main.` }))
    }
  }

  // Le thème n'est résolu qu'ici, pour le résultat choisi : le résoudre pour toute la
  // page ferait dix appels pour un seul utile.
  async function choisirResultat(resultat) {
    jeton.current += 1
    const mien = jeton.current
    jetonNom.current += 1
    setNom((n) => ({ ...n, etat: 'charge', message: 'Récupération du thème…' }))
    try {
      const { set, avertissements } = await onChoisirResultat(resultat)
      if (mien !== jeton.current) return
      remplir(set, avertissements)
      setNom(NOM_VIDE)
    } catch (e) {
      if (mien !== jeton.current) return
      setNom((n) => ({ ...n, etat: 'erreur', message: `${messageErreur(e)} Saisis à la main.` }))
    }
  }

  function valider(e) {
    e.preventDefault()
    const numero = normaliserNumero(champs.numero)
    if (!numero) return setErreur('Numéro invalide (ex. 75192).')
    if (champs.nom.trim() === '') return setErreur('Le nom est obligatoire.')
    for (const [cle, libelle] of [['annee', 'L\'année'], ['pieces', 'Le nombre de pièces']]) {
      const v = String(champs[cle]).trim()
      if (v !== '' && !/^\d+$/.test(v)) return setErreur(`${libelle} doit être un nombre entier.`)
    }

    const etiquettes = preparerSaisie(champs.etiquettes)
    if (etiquettes.erreur) return setErreur(etiquettes.erreur)

    const brut = {
      numero,
      nom: champs.nom,
      theme: champs.theme,
      annee: String(champs.annee).trim() === '' ? null : champs.annee,
      pieces: String(champs.pieces).trim() === '' ? null : champs.pieces,
      statut,
      etat: statut === 'possédé' && champs.etat !== '' ? champs.etat : null,
      notes: champs.notes,
      emplacement: statut === 'possédé' ? champs.emplacement : '',
      boite: statut === 'possédé' && champs.boite !== '' ? champs.boite : null,
      notice: statut === 'possédé' && champs.notice !== '' ? champs.notice : null,
      priorite: statut === 'souhaité' && champs.priorite !== '' ? champs.priorite : null,
      dateAchat: statut === 'possédé' && champs.dateAchat !== '' ? champs.dateAchat : null,
      dateMontage: statut === 'possédé' && champs.dateMontage !== '' ? champs.dateMontage : null,
      etiquettes: etiquettes.liste,
      image,
    }
    const verifie = normaliserSet(brut)
    if (!verifie || verifie.corrections > 0) return setErreur('Hors limites : année (dès 1949), pièces ou dates (pas dans le futur).')

    // Un deuxième exemplaire est légitime (deux boîtes, deux états), mais le plus
    // souvent un doublon est une erreur de saisie : on demande une confirmation.
    if (!initial && !doublonConfirme) {
      const n = compterExemplaires(numero)
      if (n > 0) {
        setAvertissement(`Déjà présent (${n} exemplaire${n > 1 ? 's' : ''}).`)
        setDoublonConfirme(true)
        return
      }
    }
    onValider(brut)
  }

  return (
    <Sheet
      ouvert
      pleinEcran
      onFermer={onFermer}
      titre={initial ? 'Modifier le set' : 'Ajouter un set'}
      modifie={JSON.stringify(champs) !== JSON.stringify(depart)}
      pied={(
        <>
          <button type="button" className="bouton" onClick={onFermer}>Annuler</button>
          <button type="submit" form="formulaire-set" className="bouton bouton--plein" disabled={Boolean(initial) && JSON.stringify(champs) === JSON.stringify(depart) && statut === initial.statut}>
            {initial ? 'Enregistrer' : doublonConfirme ? 'Ajouter quand même' : 'Ajouter'}
          </button>
        </>
      )}
    >
      <form id="formulaire-set" className="formulaire" onSubmit={valider} noValidate>
        <div className="formulaire__champ">
          <label htmlFor="champ-numero">Numéro</label>
          <div className="formulaire__recherche">
            <input id="champ-numero" className="champ" inputMode="numeric" autoComplete="off" placeholder="75192" value={champs.numero} onChange={maj('numero')} />
            {aCle && (
              <button type="button" className="bouton" disabled={recherche.etat === 'charge'} onClick={chercher}>
                {recherche.etat === 'charge' ? '…' : 'Chercher'}
              </button>
            )}
          </div>
          {!aCle && (
            <span className="formulaire__aide">Clé Rebrickable requise (Réglages).</span>
          )}
          {recherche.message && (
            <span className={`formulaire__aide${recherche.etat === 'erreur' ? ' formulaire__aide--erreur' : ''}`} role={recherche.etat === 'erreur' ? 'alert' : 'status'}>
              {recherche.message}
            </span>
          )}
          {recherche.avertissements.map((a) => <span key={a} className="formulaire__aide" role="status">{a}</span>)}
          {image && <Vignette image={image} numero={champs.numero} variante="apercu" />}
        </div>
        {!initial && aCle && (
          <div className="formulaire__champ">
            <label htmlFor="champ-recherche-nom">Ou chercher par nom</label>
            <div className="formulaire__recherche">
              <input
                id="champ-recherche-nom"
                className="champ"
                autoComplete="off"
                placeholder="millennium falcon"
                value={nom.mots}
                onChange={(e) => { jetonNom.current += 1; setNom((n) => ({ ...n, mots: e.target.value, etat: n.etat === 'charge' ? 'repos' : n.etat, message: '' })) }}
                // Entrée lance la recherche : sans cela elle validerait tout le formulaire.
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); chercherParNom(1) } }}
              />
              <button type="button" className="bouton" disabled={nom.etat === 'charge'} onClick={() => chercherParNom(1)}>
                {nom.etat === 'charge' ? '…' : 'Chercher'}
              </button>
            </div>
            <span className="formulaire__aide">Noms en anglais (« falcon »).</span>
            {nom.message && (
              <span className={`formulaire__aide${nom.etat === 'erreur' ? ' formulaire__aide--erreur' : ''}`} role={nom.etat === 'erreur' ? 'alert' : 'status'}>
                {nom.message}
              </span>
            )}
            {nom.resultats.length > 0 && (
              <>
                <span className="formulaire__aide" role="status">{nom.resultats.length} sur {nom.total.toLocaleString('fr-FR')} résultat{nom.total > 1 ? 's' : ''}</span>
                <ul className="resultats">
                  {nom.resultats.map((r) => (
                    <li key={r.numero}>
                      <button type="button" className="resultat" onClick={() => choisirResultat(r)}>
                        <Vignette image={r.image} numero={r.numero} variante="mini" />
                        <span className="resultat__texte">
                          <span className="resultat__nom">{r.nom}</span>
                          <span className="resultat__details">{[r.numero, r.annee, r.pieces != null ? `${r.pieces.toLocaleString('fr-FR')} pièces` : null].filter((d) => d != null).join(' · ')}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {nom.suite && (
                  <button type="button" className="bouton" disabled={nom.etat === 'charge'} onClick={() => chercherParNom(nom.page + 1)}>
                    Plus de résultats
                  </button>
                )}
              </>
            )}
          </div>
        )}
        <label className="formulaire__champ">
          Nom
          <input className="champ" autoComplete="off" value={champs.nom} onChange={maj('nom')} />
        </label>
        <label className="formulaire__champ">
          Thème
          <input className="champ" list="themes-connus" autoComplete="off" value={champs.theme} onChange={maj('theme')} />
          <datalist id="themes-connus">
            {themesConnus.map((t) => <option key={t} value={t} />)}
          </datalist>
        </label>
        <div className="formulaire__ligne">
          <label className="formulaire__champ">
            Année
            <input className="champ" inputMode="numeric" autoComplete="off" value={champs.annee} onChange={maj('annee')} />
          </label>
          <label className="formulaire__champ">
            Pièces
            <input className="champ" inputMode="numeric" autoComplete="off" value={champs.pieces} onChange={maj('pieces')} />
          </label>
        </div>
        <div className="formulaire__ligne">
          <label className="formulaire__champ">
            Statut
            <select className="champ" value={statut} onChange={(e) => setStatut(e.target.value)}>
              <option value="possédé">Possédé</option>
              <option value="souhaité">Souhaité</option>
            </select>
          </label>
          {statut === 'souhaité' && (
            <label className="formulaire__champ">
              Priorité
              <select className="champ" value={champs.priorite} onChange={maj('priorite')}>
                <option value="">Non précisée</option>
                {PRIORITES.map((p) => <option key={p} value={p}>{LIBELLES_PRIORITE[p]}</option>)}
              </select>
            </label>
          )}
          {statut === 'possédé' && (
            <label className="formulaire__champ">
              État
              <select className="champ" value={champs.etat} onChange={maj('etat')}>
                <option value="">Non précisé</option>
                {ETATS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </label>
          )}
        </div>
        {statut === 'possédé' && (
          <>
            <div className="formulaire__champ">
              <span>Emplacement de rangement</span>
              <ChoixEmplacement libelle="Emplacement de rangement" lieux={emplacementsConnus} valeur={champs.emplacement} vide="Sans emplacement" onChange={(v) => maj('emplacement')({ target: { value: v } })} />
            </div>
            <div className="formulaire__ligne">
              <label className="formulaire__champ">
                Boîte
                <select className="champ" value={champs.boite} onChange={maj('boite')}>
                  <option value="">Non précisé</option>
                  <option value="oui">Présente</option>
                  <option value="non">Absente</option>
                </select>
              </label>
              <label className="formulaire__champ">
                Notice
                <select className="champ" value={champs.notice} onChange={maj('notice')}>
                  <option value="">Non précisé</option>
                  <option value="oui">Présente</option>
                  <option value="non">Absente</option>
                </select>
              </label>
            </div>
            <div className="formulaire__ligne">
              <label className="formulaire__champ">
                Acheté le
                <input className="champ" type="date" min="1949-01-01" value={champs.dateAchat} onChange={maj('dateAchat')} />
              </label>
              <label className="formulaire__champ">
                Monté le
                <input className="champ" type="date" min="1949-01-01" value={champs.dateMontage} onChange={maj('dateMontage')} />
              </label>
            </div>
          </>
        )}
        <label className="formulaire__champ">
          Étiquettes
          <input className="champ" autoComplete="off" placeholder="cadeau, à offrir…" value={champs.etiquettes} onChange={maj('etiquettes')} />
          <span className="formulaire__aide">Séparées par des virgules (8 max).</span>
        </label>
        {etiquettesConnues.length > 0 && (
          <div className="stats__puces" role="group" aria-label="Étiquettes déjà utilisées">
            {etiquettesConnues.map((e) => (
              <button
                key={e}
                type="button"
                className="puce"
                aria-pressed={analyserSaisie(champs.etiquettes).some((x) => cleEtiquette(x) === cleEtiquette(e))}
                onClick={() => setChamps((c) => ({ ...c, etiquettes: basculerDansSaisie(c.etiquettes, e) }))}
              >
                {e}
              </button>
            ))}
          </div>
        )}
        <label className="formulaire__champ">
          Notes
          <textarea className="champ champ--texte" rows={3} value={champs.notes} onChange={maj('notes')} />
        </label>

        {erreur && <p className="avis avis--erreur" role="alert">{erreur}</p>}
        {avertissement && <p className="avis" role="status">{avertissement}</p>}
      </form>
    </Sheet>
  )
}
