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

function iconFor(category){
  const palette = {
    food: '#49708A',
    cosmetics: '#88ABC2',
    pets: '#CAFF42'
  };
  const color = palette[category] || '#49708A';
  // simple colored circle SVG icon
  return L.divIcon({
    className: 'custom-marker',
    html: `<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r="10" fill="${color}" stroke="white" stroke-width="3"/>
    </svg>`,
    iconSize:[28,28],
    iconAnchor:[14,14]
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

// Inicializar acordeones de Bootstrap
document.addEventListener('DOMContentLoaded', function() {
  const accordionButtons = document.querySelectorAll('.accordion-button');
  accordionButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetId = this.getAttribute('data-bs-target');
      const target = document.querySelector(targetId);
      
      if (target) {
        // Cerrar otros items del mismo acordeón
        const parent = this.closest('.accordion');
        const otherTargets = parent.querySelectorAll('.accordion-collapse');
        otherTargets.forEach(el => {
          if (el.id !== targetId) {
            el.classList.remove('show');
          }
        });
        
        // Toggle del item actual
        target.classList.toggle('show');
        
        // Actualizar aria-expanded
        this.setAttribute('aria-expanded', target.classList.contains('show'));
      }
    });
  });

  // Sincronizar control de rango con input de número
  const ageRange = document.getElementById('age');
  const ageNumber = document.getElementById('ageNumber');

  if (ageRange && ageNumber) {
    ageRange.addEventListener('input', function() {
      ageNumber.value = this.value;
    });

    ageNumber.addEventListener('input', function() {
      if (this.value >= 18 && this.value <= 50) {
        ageRange.value = this.value;
      }
    });
  }

  // Sincronizar control de rango de monto con input de número
  const amountRange = document.getElementById('amount');
  const amountNumber = document.getElementById('amountNumber');

  if (amountRange && amountNumber) {
    amountRange.addEventListener('input', function() {
      amountNumber.value = this.value;
    });

    amountNumber.addEventListener('input', function() {
      if (this.value >= 20000 && this.value <= 5000000) {
        amountRange.value = this.value;
      }
    });
  }
});

// js simulador
