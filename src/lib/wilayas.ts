// List of all Algerian wilayas with their codes and names
export const algerianWilayas = [
  { code: '01', value: 'Adrar', label: '01 - Adrar' },
  { code: '02', value: 'Chlef', label: '02 - Chlef' },
  { code: '03', value: 'Laghouat', label: '03 - Laghouat' },
  { code: '04', value: 'Oum El Bouaghi', label: '04 - Oum El Bouaghi' },
  { code: '05', value: 'Batna', label: '05 - Batna' },
  { code: '06', value: 'Béjaïa', label: '06 - Béjaïa' },
  { code: '07', value: 'Biskra', label: '07 - Biskra' },
  { code: '08', value: 'Béchar', label: '08 - Béchar' },
  { code: '09', value: 'Blida', label: '09 - Blida' },
  { code: '10', value: 'Bouira', label: '10 - Bouira' },
  { code: '11', value: 'Tamanrasset', label: '11 - Tamanrasset' },
  { code: '12', value: 'Tébessa', label: '12 - Tébessa' },
  { code: '13', value: 'Tlemcen', label: '13 - Tlemcen' },
  { code: '14', value: 'Tiaret', label: '14 - Tiaret' },
  { code: '15', value: 'Tizi Ouzou', label: '15 - Tizi Ouzou' },
  { code: '16', value: 'Alger', label: '16 - Alger' },
  { code: '17', value: 'Djelfa', label: '17 - Djelfa' },
  { code: '18', value: 'Jijel', label: '18 - Jijel' },
  { code: '19', value: 'Sétif', label: '19 - Sétif' },
  { code: '20', value: 'Saïda', label: '20 - Saïda' },
  { code: '21', value: 'Skikda', label: '21 - Skikda' },
  { code: '22', value: 'Sidi Bel Abbès', label: '22 - Sidi Bel Abbès' },
  { code: '23', value: 'Annaba', label: '23 - Annaba' },
  { code: '24', value: 'Guelma', label: '24 - Guelma' },
  { code: '25', value: 'Constantine', label: '25 - Constantine' },
  { code: '26', value: 'Médéa', label: '26 - Médéa' },
  { code: '27', value: 'Mostaganem', label: '27 - Mostaganem' },
  { code: '28', value: "M'Sila", label: "28 - M'Sila" },
  { code: '29', value: 'Mascara', label: '29 - Mascara' },
  { code: '30', value: 'Ouargla', label: '30 - Ouargla' },
  { code: '31', value: 'Oran', label: '31 - Oran' },
  { code: '32', value: 'El Bayadh', label: '32 - El Bayadh' },
  { code: '33', value: 'Illizi', label: '33 - Illizi' },
  { code: '34', value: 'Bordj Bou Arréridj', label: '34 - Bordj Bou Arréridj' },
  { code: '35', value: 'Boumerdès', label: '35 - Boumerdès' },
  { code: '36', value: 'El Tarf', label: '36 - El Tarf' },
  { code: '37', value: 'Tindouf', label: '37 - Tindouf' },
  { code: '38', value: 'Tissemsilt', label: '38 - Tissemsilt' },
  { code: '39', value: 'El Oued', label: '39 - El Oued' },
  { code: '40', value: 'Khenchela', label: '40 - Khenchela' },
  { code: '41', value: 'Souk Ahras', label: '41 - Souk Ahras' },
  { code: '42', value: 'Tipaza', label: '42 - Tipaza' },
  { code: '43', value: 'Mila', label: '43 - Mila' },
  { code: '44', value: 'Aïn Defla', label: '44 - Aïn Defla' },
  { code: '45', value: 'Naâma', label: '45 - Naâma' },
  { code: '46', value: 'Aïn Témouchent', label: '46 - Aïn Témouchent' },
  { code: '47', value: 'Ghardaïa', label: '47 - Ghardaïa' },
  { code: '48', value: 'Relizane', label: '48 - Relizane' },
  { code: '49', value: "El M'Ghair", label: "49 - El M'Ghair" },
  { code: '50', value: 'El Meniaa', label: '50 - El Meniaa' },
  { code: '51', value: 'Ouled Djellal', label: '51 - Ouled Djellal' },
  { code: '52', value: 'Bordj Baji Mokhtar', label: '52 - Bordj Baji Mokhtar' },
  { code: '53', value: 'Béni Abbès', label: '53 - Béni Abbès' },
  { code: '54', value: 'Timimoun', label: '54 - Timimoun' },
  { code: '55', value: 'Touggourt', label: '55 - Touggourt' },
  { code: '56', value: 'Djanet', label: '56 - Djanet' },
  { code: '57', value: 'In Salah', label: '57 - In Salah' },
  { code: '58', value: 'In Guezzam', label: '58 - In Guezzam' }
];

// Helper function to validate if a wilaya is valid
export function isValidWilaya(wilaya: string): boolean {
  return algerianWilayas.some(w => w.value === wilaya);
}

// Helper function to get wilaya by code
export function getWilayaByCode(code: string) {
  return algerianWilayas.find(w => w.code === code);
}

// Helper function to get wilaya by name
export function getWilayaByName(name: string) {
  return algerianWilayas.find(w => w.value === name);
}