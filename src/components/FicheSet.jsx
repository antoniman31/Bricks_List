import { useState } from 'react'
import Sheet from './Sheet.jsx'
import Vignette from './Vignette.jsx'
import { ETATS, LIBELLES_PRIORITE } from '../lib/model.js'
import { formaterDate } from '../lib/dates.js'

function Ligne({ libelle, valeur }) {
  if (valeur == null || valeur === '') return null
  return (
    <div className="fiche__ligne">
      <dt>{libelle}</dt>
      <dd>{valeur}</dd>
    </div>
  )
}

export default function FicheSet({ set, lectureSeule, onModifier, onAcheter, onSupprimer, onFermer }) {
  const [confirmer, setConfirmer] = useState(false)
  const [etatAchat, setEtatAchat] = useState('')

  return (
    <Sheet ouvert onFermer={onFermer} titre={set.nom}>
      <Vignette image={set.image} numero={set.numero} variante="fiche" />

      <dl className="fiche">
        <Ligne libelle="Numéro" valeur={set.numero} />
        <Ligne libelle="Statut" valeur={set.statut} />
        <Ligne libelle="Priorité" valeur={set.priorite ? LIBELLES_PRIORITE[set.priorite] : null} />
        <Ligne libelle="État" valeur={set.etat} />
        <Ligne libelle="Acheté le" valeur={formaterDate(set.dateAchat)} />
        <Ligne libelle="Monté le" valeur={formaterDate(set.dateMontage)} />
        <Ligne libelle="Emplacement" valeur={set.emplacement} />
        <Ligne libelle="Boîte" valeur={set.boite ? (set.boite === 'oui' ? 'présente' : 'absente') : null} />
        <Ligne libelle="Notice" valeur={set.notice ? (set.notice === 'oui' ? 'présente' : 'absente') : null} />
        <Ligne libelle="Étiquettes" valeur={set.etiquettes?.length > 0 ? set.etiquettes.join(', ') : null} />
        <Ligne libelle="Thème" valeur={set.theme} />
        <Ligne libelle="Année" valeur={set.annee} />
        <Ligne libelle="Pièces" valeur={set.pieces != null ? set.pieces.toLocaleString('fr-FR') : null} />
        <Ligne libelle="Ajouté le" valeur={set.dateAjout ? new Date(set.dateAjout).toLocaleDateString('fr-FR') : null} />
        <Ligne libelle="Notes" valeur={set.notes} />
      </dl>

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
          <p>Supprimer « {set.nom} » ? C'est définitif : exporte la collection avant si tu n'as pas de sauvegarde.</p>
          <div className="sheet__pied">
            <button type="button" className="bouton" onClick={() => setConfirmer(false)}>Annuler</button>
            <button type="button" className="bouton bouton--danger" onClick={onSupprimer}>Supprimer</button>
          </div>
        </div>
      ) : (
        <div className="sheet__pied">
          <button type="button" className="bouton bouton--danger" disabled={lectureSeule} onClick={() => setConfirmer(true)}>Supprimer</button>
          <button type="button" className="bouton bouton--plein" disabled={lectureSeule} onClick={onModifier}>Modifier</button>
        </div>
      )}
    </Sheet>
  )
}
