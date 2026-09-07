import "dotenv/config";
import { registrar, panorama } from "../src/modules/agua/service.js";
import { USUARIO } from "../src/core/auth.js";

const ml = Number(process.argv[2] || 500);

console.log("Registrando:", await registrar(USUARIO, ml));
console.log("Panorama:", await panorama(USUARIO));
