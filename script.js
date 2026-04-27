const apiKey = "a8ec091b";

// DOM Elements
const sidebar = document.getElementById("sidebar");
const searchInput = document.getElementById("titleInput");
const searchBtn = document.getElementById("searchBtn");
const autocompleteDiv = document.getElementById("autocomplete");

// Sections
const heroSection = document.getElementById("hero");
const searchSection = document.getElementById("searchSection");
const searchCarousel = document.getElementById("searchCarousel");
const continueCarousel = document.getElementById("continueCarousel");
const favoritesCarousel = document.getElementById("favoritesCarousel");
const recentCarousel = document.getElementById("recentCarousel");

// Modals
const detailsModal = document.getElementById("detailsModal");
const modalDetailsBody = document.getElementById("modalDetailsBody");
const playerModal = document.getElementById("playerModal");
const playerContainer = document.getElementById("playerContainer");

let currentMedia = { imdbID: "", type: "", season: 1, episode: 1 };

// Event Listeners
document.getElementById("sidebarToggle").addEventListener("click", () => sidebar.classList.toggle("show"));
document.addEventListener("keydown", e => { if (e.key === "/") { e.preventDefault(); focusSearch(); } });
searchBtn.addEventListener("click", executeSearch);
searchInput.addEventListener("input", showAutocomplete);
searchInput.addEventListener("keydown", e => { if (e.key === "Enter") executeSearch(); });
document.addEventListener("click", e => { if (!e.target.closest('.search-container')) autocompleteDiv.style.display = "none"; });
document.getElementById("filterType").addEventListener("change", executeSearch);

// Initialization
window.addEventListener("DOMContentLoaded", () => {
  loadHero();
  loadCarousels();
});

// Storage Utils
const getList = key => JSON.parse(localStorage.getItem(key) || "[]");
const saveList = (key, val) => localStorage.setItem(key, JSON.stringify(val));

// --- Hero Billboard ---
async function loadHero() {
  const favs = getList("favorites");
  const recents = getList("recent");
  let heroId = "tt0133093"; // The Matrix default

  if (favs.length > 0) {
    heroId = favs[Math.floor(Math.random() * favs.length)].imdbID;
  } else if (recents.length > 0) {
    heroId = recents[0]; // most recent
  }

  try {
    const data = await fetch(`https://www.omdbapi.com/?i=${heroId}&plot=full&apikey=${apiKey}`).then(r => r.json());
    if(data.Response === "False") return;

    document.getElementById("heroTitle").textContent = data.Title;
    document.getElementById("heroPlot").textContent = data.Plot;
    document.getElementById("heroMeta").innerHTML = `<span>${data.Rated}</span> <span>${data.Year}</span> <span>⭐ ${data.imdbRating}</span>`;
    
    const posterUrl = data.Poster !== "N/A" ? data.Poster : "https://via.placeholder.com/300x450?text=No+Image";
    document.getElementById("heroBg").style.backgroundImage = `url('${posterUrl}')`;
    document.getElementById("heroPoster").src = posterUrl;

    document.getElementById("heroPlayBtn").onclick = () => {
      currentMedia = { imdbID: data.imdbID, type: data.Type, season: 1, episode: 1 };
      openPlayer();
    };
    document.getElementById("heroMoreBtn").onclick = () => loadDetails(data.imdbID);

  } catch (e) { console.error("Hero load failed", e); }
}

// --- Navigation & UX ---
function scrollToSection(id) {
  sidebar.classList.remove("show");
  document.getElementById(id).scrollIntoView({ behavior: "smooth", block: "start" });
}

function focusSearch() {
  sidebar.classList.remove("show");
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => searchInput.focus(), 300);
}

function scrollCarousel(id, direction) {
  const container = document.getElementById(id);
  const scrollAmount = container.clientWidth * 0.8;
  container.scrollBy({ left: scrollAmount * direction, behavior: 'smooth' });
}

function showSkeletons(container, count = 8) {
  container.innerHTML = Array(count).fill('<div class="skeleton-card"></div>').join("");
}

// --- Search ---
async function showAutocomplete() {
  const query = searchInput.value.trim();
  if (query.length < 2) { autocompleteDiv.style.display = "none"; return; }
  
  autocompleteDiv.style.display = "block";
  autocompleteDiv.innerHTML = '<div style="padding:1rem;">Searching...</div>';
  
  try {
    const res = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${apiKey}`);
    const data = await res.json();
    if (data.Response === "False") {
      autocompleteDiv.innerHTML = '<div style="padding:1rem;">No matches found</div>';
      return;
    }
    
    autocompleteDiv.innerHTML = "";
    data.Search.slice(0, 5).forEach(item => {
      const div = document.createElement("div"); div.className = "ac-item";
      const img = item.Poster !== "N/A" ? item.Poster : "https://via.placeholder.com/30x45";
      div.innerHTML = `<img src="${img}"> <div><strong>${item.Title}</strong><br><small>${item.Year}</small></div>`;
      div.onclick = () => { searchInput.value = item.Title; autocompleteDiv.style.display = "none"; executeSearch(); };
      autocompleteDiv.appendChild(div);
    });
  } catch {}
}

async function executeSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  autocompleteDiv.style.display = "none";
  searchSection.style.display = "block";
  scrollToSection("searchSection");
  showSkeletons(searchCarousel, 10);

  try {
    const res = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${apiKey}`);
    let data = await res.json();
    if (data.Response === "False") throw new Error("No results found");
    
    let items = data.Search;
    const typeFilter = document.getElementById("filterType").value;
    if (typeFilter !== "all") items = items.filter(i => i.Type === typeFilter);

    renderCarouselCards(searchCarousel, items);
  } catch (err) { 
    searchCarousel.innerHTML = `<div style="padding:2rem;">${err.message}</div>`; 
  }
}

// --- Carousels ---
function renderCarouselCards(container, items) {
  container.innerHTML = "";
  items.forEach(item => {
    const poster = item.Poster !== "N/A" ? item.Poster : "https://via.placeholder.com/210x300?text=No+Image";
    const card = document.createElement("div");
    card.className = "result-card";
    card.innerHTML = `
      <img src="${poster}" loading="lazy" alt="${item.Title}">
      <div class="card-overlay">
        <div class="play-icon">▶</div>
        <h4>${item.Title}</h4>
        <p>${item.Year}</p>
      </div>
    `;
    card.onclick = () => loadDetails(item.imdbID || item); // Handle objects or raw IDs
    container.appendChild(card);
  });
}

async function loadCarousels() {
  const favs = getList("favorites");
  const recents = getList("recent");
  
  if(favs.length > 0) renderCarouselCards(favoritesCarousel, favs.map(f => ({imdbID: f.imdbID, Title: f.title, Poster: f.poster, Year: ""})));
  else favoritesCarousel.innerHTML = "<p style='padding:1rem;color:#666;'>No favorites yet.</p>";

  if(recents.length > 0) {
    showSkeletons(recentCarousel, recents.length);
    const recentData = await Promise.all(recents.map(id => fetch(`https://www.omdbapi.com/?i=${id}&apikey=${apiKey}`).then(r => r.json())));
    renderCarouselCards(recentCarousel, recentData.filter(d => d.Response !== "False"));
  } else recentCarousel.innerHTML = "<p style='padding:1rem;color:#666;'>No watch history.</p>";
}

// --- Details Modal ---
async function loadDetails(imdbID) {
  modalDetailsBody.innerHTML = '<div style="text-align:center;width:100%;"><div class="skeleton-card" style="width:200px;margin:0 auto;"></div><p>Loading details...</p></div>';
  detailsModal.style.display = "flex";
  document.body.style.overflow = "hidden"; // Prevent background scroll

  const data = await fetch(`https://www.omdbapi.com/?i=${imdbID}&plot=full&apikey=${apiKey}`).then(r => r.json());
  
  currentMedia = { imdbID: imdbID, type: data.Type, season: 1, episode: 1 };
  const favs = getList("favorites");
  const isFav = favs.some(f => f.imdbID === imdbID);
  
  let tvControls = "";
  if (data.Type === "series") {
    const totalSeasons = parseInt(data.totalSeasons) || 1;
    let seasonOpts = Array.from({length:totalSeasons},(_,i)=>`<option value="${i+1}">Season ${i+1}</option>`).join("");
    tvControls = `
      <div id="tvSelector">
        <select id="seasonSelect" onchange="fetchEpisodes(this.value)">${seasonOpts}</select>
        <select id="episodeSelect" onchange="updateEpisode(this.value)"><option value="1">Loading...</option></select>
      </div>
    `;
  }

  modalDetailsBody.innerHTML = `
    <div class="modal-details-layout">
      <div class="modal-poster">
        <img src="${data.Poster !== "N/A" ? data.Poster : "https://via.placeholder.com/300x450"}" alt="">
      </div>
      <div class="modal-info">
        <h2>${data.Title}</h2>
        <div class="modal-meta">
          <span>${data.Year}</span> • <span>${data.Rated}</span> • <span>${data.Runtime}</span> • <span>⭐ ${data.imdbRating}</span>
        </div>
        <p><strong>Genre:</strong> ${data.Genre}</p>
        <p><strong>Cast:</strong> ${data.Actors}</p>
        <p style="margin-top:1rem; line-height:1.6;">${data.Plot}</p>
        
        ${tvControls}

        <div class="modal-actions">
          <button class="btn primary-btn" onclick="openPlayer()">▶ Play</button>
          <button class="btn secondary-btn" onclick="toggleFavModal('${data.Title.replace(/'/g, "\\'")}', '${data.Poster}', '${imdbID}')" id="favBtnModal">
            ${isFav ? '♥ Remove Favorite' : '♡ Add to Favorites'}
          </button>
        </div>
      </div>
    </div>
  `;

  if (data.Type === "series") fetchEpisodes(1);
  addHistory(imdbID);
}

function closeModal(id) {
  document.getElementById(id).style.display = "none";
  document.body.style.overflow = "auto";
}

// --- TV Show Logic ---
async function fetchEpisodes(season) {
  currentMedia.season = season;
  const epSelect = document.getElementById("episodeSelect");
  epSelect.innerHTML = "<option>Loading...</option>";
  const data = await fetch(`https://www.omdbapi.com/?i=${currentMedia.imdbID}&Season=${season}&apikey=${apiKey}`).then(r => r.json());
  if (data.Response === "False") { epSelect.innerHTML = `<option value="1">Episode 1</option>`; return; }
  epSelect.innerHTML = data.Episodes.map((ep, i) => `<option value="${i+1}">Ep ${i+1}: ${ep.Title}</option>`).join("");
  currentMedia.episode = epSelect.value;
}
window.updateEpisode = val => currentMedia.episode = val;

// --- Player Logic ---
function openPlayer() {
  detailsModal.style.display = "none"; // Hide details if open
  playerModal.style.display = "flex";
  document.body.style.overflow = "hidden";
  
  let src = currentMedia.type === "series" 
    ? `https://vidsrc.me/embed/tv?imdb=${currentMedia.imdbID}&season=${currentMedia.season}&episode=${currentMedia.episode}`
    : `https://vidsrc.me/embed/movie?imdb=${currentMedia.imdbID}`;
    
  playerContainer.innerHTML = `<iframe src="${src}" allowfullscreen></iframe>`;
}

function closePlayer() {
  playerModal.style.display = "none";
  playerContainer.innerHTML = "";
  document.body.style.overflow = "auto";
  loadCarousels(); // Refresh in case history changed
}

// --- Data Mutators ---
window.toggleFavModal = (title, poster, imdbID) => {
  const favs = getList("favorites");
  const index = favs.findIndex(f => f.imdbID === imdbID);
  const btn = document.getElementById("favBtnModal");
  if(index > -1) {
    favs.splice(index, 1);
    btn.innerHTML = "♡ Add to Favorites";
  } else {
    favs.unshift({title, poster, imdbID});
    btn.innerHTML = "♥ Remove Favorite";
  }
  saveList("favorites", favs);
  loadCarousels(); // Refresh UI behind modal
}

function addHistory(imdbID) {
  const hist = getList("recent");
  if(!hist.includes(imdbID)){ 
    hist.unshift(imdbID); 
    if(hist.length > 15) hist.pop(); 
    saveList("recent", hist); 
  }
}
