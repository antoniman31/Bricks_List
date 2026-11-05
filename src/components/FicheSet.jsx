import { useState } from 'react'
import Sheet from './Sheet.jsx'
import PhotoFiche from './PhotoFiche.jsx'
import RangerSheet from './RangerSheet.jsx'
import { ETATS, LIBELLES_PRIORITE, PRIORITES } from '../lib/model.js'
import { aEtiquette, ajouterEtiquettes, basculerEtiquette } from '../lib/etiquettes.js'
import { aujourdhuiISO, dateValide, formaterDate } from '../lib/dates.js'

function Ligne({ libelle, valeur }) {
  if (valeur == null || valeur === '') return null
  return (
    <div className="fiche__ligne">
      <dt>{libelle}</dt>
      <dd>{valeur}</dd>
    </div>
  )
}

// Une ligne dont la valeur s'édite sur place : un appui déplie le choix sous la ligne.
function LigneEditable({ libelle, valeur, ouvert, desactive, onBasculer, children }) {
  return (
    <div className="fiche__ligne fiche__ligne--edit">
      <dt>{libelle}</dt>
      <dd>
        <button type="button" className="fiche__valeur" aria-expanded={ouvert} disabled={desactive} onClick={onBasculer}>{valeur}</button>
      </dd>
      {ouvert && <dd className="fiche__edition">{children}</dd>}
    </div>
  )
}

// Boîte et notice : présente, absente ou non précisée, un appui pour choisir.
function LigneOuiNon({ libelle, champ, set, ouvert, desactive, onBasculer, onChoisir }) {
  const v = set[champ]
  return (
    <LigneEditable libelle={libelle} valeur={v === 'oui' ? 'présente' : v === 'non' ? 'absente' : 'Non précisé'} ouvert={ouvert} desactive={desactive} onBasculer={onBasculer}>
      <div className="groupe__options" role="group" aria-label={libelle}>
        {[['oui', 'Présente'], ['non', 'Absente'], [null, 'Non précisé']].map(([valeur, texte]) => (
          <button key={texte} type="button" className="puce" aria-pressed={(v ?? null) === valeur} onClick={() => onChoisir(valeur)}>{texte}</button>
        ))}
      </div>
    </LigneEditable>
  )
}

// Une date s'édite avec le sélecteur du système ; « Effacer » la retire.
function LigneDate({ libelle, valeur, ouvert, desactive, onBasculer, onChoisir }) {
  return (
    <LigneEditable libelle={libelle} valeur={valeur ? formaterDate(valeur) : 'Ajouter'} ouvert={ouvert} desactive={desactive} onBasculer={onBasculer}>
      <input className="champ" type="date" aria-label={libelle} min="1949-01-01" max={aujourdhuiISO()} value={valeur ?? ''} onChange={(e) => onChoisir(e.target.value)} />
      {valeur && <button type="button" className="bouton" onClick={() => onChoisir(null)}>Effacer</button>}
    </LigneEditable>
  )
}

// Le contenu d'une fiche, sans son contenant : la feuille en dessous de 840 px, le panneau de
// droite au-dessus. Même contenu, mêmes gestes, un seul endroit à tenir à jour.
export function FicheContenu({ set, lectureSeule, lieux = [], lieuRecent = '', etiquettesConnues = [], onChanger, onModifier, onAcheter, onSupprimer }) {
  const [confirmer, setConfirmer] = useState(false)
  const [rangement, setRangement] = useState(false)
  const [etatAchat, setEtatAchat] = useState('')
  // Une seule ligne s'édite à la fois : « etat », « priorite » ou « etiquettes ».
  const [edition, setEdition] = useState('')
  const [probleme, setProbleme] = useState('')
  const [nouvelle, setNouvelle] = useState('')

  // La modification s'enregistre aussitôt. Si le modèle la refuse (valeur hors règles), on le dit :
  // un changement qui disparaîtrait sans bruit serait pire qu'un bouton « Enregistrer » oublié.
  function changer(changements) {
    const ok = onChanger(changements)
    setProbleme(ok ? '' : 'Modification refusée.')
    return ok
  }
  const basculer = (nom) => { setEdition((e) => (e === nom ? '' : nom)); setProbleme('') }

  const possede = set.statut === 'possédé'

  // Un champ date vide ou à moitié tapé (sur ordinateur) n'est pas une date : on attend qu'elle soit
  // complète. Une date refusée (futur, avant 1949) l'est à voix haute, comme tout refus du modèle.
  function changerDate(champ, v) {
    if (v === null) { if (changer({ [champ]: null })) setEdition(''); return }
    if (v === '') return
    if (dateValide(v) === null) return setProbleme('Date invalide (pas dans le futur).')
    if (changer({ [champ]: v })) setEdition('')
  }
  const etiquettes = set.etiquettes ?? []
  const choixEtiquettes = [...etiquettes, ...etiquettesConnues.filter((c) => !aEtiquette(set, c))]

  function etiquettesChangees(r) {
    if (r.erreur) return setProbleme(r.erreur)
    changer({ etiquettes: r.liste })
  }

  return (
    <>
      <PhotoFiche key={set.id} set={set} lectureSeule={lectureSeule} onChanger={changer} />

      <div className="chiffres">
        <div><b>{set.pieces != null ? set.pieces.toLocaleString('fr-FR') : '—'}</b><small>pièces</small></div>
        <div><b>{set.annee ?? '—'}</b><small>année</small></div>
        <button type="button" className="chiffres__cle" aria-expanded={edition === 'cle'} disabled={lectureSeule} onClick={() => basculer('cle')}>
          <b>{possede ? (set.etat ?? '—') : (set.priorite ? LIBELLES_PRIORITE[set.priorite] : '—')}</b>
          <small className={lectureSeule ? '' : 'chev'}>{possede ? 'état' : 'priorité'}</small>
        </button>
      </div>
      {edition === 'cle' && (
        <div className="fiche__edition fiche__edition--libre">
          {possede ? (
            <div className="groupe__options" role="group" aria-label="État">
              <button type="button" className="puce" aria-pressed={!set.etat} onClick={() => { if (changer({ etat: null })) setEdition('') }}>Non précisé</button>
              {ETATS.map((e) => (
                <button key={e} type="button" className="puce" aria-pressed={set.etat === e} onClick={() => { if (changer({ etat: e })) setEdition('') }}>{e}</button>
              ))}
            </div>
          ) : (
            <div className="groupe__options" role="group" aria-label="Priorité">
              {PRIORITES.map((p) => (
                <button key={p} type="button" className="puce" aria-pressed={set.priorite === p} onClick={() => { if (changer({ priorite: p })) setEdition('') }}>{LIBELLES_PRIORITE[p]}</button>
              ))}
            </div>
          )}
        </div>
      )}

      <dl className="fiche">
        {possede ? (
          <>
            <LigneDate libelle="Acheté le" valeur={set.dateAchat} ouvert={edition === 'dateAchat'} desactive={lectureSeule} onBasculer={() => basculer('dateAchat')} onChoisir={(v) => changerDate('dateAchat', v)} />
            <LigneDate libelle="Monté le" valeur={set.dateMontage} ouvert={edition === 'dateMontage'} desactive={lectureSeule} onBasculer={() => basculer('dateMontage')} onChoisir={(v) => changerDate('dateMontage', v)} />
          </>
        ) : (
          <Ligne libelle="Acheté le" valeur={formaterDate(set.dateAchat)} />
        )}
        {possede && (
          <div className="fiche__ligne fiche__ligne--edit">
            <dt>Emplacement</dt>
            <dd>
              <button type="button" className="fiche__valeur" disabled={lectureSeule} onClick={() => setRangement(true)}>
                {set.emplacement || 'Ranger…'}
              </button>
            </dd>
          </div>
        )}
        {possede && (
          <>
            <LigneOuiNon libelle="Boîte" champ="boite" set={set} ouvert={edition === 'boite'} desactive={lectureSeule} onBasculer={() => basculer('boite')} onChoisir={(v) => { if (changer({ boite: v })) setEdition('') }} />
            <LigneOuiNon libelle="Notice" champ="notice" set={set} ouvert={edition === 'notice'} desactive={lectureSeule} onBasculer={() => basculer('notice')} onChoisir={(v) => { if (changer({ notice: v })) setEdition('') }} />
          </>
        )}
        <LigneEditable libelle="Étiquettes" valeur={etiquettes.length > 0 ? etiquettes.join(', ') : 'Ajouter'} ouvert={edition === 'etiquettes'} desactive={lectureSeule} onBasculer={() => basculer('etiquettes')}>
          {choixEtiquettes.length > 0 && (
            <div className="groupe__options" role="group" aria-label="Étiquettes">
              {choixEtiquettes.map((e) => (
                <button key={e} type="button" className="puce" aria-pressed={aEtiquette(set, e)} onClick={() => etiquettesChangees(basculerEtiquette(etiquettes, e))}>{e}</button>
              ))}
            </div>
          )}
          <form
            className="rangement__nouveau"
            onSubmit={(ev) => {
              ev.preventDefault()
              if (nouvelle.trim() === '') return
              const r = ajouterEtiquettes(etiquettes, nouvelle)
              etiquettesChangees(r)
              if (!r.erreur) setNouvelle('')
            }}
          >
            <input className="champ" autoComplete="off" aria-label="Nouvelle étiquette" placeholder="Nouvelle étiquette" value={nouvelle} onChange={(ev) => setNouvelle(ev.target.value)} />
            <button type="submit" className="bouton" disabled={nouvelle.trim() === ''}>Ajouter</button>
          </form>
        </LigneEditable>
        <Ligne libelle="Ajouté le" valeur={set.dateAjout ? new Date(set.dateAjout).toLocaleDateString('fr-FR') : null} />
        <Ligne libelle="Notes" valeur={set.notes} />
      </dl>
      {probleme && <p className="avis avis--erreur" role="alert">{probleme}</p>}

      {rangement && (
        <RangerSheet
          lieux={lieux}
          actuel={set.emplacement}
          recent={lieuRecent}
          onChoisir={(v) => { changer({ emplacement: v }); setRangement(false) }}
          onFermer={() => setRangement(false)}
        />
      )}

      <a className="lien" href={`https://rebrickable.com/sets/${encodeURIComponent(set.numero)}/`} target="_blank" rel="noopener noreferrer">
        Voir sur Rebrickable
      </a>

      {set.statut === 'souhaité' && (
        <div className="fiche__achat">
          <label className="formulaire__champ">
            État à l'achat
            <select className="champ" value={etatAchat} onChange={(e) => setEtatAchat(e.target.value)}>
              <option value="">Non précisé</option>
              {ETATS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
          <button type="button" className="bouton bouton--plein" disabled={lectureSeule} onClick={() => onAcheter(etatAchat)}>
            Acheté
          </button>
        </div>
      )}

      {confirmer ? (
        <div className="avis avis--erreur" role="alertdialog" aria-label="Confirmer la suppression">
          <p>Supprimer « {set.nom} » ? C'est définitif : pense à exporter.</p>
          <div className="sheet__pied">
            <button type="button" className="bouton" onClick={() => setConfirmer(false)}>Annuler</button>
            <button type="button" className="bouton bouton--danger" onClick={onSupprimer}>Supprimer</button>
          </div>
        </div>
      ) : (
        <div className="sheet__pied">
          <button type="button" className="bouton bouton--danger" disabled={lectureSeule} onClick={() => setConfirmer(true)}>Supprimer</button>
          <button type="button" className="bouton bouton--plein" disabled={lectureSeule} onClick={onModifier}>Plus d'options</button>
        </div>
      )}
    </>
  )
}

// Le haut de la fiche, commun à la feuille (qui le reprend dans son bandeau) et au panneau de droite.
function etiquetteDe(set) {
  return set.statut === 'souhaité' ? `${set.numero} · souhaité` : set.numero
}

export function EnteteFiche({ set }) {
  return (
    <div className="bandeau bandeau--panneau">
      <span className="bandeau__num">{etiquetteDe(set)}</span>
      <h2 className="bandeau__titre">{set.nom}</h2>
      {set.theme && <p className="bandeau__sous">{set.theme}</p>}
    </div>
  )
}

export default function FicheSet({ set, lectureSeule, lieux, lieuRecent, etiquettesConnues, onChanger, onModifier, onAcheter, onSupprimer, onFermer }) {
  return (
    <Sheet ouvert onFermer={onFermer} titre={set.nom} bandeau={{ badge: etiquetteDe(set), sous: set.theme }}>
      <FicheContenu set={set} lectureSeule={lectureSeule} lieux={lieux} lieuRecent={lieuRecent} etiquettesConnues={etiquettesConnues} onChanger={onChanger} onModifier={onModifier} onAcheter={onAcheter} onSupprimer={onSupprimer} />
    </Sheet>
  )
}
