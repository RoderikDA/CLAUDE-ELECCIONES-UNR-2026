export function dhondt(listas, bancas) {
  const seats = Array(listas.length).fill(0);
  for (let b = 0; b < bancas; b++) {
    let maxIdx = 0, maxVal = -1;
    listas.forEach((l, i) => {
      const q = l.votos / (seats[i] + 1);
      if (q > maxVal) { maxVal = q; maxIdx = i; }
    });
    seats[maxIdx]++;
  }
  return seats;
}
