const COLOR_MAP = {
  "Franja Morada":                      "#e74c3c",
  "Franja":                             "#e74c3c",
  "FEU":                                "#2980b9",
  "Frejuni":                            "#1abc9c",
  "FEP":                                "#e67e22",
  "CINCEL":                             "#8e44ad",
  "FIT":                                "#c0392b",
  "Frente de Estudiantes de Izquierda": "#c0392b",
  "Alternativa":                        "#f39c12",
  "UPL":                                "#16a085",
  "Pulsión":                            "#9b59b6",
  "Masotta":                            "#2ecc71",
  "Construcción":                       "#e74c3c",
  "Tupac":                              "#d35400",
  "Alde":                               "#27ae60",
  "ALDE":                               "#27ae60",
  "Dominó":                             "#2c3e50",
  "Área":                               "#7f8c8d",
  "Corriente Estudiantil":              "#3498db",
  "15 de Junio":                        "#e74c3c",
  "Impulso":                            "#e74c3c",
  "MNR":                                "#8e44ad",
  "ATP (K)":                            "#27ae60",
  "JUP":                                "#2980b9",
  "Frente Patria":                      "#f39c12",
  "DNI":                                "#1abc9c",
  "1983":                               "#e67e22",
  "Universitarios x la Libertad":       "#7f8c8d",
  "GPS":                                "#3498db",
  "Güemes":                             "#c0392b",
  "Alberdi":                            "#8e44ad",
  "SOMOS":                              "#e74c3c",
  "Pampillón":                          "#2980b9",
  "Oktubre + MUE":                      "#27ae60",
  "Mate Cocido":                        "#e67e22",
  "Nueve de Julio":                     "#3498db",
  "Unidad Veterinaria":                 "#16a085",
  "ADN":                                "#e74c3c",
  "Estudiantes Independientes":         "#7f8c8d",
};

function c(nombre) { return COLOR_MAP[nombre] || "#95a5a6"; }
function mk(nombre, idx) { return { id: "l" + idx, nombre, color: c(nombre) }; }

export const UNR_CONFIG = {
  bancas: 8,
  facultades: [
    {
      id: "fcpolit", nombre: "FCPolit", mesas: { centro: 3, consejo: 3 },
      listas: ["Franja Morada","FEU","Frejuni","FEP","CINCEL","FIT","Alternativa","UPL"].map(mk),
    },
    {
      id: "psico", nombre: "Psicología", mesas: { centro: 5, consejo: 5 },
      listas: ["Pulsión","FEU","Masotta","Construcción","Tupac","FIT"].map(mk),
    },
    {
      id: "fapyd", nombre: "FAPyD", mesas: { centro: 4, consejo: 4 },
      listas: ["Franja Morada","Alde","Dominó","Área"].map(mk),
    },
    {
      id: "fceia", nombre: "FCEIA", mesas: { centro: 4, consejo: 3 },
      listas: ["Corriente Estudiantil","Alde","15 de Junio","UPL","Alternativa"].map(mk),
    },
    {
      id: "medicina", nombre: "Medicina", mesas: { centro: 15, consejo: 15 },
      listas: ["Impulso","Alde","MNR","ATP (K)","JUP"].map(mk),
    },
    {
      id: "derecho", nombre: "Derecho", mesas: { centro: 2, consejo: 9 },
      listas: ["Franja Morada","Frente Patria","DNI","1983","Alternativa","Universitarios x la Libertad","Alde"].map(mk),
    },
    {
      id: "eco", nombre: "Económicas", mesas: { centro: 12, consejo: 12 },
      listas: ["Franja Morada","GPS","UPL","Güemes","ALDE","Alberdi"].map(mk),
    },
    {
      id: "humanidades", nombre: "Humanidades", mesas: { centro: 8, consejo: 8 },
      listas: ["SOMOS","Pampillón","Oktubre + MUE","Mate Cocido","Tupac","Frente de Estudiantes de Izquierda"].map(mk),
    },
    {
      id: "bioquimica", nombre: "Bioquímica", mesas: { centro: 4, consejo: 4 },
      listas: ["Franja Morada","Nueve de Julio"].map(mk),
    },
    {
      id: "veterinaria", nombre: "Veterinaria", mesas: { centro: 1, consejo: 1 },
      listas: ["Unidad Veterinaria","ADN"].map(mk),
    },
    {
      id: "agrarias", nombre: "Agrarias", mesas: { centro: 1, consejo: 1 },
      listas: ["Estudiantes Independientes"].map(mk),
    },
  ],
};
