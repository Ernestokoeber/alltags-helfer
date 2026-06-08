// Datenschutz-/Robustheits-Helfer für die local-first DB.
// - persistStorage: fordert persistenten Speicher an (gegen Verdrängung, v. a. iOS Safari).
// - probeIndexedDB: prüft, ob IndexedDB überhaupt nutzbar ist (private Modi blockieren es).
// Beide nehmen ihre Abhängigkeit optional als Argument → unit-testbar.

// Fordert persistenten Speicher an, damit der Browser die IndexedDB-Daten nicht
// einfach verdrängt. Gibt zurück, ob der Speicher (jetzt) persistent ist.
export async function persistStorage(
	storage: StorageManager | undefined = globalThis.navigator?.storage
): Promise<boolean> {
	if (!storage?.persist) return false;
	try {
		if (storage.persisted && (await storage.persisted())) return true;
		return await storage.persist();
	} catch {
		return false;
	}
}

// Öffnet eine wegwerfbare Test-DB und schreibt/liest einen Wert. Schlägt das fehl
// (oder fehlt IndexedDB ganz), ist die DB nicht nutzbar → false.
export function probeIndexedDB(
	idb: IDBFactory | undefined = globalThis.indexedDB
): Promise<boolean> {
	return new Promise((resolve) => {
		if (!idb) return resolve(false);

		let done = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const finish = (ok: boolean) => {
			if (done) return;
			done = true;
			if (timer) clearTimeout(timer);
			resolve(ok);
		};

		// Sicherheitsnetz: hängt das Öffnen (manche privaten Modi), nach 3 s aufgeben.
		timer = setTimeout(() => finish(false), 3000);

		try {
			const req = idb.open('ah-probe', 1);
			req.onupgradeneeded = () => req.result.createObjectStore('t');
			req.onerror = () => finish(false);
			req.onblocked = () => finish(false);
			req.onsuccess = () => {
				try {
					const db = req.result;
					const tx = db.transaction('t', 'readwrite');
					tx.objectStore('t').put(1, 'k');
					tx.oncomplete = () => {
						db.close();
						finish(true);
					};
					tx.onerror = () => {
						db.close();
						finish(false);
					};
					tx.onabort = () => {
						db.close();
						finish(false);
					};
				} catch {
					finish(false);
				}
			};
		} catch {
			finish(false);
		}
	});
}
