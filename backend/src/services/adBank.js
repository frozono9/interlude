/**
 * Banco de anuncios disponibles
 * Cada anuncio tiene metadata y condiciones para cuándo mostrarse
 */

const adBank = [
  {
    id: 'concert-barcelona-badbunny',
    type: 'concert',
    name: 'Concierto Bad Bunny Barcelona',
    eligibleArtists: ['Bad Bunny'], // Solo Bad Bunny puede anunciar su propio concierto
    location: 'Barcelona',
    content: {
      product: 'Concierto en Barcelona',
      details: 'estaré en Barcelona del 22 al 23 de mayo, cantando en el Estadi Olímpic. Consigue tus entradas ya en Ticketmaster'
    },
    artwork: 'concert-barcelona.jpg', // Placeholder
    color: '#FF6B6B',
    sponsorLink: 'https://www.ticketmaster.es',
    priority: 10 // Mayor prioridad
  },
  {
    id: 'product-beats-headphones',
    type: 'product',
    name: 'Auriculares Beats',
    eligibleArtists: ['Bad Bunny', 'Olivia Rodrigo', 'Dua Lipa'],
    content: {
      product: 'Auriculares Beats Studio Pro',
      details: 'los nuevos Beats Studio Pro. Cancelación de ruido premium, sonido increíble. Los uso en el estudio y son increíbles'
    },
    contentEn: {
      product: 'Beats Studio Pro Headphones',
      details: 'the new Beats Studio Pro. Premium noise cancellation, incredible sound. I use them in the studio and they are amazing'
    },
    artwork: 'beats-ad.jpg',
    color: '#241f1f',
    sponsorLink: 'https://www.beatsbydre.com',
    priority: 10
  },
  {
    id: 'sponsor-apple-music',
    type: 'sponsor',
    name: 'Apple Music Premium',
    eligibleArtists: ['Bad Bunny', 'Olivia Rodrigo', 'Dua Lipa', 'Miley Cyrus'],
    content: {
      product: 'Apple Music Premium',
      details: 'Pásate a Apple Music Premium para escuchar mis temas en Spatial Audio. Tienes 30 días gratis, sin anuncios, y puedes descargar todo para cuando estés de viaje o en el gym.'
    },
    contentEn: {
      product: 'Apple Music Premium',
      details: 'Switch to Apple Music Premium to hear my songs in Spatial Audio. You get 30 days free, no ads, and you can download everything for when you are traveling or at the gym.'
    },
    artwork: 'apple-ad.jpg',
    color: '#9b30ff',
    sponsorLink: 'https://www.apple.com/apple-music/',
    priority: 10
  }
];

/**
 * Obtiene anuncios elegibles para un artista específico
 * @param {string} artistName - Nombre del artista de la canción actual
 * @param {string} userLocation - Ubicación del usuario (opcional)
 * @returns {Array} Lista de anuncios elegibles ordenados por prioridad
 */
function getEligibleAds(artistName, userLocation = 'Barcelona') {
  return adBank
    .filter(ad => {
      // Verificar si el artista puede promocionar este anuncio
      const isEligibleArtist = ad.eligibleArtists.includes(artistName);
      
      // Verificar ubicación si es relevante
      const isLocationMatch = !ad.location || ad.location === userLocation;
      
      return isEligibleArtist && isLocationMatch;
    })
    .sort((a, b) => b.priority - a.priority); // Ordenar por prioridad descendente
}

/**
 * Selecciona un anuncio aleatorio de los elegibles
 * @param {string} artistName - Nombre del artista
 * @param {string} userLocation - Ubicación del usuario
 * @returns {Object|null} Anuncio seleccionado o null si no hay elegibles
 */
function selectAd(artistName, userLocation = 'Barcelona') {
  const eligibleAds = getEligibleAds(artistName, userLocation);
  
  if (eligibleAds.length === 0) {
    console.log(`⚠️ No hay anuncios elegibles para ${artistName}`);
    return null;
  }

  // Selección ponderada por prioridad
  const totalPriority = eligibleAds.reduce((sum, ad) => sum + ad.priority, 0);
  let random = Math.random() * totalPriority;
  
  for (const ad of eligibleAds) {
    random -= ad.priority;
    if (random <= 0) {
      console.log(`✅ Anuncio seleccionado: ${ad.name} para ${artistName}`);
      return ad;
    }
  }
  
  // Fallback: retornar el primero
  return eligibleAds[0];
}

/**
 * Obtiene un anuncio por su ID
 * @param {string} adId - ID del anuncio
 * @returns {Object|null} Anuncio encontrado o null
 */
function getAdById(adId) {
  return adBank.find(ad => ad.id === adId) || null;
}

module.exports = {
  adBank,
  getEligibleAds,
  selectAd,
  getAdById
};
