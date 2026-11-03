import { useMemo, useState } from 'react'
import CarteSet from './components/CarteSet.jsx'
import FiltersSheet from './components/FiltersSheet.jsx'
import { charger } from './lib/storage.js'
import { SEED } from './lib/seed.js'
import { TRIS, annees, filtrer, themes, trier } from './lib/recherche.js'

const ONGLETS = [
  { statut: 'possédé', libelle: 'Collection' },
  { statut: 'souhaité', libelle: 'Wishlist' },
]
const FILTRES_VIDES = { theme: '', etat: '', annee: '' }

function demarrer() {
  const r = charger()
  return { sets: r.sets ?? SEED, exemples: r.sets === null, info: r }
}

export default function App() {
  const [depart] = useState(demarrer)
  const sets = depart.sets
  const [statut, setStatut] = useState('possédé')
  const [texte, setTexte] = useState('')
  const [filtres, setFiltres] = useState(FILTRES_VIDES)
  const [tri, setTri] = useState('ajout')
  const [feuille, setFeuille] = useState(false)

  const duOnglet = useMemo(() => sets.filter((s) => s.statut === statut), [sets, statut])
  const visibles = useMemo(
    () => trier(filtrer(sets, { statut, texte, ...filtres }), tri),
    [sets, statut, texte, filtres, tri],
  )

  // Les filtres d'un onglet ne veulent rien dire dans l'autre (un état n'existe
  // pas pour un set souhaité) : changer d'onglet les remet à zéro, sinon un
  // filtre survivant afficherait une liste vide sans qu'on comprenne pourquoi.
  function changerOnglet(s) {
    setStatut(s)
    setFiltres(FILTRES_VIDES)
    setTexte('')
  }

  const groupes = [
    { cle: 'theme', libelle: 'Thème', options: themes(duOnglet).map((t) => ({ valeur: t, libelle: t })) },
    { cle: 'annee', libelle: 'Année', options: annees(duOnglet).map((a) => ({ valeur: a, libelle: String(a) })) },
  ]
  if (statut === 'possédé') {
    groupes.splice(1, 0, {
      cle: 'etat',
      libelle: 'État',
      options: ['scellé', 'monté', 'démonté', 'incomplet'].map((e) => ({ valeur: e, libelle: e })),
    })
  }
  const nbFiltres = groupes.filter((g) => filtres[g.cle] !== '').length
  const filtre = texte !== '' || nbFiltres > 0

  const { erreur, corriges, rejetes } = depart.info

  return (
    <div className="appli">
      <header className="appli__entete">
        <h1 className="appli__titre">Bricks List</h1>
        <span className="appli__version">{__COMMIT__}</span>
      </header>

      {erreur && <p className="avis avis--erreur" role="alert">{erreur} Des exemples sont affichés et rien n'est modifié.</p>}
      {!erreur && depart.exemples && <p className="avis">Collection vide : ce sont des sets d'exemple.</p>}
      {(corriges > 0 || rejetes > 0) && (
        <p className="avis" role="status">
          {corriges} fiche{corriges > 1 ? 's' : ''} corrigée{corriges > 1 ? 's' : ''}, {rejetes} ignorée{rejetes > 1 ? 's' : ''}.
        </p>
      )}

      <div className="onglets" role="tablist">
        {ONGLETS.map((o) => (
          <button
            key={o.statut}
            type="button"
            role="tab"
            className="onglet"
            aria-selected={statut === o.statut}
            onClick={() => changerOnglet(o.statut)}
          >
            {o.libelle} <span className="onglet__nombre">{sets.filter((s) => s.statut === o.statut).length}</span>
          </button>
        ))}
      </div>

      <div className="barre">
        <input
          type="search"
          className="champ"
          placeholder="Nom, thème ou numéro"
          aria-label="Rechercher un set"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
        />
        <button type="button" className="bouton" onClick={() => setFeuille(true)}>
          Filtres{nbFiltres > 0 ? ` (${nbFiltres})` : ''}
        </button>
      </div>

      <div className="barre barre--secondaire">
        <p className="compteur" aria-live="polite">
          {filtre ? `${visibles.length} sur ${duOnglet.length}` : duOnglet.length} set{visibles.length > 1 ? 's' : ''}
        </p>
        <label className="tri">
          Tri
          <select className="champ" value={tri} onChange={(e) => setTri(e.target.value)}>
            {TRIS.map((t) => <option key={t.cle} value={t.cle}>{t.libelle}</option>)}
          </select>
        </label>
      </div>

      {visibles.length > 0 ? (
        <ul className="liste">
          {visibles.map((s) => <CarteSet key={s.id} set={s} />)}
        </ul>
      ) : (
        <p className="vide">
          {filtre
            ? 'Aucun set ne correspond à la recherche ou aux filtres.'
            : statut === 'possédé' ? 'Aucun set dans la collection.' : 'La wishlist est vide.'}
        </p>
      )}

      <FiltersSheet
        ouvert={feuille}
        onFermer={() => setFeuille(false)}
        groupes={groupes}
        filtres={filtres}
        onChanger={(cle, v) => setFiltres((f) => ({ ...f, [cle]: v }))}
        onReinitialiser={() => setFiltres(FILTRES_VIDES)}
        nbResultats={visibles.length}
      />
    </div>
  )
}
