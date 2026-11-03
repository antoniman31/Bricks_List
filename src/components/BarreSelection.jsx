// Le bandeau du mode sélection : combien de sets sont choisis, tout choisir en un geste,
// et le moyen d'en sortir. Le compte est annoncé aux lecteurs d'écran à chaque changement.
export default function BarreSelection({ nombre, total, tousSelectionnes, onToutBasculer, onQuitter }) {
  return (
    <div className="selection">
      <p className="selection__compte" role="status">
        {nombre} sélectionné{nombre > 1 ? 's' : ''} <span className="selection__sur">sur {total}</span>
      </p>
      <div className="selection__actions">
        <button type="button" className="bouton" onClick={onToutBasculer}>
          {tousSelectionnes ? 'Tout désélectionner' : 'Tout sélectionner'}
        </button>
        <button type="button" className="bouton" onClick={onQuitter}>Annuler</button>
      </div>
    </div>
  )
}
