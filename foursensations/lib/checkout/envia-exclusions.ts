export type EnviaExclusion = {
  city: string;
  department: string;
};

/** Municipios / destinos sin cobertura Envía → Interrapidísimo (reexpedición). */
export const ENVIA_REEXPEDITION_DESTINATIONS: readonly EnviaExclusion[] = [
  { city: "Achí", department: "Bolívar" },
  { city: "Albania Hotel Waya", department: "La Guajira" },
  { city: "Algarrobo", department: "Magdalena" },
  { city: "Arenal del Sur", department: "Bolívar" },
  { city: "Barranco", department: "Bolívar" },
  { city: "Cabrera", department: "Santander" },
  { city: "Campana", department: "La Guajira" },
  { city: "Chibolo", department: "Magdalena" },
  { city: "El Carmen", department: "Norte de Santander" },
  { city: "El Peñón", department: "Bolívar" },
  { city: "El Piñón", department: "Magdalena" },
  { city: "Geselca", department: "La Guajira" },
  { city: "Guamal", department: "Magdalena" },
  { city: "Guaranda", department: "Sucre" },
  { city: "Hatillo de Loba", department: "Bolívar" },
  { city: "La Playa", department: "Norte de Santander" },
  { city: "Las Flores", department: "La Guajira" },
  { city: "Majagual", department: "Sucre" },
  { city: "Manaure Balcón del Cesar", department: "Cesar" },
  { city: "Mina El Cerrejón", department: "La Guajira" },
  { city: "Montecristo", department: "Bolívar" },
  { city: "Morales", department: "Bolívar" },
  { city: "Murillo", department: "Tolima" },
  { city: "Norosí", department: "Bolívar" },
  { city: "Piojó", department: "Atlántico" },
  { city: "Pueblito Los Andes", department: "Magdalena" },
  { city: "Puerto Brisa", department: "La Guajira" },
  { city: "Puerto Guzmán", department: "Putumayo" },
  { city: "Puerto Leguízamo", department: "Putumayo" },
  { city: "Río Viejo", department: "Bolívar" },
  { city: "Rioancho", department: "La Guajira" },
  { city: "Salamina", department: "Magdalena" },
  { city: "San Sebastián", department: "Magdalena" },
  { city: "Santa Ana", department: "Magdalena" },
  { city: "Teorama", department: "Norte de Santander" },
  { city: "Tiquisio", department: "Bolívar" },
  { city: "Aguadas", department: "Caldas" },
  { city: "Aranzazu", department: "Caldas" },
  { city: "Arboletes", department: "Antioquia" },
  { city: "Arma", department: "Caldas" },
  { city: "Ayacucho", department: "Cesar" },
  { city: "Ayapel", department: "Córdoba" },
  { city: "Barbacoas", department: "Nariño" },
  { city: "Cajamarca", department: "Tolima" },
  { city: "Canalete", department: "Córdoba" },
  { city: "Cantagallo", department: "Bolívar" },
  { city: "Cerromatoso", department: "Córdoba" },
  { city: "Chimichagua", department: "Cesar" },
  { city: "Colón", department: "Putumayo" },
  { city: "Colón Génova", department: "Nariño" },
  { city: "Convención", department: "Norte de Santander" },
  { city: "Curumaní", department: "Cesar" },
  { city: "Dibulla", department: "La Guajira" },
  { city: "Ecopetrol Cicuco", department: "Bolívar" },
  { city: "El Banco", department: "Magdalena" },
  { city: "El Paso", department: "Cesar" },
  { city: "El Remolino", department: "Cauca" },
  { city: "El Retén", department: "Magdalena" },
  { city: "El Tigre", department: "Putumayo" },
  { city: "Filandia", department: "Quindío" },
  { city: "Florencia", department: "Cauca" },
  { city: "Fuente de Oro", department: "Meta" },
  { city: "González", department: "Cesar" },
  { city: "La Merced", department: "Caldas" },
  { city: "Manzanares", department: "Caldas" },
  { city: "Marmato", department: "Caldas" },
  { city: "Marulanda", department: "Caldas" },
  { city: "Pácora", department: "Caldas" },
  { city: "Pensilvania", department: "Caldas" },
  { city: "Salamina", department: "Caldas" },
  { city: "San Félix", department: "Caldas" },
  { city: "Salento", department: "Quindío" },
  { city: "Villahermosa", department: "Tolima" },
  { city: "Mocoa", department: "Putumayo" },
  { city: "Puerto Asís", department: "Putumayo" },
  { city: "Puerto Caicedo", department: "Putumayo" },
  { city: "Orito", department: "Putumayo" },
  { city: "Sibundoy", department: "Putumayo" },
  { city: "San José del Guaviare", department: "Guaviare" },
  { city: "Puerto Escondido", department: "Córdoba" },
  { city: "Puerto Libertador", department: "Córdoba" },
  { city: "Santa Rosa del Sur", department: "Bolívar" },
  { city: "Pivijay", department: "Magdalena" },
  { city: "Plato", department: "Magdalena" },
];

export function foldPlaceName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function placeMatches(input: string, target: string): boolean {
  const a = foldPlaceName(input);
  const b = foldPlaceName(target);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 5 && b.includes(a)) return true;
  if (b.length >= 6 && a.includes(b)) return true;
  return false;
}

export function findEnviaExclusion(city: string, department?: string): EnviaExclusion | null {
  const cityNorm = foldPlaceName(city);
  if (!cityNorm) return null;
  const deptNorm = department ? foldPlaceName(department) : "";

  const cityHits = ENVIA_REEXPEDITION_DESTINATIONS.filter((row) => placeMatches(city, row.city));
  if (cityHits.length === 0) return null;
  if (deptNorm) {
    return cityHits.find((row) => placeMatches(department!, row.department)) ?? cityHits[0] ?? null;
  }
  return cityHits[0] ?? null;
}

export function isEnviaReexpedition(city: string, department?: string): boolean {
  return findEnviaExclusion(city, department) != null;
}
