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

// Chrome sur Android peut refuser un fichier .json au moment de share() alors que
// canShare() a répondu oui (il revérifie le type, et JSON n'est pas dans sa liste de
// types sûrs). Un fichier texte, lui, est accepté : on propose donc les deux formes, et
// l'appelant passe au texte quand le JSON a été refusé. Le contenu reste du JSON, seule
// l'enveloppe change ; l'import accepte les deux.
function fichierDePartage(nom, contenu, texte) {
  return texte
    ? new File([contenu], `${nom.replace(/\.json$/, '')}.txt`, { type: 'text/plain' })
    : new File([contenu], nom, { type: 'application/json' });
}

// Le partage de fichier du système (Android : Drive, Messages…) n'existe pas partout.
export function partageDisponible(nav = globalThis.navigator, { texte = false } = {}) {
  try {
    const essai = fichierDePartage('essai.json', '{}', texte);
    return typeof nav?.share === 'function' && Boolean(nav.canShare?.({ files: [essai] }));
  } catch {
    return false;
  }
}

// Partage le fichier ; sans partage de fichier, le télécharge. Refuser dans la
// feuille de partage n'est pas une erreur : rien n'a été sauvegardé, et l'appelant
// ne doit surtout pas noter une sauvegarde qui n'a pas eu lieu.
//
// En cas d'échec, `erreur` porte le nom et le message du navigateur : sans eux, « le partage
// a échoué » ne permet de corriger rien.
export async function partager(nom, contenu, nav = globalThis.navigator, { texte = false } = {}) {
  if (!partageDisponible(nav, { texte })) {
    telecharger(nom, contenu);
    return { mode: 'telechargement' };
  }
  try {
    const fichier = fichierDePartage(nom, contenu, texte);
    await nav.share({ files: [fichier], title: fichier.name });
    return { mode: 'partage', nom: fichier.name };
  } catch (e) {
    if (e?.name === 'AbortError') return { mode: 'annule' };
    return { mode: 'echec', erreur: `${e?.name ?? 'Erreur'}${e?.message ? ` : ${e.message}` : ''}` };
  }
}

// Copie un texte dans le presse-papiers ; à défaut, le propose au partage du système.
// Les deux exigent un geste de l'utilisateur et une page sécurisée : si tout échoue, on
// le dit (« echec ») plutôt que d'annoncer une copie qui n'a pas eu lieu.
export async function copierTexte(texte, nav = globalThis.navigator) {
  try {
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(texte);
      return 'copie';
    }
  } catch { /* on tente le partage */ }
  try {
    if (typeof nav?.share === 'function') {
      await nav.share({ text: texte });
      return 'partage';
    }
  } catch (e) {
    if (e?.name === 'AbortError') return 'annule';
  }
  return 'echec';
}
