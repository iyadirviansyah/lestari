import { SelectField } from "@/components/ui";

/** Area layanan: kota → kecamatan → kode pos.
 * ponytail: kode pos sebagian terverifikasi (Batuceper 15122, Setu 15315, Serpong Utara 15324, Ciputat 15411–15414),
 * sisanya perkiraan dari rentang umum. Ganti dengan data resmi (Pos Indonesia / Permendagri 72/2019) sebelum dipakai nyata. */
export const AREAS: Record<string, Record<string, string[]>> = {
  "Kota Tangerang": {
    Batuceper: ["15121", "15122", "15123"],
    Benda: ["15124", "15125"],
    Cibodas: ["15138", "15139"],
    Ciledug: ["15151", "15153", "15157"],
    Cipondoh: ["15141", "15142", "15145", "15146", "15148"],
    Jatiuwung: ["15135", "15136", "15137"],
    "Karang Tengah": ["15157"],
    Karawaci: ["15113", "15114", "15115", "15116"],
    Larangan: ["15154", "15155"],
    Neglasari: ["15129"],
    Periuk: ["15131", "15132", "15133"],
    Pinang: ["15143", "15144", "15145"],
    Tangerang: ["15111", "15117", "15118", "15119"],
  },
  "Kota Tangerang Selatan": {
    Ciputat: ["15411", "15412", "15413", "15414"],
    "Ciputat Timur": ["15441", "15442", "15443", "15444", "15445", "15446"],
    Pamulang: ["15417", "15418", "15419"],
    "Pondok Aren": ["15221", "15222", "15223", "15224", "15225", "15226", "15227"],
    Serpong: ["15310", "15311", "15312", "15321"],
    "Serpong Utara": ["15323", "15324"],
    Setu: ["15314", "15315"],
  },
};

export type Addr = { city: string; district: string; postal: string; street: string };
export const emptyAddr: Addr = { city: "", district: "", postal: "", street: "" };
export const addrOk = (a: Addr) => !!(a.city && a.district && a.postal && a.street.trim());
export const addrText = (a: Addr) => `${a.street.trim()}, Kec. ${a.district}, ${a.city} ${a.postal}`;

/** Alamat: tiga pilihan lewat bottom sheet (kota, kecamatan, kode pos), lalu alamat jalan bebas. */
export function AddressField({ value, onChange }: { value: Addr; onChange: (a: Addr) => void }) {
  const districts = value.city ? Object.keys(AREAS[value.city]) : [];
  const postals = value.city && value.district ? AREAS[value.city][value.district] : [];
  return (
    <>
      <SelectField label="Kota" title="Pilih kota" value={value.city} options={Object.keys(AREAS)} onChange={(city) => onChange({ ...emptyAddr, street: value.street, city })} />
      <SelectField label="Kecamatan" title="Pilih kecamatan" value={value.district} options={districts} disabled={!value.city} onChange={(district) => onChange({ ...value, district, postal: "" })} />
      <SelectField label="Kode pos" title="Pilih kode pos" value={value.postal} options={postals} disabled={!value.district} onChange={(postal) => onChange({ ...value, postal })} />
      <label className="field">
        <span>Alamat jalan</span>
        <textarea className="area" style={{ minHeight: 72 }} value={value.street} placeholder="Nama jalan, nomor, RT/RW, patokan" onChange={(e) => onChange({ ...value, street: e.target.value })} />
      </label>
    </>
  );
}
