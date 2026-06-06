// Minimale Typdeklaration für `vcf` (npm) — das Paket liefert keine eigenen Typen.
// Deckt nur die hier genutzte Oberfläche ab (RFC-konformes vCard-Parsen/-Bauen),
// statt `any` über die Tools zu streuen. vcf ist CJS → Default-Import via
// esModuleInterop (`import vCard from "vcf"`), analog zur tsdav-Interop in calendar.ts.
declare module "vcf" {
  /** Eine einzelne vCard-Property (z.B. FN, EMAIL). `valueOf()` liefert den Klartext. */
  class Property {
    valueOf(): string;
    /** Property-Parameter wie TYPE (z.B. { type: "work" }). */
    toJSON(): unknown;
  }

  /** Property-Parameter beim Setzen, z.B. { type: "cell" }. */
  type PropertyParams = Record<string, string | string[]>;

  class vCard {
    constructor();

    /** Setzt eine Property (ersetzt vorhandene desselben Feldes). */
    set(field: string, value: string, params?: PropertyParams): vCard;
    /** Fügt eine weitere Property hinzu (mehrere EMAIL/TEL möglich). */
    add(field: string, value: string, params?: PropertyParams): vCard;
    /**
     * Liefert die Property(s) eines Feldes: ein Property bei Einzelwert, ein
     * Array bei Mehrfachwerten, `undefined` wenn nicht vorhanden.
     */
    get(field: string): Property | Property[] | undefined;
    /** Serialisiert die vCard in der angegebenen Version (z.B. "3.0", "4.0"). */
    toString(version?: string): string;
  }

  namespace vCard {
    /** Parst eine oder mehrere VCARD-Blöcke aus rohem Text. */
    function parse(input: string): vCard[];
  }

  export = vCard;
}
