let map, markers = [];
const counterEl = document.getElementById('counter');
const warnEl = document.getElementById('warn');

function initMap(){
  map = L.map('map', {zoomControl: true}).setView([4.65,-74.1], 11); // Bogotá fallback
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  }).addTo(map);
}

function iconFor(category) {
  const palette = {
    food: '#49708A',      // azul profundo
    cosmetics: '#88ABC2', // azul medio
    pets: '#CAFF42'       // verde neón
  };
  const icons = {
    food: '<i class="fa-solid fa-carrot"></i>',
    cosmetics: '<i class="fa-solid fa-leaf"></i>',
    pets: '<i class="fa-solid fa-paw"></i>'
  };

  const color = palette[category] || '#49708A';
  const iconHtml = icons[category] || '<i class="fa-solid fa-store"></i>';

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-base">
        <svg width="40" height="40" viewBox="0 0 40 40">
          <path d="M20 0C12 0 6 6 6 14c0 8 14 26 14 26s14-18 14-26c0-8-6-14-14-14z" fill="${color}" stroke="white" stroke-width="3"/>
        </svg>
        <div class="marker-icon">${iconHtml}</div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -35]
  });
}

function setWarn(msg){
  if(!msg){warnEl.hidden = true; warnEl.textContent='';return;}
  warnEl.hidden = false; warnEl.textContent = msg;
}

async function loadData(){
  try{
    const res = await fetch('./data.json',{cache:'no-store'});
    if(!res.ok) throw new Error('No se pudo cargar el dataset');
    const data = await res.json();
    return Array.isArray(data) ? data : data.items || [];
  }catch(err){
    console.error(err);
    setWarn('⚠️ Error al cargar los datos. Verifica el archivo data.json');
    return [];
  }
}

function renderMarkers(items){
  // limpiar previos
  markers.forEach(m => m.remove());
  markers = [];

  items.forEach(item => {
    // validar coordenadas KPI
    const lat = Number(item.lat), lon = Number(item.lon);
    if(Number.isFinite(lat) && Number.isFinite(lon)){
      const m = L.marker([lat, lon], {icon: iconFor(item.industry)})
        .addTo(map)
        .bindPopup(`
          <div class="popup">
            <strong>${item.name ?? 'Sin nombre'}</strong><br/>
            <small>${(item.city||'')}${item.address ? ' - '+item.address : ''}</small><br/>
            <span class="badge">${labelIndustry(item.industry)}</span>
            ${item.url ? `<div style="margin-top:.3rem"><a target="_blank" rel="noopener" href="${item.url}">Cómo llegar / sitio</a></div>`:''}
          </div>
        `);
      markers.push(m);
    }
  });
  counterEl.textContent = `${items.length} spot${items.length===1?'':''}`;
}

function labelIndustry(key){
  return key==='food' ? 'Alimentos' : key==='cosmetics' ? 'Cosméticos' : key==='pets' ? 'Mascotas' : key;
}

function applyFilter(items, category){
  if(category === 'all') return items;
  return items.filter(x => x.industry === category);
}

function activateCard(category){
  document.querySelectorAll('.card').forEach(btn=>{
    btn.setAttribute('aria-pressed', String(btn.dataset.category===category));
  });
}

document.getElementById('go-to-map').addEventListener('click', ()=>{
  document.getElementById('map').scrollIntoView({behavior:'smooth'});
});

document.getElementById('locate').addEventListener('click', ()=>{
  if(!navigator.geolocation){
    setWarn('Tu navegador no permite geolocalización.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      setWarn('');
      const {latitude, longitude} = pos.coords;
      map.setView([latitude, longitude], 13);
      // marcador temporal del usuario
      L.circleMarker([latitude, longitude], {radius:7, color:'#111827', fillOpacity:0.2}).addTo(map);
    },
    err => setWarn('No se pudo obtener tu ubicación (permiso denegado o indisponible).'),
    {enableHighAccuracy:true,timeout:5000,maximumAge:0}
  );
});

(async function run(){
  initMap();
  const items = await loadData();
  renderMarkers(items);

  // Filtros por tarjetas
  document.querySelectorAll('.card').forEach(btn => {
    btn.addEventListener('click', ()=>{
      const category = btn.dataset.category;
      activateCard(category);
      const filtered = applyFilter(items, category);
      renderMarkers(filtered);
      if(filtered.length>0){
        const first = filtered.find(x=>Number.isFinite(Number(x.lat)) && Number.isFinite(Number(x.lon)));
        if(first) map.setView([Number(first.lat), Number(first.lon)], 12);
      }
    });
  });
})();

// js simulador
