// Initialisation avec l'outil global de la bibliothèque Supabase
const clientSupabase = window.supabase.createClient(window.SBC_SUPABASE_URL, window.SBC_SUPABASE_KEY);

// Variables globales pour l'application
let produitsListe = [];        // Le stock complet venu de Supabase
let produitsFiltrés = [];       // La liste après filtres (recherche/catégories)
let indexActuel = 0;    
let panier = JSON.parse(localStorage.getItem('sbc_panier')) || []; 
let categorieActive = 'TOUT';  // Stocke la catégorie actuellement sélectionnée

// 1. CHARGEMENT DES PRODUITS
async function chargerProduits() {
    try {
        console.log("Tentative de connexion à la table produits...");
        
        const { data, error } = await clientSupabase
            .from('produits')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;

        produitsListe = data;
        produitsFiltrés = [...produitsListe]; // Au début, rien n'est filtré
        
        actualiserBadgePanier();
        afficherPile();
    } catch (err) {
        console.error("Erreur de connexion Supabase :", err);
        document.getElementById('pile-container').innerHTML = 
            `<p class="text-rose-500 font-medium text-center p-4">❌ Impossible de charger les produits. Vérifiez la configuration.</p>`;
    }
}

// 2. AFFICHAGE DES CARTES (SUR LA LISTE FILTRÉE)
function afficherPile() {
    const container = document.getElementById('pile-container');
    container.innerHTML = ''; 

    // MODIFICATION : On utilise produitsFiltrés au lieu de produitsListe
    if (indexActuel >= produitsFiltrés.length) {
        container.innerHTML = `
            <div class="text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <i class="fa-solid fa-box-open text-4xl text-slate-300 mb-2"></i>
                <p class="text-slate-500 font-medium">Aucun autre produit ne correspond à votre recherche.</p>
                <button onclick="recommencerSwipe()" class="mt-4 px-4 py-2 bg-emerald-500 text-white font-semibold rounded-xl shadow-md hover:bg-emerald-600 active:scale-95 transition-all text-sm">Réinitialiser</button>
            </div>`;
        return;
    }

    produitsFiltrés.forEach((produit, index) => {
        if (index < indexActuel) return; 

        const carte = document.createElement('div');
        carte.id = `carte-${index}`;
        carte.className = "absolute w-full h-full bg-white rounded-2xl shadow-md border border-slate-200 p-5 flex flex-col justify-between transition-all duration-300 origin-bottom";
        
        // MODIFICATION : Z-index basé sur les produits filtrés
        carte.style.zIndex = produitsFiltrés.length - index;

        if (index > indexActuel) {
            carte.style.transform = `scale(${1 - (index - indexActuel) * 0.04}) translateY(${(index - indexActuel) * 12}px)`;
            carte.style.opacity = index - indexActuel > 2 ? 0 : 0.8;
        }

        // Gestion du Carrousel d'images
        const sampleImages = [
            'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=500',
            'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500',
            'https://images.unsplash.com/photo-1547592180-85f173990554?w=500'
        ];
        const listeImages = produit.images && produit.images.length > 0 ? produit.images : sampleImages;

        let imagesHtml = '';
        let indicateursHtml = ''; 
        
        listeImages.forEach((imgUrl, imgIndex) => {
            imagesHtml += `<img src="${imgUrl}" id="img-${index}-${imgIndex}" class="carrousel-img absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${imgIndex === 0 ? 'opacity-100' : 'opacity-0'}">`;
            indicateursHtml += `<div id="ind-${index}-${imgIndex}" class="h-1 flex-1 rounded-full transition-all ${imgIndex === 0 ? 'bg-emerald-500' : 'bg-slate-200'}"></div>`;
        });

        const badgePromo = produit.est_promo ? 
            `<span class="absolute top-4 left-4 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm z-20"><i class="fa-solid fa-star mr-1"></i> Offre Spéciale</span>` : '';

        carte.innerHTML = `
            ${badgePromo}
            <div id="face-avant-${index}" class="flex-1 flex flex-col justify-between h-full">
                <div class="flex-1 relative min-h-0 w-full flex flex-col pt-4">
                    <div class="flex gap-1 mb-2 px-2 z-10">${indicateursHtml}</div>
                    <div class="flex-1 relative w-full h-full">${imagesHtml}</div>
                </div>
                <div class="mt-4">
                    <span class="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">${produit.reference}</span>
                    <h2 class="text-xl font-bold text-slate-800 mt-1 leading-tight">${produit.nom}</h2>
                    <p class="text-sm text-slate-500 mt-1 line-clamp-2">${produit.description_courte || ''}</p>
                    <div class="flex justify-between items-baseline mt-4 pt-3 border-t border-slate-100">
                        <span class="text-xs text-slate-400 font-medium">Prix Unitaire</span>
                        <span class="text-2xl font-black text-emerald-600">${produit.prix_rmb} <span class="text-sm font-bold">RMB</span></span>
                    </div>
                </div>
            </div>

            <div id="face-arriere-${index}" class="hidden flex-1 flex flex-col justify-between h-full overflow-y-auto pt-4">
                <div>
                    <h3 class="text-md font-bold text-slate-700 border-b pb-2 mb-3"><i class="fa-solid fa-gears text-sky-500 mr-2"></i> Spécifications Techniques</h3>
                    <div class="text-sm text-slate-600 space-y-2 whitespace-pre-line bg-slate-50 p-3 rounded-xl">${produit.parametres || 'Aucun paramètre spécifié.'}</div>
                    <h3 class="text-md font-bold text-slate-700 border-b pb-2 mt-5 mb-3"><i class="fa-solid fa-box text-amber-500 mr-2"></i> Logistique</h3>
                    <div class="grid grid-cols-2 gap-3 text-xs">
                        <div class="bg-slate-50 p-2 rounded-lg text-center"><p class="text-slate-400 font-medium">Colisage</p><p class="text-slate-700 font-bold text-sm mt-0.5">${produit.qty_ctn || '-'}</p></div>
                        <div class="bg-slate-50 p-2 rounded-lg text-center"><p class="text-slate-400 font-medium">Volume (CBM)</p><p class="text-slate-700 font-bold text-sm mt-0.5">${produit.cbm || '-'}</p></div>
                    </div>
                </div>
                <button onclick="partagerProduit(${index})" class="mt-4 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all">
                    <i class="fa-solid fa-share-nodes text-sm"></i> Partager cette fiche
                </button>
            </div>
        `;

        container.appendChild(carte);

        // Défilement automatique du carrousel
        if (index === indexActuel && listeImages.length > 1) {
            let imgActuelle = 0;
            if (window.carrouselTimer) clearInterval(window.carrouselTimer);

            window.carrouselTimer = setInterval(() => {
                const imgEl = document.getElementById(`img-${index}-${imgActuelle}`);
                const indEl = document.getElementById(`ind-${index}-${imgActuelle}`);
                if (imgEl && indEl) {
                    imgEl.classList.replace('opacity-100', 'opacity-0');
                    indEl.classList.replace('bg-emerald-500', 'bg-slate-200');
                }
                imgActuelle = (imgActuelle + 1) % listeImages.length;
                const nextImgEl = document.getElementById(`img-${index}-${imgActuelle}`);
                const nextIndEl = document.getElementById(`ind-${index}-${imgActuelle}`);
                if (nextImgEl && nextIndEl) {
                    nextImgEl.classList.replace('opacity-0', 'opacity-100');
                    nextIndEl.classList.replace('bg-slate-200', 'bg-emerald-500');
                }
            }, 3000);
        }
    });
}
// 3. LOGIQUE DU SWIPE
function swiperLigne(direction) {
  if (indexActuel >= produitsListe.length) return;

  const carte = document.getElementById(`carte-${indexActuel}`);
  if (!carte) return;

  if (direction === 'droite') {
    const produitFlashe = produitsListe[indexActuel];
    if (!panier.some((item) => item.id === produitFlashe.id)) {
      panier.push(produitFlashe);
      localStorage.setItem('sbc_panier', JSON.stringify(panier));
      actualiserBadgePanier();
    }
    carte.style.transform = 'translateX(150%) rotate(30deg)';
    carte.style.opacity = '0';
  } else {
    carte.style.transform = 'translateX(-150%) rotate(-30deg)';
    carte.style.opacity = '0';
  }

  setTimeout(() => {
    indexActuel++;
    afficherPile();
  }, 300);
}

// 4. RETOURNER LA CARTE (BOUTON INFO)
function retournerCarteActive() {
  if (indexActuel >= produitsListe.length) return;

  const faceAvant = document.getElementById(`face-avant-${indexActuel}`);
  const faceArriere = document.getElementById(`face-arriere-${indexActuel}`);
  const boutonInfo = document.querySelector('footer button:nth-child(2) i');

  if (faceArriere.classList.contains('hidden')) {
    faceAvant.classList.add('hidden');
    faceArriere.classList.remove('hidden');
    if (boutonInfo) boutonInfo.className = 'fa-solid fa-arrow-rotate-left';
  } else {
    faceAvant.classList.remove('hidden');
    faceArriere.classList.add('hidden');
    if (boutonInfo) boutonInfo.className = 'fa-solid fa-info';
  }
}

// 5. GESTION DU PANIER
function ouvrirPanier() {
  document
    .getElementById('panier-modal')
    .classList.remove('opacity-0', 'pointer-events-none');
  document
    .getElementById('panier-contenu')
    .classList.remove('translate-y-full');
  construireListePanier();
}

function fermerPanier() {
  document
    .getElementById('panier-modal')
    .classList.add('opacity-0', 'pointer-events-none');
  document.getElementById('panier-contenu').classList.add('translate-y-full');
}

function construireListePanier() {
  const listeContainer = document.getElementById('panier-liste');
  listeContainer.innerHTML = '';

  if (panier.length === 0) {
    listeContainer.innerHTML = `<div class="text-center py-8 text-slate-400"><i class="fa-solid fa-basket-shopping text-3xl mb-2 block text-slate-200"></i>Votre panier est vide.</div>`;
    calculerTotal();
    return;
  }

  panier.forEach((produit, index) => {
    const itemHtml = document.createElement('div');
    itemHtml.className =
      'flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100';
    const imageSrc =
      produit.images && produit.images.length > 0
        ? produit.images[0]
        : 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=100';

    itemHtml.innerHTML = `
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <input type="checkbox" checked id="check-${index}" onchange="calculerTotal()" class="w-5 h-5 rounded accent-emerald-500 cursor-pointer">
                <img src="${imageSrc}" class="w-12 h-12 object-contain bg-white rounded-lg border p-1 shrink-0">
                <div class="min-w-0">
                    <h4 class="font-bold text-sm text-slate-800 truncate">${produit.nom}</h4>
                    <p class="text-xs text-slate-400 font-medium">${produit.reference}</p>
                </div>
            </div>
            <div class="text-right ml-2 shrink-0 flex items-center gap-3">
                <span class="font-extrabold text-sm text-slate-700">${produit.prix_rmb} RMB</span>
                <button onclick="retirerDuPanier(${index})" class="text-slate-300 hover:text-rose-500 p-1"><i class="fa-solid fa-trash-can"></i></button>
            </div>`;
    listeContainer.appendChild(itemHtml);
  });
  calculerTotal();
}

function retirerDuPanier(index) {
  panier.splice(index, 1);
  localStorage.setItem('sbc_panier', JSON.stringify(panier));
  actualiserBadgePanier();
  construireListePanier();
}

function calculerTotal() {
  let total = 0;
  panier.forEach((produit, index) => {
    const checkbox = document.getElementById(`check-${index}`);
    if (checkbox && checkbox.checked) total += parseFloat(produit.prix_rmb);
  });
  document.getElementById('panier-total').innerText = total;
}

function actualiserBadgePanier() {
  const badge = document.getElementById('panier-badge');
  if (badge) {
    if (panier.length > 0) {
      badge.innerText = panier.length;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

function recommencerSwipe() {
  indexActuel = 0;
  afficherPile();
}

function envoyerCommandeWhatsApp() {
  let articles = [];
  let total = 0;
  panier.forEach((produit, index) => {
    const checkbox = document.getElementById(`check-${index}`);
    if (checkbox && checkbox.checked) {
      articles.push(
        `- *${produit.nom}* (${produit.reference}) | ${produit.prix_rmb} RMB`
      );
      total += parseFloat(produit.prix_rmb);
    }
  });

  if (articles.length === 0) {
    alert('Cochez au moins un produit !');
    return;
  }

  let message = `Bonjour SBC, voici ma commande :\n\n${articles.join(
    '\n'
  )}\n\n*Total : ${total} RMB*`;
  window.open(
    `https://wa.me/2290197941099?text=${encodeURIComponent(message)}`,
    '_blank'
  );
}

function partagerProduit(index) {
  const prod = produitsListe[index];
  const message = `Regarde : *${prod.nom}* (${prod.reference}) à ${prod.prix_rmb} RMB !`;
  if (navigator.share) {
    navigator
      .share({ title: prod.nom, text: message, url: window.location.href })
      .catch(console.error);
  } else {
    navigator.clipboard.writeText(`${message} ${window.location.href}`);
    alert('Lien copié !');
  }
}
// FONCTION DE FILTRAGE CROISÉ (RECHERCHE + CATÉGORIE)
function filtrerCatalogue() {
  const rechercheTexte = document.getElementById('barre-recherche').value.toLowerCase().trim();

  produitsFiltrés = produitsListe.filter(produit => {
      // Condition 1 : Est-ce que ça correspond à la catégorie active ?
      // (Pour ce test, assurez-vous d'avoir une colonne 'categorie' textuelle dans Supabase)
      const correspondCategorie = (categorieActive === 'TOUT' || (produit.categorie && produit.categorie.toLowerCase() === categorieActive.toLowerCase()));

      // Condition 2 : Est-ce que le nom ou la référence contient le mot recherché ?
      const correspondRecherche = produit.nom.toLowerCase().includes(rechercheTexte) || 
                                  produit.reference.toLowerCase().includes(rechercheTexte);

      return correspondCategorie && correspondRecherche;
  });

  // On réinitialise l'affichage au début de la nouvelle pile filtrée
  indexActuel = 0;
  afficherPile();
}

// ACTION CLIC SUR UN BOUTON DE CATÉGORIE
function filtrerParCategorie(nomCategorie) {
  // 1. Mettre à jour visuellement les boutons (éteindre l'ancien, allumer le nouveau)
  const boutons = document.querySelectorAll('#categories-container button');
  boutons.forEach(btn => {
      btn.classList.replace('bg-emerald-500', 'bg-slate-100');
      btn.classList.replace('text-white', 'text-slate-600');
      btn.classList.remove('shadow-sm', 'font-bold');
      btn.classList.add('font-medium');
  });

  const boutonSelectionne = document.getElementById(`cat-${nomCategorie}`);
  if (boutonSelectionne) {
      boutonSelectionne.classList.replace('bg-slate-100', 'bg-emerald-500');
      boutonSelectionne.classList.replace('text-slate-600', 'text-white');
      boutonSelectionne.classList.add('shadow-sm', 'font-bold');
  }

  // 2. Appliquer le filtre
  categorieActive = nomCategorie;
  filtrerCatalogue();
}
// Lancement au démarrage
chargerProduits();
