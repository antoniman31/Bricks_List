// Seule partie qui touche au DOM pour l'export : le reste de partage.js reste
// pur et testable. Un lien temporaire déclenche le téléchargement, ce qui
// fonctionne dans Chrome sur Android comme sur Windows sans autorisation.
export function telecharger(nom, contenu) {
  const url = URL.createObjectURL(new Blob([contenu], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
