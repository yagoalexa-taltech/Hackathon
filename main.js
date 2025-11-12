let map, markers = [];
const counterEl = document.getElementById('counter');
const warnEl = document.getElementById('warn');

function initMap() {
  map = L.map('map', { zoomControl: true }).setView([4.65, -74.1], 11); // Bogotá fallback
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

function setWarn(msg) {
  if (!msg) { warnEl.hidden = true; warnEl.textContent = ''; return; }
  warnEl.hidden = false; warnEl.textContent = msg;
}

async function loadData() {
  try {
    const res = await fetch('./data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo cargar el dataset');
    const data = await res.json();
    return Array.isArray(data) ? data : data.items || [];
  } catch (err) {
    console.error(err);
    setWarn('⚠️ Error al cargar los datos. Verifica el archivo data.json');
    return [];
  }
}

function renderMarkers(items) {
  // limpiar previos
  markers.forEach(m => m.remove());
  markers = [];

  items.forEach(item => {
    // validar coordenadas KPI
    const lat = Number(item.lat), lon = Number(item.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      const m = L.marker([lat, lon], { icon: iconFor(item.industry) })
        .addTo(map)
        .bindPopup(`
          <div class="popup">
            <strong>${item.name ?? 'Sin nombre'}</strong><br/>
            <small>${(item.city || '')}${item.address ? ' - ' + item.address : ''}</small><br/>
            <span class="badge">${labelIndustry(item.industry)}</span>
            ${item.url ? `<div style="margin-top:.3rem"><a target="_blank" rel="noopener" href="${item.url}">Cómo llegar / sitio</a></div>` : ''}
          </div>
        `);
      markers.push(m);
    }
  });
  counterEl.textContent = `${items.length} sitio${items.length === 1 ? '' : 's'} para comprar`;
  setWarn(items.length === 0 ? 'No hay sitios disponibles en esta categoría.' : '');

}

function labelIndustry(key) {
  return key === 'food' ? 'Alimentos' : key === 'cosmetics' ? 'Cosméticos' : key === 'pets' ? 'Mascotas' : key;
}

function applyFilter(items, category) {
  if (category === 'all') return items;
  return items.filter(x => x.industry === category);
}

function activateCard(category) {
  document.querySelectorAll('.card').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.category === category));
  });
}

document.getElementById('go-to-map').addEventListener('click', () => {
  document.getElementById('map').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('go-to-simulador').addEventListener('click', () => {
  document.getElementById('simulador').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('locate').addEventListener('click', () => {
  if (!navigator.geolocation) {
    setWarn('Tu navegador no permite geolocalización.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      setWarn('');
      const { latitude, longitude } = pos.coords;
      map.setView([latitude, longitude], 13);
      // marcador temporal del usuario
      L.circleMarker([latitude, longitude], { radius: 7, color: '#111827', fillOpacity: 0.2 }).addTo(map);
    },
    err => setWarn('No se pudo obtener tu ubicación (permiso denegado o indisponible).'),
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
  );
});

(async function run() {
  initMap();
  const items = await loadData();
  renderMarkers(items);
  const cpCfg = await loadConfiConfig();
  renderConfiPuntos(cpCfg);

  // Filtros por tarjetas
  document.querySelectorAll('.card').forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.category;
      activateCard(category);
      const filtered = applyFilter(items, category);
      renderMarkers(filtered);
      if (filtered.length > 0) {
        const first = filtered.find(x => Number.isFinite(Number(x.lat)) && Number.isFinite(Number(x.lon)));
        if (first) map.setView([Number(first.lat), Number(first.lon)], 12);
      }
    });
  });
})();

// Inicializar acordeones de Bootstrap
document.addEventListener('DOMContentLoaded', function () {
  const accordionButtons = document.querySelectorAll('.accordion-button');
  accordionButtons.forEach(button => {
    button.addEventListener('click', function () {
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
    ageRange.addEventListener('input', function () {
      ageNumber.value = this.value;
    });

    ageNumber.addEventListener('input', function () {
      if (this.value >= 18 && this.value <= 50) {
        ageRange.value = this.value;
      }
    });
  }
});
// js simulador

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("creditoForm");
  const tablaBody = document.getElementById("tablaAmortizacion");
  const resultado = document.getElementById("resultado");
  const resumen = document.getElementById("resumen");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const edad = parseInt(document.getElementById("age").value);
    const monto = parseFloat(document.getElementById("monto").value);
    const plazoMeses = parseInt(document.getElementById("plazo").value);
    const tipoPago = document.querySelector('input[name="tipoPago"]:checked').value;
    const nombre = document.getElementById("nombre").value.trim();
    const diaPago = document.querySelector('input[name="diaPago"]:checked').value;

    const data = simularCredito({
      edad,
      monto,
      plazoMeses,
      tipoPago,
      diaPago
    });

    mostrarResultados(data);
  });

  function mostrarResultados(data) {
    // Cambiar el título del resumen con el nombre del usuario
    // Cambiar el título del resumen con el nombre del usuario + salto de línea
    const nombreUsuario = document.getElementById("nombre").value.trim();
    const tituloResumen = document.querySelector(".resumen-titulo");

    if (nombreUsuario && tituloResumen) {
      tituloResumen.innerHTML = `Hola ${nombreUsuario}, <br> Aquí está el resumen de tu crédito`;
    }
    const tablaContainer = document.getElementById("tablaContainer");
    const tablaBody = document.getElementById("tablaAmortizacion");

    // Helper para formato COP
    const money = (n) =>
      Number(n).toLocaleString("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 2
      });

    // Escribe en los placeholders del HTML
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = val;
    };

    set("r-categoria", data.categoria);         // Bajo/Mediano/Alto monto (según tu JS)
    set("r-tasa", data.tasaMensual);            // "2.00%" etc.
    set("r-plazo", data.plazoFinal);           // "12 semanas" o "6 meses"
    set("r-dia", data.diaPago ? `${data.diaPago} de cada mes` : "");   
    set("r-cuota", money(data.cuotaBase));
    set("r-total", money(data.totalPagado));
    set("r-interes", money(data.totalInteres));
    set("r-seguro", money(data.totalSeguro));

    // Muestra la tabla y limpia el contenido previo
    tablaContainer.style.display = "block";
    tablaBody.innerHTML = "";

    // Rellena la tabla de amortización
    data.tabla.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.cuota}</td>
        <td>${money(row.capital)}</td>
        <td>${money(row.interes)}</td>
        <td>${money(row.seguro)}</td>
        <td><strong>${money(row.cuotaTotal)}</strong></td>
        <td>${money(row.saldoRestante)}</td>
      `;
      tablaBody.appendChild(tr);
    });
  }

  // Función base de simulación
  function simularCredito({ edad, monto, plazoMeses, tipoPago, diaPago }) {
    let categoria = "";
    let tasaMensual = 0;
    let plazoMax = 0;

    if (monto >= 20000 && monto <= 200000) {
      categoria = "Bajo monto";
      tasaMensual = 0.02;
      plazoMax = 3;
    } else if (monto > 200000 && monto <= 1000000) {
      categoria = "Mediano monto";
      tasaMensual = 0.015;
      plazoMax = 6;
    } else if (monto > 1000000 && monto <= 5000000) {
      categoria = "Alto monto";
      tasaMensual = 0.01;
      plazoMax = 24;
    } else {
      alert("Monto fuera del rango permitido (20.000 a 5.000.000)");
      return;
    }

    if (plazoMeses > plazoMax) {
      alert(`El plazo máximo para ${categoria} es ${plazoMax} meses. Se ajustará automáticamente.`);
      plazoMeses = plazoMax;
    }

    let tasa = tasaMensual;
    let cuotas = plazoMeses;

    if (tipoPago === "Semanal") {
      cuotas = plazoMeses * 4;
      tasa = tasaMensual / 4;
    }

    const cuota = (monto * tasa) / (1 - Math.pow(1 + tasa, -cuotas));

    let porcentajeSeguro = 0;
    if (edad >= 18 && edad <= 30) porcentajeSeguro = 0.05;
    else if (edad >= 31 && edad <= 40) porcentajeSeguro = 0.10;
    else if (edad >= 41) porcentajeSeguro = 0.15;

    let saldo = monto;
    let tabla = [];

    for (let i = 1; i <= cuotas; i++) {
      let interes = saldo * tasa;
      let capital = cuota - interes;
      saldo -= capital;
      let seguro = cuota * porcentajeSeguro;
      let cuotaTotal = cuota + seguro;

      tabla.push({
        cuota: i,
        capital: capital.toFixed(2),
        interes: interes.toFixed(2),
        seguro: seguro.toFixed(2),
        cuotaTotal: cuotaTotal.toFixed(2),
        saldoRestante: saldo > 0 ? saldo.toFixed(2) : "0.00"
      });
    }

    const totalPagado = tabla.reduce((s, r) => s + parseFloat(r.cuotaTotal), 0);
    const totalInteres = tabla.reduce((s, r) => s + parseFloat(r.interes), 0);
    const totalSeguro = tabla.reduce((s, r) => s + parseFloat(r.seguro), 0);

    return {
      categoria,
      tasaMensual: (tasaMensual * 100).toFixed(2) + "%",
      plazoFinal: cuotas + (tipoPago === "Semanal" ? " semanas" : " meses"),
      cuotaBase: cuota.toFixed(2),
      porcentajeSeguro: (porcentajeSeguro * 100) + "%",
      totalPagado: totalPagado.toFixed(2),
      totalInteres: totalInteres.toFixed(2),
      totalSeguro: totalSeguro.toFixed(2),
      tabla,
      diaPago
    };
  }
});
// === ConFiPuntos ===
async function loadConfiConfig() {
  try {
    const res = await fetch('./data.json', { cache: 'no-store' });
    const data = await res.json();
    // soporta data como array (legacy) u objeto con items+confipuntos (nuevo)
    if (Array.isArray(data)) return { levels: defaultCpLevels() };
    return { levels: data.confipuntos?.levels ?? defaultCpLevels() };
  } catch {
    return { levels: defaultCpLevels() };
  }
}

function defaultCpLevels() {
  return [
    { name: "Semilla", min: 0, max: 99, bonusRate: 0.0, bonusAmount: 0 },
    { name: "Brotes", min: 100, max: 299, bonusRate: -0.2, bonusAmount: 100_000 },
    { name: "Raíces", min: 300, max: 699, bonusRate: -0.4, bonusAmount: 300_000 },
    { name: "Hoja", min: 700, max: 999, bonusRate: -0.6, bonusAmount: 600_000 },
    { name: "Bosque", min: 1000, max: 999999, bonusRate: -1.0, bonusAmount: 1_000_000 }
  ];
}

function renderConfiPuntos(cfg) {
  const cont = document.getElementById('cp-niveles');
  if (!cont) return;

  cont.innerHTML = '';
  cfg.levels.forEach(l => {
    const el = document.createElement('div');
    el.className = 'cp-level';
    el.innerHTML = `
      <h3>${l.name}</h3>
      <p class="m-0"><strong>Rango:</strong> ${l.min}–${l.max === 999999 ? '∞' : l.max} pts</p>
      <div class="cp-badges">
        <span class="cp-badge">Tasa: ${l.bonusRate}%</span>
        <span class="cp-badge">Monto extra: ${Number(l.bonusAmount).toLocaleString('es-CO')}</span>
      </div>
    `;
    cont.appendChild(el);
  });

  updateCpProgress(0, cfg);
}


function updateCpProgress(points, cfg) {
  const maxRef = Math.min(100, (cfg.levels?.[1]?.min ?? 100)); // meta visible inicial
  const pct = Math.max(0, Math.min(100, (points / maxRef) * 100));
  const fill = document.getElementById('cp-progreso-fill');
  const label = document.getElementById('cp-progreso-label');
  if (fill) fill.style.width = `${pct}%`;
  if (label) label.textContent = `${points} / ${maxRef} pts`;
}

