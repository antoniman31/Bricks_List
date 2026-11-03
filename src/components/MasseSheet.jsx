import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { ETATS } from '../lib/model.js'
import { apercuModification } from '../lib/collection.js'
import { exporter } from '../lib/partage.js'
import { aujourdhuiISO } from '../lib/dates.js'
import { telecharger } from '../lib/fichier.js'

const VIDE = '__vide'
const CHAMPS_VIDES = { emplacement: '', effacerEmplacement: false, etat: '', boite: '', notice: '' }
const LIBELLES_OUI_NON = { oui: 'présente', non: 'absente' }

// Ce que l'utilisateur a réellement demandé : seuls les champs touchés figurent dans les
// changements, un champ laissé sur « Ne pas changer » n'y est pas.
function construire(champs, statut) {
  if (statut === 'souhaité') {
    return { statut: 'possédé', etat: champs.etat === '' || champs.etat === VIDE ? null : champs.etat, dateAchat: aujourdhuiISO() }
  }
  const c = {}
  if (champs.effacerEmplacement) c.emplacement = ''
  else if (champs.emplacement.trim() !== '') c.emplacement = champs.emplacement.trim()
  if (champs.etat !== '') c.etat = champs.etat === VIDE ? null : champs.etat
  if (champs.boite !== '') c.boite = champs.boite === VIDE ? null : champs.boite
  if (champs.notice !== '') c.notice = champs.notice === VIDE ? null : champs.notice
  return c
}

function resume(changements) {
  const l = []
  if ('statut' in changements) l.push(`Passent en collection${changements.etat ? `, état « ${changements.etat} »` : ''}`)
  else {
    if ('emplacement' in changements) l.push(changements.emplacement === '' ? 'Emplacement effacé' : `Emplacement : ${changements.emplacement}`)
    if ('etat' in changements) l.push(changements.etat === null ? 'État effacé' : `État : ${changements.etat}`)
    if ('boite' in changements) l.push(changements.boite === null ? 'Boîte : non précisé' : `Boîte : ${LIBELLES_OUI_NON[changements.boite]}`)
    if ('notice' in changements) l.push(changements.notice === null ? 'Notice : non précisé' : `Notice : ${LIBELLES_OUI_NON[changements.notice]}`)
  }
  return l
}

const NOMS_CHAMPS = { emplacement: 'un emplacement', etat: 'un état', boite: 'une valeur de boîte', notice: 'une valeur de notice' }

function ListeSets({ sets }) {
  return (
    <ul className="masse__liste" aria-label="Sets concernés">
      {sets.map((s) => (
        <li key={s.id} className="masse__ligne">
          <span className="masse__nom">{s.nom}</span>
          <span className="masse__numero">{s.numero}</span>
        </li>
      ))}
    </ul>
  )
}

// Modification ou suppression de plusieurs sets : toujours un aperçu avant d'écrire, avec
// la liste des sets concernés. Une modification de masse se trompe vite, et l'aperçu est
// l'endroit où l'on s'en aperçoit.
export default function MasseSheet({ action, sets, tous, statut, emplacementsConnus, onAppliquer, onSupprimer, onFermer }) {
  const [champs, setChamps] = useState(CHAMPS_VIDES)
  const [etape, setEtape] = useState('saisie')
  const n = sets.length
  const pluriel = n > 1 ? 's' : ''

  if (action === 'supprimer') {
    return (
      <Sheet ouvert onFermer={onFermer} titre="Supprimer des sets">
        <div className="formulaire">
          <p className="avis avis--erreur" role="alert">
            Supprimer {n} set{pluriel} ? Un bouton « Annuler » sera proposé juste après, tant que tu ne modifies rien d'autre. Exporte quand même la collection si tu n'as pas de sauvegarde.
          </p>
          <ListeSets sets={sets} />
          <div className="sheet__pied sheet__pied--collant">
            <button type="button" className="bouton" onClick={() => { const { nom, contenu } = exporter(tous); telecharger(nom, contenu) }}>Exporter d'abord</button>
            <button type="button" className="bouton bouton--danger" onClick={onSupprimer}>Supprimer {n} set{pluriel}</button>
          </div>
          <button type="button" className="bouton" onClick={onFermer}>Annuler</button>
        </div>
      </Sheet>
    )
  }

  const changements = construire(champs, statut)
  const aucun = Object.keys(changements).length === 0
  const maj = (cle) => (e) => setChamps((c) => ({ ...c, [cle]: e.target.value }))
  const ids = new Set(sets.map((s) => s.id))
  const apercu = etape === 'apercu' ? apercuModification(sets, ids, changements) : null

  return (
    <Sheet ouvert onFermer={onFermer} titre={statut === 'souhaité' ? 'Marquer comme achetés' : 'Modifier des sets'}>
      {etape === 'saisie' ? (
        <div className="formulaire">
          <p className="formulaire__aide">{n} set{pluriel} sélectionné{pluriel}. Seuls les champs que tu changes sont modifiés.</p>

          {statut === 'souhaité' ? (
            <label className="formulaire__champ">
              État à l'achat
              <select className="champ" value={champs.etat} onChange={maj('etat')}>
                <option value="">Non précisé</option>
                {ETATS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </label>
          ) : (
            <>
              <label className="formulaire__champ">
                Emplacement de rangement
                <input
                  className="champ"
                  list="emplacements-masse"
                  autoComplete="off"
                  maxLength={60}
                  placeholder="Ne pas changer"
                  disabled={champs.effacerEmplacement}
                  value={champs.emplacement}
                  onChange={maj('emplacement')}
                />
                <datalist id="emplacements-masse">
                  {emplacementsConnus.map((e) => <option key={e} value={e} />)}
                </datalist>
              </label>
              <label className="coche-simple">
                <input
                  type="checkbox"
                  checked={champs.effacerEmplacement}
                  onChange={(e) => setChamps((c) => ({ ...c, effacerEmplacement: e.target.checked, emplacement: '' }))}
                />
                Effacer l'emplacement
              </label>
              <label className="formulaire__champ">
                État
                <select className="champ" value={champs.etat} onChange={maj('etat')}>
                  <option value="">Ne pas changer</option>
                  {ETATS.map((e) => <option key={e} value={e}>{e}</option>)}
                  <option value={VIDE}>Effacer (non précisé)</option>
                </select>
              </label>
              <div className="formulaire__ligne">
                <label className="formulaire__champ">
                  Boîte
                  <select className="champ" value={champs.boite} onChange={maj('boite')}>
                    <option value="">Ne pas changer</option>
                    <option value="oui">Présente</option>
                    <option value="non">Absente</option>
                    <option value={VIDE}>Non précisé</option>
                  </select>
                </label>
                <label className="formulaire__champ">
                  Notice
                  <select className="champ" value={champs.notice} onChange={maj('notice')}>
                    <option value="">Ne pas changer</option>
                    <option value="oui">Présente</option>
                    <option value="non">Absente</option>
                    <option value={VIDE}>Non précisé</option>
                  </select>
                </label>
              </div>
            </>
          )}

          {aucun && <p className="formulaire__aide" role="status">Choisis au moins un changement.</p>}
          <div className="sheet__pied">
            <button type="button" className="bouton" onClick={onFermer}>Annuler</button>
            <button type="button" className="bouton bouton--plein" disabled={aucun} onClick={() => setEtape('apercu')}>Voir l'aperçu</button>
          </div>
        </div>
      ) : (
        <div className="formulaire">
          <div className="avis" role="status">
            {resume(changements).map((l) => <p key={l}>{l}</p>)}
            <p>
              {apercu.total} set{apercu.total > 1 ? 's' : ''} concerné{apercu.total > 1 ? 's' : ''} :{' '}
              {apercu.modifies} {apercu.modifies > 1 ? 'seront modifiés' : 'sera modifié'}
              {apercu.inchanges > 0 && `, ${apercu.inchanges} ${apercu.inchanges > 1 ? 'sont déjà à jour' : 'est déjà à jour'}`}.
            </p>
            {Object.entries(apercu.ecrases).filter(([, v]) => v > 0).map(([champ, v]) => (
              <p key={champ} className="masse__attention">
                {v} set{v > 1 ? 's' : ''} {v > 1 ? 'avaient' : 'avait'} déjà {NOMS_CHAMPS[champ]} différent : il sera remplacé.
              </p>
            ))}
          </div>
          <ListeSets sets={sets} />
          <div className="sheet__pied sheet__pied--collant">
            <button type="button" className="bouton" onClick={() => setEtape('saisie')}>Retour</button>
            <button type="button" className="bouton bouton--plein" onClick={() => onAppliquer(changements)}>
              Appliquer à {n} set{pluriel}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
