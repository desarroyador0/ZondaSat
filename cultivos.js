// puntajes: [Ahorro de agua, Ganancia (índice económico 0-10), Cuidado del suelo]
// rendimientoTHa: t/ha en mal año / año medio / buen año (por AÑO en vid, olivo, pistacho y alfalfa)
// precioUSDt: USD por tonelada al productor | costoUSDha: USD por hectárea (por AÑO en vid, olivo, pistacho y alfalfa)

export const CULTIVOS_SAN_JUAN = [
  {
    nombre: "Vid (Uva)",
    puntajes: [5, 1.6, 6],
    rendimientoTHa: { min: 8, media: 14, max: 30 },
    precioUSDt: 115,
    costoUSDha: 4500
  },
  {
    nombre: "Olivo",
    puntajes: [9, 3, 7],
    rendimientoTHa: { min: 4, media: 10, max: 15 },
    precioUSDt: 400,
    costoUSDha: 4500
  },
  {
    nombre: "Tomate para industria",
    puntajes: [3, 5.1, 4],
    rendimientoTHa: { min: 70, media: 105, max: 150 },
    precioUSDt: 75,
    costoUSDha: 8000
  },
  {
    nombre: "Melón",
    puntajes: [4, 7.4, 5],
    rendimientoTHa: { min: 8, media: 14, max: 25 },
    precioUSDt: 400,
    costoUSDha: 4500
  },
  {
    nombre: "Ajo",
    puntajes: [7, 8.7, 6],
    rendimientoTHa: { min: 4.5, media: 9, max: 12 },
    precioUSDt: 1600,
    costoUSDha: 11000
  },
  {
    nombre: "Cebolla",
    puntajes: [6, 6.5, 6],
    rendimientoTHa: { min: 12, media: 28, max: 50 },
    precioUSDt: 200,
    costoUSDha: 5000
  },
  {
    nombre: "Garbanzo (Leguminosa)",
    puntajes: [8, 5.2, 9],
    rendimientoTHa: { min: 0.8, media: 1.8, max: 3 },
    precioUSDt: 600,
    costoUSDha: 1000
  },
  {
    nombre: "Alfalfa / Cobertura Verde",
    puntajes: [8, 6.2, 10],
    rendimientoTHa: { min: 10, media: 15, max: 25 },
    precioUSDt: 200,
    costoUSDha: 1800
  },
  {
    nombre: "Pistacho",
    puntajes: [8, 9, 7],
    rendimientoTHa: { min: 1.5, media: 3.5, max: 6 },
    precioUSDt: 6000,
    costoUSDha: 4500
  }
];
