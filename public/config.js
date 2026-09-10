// Dev default: an empty runtime config so there is no 404 and no baked-in
// env. On staging the container entrypoint overwrites this file from
// environment variables before nginx serves it.
window.__NC_CONFIG__ = {};
