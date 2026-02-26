export const CATEGORIES = [
  "HUEVOS",
  "DESPENSA",
  "ENCURTIDOS",
  "DULCES Y SALADOS",
  "PRODUCTOS DEL MAR",
  "CONGELADOS",
  "ASEO",
  "AUTOMOTRIZ",
];

let idCounter = 1;
const p = (name, category, price, description = "", options = {}) => ({
  id: idCounter++,
  name,
  category,
  price: Number(price),
  description,
  stock: options.stock ?? true,
  unit: options.unit ?? "unidad",
});

export const seedProducts = [
  // HUEVOS
  p("Huevos Extra Blanco (30 unidades)", "HUEVOS", 6100, "Tamaño extra, bandeja de 30 unidades"),
  p("Huevos Extra Color (30 unidades)", "HUEVOS", 6400, "Tamaño extra, bandeja de 30 unidades"),

  // DESPENSA
  p("Aceite Extra Virgen 500 ml", "DESPENSA", 6500, "Oferta en PDF: 2 x $12.000"),
  p("Aceite Extra Virgen 500 ml (Promo 2x)", "DESPENSA", 12000, "2 unidades"),

  // ENCURTIDOS
  p("Aceituna Verde Tamaño XX (1/2 kg)", "ENCURTIDOS", 3600, "También disponible por kilo"),
  p("Aceituna Verde Tamaño XX (1 kg)", "ENCURTIDOS", 7000, ""),
  p("Aceituna Verde Rellena Pimentón (1/2 kg)", "ENCURTIDOS", 3900, "También disponible por kilo"),
  p("Aceituna Verde Rellena Pimentón (1 kg)", "ENCURTIDOS", 7500, ""),
  p("Aceituna Morada Amarga (1/2 kg)", "ENCURTIDOS", 3900, "También disponible por kilo"),
  p("Aceituna Morada Amarga (1 kg)", "ENCURTIDOS", 7500, ""),
  p("Aceituna Negra Grande Tamaño XX (1/2 kg)", "ENCURTIDOS", 3600, "También disponible por kilo"),
  p("Aceituna Negra Grande Tamaño XX (1 kg)", "ENCURTIDOS", 7000, ""),

  p("Ají Escabeche (1/2 kg)", "ENCURTIDOS", 2500, "También disponible por kilo"),
  p("Ají Escabeche (1 kg)", "ENCURTIDOS", 4600, ""),
  p("Cebolla Escabeche (1/2 kg)", "ENCURTIDOS", 1900, "También disponible por kilo", { stock: false }),
  p("Cebolla Escabeche (1 kg)", "ENCURTIDOS", 3500, "Sin stock según PDF", { stock: false }),
  p("Pickle Fino (1/2 kg)", "ENCURTIDOS", 1900, "También disponible por kilo"),
  p("Pickle Fino (1 kg)", "ENCURTIDOS", 3500, ""),
  p("Pepinillo en Vinagre (1/2 kg)", "ENCURTIDOS", 2300, "También disponible por kilo"),
  p("Pepinillo en Vinagre (1 kg)", "ENCURTIDOS", 4200, ""),
  p("Pepinillo Dill Agridulce (1/2 kg)", "ENCURTIDOS", 2500, "También disponible por kilo"),
  p("Pepinillo Dill Agridulce (1 kg)", "ENCURTIDOS", 4400, ""),
  p("Chucrut 200 gr", "ENCURTIDOS", 950, ""),
  p("Salsa Americana 200 gr", "ENCURTIDOS", 950, ""),

  // DULCES Y SALADOS
  p("Maní Tostado Salado 1 kg", "DULCES Y SALADOS", 4600, ""),
  p("Maní Confitado 1 kg", "DULCES Y SALADOS", 4600, ""),
  p("Mix 4 Frutos Sin Sal 1 kg", "DULCES Y SALADOS", 7200, "Maní, pasas, almendra, nueces"),
  p("Trufas (caja ~60 unidades)", "DULCES Y SALADOS", 4900, ""),

  // PRODUCTOS DEL MAR
  p("Camarón 36/40 1 kg", "PRODUCTOS DEL MAR", 8900, "Crudo, pelado, desvenado"),
  p("Camarón 51/60 1 kg", "PRODUCTOS DEL MAR", 8900, "Pelado, cocido, desvenado"),
  p("Paila Marina 1 kg", "PRODUCTOS DEL MAR", 4500, "Choritos, chorito concha, jibia, pangasius", { stock: false }),
  p("Chorito Congelado 1 kg", "PRODUCTOS DEL MAR", 5990, ""),
  p("Salmón en Trozos con Piel 500 gr", "PRODUCTOS DEL MAR", 4290, "Congelado"),
  p("Surtido de Marisco 1 kg", "PRODUCTOS DEL MAR", 4290, "Choritos, jibia, kanikama y camarón"),

  // CONGELADOS
  p("Hamburguesa Tradicional Super Beef 100 gr (10 un)", "CONGELADOS", 5500, ""),
  p("Suprema de Pollo La Crianza 120 gr (5 un)", "CONGELADOS", 4800, "100% pechuga de pollo"),
  p("Hamburguesa Tradicional La Crianza 100 gr (10 un)", "CONGELADOS", 7500, ""),
  p("Hamburguesa de Pollo La Crianza 100 gr (10 un)", "CONGELADOS", 7500, ""),
  p("Churrasco de Vacuno King 90 gr (10 un)", "CONGELADOS", 7500, ""),
  p("Medallita de Pollo Super Pollo 100 gr (10 un)", "CONGELADOS", 6700, ""),
  p("Filetillos de Pechuga de Pollo Ariztía 650 gr", "CONGELADOS", 5300, ""),
  p("Costillar en Tira Congelado Super Cerdo (1 kg)", "CONGELADOS", 7200, "Sin stock según PDF", { stock: false }),
  p("Pechuga Deshuesada de Pollo Super Pollo 700 gr", "CONGELADOS", 5500, ""),
  p("Nuggets de Pollo Super Pollo 1 kg", "CONGELADOS", 4300, ""),
  p("Aros de Cebolla Pickers by McCain 1 kg", "CONGELADOS", 4990, ""),
  p("Champiñón Laminado Minuto Verde 1 kg", "CONGELADOS", 3500, ""),
  p("Papas Duquesas Frutos del Maipo 1 kg", "CONGELADOS", 4000, ""),
  p("Papas Fritas Frutos del Maipo 2,5 kg 9x9 mm", "CONGELADOS", 6900, ""),
  p("Papas Fritas McCain Corte Fino 2,25 kg 7x7 mm", "CONGELADOS", 6300, ""),
  p("Papas Fritas Frutos del Maipo 2,5 kg 7x7 mm", "CONGELADOS", 6900, "Corte fino"),
  p("Porotos Verdes Minuto Verde 1 kg", "CONGELADOS", 2990, ""),
  p("Habas Minuto Verde 1 kg", "CONGELADOS", 3100, ""),
  p("Arvejas Minuto Verde 1 kg", "CONGELADOS", 2600, ""),
  p("Choclo Minuto Verde 1 kg", "CONGELADOS", 2600, ""),
  p("Ensalada Lista Minuto Verde 1 kg", "CONGELADOS", 2600, ""),
  p("Pasta de Choclo Minuto Verde 1 kg", "CONGELADOS", 3700, ""),

  // ASEO (cargados confirmados por texto; algunos nombres de papel higiénico del PDF son ambiguos en texto)
  p("Papel Higiénico (20 mts, 48 rollos) - modelo 1", "ASEO", 9990, "Nombre exacto visible en imagen PDF"),
  p("Papel Higiénico (50 mts, 32 rollos) - modelo 1", "ASEO", 17500, "Nombre exacto visible en imagen PDF"),
  p("Papel Higiénico Elite (50 mts, 32 rollos)", "ASEO", 19700, ""),
  p("Papel Higiénico Confort (30 mts, 48 rollos)", "ASEO", 15990, ""),
  p("Papel Higiénico Confort (50 mts, 32 rollos)", "ASEO", 18200, ""),
  p("Confort Rendiplus (20 mts, 48 rollos)", "ASEO", 11500, ""),

  p("Toalla de Papel Abolengo XL 100 mts", "ASEO", 2700, ""),
  p("Toalla de Papel Elite Triple Hoja 20 mts (Unidad)", "ASEO", 2200, "Ultra absorbente"),
  p("Toalla de Papel Elite Triple Hoja 20 mts (Manga)", "ASEO", 19500, "Ultra absorbente"),
  p("Toalla de Papel Tork Doble Hoja 24 mts (Unidad)", "ASEO", 1700, ""),
  p("Toalla de Papel Tork Doble Hoja 24 mts (Manga)", "ASEO", 11990, ""),
  p("Toalla de Papel Nova Gigante 70 mts", "ASEO", 2800, ""),

  p("Servilleta de Papel Belleza (~300 un)", "ASEO", 1400, ""),
  p("Servilleta de Papel Don Aurelio (~300 un)", "ASEO", 1400, ""),
  p("Servilleta de Papel Nova (300 un)", "ASEO", 1400, ""),
  p("Trapero Húmedo Impeke Multiuso con Ojal (10 un)", "ASEO", 2000, ""),

  p("Detergente RO 5 lt", "ASEO", 3000, ""),
  p("OMO para Diluir 500 ml", "ASEO", 4500, ""),
  p("OMO para Diluir 500 ml Piel Sensible", "ASEO", 4500, ""),
  p("Detergente Ariel 1,8 lt Concentrado", "ASEO", 6800, ""),
  p("Detergente ACE 1,8 lt Naturals", "ASEO", 6300, ""),
  p("Suavizante Clásico Fuzol 1 lt", "ASEO", 1400, ""),

  p("Desengrasante Enérgico RO 1,8 lt", "ASEO", 2700, ""),
  p("Lavaloza Brik's 5 lt", "ASEO", 3700, ""),
  p("Lavaloza Brik's 2 lt", "ASEO", 1700, ""),
  p("Limpiapisos Spum 5 lt Primavera", "ASEO", 2000, ""),
  p("Limpiapisos Spum 5 lt Lavanda", "ASEO", 2000, ""),
  p("Limpiapisos Spum 5 lt Frutos del Bosque", "ASEO", 2000, ""),
  p("Limpiapisos Spum 5 lt Brisas del Mar", "ASEO", 2000, ""),
  p("Cloro Gel Spum 5 lt (Cloro + Limpiador)", "ASEO", 3800, ""),
  p("Cloro Spum 5 lt Concentrado", "ASEO", 2500, ""),
  p("Cloro Brik's 5 lt Concentrado", "ASEO", 2300, ""),

  p("Detergente Brik's 5 lt Ecológico sin Colorante", "ASEO", 3600, ""),
  p("Detergente Brik's 5 lt Recupera Prendas Percudidas", "ASEO", 3600, ""),
  p("Detergente Brik's 5 lt Desmancha y Blanquea", "ASEO", 3600, ""),
  p("Detergente Brik's 5 lt Prendas Delicadas", "ASEO", 3600, ""),
  p("Detergente Brik's 5 lt Perfume que perdura", "ASEO", 3600, ""),
  p("Detergente Brik's 5 lt Súper Concentrado", "ASEO", 3600, ""),
  p("Detergente Brik's 5 lt 4 en 1", "ASEO", 3600, ""),
  p("Suavizante Brik's 5 lt", "ASEO", 3600, ""),
  p("Suavizante RO 5 lt", "ASEO", 3000, ""),

  p("Limpiavidrios Winnex 500 ml (30% gratis)", "ASEO", 1500, ""),

  // AUTOMOTRIZ
  p("KIT Silicona Spray 420 ml", "AUTOMOTRIZ", 3990, ""),
  p("KIT Pack Silicona Spray + renovador", "AUTOMOTRIZ", 6990, ""),
];