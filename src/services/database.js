'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../../config.json');

let db = null;

/**
 * Initialise la base de données SQLite avec better-sqlite3.
 * Applique les pragmas WAL et exécute les migrations.
 */
function init() {
    if (db) return db;

    const dbPath = path.resolve(__dirname, '../../', config.database.path);
    const dbDir = path.dirname(dbPath);

    // Créer le dossier data/ si nécessaire
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(dbPath);

    // Appliquer les pragmas
    const pragmas = config.database.pragma || {};
    for (const [key, value] of Object.entries(pragmas)) {
        db.pragma(`${key} = ${value}`);
    }

    // Exécuter les migrations
    runMigrations();

    return db;
}

/**
 * Exécute les fichiers SQL de migration dans l'ordre.
 */
function runMigrations() {
    const migrationsDir = path.resolve(__dirname, '../migrations');
    if (!fs.existsSync(migrationsDir)) return;

    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    for (const file of files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        db.exec(sql);
    }
}

/**
 * Retourne l'instance de la base de données.
 */
function getDb() {
    if (!db) init();
    return db;
}

/**
 * Prépare un statement SQL (cached par better-sqlite3).
 */
function prepare(sql) {
    return getDb().prepare(sql);
}

/**
 * Exécute un run sur un statement préparé.
 */
function run(sql, ...params) {
    return prepare(sql).run(...params);
}

/**
 * Récupère une seule ligne.
 */
function get(sql, ...params) {
    return prepare(sql).get(...params);
}

/**
 * Récupère toutes les lignes.
 */
function all(sql, ...params) {
    return prepare(sql).all(...params);
}

/**
 * Crée une transaction à partir d'une fonction.
 */
function transaction(fn) {
    return getDb().transaction(fn);
}

/**
 * Ferme la base de données proprement.
 */
function close() {
    if (db) {
        db.close();
        db = null;
    }
}

module.exports = {
    init,
    getDb,
    prepare,
    run,
    get,
    all,
    transaction,
    close,
};
