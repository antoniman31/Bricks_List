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

// Le partage de fichier du système (Android : Drive, Messages…) n'existe pas partout.
export function partageDisponible(nav = globalThis.navigator) {
  try {
    const essai = new File(['{}'], 'essai.json', { type: 'application/json' });
    return typeof nav?.share === 'function' && Boolean(nav.canShare?.({ files: [essai] }));
  } catch {
    return false;
  }
}

// Partage le fichier ; sans partage de fichier, le télécharge. Refuser dans la
// feuille de partage n'est pas une erreur : rien n'a été sauvegardé, et l'appelant
// ne doit surtout pas noter une sauvegarde qui n'a pas eu lieu.
export async function partager(nom, contenu, nav = globalThis.navigator) {
  if (!partageDisponible(nav)) {
    telecharger(nom, contenu);
    return { mode: 'telechargement' };
  }
  try {
    const fichier = new File([contenu], nom, { type: 'application/json' });
    await nav.share({ files: [fichier], title: nom });
    return { mode: 'partage' };
  } catch (e) {
    if (e?.name === 'AbortError') return { mode: 'annule' };
    return { mode: 'echec' };
  }
}
