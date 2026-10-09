# Sphera – bestehende Handy-Installationen

Dieses Repository stellt die frühere Adresse [alltags-helfer](https://ernestokoeber.github.io/alltags-helfer/) wieder bereit. Bereits installierte PWAs können dadurch ihren Service Worker aktualisieren und den gespeicherten Sync-Code unter Einstellungen → Sync-Code → anzeigen sichtbar machen.

Der vollständige Quellcode und die weitere Entwicklung liegen in [Ernestokoeber/Sphera](https://github.com/Ernestokoeber/Sphera). Die neue Hauptadresse ist [Sphera](https://ernestokoeber.github.io/Sphera/).

Der Workflow lädt beim Start den aktuellen main-Stand aus Sphera, testet und baut ihn für den unveränderten alten App-Pfad. Er enthält keine Sync-Zugangsdaten und verändert keine gespeicherten Gerätedaten. Bitte eine bestehende Handy-App nicht löschen oder ihre Website-Daten entfernen, bevor Sync-Code und Verschlüsselungspasswort gesichert sind.

Für weitere Updates an der alten Adresse: Actions → Deploy Sphera compatibility PWA → Run workflow. Ein Push in Sphera veröffentlicht automatisch die Hauptadresse; diese zusätzliche Bereitstellung wird separat gestartet.
